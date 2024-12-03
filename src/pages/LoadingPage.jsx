function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent" />
        <p className="text-text-secondary animate-pulse">載入中...</p>
      </div>
    </div>
  )
}

export default LoadingPage 