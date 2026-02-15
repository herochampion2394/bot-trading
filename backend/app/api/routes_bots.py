from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

from app.database import get_db
from app.models.models import User, BotConfig, TradingStrategy, BotStatus, BinanceAccount
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/bots", tags=["Trading Bots"])

class BotConfigCreate(BaseModel):
    binance_account_id: int
    name: str
    strategy: TradingStrategy
    symbol: str = "BTCUSDT"
    trade_amount_usdt: float
    max_risk_percent: float = 2.0
    stop_loss_percent: float = 3.0
    take_profit_percent: float = 5.0
    config_params: Optional[Dict] = None

class BotConfigUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[BotStatus] = None
    trade_amount_usdt: Optional[float] = None
    stop_loss_percent: Optional[float] = None
    take_profit_percent: Optional[float] = None
    config_params: Optional[Dict] = None

class BotConfigResponse(BaseModel):
    id: int
    name: str
    strategy: TradingStrategy
    symbol: str
    trade_amount_usdt: float
    status: BotStatus
    total_profit_usdt: float
    total_trades: int
    win_rate: float
    last_run: Optional[datetime] = None
    
    class Config:
        from_attributes = True

@router.post("/", response_model=BotConfigResponse)
async def create_bot(
    bot_data: BotConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new trading bot.
    """
    # Verify binance account belongs to user
    account = db.query(BinanceAccount).filter(
        BinanceAccount.id == bot_data.binance_account_id,
        BinanceAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Binance account not found"
        )
    
    bot = BotConfig(
        user_id=current_user.id,
        binance_account_id=bot_data.binance_account_id,
        name=bot_data.name,
        strategy=bot_data.strategy,
        symbol=bot_data.symbol,
        trade_amount_usdt=bot_data.trade_amount_usdt,
        max_risk_percent=bot_data.max_risk_percent,
        stop_loss_percent=bot_data.stop_loss_percent,
        take_profit_percent=bot_data.take_profit_percent,
        config_params=bot_data.config_params,
        status=BotStatus.PAUSED
    )
    
    db.add(bot)
    db.commit()
    db.refresh(bot)
    
    return bot

@router.get("/")
async def list_bots(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all bots for the current user.
    """
    bots = db.query(BotConfig).filter(
        BotConfig.user_id == current_user.id
    ).all()
    
    return bots

@router.get("/{bot_id}", response_model=BotConfigResponse)
async def get_bot(
    bot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific bot.
    """
    bot = db.query(BotConfig).filter(
        BotConfig.id == bot_id,
        BotConfig.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    return bot

@router.put("/{bot_id}", response_model=BotConfigResponse)
async def update_bot(
    bot_id: int,
    bot_data: BotConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a bot configuration.
    """
    bot = db.query(BotConfig).filter(
        BotConfig.id == bot_id,
        BotConfig.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    if bot_data.name:
        bot.name = bot_data.name
    if bot_data.status:
        bot.status = bot_data.status
    if bot_data.trade_amount_usdt:
        bot.trade_amount_usdt = bot_data.trade_amount_usdt
    if bot_data.stop_loss_percent:
        bot.stop_loss_percent = bot_data.stop_loss_percent
    if bot_data.take_profit_percent:
        bot.take_profit_percent = bot_data.take_profit_percent
    if bot_data.config_params:
        bot.config_params = bot_data.config_params
    
    db.commit()
    db.refresh(bot)
    
    return bot

@router.delete("/{bot_id}")
async def delete_bot(
    bot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a bot.
    """
    bot = db.query(BotConfig).filter(
        BotConfig.id == bot_id,
        BotConfig.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Don't allow deletion if bot is active
    if bot.status == BotStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an active bot. Please pause it first."
        )
    
    db.delete(bot)
    db.commit()
    
    return {"message": "Bot deleted successfully"}

@router.post("/{bot_id}/start")
async def start_bot(
    bot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a bot (set status to ACTIVE).
    """
    bot = db.query(BotConfig).filter(
        BotConfig.id == bot_id,
        BotConfig.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot.status = BotStatus.ACTIVE
    db.commit()
    
    return {"message": "Bot started successfully", "status": bot.status}

@router.post("/{bot_id}/pause")
async def pause_bot(
    bot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pause a bot (set status to PAUSED).
    """
    bot = db.query(BotConfig).filter(
        BotConfig.id == bot_id,
        BotConfig.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot.status = BotStatus.PAUSED
    db.commit()
    
    return {"message": "Bot paused successfully", "status": bot.status}
