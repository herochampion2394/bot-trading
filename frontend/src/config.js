// Try to get backend URL from window (injected at runtime) or build-time env var
// Force HTTPS backend URL
const rawUrl = window.ENV?.BACKEND_URL || import.meta.env.VITE_API_URL || 'https://bot-trading-backend-155580679014.asia-east1.run.app'
export const API_URL = rawUrl.replace('http://', 'https://')
