import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Arrow, BlLink, catHead, clockOf, useBlFonts, useNow } from '../components/bl/shared'
import { getNavSections, itemsForSection } from '../config/navigation.jsx'
import { APP_CHANGELOG } from '../contexts/ChangelogContext'
import { BUSY_LEVELS, busyIndexOn } from '../utils/flightData/busyIndex'
import { loadFlightDataRecord, loadPaxDaily } from '../utils/flightData/loadFlightDay'
import { STORE_CODES, getStoreShortName } from './shifts/shiftConstants'
import { getMonthsForDate, getWorkingAssignments, groupWorkingByStore, toDateKey } from './shifts/shiftModel'
import { getShiftDisplay } from './shifts/shiftVocab'
import { useShiftBook } from './shifts/useShiftBook'
import '../styles/home.css'

const WEEKDAYS = '日一二三四五六'
/** 量尺畫到 110，讓「爆」（100 以上）還有位置 */
const METER_MAX = 110
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
function useTodayFlights(dateKey) {
  const [flights, setFlights] = useState(null)
  const [paxDays, setPaxDays] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    let alive = true
    loadFlightDataRecord(dateKey, controller.signal)
      .then((result) => alive && setFlights(result?.data?.flights || null))
      .catch(() => {})
    loadPaxDaily()
      .then((days) => alive && setPaxDays(days))
      .catch(() => {})
    return () => {
      alive = false
      controller.abort()
    }
  }, [dateKey])
  return { flights, busy: paxDays ? busyIndexOn(paxDays, dateKey) : null }
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <span className="label">{label}</span>
      {value == null ? (
        <b className="none">—</b>
      ) : (
        <b>
          {value}
          <i>{unit}</i>
        </b>
      )}
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

export default function Home() {
  useBlFonts()
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
      <div className="page">
        <header>
          <b className="vt-brand">Brainless</b>
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
                <Stat label="T2 預報" value={busy ? busy.total.toLocaleString() : null} unit="人" />
                <Stat label="忙碌度" value={busy ? busy.index : null} unit={busy?.label} />
              </div>
              <div
                className="meter"
                style={{ '--v': busy ? Math.min(busy.index, METER_MAX) : 0 }}
                role="img"
                aria-label={busy ? `忙碌指數 ${busy.index}，等級：${busy.label}` : '忙碌指數：還沒有資料'}
              >
                {BUSY_LEVELS.slice()
                  .reverse()
                  .map((level) => (
                    <i key={level.label} style={{ left: `${(level.min / METER_MAX) * 100}%` }} data-t={level.label} />
                  ))}
                {busy ? <u /> : null}
              </div>
              {nextFlight ? (
                <Link className="next" to="/home/flight-data">
                  <span className="label">下一班</span>
                  <span>
                    <b>{nextFlight.time}</b>　{nextFlight.city}　{nextFlight.flight_code} · {nextFlight.gate}
                  </span>
                </Link>
              ) : null}
              <Roster book={book} dateKey={dateKey} loading={loading} />
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
