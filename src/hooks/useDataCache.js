import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { measurePerformance } from '../utils/performance'

/**
 * 數據快取 Hook
 * @param {Function} fetchFunction - 獲取數據的函數
 * @param {Array} dependencies - 依賴項陣列
 * @param {Object} options - 配置選項
 * @returns {Object} 快取相關的狀態和方法
 */
export const useDataCache = (fetchFunction, dependencies = [], options = {}) => {
  const {
    cacheKey = 'default',
    ttl = 5 * 60 * 1000, // 5分鐘
    maxSize = 100,       // 最大快取項目數
    enableCache = true,  // 是否啟用快取
    staleWhileRevalidate = true // 是否在重新驗證時使用舊數據
  } = options

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  
  const cacheRef = useRef(new Map())
  const fetchPromiseRef = useRef(null)

  // 生成快取鍵
  const generateCacheKey = useCallback((key, deps) => {
    const depsString = deps.map(dep => 
      typeof dep === 'object' ? JSON.stringify(dep) : String(dep)
    ).join('|')
    return `${key}_${depsString}`
  }, [])

  // 檢查快取是否有效
  const isCacheValid = useCallback((cacheEntry) => {
    if (!cacheEntry) return false
    const now = Date.now()
    return (now - cacheEntry.timestamp) < ttl
  }, [ttl])

  // 清理過期快取
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now()
    const entries = Array.from(cacheRef.current.entries())
    
    entries.forEach(([key, entry]) => {
      if ((now - entry.timestamp) >= ttl) {
        cacheRef.current.delete(key)
      }
    })
  }, [ttl])

  // 清理快取（當超過最大大小時）
  const cleanCache = useCallback(() => {
    if (cacheRef.current.size >= maxSize) {
      const entries = Array.from(cacheRef.current.entries())
      // 刪除最舊的項目
      entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.floor(maxSize / 2))
        .forEach(([key]) => cacheRef.current.delete(key))
    }
  }, [maxSize])

  // 獲取數據
  const fetchData = useCallback(async (forceRefresh = false) => {
    const key = generateCacheKey(cacheKey, dependencies)
    const cacheEntry = cacheRef.current.get(key)
    
    // 如果快取有效且不強制刷新，直接返回快取數據
    if (!forceRefresh && enableCache && isCacheValid(cacheEntry)) {
      setData(cacheEntry.data)
      setLastFetch(cacheEntry.timestamp)
      return cacheEntry.data
    }

    // 如果正在獲取數據，返回現有的 Promise
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current
    }

    // 如果有舊數據且啟用了 stale-while-revalidate，先返回舊數據
    if (staleWhileRevalidate && cacheEntry && data === null) {
      setData(cacheEntry.data)
      setLastFetch(cacheEntry.timestamp)
    }

    setLoading(true)
    setError(null)

    try {
      const fetchPromise = measurePerformance(`fetchData_${cacheKey}`, async () => {
        const result = await fetchFunction()
        return result
      })

      fetchPromiseRef.current = fetchPromise
      const result = await fetchPromise

      // 更新快取
      if (enableCache) {
        cleanExpiredCache()
        cleanCache()
        
        cacheRef.current.set(key, {
          data: result,
          timestamp: Date.now()
        })
      }

      setData(result)
      setLastFetch(Date.now())
      setError(null)
      
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
      fetchPromiseRef.current = null
    }
  }, [
    fetchFunction,
    dependencies,
    cacheKey,
    enableCache,
    isCacheValid,
    cleanExpiredCache,
    cleanCache,
    generateCacheKey,
    staleWhileRevalidate,
    data
  ])

  // 清除快取
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    setData(null)
    setLastFetch(null)
  }, [])

  // 清除特定快取
  const clearCacheByKey = useCallback((key) => {
    const fullKey = generateCacheKey(key, dependencies)
    cacheRef.current.delete(fullKey)
  }, [generateCacheKey, dependencies])

  // 預取數據
  const prefetch = useCallback(async () => {
    if (!loading) {
      await fetchData()
    }
  }, [fetchData, loading])

  // 自動獲取數據
  useEffect(() => {
    fetchData()
  }, dependencies)

  // 快取統計
  const cacheStats = useMemo(() => {
    const entries = Array.from(cacheRef.current.entries())
    const now = Date.now()
    
    return {
      size: cacheRef.current.size,
      maxSize,
      hitRate: entries.filter(([, entry]) => isCacheValid(entry)).length / Math.max(entries.length, 1),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(([, entry]) => entry.timestamp)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(([, entry]) => entry.timestamp)) : null,
      expiredEntries: entries.filter(([, entry]) => !isCacheValid(entry)).length
    }
  }, [maxSize, isCacheValid])

  return {
    data,
    loading,
    error,
    lastFetch,
    fetchData,
    clearCache,
    clearCacheByKey,
    prefetch,
    cacheStats,
    isCacheValid: isCacheValid(cacheRef.current.get(generateCacheKey(cacheKey, dependencies)))
  }
}

