import { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import ResponsiveContainer, {
  ResponsiveButton,
  ResponsiveText,
  ResponsiveTitle,
} from '../common/ResponsiveContainer'
import NowPlayingMarqueeSettings from './NowPlayingMarqueeSettings'
import PublicMenuSettings from './PublicMenuSettings'
import { CwButton } from '../studio/ui'

const ADMIN_TABS = [
  { id: 'marquee', label: '跑馬燈', description: '音樂／天氣跑馬燈' },
  { id: 'menu', label: '電子菜單', description: '客人 QR 菜單圖（1～2 張）' },
]

function AdminTabBar({ activeTab, onChange, isStudio }) {
  if (isStudio) {
    return (
      <div
        className="flex flex-wrap gap-1 border-b border-[var(--cw-border)]"
        role="tablist"
        aria-label="管理員設定分類"
      >
        {ADMIN_TABS.map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`admin-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`admin-panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`cw-touch-target -mb-px rounded-t-[var(--cw-radius)] border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                selected
                  ? 'border-[var(--cw-text)] text-[var(--cw-text)]'
                  : 'border-transparent text-[var(--cw-text-muted)] hover:text-[var(--cw-text)]'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex justify-center px-2" role="tablist" aria-label="管理員設定分類">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface/60 p-1 backdrop-blur-sm">
        <div className="flex gap-1">
          {ADMIN_TABS.map((tab) => {
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`admin-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`admin-panel-${tab.id}`}
                onClick={() => onChange(tab.id)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${
                  selected
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-text-secondary hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AdminTabPanel({ tabId, activeTab, children }) {
  if (activeTab !== tabId) return null
  return (
    <div
      role="tabpanel"
      id={`admin-panel-${tabId}`}
      aria-labelledby={`admin-tab-${tabId}`}
      className="pt-6"
    >
      {children}
    </div>
  )
}

export default function AdminSettingsTabs({ onLogout, isLoggingOut }) {
  const { isStudio } = useTheme()
  const [activeTab, setActiveTab] = useState('marquee')

  const activeMeta = ADMIN_TABS.find((tab) => tab.id === activeTab) ?? ADMIN_TABS[0]

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
                {activeMeta.label}
              </ResponsiveTitle>
              <ResponsiveText size="sm" color="secondary">
                {activeMeta.description}
              </ResponsiveText>
            </>
          ) : (
            <p className="text-sm text-[var(--cw-text-muted)]">{activeMeta.description}</p>
          )}
        </div>
        <div className={isStudio ? 'flex shrink-0 justify-end' : 'flex justify-center sm:justify-end'}>
          {logoutButton}
        </div>
      </div>

      <AdminTabBar activeTab={activeTab} onChange={setActiveTab} isStudio={isStudio} />

      <AdminTabPanel tabId="marquee" activeTab={activeTab}>
        <NowPlayingMarqueeSettings />
      </AdminTabPanel>
      <AdminTabPanel tabId="menu" activeTab={activeTab}>
        <PublicMenuSettings embedded />
      </AdminTabPanel>
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
            跑馬燈、電子菜單
          </ResponsiveText>
        </div>
        {settingsBody}
      </ResponsiveContainer>
    </div>
  )
}
