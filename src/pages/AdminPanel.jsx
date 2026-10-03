import { useAdminGate } from '../components/admin/useAdmin'
import AdminSettingsTabs from '../components/admin/AdminSettingsTabs'
import AdminLoginForm from '../components/admin/AdminLoginForm'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwCard } from '../components/studio/ui'

const ADMIN_BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '系統', href: '#/' },
  { label: '管理員設定', href: '#/admin' },
]

const AdminPanel = () => {
  const { isAdmin, isLoading, handleAdminLogout } = useAdminGate()

  if (isLoading) {
    return (
      <DualThemePage
        breadcrumbs={ADMIN_BC}
        title="載入中"
        description="正在檢查管理員權限…"
        studio={
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16">
            <div
              className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--cw-border)] border-t-[var(--cw-text)]"
              aria-hidden
            />
            <p className="text-sm text-[var(--cw-text-muted)]">正在檢查管理員權限…</p>
          </div>
        }
      />
    )
  }

  if (!isAdmin) {
    return (
      <DualThemePage
        breadcrumbs={ADMIN_BC}
        title="管理員登入"
        description="登入 Firebase 並驗證管理員身分"
        studio={
          <CwCard className="mx-auto max-w-md">
            <AdminLoginForm embedded onLoginSuccess={() => {}} onLoginError={() => {}} />
          </CwCard>
        }
      />
    )
  }

  return (
    <DualThemePage
      breadcrumbs={ADMIN_BC}
      title="管理員設定"
      description="跑馬燈"
      studio={<AdminSettingsTabs onLogout={handleAdminLogout} isLoggingOut={isLoading} />}
    />
  )
}

export default AdminPanel