/**
 * 計算結果快取 Hook
 * @param {Function} computeFunction - 計算函數
 * @param {Array} dependencies - 依賴項陣列
 * @param {Object} options - 配置選項
 * @returns {any} 計算結果
 */
export const useComputedCache = (computeFunction, dependencies = [], options = {}) => {
  const {
    cacheKey = 'computed',
    ttl = 10 * 60 * 1000, // 10分鐘
    enableCache = true
  } = options

  const cacheRef = useRef(new Map())
  const lastDepsRef = useRef(dependencies)

  return useMemo(() => {
    if (!enableCache) {
      return measurePerformance(`compute_${cacheKey}`, computeFunction)
    }

    const key = `${cacheKey}_${dependencies.map(dep => 
      typeof dep === 'object' ? JSON.stringify(dep) : String(dep)
    ).join('|')}`

    const cacheEntry = cacheRef.current.get(key)
    const now = Date.now()

    // 檢查快取是否有效
    if (cacheEntry && (now - cacheEntry.timestamp) < ttl) {
      return cacheEntry.result
    }

    // 計算新結果
    const result = measurePerformance(`compute_${cacheKey}`, computeFunction)
    
    // 更新快取
    cacheRef.current.set(key, {
      result,
      timestamp: now
    })

    return result
  }, dependencies)
}

/**
 * 分頁快取 Hook
 * @param {Function} fetchPageFunction - 獲取頁面數據的函數
 * @param {Object} options - 配置選項
 * @returns {Object} 分頁快取相關的狀態和方法
 */
export const usePaginatedCache = (fetchPageFunction, options = {}) => {
  const {
    pageSize = 20,
    maxPages = 10,
    ttl = 5 * 60 * 1000
  } = options

  const [pages, setPages] = useState(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 獲取頁面數據
  const fetchPage = useCallback(async (pageNumber) => {
    const pageKey = `page_${pageNumber}`
    const cacheEntry = pages.get(pageKey)
    const now = Date.now()

    // 檢查快取是否有效
    if (cacheEntry && (now - cacheEntry.timestamp) < ttl) {
      return cacheEntry.data
    }

    setLoading(true)
    setError(null)

    try {
      const result = await measurePerformance(`fetchPage_${pageNumber}`, () => 
        fetchPageFunction(pageNumber, pageSize)
      )

      // 更新快取
      setPages(prev => {
        const newPages = new Map(prev)
        newPages.set(pageKey, {
          data: result,
          timestamp: now
        })

        // 清理舊頁面
        if (newPages.size > maxPages) {
          const entries = Array.from(newPages.entries())
          entries
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, newPages.size - maxPages)
            .forEach(([key]) => newPages.delete(key))
        }

        return newPages
      })

      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchPageFunction, pageSize, ttl, maxPages, pages])

  // 清除快取
  const clearCache = useCallback(() => {
    setPages(new Map())
  }, [])

  // 預取頁面
  const prefetchPage = useCallback(async (pageNumber) => {
    if (!loading) {
      await fetchPage(pageNumber)
    }
  }, [fetchPage, loading])

  return {
    fetchPage,
    clearCache,
    prefetchPage,
    loading,
    error,
    cacheSize: pages.size
  }
}