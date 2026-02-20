import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Activity, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { cn } from '../lib/utils';
import api from '../services/api';
import { API_URL } from '../config';

export default function Dashboard() {
  const token = localStorage.getItem('token');

  const { data: bots } = useQuery({
    queryKey: ['bots'],
    queryFn: () => api.get('/bots/').then(res => res.data)
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/trades/analytics').then(res => res.data)
  });

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/binance/portfolio/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return res.json();
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Real-time overview of your trading performance</p>
      </div>

      {/* Portfolio Summary */}
      {portfolio && (
        <div className="stat-card p-6 animate-fade-in bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Portfolio Value</p>
              <p className="text-4xl font-bold text-foreground">
                ${portfolio.total_portfolio_value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-muted-foreground">
                  USDT: <span className="text-foreground font-medium">${portfolio.usdt_balance?.toLocaleString()}</span>
                </span>
                <span className="text-muted-foreground">
                  Holdings: <span className="text-foreground font-medium">${portfolio.holdings_value?.toLocaleString()}</span>
                </span>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Today's P&L</p>
                <p className={`text-xl font-bold flex items-center justify-center gap-1 ${
                  portfolio.today_pnl >= 0 ? 'text-profit' : 'text-loss'
                }`}>
                  {portfolio.today_pnl >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  ${Math.abs(portfolio.today_pnl)?.toFixed(2)}
                </p>
                <p className={`text-xs ${portfolio.today_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {portfolio.today_pnl_percent >= 0 ? '+' : ''}{portfolio.today_pnl_percent?.toFixed(2)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
                <p className={`text-xl font-bold flex items-center justify-center gap-1 ${
                  portfolio.total_pnl >= 0 ? 'text-profit' : 'text-loss'
                }`}>
                  {portfolio.total_pnl >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  ${Math.abs(portfolio.total_pnl)?.toFixed(2)}
                </p>
                <p className={`text-xs ${portfolio.total_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {portfolio.total_pnl_percent >= 0 ? '+' : ''}{portfolio.total_pnl_percent?.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
          <StatCard
            title="Total P&L"
            value={`$${analytics?.total_profit_loss?.toFixed(2) || '0.00'}`}
            change={(analytics?.total_profit_loss || 0) >= 0 ? 'All time profit' : 'All time loss'}
            changeType={(analytics?.total_profit_loss || 0) >= 0 ? 'profit' : 'loss'}
            icon={DollarSign}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
          <StatCard
            title="Win Rate"
            value={`${analytics?.win_rate?.toFixed(1) || '0'}%`}
            change={`${analytics?.total_trades || 0} total trades`}
            changeType="neutral"
            icon={BarChart3}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <StatCard
            title="Total Trades"
            value={analytics?.total_trades || 0}
            change="Historical trades"
            changeType="neutral"
            icon={TrendingUp}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <StatCard
            title="Active Bots"
            value={bots?.filter(b => b.status === 'active').length || 0}
            change="Running strategies"
            changeType="profit"
            icon={Activity}
          />
        </div>
      </div>

      {/* Active Bots */}
      <div className="stat-card animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Active Bots</h3>
          <p className="text-xs text-muted-foreground">Trading bots and their performance</p>
        </div>
        {bots?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Symbol</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Strategy</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">P&L</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {bots.map((bot) => (
                  <tr key={bot.id} className="border-b border-border/50 transition-colors hover:bg-accent/30">
                    <td className="py-3 font-medium text-foreground">{bot.name}</td>
                    <td className="py-3 text-muted-foreground">{bot.symbol}</td>
                    <td className="py-3 text-muted-foreground">{bot.strategy}</td>
                    <td className={cn(
                      'py-3 font-mono-numbers font-medium',
                      (bot.total_profit_usdt || 0) >= 0 ? 'text-profit' : 'text-loss'
                    )}>
                      <span className="inline-flex items-center gap-1">
                        {(bot.total_profit_usdt || 0) >= 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        ${bot.total_profit_usdt?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
                        bot.status === 'active' && 'bg-profit/10 text-profit',
                        bot.status !== 'active' && 'bg-muted/10 text-muted-foreground'
                      )}>
                        {bot.status === 'active' && <span className="pulse-dot bg-profit h-1.5 w-1.5" />}
                        {bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No bots created yet. Create your first trading bot to get started.</p>
        )}
      </div>
    </div>
  );
}
