import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui/Button'
import { API_URL } from '../config'
import { 
  ArrowLeft, Play, Pause, Trash2, TrendingUp, TrendingDown, 
  Activity, DollarSign, Target, AlertCircle, Clock 
} from 'lucide-react'

export default function BotDetails() {
  const { botId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const token = localStorage.getItem('token')

  // Fetch bot details
  const { data: bot, isLoading: botLoading } = useQuery({
    queryKey: ['bot', botId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch bot')
      return res.json()
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  })

  // Fetch bot trades
  const { data: tradesData, isLoading: tradesLoading } = useQuery({
    queryKey: ['trades', botId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/trades?bot_id=${botId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch trades')
      return res.json()
    },
    refetchInterval: 5000
  })

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['analytics', botId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/trades/analytics?bot_id=${botId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json()
    },
    refetchInterval: 10000
  })

  // Toggle bot mutation
  const toggleBot = useMutation({
    mutationFn: async (action) => {
      const res = await fetch(`${API_URL}/api/bots/${botId}/${action}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!res.ok) throw new Error(`Failed to ${action} bot`)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bot', botId])
    }
  })

  // Execute trading now mutation
  const executeNow = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/trading/execute-now`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!res.ok) throw new Error('Failed to execute trading')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bot', botId])
      queryClient.invalidateQueries(['trades', botId])
      queryClient.invalidateQueries(['analytics', botId])
    }
  })

  // Delete bot mutation
  const deleteBot = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/bots/${botId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete bot')
      return res.json()
    },
    onSuccess: () => {
      navigate('/bots')
    }
  })

  if (botLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading bot details...</div>
      </div>
    )
  }

  if (!bot) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Bot not found</div>
      </div>
    )
  }

  const trades = tradesData?.trades || []
  const openTrades = trades.filter(t => t.status === 'pending')
  const closedTrades = trades.filter(t => t.status === 'filled')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/bots')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bots
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {bot.name}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                bot.status === 'active' ? 'bg-cyan-500/20 text-cyan-400' :
                bot.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {bot.status.toUpperCase()}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {bot.strategy.replace('_', ' ').toUpperCase()} • {bot.symbol}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {bot.status === 'active' ? (
            <>
            <Button
              variant="outline"
              onClick={() => toggleBot.mutate('pause')}
              disabled={toggleBot.isPending}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
            <Button
              variant="default"
              onClick={() => executeNow.mutate()}
              disabled={executeNow.isPending}
            >
              <Activity className="w-4 h-4 mr-2" />
              {executeNow.isPending ? 'Executing...' : 'Test Now'}
            </Button>
            </>
          ) : (
            <Button
              variant="default"
              onClick={() => toggleBot.mutate('start')}
              disabled={toggleBot.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          )}
          <Button
            variant="outline"
            className="text-red-400 hover:text-red-300"
            onClick={() => {
              if (confirm('Are you sure you want to delete this bot?')) {
                deleteBot.mutate()
              }
            }}
            disabled={deleteBot.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Profit</span>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className={`text-2xl font-bold font-mono ${
            bot.total_profit_usdt >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            ${Math.abs(bot.total_profit_usdt).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {bot.total_profit_usdt >= 0 ? '+' : '-'}{Math.abs((bot.total_profit_usdt / (bot.trade_amount_usdt * bot.total_trades || 1)) * 100).toFixed(2)}%
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Trades</span>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {bot.total_trades}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {openTrades.length} open • {closedTrades.length} closed
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Win Rate</span>
            <Target className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {bot.win_rate.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {analytics?.winning_trades || 0}W / {analytics?.losing_trades || 0}L
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Last Run</span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {bot.last_run ? new Date(bot.last_run).toLocaleDateString() : 'Never'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {bot.last_run ? new Date(bot.last_run).toLocaleTimeString() : '-'}
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold mb-4">Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Trade Amount</span>
            <div className="font-mono font-semibold">${bot.trade_amount_usdt}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Stop Loss</span>
            <div className="font-mono font-semibold text-red-400">{bot.stop_loss_percent}%</div>
          </div>
          <div>
            <span className="text-muted-foreground">Take Profit</span>
            <div className="font-mono font-semibold text-green-400">{bot.take_profit_percent}%</div>
          </div>
          <div>
            <span className="text-muted-foreground">Max Risk</span>
            <div className="font-mono font-semibold">{bot.max_risk_percent}%</div>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Trade History</h3>
          <span className="text-sm text-muted-foreground">
            {trades.length} total trades
          </span>
        </div>

        {tradesLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trades yet. Start the bot to begin trading.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Symbol</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Side</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Entry</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Exit</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">P&L</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-3 px-4 text-sm">
                      {new Date(trade.entry_time).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      {trade.symbol}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.side === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-right">
                      ${trade.entry_price?.toFixed(2) || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-right">
                      ${trade.exit_price?.toFixed(2) || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-right">
                      {trade.quantity.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className={`font-mono font-semibold ${
                        trade.profit_loss_usdt >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.profit_loss_usdt >= 0 ? '+' : ''}{trade.profit_loss_usdt.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {trade.profit_loss_percent >= 0 ? '+' : ''}{trade.profit_loss_percent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.status === 'filled' ? 'bg-cyan-500/20 text-cyan-400' :
                        trade.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
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
    </div>
  )
}
