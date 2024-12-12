import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Brainless/',
  resolve: {
    alias: {
      'react': 'react',
      'react-dom': 'react-dom'
    }
  }
}) 