import sys
sys.path.insert(0, 'backend')

import asyncio
from app.database import SessionLocal
from app.models.models import BotConfig, BinanceAccount
from app.services.trading_engine import TradingEngine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_bot():
    db = SessionLocal()
    try:
        bot = db.query(BotConfig).filter(BotConfig.id == 2).first()
        if not bot:
            print("Bot not found")
            return
        
        print(f"\n=== Testing Bot {bot.id}: {bot.name} ===")
        print(f"Symbol: {bot.symbol}")
        print(f"Strategy: {bot.strategy}")
        print(f"Status: {bot.status}")
        print(f"Trade Amount: ${bot.trade_amount_usdt}")
        print(f"Binance Account ID: {bot.binance_account_id}")
        
        account = db.query(BinanceAccount).filter(BinanceAccount.id == bot.binance_account_id).first()
        if not account:
            print("\n❌ Binance account not found!")
            return
        
        print(f"\n=== Binance Account ===")
        print(f"Name: {account.name}")
        print(f"Testnet: {account.testnet}")
        print(f"Active: {account.is_active}")
        print(f"API Key: {account.api_key[:20]}...")
        
        print("\n=== Running Trading Engine ===")
        engine = TradingEngine(db)
        await engine.process_bot(bot)
        
        print("\n=== Done ===")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_bot())
