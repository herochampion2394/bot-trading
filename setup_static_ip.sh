#!/bin/bash

# Setup Static IP for Binance IP Restriction
# This script creates all necessary GCP infrastructure for static IP

set -e

PROJECT_ID="bright-path-ai-solution"
REGION="asia-east1"
IP_NAME="bot-trading-nat-ip"
VPC_NAME="bot-trading-vpc"
SUBNET_NAME="bot-trading-subnet"
ROUTER_NAME="bot-trading-router"
NAT_NAME="bot-trading-nat"
CONNECTOR_NAME="bot-trading-connector"

echo "====================================="
echo "Setting up Static IP Infrastructure"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "====================================="
echo ""

# Step 1: Reserve Static IP
echo "[1/7] Reserving static external IP address..."
gcloud compute addresses create $IP_NAME \
  --region=$REGION \
  --project=$PROJECT_ID || echo "IP already exists, continuing..."

# Get and display the IP
STATIC_IP=$(gcloud compute addresses describe $IP_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="get(address)")

echo "✓ Static IP reserved: $STATIC_IP"
echo "⚠️  IMPORTANT: Save this IP for Binance whitelist: $STATIC_IP"
echo ""

# Step 2: Create VPC Network
echo "[2/7] Creating VPC network..."
gcloud compute networks create $VPC_NAME \
  --subnet-mode=custom \
  --project=$PROJECT_ID || echo "VPC already exists, continuing..."
echo "✓ VPC network created"
echo ""

# Step 3: Create Subnet
echo "[3/7] Creating subnet..."
gcloud compute networks subnets create $SUBNET_NAME \
  --network=$VPC_NAME \
  --region=$REGION \
  --range=10.0.0.0/24 \
  --project=$PROJECT_ID || echo "Subnet already exists, continuing..."
echo "✓ Subnet created"
echo ""

# Step 4: Create Cloud Router
echo "[4/7] Creating Cloud Router..."
gcloud compute routers create $ROUTER_NAME \
  --network=$VPC_NAME \
  --region=$REGION \
  --project=$PROJECT_ID || echo "Router already exists, continuing..."
echo "✓ Cloud Router created"
echo ""

# Step 5: Create Cloud NAT
echo "[5/7] Creating Cloud NAT..."
gcloud compute routers nats create $NAT_NAME \
  --router=$ROUTER_NAME \
  --region=$REGION \
  --nat-external-ip-pool=$IP_NAME \
  --nat-all-subnet-ip-ranges \
  --enable-logging \
  --project=$PROJECT_ID || echo "NAT already exists, continuing..."
echo "✓ Cloud NAT created"
echo ""

# Step 6: Create Serverless VPC Connector
echo "[6/7] Creating Serverless VPC Connector (this may take 3-5 minutes)..."
gcloud compute networks vpc-access connectors create $CONNECTOR_NAME \
  --region=$REGION \
  --subnet=$SUBNET_NAME \
  --subnet-project=$PROJECT_ID \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro || echo "Connector already exists, continuing..."
echo "✓ Serverless VPC Connector created"
echo ""

# Step 7: Display next steps
echo "[7/7] Infrastructure setup complete!"
echo ""
echo "====================================="
echo "✅ SETUP COMPLETE"
echo "====================================="
echo ""
echo "Your static IP: $STATIC_IP"
echo ""
echo "Next steps:"
echo "1. Update GitHub workflow to use VPC connector"
echo "2. Push changes to trigger deployment"
echo "3. Test with: curl https://bot-trading-backend-155580679014.asia-east1.run.app/api/auth/ip"
echo "4. Add $STATIC_IP to your Binance API key whitelist"
echo ""
echo "Estimated monthly cost: ~$48 USD"
echo "  - Cloud NAT: ~$35"
echo "  - VPC Connector: ~$10"
echo "  - Static IP: ~$3"
echo ""
