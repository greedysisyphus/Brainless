// 性能監控工具（僅開發環境使用）

/**
 * 性能測量函數
 * @param {string} name - 測量名稱
 * @param {Function} fn - 要測量的函數
 * @param {Object} options - 選項
 * @returns {*} 函數執行結果
 */
export const measurePerformance = (name, fn, options = {}) => {
  // 只在開發環境啟用
  if (process.env.NODE_ENV !== 'development') {
    return fn()
  }

  const { logThreshold = 10, logToConsole = true } = options
  const start = performance.now()
  
  try {
    const result = fn()
    const end = performance.now()
    const duration = end - start
    
    // 只記錄超過閾值的操作
    if (duration > logThreshold) {
      if (logToConsole) {
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
      }
      
      // 存儲到性能數據中
      storePerformanceData(name, duration)
    }
    
    return result
  } catch (error) {
    const end = performance.now()
    const duration = end - start
    console.error(`❌ ${name} 執行失敗 (${duration.toFixed(2)}ms):`, error)
    throw error
  }
}

/**
 * 存儲性能數據
 */
const performanceData = new Map()

const storePerformanceData = (name, duration) => {
  if (!performanceData.has(name)) {
    performanceData.set(name, [])
  }
  
  const data = performanceData.get(name)
  data.push({
    duration,
    timestamp: Date.now()
  })
  
  // 只保留最近 100 次記錄
  if (data.length > 100) {
    data.shift()
  }
}

/**
 * 獲取性能統計
 */
export const getPerformanceStats = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const stats = {}
  
  for (const [name, data] of performanceData.entries()) {
    if (data.length === 0) continue
    
    const durations = data.map(d => d.duration)
    stats[name] = {
      count: data.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      last: durations[durations.length - 1]
    }
  }
  
  return stats
}

/**
 * 清除性能數據
 */
export const clearPerformanceData = () => {
  performanceData.clear()
}

/**
 * 記憶體使用監控
 */
export const logMemoryUsage = (label = 'Memory Usage') => {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  if (performance.memory) {
    const memory = performance.memory
    console.log(`${label}:`, {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
    })
  }
}

/**
 * 組件渲染性能監控 Hook
 */
export const useRenderPerformance = (componentName) => {
  if (process.env.NODE_ENV !== 'development') {
    return () => {}
  }

  const renderStart = performance.now()
  
  return () => {
    const renderEnd = performance.now()
    const renderTime = renderEnd - renderStart
    
    if (renderTime > 16) { // 超過一幀的時間
      console.warn(`🐌 ${componentName} 渲染時間過長: ${renderTime.toFixed(2)}ms`)
    }
  }
}
