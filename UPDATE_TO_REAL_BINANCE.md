# Switch from Testnet to Real Binance API

## Steps:

1. **Create Real Binance API Key:**
   - Go to https://www.binance.com/en/my/settings/api-management
   - Create new API key
   - Enable: "Enable Spot & Margin Trading"
   - **Important:** Set IP restriction to your Cloud Run IP for security
   - Copy API Key and Secret Key

2. **Update Account in Database:**
   ```sql
   UPDATE binance_accounts 
   SET 
     api_key = 'YOUR_REAL_API_KEY',
     api_secret = 'YOUR_REAL_SECRET_KEY',
     testnet = false
   WHERE id = 2;
   ```

3. **Fund Account with Small Amount:**
   - Deposit $50-100 USDT for testing
   - Bot is configured for $10 per trade, so this allows 5-10 trades

4. **Lower Trade Amount for Safety:**
   ```sql
   UPDATE bot_configs 
   SET trade_amount_usdt = 10.0  -- Currently set, can lower to 5.0
   WHERE id = 2;
   ```

5. **Test Execution:**
   - Click "Test Now" button
   - Monitor trades in dashboard
   - Bot will only trade if strategy conditions are met

## Security Notes:
- Never share API keys
- Always use IP restrictions on Binance
- Start with small amounts for testing
- Monitor trades closely at first
