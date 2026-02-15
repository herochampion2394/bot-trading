import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Bots from './pages/Bots'
import Trades from './pages/Trades'
import Accounts from './pages/Accounts'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  const PrivateRoute = ({ children }) => {
    return token ? children : <Navigate to="/login" />
  }

  return (
    <Routes>
      <Route path="/login" element={<Login setToken={setToken} />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/bots" element={<PrivateRoute><Bots /></PrivateRoute>} />
      <Route path="/trades" element={<PrivateRoute><Trades /></PrivateRoute>} />
      <Route path="/accounts" element={<PrivateRoute><Accounts /></PrivateRoute>} />
    </Routes>
  )
}

export default App
