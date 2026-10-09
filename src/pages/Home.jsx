import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Arrow, BlLink, catHead, clockOf, useBlFonts, useNow } from '../components/bl/shared'
import Cat3D from '../components/bl/cat3d/Cat3D'
import MeterCat from '../components/bl/MeterCat'
import { useHomeSettings } from '../components/bl/homeSettings'
import { buildPanel } from '../components/bl/cat3d/panel.js'
import { getNavSections, itemsForSection } from '../config/navigation.jsx'
import { APP_CHANGELOG, useChangelog } from '../contexts/ChangelogContext'
import { BUSY_LEVELS, busyIndexOn, formatBusyDiff } from '../utils/flightData/busyIndex'
import { loadFlightDataRecord, loadPaxDaily } from '../utils/flightData/loadFlightDay'
import { STORE_CODES, getStoreShortName } from './shifts/shiftConstants'
import { getMonthsForDate, getWorkingAssignments, groupWorkingByStore, toDateKey } from './shifts/shiftModel'
import { getShiftDisplay } from './shifts/shiftVocab'
import { useShiftBook } from './shifts/useShiftBook'
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
            今天沒有班表資料。<BlLink to="/home/shifts">到班表匯入</BlLink>
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

// 立體貓的設定存在 localStorage 的哪裡；讀不到或壞掉就用預設
const CAT3D_KEY = 'bl-cat3d'
const CAT3D_PARAMS_KEY = 'bl-cat3d-params'
// 首頁的調整面板只放看得出差別的幾項，完整的在 /home/cat-lab
const CAT3D_PANEL = ['calm', 'density', 'crisp', 'shade', 'glint', 'gaze', 'follow']
// 立體版的鏡頭看到的範圍是原圖的 1.131 倍寬
const CAT3D_FRAME = 1.131
function readStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

