import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Arrow, BlLink, catHead, clockOf, useBlFonts, useNow } from '../components/bl/shared'
import { getNavSections, itemsForSection } from '../config/navigation.jsx'
import { APP_CHANGELOG } from '../contexts/ChangelogContext'
import { BUSY_LEVELS, busyIndexOn, formatBusyDiff } from '../utils/flightData/busyIndex'
import { loadFlightDataRecord, loadPaxDaily } from '../utils/flightData/loadFlightDay'
import { STORE_CODES, getStoreShortName } from './shifts/shiftConstants'
import { getMonthsForDate, getWorkingAssignments, groupWorkingByStore, toDateKey } from './shifts/shiftModel'
import { getShiftDisplay } from './shifts/shiftVocab'
import { useShiftBook } from './shifts/useShiftBook'
import { setSiteTheme } from '../utils/siteTheme'
import '../styles/home.css'

const WEEKDAYS = '日一二三四五六'
/** 量尺畫 80–135：平常日大多落在 90–112，連假到 130 多；100＝平常的一天 */
const METER_MIN = 80
const METER_MAX = 135
const meterPct = (index) => Math.min(100, Math.max(0, ((index - METER_MIN) / (METER_MAX - METER_MIN)) * 100))
/** 新版裡每個工具的路徑都是 /home 加上原本的路徑（原生新版或沿用舊元件的外殼版，見 pages/bl） */
const newPathOf = (path) => `/home${path}`

function greetingOf(hour) {
  if (hour < 5) return '夜深了'
  if (hour < 11) return '早安'
  if (hour < 14) return '午安'
  if (hour < 18) return '下午好'
  return '晚安'
}

/** 今天的航班與 T2 預報人數。讀不到就留 null，畫面顯示「—」而不是 0。 */
// 讀過的航班與人數留在記憶體：從工具頁回首頁時直接有數字，不用再等一次、也不會再跳一次
const flightCache = { dateKey: '', flights: null, paxDays: null }

function useTodayFlights(dateKey) {
  const cached = flightCache.dateKey === dateKey ? flightCache : null
  const [flights, setFlights] = useState(cached?.flights ?? null)
  const [paxDays, setPaxDays] = useState(cached?.paxDays ?? null)
  useEffect(() => {
    const controller = new AbortController()
    let alive = true
    if (flightCache.dateKey !== dateKey) Object.assign(flightCache, { dateKey, flights: null, paxDays: null })
    loadFlightDataRecord(dateKey, controller.signal)
      .then((result) => {
        if (!alive) return
        flightCache.flights = result?.data?.flights || null
        setFlights(flightCache.flights)
      })
      .catch(() => {})
    loadPaxDaily()
      .then((days) => {
        if (!alive) return
        flightCache.paxDays = days
        setPaxDays(days)
      })
      .catch(() => {})
    return () => {
      alive = false
      controller.abort()
    }
  }, [dateKey])
  return { flights, busy: paxDays ? busyIndexOn(paxDays, dateKey) : null }
}

/**
 * 數字從 0 數到目標值。只在「一開始沒有、後來才讀到」時跑；
 * 一進來就有數字（從快取）就直接顯示，資料更新時也是直接換，不重跑。
 */
