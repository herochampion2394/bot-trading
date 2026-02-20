import { useQuery } from '@tanstack/react-query';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { API_URL } from '../config';

export default function Trades() {
  const token = localStorage.getItem('token');

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/trades`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch trades');
      return res.json();
    }
  });

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_URL}/api/trades/export/csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trades_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export trades: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trade History</h2>
          <p className="text-sm text-muted-foreground">View your trading performance and history</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="stat-card p-8 text-center">
          <p className="text-muted-foreground">Loading trades...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="stat-card p-8 text-center">
          <p className="text-muted-foreground">No trades yet. Start trading to see history here.</p>
        </div>
      ) : (
        <div className="stat-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Symbol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Side</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    {new Date(trade.entry_time).toLocaleDateString()} {new Date(trade.entry_time).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{trade.symbol}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.side === 'BUY' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {trade.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{parseFloat(trade.quantity).toFixed(6)}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">${parseFloat(trade.entry_price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">${parseFloat(trade.amount_usdt).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.status === 'FILLED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
