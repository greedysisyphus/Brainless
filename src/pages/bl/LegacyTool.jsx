import { lazy, Suspense } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { InBlShell } from '../../components/bl/chrome'
import { ToolPage } from '../../components/bl/shared'
import ErrorBoundary from '../../components/ErrorBoundary'
import { ADMIN_NAV_META, BASE_NAV_ITEMS } from '../../config/navigation.jsx'
import '../../styles/bl-legacy-pages.css'

// 還沒有原生新版的工具：把舊版頁面原封不動放進新版外殼。
// 功能、資料、寫入都是舊版那一份；外觀由 bl.css 的 .legacy 規則重畫。
const PAGES = {
  '/daily-reports': lazy(() => import('../DailyReportGenerator')),
  '/menu': lazy(() => import('../PublicMenuPage')),
  '/flight-data': lazy(() => import('../FlightData')),
  '/poursteady': lazy(() => import('../PoursteadyAdjustment')),
  '/feedback': lazy(() => import('../FeedbackCenter')),
  '/playground': lazy(() => import('../Playground')),
  '/admin': lazy(() => import('../AdminPanel')),
}
export const LEGACY_PATHS = Object.keys(PAGES)

export default function LegacyTool() {
  const path = `/${useParams().tool}`
  const Page = PAGES[path]
  const item = [...BASE_NAV_ITEMS, ADMIN_NAV_META].find((it) => it.path === path)
  if (!Page || !item) return <Navigate to="/home" replace />
  return (
    <ToolPage className={`bl-legacy-${path.slice(1)}`} path={path} section={item.section} title={item.label}>
      <InBlShell.Provider value={true}>
        <div className="legacy">
          <ErrorBoundary>
            <Suspense fallback={<p className="bl-desc">讀取中…</p>}>
              <Page />
            </Suspense>
          </ErrorBoundary>
        </div>
      </InBlShell.Provider>
    </ToolPage>
  )
}
