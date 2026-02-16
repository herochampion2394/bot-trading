# Static IP Setup for Binance IP Restriction

## Problem
Binance recommends restricting API keys to trusted IPs for security.
Cloud Run uses dynamic IPs by default, which changes on each deployment.

## Solution Options

### Option 1: Use Cloud NAT (Recommended for Production)
Cloud NAT provides a static IP for outbound traffic from Cloud Run.

#### Steps:

1. **Reserve a Static IP**
```bash
gcloud compute addresses create bot-trading-nat-ip \
  --region=asia-east1
```

2. **Create a VPC Network (if not exists)**
```bash
gcloud compute networks create bot-trading-vpc \
  --subnet-mode=custom

gcloud compute networks subnets create bot-trading-subnet \
  --network=bot-trading-vpc \
  --region=asia-east1 \
  --range=10.0.0.0/24
```

3. **Create Cloud Router**
```bash
gcloud compute routers create bot-trading-router \
  --network=bot-trading-vpc \
  --region=asia-east1
```

4. **Create Cloud NAT**
```bash
gcloud compute routers nats create bot-trading-nat \
  --router=bot-trading-router \
  --region=asia-east1 \
  --nat-external-ip-pool=bot-trading-nat-ip \
  --nat-all-subnet-ip-ranges
```

5. **Create VPC Connector**
```bash
gcloud compute networks vpc-access connectors create bot-trading-connector \
  --region=asia-east1 \
  --subnet=bot-trading-subnet
```

6. **Get the Static IP**
```bash
gcloud compute addresses describe bot-trading-nat-ip --region=asia-east1 --format="get(address)"
```

7. **Update Cloud Run to use VPC Connector**
Add to your backend deployment in `.github/workflows/deploy-backend.yml`:

```yaml
--vpc-egress=all-traffic \
--vpc-connector=bot-trading-connector
```

**Cost:** ~$30-50/month for Cloud NAT + VPC connector

---

### Option 2: Use IP Allowlist with Multiple IPs (Budget Option)

Since Cloud Run IPs change but come from Google's IP ranges:

1. **Get Current IP**
```bash
curl https://bot-trading-backend-155580679014.asia-east1.run.app/api/ip
```

2. **Add IP check endpoint to backend**
Create `/api/ip` endpoint that returns current outbound IP

3. **Whitelist Google Cloud IP Ranges**
Add all Cloud Run IPs for asia-east1 region to Binance.

**Pros:** No extra cost
**Cons:** Less secure, need to whitelist large IP range

---

### Option 3: Use Cloud Functions with Reserved IP (Alternative)

Move Binance API calls to Cloud Functions 2nd gen with static IP.

---

## Recommended Approach

For production trading bot: **Option 1 (Cloud NAT)**
- Most secure
- Single static IP
- Reliable

## Implementation

I can help you:
1. Set up Cloud NAT with static IP
2. Update deployment scripts
3. Test and verify the static IP
4. Configure Binance API key with the static IP

Would you like me to implement this?
