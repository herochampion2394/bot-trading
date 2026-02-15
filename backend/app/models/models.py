from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    binance_accounts = relationship("BinanceAccount", back_populates="user")
    bot_configs = relationship("BotConfig", back_populates="user")
    trades = relationship("Trade", back_populates="user")

class BinanceAccount(Base):
    __tablename__ = "binance_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    api_key = Column(String, nullable=False)
    api_secret = Column(Text, nullable=False)
    testnet = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    balance_usdt = Column(Float, default=0.0)
    last_sync = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="binance_accounts")
    bot_configs = relationship("BotConfig", back_populates="binance_account")

class TradingStrategy(str, enum.Enum):
    MEAN_REVERSION = "mean_reversion"
    RSI_OVERSOLD = "rsi_oversold"
    TREND_FOLLOWING = "trend_following"
    GRID_TRADING = "grid_trading"

class BotStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    STOPPED = "stopped"

class BotConfig(Base):
    __tablename__ = "bot_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    binance_account_id = Column(Integer, ForeignKey("binance_accounts.id"))
    name = Column(String, nullable=False)
    strategy = Column(Enum(TradingStrategy), nullable=False)
    symbol = Column(String, default="BTCUSDT")
    trade_amount_usdt = Column(Float, nullable=False)
    max_risk_percent = Column(Float, default=2.0)
    stop_loss_percent = Column(Float, default=3.0)
    take_profit_percent = Column(Float, default=5.0)
    status = Column(Enum(BotStatus), default=BotStatus.PAUSED)
    config_params = Column(JSON)
    total_profit_usdt = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    win_rate = Column(Float, default=0.0)
    last_run = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="bot_configs")
    binance_account = relationship("BinanceAccount", back_populates="bot_configs")
    trades = relationship("Trade", back_populates="bot_config")

class OrderSide(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELLED = "cancelled"
    FAILED = "failed"

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    bot_config_id = Column(Integer, ForeignKey("bot_configs.id"))
    symbol = Column(String, nullable=False)
    side = Column(Enum(OrderSide), nullable=False)
    entry_price = Column(Float)
    exit_price = Column(Float)
    quantity = Column(Float, nullable=False)
    amount_usdt = Column(Float)
    profit_loss_usdt = Column(Float, default=0.0)
    profit_loss_percent = Column(Float, default=0.0)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    binance_order_id = Column(String)
    entry_order_id = Column(String)
    exit_order_id = Column(String)
    order_id = Column(String)
    exit_reason = Column(String)
    strategy_signal = Column(String)
    stop_loss_price = Column(Float)
    take_profit_price = Column(Float)
    error_message = Column(Text)
    entry_time = Column(DateTime, default=datetime.utcnow)
    exit_time = Column(DateTime)
    
    user = relationship("User", back_populates="trades")
    bot_config = relationship("BotConfig", back_populates="trades")

class MarketData(Base):
    __tablename__ = "market_data"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    timeframe = Column(String, default="1h")
    open_price = Column(Float)
    high_price = Column(Float)
    low_price = Column(Float)
    close_price = Column(Float)
    volume = Column(Float)
    rsi = Column(Float)
    ma_20 = Column(Float)
    ma_50 = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
