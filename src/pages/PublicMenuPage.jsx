import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, checkAdminStatus } from '../utils/firebase'
import { DualThemePage } from '../components/studio/DualThemePage'
import PublicMenuSettings from '../components/admin/PublicMenuSettings'
import AdminLoginForm from '../components/admin/AdminLoginForm'
import { ResponsiveText } from '../components/common/ResponsiveContainer'
import { CwCard } from '../components/studio/ui'

const MENU_BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '人事與航班', href: '#/' },
  { label: '電子菜單', href: '#/menu' },
]

export default function PublicMenuPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const adminStatus = await checkAdminStatus(user.uid)
          setIsAdmin(adminStatus)
          if (!adminStatus) {
            setTimeout(() => navigate('/'), 3000)
          }
        } catch {
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
      setIsLoading(false)
    })

    return unsubscribe
  }, [navigate])

  if (isLoading) {
    return (
      <DualThemePage
        breadcrumbs={MENU_BC}
        title="載入中"
        description="正在檢查管理員權限…"
        classic={
          <div className="flex min-h-[40vh] items-center justify-center">
            <ResponsiveText>正在檢查管理員權限…</ResponsiveText>
          </div>
        }
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
        breadcrumbs={MENU_BC}
        title="管理員登入"
        description="電子菜單需管理員權限"
        classic={<AdminLoginForm onLoginSuccess={() => {}} onLoginError={() => {}} />}
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
      breadcrumbs={MENU_BC}
      title="電子菜單"
      description="最多 2 張圖；換圖即時同步客人 QR 站。版面切換需 menu-site 部署新版後生效。"
      classic={<PublicMenuSettings embedded />}
      studio={<PublicMenuSettings embedded />}
    />
  )
}
