import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Brainless/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true
  }
}) 