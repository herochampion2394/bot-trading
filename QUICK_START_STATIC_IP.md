# Quick Start: Enable Binance IP Restriction

## What You Need to Know

### The Problem
Binance requires IP restriction for security, but your Cloud Run backend uses changing IPs.

### The Solution  
Set up Cloud NAT to get a permanent static IP for $48/month.

### Already Completed ✅
- Added `/api/auth/ip` endpoint to check current IP
- Updated GitHub workflow to use VPC connector (when created)
- Created setup script and documentation
- Pushed all changes to GitHub

---

## Quick Decision Guide

### Option 1: Full Security (Recommended for Production)
**Cost**: $48/month  
**Security**: Maximum  
**Time**: 20 minutes  
**Action**: Run `./setup_static_ip.sh`

✅ Single whitelisted IP  
✅ Industry standard  
✅ Binance compliant  

### Option 2: Budget/Testing (Not Recommended)
**Cost**: $0/month  
**Security**: Minimal  
**Time**: 5 minutes  
**Action**: Whitelist entire Google Cloud IP range

⚠️ Less secure  
⚠️ May break if Google changes IPs  

### Option 3: No IP Restriction (Current State)
**Cost**: $0/month  
**Security**: None for IP  
**Time**: 0 minutes  
**Action**: Do nothing

❌ Anyone with your API key can use it  
❌ Not recommended for real trading  

---

## Next Steps (If You Choose Option 1)

### Step 1: Test Current IP
```bash
curl https://bot-trading-backend-155580679014.asia-east1.run.app/api/auth/ip
```

### Step 2: Run Setup Script
```bash
cd /root/bot-trading
./setup_static_ip.sh
```

**Save the static IP it shows you!**

### Step 3: Wait for Deployment
The backend will auto-deploy after you push the trigger.

### Step 4: Add IP to Binance
1. Go to https://www.binance.com/en/my/settings/api-management
2. Edit your API key
3. Enable "Restrict access to trusted IPs only"
4. Add the static IP from Step 2
5. Make sure "Enable Spot & Margin Trading" is ON

### Step 5: Test
```bash
curl https://bot-trading-backend-155580679014.asia-east1.run.app/api/auth/ip
```
Should show your static IP.

---

## Full Documentation

For detailed instructions, troubleshooting, and rollback:
- Read `HOW_TO_ENABLE_BINANCE_IP_RESTRICTION.md`
- Read `IMPLEMENT_STATIC_IP.md` for technical details

---

## Cost Summary

| Setup | Monthly Cost | Security Level |
|-------|-------------|----------------|
| Static IP (Option 1) | $48 | ⭐⭐⭐⭐⭐ |
| IP Range (Option 2) | $0 | ⭐⭐ |
| No Restriction (Option 3) | $0 | ⭐ |

---

## Questions?

**Q: Do I need this?**  
A: If you're trading real money, YES. If just testing with $10, maybe not.

**Q: Can I reverse this?**  
A: Yes, full rollback instructions in `HOW_TO_ENABLE_BINANCE_IP_RESTRICTION.md`

**Q: What if I don't have $48/month?**  
A: Use Option 2 (budget) or Option 3 (no restriction) for now. Upgrade later.

**Q: Will my bot break during setup?**  
A: There will be ~10 minutes downtime during VPC connector creation.

**Q: Can I test first?**  
A: Yes, the IP check endpoint is already live. Try: `curl https://bot-trading-backend-155580679014.asia-east1.run.app/api/auth/ip`

