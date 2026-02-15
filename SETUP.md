# Bot Trading Setup Guide

## Overview
This is an automated cryptocurrency trading bot with Binance integration. The bot executes trades every hour based on technical analysis strategies.

## What's Been Built

### Backend (FastAPI)
✅ **Trading Engine** (`app/services/trading_engine.py`)
- Executes hourly trading via APScheduler
- Processes all active bot configurations
- Manages open positions (stop-loss, take-profit)
- Logs all trades and P&L

✅ **Mean Reversion Strategy** (`app/strategies/mean_reversion.py`)
- Entry: Price >2% below 20-MA, RSI<30, Volume>1.5x avg
- Exit: Stop-loss at -3%, Take-profit at +5%

✅ **API Routes**
- `/api/auth/*` - Login, register, JWT authentication
- `/api/binance/accounts/*` - Connect/manage Binance accounts
- `/api/bots/*` - Create/manage trading bots
- `/api/trades/*` - View trades and analytics

✅ **Database Models**
- User, BinanceAccount, BotConfig, Trade, MarketData
- Auto-created on first run

### Frontend (React)
✅ **Basic Structure**
- Login page
- Dashboard with P&L overview
- Placeholder pages for Bots, Trades, Accounts

### Deployment
✅ **GitHub Actions CI/CD**
- Auto-deploy backend to Cloud Run on push to `main`
- Dockerfile configured

## Environment Variables Needed

### For GitHub Actions (add these as secrets):
```
GCP_PROJECT_ID=your-gcp-project-id
GCP_SA_KEY=<service-account-json-key>
GCP_REGION=asia-east1
DATABASE_URL=postgresql://postgres:Been1chu1@3@35.229.232.204:5432/bot_trading
SECRET_KEY=<generate-with: openssl rand -hex 32>
```

### For local development (.env file):
```
DATABASE_URL=postgresql://postgres:Been1chu1@3@35.229.232.204:5432/bot_trading
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

## Database Setup

1. Create database:
```sql
CREATE DATABASE bot_trading;
```

2. Tables will be auto-created on first run by SQLAlchemy

## Trading Algorithm Explained

### Mean Reversion Strategy

**Philosophy:** When price drops significantly below average, it tends to bounce back.

**Entry Signals (all must be true):**
1. Price is >2% below 20-period moving average (oversold)
2. RSI < 30 (oversold momentum)
3. Volume > 1.5x average (confirming the move)

**Exit Signals:**
1. Stop Loss: Price drops 3% below entry (limit losses)
2. Take Profit: Price rises 5% above entry (lock in gains)

**Risk Management:**
- Max 2% of account per trade (configurable)
- Only 1 open position per bot at a time
- All trades logged with P&L

**Example Trade:**
```
BTC is at $40,000
20-MA is at $41,000 (price is 2.4% below)
RSI is 28 (oversold)
Volume is 2.1x average (high)

→ BUY signal triggered
→ Buy $100 worth of BTC
→ Stop loss: $38,800 (-3%)
→ Take profit: $42,000 (+5%)

If BTC hits $42,000 → Sell for $5 profit
If BTC drops to $38,800 → Sell for -$3 loss
```

## Hourly Execution

The trading engine runs **every hour at minute :00**.

**What happens each hour:**
1. Get all active bots
2. For each bot:
   - Check if it has an open position
   - If yes: Check stop-loss/take-profit
   - If no: Check for entry signal
3. Execute trades via Binance API
4. Update database with results

**Manual trigger** (for testing):
```bash
curl -X POST https://your-backend-url/api/trading/execute-now
```

## Binance API Setup

Users need to create Binance API keys:

1. Go to Binance.com → Profile → API Management
2. Create API key with permissions:
   - ✅ Enable Spot & Margin Trading
   - ✅ Enable Reading
3. Whitelist your server IP (optional for security)
4. Copy API Key and Secret
5. Enter in the app's "Accounts" page

**Testnet (recommended for testing):**
- Use https://testnet.binance.vision/
- Get free test USDT
- Check "Testnet" when adding account

## Cloud Run Considerations

### Scheduler
The backend uses APScheduler running inside the container. This works fine for Cloud Run because:
- Cloud Run keeps at least 1 instance warm
- Scheduler state is in memory (restarts on deployment)

**Alternative:** Use Google Cloud Scheduler to hit `/api/trading/execute-now` endpoint every hour for more reliability.

### Stateful Checks
The trading engine checks `bot.last_run` timestamp to prevent duplicate trades if multiple instances run.

### Scaling
- Set `--min-instances 1` to keep scheduler running
- Or use Cloud Scheduler + HTTP endpoint instead

## Testing Checklist

- [ ] Create database `bot_trading`
- [ ] Add GitHub secrets
- [ ] Push to GitHub → triggers deployment
- [ ] Register user account
- [ ] Add Binance testnet account
- [ ] Create a bot with BTC/USDT
- [ ] Set bot to ACTIVE
- [ ] Trigger manual execution to test
- [ ] Check trades in database
- [ ] Wait for hourly execution
- [ ] Monitor logs in Cloud Run console

## Security Warnings

⚠️ **CRITICAL:**
1. API keys are stored in **plain text** in database
   - TODO: Implement encryption (use Fernet or GCP Secret Manager)
2. Use Binance testnet first
3. Set IP whitelist on Binance API keys
4. Rotate GitHub token after setup
5. Use minimal Binance permissions (no withdrawal)

## Next Steps to Improve

1. **Encrypt API keys** - Add encryption service
2. **More strategies** - RSI, trend following, grid trading
3. **Backtesting** - Test strategies on historical data
4. **Better frontend** - Complete Bots, Trades, Accounts pages
5. **Notifications** - Telegram/email alerts for trades
6. **Multiple timeframes** - 5m, 15m, 1h, 4h charts
7. **Portfolio management** - Multiple symbols per bot
8. **Paper trading mode** - Test without real money

## Troubleshooting

**Bot not executing:**
- Check bot status is ACTIVE
- Check scheduler is running: `GET /health`
- Check Cloud Run logs
- Verify Binance API keys are valid

**Trades failing:**
- Check Binance account has USDT balance
- Verify API permissions (Spot Trading enabled)
- Check error_message field in trades table

**Database connection errors:**
- Verify DATABASE_URL is correct
- Check Cloud SQL allows connections from Cloud Run
- Test connection from local machine

## Links

- **Repository:** https://github.com/herochampion2394/bot-trading
- **Binance API Docs:** https://binance-docs.github.io/apidocs/spot/en/
- **Binance Testnet:** https://testnet.binance.vision/
