import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能夠顯示降級後的 UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // 記錄錯誤信息
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      // 自定義降級後的 UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-red-300 mb-4">
                班表管理出現錯誤
              </h2>
              <p className="text-gray-300 mb-6">
                系統遇到意外錯誤，請重新整理頁面或聯繫管理員
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 rounded-lg transition-all duration-200"
              >
                重新整理頁面
              </button>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-400">
                    錯誤詳情 (開發模式)
                  </summary>
                  <pre className="mt-2 text-xs text-gray-500 overflow-auto">
                    {this.state.error && this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary