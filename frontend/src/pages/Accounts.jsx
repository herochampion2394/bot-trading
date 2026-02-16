import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui/Button'

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
    if (window.confirm('Are you sure you want to delete this account?')) {
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
          <h1 className="text-3xl font-bold">Exchange Accounts</h1>
          <p className="text-muted-foreground mt-1">Connect your Binance API keys</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="px-4 py-2">
          + Add Account
        </Button>
      </div>
      
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          Loading accounts...
        </div>
      )}
      
      {!isLoading && accounts.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No Accounts Connected</h3>
          <p className="text-muted-foreground mb-4">Connect your Binance account to start trading</p>
          <Button onClick={() => handleOpenModal()}>Add Your First Account</Button>
        </div>
      )}
      
      {!isLoading && accounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <div key={account.id} className="stat-card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {account.name}
                    {account.testnet && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                        TESTNET
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {account.api_key ? `${account.api_key.substring(0, 8)}...${account.api_key.substring(account.api_key.length - 4)}` : 'Hidden'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Balance</div>
                  <div className="text-xl font-bold font-mono text-profit">
                    ${parseFloat(account.balance_usdt || account.balance || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">USDT</div>
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
      
      {showModal && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={handleCloseModal}
        >
          <div
            className="bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                {editingAccount ? 'Edit Account' : 'Add Binance Account'}
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
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-200">Account Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="My Binance Account"
                  autoComplete="off"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-200">API Key *</label>
                <input
                  type="text"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
                  placeholder="Your Binance API Key"
                  autoComplete="off"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-200">API Secret *</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={formData.api_secret}
                    onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                    className="w-full px-3 py-2 pr-10 bg-slate-900 border border-slate-600 text-white rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
                    placeholder="Your Binance API Secret"
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowSecret(!showSecret)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                  >
                    {showSecret ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="testnet"
                  checked={formData.testnet}
                  onChange={(e) => setFormData({ ...formData, testnet: e.target.checked })}
                  className="rounded border-slate-600 cursor-pointer"
                />
                <label htmlFor="testnet" className="text-sm text-gray-200 cursor-pointer">
                  Use Binance Testnet
                </label>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                <p className="text-xs text-blue-400">
                  ℹ️ Your API key needs <strong>Spot & Margin Trading</strong> permissions. Never share your API secret!
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
                  onClick={(e) => {
                    e.preventDefault()
                    handleCloseModal()
                  }}
                  className="flex-1 px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 transition-colors text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-600 transition-colors text-white font-medium disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending ? 'Connecting...' : 'Connect Account'}
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
