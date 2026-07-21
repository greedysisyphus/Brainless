import { useEffect, useState } from 'react'
import { auth, checkAdminStatus } from '../utils/firebase'
import { DualThemePage } from '../components/studio/DualThemePage'
import PublicMenuSettings from '../components/admin/PublicMenuSettings'

const MENU_BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '人事與航班', href: '#/' },
  { label: '電子菜單', href: '#/menu' },
]

export default function PublicMenuPage() {
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setCanEdit(false)
        return
      }
      try {
        setCanEdit(await checkAdminStatus(user.uid))
      } catch {
        setCanEdit(false)
      }
    })

    return unsubscribe
  }, [])

  return (
    <DualThemePage
      breadcrumbs={MENU_BC}
      title="電子菜單"
      description={
        canEdit
          ? '最多 2 張圖；換圖即時同步客人 QR 站。'
          : '檢視目前菜單與客人頁。如需修改請先登入管理員。'
      }
      classic={<PublicMenuSettings embedded canEdit={canEdit} />}
      studio={<PublicMenuSettings embedded canEdit={canEdit} />}
    />
  )
}
