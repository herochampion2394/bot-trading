from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import BotConfig, BinanceAccount
from app.services.binance_client import BinanceTrader
from app.services.trading_engine import TradingEngine
from app.services.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/debug", tags=["Debug"])

@router.get("/bot/{bot_id}/signal")
async def get_bot_signal(
    bot_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Debug endpoint to see what signal a bot would generate right now.
    """
    bot = db.query(BotConfig).filter(BotConfig.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    binance_account = db.query(BinanceAccount).filter(
        BinanceAccount.id == bot.binance_account_id
    ).first()
    
    if not binance_account:
        raise HTTPException(status_code=404, detail="Binance account not found")
    
    trader = BinanceTrader(
        api_key=binance_account.api_key,
        api_secret=binance_account.api_secret,
        testnet=binance_account.testnet
    )
    
    # Fetch data
    klines = trader.get_historical_klines(
        symbol=bot.symbol,
        interval='1h',
        limit=100
    )
    
    if klines.empty:
        return {"error": "No klines data available"}
    
    # Get strategy and signal
    engine = TradingEngine(db)
    strategy = engine.get_strategy(bot.strategy, bot.config_params or {})
    
    if not strategy:
        return {"error": "Strategy not found"}
    
    signal_data = strategy.generate_signal(klines)
    
    return {
        "bot_id": bot.id,
        "bot_name": bot.name,
        "symbol": bot.symbol,
        "strategy": bot.strategy.value,
        "current_price": float(klines.iloc[-1]['close']),
        "signal": signal_data
    }
