import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToolPage } from '../../components/bl/shared'
import ShiftFlightLoad, { useFlightDay } from '../../components/shifts/ShiftFlightLoad'
import { PersonOptionGroups } from '../../components/shifts/shiftUi'
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
  groupPeopleByStore,
  groupWorkingByStore,
  parseDateKey,
  pickupMapFrom,
  toDateKey,
} from '../shifts/shiftModel'
import { describeEntry, getLeaveDisplay, getShiftDisplay } from '../shifts/shiftVocab'
import { savePersonSettings, saveShiftMonth, saveSupportLinks } from '../shifts/shiftFirestore'
import { listUnresolvedSupport } from '../shifts/shiftSupport'
import { parseHHMMToMinutes } from '../../utils/flightData/flightTime'
import { useShiftBook } from '../shifts/useShiftBook'
import { MatchPanel, PersonCalendar, StatsPanel, tintOf } from './ShiftsMore'
import { ImportPanel, PeoplePanel, PickupPanel, SupportPanel } from './ShiftsAdmin'
import '../../styles/bl-shifts.css'

// 七個分頁都是新版畫面；資料、算法與寫入跟 Club 版共用（pages/shifts、components/shifts/useShiftPanels）。

const TABS = [
  ['today', '今天'],
  ['grid', '完整班表'],
  ['match', '找日子'],
  ['stats', '統計'],
  ['support', '支援班'],
  ['pickup', '同事與上車'],
  ['import', '匯入'],
]

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

/** 這一班現在的狀態：on＝上班中、done＝已下班、next＝還沒開始；看的不是今天就不標 */
function statusOf(display, isToday, nowMinutes) {
  if (!isToday) return ''
  const start = parseHHMMToMinutes(display?.start)
  let end = parseHHMMToMinutes(display?.end)
  if (start == null || end == null) return ''
  if (end <= start) end += 24 * 60
  if (nowMinutes >= end) return 'done'
  return nowMinutes >= start ? 'on' : 'next'
}

function StoreBlock({ store, codes, month, dateKey, isToday, off }) {
  // 每個班別旁邊帶這一班有幾班機、最忙哪一小時（中央店沒有對應的登機門，不會顯示）
  const { store: flightStore, flights } = useFlightDay(store.storeCode, dateKey)
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return (
    <div className="block">
      <h3>
        {store.storeCode ? getStoreShortName(store.storeCode) : store.storeName}
        <small>
          <b>{store.total}</b> 人
        </small>
      </h3>
      {codes.map((code) => {
        const display = code ? getShiftDisplay(month, code) : null
        const people = store.shifts.find((s) => s.shift === code)?.people || []
        const status = statusOf(display, isToday, nowMinutes)
        return (
          <div className={`shift ${status}`} key={code ?? 'none'}>
            <span className="chip" style={{ background: tintOf(code) }}>
              {display?.label || '班別未定'}
            </span>
            <time>
              {display?.start && display?.end ? `${display.start}–${display.end}` : ''}
              {status === 'on' ? <em>上班中</em> : null}
            </time>
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
            {code && people.length ? (
              <div className="load">
                <ShiftFlightLoad store={flightStore} flights={flights} month={month} shiftCode={code} dateKey={dateKey} />
              </div>
            ) : null}
          </div>
        )
      })}
      <p className="off">
        休假：
        {off.length
          ? off.map((a) => `${a.name}${a.leave && a.leave !== 'OFF' ? `（${getLeaveDisplay(month, a.leave)?.label}）` : ''}`).join('、')
          : '無'}
      </p>
    </div>
  )
}

