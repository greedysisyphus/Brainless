# Anime.js 整合指南

根據 [Anime.js 官方文檔](https://animejs.com/documentation/)，以下是針對此項目的優化建議和實現方案。

## 🎯 Anime.js 核心特色功能

### 1. **Timeline（時間軸）** - 複雜動畫序列
**用途**：精確控制多個動畫的執行順序和時間關係

**已實現**：
- 導航欄項目依次進入動畫（`src/components/layout/Navigation.jsx`）

```javascript
const timeline = anime.timeline({
  autoplay: true,
  easing: 'spring(1, 80, 10, 0)'
})

timeline.add({
  targets: navItemsRef.current,
  opacity: [0, 1],
  translateY: [-30, 0],
  scale: [0.8, 1],
  delay: anime.stagger(50), // 使用 stagger 讓項目依次動畫
  duration: 600
})
```

### 2. **Stagger（交錯動畫）** - 波浪式效果
**用途**：讓多個元素依序動畫，創造視覺層次

**建議應用場景**：
- ✅ 導航欄項目（已實現）
- 📋 卡片列表（待實現）
- 📊 統計數據展示

**示例**：
```javascript
anime({
  targets: '.card',
  opacity: [0, 1],
  translateY: [50, 0],
  delay: anime.stagger(100) // 每個元素延遲 100ms
})
```

### 3. **Spring Easing（彈簧緩動）**
**用途**：自然的彈簧物理效果，讓動畫更有生命力

**已使用**：
- 導航欄懸停動畫：`'easeOutElastic(1, .6)'`
- Timeline 動畫：`'spring(1, 80, 10, 0)'`

### 4. **Scroll-triggered Animations（滾動觸發動畫）**
**用途**：元素進入視窗時自動觸發動畫

**已實現**：
- `src/components/common/ScrollReveal.jsx` - 通用滾動觸發組件

**使用方式**：
```jsx
<ScrollReveal
  animation={{
    opacity: [0, 1],
    translateY: [50, 0]
  }}
>
  <div className="card">內容</div>
</ScrollReveal>
```

### 5. **Number Animation（數字動畫）**
**用途**：流暢的數字計數效果

**已實現**：
- `src/components/common/AnimatedNumberAnime.jsx`

**使用方式**：
```jsx
<AnimatedNumberAnime 
  value={1234} 
  duration={1500}
  easing="easeOutExpo"
/>
```

## 🚀 具體優化建議

### 優先級 1：立即實現

#### 1. **結果卡片的進入動畫**（SandwichCalculator）
```javascript
// 當 results 更新時，使用 stagger 讓卡片依次出現
useEffect(() => {
  if (results) {
    anime({
      targets: '.result-card',
      opacity: [0, 1],
      scale: [0.9, 1],
      translateY: [30, 0],
      delay: anime.stagger(150),
      duration: 600,
      easing: 'spring(1, 80, 10, 0)'
    })
  }
}, [results])
```

#### 2. **摘要卡片的數值動畫**
```jsx
// 使用 AnimatedNumberAnime 替代靜態數字
<AnimatedNumberAnime 
  value={preview.totalTarget} 
  duration={1000}
/>
```

#### 3. **頁面切換動畫**
使用 Timeline 創建流暢的頁面轉場效果

### 優先級 2：後續優化

#### 1. **滾動觸發動畫**
- 統計圖表進入視窗時動畫
- 長列表的元素依次出現

#### 2. **互動反饋動畫**
- 按鈕點擊時的彈簧反饋
- 輸入框聚焦時的動畫

#### 3. **文字動畫**
- 標題文字逐字出現
- 數值變化的流暢過渡

## 📝 已創建的組件和工具

### 1. `useAnimeAnimation` Hook
位置：`src/hooks/useAnimeAnimation.js`
功能：提供常用的動畫方法
- `animateCardsIn()` - 卡片進入動畫
- `animateNumber()` - 數字動畫
- `animateOnScroll()` - 滾動觸發動畫
- `createTimeline()` - 創建時間軸
- `animateText()` - 文字動畫

### 2. `AnimatedNumberAnime` 組件
位置：`src/components/common/AnimatedNumberAnime.jsx`
功能：數字計數動畫組件

### 3. `ScrollReveal` 組件
位置：`src/components/common/ScrollReveal.jsx`
功能：滾動觸發顯示動畫

## 🎨 設計原則

1. **性能優先**：使用 CSS transforms（GPU 加速）
2. **自然流暢**：優先使用 spring easing
3. **適度使用**：不要過度動畫，影響用戶體驗
4. **可訪問性**：尊重 `prefers-reduced-motion`

## 📚 參考資源

- [Anime.js 官方文檔](https://animejs.com/documentation/)
- [Timeline 文檔](https://animejs.com/documentation/#timeline)
- [Stagger 工具](https://animejs.com/documentation/#staggerUtility)
- [Easing 函數](https://animejs.com/documentation/#easings)

## 🔧 下一步行動

1. ✅ 導航欄動畫（已完成）
2. ⏳ 結果卡片動畫（待實現）
3. ⏳ 數字動畫替換（待實現）
4. ⏳ 滾動觸發動畫應用（待實現）

