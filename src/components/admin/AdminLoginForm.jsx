import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, checkAdminStatus } from '../../utils/firebase';
import ResponsiveContainer, { 
  ResponsiveCard, 
  ResponsiveButton, 
  ResponsiveInput, 
  ResponsiveLabel, 
  ResponsiveTitle, 
  ResponsiveText 
} from '../common/ResponsiveContainer';
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

/**
 * 管理員登入表單組件
 * 提供友好的登入界面
 */
const AdminLoginForm = ({ onLoginSuccess, onLoginError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError('請輸入信箱和密碼');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // 登入 Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // 檢查是否為管理員
      const isAdmin = await checkAdminStatus(userCredential.user.uid);
      
      if (!isAdmin) {
        // 如果不是管理員，登出
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        setError('此帳號沒有管理員權限');
        if (onLoginError) onLoginError('此帳號沒有管理員權限');
        return;
      }

      // 登入成功
      setEmail('');
      setPassword('');
      if (onLoginSuccess) onLoginSuccess(userCredential.user);
    } catch (error) {
      console.error('登入失敗:', error);
      let errorMessage = '登入失敗';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = '找不到此帳號';
          break;
        case 'auth/wrong-password':
          errorMessage = '密碼錯誤';
          break;
        case 'auth/invalid-email':
          errorMessage = '信箱格式錯誤';
          break;
        case 'auth/too-many-requests':
          errorMessage = '登入次數過多，請稍後再試';
          break;
        case 'auth/network-request-failed':
          errorMessage = '網路連線失敗，請檢查網路連線';
          break;
        default:
          errorMessage = '登入失敗：' + (error.message || '未知錯誤');
      }
      
      setError(errorMessage);
      if (onLoginError) onLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <ResponsiveCard className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <LockClosedIcon className="w-8 h-8 text-primary" />
          </div>
          <ResponsiveTitle level={1} gradient className="mb-2">
            管理員登入
          </ResponsiveTitle>
          <ResponsiveText size="sm" color="secondary">
            請使用管理員帳號登入以存取管理設定
          </ResponsiveText>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="text-red-400">✗</div>
              <ResponsiveText color="danger" size="sm">{error}</ResponsiveText>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <ResponsiveLabel htmlFor="email" required>
              管理員信箱
            </ResponsiveLabel>
            <ResponsiveInput
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={isLoading}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div>
            <ResponsiveLabel htmlFor="password" required>
              密碼
            </ResponsiveLabel>
            <div className="relative">
              <ResponsiveInput
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                disabled={isLoading}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <ResponsiveButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading || !email.trim() || !password.trim()}
            loading={isLoading}
          >
            {isLoading ? '登入中...' : '登入'}
          </ResponsiveButton>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10">
          <ResponsiveText size="xs" color="secondary" className="text-center">
            提示：您也可以使用快捷鍵 <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl + Alt + A</kbd> 在任何頁面開啟登入
          </ResponsiveText>
        </div>
      </ResponsiveCard>
    </div>
  );
};

export default AdminLoginForm;