function TodayPanel({ book, dateKey, setDateKey, pickupByPerson, onOpenTab }) {
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

  // 手機左右滑換日；在可橫向捲動的區塊上不觸發
  const swipe = useRef(null)
  const onTouchStart = (e) => {
    const t = e.touches[0]
    swipe.current = e.target.closest?.('.scroll') ? null : { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return
    setDateKey((d) => addDays(d, dx < 0 ? 1 : -1))
  }

  return (
    <div className="panel" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
        <label className="jump">
          <span>跳到日期</span>
          <input type="date" value={dateKey} onChange={(e) => e.target.value && setDateKey(e.target.value)} />
        </label>
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
          <button type="button" className="text" onClick={() => onOpenTab('import')}>
            到「匯入」分頁上傳
          </button>
        </div>
      ) : (
        <div className="today" key={dateKey}>
          <section aria-label="誰上班">
            <div className="stores" style={{ '--cols': view.columns.length, '--rows': view.codes.length + 2 }}>
              {view.columns.map((store) => (
                <StoreBlock
                  key={store.storeCode ?? 'unknown'}
                  store={store}
                  codes={view.codes}
                  month={monthOf(store.storeCode)}
                  dateKey={dateKey}
                  isToday={dateKey === todayKey}
                  off={view.leave.filter((a) => a.homeStore === store.storeCode)}
                />
              ))}
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
                    <button type="button" className="text" onClick={() => onOpenTab('pickup')}>
                      {unset.riders.length} 人還沒設定上車地點，去設定
                    </button>
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

function GridPanel({ book, onOpenTab, onPickDate }) {
  const todayKey = toDateKey(new Date())
  const [storeCode, setStoreCode] = useState(STORES[0].code)
  const [monthKey, setMonthKey] = useState('')
  const [detail, setDetail] = useState(null) // title 在手機上不存在，格子要能點開看細節
  const [personKey, setPersonKey] = useState('')
  const peopleGroups = useMemo(() => groupPeopleByStore(book.people), [book.people])
  const person = book.people.find((p) => p.key === personKey) || null
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
        {person ? null : (
          <div className="seg" role="group" aria-label="分店">
            {STORES.map((store) => (
              <button key={store.code} type="button" aria-pressed={store.code === storeCode} onClick={() => setStoreCode(store.code)}>
                {store.short}
              </button>
            ))}
          </div>
        )}
        <select aria-label="月份" value={activeMonthKey} onChange={(e) => setMonthKey(e.target.value)}>
          {book.monthKeys.map((key) => (
            <option key={key} value={key}>
              {key.replace('-', ' 年 ').replace(/^(\d+ 年 )0?/, '$1')} 月
            </option>
          ))}
        </select>
        <select aria-label="同事" className="who" value={personKey} onChange={(e) => setPersonKey(e.target.value)}>
          <option value="">全部同事</option>
          <PersonOptionGroups groups={peopleGroups} />
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

      {person ? (
        // 單一同事：月曆視圖（跨店顯示他實際上班的地方，可匯出到手機行事曆）
        <PersonCalendar book={book} person={person} monthKey={activeMonthKey} onSelectDate={onPickDate} />
      ) : !month ? (
        <div className="empty">
          <p>這個月份還沒有這家店的班表。</p>
          <button type="button" className="text" onClick={() => onOpenTab('import')}>
            到「匯入」分頁上傳
          </button>
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
                    const weekend = day.getDay() === 0 || day.getDay() === 6
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
                        const dow = parseDateKey(date).getDay()
                        const weekend = dow === 0 || dow === 6 ? ' we' : ''
                        const picked = detail?.date === date && detail?.name === person.name ? ' picked' : ''
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
                          <td key={date} className={`${entry?.kind === 'LEAVE' ? 'lv' : ''}${weekend}${now}${picked}`}>
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

/** 班表只有管理員能寫（Firestore 規則）；沒登入時 Firebase 只丟一句英文，翻成人話 */
function describeSaveError(error) {
  const code = error?.code || ''
  if (code === 'permission-denied' || /insufficient permissions/i.test(error?.message || '')) {
    return '沒有權限寫入班表。班表只有管理員能改，請先到「管理」登入後再試一次。'
  }
  return error?.message || '未知錯誤'
}

export default function Shifts() {
  const {
    book,
    rawBook,
    months,
    resolvedMonths,
    peopleSettings,
    setPeopleSettings,
    supportLinks,
    setSupportLinks,
    identity,
    loading,
    loadError,
    setLoadError,
  } = useShiftBook()
  const [tab, setTab] = useState('today')
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()))
  const [saving, setSaving] = useState(false)
  const [statsPersonKey, setStatsPersonKey] = useState(null)
  const pickupByPerson = useMemo(() => pickupMapFrom(peopleSettings, identity), [peopleSettings, identity])
  const peopleGroups = useMemo(() => groupPeopleByStore(book.people), [book.people])
  /** 只寫「T3／D7」還沒對到實際班別的支援班 */
  const pendingSupport = useMemo(() => listUnresolvedSupport(months, supportLinks), [months, supportLinks])
  const pickDate = (key) => {
    setDateKey(key)
    setTab('today')
  }

  // 以下三個寫入動作照舊版 ShiftBoard 的做法（舊版退場後這裡就是唯一一份）
  const saveMonths = useCallback(async (monthsToSave) => {
    setSaving(true)
    try {
      for (const month of monthsToSave) await saveShiftMonth(month)
    } catch (error) {
      throw new Error(describeSaveError(error))
    } finally {
      setSaving(false)
    }
  }, [])
  const changeSupportLink = useCallback(
    async ({ monthKey, date, atStore, personKey, slotId }) => {
      const next = supportLinks.filter((link) => !(link.date === date && link.atStore === atStore && link.personKey === personKey))
      if (slotId) next.push({ date, atStore, personKey, slotId })
      setSupportLinks(next) // 樂觀更新，onSnapshot 回來會覆蓋
      setSaving(true)
      try {
        await saveSupportLinks(monthKey, next.filter((link) => link.date.startsWith(monthKey)))
      } catch (error) {
        setLoadError(`儲存支援班配對失敗：${describeSaveError(error)}`)
      } finally {
        setSaving(false)
      }
    },
    [supportLinks, setSupportLinks, setLoadError]
  )
  const changePersonSettings = useCallback(
    async (personKey, settings) => {
      setPeopleSettings((prev) => ({ ...prev, [personKey]: settings }))
      setSaving(true)
      try {
        await savePersonSettings(personKey, settings)
      } catch (error) {
        setLoadError(`儲存同事設定失敗：${error.message}`)
      } finally {
        setSaving(false)
      }
    },
    [setPeopleSettings, setLoadError]
  )

  return (
    <ToolPage className="bl-shifts" path="/shifts" section="人事與航班" title="班表">
      {loadError ? (
        <p className="alert" role="alert">
          {loadError}　
          <button type="button" className="text" onClick={() => setLoadError('')}>
            知道了
          </button>
        </p>
      ) : null}
      <div className="tabs" role="group" aria-label="班表分頁">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={key === tab} onClick={() => setTab(key)}>
            {label}
            {key === 'support' && pendingSupport.length ? <i>{pendingSupport.length}</i> : null}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="empty">
          <p>班表讀取中…</p>
        </div>
      ) : tab === 'today' ? (
        <TodayPanel book={book} dateKey={dateKey} setDateKey={setDateKey} pickupByPerson={pickupByPerson} onOpenTab={setTab} />
      ) : tab === 'grid' ? (
        <GridPanel book={book} onOpenTab={setTab} onPickDate={pickDate} />
      ) : tab === 'match' ? (
        <MatchPanel book={book} peopleGroups={peopleGroups} onSelectDate={pickDate} />
      ) : tab === 'stats' ? (
        <StatsPanel book={book} peopleSettings={peopleSettings} selectedPersonKey={statsPersonKey} onSelectPerson={setStatsPersonKey} />
      ) : tab === 'support' ? (
        <SupportPanel months={months} links={supportLinks} onChangeLink={changeSupportLink} saving={saving} />
      ) : tab === 'pickup' ? (
        <div className="panel">
          <PickupPanel
            book={book}
            pickupByPerson={pickupByPerson}
            defaultDate={dateKey}
            supportWarning={
              pendingSupport.length ? (
                <p className="alert soft">
                  {pendingSupport.length} 天的跨店支援還沒指定是哪一班。如果其中有早班或中班，那些人不會出現在下面的名單裡。　
                  <button type="button" className="text" onClick={() => setTab('support')}>
                    去「支援班」確認
                  </button>
                </p>
              ) : null
            }
          />
          <PeoplePanel rawPeople={rawBook.people} identity={identity} peopleSettings={peopleSettings} months={resolvedMonths} onChange={changePersonSettings} saving={saving} />
        </div>
      ) : (
        <ImportPanel existingMonths={months} onSave={saveMonths} saving={saving} />
      )}
    </ToolPage>
  )
}
