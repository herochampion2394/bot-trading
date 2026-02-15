import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(
        process.env.VITE_API_URL || 'https://bot-trading-backend-155580679014.asia-east1.run.app'
      ),
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'https://bot-trading-backend-155580679014.asia-east1.run.app',
          changeOrigin: true,
        },
      },
    },
  }
})