function useCountUp(target) {
  const [shown, setShown] = useState(target)
  const hadValue = useRef(target != null)
  useEffect(() => {
    if (target == null) return undefined
    const animate = !hadValue.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    hadValue.current = true
    if (!animate) {
      setShown(target)
      return undefined
    }
    let raf = 0
    const start = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - start) / 1100)
      setShown(Math.round(target * (1 - Math.pow(1 - p, 4))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return target == null ? null : shown ?? 0
}

/** 內容晚一點才有的區塊：高度從 0 展開並淡入，不是整塊突然跳出來把下面的東西推開 */
function Reveal({ show, className = '', children }) {
  return (
    <div className={`reveal ${className}${show ? ' on' : ''}`}>
      <div>{children}</div>
    </div>
  )
}

function Stat({ label, value, unit, format = (v) => v.toLocaleString('en-US') }) {
  const shown = useCountUp(value)
  return (
    <div>
      <span className="label">{label}</span>
      {/* 還沒讀到時留一個同樣大小的「—」佔位，數字進來時原地淡入，版面不會動 */}
      <b className={shown == null ? 'none' : 'in'}>
        {shown == null ? '—' : format(shown)}
        <i>{shown == null ? '' : unit}</i>
      </b>
    </div>
  )
}

function Roster({ book, dateKey, loading }) {
  const { codes, cell, labelOf } = useMemo(() => {
    const stores = groupWorkingByStore(getWorkingAssignments(book, dateKey))
    const months = getMonthsForDate(book, dateKey)
    const names = {}
    const order = []
    stores.forEach((store) => {
      store.shifts.forEach(({ shift, people }) => {
        if (!shift || !STORE_CODES.includes(store.storeCode)) return
        if (!order.includes(shift)) order.push(shift)
        names[`${store.storeCode}|${shift}`] = people.map((p) => p.name)
      })
    })
    // 班別標籤可能是店長自訂的，要從有這個代碼的那份月份文件查
    const displays = order.map((code) => {
      const month = months.find((m) => m.shiftTypes?.[code]) || months[0]
      return getShiftDisplay(month, code)
    })
    const rank = (d) => d?.start || '99:99'
    const sorted = displays.slice().sort((a, b) => rank(a).localeCompare(rank(b)))
    return {
      codes: sorted.map((d) => d.code),
      cell: (store, code) => names[`${store}|${code}`] || [],
      labelOf: Object.fromEntries(sorted.map((d) => [d.code, d.label])),
    }
  }, [book, dateKey])

  if (!codes.length) {
    return (
      <p className="note">
        {loading ? '班表讀取中…' : (
          <>
            今天沒有班表資料。<Link to="/home/shifts">到班表匯入</Link>
          </>
        )}
      </p>
    )
  }
  return (
    <table className="roster">
      <caption>
        <span className="label">今天上班</span>
      </caption>
      <thead>
        <tr>
          <th />
          {STORE_CODES.map((store) => (
            <th key={store} scope="col">
              {getStoreShortName(store)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {codes.map((code) => (
          <tr key={code}>
            <th scope="row">{labelOf[code]}</th>
            {STORE_CODES.map((store) => (
              <td key={store}>
                {/* 頓號跟著前一個名字（放行首會讓整格無法換行）；手機上一人一行，頓號用 CSS 藏掉 */}
                {cell(store, code).map((name, i, list) => (
                  <span key={name}>
                    {name}
                    {i < list.length - 1 ? <i>、</i> : null}
                  </span>
                ))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const TITLE_NAME = 'bl-tool-title'

function ToolLink({ item, cameFrom }) {
  const inner = (
    <>
      <span style={cameFrom === item.path ? { viewTransitionName: TITLE_NAME } : undefined}>{item.label}</span>
      {item.badge ? <i>{item.badge.toLowerCase()}</i> : null}
      <Arrow />
    </>
  )
  const to = newPathOf(item.path)
  // 拍下舊畫面之前，把被點的名稱標成要變形成下一頁標題的那個元素（同名只能有一個）
  const mark = (e) => {
    document.querySelectorAll('.bl-home .item span').forEach((el) => (el.style.viewTransitionName = ''))
    e.currentTarget.querySelector('span').style.viewTransitionName = TITLE_NAME
  }
  return (
    <BlLink className="item" to={to} onBefore={mark}>
      {inner}
    </BlLink>
  )
}

// 橫向大螢幕（iPad 橫放、較矮的筆電）：整頁比視窗高時按比例縮小到一頁放得下，不用上下滑。
// 用 zoom 不用 transform：版面跟著重排、字不會糊。最小縮到 MIN_FIT，再矮就照常捲動（字太小、按鈕太小不如滑一下）。
const MIN_FIT = 0.72
function useFitToViewport(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const fit = () => {
      el.style.zoom = ''
      if (!window.matchMedia('(min-width: 960px)').matches) return
      // visualViewport 是 Safari 扣掉分頁列、網址列後真正看得到的高度；往下取整再留一點餘量，避免四捨五入多出 1px 又能滑
      const visible = window.visualViewport?.height ?? window.innerHeight
      const z = Math.floor((visible / el.scrollHeight) * 1000) / 1000 - 0.004
      if (z < 1) el.style.zoom = Math.max(MIN_FIT, z).toFixed(3)
    }
    fit()
    const ro = new ResizeObserver(fit) // 班表、下一班晚一點才展開，高度變了要重算
    ro.observe(el)
    window.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('resize', fit) }
  }, [ref])
}

export default function Home() {
  useBlFonts()
  const pageRef = useRef(null)
  useFitToViewport(pageRef)
  // 從工具頁回來時帶著是哪一頁，讓那個工具名稱接住轉場
  const cameFrom = useLocation().state?.from
  const now = useNow()
  const dateKey = toDateKey(now)
  const clock = clockOf(now)
  const { flights, busy } = useTodayFlights(dateKey)
  const { book, loading } = useShiftBook()
  const nextFlight = flights?.find((f) => f.time >= clock) || null
  const latest = APP_CHANGELOG[0]
  // 只有一個工具的分類標成 solo：手機上把它們併成一組「其他」，不讓三個小標各佔一行
  const groups = getNavSections().map((section) => ({ section, items: itemsForSection(section) }))
  groups.forEach((group, i) => {
    group.solo = group.items.length === 1
    group.soloFirst = group.solo && !groups.slice(0, i).some((g) => g.solo)
  })

  // 貓歪頭看游標；摸一下點頭
  const peekRef = useRef(null)
  const [nod, setNod] = useState(0)
  useEffect(() => {
    const onMove = (e) => {
      const el = peekRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth
      el.style.setProperty('--rz', `${Math.max(-4, Math.min(4, dx * 7))}deg`)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <div className="bl bl-home">
      <div className="page" ref={pageRef}>
        <header>
          <b className="vt-brand">Brainless</b>
          <Link className="old link" to="/sandwich" onClick={() => setSiteTheme('club')}>
            舊版
          </Link>
          <time>{clock}</time>
        </header>
        <main className="split">
          <div className="art">
            <button
              key={nod}
              ref={peekRef}
              type="button"
              className={`peek${nod ? ' nod' : ''}`}
              aria-label="摸摸店貓"
              onClick={() => setNod((n) => n + 1)}
            >
              <img className="vt-cat" src={catHead} alt="" width="900" height="862" />
            </button>
            <section className="today" aria-labelledby="home-today">
              <h2 className="day" id="home-today">
                <span className="label">今天</span>
                <span>
                  {now.getMonth() + 1} 月 {now.getDate()} 日 星期{WEEKDAYS[now.getDay()]}
                </span>
              </h2>
              <div className="stats">
                <Stat label="D 區班機" value={flights ? flights.length : null} unit="班" />
                <Stat label="T2 預報" value={busy ? busy.total : null} unit="人" />
                <Stat label="比平常" value={busy ? busy.diff : null} unit={busy?.label} format={formatBusyDiff} />
              </div>
              <div
                className="meter"
                style={{ '--v': busy ? meterPct(busy.index) : 0 }}
                role="img"
                aria-label={busy ? `忙碌度：比平常 ${formatBusyDiff(busy.diff)}，等級：${busy.label}` : '忙碌指數：還沒有資料'}
              >
                {BUSY_LEVELS.slice()
                  .reverse()
                  .map((level) => (
                    <i key={level.label} style={{ left: `${meterPct(level.min)}%` }} data-t={level.label} />
                  ))}
                <u className={busy ? 'on' : ''} />
              </div>
              <Reveal show={Boolean(nextFlight)} className="r-next">
                {nextFlight ? (
                  <Link className="next" to="/home/flight-data">
                    <span className="label">下一班</span>
                    <span>
                      <b>{nextFlight.time}</b>　{nextFlight.city}　{nextFlight.flight_code} · {nextFlight.gate}
                    </span>
                  </Link>
                ) : null}
              </Reveal>
              <Reveal show={!loading} className="r-roster">
                {loading ? null : <Roster book={book} dateKey={dateKey} loading={loading} />}
              </Reveal>
            </section>
          </div>
          <div className="body">
            <h1>
              <span>
                <i>{greetingOf(now.getHours())}，</i>
              </span>
              <span>
                <i>今天也辛苦了。</i>
              </span>
            </h1>
            <nav className="menu" aria-label="工具">
              {groups.map(({ section, items, solo, soloFirst }, k) => (
                <section className={`group${solo ? ' solo' : ''}${soloFirst ? ' solo-first' : ''}`} key={section} style={{ '--k': k }}>
                  <h2>
                    <span className="full">{section}</span>
                    <span className="short">其他</span>
                  </h2>
                  <ul>
                    {items.map((item) => (
                      <li key={item.path}>
                        <ToolLink item={item} cameFrom={cameFrom} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </nav>
            <p className="colophon">
              <span>版本</span>
              <b>{latest.version}</b>
              <span>{latest.title}</span>
              <Link className="link" to="/home/feedback">
                回饋與許願
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
