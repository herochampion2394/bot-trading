from binance.client import Client
from binance.exceptions import BinanceAPIException
import pandas as pd
import numpy as np
from ta.momentum import RSIIndicator
from ta.trend import SMAIndicator
from datetime import datetime
import logging
import requests

logger = logging.getLogger(__name__)

class BinanceTrader:
    def __init__(self, api_key: str, api_secret: str, testnet: bool = False):
        if testnet:
            # Paper trading mode - use real Binance data but don't place orders
            self.testnet = True  # Flag for paper trading
            self.paper_balance = 10000.0  # Starting paper trading balance in USDT
            # Don't initialize client for paper trading - use public APIs instead
            self.client = None
        else:
            self.client = Client(api_key, api_secret)
            self.testnet = False
            self.paper_balance = None
    
    def get_account_balance(self):
        # Paper trading mode - return simulated balance
        if self.testnet:
            return {
                'USDT': {
                    'free': self.paper_balance,
                    'locked': 0.0,
                    'total': self.paper_balance
                }
            }
        
        # Real trading mode
        try:
            account = self.client.get_account()
            balances = {}
            for balance in account['balances']:
                free = float(balance['free'])
                locked = float(balance['locked'])
                if free > 0 or locked > 0:
                    balances[balance['asset']] = {
                        'free': free,
                        'locked': locked,
                        'total': free + locked
                    }
            return balances
        except BinanceAPIException as e:
            logger.error(f"Error getting balance: {e}")
            return {}
    
    def get_usdt_balance(self):
        balances = self.get_account_balance()
        return balances.get('USDT', {}).get('free', 0.0)
    
    def get_historical_klines(self, symbol: str, interval: str = '1h', limit: int = 100):
        try:
            logger.info(f"Fetching klines for {symbol} (testnet={self.testnet})")
            
            # Paper trading with mock data if API is geo-blocked
            if self.testnet:
                logger.info(f"Fetching real-time data from Binance US for paper trading")
                return self._fetch_public_klines(symbol, interval, limit)
            
            klines = self.client.get_klines(
                symbol=symbol,
                interval=interval,
                limit=limit
            )
            logger.info(f"Successfully fetched {len(klines)} klines for {symbol}")
            
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])
            
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)
            
            return df
        except BinanceAPIException as e:
            logger.error(f"Binance API error getting klines for {symbol}: {e.status_code} - {e.message}")
            return pd.DataFrame()
        except Exception as e:
            logger.error(f"Unexpected error getting klines for {symbol}: {e}", exc_info=True)
            return pd.DataFrame()
    
    def _fetch_public_klines(self, symbol: str, interval: str = '1h', limit: int = 100):
        """Fetch real-time kline data from Binance US public API."""
        try:
            # Binance US public API (no authentication needed)
            url = f"https://api.binance.us/api/v3/klines"
            params = {
                'symbol': symbol,
                'interval': interval,
                'limit': limit
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            klines = response.json()
            
            if not klines:
                logger.warning(f"No klines data returned for {symbol}")
                return pd.DataFrame()
            
            # Convert to DataFrame
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])
            
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)
            
            logger.info(f"Fetched {len(df)} real-time candles. Latest price: ${df['close'].iloc[-1]:,.2f}")
            return df
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching public klines: {e}")
            # Fallback to mock data if API fails
            logger.warning(f"Falling back to mock data")
            return self._generate_mock_klines(symbol, limit)
        except Exception as e:
            logger.error(f"Unexpected error in _fetch_public_klines: {e}", exc_info=True)
            return self._generate_mock_klines(symbol, limit)
    
    def _generate_mock_klines(self, symbol: str, limit: int = 100):
        """Generate realistic mock kline data for paper trading."""
        import random
        from datetime import datetime, timedelta
        
        # Base price for different symbols
        base_prices = {
            'BTCUSDT': 95000,
            'ETHUSDT': 3500,
            'BNBUSDT': 600
        }
        
        base_price = base_prices.get(symbol, 100)
        
        klines = []
        current_time = datetime.utcnow() - timedelta(hours=limit)
        current_price = base_price
        
        for i in range(limit):
            # Simulate price movement (-1% to +1%)
            price_change = random.uniform(-0.01, 0.01)
            current_price = current_price * (1 + price_change)
            
            # Create OHLCV data
            open_price = current_price * (1 + random.uniform(-0.002, 0.002))
            high_price = max(open_price, current_price) * (1 + random.uniform(0, 0.005))
            low_price = min(open_price, current_price) * (1 - random.uniform(0, 0.005))
            close_price = current_price
            volume = random.uniform(100, 1000)
            
            klines.append({
                'timestamp': current_time,
                'open': open_price,
                'high': high_price,
                'low': low_price,
                'close': close_price,
                'volume': volume
            })
            
            current_time += timedelta(hours=1)
        
        df = pd.DataFrame(klines)
        logger.info(f"Generated {len(df)} mock candles. Latest price: {df['close'].iloc[-1]:.2f}")
        return df
    
    def get_current_price(self, symbol: str):
        try:
            if self.testnet:
                # Use Binance US public API for real-time price
                url = f"https://api.binance.us/api/v3/ticker/price"
                params = {'symbol': symbol}
                response = requests.get(url, params=params, timeout=5)
                response.raise_for_status()
                data = response.json()
                price = float(data['price'])
                logger.info(f"Current {symbol} price: ${price:,.2f} (real-time from Binance US)")
                return price
            
            ticker = self.client.get_symbol_ticker(symbol=symbol)
            return float(ticker['price'])
        except BinanceAPIException as e:
            logger.error(f"Error getting price: {e}")
            return None
    
    def place_market_order(self, symbol: str, side: str, quantity: float):
        # Paper trading mode - simulate order without placing real order
        if self.testnet:
            try:
                current_price = self.get_current_price(symbol)
                if not current_price:
                    return {'success': False, 'error': 'Could not get current price'}
                
                # Update paper balance
                order_value = current_price * quantity
                if side == 'BUY':
                    if self.paper_balance < order_value:
                        return {'success': False, 'error': f'Insufficient balance: {self.paper_balance:.2f} < {order_value:.2f}'}
                    self.paper_balance -= order_value
                    logger.info(f"PAPER TRADE: Bought {quantity} {symbol} @ {current_price}. Balance: ${self.paper_balance:.2f}")
                elif side == 'SELL':
                    self.paper_balance += order_value
                    logger.info(f"PAPER TRADE: Sold {quantity} {symbol} @ {current_price}. Balance: ${self.paper_balance:.2f}")
                
                # Simulate successful order
                import random
                simulated_order_id = random.randint(100000, 999999)
                
                logger.info(f"PAPER TRADE: Simulated {side} {quantity} {symbol} @ {current_price}")
                
                return {
                    'success': True,
                    'order_id': simulated_order_id,
                    'price': current_price,
                    'quantity': quantity,
                    'order': {
                        'orderId': simulated_order_id,
                        'symbol': symbol,
                        'side': side,
                        'executedQty': str(quantity),
                        'status': 'FILLED',
                        'type': 'MARKET'
                    }
                }
            except Exception as e:
                logger.error(f"Paper trade simulation error: {e}")
                return {'success': False, 'error': str(e)}
        
        # Real trading mode
        try:
            order = self.client.create_order(
                symbol=symbol,
                side=side,
                type='MARKET',
                quantity=quantity
            )
            return {
                'success': True,
                'order_id': order['orderId'],
                'price': float(order.get('fills', [{}])[0].get('price', 0)),
                'quantity': float(order['executedQty']),
                'order': order
            }
        except BinanceAPIException as e:
            logger.error(f"Order failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def place_limit_order(self, symbol: str, side: str, quantity: float, price: float):
        try:
            order = self.client.create_order(
                symbol=symbol,
                side=side,
                type='LIMIT',
                timeInForce='GTC',
                quantity=quantity,
                price=str(price)
            )
            return {
                'success': True,
                'order_id': order['orderId'],
                'order': order
            }
        except BinanceAPIException as e:
            logger.error(f"Limit order failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def cancel_order(self, symbol: str, order_id: int):
        try:
            result = self.client.cancel_order(symbol=symbol, orderId=order_id)
            return {'success': True, 'result': result}
        except BinanceAPIException as e:
            logger.error(f"Cancel order failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_order_status(self, symbol: str, order_id: int):
        try:
            order = self.client.get_order(symbol=symbol, orderId=order_id)
            return order
        except BinanceAPIException as e:
            logger.error(f"Get order failed: {e}")
            return None
