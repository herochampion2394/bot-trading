import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import pandas as pd

from app.models.models import (
    BotConfig, Trade, BinanceAccount, BotStatus, 
    OrderSide, OrderStatus, TradingStrategy
)
from app.services.binance_client import BinanceTrader
from app.strategies.mean_reversion import MeanReversionStrategy

logger = logging.getLogger(__name__)

class TradingEngine:
    """
    Core trading engine that executes trades based on bot configurations.
    Runs hourly to check signals and manage positions.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_strategy(self, strategy_type: TradingStrategy, config_params: dict):
        """Get strategy instance based on type."""
        if strategy_type == TradingStrategy.MEAN_REVERSION:
            return MeanReversionStrategy(config_params)
        # Add other strategies here
        return None
    
    async def execute_hourly_trading(self):
        """
        Main execution method called every hour.
        Processes all active bot configs.
        """
        logger.info("Starting hourly trading execution")
        
        active_bots = self.db.query(BotConfig).filter(
            BotConfig.status == BotStatus.ACTIVE
        ).all()
        
        logger.info(f"Found {len(active_bots)} active bots")
        
        for bot in active_bots:
            try:
                await self.process_bot(bot)
            except Exception as e:
                logger.error(f"Error processing bot {bot.id}: {e}")
                bot.status = BotStatus.ERROR
                self.db.commit()
        
        logger.info("Hourly trading execution completed")
    
    async def process_bot(self, bot: BotConfig):
        """
        Process a single bot configuration.
        """
        logger.info(f"Processing bot {bot.id} ({bot.name}) - {bot.symbol}")
        
        binance_account = self.db.query(BinanceAccount).filter(
            BinanceAccount.id == bot.binance_account_id
        ).first()
        
        if not binance_account or not binance_account.is_active:
            logger.warning(f"Binance account not active for bot {bot.id}")
            return
        
        trader = BinanceTrader(
            api_key=binance_account.api_key,
            api_secret=binance_account.api_secret,
            testnet=binance_account.testnet
        )
        
        # Check for open positions first
        open_trade = self.db.query(Trade).filter(
            and_(
                Trade.bot_config_id == bot.id,
                Trade.status == OrderStatus.FILLED,
                Trade.exit_price.is_(None)
            )
        ).first()
        
        if open_trade:
            await self.manage_open_position(bot, trader, open_trade)
        else:
            await self.check_entry_signal(bot, trader)
        
        bot.last_run = datetime.utcnow()
        self.db.commit()
    
    async def check_entry_signal(self, bot: BotConfig, trader: BinanceTrader):
        """
        Check if there's an entry signal for the bot.
        """
        try:
            # Fetch historical data
            klines = trader.get_historical_klines(
                symbol=bot.symbol,
                interval='1h',
                limit=100
            )
            
            if not klines:
                logger.warning(f"No klines data for {bot.symbol}")
                return
            
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])
            
            df['close'] = pd.to_numeric(df['close'])
            df['volume'] = pd.to_numeric(df['volume'])
            
            # Get strategy and generate signal
            strategy = self.get_strategy(bot.strategy, bot.config_params or {})
            signal_data = strategy.generate_signal(df)
            
            logger.info(f"Signal for bot {bot.id}: {signal_data['signal']} - {signal_data['reason']}")
            
            if signal_data['signal'] == 'BUY':
                await self.execute_buy_order(bot, trader, signal_data)
        
        except Exception as e:
            logger.error(f"Error checking entry signal for bot {bot.id}: {e}")
    
    async def execute_buy_order(self, bot: BotConfig, trader: BinanceTrader, signal_data: Dict):
        """
        Execute a buy order based on signal.
        """
        try:
            current_price = signal_data['entry_price']
            quantity = bot.trade_amount_usdt / current_price
            
            logger.info(f"Executing BUY order for bot {bot.id}: {quantity} {bot.symbol} @ {current_price}")
            
            # Place market order
            order = trader.place_market_order(
                symbol=bot.symbol,
                side='BUY',
                quantity=quantity
            )
            
            if order and order.get('status') == 'FILLED':
                # Record trade
                trade = Trade(
                    user_id=bot.user_id,
                    bot_config_id=bot.id,
                    symbol=bot.symbol,
                    side=OrderSide.BUY,
                    entry_price=float(order.get('fills', [{}])[0].get('price', current_price)),
                    quantity=quantity,
                    amount_usdt=bot.trade_amount_usdt,
                    status=OrderStatus.FILLED,
                    order_id=order.get('orderId'),
                    entry_time=datetime.utcnow(),
                    strategy_signal=signal_data['reason']
                )
                self.db.add(trade)
                
                bot.total_trades += 1
                self.db.commit()
                
                logger.info(f"BUY order executed successfully for bot {bot.id}")
        
        except Exception as e:
            logger.error(f"Error executing buy order for bot {bot.id}: {e}")
    
    async def manage_open_position(self, bot: BotConfig, trader: BinanceTrader, trade: Trade):
        """
        Manage an open position (check stop-loss, take-profit).
        """
        try:
            current_price = trader.get_current_price(bot.symbol)
            
            if not current_price:
                logger.warning(f"Could not get current price for {bot.symbol}")
                return
            
            # Calculate stop-loss and take-profit
            stop_loss = trade.entry_price * (1 - bot.stop_loss_percent / 100)
            take_profit = trade.entry_price * (1 + bot.take_profit_percent / 100)
            
            strategy = self.get_strategy(bot.strategy, bot.config_params or {})
            should_exit, exit_reason = strategy.should_exit_position(
                trade.entry_price, current_price, stop_loss, take_profit
            )
            
            if should_exit:
                await self.execute_sell_order(bot, trader, trade, current_price, exit_reason)
        
        except Exception as e:
            logger.error(f"Error managing open position for bot {bot.id}: {e}")
    
    async def execute_sell_order(self, bot: BotConfig, trader: BinanceTrader, 
                                 trade: Trade, current_price: float, exit_reason: str):
        """
        Execute a sell order to close position.
        """
        try:
            logger.info(f"Executing SELL order for bot {bot.id}: {trade.quantity} {bot.symbol} @ {current_price}")
            
            order = trader.place_market_order(
                symbol=bot.symbol,
                side='SELL',
                quantity=trade.quantity
            )
            
            if order and order.get('status') == 'FILLED':
                exit_price = float(order.get('fills', [{}])[0].get('price', current_price))
                
                # Calculate P&L
                profit_loss_usdt = (exit_price - trade.entry_price) * trade.quantity
                profit_loss_percent = ((exit_price - trade.entry_price) / trade.entry_price) * 100
                
                # Update trade
                trade.exit_price = exit_price
                trade.profit_loss_usdt = profit_loss_usdt
                trade.profit_loss_percent = profit_loss_percent
                trade.exit_time = datetime.utcnow()
                trade.exit_reason = exit_reason
                
                # Update bot stats
                bot.total_profit_usdt += profit_loss_usdt
                if profit_loss_usdt > 0:
                    wins = self.db.query(Trade).filter(
                        and_(
                            Trade.bot_config_id == bot.id,
                            Trade.profit_loss_usdt > 0
                        )
                    ).count()
                    bot.win_rate = (wins / bot.total_trades) * 100 if bot.total_trades > 0 else 0
                
                self.db.commit()
                
                logger.info(f"SELL order executed: P&L = ${profit_loss_usdt:.2f} ({profit_loss_percent:.2f}%)")
        
        except Exception as e:
            logger.error(f"Error executing sell order for bot {bot.id}: {e}")
