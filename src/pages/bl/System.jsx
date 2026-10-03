import { lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { InBlShell } from '../../components/bl/chrome'
import { ToolPage } from '../../components/bl/shared'
import ErrorBoundary from '../../components/ErrorBoundary'
import { useAdminGate, useAdminLogin, useCanEdit } from '../../components/admin/useAdmin'
import { PAGE_META } from '../Playground'
import '../../styles/bl-tools.css'

// 管理設定、電子菜單、Playground 的新版外框。登入、權限與目錄是新版畫面；
// 裡面的設定表單與實驗內容還是舊版元件（.legacy 套新版色票），功能與寫入都是同一份。
const MarqueeSettings = lazy(() => import('../../components/admin/NowPlayingMarqueeSettings'))
const PublicMenuSettings = lazy(() => import('../../components/admin/PublicMenuSettings'))
const OldPlayground = lazy(() => import('../Playground'))

function Legacy({ children }) {
  return (
    <InBlShell.Provider value={true}>
      <div className="legacy">
        <ErrorBoundary>
          <Suspense fallback={<p className="bl-desc">讀取中…</p>}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </InBlShell.Provider>
  )
}

function Login() {
  const m = useAdminLogin()
  return (
    <form className="card login" onSubmit={m.handleLogin}>
      <h2>管理員登入</h2>
      <p className="sub">用管理員帳號登入才能改設定。</p>
      {m.error ? (
        <p className="err" role="alert">
          {m.error}
        </p>
      ) : null}
      <label>
        <span>信箱</span>
        <input type="email" value={m.email} onChange={(e) => m.setEmail(e.target.value)} placeholder="admin@example.com" disabled={m.isLoading} autoComplete="email" required />
      </label>
      <label>
        <span>密碼</span>
        <span className="pw">
          <input type={m.showPassword ? 'text' : 'password'} value={m.password} onChange={(e) => m.setPassword(e.target.value)} placeholder="請輸入密碼" disabled={m.isLoading} autoComplete="current-password" required />
          <button type="button" onClick={() => m.setShowPassword(!m.showPassword)} disabled={m.isLoading}>
            {m.showPassword ? '隱藏' : '顯示'}
          </button>
        </span>
      </label>
      <button type="submit" className="go" disabled={m.isLoading || !m.email.trim() || !m.password.trim()}>
        {m.isLoading ? '登入中…' : '登入'}
      </button>
      <p className="sub">任何頁面按 Ctrl + Alt + A 也能開啟登入。</p>
    </form>
  )
}

export function Admin() {
  const { isAdmin, isLoading, handleAdminLogout } = useAdminGate()
  return (
    <ToolPage
      className="bl-x bl-admin"
      path="/admin"
      section="系統"
      title="管理設定"
      titleExtra={
        isAdmin ? (
          <button type="button" className="btn side" disabled={isLoading} onClick={handleAdminLogout}>
            {isLoading ? '登出中…' : '登出管理員'}
          </button>
        ) : null
      }
    >
      {isLoading ? (
        <p className="quiet">正在檢查管理員權限…</p>
      ) : !isAdmin ? (
        <Login />
      ) : (
        <>
          <p className="lede">音樂／天氣跑馬燈</p>
          <Legacy>
            <MarqueeSettings />
          </Legacy>
        </>
      )}
    </ToolPage>
  )
}

export function Menu() {
  const { canEdit } = useCanEdit()
  return (
    <ToolPage className="bl-x bl-menu" path="/menu" section="人事與航班" title="電子菜單">
      <p className="lede">{canEdit ? '最多 2 張圖；換圖即時同步客人 QR 站。' : '檢視目前菜單與客人頁。要修改請先登入管理員。'}</p>
      <Legacy>
        <PublicMenuSettings embedded canEdit={canEdit} />
      </Legacy>
    </ToolPage>
  )
}

const PLAY = [
  ['music', '#music', '音樂'],
  ['weather', '#weather', '天氣'],
  ['schedule-manager', '#schedule-manager', '班表管理'],
  ['schedule', '#schedule', '班表匯出'],
  ['alcohol', '#alcohol', '酒精計算'],
  ['studioui', '#studio-ui', 'Studio UI 樣板'],
]

export function Playground() {
  const location = useLocation()
  const navigate = useNavigate()
  // schedule-manager 要排在 schedule 前面比對（前者包含後者）
  const current = PLAY.find(([, hash]) => location.hash.includes(hash)) || (location.hash.includes('#craft-ui') ? PLAY[5] : null)
  if (current) {
    return (
      <ToolPage className="bl-x bl-legacy-playground" path="/playground" section="實驗" title={PAGE_META[current[0]].title}>
        <Legacy>
          <OldPlayground />
        </Legacy>
      </ToolPage>
    )
  }
  return (
    <ToolPage className="bl-x bl-play" path="/playground" section="實驗" title="Playground">
      <p className="lede">實驗一些實驗。</p>
      <ul className="index">
        {PLAY.map(([id, hash, label], i) => (
          <li key={id}>
            <button type="button" onClick={() => navigate(`${location.pathname}${hash}`)}>
              <i>{String(i + 1).padStart(2, '0')}</i>
              <b>{label}</b>
              <span>{PAGE_META[id].description}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </ToolPage>
  )
}
