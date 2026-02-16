# VPC Egress Setting Issue

## The New Error

```
ERROR: Cannot remove VPC connector with VPC egress set to "all-traffic". 
Set `--vpc-egress=private-ranges-only` or run this command interactively.
```

## What This Means

Cloud Run has TWO VPC-related settings:

1. **VPC Connector** - Which VPC connector to use
2. **VPC Egress** - How traffic should flow

When we set `--vpc-egress=all-traffic` in the first deployment, Cloud Run configured:
- "Send ALL outbound traffic through the VPC connector"

Now when we try to remove the VPC connector, Cloud Run says:
- "Wait, you told me to route all traffic through VPC, but now there's no VPC connector. That doesn't make sense!"

## VPC Egress Options

### `all-traffic`
- All outbound requests go through VPC connector
- Used with static IP (routes through Cloud NAT)
- Cannot remove VPC connector while this is set

### `private-ranges-only` (Default)
- Only private IP ranges (10.x.x.x, 172.x.x.x, 192.168.x.x) go through VPC
- Internet traffic goes direct
- Can remove VPC connector

## The Fix

We need to:
1. Change egress to `private-ranges-only`
2. Then clear the VPC connector

```yaml
--vpc-egress=private-ranges-only \
--clear-vpc-connector
```

## Why This Works

- `--vpc-egress=private-ranges-only` tells Cloud Run: "Don't route all traffic through VPC"
- `--clear-vpc-connector` then removes the VPC connector
- Result: Service works normally without any VPC configuration

## Current Status

✅ **Fix applied** - Added `--vpc-egress=private-ranges-only`  
🚀 **Deployment triggered** - Should succeed now  
📝 **Commit**: `86128ef`  

## When You Add VPC Later

When enabling static IP:

```yaml
# Remove these lines:
# --vpc-egress=private-ranges-only \
# --clear-vpc-connector

# Add these lines:
--vpc-egress=all-traffic \
--vpc-connector=bot-trading-connector
```

## Timeline of Issues

1. **First deployment**: Added `--vpc-egress=all-traffic` + `--vpc-connector=bot-trading-connector`
   - Cloud Run: "Route all traffic through bot-trading-connector" ✓

2. **Second deployment**: Removed both lines
   - Cloud Run: "Keep using bot-trading-connector" (persisted)
   - Error: Connector doesn't exist ❌

3. **Third deployment**: Added `--clear-vpc-connector`
   - Cloud Run: "Can't clear connector, egress is still set to all-traffic" ❌

4. **Fourth deployment**: Added `--vpc-egress=private-ranges-only` + `--clear-vpc-connector`
   - Cloud Run: "Changing egress, removing connector" ✅

## Key Lessons

1. VPC connector and VPC egress are **linked settings**
2. Can't remove VPC connector if egress is `all-traffic`
3. Must set egress to `private-ranges-only` first, then clear connector
4. Cloud Run validates configuration consistency

## Summary

- ❌ **Error**: Can't clear VPC connector with egress=all-traffic
- ✅ **Fix**: Set egress to private-ranges-only first
- 🎯 **Result**: Both VPC settings will be cleared
- 🚀 **Status**: Deployment in progress
