import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui/Button'
import { Bot, Play, Pause, Trash2, TrendingUp, TrendingDown, Eye } from 'lucide-react'
import { API_URL } from '../config'

export default function Bots() {
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()
  const [editingBot, setEditingBot] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    binance_account_id: '',
    strategy: 'mean_reversion',
    symbol: 'BTCUSDT',
    trade_amount_usdt: 100,
    max_risk_percent: 2.0,
    stop_loss_percent: 3.0,
    take_profit_percent: 5.0
  })
  
  const queryClient = useQueryClient()
  const token = localStorage.getItem('token')
  
  // Fetch bots
  const { data: bots = [], isLoading: botsLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/bots`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch bots')
      return res.json()
    }
  })
  
  // Fetch Binance accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ['binance-accounts'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/binance/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch accounts')
      return res.json()
    }
  })
  
  // Create bot mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`${API_URL}/api/bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...data,
          binance_account_id: parseInt(data.binance_account_id),
          trade_amount_usdt: parseFloat(data.trade_amount_usdt),
          max_risk_percent: parseFloat(data.max_risk_percent),
          stop_loss_percent: parseFloat(data.stop_loss_percent),
          take_profit_percent: parseFloat(data.take_profit_percent)
        })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to create bot')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bots'])
      handleCloseModal()
    }
  })
  
  // Delete bot mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API_URL}/api/bots/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to delete bot')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bots'])
    }
  })
  
  // Start/Pause bot mutations
  const statusMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      const res = await fetch(`${API_URL}/api/bots/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`Failed to ${action} bot`)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bots'])
    }
  })
  
  const handleOpenModal = (bot = null) => {
    if (bot) {
      setEditingBot(bot)
      setFormData({
        name: bot.name,
        binance_account_id: bot.binance_account_id,
        strategy: bot.strategy,
        symbol: bot.symbol,
        trade_amount_usdt: bot.trade_amount_usdt,
        max_risk_percent: bot.max_risk_percent,
        stop_loss_percent: bot.stop_loss_percent,
        take_profit_percent: bot.take_profit_percent
      })
    } else {
      setEditingBot(null)
      setFormData({
        name: '',
        binance_account_id: '',
        strategy: 'mean_reversion',
        symbol: 'BTCUSDT',
        trade_amount_usdt: 100,
        max_risk_percent: 2.0,
        stop_loss_percent: 3.0,
        take_profit_percent: 5.0
      })
    }
    setShowModal(true)
  }
  
  const handleCloseModal = () => {
    setShowModal(false)
    setEditingBot(null)
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.binance_account_id) {
      alert('Please fill in all required fields')
      return
    }
    createMutation.mutate(formData)
  }
  
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this bot?')) {
      deleteMutation.mutate(id)
    }
  }
  
  const handleToggleStatus = (bot) => {
    const action = bot.status === 'active' ? 'pause' : 'start'
    statusMutation.mutate({ id: bot.id, action })
  }
  
  const strategies = [
    { value: 'mean_reversion', label: 'Mean Reversion' },
    { value: 'rsi_oversold', label: 'RSI Oversold' },
    { value: 'trend_following', label: 'Trend Following' },
    { value: 'grid_trading', label: 'Grid Trading' }
  ]
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400'
      case 'error': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Bots</h1>
          <p className="text-muted-foreground mt-1">Manage your automated trading strategies</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="px-4 py-2">
          + Create Bot
        </Button>
      </div>
      
      {botsLoading && (
        <div className="text-center py-12 text-muted-foreground">
          Loading bots...
        </div>
      )}
      
      {!botsLoading && bots.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <Bot className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Bots Created</h3>
          <p className="text-muted-foreground mb-4">Create your first trading bot to start automated trading</p>
          <Button onClick={() => handleOpenModal()}>Create Your First Bot</Button>
        </div>
      )}
      
      {!botsLoading && bots.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <div key={bot.id} className="stat-card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    {bot.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {strategies.find(s => s.value === bot.strategy)?.label} • {bot.symbol}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded uppercase font-medium ${getStatusColor(bot.status)}`}>
                  {bot.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Total Profit</div>
                  <div className={`font-bold font-mono ${bot.total_profit_usdt >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {bot.total_profit_usdt >= 0 ? '+' : ''}${bot.total_profit_usdt?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Win Rate</div>
                  <div className="font-bold font-mono">
                    {bot.win_rate?.toFixed(1) || '0.0'}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Trade Amount</div>
                  <div className="font-mono">
                    ${bot.trade_amount_usdt}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Total Trades</div>
                  <div className="font-mono">
                    {bot.total_trades || 0}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => navigate(`/bots/${bot.id}`)}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                >
                  <Eye className="h-3 w-3" /> Details
                </button>
                <button
                  onClick={() => handleToggleStatus(bot)}
                  disabled={statusMutation.isPending || bot.status === 'error'}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors disabled:opacity-50 ${
                    bot.status === 'active'
                      ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                      : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  }`}
                >
                  {bot.status === 'active' ? (
                    <><Pause className="h-3 w-3" /> Pause</>
                  ) : (
                    <><Play className="h-3 w-3" /> Start</>
                  )}
                </button>
                <button
                  onClick={() => handleOpenModal(bot)}
                  className="px-2 py-1.5 text-xs rounded bg-background hover:bg-accent transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(bot.id)}
                  disabled={deleteMutation.isPending || bot.status === 'active'}
                  className="px-2 py-1.5 text-xs rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3 mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showModal && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          style={{ zIndex: 99999 }}
          onClick={handleCloseModal}
        >
          <div
            className="bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl my-8 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                {editingBot ? 'Edit Bot' : 'Create Trading Bot'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors text-2xl leading-none cursor-pointer"
                type="button"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-200">Bot Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="My Trading Bot"
                    autoComplete="off"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-200">Binance Account *</label>
                  <select
                    value={formData.binance_account_id}
                    onChange={(e) => setFormData({ ...formData, binance_account_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    required
                    disabled={editingBot}
                  >
                    <option value="">Select Account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.testnet ? '(Testnet)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-200">Strategy *</label>
                  <select
                    value={formData.strategy}
                    onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    required
                  >
                    {strategies.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-200">Trading Pair *</label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono"
                    placeholder="BTCUSDT"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-200">Trade Amount (USDT) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="10"
                    value={formData.trade_amount_usdt}
                    onChange={(e) => setFormData({ ...formData, trade_amount_usdt: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-200">Max Risk (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={formData.max_risk_percent}
                    onChange={(e) => setFormData({ ...formData, max_risk_percent: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-200">Stop Loss (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.stop_loss_percent}
                    onChange={(e) => setFormData({ ...formData, stop_loss_percent: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-200">Take Profit (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.take_profit_percent}
                    onChange={(e) => setFormData({ ...formData, take_profit_percent: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono"
                  />
                </div>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                <p className="text-xs text-blue-400">
                  ℹ️ Bot will start in <strong>PAUSED</strong> status. Review settings carefully before starting automated trading.
                </p>
              </div>
              
              {createMutation.error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                  <p className="text-sm text-red-400">{createMutation.error.message}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 transition-colors text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-600 transition-colors text-white font-medium disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending ? 'Creating...' : editingBot ? 'Update Bot' : 'Create Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
