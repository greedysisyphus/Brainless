function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-red-500">出錯了！</h1>
        <p className="text-text-secondary">
          抱歉，頁面載入時發生錯誤。
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          重新載入
        </button>
      </div>
    </div>
  )
}

export default ErrorPage 