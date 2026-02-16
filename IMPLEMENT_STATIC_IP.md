# Implementing Static IP for Binance API Restriction

## Overview
This guide will set up Cloud NAT with a static IP so Binance API keys can be restricted to a single trusted IP.

## Prerequisites
- GCP Project: bright-path-ai-solution
- Region: asia-east1
- Cloud Run service: bot-trading-backend

## Step-by-Step Implementation

### 1. Reserve a Static External IP Address
```bash
gcloud compute addresses create bot-trading-nat-ip \
  --region=asia-east1 \
  --project=bright-path-ai-solution
```

### 2. Get the Reserved IP (Save this for Binance)
```bash
gcloud compute addresses describe bot-trading-nat-ip \
  --region=asia-east1 \
  --project=bright-path-ai-solution \
  --format="get(address)"
```

### 3. Create VPC Network
```bash
gcloud compute networks create bot-trading-vpc \
  --subnet-mode=custom \
  --project=bright-path-ai-solution
```

### 4. Create Subnet
```bash
gcloud compute networks subnets create bot-trading-subnet \
  --network=bot-trading-vpc \
  --region=asia-east1 \
  --range=10.0.0.0/24 \
  --project=bright-path-ai-solution
```

### 5. Create Cloud Router
```bash
gcloud compute routers create bot-trading-router \
  --network=bot-trading-vpc \
  --region=asia-east1 \
  --project=bright-path-ai-solution
```

### 6. Create Cloud NAT
```bash
gcloud compute routers nats create bot-trading-nat \
  --router=bot-trading-router \
  --region=asia-east1 \
  --nat-external-ip-pool=bot-trading-nat-ip \
  --nat-all-subnet-ip-ranges \
  --enable-logging \
  --project=bright-path-ai-solution
```

### 7. Create Serverless VPC Connector
```bash
gcloud compute networks vpc-access connectors create bot-trading-connector \
  --region=asia-east1 \
  --subnet=bot-trading-subnet \
  --subnet-project=bright-path-ai-solution \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro
```

### 8. Update Cloud Run Deployment
The deployment workflow needs to be updated to use the VPC connector.

Add these flags to the Cloud Run deploy command:
```yaml
--vpc-egress=all-traffic \
--vpc-connector=bot-trading-connector
```

### 9. Verify Setup
After deployment, test the static IP:
```bash
curl https://bot-trading-backend-155580679014.asia-east1.run.app/api/ip
```

### 10. Configure Binance
1. Log into Binance API Management
2. Edit your API key
3. Enable "Restrict access to trusted IPs only"
4. Add the static IP from step 2

## Cost Estimate
- Cloud NAT: ~$35/month (data processing + gateway)
- Serverless VPC Connector: ~$10/month (minimum)
- Static IP: ~$3/month (reserved but unused)
- Total: ~$48/month

## Rollback Plan
If issues occur:
```bash
# Remove VPC connector from Cloud Run
gcloud run services update bot-trading-backend \
  --clear-vpc-connector \
  --region=asia-east1

# Delete resources in reverse order
gcloud compute networks vpc-access connectors delete bot-trading-connector --region=asia-east1
gcloud compute routers nats delete bot-trading-nat --router=bot-trading-router --region=asia-east1
gcloud compute routers delete bot-trading-router --region=asia-east1
gcloud compute networks subnets delete bot-trading-subnet --region=asia-east1
gcloud compute networks delete bot-trading-vpc
gcloud compute addresses delete bot-trading-nat-ip --region=asia-east1
```

## Testing
1. Before changes: Note current IP
2. Apply changes and redeploy
3. Verify new static IP matches reserved IP
4. Test Binance API calls work
5. Test that calls fail from other IPs (use VPN/different server)
