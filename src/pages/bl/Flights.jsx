import { useEffect, useMemo, useState } from 'react'
import { InBlShell } from '../../components/bl/chrome'
import { ToolPage } from '../../components/bl/shared'
import { FlightDialogs } from '../../components/playground/FlightDialogs'
import { useFlightData } from '../../components/playground/useFlightData'
import { busyIndexOn, formatBusyDiff } from '../../utils/flightData/busyIndex'
import { formatMinAsHHMM, parseHHMMToMinutes } from '../../utils/flightData/flightTime'
import { flightRowKey, gateToFamily } from '../../utils/flightData/gates'
import { isNightSupportTargetGate, mergeNightShiftConfig } from '../../utils/flightData/nightShiftSupport'
import { FLIGHT_STORE_ORDER, FLIGHT_STORES } from '../../utils/flightData/stores'
import { isStressSlotInSupportPeriod, stressSlotFlights } from '../../utils/flightData/stressSlots'
import FlightStats from './FlightStats'
import '../../styles/bl-flights.css'

// 新版航班。讀資料、壓力曲線、晚班支援、統計、設定全部用舊版同一份邏輯（useFlightData），
// 彈窗也沿用。「當天」是壓力曲線、今天、晚班支援、班機四張卡片；「統計分析」在 FlightStats。
const WEEKDAYS = '日一二三四五六'
const TIME_FILTERS = [
  ['all', '全天'],
  ['next3', '接下來 3 小時'],
  ['upcoming', '尚未起飛'],
]
const pad = (n) => String(n).padStart(2, '0')
const span = (a, b) => `${formatMinAsHHMM(a)}–${formatMinAsHHMM(b)}`
const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} 小時${m % 60 ? ` ${m % 60} 分` : ''}` : `${m} 分`)
const shiftDay = (dateStr, by) => {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + by)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
/** 把一串點連成平滑的曲線（Catmull-Rom 轉貝茲），不讓它衝出上下邊界 */
const smooth = (pts) =>
  pts.reduce((d, p, i) => {
    if (!i) return `M${p[0]},${p[1]}`
    const p0 = pts[i - 2] || pts[i - 1]
    const p1 = pts[i - 1]
    const p3 = pts[i + 1] || p
    const c = (v) => Math.min(100, Math.max(0, v))
    return `${d} C${p1[0] + (p[0] - p0[0]) / 6},${c(p1[1] + (p[1] - p0[1]) / 6)} ${p[0] - (p3[0] - p1[0]) / 6},${c(p[1] - (p3[1] - p1[1]) / 6)} ${p[0]},${p[1]}`
  }, '')

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 699px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 699px)')
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

const Sliders = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
    <path d="M2 4h7M12 4h2M2 8h2M7 8h7M2 12h8M13 12h1" />
    <circle cx="10.5" cy="4" r="1.5" />
    <circle cx="5.5" cy="8" r="1.5" />
    <circle cx="11.5" cy="12" r="1.5" />
  </svg>
)
const Chevron = ({ left }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d={left ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

/** 壓力曲線：柱子＝該時刻起 60 分鐘的登機壓力，細線＝估計登機人數 */
function Curve({ m, narrow }) {
  const { store, storeShifts, stressSeriesToday, stressSummaryToday: summary, stressShift, nowMinutes, flightData, nightSupportPlan, shiftPeople } = m
  const [sel, setSel] = useState(null)
  const [tip, setTip] = useState(null)
  // 窄螢幕半小時一根，柱子才看得清楚
  const series = useMemo(() => (stressSeriesToday || []).filter((_, i) => !narrow || i % 2 === 0), [stressSeriesToday, narrow])
  useEffect(() => setSel(null), [stressShift, flightData])
  // 柱子長出來的動畫只在換班別、換資料時播一次，不會每次重畫（時鐘走動）都重播
  const growKey = `${stressShift}|${flightData?.date}|${store.key}`

  if (!series.length || !summary) return null
  const stepMin = series.length > 1 ? series[1].startMin - series[0].startMin : 15
  const A = series[0].startMin
  const B = series[series.length - 1].startMin + stepMin
  const pct = (min) => ((min - A) / (B - A)) * 100
  const top = summary.maxScore > 0 ? summary.maxScore : 1
  const hasPeople = series.some((s) => s.people != null)
  const topPeople = hasPeople ? Math.max(1, ...series.map((s) => s.people || 0)) : 1
  const pts = series.map((s, i) => [i + 0.5, 100 - ((s.people || 0) / topPeople) * 90])
  const hi = series.reduce((a, s, i) => ((s.people || 0) > (series[a].people || 0) ? i : a), 0)
  const peak = summary.maxScore > 0 ? summary.peak : null
  const quiet = summary.maxScore > 0 ? summary.quiet : null
  const shift = storeShifts.find((s) => s.key === stressShift) || storeShifts[0]
  const inShift = (flightData?.flights || []).filter((f) => {
    const t = parseHHMMToMinutes(f.time)
    return t != null && t >= shift.startMin && t < shift.endMin
  }).length
  const who = (shiftPeople?.[shift.key] || []).map((p) => p.name).join('、')
  const picked = sel != null ? series.find((s) => s.startMin === sel) : null
  const pickedFlights = picked ? stressSlotFlights(flightData?.flights || [], picked.startMin, store) : []
  const tickEvery = narrow && B - A > 600 ? 240 : 120
  const ticks = []
  for (let t = Math.ceil(A / tickEvery) * tickEvery; t <= B; t += tickEvery) ticks.push(t)
  const count = (v) => (Number.isInteger(v) ? v : v.toFixed(1))
  const people = (s) => (s?.people != null ? ` · 約 ${Math.round(s.people).toLocaleString('en-US')} 人` : '')

  return (
    <>
      <div className="seg" role="group" aria-label="看哪一班">
        {storeShifts.map((sh) => (
          <button key={sh.key} type="button" aria-pressed={sh.key === stressShift} onClick={() => m.setStressShift(sh.key)}>
            <b>{sh.label}</b>
            <small>{span(sh.startMin, sh.endMin)}</small>
          </button>
        ))}
      </div>
      <dl className="say">
        {peak ? (
          <div className="busy">
            <dt>最忙</dt>
            <dd>{peak.label}</dd>
            <small>
              {count(peak.flightCount)} 班{people(peak)}
            </small>
          </div>
        ) : (
          <div>
            <dt>這個區間</dt>
            <dd>沒有航班</dd>
          </div>
        )}
        {quiet ? (
          <div>
            <dt>最鬆</dt>
            <dd>{span(quiet.startMin, quiet.endMin)}</dd>
            <small>低於尖峰兩成</small>
          </div>
        ) : null}
        <div className="who">
          <dt>{shift.key === 'full' ? '這個時段' : shift.label}</dt>
          <dd>
            {inShift}
            <i>班</i>
          </dd>
          <small>{who || span(shift.startMin, shift.endMin)}</small>
        </div>
      </dl>
      <div className="plot">
        {quiet ? (
          <div className="quiet" style={{ left: `${pct(quiet.startMin)}%`, width: `${Math.max(0, pct(Math.min(B, quiet.endMin - 60 + stepMin)) - pct(quiet.startMin))}%` }}>
            <span>最長的空檔</span>
          </div>
        ) : null}
        <div className="bars go" key={growKey} onPointerLeave={() => setTip(null)}>
          {series.map((s, k) => (
            <button
              key={s.startMin}
              type="button"
              className={`${peak && s.startMin === peak.startMin ? 'peak' : ''}${sel === s.startMin ? ' sel' : ''}${store.nightSupport && isStressSlotInSupportPeriod(s.startMin, nightSupportPlan?.supportFrom, nightSupportPlan?.supportUntil) ? ' sup' : ''}`}
              style={{ '--h': s.score / top, '--k': k }}
              aria-label={`${s.label}：${count(s.flightCount)} 班${people(s)}`}
              aria-pressed={sel === s.startMin}
              onPointerEnter={() => setTip(s)}
              onClick={() => setSel(sel === s.startMin ? null : s.startMin)}
            >
              <i />
            </button>
          ))}
        </div>
        {hasPeople ? (
          <svg viewBox={`0 0 ${series.length} 100`} preserveAspectRatio="none" aria-hidden="true">
            <path className="line" d={smooth(pts)} />
          </svg>
        ) : null}
        <div className="base" />
        {hasPeople && topPeople > 1 ? <span className="dot" style={{ left: `${((hi + 0.5) / series.length) * 100}%`, top: `${pts[hi][1]}%` }} data-t={`約 ${Math.round(series[hi].people).toLocaleString('en-US')} 人`} /> : null}
        {nowMinutes != null && nowMinutes >= A && nowMinutes <= B ? <div className="nowtag" style={{ left: `${pct(nowMinutes)}%` }} /> : null}
        {tip ? (
          <div className="tip" style={{ left: `${Math.min(84, Math.max(16, pct(tip.startMin + stepMin / 2)))}%`, bottom: `calc(${(tip.score / top) * 100}% + 8px)` }}>
            <b>{tip.label}</b>　{count(tip.flightCount)} 班{people(tip)}
          </div>
        ) : null}
      </div>
      <div className="axis" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} style={{ left: `${pct(t)}%` }}>
            {formatMinAsHHMM(t)}
          </span>
        ))}
      </div>
      <p className="key">
        <span>
          <i />
          登機壓力（該時刻起 60 分鐘）
        </span>
        <span>
          <i className="p" />
          最忙的一小時
        </span>
        <span>
          <i className="q" />
          最長的空檔
        </span>
        {hasPeople ? (
          <span>
            <i className="l" />
            估計登機人數
          </span>
        ) : null}
        {store.nightSupport && nightSupportPlan?.supportFrom ? (
          <span>
            <i className="s" />
            晚班支援時段
          </span>
        ) : null}
      </p>
      {picked ? (
        <p className="foot">
          <b>
            {picked.label}　{count(picked.flightCount)} 班{people(picked)}
          </b>
          <br />
          {pickedFlights.map((f) => `${f.time} ${f.city || f.destination || ''}（${f.gate}）`).join('、') || '沒有班機'}
        </p>
      ) : null}
    </>
  )
}

export default function Flights() {
  const m = useFlightData()
  const { store, storeKey, selectedDate, flightData, loading, activeTab, nowMinutes, nightSupportPlan, filteredFlights, timeFilter, gateFilter } = m
  const narrow = useNarrow()
  const [showStatus, setShowStatus] = useState(false)
  const date = flightData?.date || selectedDate
  const day = new Date(`${date}T12:00:00`)
  const goto = (next) => {
    m.setSelectedDate(next)
    m.loadFlightData(next)
  }
  const busy = m.paxDaily ? busyIndexOn(m.paxDaily, date) : null
  const flights = flightData?.flights || []
  const next = nowMinutes != null ? flights.find((f) => (parseHHMMToMinutes(f.time) ?? -1) >= nowMinutes) : null
  const openNightSettings = () => {
    m.setDraftNightShift(mergeNightShiftConfig(m.nightShiftConfig, store))
    m.setNsGateRangeLo(m.gateFamilyNumbers[0])
    m.setNsGateRangeHi(m.gateFamilyNumbers[m.gateFamilyNumbers.length - 1])
    m.setNightShiftDraftError(null)
    m.setNightShiftModalOpen(true)
  }
  const openWeights = () => {
    m.setDraftGateStressWeights({ ...m.gateStressWeights })
    m.setGateStressSaveState('idle')
    m.setGateStressWeightsModalOpen(true)
  }
  // 晚班支援寫在那一班的後面：哪一班決定留店到幾點、哪些登機門不列入考慮（規則同舊版 FlightRow）
  const markOf = (f) => {
    if (!store.nightSupport) return null
    const cfg = m.nightShiftCfgMerged
    const t = parseHHMMToMinutes(f.time)
    const fam = gateToFamily(f.gate)
    if (fam && !cfg.gateIncluded[fam] && t != null && t >= cfg.supportStartMin) return ['skip', `${fam} 不列入考慮`]
    const target = isNightSupportTargetGate(f.gate, cfg, store) && t != null && t >= cfg.supportStartMin && t <= cfg.supportEndMin
    if (target && m.nightSupportLastRowKeys.has(flightRowKey(f))) return ['stay', `留店至 ${nightSupportPlan?.keepStoreUntil || '--:--'}`]
    return null
  }
  const issues = m.dataValidation.warnings.length + m.dataValidation.errors.length
  const diff = m.dataDiff

  return (
    <ToolPage className="bl-flights" path="/flight-data" section="人事與航班" title="航班">
      <InBlShell.Provider value={true}>
        <div className="flights">
          <div className="stores" role="group" aria-label="分店">
            {FLIGHT_STORE_ORDER.map((k) => (
              <button key={k} type="button" aria-pressed={storeKey === k} onClick={() => m.selectStore(k)}>
                {FLIGHT_STORES[k].label}
                <small>{FLIGHT_STORES[k].rangeLabel.replace('-', '–')}</small>
              </button>
            ))}
            <div className="day">
              <button type="button" aria-label="前一天" onClick={() => goto(shiftDay(selectedDate, -1))}>
                <Chevron left />
              </button>
              <label>
                <span>
                  {day.getMonth() + 1}/{day.getDate()}（{WEEKDAYS[day.getDay()]}）
                </span>
                <input type="date" value={selectedDate} aria-label="選擇日期" onChange={(e) => e.target.value && goto(e.target.value)} />
              </label>
              <button type="button" aria-label="後一天" onClick={() => goto(shiftDay(selectedDate, 1))}>
                <Chevron />
              </button>
            </div>
          </div>

          <div className="tabs" role="group" aria-label="看什麼">
            <button type="button" aria-pressed={activeTab === 'data'} onClick={() => m.setActiveTab('data')}>
              當天
            </button>
            <button type="button" aria-pressed={activeTab === 'statistics'} onClick={() => m.setActiveTab('statistics')}>
              統計分析
            </button>
            <span className="upd">
              {loading ? (
                <>
                  讀取中…
                  <button type="button" onClick={m.handleCancelLoad}>
                    取消
                  </button>
                </>
              ) : (
                <>
                  {m.lastUpdated ? `${m.formatLastUpdated(m.lastUpdated)}` : ''}
                  <button type="button" onClick={m.handleLoadData}>
                    重新整理
                  </button>
                </>
              )}
            </span>
          </div>

          {activeTab === 'data' ? (
            !flightData ? (
              <p className="blank">{loading ? '讀取中…' : m.status?.type === 'error' ? m.status.message : '這一天沒有航班資料，換個日期試試。'}</p>
            ) : (
              <div className={`cards${store.nightSupport ? '' : ' no-late'}`}>
                <section className="card c-curve">
                  <div className="hd">
                    <h2>壓力曲線</h2>
                    <small>當天</small>
                    <button type="button" className="ic push" aria-label="壓力曲線怎麼算的" onClick={() => m.setStressSlotsHelp('today')}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                        <circle cx="8" cy="8" r="6.2" />
                        <path d="M8 7.2v4M8 4.8v.4" />
                      </svg>
                    </button>
                    <button type="button" className="ic" aria-label="調整登機門壓力權重" onClick={openWeights}>
                      <Sliders />
                    </button>
                  </div>
                  <Curve m={m} narrow={narrow} />
                </section>

                <section className="card c-day">
                  <div className="hd">
                    <h2>{nowMinutes != null ? '今天' : '這一天'}</h2>
                  </div>
                  <dl className="rows first">
                    <div>
                      <dt>班機</dt>
                      <dd>
                        {flightData.summary?.total_flights ?? flights.length}
                        <i>班</i>
                      </dd>
                    </div>
                    {busy ? (
                      <>
                        <div>
                          <dt>T2 預報</dt>
                          <dd>
                            {busy.total.toLocaleString('en-US')}
                            <i>人</i>
                          </dd>
                        </div>
                        <div>
                          <dt>比平常</dt>
                          <dd>
                            {formatBusyDiff(busy.diff)}
                            <i>{busy.label}</i>
                          </dd>
                        </div>
                      </>
                    ) : null}
                  </dl>
                  {nowMinutes != null ? (
                    <p className="nextup">
                      {next ? (
                        <>
                          下一班<b>{next.time}</b>
                          {next.city || next.destination}
                          <small>
                            {next.gate} · {next.flight_code} · <em>還有 {dur(parseHHMMToMinutes(next.time) - nowMinutes)}</em>
                          </small>
                        </>
                      ) : (
                        '今天的班機都飛了'
                      )}
                    </p>
                  ) : null}
                </section>

                {store.nightSupport ? (
                  <section className="card c-late">
                    <div className="hd">
                      <h2>晚班支援</h2>
                      <button type="button" className="ic push" aria-label="晚班支援參數" onClick={openNightSettings}>
                        <Sliders />
                      </button>
                    </div>
                    <span className={`tag${nightSupportPlan?.needSupport ? '' : ' no'}`}>{nightSupportPlan?.needSupport ? '需要支援' : '不需支援'}</span>
                    <dl className="rows">
                      <div>
                        <dt>留店至</dt>
                        <dd>{nightSupportPlan?.keepStoreUntil || '--:--'}</dd>
                      </div>
                      {nightSupportPlan?.supportFrom ? (
                        <div>
                          <dt>支援時段</dt>
                          <dd>
                            {nightSupportPlan.supportFrom}–{nightSupportPlan.supportUntil}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    {nightSupportPlan?.note ? <p className="note">{nightSupportPlan.note}</p> : null}
                  </section>
                ) : null}

                <section className="card c-list">
                  <div className="hd">
                    <h2>班機</h2>
                    <small>
                      顯示 {filteredFlights.length} / {flights.length} 班
                    </small>
                  </div>
                  <div className="bar" role="group" aria-label="篩選">
                    {TIME_FILTERS.map(([id, text]) => (
                      <button key={id} type="button" aria-pressed={timeFilter === id} onClick={() => m.setTimeFilter(id)}>
                        {text}
                      </button>
                    ))}
                    <select aria-label="只看某個登機門" value={gateFilter.size === 1 ? [...gateFilter][0] : ''} onChange={(e) => m.setGateFilter(e.target.value ? new Set([e.target.value]) : new Set())}>
                      <option value="">全部登機門</option>
                      {m.gatesInDay.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>時間</th>
                        <th>登機門</th>
                        <th>目的地</th>
                        <th>班號</th>
                        <th>狀態</th>
                        {store.nightSupport ? <th>晚班支援</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFlights.length === 0 ? (
                        <tr className="none">
                          <td colSpan={store.nightSupport ? 6 : 5}>這個條件下沒有班機。</td>
                        </tr>
                      ) : null}
                      {filteredFlights.map((f) => {
                        const t = parseHHMMToMinutes(f.time)
                        const gone = m.isExpiredFlight(f)
                        const soon = !gone && nowMinutes != null && t != null && t >= nowMinutes && t < nowMinutes + 60
                        const mark = markOf(f)
                        const status = (f.status || '').replace(/[A-Za-z][A-Za-z\s]*$/, '').trim() || f.status || ''
                        return (
                          <tr key={flightRowKey(f)} className={gone ? 'gone' : ''} tabIndex={0} onClick={() => m.setSelectedFlight(f)} onKeyDown={(e) => e.key === 'Enter' && m.setSelectedFlight(f)}>
                            <td className="time">{f.time}</td>
                            <td className="gate">{f.gate}</td>
                            <td className="to">{f.city || f.destination}</td>
                            <td className="code">{[f.flight_code, ...(f.codeshare_flights || []).map((c) => c.flight_code)].join(' / ')}</td>
                            <td className={`st${soon ? ' soon' : ''}`}>{soon ? `還有 ${dur(t - nowMinutes)}` : status}</td>
                            {store.nightSupport ? <td className={`mark ${mark ? mark[0] : ''}`}>{mark ? mark[1] : ''}</td> : null}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </section>
              </div>
            )
          ) : (
            <FlightStats m={m} />
          )}

          <div className="tools">
            <label className="auto">
              <input type="checkbox" checked={m.autoRefresh} onChange={(e) => m.setAutoRefresh(e.target.checked)} />
              每 5 分鐘自動重新整理
            </label>
            <button type="button" onClick={() => setShowStatus((v) => !v)} aria-expanded={showStatus}>
              狀態與驗證{issues ? `（${issues}）` : ''}
            </button>
            {activeTab === 'data' ? (
              <button type="button" onClick={m.handleExportPNG}>
                匯出班機圖
              </button>
            ) : (
              <>
                <button type="button" onClick={() => m.handleExportStatistics('png')}>
                  匯出 PNG
                </button>
                <button type="button" onClick={() => m.handleExportStatistics('pdf')}>
                  匯出 PDF
                </button>
              </>
            )}
          </div>
          {showStatus ? (
            <div className="status" role="status">
              {m.status?.message ? <p className={m.status.type === 'error' ? 'bad' : ''}>{m.status.message}</p> : null}
              {m.dataValidation.errors.map((x, i) => (
                <p className="bad" key={`e${i}`}>
                  {x}
                </p>
              ))}
              {m.dataValidation.warnings.map((x, i) => (
                <p className="warn" key={`w${i}`}>
                  {x}
                </p>
              ))}
              {diff && diff.added.length + diff.removed.length + diff.modified.length > 0 ? (
                <p>
                  跟上次比：新增 {diff.added.length} 班、取消 {diff.removed.length} 班、變更 {diff.modified.length} 班
                </p>
              ) : null}
              {!m.status?.message && !issues ? <p>資料正常，沒有警告。</p> : null}
            </div>
          ) : null}

          <div className="legacy modals">
            <FlightDialogs m={m} />
          </div>
        </div>
      </InBlShell.Provider>
    </ToolPage>
  )
}
