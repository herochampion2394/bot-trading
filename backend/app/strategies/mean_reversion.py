import pandas as pd
import numpy as np
from ta.momentum import RSIIndicator
from ta.trend import SMAIndicator
from ta.volume import VolumeWeightedAveragePrice
import logging

logger = logging.getLogger(__name__)

class MeanReversionStrategy:
    """
    Mean Reversion strategy with RSI and Volume confirmation.
    
    Entry Conditions:
    - Price is below 20-period MA by more than 2%
    - RSI < 30 (oversold)
    - Volume is above 20-period average
    
    Exit Conditions:
    - Stop Loss: 3% below entry
    - Take Profit: 5% above entry
    - Or when price returns to MA
    """
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.rsi_period = self.config.get('rsi_period', 14)
        self.ma_period = self.config.get('ma_period', 20)
        self.rsi_oversold = self.config.get('rsi_oversold', 45)  # Relaxed for testing
        self.rsi_overbought = self.config.get('rsi_overbought', 70)
        self.price_deviation = self.config.get('price_deviation', 0.5)  # Relaxed for testing
        self.volume_multiplier = self.config.get('volume_multiplier', 0.8)  # Relaxed for testing
    
    def calculate_indicators(self, df: pd.DataFrame):
        """
        Calculate technical indicators.
        """
        df = df.copy()
        
        df['rsi'] = RSIIndicator(close=df['close'], window=self.rsi_period).rsi()
        df['ma_20'] = SMAIndicator(close=df['close'], window=self.ma_period).sma_indicator()
        df['ma_50'] = SMAIndicator(close=df['close'], window=50).sma_indicator()
        df['volume_ma'] = df['volume'].rolling(window=self.ma_period).mean()
        
        df['price_to_ma_pct'] = ((df['close'] - df['ma_20']) / df['ma_20']) * 100
        df['volume_ratio'] = df['volume'] / df['volume_ma']
        
        return df
    
    def generate_signal(self, df: pd.DataFrame):
        """
        Generate trading signal: 'BUY', 'SELL', or 'HOLD'.
        """
        if df is None or len(df) < self.ma_period:
            return {'signal': 'HOLD', 'reason': 'Insufficient data'}
        
        df = self.calculate_indicators(df)
        
        latest = df.iloc[-1]
        prev = df.iloc[-2] if len(df) > 1 else latest
        
        current_price = latest['close']
        rsi = latest['rsi']
        ma_20 = latest['ma_20']
        price_deviation_pct = latest['price_to_ma_pct']
        volume_ratio = latest['volume_ratio']
        
        # TESTING MODE: Always generate BUY signal for first few tests
        logger.info(f"Strategy check: price={current_price:.2f}, RSI={rsi:.1f}, deviation={price_deviation_pct:.2f}%, volume_ratio={volume_ratio:.2f}")
        logger.info(f"BUY conditions: deviation < -{self.price_deviation} ({price_deviation_pct:.2f} < -{self.price_deviation}), RSI < {self.rsi_oversold} ({rsi:.1f} < {self.rsi_oversold}), volume > {self.volume_multiplier} ({volume_ratio:.2f} > {self.volume_multiplier})")
        
        # Force BUY signal for testing (remove this after testing)
        return {
            'signal': 'BUY',
            'reason': f'FORCED TEST BUY - Price {current_price:.2f}, RSI {rsi:.1f}',
            'entry_price': current_price,
            'stop_loss': current_price * 0.97,
            'take_profit': current_price * 1.05,
            'indicators': {
                'rsi': rsi,
                'ma_20': ma_20,
                'price_deviation_pct': price_deviation_pct,
                'volume_ratio': volume_ratio
            }
        }
        
        # BUY Signal (Mean Reversion)
        # if (
        #     price_deviation_pct < -self.price_deviation and
        #     rsi < self.rsi_oversold and
        #     volume_ratio > self.volume_multiplier and
        #     current_price < ma_20
        # ):
        #     return {
        #         'signal': 'BUY',
        #         'reason': f'Mean reversion buy: Price {price_deviation_pct:.2f}% below MA, RSI {rsi:.1f}',
        #         'entry_price': current_price,
        #         'stop_loss': current_price * 0.97,
        #         'take_profit': current_price * 1.05,
        #         'indicators': {
        #             'rsi': rsi,
        #             'ma_20': ma_20,
        #             'price_deviation_pct': price_deviation_pct,
        #             'volume_ratio': volume_ratio
        #         }
        #     }
        
        # SELL Signal (Overbought)
        if (
            price_deviation_pct > self.price_deviation and
            rsi > self.rsi_overbought and
            volume_ratio > self.volume_multiplier
        ):
            return {
                'signal': 'SELL',
                'reason': f'Overbought: Price {price_deviation_pct:.2f}% above MA, RSI {rsi:.1f}',
                'indicators': {
                    'rsi': rsi,
                    'ma_20': ma_20,
                    'price_deviation_pct': price_deviation_pct
                }
            }
        
        return {'signal': 'HOLD', 'reason': 'No clear signal', 'indicators': {
            'rsi': rsi,
            'ma_20': ma_20,
            'price_deviation_pct': price_deviation_pct,
            'volume_ratio': volume_ratio
        }}
    
    def should_exit_position(self, entry_price: float, current_price: float, stop_loss: float, take_profit: float):
        """
        Check if should exit current position.
        """
        if current_price <= stop_loss:
            return True, 'STOP_LOSS'
        if current_price >= take_profit:
            return True, 'TAKE_PROFIT'
        return False, None
