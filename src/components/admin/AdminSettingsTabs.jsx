import { useTheme } from '../../contexts/ThemeContext'
import ResponsiveContainer, {
  ResponsiveButton,
  ResponsiveText,
  ResponsiveTitle,
} from '../common/ResponsiveContainer'
import NowPlayingMarqueeSettings from './NowPlayingMarqueeSettings'
import { CwButton } from '../studio/ui'

export default function AdminSettingsTabs({ onLogout, isLoggingOut }) {
  const { isStudio } = useTheme()

  const logoutButton = isStudio ? (
    <CwButton type="button" variant="secondary" disabled={isLoggingOut} onClick={onLogout}>
      {isLoggingOut ? '登出中…' : '登出管理員'}
    </CwButton>
  ) : (
    <ResponsiveButton onClick={onLogout} variant="danger" disabled={isLoggingOut} loading={isLoggingOut}>
      {isLoggingOut ? '登出中...' : '登出管理員'}
    </ResponsiveButton>
  )

  const settingsBody = (
    <div className="space-y-4">
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${isStudio ? '' : 'mb-2'}`}>
        <div className={isStudio ? 'min-w-0 flex-1' : 'text-center sm:text-left'}>
          {!isStudio ? (
            <>
              <ResponsiveTitle level={2} className="mb-1">
                跑馬燈
              </ResponsiveTitle>
              <ResponsiveText size="sm" color="secondary">
                音樂／天氣跑馬燈
              </ResponsiveText>
            </>
          ) : (
            <p className="text-sm text-[var(--cw-text-muted)]">音樂／天氣跑馬燈</p>
          )}
        </div>
        <div className={isStudio ? 'flex shrink-0 justify-end' : 'flex justify-center sm:justify-end'}>
          {logoutButton}
        </div>
      </div>

      <NowPlayingMarqueeSettings />
    </div>
  )

  if (isStudio) {
    return settingsBody
  }

  return (
    <div className="min-h-screen bg-background">
      <ResponsiveContainer>
        <div className="mb-6 text-center">
          <ResponsiveTitle level={1} gradient className="mb-2">
            管理員設定
          </ResponsiveTitle>
          <ResponsiveText size="sm" color="secondary">
            跑馬燈
          </ResponsiveText>
        </div>
        {settingsBody}
      </ResponsiveContainer>
    </div>
  )
}
