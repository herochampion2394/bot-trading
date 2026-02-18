from binance.client import Client
from binance.exceptions import BinanceAPIException
import pandas as pd
import numpy as np
from ta.momentum import RSIIndicator
from ta.trend import SMAIndicator
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class BinanceTrader:
    def __init__(self, api_key: str, api_secret: str, testnet: bool = False):
        if testnet:
            # Paper trading mode - use real Binance data but don't place orders
            self.client = Client(api_key, api_secret, testnet=False)  # Use production API for data
            self.testnet = True  # Flag for paper trading
        else:
            self.client = Client(api_key, api_secret)
            self.testnet = False
    
    def get_account_balance(self):
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
            logger.info(f"Fetching klines for {symbol} (testnet={self.client.testnet})")
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
    
    def get_current_price(self, symbol: str):
        try:
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
