import { Fragment, useEffect, useRef, useState } from 'react'
import { ToolPage } from '../../components/bl/shared'
import { APP_CHANGELOG, useChangelog } from '../../contexts/ChangelogContext'
import '../../styles/bl-tools.css'

const WEEK = '日一二三四五六'
/** 這一版是新版上線；它下面畫一條紀元線，再往下是 Club 時期 */
const NEW_ERA_VERSION = '2.0.0'
const NEW_ERA_DATE = '2026/10/4'

// 日期大多是 2026-09-27，最早一筆是「2026-01～02 初」這種寫法：有年月就進月份刻度，日期照原文顯示
function parseDate(date) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(date) || /^(\d{4})-(\d{2})/.exec(date)
  if (!m) return { month: date, label: date, head: '', when: date }
  const exact = m[3] && m[0] === date
  return {
    month: `${m[1]}-${m[2]}`,
    head: Number(m[2]),
    label: `${m[1]} 年 ${Number(m[2])} 月`,
    when: exact ? `${Number(m[2])}/${Number(m[3])}（${WEEK[new Date(`${date}T00:00:00`).getDay()]}）` : date,
  }
}

// 新版更新紀錄（/home/changelog）。一條時間軸：月份是大刻度、每版一個點，最新一版預設展開。
// 內容就是 ChangelogContext 的 APP_CHANGELOG，發版只要改那裡。
export default function Changelog() {
  const { markChangelogSeen } = useChangelog()
  const [open, setOpen] = useState(() => new Set([APP_CHANGELOG[0]?.version]))
  // 進來就算看過，首頁版號旁的「新」會消失
  useEffect(() => markChangelogSeen(), [markChangelogSeen])

  // 捲到哪、軸上的點和那一版就亮到哪。不支援或關掉動態時一開始就全亮
  // 記在 data-in 不記在 class：展開收合時 React 會整串重寫 className，記在 class 會被洗掉、整版又變透明
  const tlRef = useRef(null)
  useEffect(() => {
    const root = tlRef.current
    const items = [...(root?.querySelectorAll('.ver, .month, .era') || [])]
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach((el) => el.setAttribute('data-in', ''))
      return undefined
    }
    root.classList.add('reveal')
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.setAttribute('data-in', '')
          io.unobserve(entry.target)
        }),
      { rootMargin: '0px 0px -8% 0px' }
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const toggle = (version) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(version)) next.delete(version)
      else next.add(version)
      return next
    })

  let lastMonth = ''
  return (
    <ToolPage
      className="bl-x bl-log"
      path="/changelog"
      section="系統"
      title="更新紀錄"
      titleExtra={
        <p className="count">
          目前 <b>{APP_CHANGELOG[0]?.version}</b>　共 <b>{APP_CHANGELOG.length}</b> 版
        </p>
      }
    >
      <div className="tl" ref={tlRef}>
        {APP_CHANGELOG.map((v) => {
          const d = parseDate(v.date)
          const newMonth = d.month !== lastMonth
          lastMonth = d.month
          const isOpen = open.has(v.version)
          return (
            <Fragment key={v.version}>
              {newMonth ? (
                <p className="month">
                  <b>{d.head}</b>
                  <span>{d.label}</span>
                </p>
              ) : null}
              <article className={`ver${/\.0$/.test(v.version) ? ' big' : ''}${isOpen ? ' open' : ''}`}>
                <p className="when">
                  <b>{v.version}</b>
                  <small>{d.when}</small>
                </p>
                <button type="button" aria-expanded={isOpen} onClick={() => toggle(v.version)}>
                  <h2>{v.title}</h2>
                  <span className="n">
                    {v.items.length} 項
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
                <div className="body" inert={isOpen ? undefined : ''}>
                  <div>
                    <ul>
                      {v.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
              {v.version === NEW_ERA_VERSION ? (
                <p className="era">
                  <b>新版上線</b>
                  <span>{NEW_ERA_DATE}　以下是舊版時期的更新</span>
                </p>
              ) : null}
            </Fragment>
          )
        })}
      </div>
    </ToolPage>
  )
}
