from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import requests
import logging

from app.database import get_db
from app.models.models import User, BinanceAccount, Trade
from app.services.auth import get_current_user
from app.services.binance_client import BinanceTrader

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/binance", tags=["Binance"])

class BinanceAccountCreate(BaseModel):
    name: str
    api_key: str
    api_secret: str
    testnet: bool = False

class BinanceAccountUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    is_active: Optional[bool] = None

class BinanceAccountResponse(BaseModel):
    id: int
    name: str
    api_key: str
    testnet: bool
    is_active: bool
    balance_usdt: float
    
    class Config:
        from_attributes = True

@router.post("/accounts", response_model=BinanceAccountResponse)
async def connect_binance_account(
    account_data: BinanceAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connect a new Binance account.
    """
    # Test connection first
    try:
        trader = BinanceTrader(
            api_key=account_data.api_key,
            api_secret=account_data.api_secret,
            testnet=account_data.testnet
        )
        balance = trader.get_account_balance()
        if balance is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to connect to Binance. Check your API credentials."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Binance connection failed: {str(e)}"
        )
    
    account = BinanceAccount(
        user_id=current_user.id,
        name=account_data.name,
        api_key=account_data.api_key,
        api_secret=account_data.api_secret,
        testnet=account_data.testnet,
        balance_usdt=balance.get('USDT', {}).get('total', 0.0)
    )
    
    db.add(account)
    db.commit()
    db.refresh(account)
    
    return account

@router.get("/accounts")
async def list_binance_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all Binance accounts for the current user.
    """
    accounts = db.query(BinanceAccount).filter(
        BinanceAccount.user_id == current_user.id
    ).all()
    
    # Add holdings information
    result = []
    for acc in accounts:
        holdings = await get_account_holdings(acc.id, db)
        total_holdings_value = sum(h['current_value'] for h in holdings)
        
        result.append({
            "id": acc.id,
            "name": acc.name,
            "testnet": acc.testnet,
            "is_active": acc.is_active,
            "balance_usdt": acc.balance_usdt,
            "api_key": acc.api_key,
            "balance": str(acc.balance_usdt),
            "holdings": holdings,
            "total_holdings_value": total_holdings_value,
            "total_portfolio_value": (acc.balance_usdt or 0) + total_holdings_value
        })
    
    return result


async def get_account_holdings(account_id: int, db):
    """Calculate coin holdings from open trades."""
    try:
        from sqlalchemy import func
        from app.models.models import BotConfig, Trade, OrderStatus
        
        # Find all bots using this account
        bot_ids = db.query(BotConfig.id).filter(
            BotConfig.binance_account_id == account_id
        ).all()
        bot_ids = [b[0] for b in bot_ids]
        
        if not bot_ids:
            return []
        
        # Get BUY trades without corresponding exit
        buy_trades = db.query(
            Trade.symbol,
            func.sum(Trade.quantity).label('total_quantity'),
            func.avg(Trade.entry_price).label('avg_entry_price')
        ).filter(
            Trade.bot_config_id.in_(bot_ids),
            Trade.side == 'BUY',
            Trade.status == OrderStatus.FILLED,
            Trade.exit_time.is_(None)
        ).group_by(Trade.symbol).all()
        
        holdings = []
        for symbol, quantity, avg_price in buy_trades:
            if quantity and quantity > 0:
                # Get current price from Binance US
                try:
                    response = requests.get(
                        f"https://api.binance.us/api/v3/ticker/price",
                        params={'symbol': symbol},
                        timeout=5
                    )
                    response.raise_for_status()
                    current_price = float(response.json()['price'])
                except Exception as e:
                    logger.error(f"Error fetching price for {symbol}: {e}")
                    current_price = avg_price
                
                current_value = quantity * current_price
                cost_basis = quantity * avg_price
                unrealized_pnl = current_value - cost_basis
                pnl_percent = (unrealized_pnl / cost_basis * 100) if cost_basis > 0 else 0
                
                holdings.append({
                    'symbol': symbol,
                    'quantity': float(quantity),
                    'avg_entry_price': float(avg_price),
                    'current_price': float(current_price),
                    'current_value': float(current_value),
                    'cost_basis': float(cost_basis),
                    'unrealized_pnl': float(unrealized_pnl),
                    'pnl_percent': float(pnl_percent)
                })
        
        return holdings
    except Exception as e:
        logger.error(f"Error calculating holdings: {e}", exc_info=True)
        return []

@router.get("/accounts/{account_id}", response_model=BinanceAccountResponse)
async def get_binance_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific Binance account.
    """
    account = db.query(BinanceAccount).filter(
        BinanceAccount.id == account_id,
        BinanceAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return account

@router.put("/accounts/{account_id}", response_model=BinanceAccountResponse)
async def update_binance_account(
    account_id: int,
    account_data: BinanceAccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a Binance account.
    """
    account = db.query(BinanceAccount).filter(
        BinanceAccount.id == account_id,
        BinanceAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if account_data.name:
        account.name = account_data.name
    if account_data.api_key:
        account.api_key = account_data.api_key
    if account_data.api_secret:
        account.api_secret = account_data.api_secret
    if account_data.is_active is not None:
        account.is_active = account_data.is_active
    
    db.commit()
    db.refresh(account)
    
    return account

@router.delete("/accounts/{account_id}")
async def delete_binance_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a Binance account.
    """
    account = db.query(BinanceAccount).filter(
        BinanceAccount.id == account_id,
        BinanceAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    db.delete(account)
    db.commit()
    
    return {"message": "Account deleted successfully"}

@router.post("/accounts/{account_id}/sync")
async def sync_binance_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync account balance with Binance.
    """
    account = db.query(BinanceAccount).filter(
        BinanceAccount.id == account_id,
        BinanceAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    try:
        trader = BinanceTrader(
            api_key=account.api_key,
            api_secret=account.api_secret,
            testnet=account.testnet
        )
        balance = trader.get_account_balance()
        account.balance_usdt = balance.get('USDT', {}).get('total', 0.0)
        db.commit()
        
        return {"balance_usdt": account.balance_usdt, "full_balance": balance}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync balance: {str(e)}"
        )


@router.get("/portfolio/summary")
async def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get portfolio summary across all accounts.
    """
    from datetime import datetime, timedelta
    
    accounts = db.query(BinanceAccount).filter(
        BinanceAccount.user_id == current_user.id
    ).all()
    
    total_usdt_balance = 0
    total_holdings_value = 0
    all_holdings = []
    
    for acc in accounts:
        total_usdt_balance += acc.balance_usdt or 0
        holdings = await get_account_holdings(acc.id, db)
        for h in holdings:
            total_holdings_value += h['current_value']
            all_holdings.append(h)
    
    total_portfolio_value = total_usdt_balance + total_holdings_value
    
    # Calculate P&L from trades
    trades = db.query(Trade).filter(
        Trade.user_id == current_user.id
    ).all()
    
    total_invested = sum(t.amount_usdt or 0 for t in trades if t.side.value == 'BUY')
    total_sold = sum(t.amount_usdt or 0 for t in trades if t.side.value == 'SELL')
    
    # Unrealized P&L from holdings
    unrealized_pnl = sum(h.get('unrealized_pnl', 0) for h in all_holdings)
    
    # Today's trades
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_trades = [t for t in trades if t.entry_time and t.entry_time >= today_start]
    today_bought = sum(t.amount_usdt or 0 for t in today_trades if t.side.value == 'BUY')
    today_sold = sum(t.amount_usdt or 0 for t in today_trades if t.side.value == 'SELL')
    today_pnl = today_sold - today_bought + unrealized_pnl
    
    # Total P&L (realized + unrealized)
    realized_pnl = total_sold - total_invested
    total_pnl = realized_pnl + unrealized_pnl
    
    # P&L percentages
    initial_value = total_portfolio_value - total_pnl if total_pnl != 0 else total_portfolio_value
    total_pnl_percent = (total_pnl / initial_value * 100) if initial_value > 0 else 0
    today_pnl_percent = (today_pnl / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
    
    return {
        "total_portfolio_value": round(total_portfolio_value, 2),
        "usdt_balance": round(total_usdt_balance, 2),
        "holdings_value": round(total_holdings_value, 2),
        "holdings": all_holdings,
        "total_pnl": round(total_pnl, 2),
        "total_pnl_percent": round(total_pnl_percent, 2),
        "today_pnl": round(today_pnl, 2),
        "today_pnl_percent": round(today_pnl_percent, 2),
        "total_trades": len(trades),
        "accounts_count": len(accounts)
    }
