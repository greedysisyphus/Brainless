import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ToolPage } from '../../components/bl/shared'
import {
  CAR_LABELS,
  STORES,
  STORE_CODES,
  UNSET_PICKUP,
  WEEKDAY_LABELS,
  carDepartureTime,
  getStoreShortName,
  stopTime,
} from '../shifts/shiftConstants'
import {
  addDays,
  effectiveShift,
  getCarLists,
  getCrossStoreMoves,
  getDayAssignments,
  getMonthsForDate,
  getWorkingAssignments,
  groupWorkingByStore,
  parseDateKey,
  pickupMapFrom,
  toDateKey,
} from '../shifts/shiftModel'
import { describeEntry, getLeaveDisplay, getShiftDisplay } from '../shifts/shiftVocab'
import { useShiftBook } from '../shifts/useShiftBook'
import '../../styles/bl-shifts.css'

// 這一版只做最常用的兩個分頁，資料與判讀規則完全沿用舊版的 shiftModel；其餘分頁先連回舊版。
const TABS = [
  ['today', '今天'],
  ['grid', '完整班表'],
]
const OLD_TABS = ['找日子', '統計', '支援班', '同事與上車', '匯入']
const KNOWN_TINTS = ['MORNING', 'MID', 'NOON', 'EVENING', 'SUPPORT']
const tintOf = (code) => `var(--${KNOWN_TINTS.includes(code) ? code : 'OTHER'})`

