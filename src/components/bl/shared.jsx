import { useEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { useHref, useNavigate } from 'react-router-dom'
import catHead from '../../assets/cat-head.webp'
import '../../styles/bl.css'
import '../../styles/bl-shapes.css'

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
/** 用程式換頁時也跑同一個轉場（BlLink 是給連結用的） */
export function useBlNavigate() {
  const navigate = useNavigate()
  return (to, options) => {
    const go = () => flushSync(() => navigate(to, options))
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(go)
    else go()
  }
}

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
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const TAB_GROUPS = ":is(.tabs, .stores, .seg)[role='group']"
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
/** 看起來是數字的短字串（含 ＋−、%、單位）：這種文字變了才做跳動 */
const NUMERIC = /^[\s＋+−\-–±~]?[\d][\d.,:／/\s]*[%％]?\s*(包|格|班|項|種|天|人|人次|ml|克|版|則)?$/

/**
 * 工具頁共用的動態，掛在最外層一次處理全站，各頁不用自己寫：
 * 1. 頁籤底線：選到哪個就滑到哪個（.tabs／.stores／.seg）。
 * 2. 換頁籤時，下面的內容淡入。
 * 3. 數字變了輕輕跳一下，知道剛剛那一下有算進去。
 * 用 MutationObserver 看 aria-pressed 和文字變化，動畫走 Web Animations，不動各頁的 CSS。
 */
function useToolMotion(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof MutationObserver === 'undefined') return undefined
    const bornAt = performance.now()

    const placeInk = (group) => {
      const on = group.querySelector(":scope > [aria-pressed='true']")
      if (!on) {
        group.removeAttribute('data-ink')
        return
      }
      // 只有「選中＝底線」的頁籤才接手；膠囊式的不管
      if (!group.hasAttribute('data-ink') && !getComputedStyle(on).boxShadow.includes('inset')) return
      // 先標記（標記後才是定位基準），再量位置
      group.setAttribute('data-ink', '')
      group.style.setProperty('--ink-x', `${on.offsetLeft}px`)
      group.style.setProperty('--ink-y', `${on.offsetTop + on.offsetHeight - 3}px`)
      group.style.setProperty('--ink-w', `${on.offsetWidth}px`)
    }
    const placeAll = () => root.querySelectorAll(TAB_GROUPS).forEach(placeInk)

    const swap = (group) => {
      if (reducedMotion()) return
      let el = group.nextElementSibling || group.parentElement?.nextElementSibling
      for (let i = 0; el && i < 12; el = el.nextElementSibling, i += 1) {
        const pos = getComputedStyle(el).position
        // 固定或黏住的元素（底部鍵盤、進度列）只淡入不位移，免得跳位
        const frames = pos === 'fixed' || pos === 'sticky' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, translate: '0 26px' }, { opacity: 1, translate: '0 0' }]
        // 一塊接一塊進來，看得出是換了一頁內容
        el.animate(frames, { duration: 620, delay: Math.min(i, 5) * 60, easing: EASE, fill: 'backwards' })
      }
    }
    // 純數字（總包數、班數…）從舊的數到新的；帶符號或單位的就整個跳一下
    const rolling = new WeakMap()
    const roll = (el, from, to) => {
      const node = el.firstChild
      const digits = (String(to).split('.')[1] || '').length
      const a = Number(from)
      const b = Number(to)
      const start = performance.now()
      let last = node.nodeValue
      const state = { stop: false }
      rolling.set(el, state)
      const step = (now) => {
        // 中途 React 又寫了新的值：停手，以它為準
        if (state.stop || el.firstChild !== node || node.nodeValue !== last) {
          rolling.delete(el)
          return
        }
        const p = Math.min(1, (now - start) / 520)
        last = p === 1 ? String(to) : (a + (b - a) * (1 - Math.pow(1 - p, 3))).toFixed(digits)
        node.nodeValue = last
        if (p < 1) requestAnimationFrame(step)
        else rolling.delete(el)
      }
      node.nodeValue = last = a.toFixed(digits)
      requestAnimationFrame(step)
    }
    const PLAIN = /^\d+(\.\d+)?$/
    const tick = (el, oldText) => {
      if (reducedMotion() || performance.now() - bornAt < 900) return
      if (!el || el.children.length || el.closest('button, time, input, textarea, select, .dock, [data-no-tick]')) return
      const text = el.textContent || ''
      if (!NUMERIC.test(text)) return
      const before = (oldText || '').trim()
      if (PLAIN.test(text) && PLAIN.test(before) && before !== text && el.childNodes.length === 1 && el.firstChild.nodeType === 3 && !document.hidden) {
        roll(el, before, text)
        return
      }
      el.animate([{ opacity: 0, translate: '0 0.6em' }, { opacity: 1, translate: '0 0' }], { duration: 460, easing: EASE })
    }

    // MutationObserver 本來就是一批一批回呼（同一輪更新只叫一次），直接處理，不必再排到下一個畫格
    const observer = new MutationObserver((records) => {
      const pendingGroups = new Set()
      const pendingTicks = new Map()
      for (const rec of records) {
        if (rec.type === 'attributes') {
          const group = rec.target.parentElement
          if (rec.target.getAttribute('aria-pressed') === 'true' && group?.matches(TAB_GROUPS)) pendingGroups.add(group)
        } else if (rec.type === 'characterData') {
          const el = rec.target.parentElement
          // 自己滾數字時寫的值不算
          if (el && !rolling.has(el) && !pendingTicks.has(el)) pendingTicks.set(el, rec.oldValue)
        } else if (rec.target.nodeType === 1 && rec.target.children.length === 0) {
          if (!rolling.has(rec.target) && !pendingTicks.has(rec.target)) pendingTicks.set(rec.target, rec.removedNodes[0]?.nodeValue)
        }
      }
      placeAll()
      pendingGroups.forEach(swap)
      pendingTicks.forEach((oldText, el) => tick(el, oldText))
    })
    observer.observe(root, { subtree: true, childList: true, characterData: true, characterDataOldValue: true, attributes: true, attributeFilter: ['aria-pressed', 'data-scrolled'] })
    placeAll()
    // 字體載入、視窗大小改變都會讓頁籤位置跑掉
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(placeAll)
    resize?.observe(root)
    document.fonts?.ready?.then(placeAll)
    return () => {
      observer.disconnect()
      resize?.disconnect()
    }
  }, [rootRef])
}

