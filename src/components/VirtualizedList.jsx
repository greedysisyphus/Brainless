import React, { forwardRef, useMemo } from 'react'
import { useVirtualization } from '../hooks/useVirtualization'
import { useRenderPerformance } from '../utils/performance'

/**
 * 虛擬化列表組件
 * @param {Array} items - 要渲染的項目陣列
 * @param {Function} renderItem - 渲染單個項目的函數
 * @param {Object} options - 配置選項
 * @param {Object} props - 其他屬性
 */
const VirtualizedList = forwardRef(({ 
  items = [], 
  renderItem, 
  options = {},
  className = '',
  ...props 
}, ref) => {
  const finishRender = useRenderPerformance('VirtualizedList')
  
  const {
    itemHeight = 50,
    containerHeight = 400,
    overscan = 5,
    threshold = 100
  } = options

  const {
    visibleItems,
    totalHeight,
    visibleRange,
    scrollTop,
    setContainerRef,
    handleScroll
  } = useVirtualization(items, {
    itemHeight,
    containerHeight,
    overscan,
    threshold
  })

  // 計算偏移量
  const offsetY = visibleRange.start * itemHeight

  // 渲染可見項目
  const renderedItems = useMemo(() => {
    return visibleItems.map((item, index) => (
      <div
        key={item.id || item.index || index}
        style={{
          position: 'absolute',
          top: item.top,
          left: 0,
          right: 0,
          height: itemHeight
        }}
      >
        {renderItem(item, item.index)}
      </div>
    ))
  }, [visibleItems, renderItem, itemHeight])

  React.useEffect(() => {
    finishRender()
  })

  return (
    <div
      ref={ref}
      className={`virtualized-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
      {...props}
    >
      <div
        ref={setContainerRef}
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'relative'
          }}
        >
          {renderedItems}
        </div>
      </div>
    </div>
  )
})

VirtualizedList.displayName = 'VirtualizedList'

export default VirtualizedList