// stageCat：不管設定，量尺一律用貓和樹（/home/cat-home 試看用）。平常照「管理設定」裡選的
export default function Home({ stageCat = false }) {
  const catMeter = useHomeSettings().meter === 'cat' || stageCat
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
  const { hasUnseenUpdate } = useChangelog()
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

  // 大頭和量尺上的小貓是同一隻：小貓被樹彈飛的時候，大頭往牠那邊歪一下看過去；大頭被摸，小貓跟著跳一下
  useEffect(() => {
    const peek = peekRef.current
    if (!catMeter || !peek) return undefined
    const glance = () => peek.querySelector(peek.classList.contains('live') ? '.cat3d' : '.pet')?.animate([{ rotate: '0deg', translate: '0 0' }, { rotate: '-6deg', translate: '0 5px', offset: 0.35 }, { rotate: '-6deg', translate: '0 5px', offset: 0.7 }, { rotate: '0deg', translate: '0 0' }], { duration: 1100, easing: 'ease-in-out' })
    const pet = (e) => { if (!e.target.closest('.cat-tools')) window.dispatchEvent(new CustomEvent('bl-big-cat')) }
    window.addEventListener('bl-meter-cat', glance)
    peek.addEventListener('pointerdown', pet)
    return () => { window.removeEventListener('bl-meter-cat', glance); peek.removeEventListener('pointerdown', pet) }
  }, [catMeter])

  // 立體貓：預設開著，按貓旁邊的切換可以換回原本的圖。立體版載入中、失敗或裝置不支援時顯示的也是原圖。
  // 選擇和調過的參數都記在這台裝置上
  const [cat3d, setCat3d] = useState(() => readStored(CAT3D_KEY, true))
  const [cat, setCat] = useState(null) // 立體版準備好之後的控制物件
  const [catFailed, setCatFailed] = useState(false)
  const savedParams = useMemo(() => readStored(CAT3D_PARAMS_KEY, {}), [])
  const panelRef = useRef(null)
  const dialogRef = useRef(null)
  const toggleCat3d = () => {
    const next = !cat3d
    dialogRef.current?.close()
    setCat(null)
    setCatFailed(false)
    setCat3d(next)
    try { localStorage.setItem(CAT3D_KEY, JSON.stringify(next)) } catch { /* 存不了就只是下次要再切一次 */ }
  }
  // 立體版的畫布要疊在原圖正上方，而且比原圖大一圈（轉頭時毛會超出原圖的範圍）。原圖的大小隨版面變，所以量它
  useEffect(() => {
    const peek = peekRef.current
    const img = peek?.querySelector('img')
    if (!cat3d || !img) return
    const place = () => {
      peek.style.setProperty('--cat-x', `${img.offsetLeft + img.offsetWidth / 2}px`)
      peek.style.setProperty('--cat-y', `${img.offsetTop + img.offsetHeight / 2}px`)
      peek.style.setProperty('--cat-w', `${img.offsetWidth * CAT3D_FRAME}px`)
    }
    place()
    const watch = new ResizeObserver(place)
    watch.observe(img)
    watch.observe(peek)
    return () => watch.disconnect()
  }, [cat3d])
  // 立體版準備好就把調整面板長出來
  useEffect(() => {
    const el = panelRef.current
    if (!cat || !el) return
    buildPanel(cat, el, { keys: CAT3D_PANEL, storageKey: CAT3D_PARAMS_KEY })
    return () => el.replaceChildren()
  }, [cat])

  return (
    <div className="bl bl-home">
      <div className="page" ref={pageRef}>
        <header>
          <b className="vt-brand">Brainless</b>
          <time>{clock}</time>
        </header>
        <main className="split">
          <div className="art">
            <div ref={peekRef} className={`peek${nod ? ' nod' : ''}${cat ? ' live' : ''}`}>
              {/* 原本的圖永遠在：立體版載入中、失敗或關掉時就是它 */}
              <button type="button" className="pet" aria-label="摸摸店貓" tabIndex={cat ? -1 : 0} onClick={() => setNod((n) => n + 1)}>
                <img key={nod} className="vt-cat" src={catHead} alt="" width="900" height="862" />
              </button>
              {cat3d && !catFailed && (
                <Cat3D className="cat3d" src={catHead} saved={savedParams} label="店貓，可以摸、可以拖著轉" onReady={setCat} onLost={() => setCat(null)} onFail={() => setCatFailed(true)} />
              )}
              <div className="cat-tools">
                {cat && (
                  <button type="button" aria-haspopup="dialog" onClick={() => (dialogRef.current.open ? dialogRef.current.close() : dialogRef.current.show())}>
                    調整
                  </button>
                )}
                <button type="button" aria-pressed={cat3d} onClick={toggleCat3d} title={catFailed ? '這台裝置跑不動立體版' : undefined}>
                  {catFailed ? '立體版無法使用' : cat3d && !cat ? '載入中…' : '立體'}
                </button>
              </div>
            </div>
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
                className={`meter${catMeter ? ' zoned' : ''}`}
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
                {/* 量尺選了貓的版本：圓點換成一棵公司的小樹，旁邊有一隻小貓 */}
                {catMeter && <MeterCat value={busy ? meterPct(busy.index) : null} level={busy?.label} />}
              </div>
              <Reveal show={Boolean(nextFlight)} className="r-next">
                {nextFlight ? (
                  <BlLink className="next" to="/home/flight-data">
                    <span className="label">下一班</span>
                    <span>
                      <b>{nextFlight.time}</b>　{nextFlight.city}　{nextFlight.flight_code} · {nextFlight.gate}
                    </span>
                  </BlLink>
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
              <BlLink className="ver" to="/home/changelog" aria-label={`更新紀錄，目前 ${latest.version} ${latest.title}${hasUnseenUpdate ? '，有新的更新' : ''}`}>
                <span>版本</span>
                <b>{latest.version}</b>
                <span>{latest.title}</span>
                {hasUnseenUpdate ? <em>新</em> : null}
                <i aria-hidden="true">→</i>
              </BlLink>
              <BlLink className="link" to="/home/feedback">
                回饋與許願
              </BlLink>
            </p>
          </div>
        </main>
      </div>
      {/* 調整面板放在最外層：貓的外框有浮動的動畫，固定定位的東西放在裡面會跟著它跑 */}
      <dialog ref={dialogRef} className="cat-panel" aria-label="立體貓調整">
        <div ref={panelRef} />
        <button type="button" className="close" onClick={() => dialogRef.current.close()}>
          關閉
        </button>
      </dialog>
    </div>
  )
}