/** 讀取中的佔位：幾條跟文字差不多高的淡色條，取代一行「讀取中…」 */
export function Skel({ lines = 4, label = '讀取中' }) {
  return (
    <div className="bl-skel" role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => (
        <i key={i} style={{ '--w': `${[92, 78, 86, 64, 88, 72][i % 6]}%`, '--i': i }} />
      ))}
    </div>
  )
}

/** 同步完成時閃一下「已存」。只在「同步中 → 已同步」的那一刻出現，過一會自己消失 */
export function SavedTick({ status }) {
  const prev = useRef(status)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const was = prev.current
    prev.current = status
    if (status !== 'synced' || was !== 'syncing') return undefined
    setShown((n) => n + 1)
    const timer = setTimeout(() => setShown(0), 1800)
    return () => clearTimeout(timer)
  }, [status])
  if (!shown) return null
  return (
    <span className="bl-saved" key={shown} role="status">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      已存
    </span>
  )
}

/**
 * 捲下去之後怎麼回首頁：
 * - 這一頁有黏在頂端的分店／分頁列 → 回傳那一列，讓外殼把小貓頭放進去（不多佔一列）。
 * - 沒有 → 外殼自己出一條細列。
 * scrolled＝完整的頁首已經捲出畫面。
 */
function useStuckNav(rootRef, headerRef) {
  const [scrolled, setScrolled] = useState(false)
  const [stick, setStick] = useState(null)
  useEffect(() => {
    const header = headerRef.current
    if (!header) return undefined
    const check = () => setScrolled(header.getBoundingClientRect().bottom <= 0)
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [headerRef])
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof MutationObserver === 'undefined') return undefined
    const find = () =>
      setStick((current) => {
        if (current?.isConnected) return current
        return [...root.querySelectorAll(TAB_GROUPS)].find((g) => getComputedStyle(g).position === 'sticky') || null
      })
    find()
    const observer = new MutationObserver(find)
    observer.observe(root, { subtree: true, childList: true })
    return () => observer.disconnect()
  }, [rootRef])
  return { scrolled, stick }
}

export function ToolPage({ path, section, title, titleExtra = null, className = '', children }) {
  useBlFonts()
  const rootRef = useRef(null)
  const headerRef = useRef(null)
  useToolMotion(rootRef)
  const { scrolled, stick } = useStuckNav(rootRef, headerRef)
  const now = useNow()
  const home = { to: '/home', state: { from: path } }
  return (
    <div className={`bl bl-tool ${className}`} ref={rootRef} data-scrolled={scrolled ? '' : undefined}>
      {stick
        ? createPortal(
            <BlLink className="bl-gohome" aria-label="回 Brainless 首頁" {...home}>
              <img src={catHead} alt="" width="900" height="862" />
            </BlLink>,
            stick
          )
        : null}
      <div className={`bl-mini${!stick && scrolled ? ' on' : ''}`} inert={!stick && scrolled ? undefined : ''}>
        <div>
          <BlLink className="bl-gohome" aria-label="回 Brainless 首頁" {...home}>
            <img src={catHead} alt="" width="900" height="862" />
          </BlLink>
          <b>{title}</b>
        </div>
      </div>
      <div className="page">
        <header ref={headerRef}>
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
          <div className="top">
            <h1>
              <span>{title}</span>
            </h1>
            {titleExtra}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

/** 頁內跳轉。網址的 # 是路由在用的，連結照預設行為走會被當成換頁，所以攔下來自己捲。 */
export const jumpTo = (id) => (event) => {
  event.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}

export { catHead }
