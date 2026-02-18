#!/bin/bash
echo "=== Checking Bot Trading Status ==="
echo ""
echo "1. Backend Health:"
curl -s 'https://bot-trading-backend-155580679014.asia-east1.run.app/health' | python3 -m json.tool

echo ""
echo "2. Bot Status:"
PGPASSWORD='Been1chu1@3' psql -h 35.229.232.204 -U postgres -d bot_trading -t -c "
SELECT 
  'Bot ID: ' || id || ', Status: ' || status || ', Last Run: ' || last_run || ', Total Trades: ' || total_trades
FROM bot_configs WHERE id = 2;"

echo ""
echo "3. Recent Trades:"
PGPASSWORD='Been1chu1@3' psql -h 35.229.232.204 -U postgres -d bot_trading -t -c "
SELECT COUNT(*) || ' trades found' FROM trades WHERE bot_config_id = 2;"

echo ""
echo "4. Testing Binance API (production endpoint):"
curl -s 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT' | python3 -m json.tool
