import { useState, useEffect, useMemo, useCallback } from 'react'

/**
 * 虛擬化渲染 Hook
 * @param {Array} items - 要渲染的項目陣列
 * @param {Object} options - 配置選項
 * @returns {Object} 虛擬化相關的狀態和方法
 */
export const useVirtualization = (items, options = {}) => {
  const {
    itemHeight = 50,        // 每個項目的高度
    containerHeight = 400,  // 容器高度
    overscan = 5,           // 預渲染的額外項目數量
    threshold = 100         // 滾動閾值
  } = options

  const [scrollTop, setScrollTop] = useState(0)
  const [containerRef, setContainerRef] = useState(null)

  // 計算可見範圍
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    )
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: endIndex
    }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // 可見項目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      ...item,
      index: visibleRange.start + index,
      top: (visibleRange.start + index) * itemHeight
    }))
  }, [items, visibleRange, itemHeight])

  // 總高度
  const totalHeight = items.length * itemHeight

  // 滾動處理
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop
    setScrollTop(newScrollTop)
  }, [])

  // 滾動到指定項目
  const scrollToItem = useCallback((index) => {
    if (containerRef) {
      const targetScrollTop = index * itemHeight
      containerRef.scrollTop = targetScrollTop
    }
  }, [containerRef, itemHeight])

  // 滾動到頂部
  const scrollToTop = useCallback(() => {
    scrollToItem(0)
  }, [scrollToItem])

  // 滾動到底部
  const scrollToBottom = useCallback(() => {
    scrollToItem(items.length - 1)
  }, [scrollToItem, items.length])

  return {
    visibleItems,
    totalHeight,
    visibleRange,
    scrollTop,
    setContainerRef,
    handleScroll,
    scrollToItem,
    scrollToTop,
    scrollToBottom
  }
}

/**
 * 無限滾動 Hook
 * @param {Function} loadMore - 載入更多數據的函數
 * @param {Object} options - 配置選項
 * @returns {Object} 無限滾動相關的狀態和方法
 */
export const useInfiniteScroll = (loadMore, options = {}) => {
  const {
    threshold = 100,        // 觸發載入的距離閾值
    rootMargin = '0px',     // 根邊距
    hasMore = true,         // 是否還有更多數據
    loading = false         // 是否正在載入
  } = options

  const [isIntersecting, setIsIntersecting] = useState(false)

  // 觀察器回調
  const handleIntersection = useCallback((entries) => {
    const [entry] = entries
    setIsIntersecting(entry.isIntersecting)
    
    if (entry.isIntersecting && hasMore && !loading) {
      loadMore()
    }
  }, [loadMore, hasMore, loading])

  // 設置觀察器
  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold: 0.1
    })

    return () => observer.disconnect()
  }, [handleIntersection, rootMargin])

  return {
    isIntersecting,
    setIsIntersecting
  }
}

/**
 * 分頁 Hook
 * @param {Array} items - 要分頁的項目陣列
 * @param {Object} options - 配置選項
 * @returns {Object} 分頁相關的狀態和方法
 */
export const usePagination = (items, options = {}) => {
  const {
    pageSize = 20,          // 每頁項目數
    initialPage = 1          // 初始頁面
  } = options

  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSizeState, setPageSizeState] = useState(pageSize)

  // 計算總頁數
  const totalPages = Math.ceil(items.length / pageSizeState)

  // 當前頁的項目
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSizeState
    const endIndex = startIndex + pageSizeState
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, pageSizeState])

  // 跳轉到指定頁面
  const goToPage = useCallback((page) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }, [totalPages])

  // 下一頁
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }, [currentPage, totalPages])

  // 上一頁
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }, [currentPage])

  // 第一頁
  const firstPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  // 最後一頁
  const lastPage = useCallback(() => {
    setCurrentPage(totalPages)
  }, [totalPages])

  // 改變頁面大小
  const changePageSize = useCallback((newPageSize) => {
    setPageSizeState(newPageSize)
    setCurrentPage(1) // 重置到第一頁
  }, [])

  return {
    currentPage,
    totalPages,
    pageSize: pageSizeState,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    changePageSize,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  }
}
