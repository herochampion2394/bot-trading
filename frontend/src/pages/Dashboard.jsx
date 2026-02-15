import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export default function Dashboard() {
  const { data: bots } = useQuery({
    queryKey: ['bots'],
    queryFn: () => api.get('/bots/').then(res => res.data)
  })

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/trades/analytics').then(res => res.data)
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Total Profit/Loss</div>
            <div className={`text-2xl font-bold ${
              (analytics?.total_profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${analytics?.total_profit_loss?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Win Rate</div>
            <div className="text-2xl font-bold text-blue-600">
              {analytics?.win_rate?.toFixed(1) || '0'}%
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Total Trades</div>
            <div className="text-2xl font-bold">
              {analytics?.total_trades || 0}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Active Bots</div>
            <div className="text-2xl font-bold text-purple-600">
              {bots?.filter(b => b.status === 'active').length || 0}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Active Bots</h2>
          {bots?.length > 0 ? (
            <div className="space-y-3">
              {bots.map(bot => (
                <div key={bot.id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{bot.name}</div>
                    <div className="text-sm text-gray-500">{bot.symbol} - {bot.strategy}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      bot.status === 'active' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {bot.status.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-500">
                      P&L: ${bot.total_profit_usdt?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No bots created yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
