import { DualThemePage } from '../components/studio/DualThemePage'
import { CwButton } from '../components/studio/ui'
import { studioSurfaces } from '../components/studio/studioSurfaceClasses'

function ErrorPage() {
  return (
    <DualThemePage
      breadcrumbs={[{ label: 'Brainless', href: '#/sandwich' }, { label: '錯誤' }]}
      title="無法載入頁面"
      description="發生錯誤時可嘗試重新整理"
      studio={
        <div className="flex min-h-[48vh] flex-col items-center justify-center py-12">
          <div className={`w-full max-w-md p-8 text-center ${studioSurfaces.card}`}>
            <p className="mb-6 text-[var(--cw-text-muted)]">抱歉，頁面載入時發生錯誤。</p>
            <CwButton variant="primary" type="button" onClick={() => window.location.reload()}>
              重新載入
            </CwButton>
          </div>
        </div>
      }
    />
  )
}

export default ErrorPage
