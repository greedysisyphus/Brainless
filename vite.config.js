import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Brainless/',
  server: {
    proxy: {
      '/api/fos': {
        target: 'https://www.taoyuan-airport.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fos/, '/uploads/fos')
      }
    }
  },
  resolve: {
    alias: {
      'react': 'react',
      'react-dom': 'react-dom'
    }
  }
}) 