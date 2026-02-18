import asyncio
import sys
sys.path.insert(0, 'backend')

from app.services.binance_client import BinanceTrader
from app.database import SessionLocal
from app.models.models import BinanceAccount

def test_connection():
    db = SessionLocal()
    try:
        # Get the testnet account
        account = db.query(BinanceAccount).filter(BinanceAccount.id == 2).first()
        
        if not account:
            print("Account not found")
            return
        
        print(f"Testing connection for account: {account.name}")
        print(f"Testnet: {account.testnet}")
        print(f"API Key (first 10 chars): {account.api_key[:10]}...")
        
        trader = BinanceTrader(
            api_key=account.api_key,
            api_secret=account.api_secret,
            testnet=account.testnet
        )
        
        print("\n1. Testing get_account_balance...")
        balance = trader.get_account_balance()
        print(f"Balance: {balance}")
        
        print("\n2. Testing get_current_price for BTCUSDT...")
        price = trader.get_current_price('BTCUSDT')
        print(f"BTC Price: {price}")
        
        print("\n3. Testing get_historical_klines...")
        df = trader.get_historical_klines('BTCUSDT', '1h', 10)
        print(f"Fetched {len(df)} candles")
        if not df.empty:
            print(f"Latest close price: {df['close'].iloc[-1]}")
            print(f"Columns: {df.columns.tolist()}")
        else:
            print("ERROR: Empty DataFrame returned")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_connection()
