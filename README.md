# Bot Trading - Automated Crypto Trading Platform

An automated cryptocurrency trading bot with Binance integration, built with FastAPI and React.

## Features

- **Multiple Trading Strategies**
  - Mean Reversion with RSI and Volume confirmation
  - More strategies coming soon

- **Binance Integration**
  - Connect multiple Binance accounts
  - Support for testnet and production
  - Real-time balance syncing

- **Automated Trading**
  - Hourly execution via APScheduler
  - Configurable stop-loss and take-profit
  - Risk management (max 2% per trade)

- **Analytics & Monitoring**
  - Real-time P&L tracking
  - Win rate statistics
  - Trade history and performance charts

- **Cloud Deployment**
  - Google Cloud Run for backend
  - PostgreSQL database
  - CI/CD with GitHub Actions

## Tech Stack

### Backend
- FastAPI
- SQLAlchemy
- python-binance
- pandas, ta (technical analysis)
- APScheduler (hourly trading)

### Frontend
- React 18
- React Router
- TanStack Query
- Recharts (for charts)
- Tailwind CSS

## Setup

### Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/bot_trading

# JWT Authentication
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Binance (set by users in UI)
# Users add their own API keys through the dashboard
```

### Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Trading Algorithm

### Mean Reversion Strategy

**Entry Conditions:**
- Price is >2% below 20-period MA
- RSI < 30 (oversold)
- Volume > 1.5x average

**Exit Conditions:**
- Stop Loss: 3% below entry
- Take Profit: 5% above entry

**Risk Management:**
- Max 2% of account per trade
- Position sizing based on configured trade amount

## Deployment

### GitHub Secrets Required

```
GCP_PROJECT_ID - Your Google Cloud project ID
GCP_SA_KEY - Service account JSON key
GCP_REGION - Deployment region (e.g., asia-east1)
DATABASE_URL - PostgreSQL connection string
SECRET_KEY - JWT secret key
```

### Cloud Run Deployment

The backend automatically deploys to Cloud Run on push to `main` branch.

**Scheduler Setup:**
- APScheduler runs inside the container
- Executes every hour at minute 0
- Can also trigger manually via `/api/trading/execute-now`

## Database

Tables are auto-created on first run. Schema includes:
- `users` - User accounts
- `binance_accounts` - Binance API credentials
- `bot_configs` - Bot trading configurations
- `trades` - Trade history and P&L
- `market_data` - Cached market data

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Binance Accounts
- `POST /api/binance/accounts` - Connect Binance account
- `GET /api/binance/accounts` - List accounts
- `POST /api/binance/accounts/{id}/sync` - Sync balance

### Trading Bots
- `POST /api/bots/` - Create bot
- `GET /api/bots/` - List bots
- `POST /api/bots/{id}/start` - Start bot
- `POST /api/bots/{id}/pause` - Pause bot

### Trades
- `GET /api/trades/` - List trades
- `GET /api/trades/analytics` - Get analytics

## Security Notes

⚠️ **Important:**
- API keys are currently stored in plain text in the database
- **TODO:** Implement encryption for api_secret field
- Use Binance testnet for initial testing
- Never commit API keys to git

## License

MIT
