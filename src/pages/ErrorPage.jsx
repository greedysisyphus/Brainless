import { DualThemePage } from '../components/studio/DualThemePage'
import { CwButton } from '../components/studio/ui'
import { studioSurfaces } from '../components/studio/studioSurfaceClasses'

function ErrorPage() {
  return (
    <DualThemePage
      breadcrumbs={[{ label: 'Brainless', href: '#/sandwich' }, { label: '錯誤' }]}
      title="無法載入頁面"
      description="發生錯誤時可嘗試重新整理"
      classic={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-red-500">出錯了！</h1>
            <p className="text-text-secondary">抱歉，頁面載入時發生錯誤。</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              重新載入
            </button>
          </div>
        </div>
      }
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
