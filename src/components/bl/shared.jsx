import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useHref, useNavigate } from 'react-router-dom'
import catHead from '../../assets/cat-head.webp'
import '../../styles/bl.css'

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Noto+Sans+TC:wght@400;500&family=Noto+Serif+TC:wght@400;600&display=swap'

const pad2 = (n) => String(n).padStart(2, '0')
export const clockOf = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`

/** 新版頁面的字體只在進到這些頁面時才載，不拖到 Club 的頁面 */
export function useBlFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_HREF}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
  }, [])
}

export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000)
    return () => clearInterval(id)
  }, [])
  return now
}

export const Arrow = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/**
 * 新版頁面之間的連結：換頁時跑 view transition（貓縮進頁首、標題放大）。
 * 瀏覽器不支援或使用者關掉動態時就是普通換頁。onBefore 在拍下舊畫面之前呼叫，用來標記要變形的元素。
 */
export function BlLink({ to, state, onBefore, children, ...props }) {
  const navigate = useNavigate()
  const href = useHref(to)
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onBefore?.(e)
    const go = () => flushSync(() => navigate(to, { state }))
    const canAnimate = document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (canAnimate) document.startViewTransition(go)
    else go()
  }
  return (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  )
}

/** 內頁外殼：貓是回首頁的按鈕，右邊是「所有工具」與時鐘 */
export function ToolPage({ path, section, title, className = '', children }) {
  useBlFonts()
  const now = useNow()
  const home = { to: '/home', state: { from: path } }
  return (
    <div className={`bl bl-tool ${className}`}>
      <div className="page">
        <header>
          <BlLink className="home" aria-label="回 Brainless 首頁" {...home}>
            <img className="vt-cat" src={catHead} alt="" width="900" height="862" />
            <b className="vt-brand">Brainless</b>
          </BlLink>
          <span className="crumb">{section}</span>
          <BlLink className="all" aria-label="所有工具" {...home}>
            <Arrow />
            <span>所有工具</span>
          </BlLink>
          <time>{clockOf(now)}</time>
        </header>
        <main>
          <h1>
            <span>{title}</span>
          </h1>
          {children}
        </main>
      </div>
    </div>
  )
}

export { catHead }
