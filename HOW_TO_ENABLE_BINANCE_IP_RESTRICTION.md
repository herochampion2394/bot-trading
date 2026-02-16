# How to Enable Binance IP Restriction for Your Trading Bot

## Overview
This guide shows you how to restrict your Binance API key to only work from a specific static IP address, significantly improving security.

## Why This Matters
- **Security**: Prevents unauthorized API key usage if keys are leaked
- **Binance Requirement**: Many institutional traders require IP whitelisting
- **Best Practice**: Industry standard for production trading systems

## Current Situation
Your bot-trading backend is deployed on Google Cloud Run, which uses **dynamic IPs** that change on each deployment. This makes it impossible to use Binance's IP restriction feature.

## Solution: Cloud NAT with Static IP
We'll set up Google Cloud NAT to give your backend a single, permanent IP address.

---

## Implementation Steps

### Phase 1: Check Current IP (Optional)

First, let's see what IP your backend currently uses:

```bash
curl https://bot-trading-backend-155580679014.asia-east1.run.app/api/auth/ip
```

This will show you the current dynamic IP. After setup, this will change to your static IP.

### Phase 2: Run the Setup Script

**IMPORTANT**: This will create GCP resources that cost approximately **$48/month**.

```bash
cd /root/bot-trading
./setup_static_ip.sh
```

The script will:
1. Reserve a static external IP address
2. Create a VPC network and subnet
3. Set up Cloud Router
4. Configure Cloud NAT
5. Create a Serverless VPC Connector

**Expected Duration**: 5-10 minutes (VPC connector creation takes the longest)

**Save the IP Address**: The script will display your static IP like this:
```
✓ Static IP reserved: 34.80.123.45
⚠️  IMPORTANT: Save this IP for Binance whitelist: 34.80.123.45
```

### Phase 3: Deploy Updated Backend

The GitHub workflow has already been updated to use the VPC connector. Just trigger a deployment:

**Option A**: Make a small change and push
```bash
cd /root/bot-trading
touch backend/.trigger_deploy
git add backend/.trigger_deploy
git commit -m "Trigger deployment with VPC connector"
git push origin main
```

**Option B**: Use GitHub Actions
Go to GitHub → Actions → Re-run the deploy-backend workflow

### Phase 4: Verify Static IP

After deployment completes (5-7 minutes), verify your new static IP:

```bash
curl https://bot-trading-backend-155580679014.asia-east1.run.app/api/auth/ip
```

The IP should now match the static IP from Phase 2.

### Phase 5: Configure Binance

1. **Login to Binance**
   - Go to https://www.binance.com/en/my/settings/api-management

2. **Edit Your API Key**
   - Click on "Edit restrictions" for your bot's API key

3. **Enable IP Restriction**
   - Toggle "Restrict access to trusted IPs only"
   - Click "Confirm"

4. **Add Your Static IP**
   - Enter the static IP from Phase 2 (e.g., `34.80.123.45`)
   - Click "Confirm"

5. **Verify Permissions**
   Ensure these are enabled:
   - ✅ Enable Spot & Margin Trading
   - ✅ Enable Reading
   - ❌ Disable Withdrawals (recommended for safety)

### Phase 6: Test Everything

1. **Test API Connection**
   - Go to your bot-trading frontend
   - Navigate to "Exchange Accounts"
   - Click "Sync Balance" on your Binance account
   - Should work successfully

2. **Test Bot Trading**
   - Create a test bot with small amounts
   - Start the bot
   - Verify it can place orders

3. **Test from Unauthorized IP** (Optional Security Check)
   - Use a VPN or different server
   - Try to use your API key
   - Should fail with Binance error (this confirms IP restriction works!)

---

## Cost Breakdown

| Resource | Monthly Cost |
|----------|-------------|
| Cloud NAT (data processing) | ~$35 |
| Serverless VPC Connector | ~$10 |
| Static External IP | ~$3 |
| **Total** | **~$48** |

---

## Troubleshooting

### Issue: "VPC connector not found"
**Solution**: Wait 5 minutes for connector creation, then redeploy.

### Issue: "Binance API still works from other IPs"
**Solution**: 
- Check you saved and whitelisted the correct IP
- Verify IP restriction is enabled in Binance (toggle should be ON)
- Check if you have multiple API keys (whitelist affects only one key)

### Issue: "Bot can't connect to Binance after setup"
**Solution**:
1. Verify static IP: `curl https://bot-trading-backend-155580679014.asia-east1.run.app/api/auth/ip`
2. Check Binance whitelist matches this IP exactly
3. Check Cloud Run deployment logs for errors

### Issue: "Setup script fails"
**Solution**:
```bash
# Check if resources already exist
gcloud compute addresses list --filter="name:bot-trading"

# If stuck, delete and retry
gcloud compute networks vpc-access connectors delete bot-trading-connector --region=asia-east1
./setup_static_ip.sh
```

---

## Rollback (If Needed)

If you need to remove the static IP setup:

```bash
# Remove VPC connector from Cloud Run
gcloud run services update bot-trading-backend \
  --clear-vpc-connector \
  --region=asia-east1

# Delete resources (in reverse order)
gcloud compute networks vpc-access connectors delete bot-trading-connector --region=asia-east1
gcloud compute routers nats delete bot-trading-nat --router=bot-trading-router --region=asia-east1
gcloud compute routers delete bot-trading-router --region=asia-east1
gcloud compute networks subnets delete bot-trading-subnet --region=asia-east1
gcloud compute networks delete bot-trading-vpc
gcloud compute addresses delete bot-trading-nat-ip --region=asia-east1
```

Then remove IP restriction from Binance API key settings.

---

## Alternative: Budget Option (Not Recommended)

If you want to avoid the $48/month cost, you can:

1. Get current IP range from Google Cloud Run documentation
2. Whitelist the entire asia-east1 Cloud Run IP range in Binance

**Cons**:
- Less secure (broader IP range)
- Still doesn't protect against key theft
- Google may change IP ranges without notice

**Cost**: $0/month

---

## Questions?

- Check logs: `gcloud run logs read bot-trading-backend --region=asia-east1`
- Check VPC status: `gcloud compute networks vpc-access connectors describe bot-trading-connector --region=asia-east1`
- Test IP: `curl https://bot-trading-backend-155580679014.asia-east1.run.app/api/auth/ip`

---

## Summary

✅ **Phase 1**: Check current IP (optional)  
✅ **Phase 2**: Run `./setup_static_ip.sh` (5-10 min)  
✅ **Phase 3**: Deploy backend with VPC connector (5-7 min)  
✅ **Phase 4**: Verify static IP  
✅ **Phase 5**: Configure Binance API key whitelist  
✅ **Phase 6**: Test everything  

**Total Time**: ~20 minutes  
**Monthly Cost**: ~$48 USD  
**Security Improvement**: Significant ✨  
