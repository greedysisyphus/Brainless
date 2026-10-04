import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { InBlShell } from '../../components/bl/chrome'
import { Skel, ToolPage, useBlNavigate } from '../../components/bl/shared'
import ErrorBoundary from '../../components/ErrorBoundary'
import { useAdminGate, useAdminLogin, useCanEdit } from '../../components/admin/useAdmin'
import { PAGE_META } from '../Playground'
import { MENU_ACCEPT, MENU_PAGE_LABELS, usePublicMenu } from '../../components/admin/usePublicMenu'
import { MENU_LAYOUT_OPTIONS, PUBLIC_MENU_SITE_URL } from '../../utils/publicMenuDisplay'
import '../../styles/bl-tools.css'

// 管理設定、電子菜單、Playground 的新版外框。登入、權限與目錄是新版畫面；
// 裡面的設定表單與實驗內容還是舊版元件（.legacy 套新版色票），功能與寫入都是同一份。
const MarqueeSettings = lazy(() => import('../../components/admin/NowPlayingMarqueeSettings'))
const BeanWriteLog = lazy(() => import('../../components/admin/BeanWriteLog'))
const PublicMenuLayoutPreview = lazy(() => import('../../components/admin/PublicMenuLayoutPreview'))
const OldPlayground = lazy(() => import('../Playground'))

function Legacy({ children }) {
  return (
    <InBlShell.Provider value={true}>
      <div className="legacy">
        <ErrorBoundary>
          <Suspense fallback={<Skel lines={5} />}>{children}</Suspense>
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
          <Suspense fallback={<Skel lines={3} />}>
            <BeanWriteLog />
          </Suspense>
        </>
      )}
    </ToolPage>
  )
}

export function Menu() {
  const { canEdit } = useCanEdit()
  const m = usePublicMenu()
  const busy = m.busyPage != null
  return (
    <ToolPage className="bl-x bl-menu" path="/menu" section="人事與航班" title="電子菜單">
      <p className="lede">
        {canEdit ? '最多 2 張圖；換圖或改版面後，客人掃 QR 看到的頁面會自動更新。' : '目前上架中的菜單。要修改請先'}
        {canEdit ? null : <a href="#/home/admin">登入管理員</a>}
        {canEdit ? null : '。'}
      </p>
      <input ref={m.fileInputRef} type="file" accept={MENU_ACCEPT} hidden onChange={m.handleFileChange} />
      {m.error ? (
        <p className="msg bad" role="alert">
          {m.error}
        </p>
      ) : null}
      {m.successMessage ? (
        <p className="msg" role="status">
          {m.successMessage}
        </p>
      ) : null}

      {m.isLoading ? (
        <Skel lines={6} label="載入菜單設定" />
      ) : (
        <>
          <div className="split even">
            {MENU_PAGE_LABELS.map((label, index) => {
              const image = m.slots[index]
              const uploading = m.busyPage === index
              return (
                <section className="card slot" key={label}>
                  <div className="hd">
                    <h2>{label}</h2>
                    {image?.storagePath ? <small>{image.storagePath}</small> : null}
                  </div>
                  {image ? <img src={image.url} alt={label} /> : <p className="none">尚未上傳</p>}
                  {canEdit ? (
                    <div className="acts">
                      <button type="button" className="btn pri" disabled={busy} onClick={() => m.handlePickFile(index)}>
                        {uploading ? `上傳中…${m.uploadProgress != null ? ` ${m.uploadProgress}%` : ''}` : image ? '更換圖片' : '上傳圖片'}
                      </button>
                      {index === 1 && image ? (
                        <button type="button" className="btn" disabled={busy} onClick={() => m.handleRemovePage(index)}>
                          移除
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>

          <section className="card layout">
            <div className="hd">
              <h2>版面</h2>
              <small>{canEdit ? '客人掃 QR 後看到的排法' : '目前客人頁使用的排法'}{m.layoutSaving ? '・儲存中…' : ''}</small>
            </div>
            <div className="pills" role="group" aria-label="版面">
              {MENU_LAYOUT_OPTIONS.map((o) => (
                <button key={o.id} type="button" aria-pressed={m.layout === o.id} disabled={!canEdit || m.layoutSaving || busy} onClick={() => m.handleLayoutChange(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="hint">{MENU_LAYOUT_OPTIONS.find((o) => o.id === m.layout)?.hint}</p>
            <Legacy>
              <PublicMenuLayoutPreview layout={m.layout} slots={m.slots} embedded />
            </Legacy>
          </section>

          <section className="card guest">
            <div className="hd">
              <h2>客人頁</h2>
              <small>跟掃 QR 看到的一樣</small>
              <a className="btn" href={PUBLIC_MENU_SITE_URL} target="_blank" rel="noopener noreferrer">
                在新分頁開啟
              </a>
            </div>
            <iframe src={PUBLIC_MENU_SITE_URL} title="客人電子菜單預覽" loading="lazy" />
            {m.updatedAt ? <p className="hint">上次更新：{m.updatedAt.toLocaleString('zh-TW')}</p> : null}
          </section>
        </>
      )}
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
  const navigate = useBlNavigate()
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
