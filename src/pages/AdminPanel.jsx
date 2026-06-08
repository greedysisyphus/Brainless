import React, { useState, useEffect } from 'react'
import { auth, checkAdminStatus } from '../utils/firebase'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveTitle,
  ResponsiveText,
} from '../components/common/ResponsiveContainer'
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

  const handleAdminLogout = async () => {
    try {
      setIsLoading(true)
      const { signOut } = await import('firebase/auth')
      await signOut(auth)
      navigate('/')
    } catch {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DualThemePage
        breadcrumbs={ADMIN_BC}
        title="載入中"
        description="正在檢查管理員權限…"
        classic={
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
              <ResponsiveText size="lg" className="mb-2">
                載入中...
              </ResponsiveText>
              <ResponsiveText size="sm" color="secondary">
                正在檢查管理員權限
              </ResponsiveText>
            </div>
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
        breadcrumbs={ADMIN_BC}
        title="管理員登入"
        description="登入 Firebase 並驗證管理員身分"
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
      breadcrumbs={ADMIN_BC}
      title="管理員設定"
      description="跑馬燈、電子菜單"
      classic={<AdminSettingsTabs onLogout={handleAdminLogout} isLoggingOut={isLoading} />}
      studio={<AdminSettingsTabs onLogout={handleAdminLogout} isLoggingOut={isLoading} />}
    />
  )
}

export default AdminPanel
