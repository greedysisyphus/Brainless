import React from 'react';
import { ResponsiveButton, ResponsiveText, ResponsiveTitle } from '../common/ResponsiveContainer';

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // 記錄錯誤到控制台
    console.error('管理設定錯誤:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <ResponsiveTitle level={2} className="mb-4">發生錯誤</ResponsiveTitle>
            <ResponsiveText className="mb-6">
              管理設定功能發生錯誤，請重新載入頁面或聯繫技術支援。
            </ResponsiveText>
            <div className="space-y-3">
              <ResponsiveButton
                onClick={this.handleRetry}
                variant="primary"
                size="lg"
                className="w-full"
              >
                重試
              </ResponsiveButton>
              <ResponsiveButton
                onClick={() => window.location.reload()}
                variant="secondary"
                size="lg"
                className="w-full"
              >
                重新載入頁面
              </ResponsiveButton>
            </div>
            
            {/* 開發模式下顯示詳細錯誤信息 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                  顯示錯誤詳情
                </summary>
                <div className="mt-2 p-3 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300 overflow-auto max-h-40">
                  <div className="font-bold mb-2">錯誤信息:</div>
                  <div className="mb-2">{this.state.error.toString()}</div>
                  <div className="font-bold mb-2">錯誤堆疊:</div>
                  <div className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</div>
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

export default AdminErrorBoundary;
