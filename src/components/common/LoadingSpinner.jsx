export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="relative">
        {/* 主要加載圈 */}
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        
        {/* 內圈脈衝效果 */}
        <div className="absolute inset-0 rounded-full animate-pulse bg-primary/10" />
        
        {/* 外圈光暈效果 */}
        <div className="absolute -inset-2 rounded-full animate-pulse bg-primary/5" />
      </div>
    </div>
  )
} 