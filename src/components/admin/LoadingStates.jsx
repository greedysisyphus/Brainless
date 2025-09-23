import React from 'react';
import { ResponsiveText, ResponsiveTitle } from '../common/ResponsiveContainer';

// 載入狀態組件
export const LoadingSpinner = ({ message = '載入中...', subMessage = '' }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <ResponsiveText size="lg" className="mb-2">{message}</ResponsiveText>
      {subMessage && (
        <ResponsiveText size="sm" color="secondary">{subMessage}</ResponsiveText>
      )}
    </div>
  </div>
);

// 錯誤狀態組件
export const ErrorState = ({ 
  title = '發生錯誤', 
  message, 
  onRetry, 
  onGoHome,
  showDetails = false,
  error 
}) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="text-center max-w-md mx-auto">
      <div className="text-red-400 text-4xl mb-4">⚠️</div>
      <ResponsiveTitle level={2} className="mb-4">{title}</ResponsiveTitle>
      <ResponsiveText className="mb-6">{message}</ResponsiveText>
      <div className="space-y-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            重試
          </button>
        )}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="w-full bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-colors"
          >
            返回首頁
          </button>
        )}
      </div>
      
      {/* 開發模式下顯示詳細錯誤信息 */}
      {showDetails && error && process.env.NODE_ENV === 'development' && (
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
            顯示錯誤詳情
          </summary>
          <div className="mt-2 p-3 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300 overflow-auto max-h-40">
            <pre>{error.toString()}</pre>
          </div>
        </details>
      )}
    </div>
  </div>
);

// 空狀態組件
export const EmptyState = ({ 
  title = '暫無資料', 
  message = '目前沒有任何資料', 
  action,
  actionText = '添加新項目'
}) => (
  <div className="text-center py-12">
    <div className="text-gray-400 text-4xl mb-4">📝</div>
    <ResponsiveTitle level={3} className="mb-2">{title}</ResponsiveTitle>
    <ResponsiveText color="secondary" className="mb-6">{message}</ResponsiveText>
    {action && (
      <button
        onClick={action}
        className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
      >
        {actionText}
      </button>
    )}
  </div>
);

// 保存狀態指示器
export const SaveStatus = ({ status, message }) => {
  if (!status) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          className: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
          icon: '⏳'
        };
      case 'success':
        return {
          className: 'bg-green-500/10 border-green-500/20 text-green-300',
          icon: '✓'
        };
      case 'error':
        return {
          className: 'bg-red-500/10 border-red-500/20 text-red-300',
          icon: '✗'
        };
      default:
        return {
          className: 'bg-gray-500/10 border-gray-500/20 text-gray-300',
          icon: 'ℹ️'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`mb-4 p-3 rounded-lg border ${config.className}`}>
      <div className="flex items-center gap-3">
        <span>{config.icon}</span>
        <ResponsiveText size="sm">{message}</ResponsiveText>
      </div>
    </div>
  );
};
