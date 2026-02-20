import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { API_URL } from '../config';
import '../styles/manual-trade.css';

const ManualTrade = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    binance_account_id: '',
    symbol: 'BTCUSDT',
    side: 'BUY',
    amount_usdt: 100
  });

  // Fetch accounts
 const { data: accountsData } = useQuery({
   queryKey: ['binance-accounts'],
   queryFn: async () => {
     const token = localStorage.getItem('token');
     const response = await fetch(`${API_URL}/api/binance/accounts`, {
       headers: { 'Authorization': `Bearer ${token}` }
     });
     if (!response.ok) throw new Error('Failed to fetch accounts');
     return response.json();
   }
 });

 // Auto-select first account
 useEffect(() => {
   if (accountsData && accountsData.length > 0 && !formData.binance_account_id) {
     setFormData(prev => ({ ...prev, binance_account_id: accountsData[0].id }));
   }
 }, [accountsData]);

 // Execute manual trade
  const executeTrade = useMutation({
    mutationFn: async (tradeData) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/trades/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tradeData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Trade failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['trades']);
      queryClient.invalidateQueries(['binance-accounts']);
      alert('Trade executed successfully!');
      setFormData(prev => ({ ...prev, amount_usdt: 100 }));
    },
    onError: (error) => {
      alert(`Trade failed: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.binance_account_id) {
      alert('Please select a Binance account');
      return;
    }
   executeTrade.mutate(formData);
 };

 const selectedAccount = accountsData?.find(a => a.id === parseInt(formData.binance_account_id));

 return (
   <div className="manual-trade-container">
      <div className="page-header">
        <div className="page-title">
          <Coins size={32} />
          <div>
            <h1>Manual Trading</h1>
            <p>Execute instant buy/sell orders</p>
          </div>
        </div>
      </div>

      <div className="manual-trade-grid">
        <div className="trade-form-card">
          <h2>Place Order</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Binance Account</label>
             <select
               value={formData.binance_account_id}
               onChange={(e) => setFormData({ ...formData, binance_account_id: e.target.value })}
               required
             >
               <option value="">Select account...</option>
               {accountsData?.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} {account.testnet && '(Paper Trading)'}
                  </option>
                ))}
              </select>
            </div>

            {selectedAccount && (
              <div className="account-info">
                <DollarSign size={16} />
                <span>Balance: ${selectedAccount.balance_usdt?.toFixed(2) || '0.00'} USDT</span>
              </div>
            )}

            <div className="form-group">
              <label>Trading Pair</label>
              <select
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                required
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="BNBUSDT">BNB/USDT</option>
                <option value="SOLUSDT">SOL/USDT</option>
                <option value="ADAUSDT">ADA/USDT</option>
              </select>
            </div>

            <div className="form-group">
              <label>Order Type</label>
              <div className="side-selector">
                <button
                  type="button"
                  className={`side-btn ${formData.side === 'BUY' ? 'buy-active' : ''}`}
                  onClick={() => setFormData({ ...formData, side: 'BUY' })}
                >
                  <TrendingUp size={20} />
                  Buy
                </button>
                <button
                  type="button"
                  className={`side-btn ${formData.side === 'SELL' ? 'sell-active' : ''}`}
                  onClick={() => setFormData({ ...formData, side: 'SELL' })}
                >
                  <TrendingDown size={20} />
                  Sell
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Amount (USDT)</label>
              <input
                type="number"
                min="10"
                step="10"
                value={formData.amount_usdt}
                onChange={(e) => setFormData({ ...formData, amount_usdt: parseFloat(e.target.value) })}
                required
              />
              <small>Minimum: $10 USDT</small>
            </div>

            <div className="warning-box">
              <AlertCircle size={18} />
              <div>
                <strong>Paper Trading Mode</strong>
                <p>Trades are simulated with mock data for testing purposes.</p>
              </div>
            </div>

            <button
              type="submit"
              className={`submit-btn ${formData.side === 'BUY' ? 'buy-btn' : 'sell-btn'}`}
              disabled={executeTrade.isPending}
            >
              {executeTrade.isPending
                ? 'Executing...'
                : `${formData.side} ${formData.symbol}`}
            </button>
          </form>
        </div>

        <div className="trade-info-card">
          <h2>Quick Info</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Symbol</span>
              <span className="info-value">{formData.symbol}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Type</span>
              <span className={`info-value ${formData.side === 'BUY' ? 'buy-color' : 'sell-color'}`}>
                {formData.side}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Amount</span>
              <span className="info-value">${formData.amount_usdt} USDT</span>
            </div>
            <div className="info-item">
              <span className="info-label">Execution</span>
              <span className="info-value">Market Order</span>
            </div>
          </div>

          <div className="info-note">
            <h3>How it works:</h3>
            <ol>
              <li>Select your Binance account</li>
              <li>Choose trading pair (e.g., BTC/USDT)</li>
              <li>Pick BUY or SELL</li>
              <li>Enter USDT amount</li>
              <li>Execute instantly at market price</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualTrade;