const Chevron = ({ d }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

function flagsOf(person) {
  return [
    person.isSupport ? `支援自${getStoreShortName(person.homeStore)}` : null,
    person.shiftUnknown ? '紙本沒寫班別' : null,
    person.shiftInferred ? '班別推測' : null,
    person.needsReview ? '待確認' : null,
  ].filter(Boolean)
}

function TodayPanel({ book, dateKey, setDateKey, pickupByPerson }) {
  const todayKey = toDateKey(new Date())
  const date = parseDateKey(dateKey)
  const months = getMonthsForDate(book, dateKey)
  const monthOf = (storeCode) => months.find((m) => m.storeCode === storeCode) || months[0]

  const view = useMemo(() => {
    const working = getWorkingAssignments(book, dateKey)
    const stores = groupWorkingByStore(working)
    const leave = getDayAssignments(book, dateKey).filter((a) => a.kind === 'LEAVE')
    // 所有店出現過的班別合成一組橫列，依上班時間排；判不出班別的放最後
    const codes = []
    stores.forEach((store) => store.shifts.forEach(({ shift }) => shift && !codes.includes(shift) && codes.push(shift)))
    const startOf = (code) => months.map((m) => getShiftDisplay(m, code)?.start).find(Boolean) || '99:99'
    codes.sort((a, b) => startOf(a).localeCompare(startOf(b)))
    if (stores.some((store) => store.shifts.some(({ shift }) => !shift))) codes.push(null)
    // 沒人上班的店也要佔一欄，三家店的位置才固定
    const columns = STORE_CODES.map(
      (code) => stores.find((s) => s.storeCode === code) || { storeCode: code, storeName: getStoreShortName(code), total: 0, shifts: [] }
    )
    const unknownStore = stores.find((s) => s.storeCode === null)
    if (unknownStore) columns.push(unknownStore)
    return { working, codes, columns, leave }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- months 由 book 與 dateKey 決定
  }, [book, dateKey])

  const cars = useMemo(() => getCarLists(book, dateKey, pickupByPerson), [book, dateKey, pickupByPerson])
  const moves = useMemo(() => getCrossStoreMoves(book, dateKey), [book, dateKey])
  const holiday = months.map((m) => m.holidays?.[dateKey]).find(Boolean)

  // 左右方向鍵換日
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return
      if (e.key === 'ArrowLeft') setDateKey((d) => addDays(d, -1))
      else if (e.key === 'ArrowRight') setDateKey((d) => addDays(d, 1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setDateKey])

  return (
    <div className="panel">
      <div className="datebar">
        <div className="nav">
          <button type="button" className="round" aria-label="前一天" onClick={() => setDateKey(addDays(dateKey, -1))}>
            <Chevron d="M15 6l-6 6 6 6" />
          </button>
          <h2>
            <b>{date.getMonth() + 1}</b> 月 <b>{date.getDate()}</b> 日　星期{WEEKDAY_LABELS[date.getDay()]}
          </h2>
          <button type="button" className="round" aria-label="後一天" onClick={() => setDateKey(addDays(dateKey, 1))}>
            <Chevron d="M9 6l6 6-6 6" />
          </button>
        </div>
        {holiday ? <span className="holiday">{holiday}</span> : null}
        {dateKey !== todayKey ? (
          <button type="button" className="text" onClick={() => setDateKey(todayKey)}>
            回到今天
          </button>
        ) : null}
        {months.length ? (
          <span className="count">
            三家店合計 <b>{view.working.length}</b> 人次
          </span>
        ) : null}
      </div>

      {!months.length ? (
        <div className="empty">
          <p>這個月份還沒有匯入任何一家店的班表。</p>
          <Link className="text" to="/shifts">
            到舊版班表的「匯入」分頁上傳
          </Link>
        </div>
      ) : (
        <div className="today">
          <section aria-label="誰上班">
            <div className="stores" style={{ '--cols': view.columns.length, '--rows': view.codes.length + 2 }}>
              {view.columns.map((store) => {
                const off = view.leave.filter((a) => a.homeStore === store.storeCode)
                return (
                  <div className="block" key={store.storeCode ?? 'unknown'}>
                    <h3>
                      {store.storeCode ? getStoreShortName(store.storeCode) : store.storeName}
                      <small>
                        <b>{store.total}</b> 人
                      </small>
                    </h3>
                    {view.codes.map((code) => {
                      const display = code ? getShiftDisplay(monthOf(store.storeCode), code) : null
                      const people = store.shifts.find((s) => s.shift === code)?.people || []
                      return (
                        <div className="shift" key={code ?? 'none'}>
                          <span className="chip" style={{ background: tintOf(code) }}>
                            {display?.label || '班別未定'}
                          </span>
                          <time>{display?.start && display?.end ? `${display.start}–${display.end}` : ''}</time>
                          {people.length ? (
                            <ul>
                              {people.map((person) => {
                                const flags = flagsOf(person)
                                return (
                                  <li key={person.personKey}>
                                    {person.name}
                                    <span>
                                      {flags.length ? <em title={flags.join(' · ')}>{flags[0]}　</em> : null}
                                      {person.positionLabel}
                                    </span>
                                  </li>
                                )
                              })}
                            </ul>
                          ) : (
                            <span className="none">沒有排人</span>
                          )}
                        </div>
                      )
                    })}
                    <p className="off">
                      休假：
                      {off.length
                        ? off.map((a) => `${a.name}${a.leave && a.leave !== 'OFF' ? `（${getLeaveDisplay(monthOf(a.homeStore), a.leave)?.label}）` : ''}`).join('、')
                        : '無'}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 交通車是最有時效性的資訊（早班 04:30 到店） */}
          <section className="rides" aria-label="誰坐交通車">
            {cars.map((car) => {
              const unset = car.groups.find((g) => g.location === UNSET_PICKUP)
              return (
                <div className="block car" key={car.shift}>
                  <h3>
                    {CAR_LABELS[car.shift]}
                    <small>
                      {carDepartureTime(car.shift)} 發車・<b>{car.total}</b> 人
                    </small>
                  </h3>
                  {car.groups.length === 0 ? (
                    <p>今天沒有人要坐這班車。</p>
                  ) : (
                    car.groups.map((group) => (
                      <div className={`stop${group.location === UNSET_PICKUP ? ' unset' : ''}`} key={group.location}>
                        <time>{stopTime(group.location, car.shift) || '—'}</time>
                        <b>
                          {group.location}
                          <i>{group.riders.length} 人</i>
                        </b>
                        <p>
                          {group.riders
                            .map((r) => `${r.name}（${getStoreShortName(r.workStore)}${r.isSupport ? '·支援' : ''}）`)
                            .join('、')}
                        </p>
                      </div>
                    ))
                  )}
                  {car.skipped.length ? <p>不搭車：{car.skipped.map((a) => a.name).join('、')}</p> : null}
                  {unset ? (
                    <Link className="text" to="/shifts">
                      {unset.riders.length} 人還沒設定上車地點，到舊版「同事與上車」設定
                    </Link>
                  ) : null}
                </div>
              )
            })}
            {moves.length ? (
              <div className="block">
                <h3>
                  列外（跨店）<small>紙本寫了但不算在自己店裡的班</small>
                </h3>
                <ul className="moves">
                  {moves.map((move) => (
                    <li key={`${move.fromStore}-${move.personKey}`}>
                      {move.name}
                      <span>
                        {getStoreShortName(move.fromStore)} → {move.toStore ? getStoreShortName(move.toStore) : '（紙本沒寫去哪家店）'}
                        {move.shiftUnknown ? '・班別未定' : `・${getShiftDisplay(monthOf(move.toStore), move.shift)?.label || ''}`}
                        {move.counted ? '' : '・目的店已列，不重複計'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  )
}

function datesOfMonth(month) {
  const dates = Object.keys(month?.days || {}).sort()
  if (dates.length) return dates
  const [year, monthNum] = String(month?.monthKey || '').split('-').map(Number)
  if (!year || !monthNum) return []
  const total = month?.daysInMonth || new Date(year, monthNum, 0).getDate()
  return Array.from({ length: total }, (_, i) => `${month.monthKey}-${String(i + 1).padStart(2, '0')}`)
}

function GridPanel({ book }) {
  const todayKey = toDateKey(new Date())
  const [storeCode, setStoreCode] = useState(STORES[0].code)
  const [monthKey, setMonthKey] = useState('')
  const [detail, setDetail] = useState(null) // title 在手機上不存在，格子要能點開看細節
  const activeMonthKey = book.monthKeys.includes(monthKey)
    ? monthKey
    : book.monthKeys.includes(todayKey.slice(0, 7))
      ? todayKey.slice(0, 7)
      : book.monthKeys[book.monthKeys.length - 1] || ''
  const month = book.months.find((m) => m.monthKey === activeMonthKey && m.storeCode === storeCode) || null
  const dates = useMemo(() => datesOfMonth(month), [month])

  // 開啟時把今天那一欄捲到看得到的位置
  const scrollRef = useRef(null)
  useEffect(() => {
    const el = scrollRef.current
    const col = el?.querySelector('thead .now')
    if (col) el.scrollLeft = Math.max(0, col.offsetLeft - el.clientWidth / 2)
  }, [month])

  /** 當日本店人力，定義比照班表的 Total 列：上班且不是去別店支援 */
  const totals = useMemo(() => {
    const map = {}
    dates.forEach((date) => {
      const counted = (month?.people || []).reduce((sum, person) => {
        const entry = month.entries?.[person.key]?.[date]
        return sum + (entry?.kind === 'WORK' && !entry.isSupport ? 1 : 0)
      }, 0)
      const stated = month?.days?.[date]?.total ?? null
      map[date] = { counted, stated, mismatch: stated !== null && stated !== counted }
    })
    return map
  }, [month, dates])

  const legend = useMemo(() => {
    const codes = new Set()
    Object.values(month?.entries || {}).forEach((byDate) =>
      Object.values(byDate).forEach((entry) => entry?.kind === 'WORK' && codes.add(effectiveShift(entry) || ''))
    )
    return [...codes]
      .filter(Boolean)
      .map((code) => getShiftDisplay(month, code))
      .sort((a, b) => (a.start || '99').localeCompare(b.start || '99'))
  }, [month])

  return (
    <div className="panel">
      <div className="gridbar">
        <div className="seg" role="group" aria-label="分店">
          {STORES.map((store) => (
            <button key={store.code} type="button" aria-pressed={store.code === storeCode} onClick={() => setStoreCode(store.code)}>
              {store.short}
            </button>
          ))}
        </div>
        <select aria-label="月份" value={activeMonthKey} onChange={(e) => setMonthKey(e.target.value)}>
          {book.monthKeys.map((key) => (
            <option key={key} value={key}>
              {key.replace('-', ' 年 ').replace(/^(\d+ 年 )0?/, '$1')} 月
            </option>
          ))}
        </select>
        <div className="legend">
          {legend.map((d) => (
            <span key={d.code}>
              <i style={{ background: tintOf(d.code) }}>{d.short}</i>
              {d.start && d.end ? `${d.start}–${d.end}` : d.label}
            </span>
          ))}
        </div>
      </div>

      {!month ? (
        <div className="empty">
          <p>這個月份還沒有這家店的班表。</p>
          <Link className="text" to="/shifts">
            到舊版班表的「匯入」分頁上傳
          </Link>
        </div>
      ) : (
        <>
          <div className="scroll" ref={scrollRef}>
            <table>
              <thead>
                <tr>
                  <th className="name" scope="col">
                    {getStoreShortName(storeCode)}
                  </th>
                  {dates.map((date) => {
                    const day = parseDateKey(date)
                    const weekend = month.days?.[date]?.isWeekend ?? (day.getDay() === 0 || day.getDay() === 6)
                    const note = month.holidays?.[date]
                    return (
                      <th key={date} scope="col" title={note || undefined} className={`${weekend ? 'we' : ''}${note ? ' hol' : ''}${date === todayKey ? ' now' : ''}`}>
                        <b>{day.getDate()}</b>
                        {WEEKDAY_LABELS[day.getDay()]}
                      </th>
                    )
                  })}
                  <th className="sum" scope="col">
                    班數
                  </th>
                </tr>
              </thead>
              <tbody>
                {(month.people || []).map((person) => {
                  const byDate = month.entries?.[person.key] || {}
                  let work = 0
                  return (
                    <tr key={person.key}>
                      <th className="name" scope="row" title={person.placeholder ? `${person.name}（匯出檔的支援列，非個人）` : person.name}>
                        {person.name}
                      </th>
                      {dates.map((date) => {
                        const entry = byDate[date]
                        const text = describeEntry(entry, month)
                        const now = date === todayKey ? ' now' : ''
                        let mark = null
                        if (entry?.kind === 'WORK') {
                          work += 1
                          const code = effectiveShift(entry)
                          const display = getShiftDisplay(month, code)
                          mark = (
                            <i className={entry.needsReview ? 'review' : ''} style={{ background: tintOf(entry.isSupport ? 'SUPPORT' : code) }}>
                              {display?.short || '班'}
                            </i>
                          )
                        } else if (entry?.kind === 'LEAVE') mark = getLeaveDisplay(month, entry.leave)?.marker || '休'
                        else if (entry?.kind === 'UNKNOWN') mark = <i className="review">?</i>
                        return (
                          <td key={date} className={`${entry?.kind === 'LEAVE' ? 'lv' : ''}${now}`}>
                            <button
                              type="button"
                              title={text || undefined}
                              aria-label={`${person.name} ${date} ${text || '無班'}`}
                              onClick={() => setDetail(entry ? { name: person.name, date, text } : null)}
                            >
                              {mark}
                            </button>
                          </td>
                        )
                      })}
                      <td className="sum">{work}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th className="name" scope="row">
                    上班人數
                  </th>
                  {dates.map((date) => {
                    const t = totals[date]
                    return (
                      <td
                        key={date}
                        className={`${t.mismatch ? 'mismatch' : ''}${date === todayKey ? ' now' : ''}`}
                        title={t.mismatch ? `算出 ${t.counted} 人，紙本 Total 寫 ${t.stated} 人，這天有格子判錯` : undefined}
                      >
                        {t.counted}
                      </td>
                    )
                  })}
                  <td className="sum" />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="detail" aria-live="polite">
            {detail ? (
              <>
                <b>
                  {detail.name}　{detail.date.slice(5).replace('-', '/')}
                </b>
                　{detail.text}
              </>
            ) : (
              '點格子看這一格的細節。紅字的上班人數代表跟紙本 Total 對不上。'
            )}
          </p>
        </>
      )}
    </div>
  )
}

export default function Shifts() {
  const { book, peopleSettings, identity, loading, loadError } = useShiftBook()
  const [tab, setTab] = useState('today')
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()))
  const pickupByPerson = useMemo(() => pickupMapFrom(peopleSettings, identity), [peopleSettings, identity])

  return (
    <ToolPage className="bl-shifts" path="/shifts" section="人事與航班" title="班表">
      {loadError ? (
        <p className="alert" role="alert">
          {loadError}
        </p>
      ) : null}
      <div className="tabs" role="group" aria-label="班表分頁">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={key === tab} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
        {OLD_TABS.map((label) => (
          <Link key={label} to="/shifts" title="這個分頁還沒有新版，會開舊版班表">
            {label}
            <i>舊版</i>
          </Link>
        ))}
      </div>
      {loading ? (
        <div className="empty">
          <p>班表讀取中…</p>
        </div>
      ) : tab === 'today' ? (
        <TodayPanel book={book} dateKey={dateKey} setDateKey={setDateKey} pickupByPerson={pickupByPerson} />
      ) : (
        <GridPanel book={book} />
      )}
    </ToolPage>
  )
}
