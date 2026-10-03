import { useCanEdit } from '../components/admin/useAdmin'
import { DualThemePage } from '../components/studio/DualThemePage'
import PublicMenuSettings from '../components/admin/PublicMenuSettings'

const MENU_BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '人事與航班', href: '#/' },
  { label: '電子菜單', href: '#/menu' },
]

export default function PublicMenuPage() {
  const { canEdit } = useCanEdit()

  return (
    <DualThemePage
      breadcrumbs={MENU_BC}
      title="電子菜單"
      description={
        canEdit
          ? '最多 2 張圖；換圖即時同步客人 QR 站。'
          : '檢視目前菜單與客人頁。如需修改請先登入管理員。'
      }
      studio={<PublicMenuSettings embedded canEdit={canEdit} />}
    />
  )
}
