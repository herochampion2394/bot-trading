import axios from 'axios'
import { API_URL } from '../config'

const api = axios.create({
  baseURL: `${API_URL}/api`,
})

// Add token to requests
api.interceptors.request.use((config) => {
  // Add trailing slash to URLs if not present (FastAPI requires it)
  if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
    config.url = config.url + '/'
  }
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
