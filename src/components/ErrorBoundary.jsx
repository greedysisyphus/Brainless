import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能夠顯示降級後的 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 記錄錯誤信息
    console.error('錯誤邊界捕獲到錯誤:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // 可以在這裡發送錯誤報告到服務器
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // 自定義降級後的 UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto">
            <div className="text-red-400 text-6xl mb-6">😵</div>
            <h1 className="text-2xl font-bold text-white mb-4">
              哎呀！發生了一些問題
            </h1>
            <p className="text-text-secondary mb-6">
              應用程序遇到了一個意外錯誤。請嘗試重新載入頁面或返回首頁。
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/80 transition-colors"
              >
                重新載入頁面
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-colors"
              >
                返回首頁
              </button>
            </div>

            {/* 開發環境顯示詳細錯誤信息 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-red-400 cursor-pointer mb-2">
                  顯示詳細錯誤信息（僅開發環境）
                </summary>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm">
                  <div className="text-red-400 font-bold mb-2">錯誤信息:</div>
                  <pre className="text-red-300 whitespace-pre-wrap mb-4">
                    {this.state.error.toString()}
                  </pre>
                  <div className="text-red-400 font-bold mb-2">錯誤堆疊:</div>
                  <pre className="text-red-300 whitespace-pre-wrap text-xs">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 