import { DualThemePage } from '../components/studio/DualThemePage'

function LoadingPage() {
  return (
    <DualThemePage
      breadcrumbs={[{ label: 'Brainless', href: '#/sandwich' }, { label: '載入中' }]}
      title="載入中"
      description="請稍候"
      classic={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent" />
            <p className="text-text-secondary animate-pulse">載入中...</p>
          </div>
        </div>
      }
      studio={
        <div className="cw-shell-min-h flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16">
          <div
            className="h-14 w-14 animate-spin rounded-full border-[3px] border-[var(--cw-border-strong)] border-t-[var(--cw-text)]"
            aria-hidden
          />
          <p className="text-sm text-[var(--cw-text-muted)]">載入中…</p>
        </div>
      }
    />
  )
}

export default LoadingPage
