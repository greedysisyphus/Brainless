import React from 'react'

/**
 * 載入動畫元件
 */
export const LoadingSpinner = ({ size = 'md', color = 'blue', text = '載入中...' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }
  
  const colorClasses = {
    blue: 'border-blue-400',
    green: 'border-green-400',
    red: 'border-red-400',
    yellow: 'border-yellow-400',
    purple: 'border-purple-400',
    pink: 'border-pink-400'
  }
  
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div 
        className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}`}
      />
      {text && (
        <p className="text-sm text-gray-400">{text}</p>
      )}
    </div>
  )
}

/**
 * 覆蓋式載入狀態
 */
export const LoadingOverlay = ({ isLoading, children, text = '載入中...' }) => (
  <div className="relative">
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-surface/90 rounded-xl p-6 border border-white/20">
          <LoadingSpinner size="lg" text={text} />
        </div>
      </div>
    )}
  </div>
)

/**
 * 骨架屏元件
 */
export const SkeletonCard = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-700 rounded-lg ${className}`} />
)

/**
 * 統計卡片骨架屏
 */
export const StatisticsSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center justify-between p-3 bg-surface/20 rounded-lg">
        <div className="flex items-center space-x-3">
          <SkeletonCard className="w-6 h-6 rounded-full" />
          <SkeletonCard className="h-4 w-20" />
        </div>
        <SkeletonCard className="h-4 w-12" />
      </div>
    ))}
  </div>
)

/**
 * 圖表骨架屏
 */
export const ChartSkeleton = ({ height = 300 }) => (
  <div className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-2xl p-6 border border-white/20">
    <div className="animate-pulse">
      <SkeletonCard className="h-6 w-32 mx-auto mb-4" />
      <SkeletonCard className={`w-full h-${height}`} />
    </div>
  </div>
)

export default LoadingSpinner
