import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Bots from './pages/Bots'
import BotDetails from './pages/BotDetails'
import Trades from './pages/Trades'
import Accounts from './pages/Accounts'

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bots" element={<Bots />} />
          <Route path="/bots/:botId" element={<BotDetails />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/trades" element={<Trades />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  )
}

export default App
