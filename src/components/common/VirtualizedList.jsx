import React, { useState, useEffect, useRef, useMemo } from 'react'

/**
 * 虛擬化列表組件
 * 用於處理大量數據的渲染，提升性能
 */
export const VirtualizedList = ({
  items = [],
  itemHeight = 50,
  containerHeight = 400,
  renderItem,
  className = '',
  overscan = 5
}) => {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef(null)

  // 計算可見範圍
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  // 計算總高度
  const totalHeight = items.length * itemHeight

  // 處理滾動事件
  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop)
  }

  // 渲染可見項目
  const visibleItems = useMemo(() => {
    const items = []
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (i < items.length) {
        items.push({
          index: i,
          item: items[i],
          top: i * itemHeight
        })
      }
    }
    return items
  }, [visibleRange, items, itemHeight])

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, item, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: top,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 虛擬化表格組件
 * 用於處理大型表格數據
 */
export const VirtualizedTable = ({
  data = [],
  columns = [],
  rowHeight = 40,
  headerHeight = 50,
  containerHeight = 400,
  className = ''
}) => {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef(null)

  // 計算可見行範圍
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight))
    const endIndex = Math.min(
      data.length - 1,
      Math.ceil((scrollTop + containerHeight - headerHeight) / rowHeight)
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, rowHeight, containerHeight, headerHeight, data.length])

  // 計算總高度
  const totalHeight = data.length * rowHeight

  // 處理滾動事件
  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop)
  }

  // 渲染可見行
  const visibleRows = useMemo(() => {
    const rows = []
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (i < data.length) {
        rows.push({
          index: i,
          data: data[i],
          top: i * rowHeight
        })
      }
    }
    return rows
  }, [visibleRange, data, rowHeight])

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight + headerHeight, position: 'relative' }}>
        {/* 表頭 */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: headerHeight,
            zIndex: 10,
            backgroundColor: 'var(--surface)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="flex">
            {columns.map((column, index) => (
              <div
                key={index}
                className="flex-1 px-4 py-3 font-semibold text-gray-300 border-r border-white/10 last:border-r-0"
                style={{ minWidth: column.width || 'auto' }}
              >
                {column.header}
              </div>
            ))}
          </div>
        </div>

        {/* 表格行 */}
        {visibleRows.map(({ index, data: rowData, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: top + headerHeight,
              height: rowHeight,
              width: '100%'
            }}
            className="flex border-b border-white/5 hover:bg-surface/20"
          >
            {columns.map((column, colIndex) => (
              <div
                key={colIndex}
                className="flex-1 px-4 py-2 text-white border-r border-white/5 last:border-r-0"
                style={{ minWidth: column.width || 'auto' }}
              >
                {column.render ? column.render(rowData, index) : rowData[column.key]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 無限滾動 Hook
 * 用於實現無限滾動加載
 */
export const useInfiniteScroll = ({
  hasMore,
  loadMore,
  threshold = 100
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const observerRef = useRef(null)

  useEffect(() => {
    if (!hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoading(true)
          loadMore().finally(() => setIsLoading(false))
        }
      },
      { threshold }
    )

    observerRef.current = observer
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadMore, threshold])

  return {
    observerRef,
    isLoading
  }
}
