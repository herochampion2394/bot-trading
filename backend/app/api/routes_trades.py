from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.models.models import User, Trade, BotConfig, OrderStatus, BinanceAccount, OrderSide
from app.services.auth import get_current_user
from app.services.binance_client import BinanceTrader
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/trades", tags=["Trades"])

class ManualTradeRequest(BaseModel):
    binance_account_id: int
    symbol: str
    side: str
    amount_usdt: float

class TradeResponse(BaseModel):
    id: int
    symbol: str
    side: str
    entry_price: Optional[float]
    exit_price: Optional[float]
    quantity: float
    amount_usdt: float
    profit_loss_usdt: float
    profit_loss_percent: float
    status: OrderStatus
    entry_time: Optional[datetime]
    exit_time: Optional[datetime]
    bot_config_id: int
    
    class Config:
        from_attributes = True

@router.get("")
async def list_trades(
    bot_id: Optional[int] = Query(None),
    status: Optional[OrderStatus] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List trades with optional filtering.
    """
    query = db.query(Trade).filter(Trade.user_id == current_user.id)
    
    if bot_id:
        query = query.filter(Trade.bot_config_id == bot_id)
    if status:
        query = query.filter(Trade.status == status)
    
    total = query.count()
    trades = query.order_by(desc(Trade.entry_time)).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "trades": trades
    }

@router.get("/analytics")
async def get_trade_analytics(
    bot_id: Optional[int] = Query(None),
    days: int = Query(30, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get trade analytics and statistics.
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(Trade).filter(
        and_(
            Trade.user_id == current_user.id,
            Trade.entry_time >= start_date
        )
    )
    
    if bot_id:
        query = query.filter(Trade.bot_config_id == bot_id)
    
    trades = query.all()
    
    if not trades:
        return {
            "total_trades": 0,
            "total_profit_loss": 0,
            "win_rate": 0,
            "avg_profit_per_trade": 0,
            "best_trade": None,
            "worst_trade": None,
            "daily_pnl": []
        }
    
    closed_trades = [t for t in trades if t.exit_price is not None]
    winning_trades = [t for t in closed_trades if t.profit_loss_usdt > 0]
    
    total_profit_loss = sum(t.profit_loss_usdt for t in closed_trades)
    win_rate = (len(winning_trades) / len(closed_trades) * 100) if closed_trades else 0
    avg_profit = total_profit_loss / len(closed_trades) if closed_trades else 0
    
    best_trade = max(closed_trades, key=lambda t: t.profit_loss_usdt) if closed_trades else None
    worst_trade = min(closed_trades, key=lambda t: t.profit_loss_usdt) if closed_trades else None
    
    # Daily P&L
    daily_pnl = {}
    for trade in closed_trades:
        if trade.exit_time:
            date_key = trade.exit_time.strftime('%Y-%m-%d')
            daily_pnl[date_key] = daily_pnl.get(date_key, 0) + trade.profit_loss_usdt
    
    return {
        "total_trades": len(trades),
        "closed_trades": len(closed_trades),
        "open_trades": len(trades) - len(closed_trades),
        "total_profit_loss": round(total_profit_loss, 2),
        "win_rate": round(win_rate, 2),
        "avg_profit_per_trade": round(avg_profit, 2),
        "winning_trades": len(winning_trades),
        "losing_trades": len(closed_trades) - len(winning_trades),
        "best_trade": {
            "id": best_trade.id,
            "symbol": best_trade.symbol,
            "profit_loss": best_trade.profit_loss_usdt
        } if best_trade else None,
        "worst_trade": {
            "id": worst_trade.id,
            "symbol": worst_trade.symbol,
            "profit_loss": worst_trade.profit_loss_usdt
        } if worst_trade else None,
        "daily_pnl": [{
            "date": date,
            "pnl": round(pnl, 2)
        } for date, pnl in sorted(daily_pnl.items())]
    }

@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(
    trade_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific trade.
    """
    trade = db.query(Trade).filter(
        Trade.id == trade_id,
        Trade.user_id == current_user.id
    ).first()
    
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    return trade

@router.post("/manual")
async def create_manual_trade(
    trade_request: ManualTradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute a manual trade.
    """
    try:
        account = db.query(BinanceAccount).filter(
            BinanceAccount.id == trade_request.binance_account_id,
            BinanceAccount.user_id == current_user.id
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Binance account not found")
        if not account.is_active:
            raise HTTPException(status_code=400, detail="Account not active")
        
        trader = BinanceTrader(
           api_key=account.api_key,
           api_secret=account.api_secret,
           testnet=account.testnet
       )
       
       logger.info(f"Manual trade - Account ID: {account.id}, Testnet: {account.testnet}, Side: {trade_request.side}")
       
       current_price = trader.get_current_price(trade_request.symbol)
       if not current_price:
           raise HTTPException(status_code=400, detail=f"Could not get price for {trade_request.symbol}")
       
       # For BUY: amount_usdt is how much USDT to spend -> calculate BTC quantity
       # For SELL: need to find how much BTC to sell to get amount_usdt worth
       if trade_request.side == 'BUY':
           quantity = trade_request.amount_usdt / current_price
       else:  # SELL
           # Find user's BTC holdings from trades
           buy_trades = db.query(Trade).filter(
               Trade.user_id == current_user.id,
               Trade.symbol == trade_request.symbol,
               Trade.side == OrderSide.BUY,
               Trade.status == OrderStatus.FILLED
           ).all()
           
           sell_trades = db.query(Trade).filter(
               Trade.user_id == current_user.id,
               Trade.symbol == trade_request.symbol,
               Trade.side == OrderSide.SELL,
               Trade.status == OrderStatus.FILLED
           ).all()
           
           total_bought = sum(t.quantity for t in buy_trades)
           total_sold = sum(t.quantity for t in sell_trades)
           available_quantity = total_bought - total_sold
           
           # Calculate how much BTC to sell
           quantity_to_sell = trade_request.amount_usdt / current_price
           
           if quantity_to_sell > available_quantity:
               raise HTTPException(
                   status_code=400,
                   detail=f"Insufficient {trade_request.symbol.replace('USDT', '')} balance. Available: {available_quantity:.8f}, Requested: {quantity_to_sell:.8f}"
               )
           
           quantity = quantity_to_sell
       
       logger.info(f"Manual {trade_request.side}: {quantity} {trade_request.symbol} @ {current_price}")
       
       order_result = trader.place_market_order(
           symbol=trade_request.symbol,
           side=trade_request.side,
           quantity=quantity
       )
       
       logger.info(f"Order result: {order_result}")
       
       if not order_result or not order_result.get('success'):
           error_msg = order_result.get('error', 'Unknown error') if order_result else 'No response'
           raise HTTPException(status_code=400, detail=f"Order failed: {error_msg}")
        
        if account.testnet:
           if trade_request.side == 'BUY':
               account.balance_usdt = (account.balance_usdt or 10000.0) - trade_request.amount_usdt
           elif trade_request.side == 'SELL':
               # When selling, add the USDT value received back to balance
               usdt_received = current_price * quantity
               account.balance_usdt = (account.balance_usdt or 0.0) + usdt_received
               logger.info(f"SELL: Received ${usdt_received:.2f} USDT, new balance: ${account.balance_usdt:.2f}")
       
       trade = Trade(
            user_id=current_user.id,
            bot_config_id=None,
            symbol=trade_request.symbol,
            side=OrderSide.BUY if trade_request.side == 'BUY' else OrderSide.SELL,
            entry_price=order_result.get('price', current_price),
            quantity=order_result.get('quantity', quantity),
            amount_usdt=trade_request.amount_usdt,
            status=OrderStatus.FILLED,
            order_id=order_result.get('order_id'),
            entry_time=datetime.utcnow(),
            strategy_signal='Manual trade'
        )
        
        db.add(trade)
        db.commit()
        db.refresh(trade)
        
        return {
            "success": True,
            "trade_id": trade.id,
            "symbol": trade.symbol,
            "side": trade_request.side,
            "price": order_result.get('price', current_price),
            "quantity": order_result.get('quantity', quantity),
            "amount_usdt": trade_request.amount_usdt,
            "balance_usdt": account.balance_usdt
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual trade error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
