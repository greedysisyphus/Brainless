# Linear 風格主題 - 實現狀態

## ✅ 已完成

### 1. 依賴安裝
- ✅ `framer-motion` - React 動畫庫
- ✅ `gsap` - 動畫庫（可選用於複雜動畫）
- ✅ `lenis` - 平滑滾動庫

### 2. 核心架構
- ✅ **ThemeContext** (`src/contexts/ThemeContext.jsx`)
  - 管理主題狀態（'classic' 或 'linear'）
  - 自動保存到 localStorage
  - 提供 `toggleTheme()` 方法

- ✅ **LayoutLinear** (`src/components/layout/LayoutLinear.jsx`)
  - Linear 風格的深色背景（#0d0d0d）
  - 網格圖案背景
  - Lenis smooth scroll 集成
  - Framer Motion 頁面轉場動畫
  - 路由變化時自動滾動到頂部

- ✅ **App.jsx 更新**
  - 整合 ThemeProvider
  - 根據主題動態選擇 Layout
  - 保留所有現有功能

- ✅ **Header 更新**
  - 添加主題切換按鈕（右上角）
  - 根據主題調整樣式
  - 使用 Framer Motion 添加微動畫

## 🎨 Linear 風格特色

### 視覺設計
- **深色背景**: 極簡的 `#0d0d0d` 背景色
- **網格圖案**: 微妙的網格效果（透明度 3%）
- **平滑滾動**: Lenis 提供的流暢滾動體驗
- **頁面轉場**: 淡入淡出動畫（0.4s，easeOutCubic）

### 動畫效果
- 路由切換時自動滾動到頂部
- 頁面內容淡入淡出
- Header 按鈕懸停動畫

## 📝 使用說明

### 切換主題
1. 點擊 Header 右上角的切換按鈕
   - ✨ 圖標：切換到 Linear 風格
   - 🎨 圖標：切換到經典風格
2. 主題偏好會自動保存，下次訪問時自動載入

### 當前狀態
- **經典風格**（預設）：使用現有設計，Anime.js 動畫
- **Linear 風格**：新設計，Framer Motion + Lenis

## 🚀 下一步優化建議

### 短期（可立即實施）
1. **為各個頁面優化 Linear 風格樣式**
   - 調整顏色和間距以符合 Linear 風格
   - 使用更簡約的設計語言

2. **增強 Navigation 組件**
   - 為 Linear 主題添加不同的視覺效果
   - 使用 Framer Motion 實現導航動畫

3. **添加更多微動畫**
   - 按鈕懸停效果
   - 卡片進入動畫
   - 數字計數動畫（使用 GSAP）

### 中期
1. **創建 Linear 風格的頁面組件**
   - 可以為每個主要頁面創建 Linear 風格版本
   - 使用條件渲染或路由切換

2. **性能優化**
   - 使用 `React.memo` 優化組件渲染
   - 懶加載動畫庫
   - 優化 Lenis 配置

3. **響應式設計**
   - 確保 Linear 風格在移動設備上完美顯示
   - 優化觸摸滾動體驗

### 長期
1. **完整遷移選項**
   - 當 Linear 風格完善後，可以作為預設主題
   - 保留經典風格作為備選

2. **更多動畫庫集成**
   - 探索 GSAP ScrollTrigger
   - 實現視差滾動效果
   - 添加更複雜的動畫序列

## 📚 參考資料

- [Linear 官網設計](https://linear.app/homepage)
- [Framer Motion 文檔](https://www.framer.com/motion/)
- [Lenis 文檔](https://lenis.studiofreight.com/)
- [GSAP 文檔](https://greensock.com/docs/)

## ⚠️ 注意事項

1. 兩種風格目前共享大部分組件（Header、Navigation）
2. 如果需要完全不同的視覺效果，可以創建獨立的組件
3. 主題切換是全局的，會影響所有頁面
4. 建議先測試 Linear 風格，確保功能正常後再大範圍應用

