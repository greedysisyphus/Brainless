import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/Brainless/' : '/',
  server: {
    port: 3001,
    // 確保本地開發時可以正確提供靜態文件
    fs: {
      allow: ['..']
    }
  },
  build: {
    outDir: 'docs',
    // 保留 docs/adr、docs/data 等非構建產物，避免每次 build 清空
    emptyOutDir: false,
    rollupOptions: {
      output: {
        // 自動在文件名中加入 hash，這樣每次構建文件名都會改變
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  // 確保 public 目錄的文件可以被正確提供
  publicDir: 'public'
}) 