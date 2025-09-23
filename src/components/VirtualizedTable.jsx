import React, { forwardRef, useMemo } from 'react'
import { useVirtualization } from '../hooks/useVirtualization'
import { useRenderPerformance } from '../utils/performance'

/**
 * 虛擬化表格組件
 * @param {Array} data - 表格數據
 * @param {Array} columns - 列配置
 * @param {Object} options - 配置選項
 * @param {Object} props - 其他屬性
 */
const VirtualizedTable = forwardRef(({ 
  data = [], 
  columns = [],
  options = {},
  className = '',
  ...props 
}, ref) => {
  const finishRender = useRenderPerformance('VirtualizedTable')
  
  const {
    itemHeight = 40,
    containerHeight = 400,
    overscan = 5,
    threshold = 100,
    headerHeight = 50
  } = options

  const {
    visibleItems,
    totalHeight,
    visibleRange,
    scrollTop,
    setContainerRef,
    handleScroll
  } = useVirtualization(data, {
    itemHeight,
    containerHeight: containerHeight - headerHeight,
    overscan,
    threshold
  })

  // 計算偏移量
  const offsetY = visibleRange.start * itemHeight

  // 渲染表頭
  const renderHeader = () => (
    <thead className="bg-surface/40 border-b border-white/20 sticky top-0 z-10">
      <tr>
        {columns.map((column, index) => (
          <th
            key={column.key || index}
            className="p-3 text-left font-semibold text-white"
            style={{ 
              width: column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth
            }}
          >
            {column.title}
          </th>
        ))}
      </tr>
    </thead>
  )

  // 渲染表格行
  const renderRow = (item, index) => (
    <tr
      key={item.id || index}
      className="border-b border-white/10 hover:bg-white/5 transition-colors"
      style={{
        height: itemHeight
      }}
    >
      {columns.map((column, colIndex) => (
        <td
          key={column.key || colIndex}
          className="p-3 text-white"
          style={{
            width: column.width,
            minWidth: column.minWidth,
            maxWidth: column.maxWidth
          }}
        >
          {column.render ? column.render(item[column.key], item, index) : item[column.key]}
        </td>
      ))}
    </tr>
  )

  // 渲染可見行
  const renderedRows = useMemo(() => {
    return visibleItems.map((item, index) => renderRow(item, item.index))
  }, [visibleItems, columns, itemHeight])

  React.useEffect(() => {
    finishRender()
  })

  return (
    <div
      ref={ref}
      className={`virtualized-table ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
      {...props}
    >
      <table className="w-full">
        {renderHeader()}
        <tbody>
          <tr style={{ height: offsetY }}>
            <td colSpan={columns.length} style={{ height: offsetY }} />
          </tr>
          {renderedRows}
          <tr style={{ height: totalHeight - offsetY - (visibleItems.length * itemHeight) }}>
            <td colSpan={columns.length} style={{ height: totalHeight - offsetY - (visibleItems.length * itemHeight) }} />
          </tr>
        </tbody>
      </table>
    </div>
  )
})

VirtualizedTable.displayName = 'VirtualizedTable'

export default VirtualizedTable
