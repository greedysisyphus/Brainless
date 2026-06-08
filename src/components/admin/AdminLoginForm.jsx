import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, checkAdminStatus } from '../../utils/firebase'
import { useTheme } from '../../contexts/ThemeContext'
import ResponsiveContainer, {
  ResponsiveCard,
  ResponsiveButton,
  ResponsiveInput,
  ResponsiveLabel,
  ResponsiveTitle,
  ResponsiveText,
} from '../common/ResponsiveContainer'
import { CwAlert, CwButton, CwInput } from '../studio/ui'
import { studioSurfaces } from '../studio/studioSurfaceClasses'
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

/**
 * 管理員登入表單；Studio 主題使用 Cw* 元件，Classic 維持 Responsive*。
 */
export default function AdminLoginForm({ onLoginSuccess, onLoginError, embedded = false }) {
  const { isStudio } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('請輸入信箱和密碼')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password)
      const isAdmin = await checkAdminStatus(userCredential.user.uid)

      if (!isAdmin) {
        const { signOut } = await import('firebase/auth')
        await signOut(auth)
        setError('此帳號沒有管理員權限')
        onLoginError?.('此帳號沒有管理員權限')
        return
      }

      setEmail('')
      setPassword('')
      onLoginSuccess?.(userCredential.user)
    } catch (err) {
      console.error('登入失敗:', err)
      let errorMessage = '登入失敗'
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = '找不到此帳號'
          break
        case 'auth/wrong-password':
          errorMessage = '密碼錯誤'
          break
        case 'auth/invalid-email':
          errorMessage = '信箱格式錯誤'
          break
        case 'auth/too-many-requests':
          errorMessage = '登入次數過多，請稍後再試'
          break
        case 'auth/network-request-failed':
          errorMessage = '網路連線失敗，請檢查網路連線'
          break
        default:
          errorMessage = '登入失敗：' + (err.message || '未知錯誤')
      }
      setError(errorMessage)
      onLoginError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isStudio) {
    const shellClass = embedded ? 'w-full space-y-6' : 'mx-auto w-full max-w-md space-y-6 p-1'

    return (
      <div className={shellClass}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--cw-radius-lg)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)]">
            <LockClosedIcon className="h-7 w-7 text-[var(--cw-text-muted)]" aria-hidden />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--cw-text)]">管理員登入</h2>
          <p className="mt-2 text-sm text-[var(--cw-text-muted)]">
            請使用管理員帳號登入以存取管理設定
          </p>
        </div>

        {error ? <CwAlert variant="error">{error}</CwAlert> : null}

        <form onSubmit={handleLogin} className="space-y-4">
          <CwInput
            label="管理員信箱"
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            disabled={isLoading}
            autoFocus
            autoComplete="email"
            required
          />

          <label className="block" htmlFor="admin-password">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
              密碼
            </span>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                disabled={isLoading}
                autoComplete="current-password"
                required
                className={`${studioSurfaces.input} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--cw-radius-sm)] text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)]"
                disabled={isLoading}
                aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </label>

          <CwButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading || !email.trim() || !password.trim()}
          >
            {isLoading ? '登入中…' : '登入'}
          </CwButton>
        </form>

        <p className="border-t border-[var(--cw-border)] pt-4 text-center text-xs text-[var(--cw-text-muted)]">
          提示：可使用快捷鍵{' '}
          <kbd className="rounded-[var(--cw-radius-sm)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--cw-text)]">
            Ctrl + Alt + A
          </kbd>{' '}
          在任何頁面開啟登入
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <ResponsiveCard className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <LockClosedIcon className="h-8 w-8 text-primary" />
          </div>
          <ResponsiveTitle level={1} gradient className="mb-2">
            管理員登入
          </ResponsiveTitle>
          <ResponsiveText size="sm" color="secondary">
            請使用管理員帳號登入以存取管理設定
          </ResponsiveText>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <div className="flex items-center gap-2">
              <div className="text-red-400">✗</div>
              <ResponsiveText color="danger" size="sm">
                {error}
              </ResponsiveText>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
                disabled={isLoading}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
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

        <div className="mt-6 border-t border-white/10 pt-6">
          <ResponsiveText size="xs" color="secondary" className="text-center">
            提示：您也可以使用快捷鍵{' '}
            <kbd className="rounded bg-white/10 px-2 py-1 text-xs">Ctrl + Alt + A</kbd> 在任何頁面開啟登入
          </ResponsiveText>
        </div>
      </ResponsiveCard>
    </div>
  )
}
