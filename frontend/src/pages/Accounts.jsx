export default function Accounts() {
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../components/ui/Button'

export default function Accounts() {
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    api_key: '',
    api_secret: '',
    testnet: false
  })
  const [showSecret, setShowSecret] = useState(false)
  
  const queryClient = useQueryClient()
  const token = localStorage.getItem('token')
  
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['binance-accounts'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/binance/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch accounts')
      return res.json()
    }
  })
  
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/binance/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to connect account')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['binance-accounts'])
      handleCloseModal()
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/binance/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete account')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['binance-accounts'])
    }
  })
  
  const syncMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/binance/accounts/${id}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to sync balance')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['binance-accounts'])
    }
  })
  
  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account)
      setFormData({
        name: account.name,
        api_key: '',
        api_secret: '',
        testnet: account.testnet
      })
    } else {
      setEditingAccount(null)
      setFormData({ name: '', api_key: '', api_secret: '', testnet: false })
    }
    setShowModal(true)
    setShowSecret(false)
  }
  
  const handleCloseModal = () => {
    setShowModal(false)
    setEditingAccount(null)
    setFormData({ name: '', api_key: '', api_secret: '', testnet: false })
    setShowSecret(false)
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.api_key || !formData.api_secret) {
      alert('Please fill in all fields')
      return
    }
    createMutation.mutate(formData)
  }
  
  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this account?')) {
      deleteMutation.mutate(id)
    }
  }
  
  const handleSync = (id) => {
    syncMutation.mutate(id)
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Exchange Accounts</h2>
          <p className="text-sm text-muted-foreground">Connect your Binance API keys</p>
        </div>
        <Button onClick={() => handleOpenModal()}>+ Add Account</Button>
      </div>
      
      {isLoading ? (
        <div className="stat-card p-8 text-center">
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="stat-card p-8 text-center">
          <p className="text-muted-foreground">No accounts connected yet</p>
          <p className="text-sm text-muted-foreground mt-2">Click "Add Account" to connect your Binance API</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <div key={account.id} className="stat-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{account.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      account.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {account.testnet && (
                      <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">
                        Testnet
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Balance:</span>
                  <div className="text-2xl font-mono text-primary mt-1">
                    ${account.balance_usdt?.toFixed(2) || '0.00'}
                    <span className="text-sm text-muted-foreground ml-1">USDT</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleSync(account.id)}
                  disabled={syncMutation.isPending}
                  className="flex-1 px-3 py-1.5 text-sm rounded bg-background hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {syncMutation.isPending ? 'Syncing...' : '🔄 Sync'}
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1.5 text-sm rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="stat-card p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                {editingAccount ? 'Edit Account' : 'Add Binance Account'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Account Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="My Binance Account"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">API Key *</label>
                <input
                  type="text"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                  placeholder="Your Binance API Key"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">API Secret *</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={formData.api_secret}
                    onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                    placeholder="Your Binance API Secret"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="testnet"
                  checked={formData.testnet}
                  onChange={(e) => setFormData({ ...formData, testnet: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="testnet" className="text-sm">
                  Use Binance Testnet
                </label>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                <p className="text-xs text-blue-400">
                  ⓘ Your API key needs <strong>Spot & Margin Trading</strong> permissions. Never share your API secret!
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
                  className="flex-1 px-4 py-2 rounded bg-background hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? 'Connecting...' : 'Connect Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
