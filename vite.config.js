import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // html2canvas 與 ics 只有 lazy 分頁會用到，讓 Vite 到那一刻才發現它們，
  // 會在切頁當下觸發 re-optimize + reload，那次 reload 會讓該分頁抓到第二份 React
  // （症狀是「上車地點」一點就 Invalid hook call 白畫面）。先預打包就不會發生。
  optimizeDeps: {
    include: ['html2canvas', 'ics'],
  },
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