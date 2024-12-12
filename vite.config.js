import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Brainless/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 確保 public/data 目錄被複製到構建目錄
    copyPublicDir: true
  },
  resolve: {
    alias: {
      'react': 'react',
      'react-dom': 'react-dom'
    }
  }
}) 