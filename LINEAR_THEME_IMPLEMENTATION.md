# Linear 風格主題實現指南

## 概述

這個專案現在支援兩種視覺風格：
1. **經典風格**（Classic Theme）- 現有的設計，使用 Anime.js 和傳統動畫
2. **Linear 風格**（Linear Theme）- 全新的現代設計，使用 Framer Motion、GSAP 和 Lenis

用戶可以透過 Header 右上角的切換按鈕在兩種風格之間切換。

## 已安裝的依賴

- **framer-motion**: `^11.x` - React 動畫庫，用於頁面轉場和組件動畫
- **gsap**: `^3.x` - 強大的動畫庫，用於複雜的動畫效果
- **lenis**: `^1.x` - 平滑滾動庫，提供流暢的滾動體驗

## 專案結構

```
src/
├── contexts/
│   └── ThemeContext.jsx          # 主題管理 Context
├── components/
│   └── layout/
│       ├── Layout.jsx            # 經典風格 Layout
│       ├── LayoutLinear.jsx      # Linear 風格 Layout
│       ├── Header.jsx            # Header（支援主題切換）
│       └── Navigation.jsx        # Navigation
└── App.jsx                       # 根據主題選擇 Layout
```

## 使用方式

### 1. 主題切換

用戶可以透過 Header 右上角的按鈕切換主題：
- 🎨 圖標：切換到經典風格
- ✨ 圖標：切換到 Linear 風格

主題偏好會自動保存到 `localStorage`，下次訪問時會記住選擇。

### 2. Linear 風格特色

#### 視覺設計
- **深色背景**: `#0d0d0d` - 極簡深色背景
- **網格圖案**: 微妙的網格背景效果
- **平滑滾動**: 使用 Lenis 實現絲滑的滾動體驗
- **頁面轉場**: Framer Motion 提供流暢的頁面切換動畫

#### 動畫特性
- **路由轉場**: 使用 `AnimatePresence` 實現頁面淡入淡出
- **平滑滾動**: Lenis 提供物理感滾動
- **GSAP 整合**: 可用於複雜的動畫序列

## 實現細節

### ThemeContext

```jsx
import { useTheme } from './contexts/ThemeContext'

function MyComponent() {
  const { theme, toggleTheme } = useTheme()
  // theme: 'classic' | 'linear'
  // toggleTheme: () => void
}
```

### LayoutLinear

- 自動初始化 Lenis smooth scroll
- 路由變化時自動滾動到頂部
- 使用 Framer Motion 實現頁面轉場

### 下一步優化建議

1. **為各個頁面添加 Linear 風格樣式**
   - 可以創建頁面特定的 Linear 風格版本
   - 或使用條件渲染根據主題調整樣式

2. **GSAP 動畫增強**
   - 為重要元素添加 GSAP 動畫
   - 創建複雜的動畫序列

3. **響應式優化**
   - 確保 Linear 風格在各種設備上都能完美顯示
   - 優化觸摸設備的滾動體驗

4. **性能優化**
   - 使用 Framer Motion 的 `layoutId` 實現共享元素轉場
   - 優化動畫性能，避免重排和重繪

## 參考資料

- [Linear 官網](https://linear.app/homepage)
- [Framer Motion 文檔](https://www.framer.com/motion/)
- [GSAP 文檔](https://greensock.com/docs/)
- [Lenis 文檔](https://lenis.studiofreight.com/)

## 注意事項

- 兩種風格目前共享 Header 和 Navigation 組件
- 如需完全不同的視覺效果，可以創建獨立的 HeaderLinear 和 NavigationLinear
- 主題切換是全局的，會影響所有頁面
