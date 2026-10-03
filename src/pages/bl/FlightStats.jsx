import { useMemo, useState } from 'react'
import { formatMinAsHHMM } from '../../utils/flightData/flightTime'

// 新版航班的「統計分析」。資料全部來自 useFlightData（多日班機、排行、歷史對比），這裡只畫圖：
// 一張卡片回答一個問題，所有圖用同一種柱子和同一組顏色。
const WD = '日一二三四五六'
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const RANGES = [7, 14, 30, 90]
const H0 = 5
const H1 = 22
const pad = (n) => String(n).padStart(2, '0')
const md = (s) => {
  const d = new Date(`${s}T12:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
const dow = (s) => new Date(`${s}T12:00:00`).getDay()
const isWeekend = (s) => [0, 6].includes(dow(s))
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const one = (v) => (Math.round(v * 10) / 10).toLocaleString('en-US')

function Rank({ rows, gates = false }) {
  const top = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ol className={`rank${gates ? ' gates' : ''}`}>
      {rows.map((r, k) => (
        <li key={r.name}>
          {gates ? null : <span className="no">{k + 1}</span>}
          <span className="nm">{r.name}</span>
          <span className="br">
            <i style={{ '--h': r.value / top, '--k': k }} />
          </span>
          <span className="v">{gates ? one(r.value) : r.value}</span>
        </li>
      ))}
    </ol>
  )
}

export default function FlightStats({ m }) {
  const { multiDayData, loadingMultiDay, storeShifts, stressShift, stressSeriesMultiDay: series, stressSummaryMultiDay: summary, historicalComparison: hist } = m
  const [range, setRange] = useState(30) // 預設載入最近 30 天（hook 進這個分頁時會自己載）
  const [custom, setCustom] = useState(false)

  const days = useMemo(() => [...(multiDayData || [])].sort((a, b) => a.date.localeCompare(b.date)), [multiDayData])
  const stat = useMemo(() => {
    if (!days.length) return null
    const ns = days.map((d) => d.totalFlights ?? d.flights.length)
    const top = Math.max(...ns)
    const low = Math.min(...ns)
    const byWd = Array.from({ length: 7 }, (_, w) => avg(days.filter((d) => dow(d.date) === w).map((d) => d.totalFlights ?? d.flights.length)))
    const wTop = Math.max(...byWd)
    // 熱力圖：每天每小時幾班
    const heat = days.map((d) => {
      const row = Array(24).fill(0)
      d.flights.forEach((f) => {
        const h = parseInt(String(f.time || '').slice(0, 2), 10)
        if (h >= 0 && h <= 23) row[h] += 1
      })
      return row
    })
    return { ns, top, low, mean: avg(ns), best: days[ns.indexOf(top)], worst: days[ns.indexOf(low)], byWd, wTop, wBest: byWd.indexOf(wTop), heat, hTop: Math.max(1, ...heat.flatMap((r) => r.slice(H0, H1 + 1))) }
  }, [days])

  const pick = (n) => {
    setRange(n)
    setCustom(false)
    m.loadMultiDayData(n)
  }
  const dense = days.length > 14
  const every = days.length > 45 ? 14 : days.length > 20 ? 5 : days.length > 10 ? 2 : 1
  const peak = summary && summary.maxScore > 0 ? summary.peak : null
  const tickSeries = series || []
  const gates = (m.gateHeatmapData?.data || []).map((g) => ({ name: g.gate, value: g.average ?? g.count ?? 0 })).sort((a, b) => b.value - a.value)
  const count = (v) => (Number.isInteger(v) ? v : v.toFixed(1))

  return (
    <div className="st" ref={m.exportStatisticsRef}>
      <div className="range" role="group" aria-label="看多久">
        {RANGES.map((n) => (
          <button key={n} type="button" aria-pressed={!custom && range === n} onClick={() => pick(n)}>
            {n} 天
          </button>
        ))}
        <button type="button" aria-pressed={custom} onClick={() => setCustom((v) => !v)}>
          自訂
        </button>
        {custom ? (
          <span className="custom">
            <input type="date" value={m.rangeStartDate} aria-label="開始日期" onChange={(e) => m.setRangeStartDate(e.target.value)} />
            至
            <input type="date" value={m.rangeEndDate} aria-label="結束日期" onChange={(e) => m.setRangeEndDate(e.target.value)} />
            <button type="button" className="go" onClick={() => m.loadMultiDayDataByRange(m.rangeStartDate, m.rangeEndDate)}>
              套用
            </button>
          </span>
        ) : null}
        {loadingMultiDay ? <span className="busy">讀取中…</span> : null}
      </div>

      {!stat ? (
        <p className="blank">{loadingMultiDay ? '正在讀這段期間的班機…' : '這段期間沒有資料。'}</p>
      ) : (
        <div className="cards">
          <section className="card c-facts">
            <dl className="facts">
              <div>
                <dt>平均每天</dt>
                <dd>
                  {one(stat.mean)}
                  <i>班</i>
                </dd>
                <small>
                  {md(days[0].date)}–{md(days[days.length - 1].date)}，共 {days.length} 天
                </small>
              </div>
              <div className="up">
                <dt>最多的一天</dt>
                <dd>
                  {stat.top}
                  <i>班</i>
                </dd>
                <small>
                  {md(stat.best.date)}（{WD[dow(stat.best.date)]}）
                </small>
              </div>
              <div>
                <dt>最少的一天</dt>
                <dd>
                  {stat.low}
                  <i>班</i>
                </dd>
                <small>
                  {md(stat.worst.date)}（{WD[dow(stat.worst.date)]}）
                </small>
              </div>
              <div>
                <dt>最忙的星期</dt>
                <dd>星期{WD[stat.wBest]}</dd>
                <small>平均 {one(stat.wTop)} 班</small>
              </div>
            </dl>
          </section>

          <section className="card c-days">
            <div className="hd">
              <h2>每天幾班</h2>
              <p className="sum">
                最多 <b>{stat.top}</b> 班，最少 <b>{stat.low}</b> 班
              </p>
            </div>
            <div className={`cols${dense ? ' dense' : ''}`}>
              {days.map((d, k) => (
                <div key={d.date} className={`c${isWeekend(d.date) ? ' we' : ''}${d === stat.best ? ' top' : ''}`} style={{ '--h': stat.ns[k] / stat.top, '--k': k }} title={`${md(d.date)}（${WD[dow(d.date)]}）${stat.ns[k]} 班`}>
                  <i />
                  <b>{stat.ns[k]}</b>
                </div>
              ))}
              <div className="avg" style={{ '--h': stat.mean / stat.top }}>
                <span>平均 {one(stat.mean)}</span>
              </div>
            </div>
            <div className="xs">
              {days.map((d, i) => (
                <span key={d.date} className={isWeekend(d.date) ? 'we' : ''}>
                  {i % every === 0 ? md(d.date) : ''}
                </span>
              ))}
            </div>
            <p className="key">
              <span>
                <i />
                平日
              </span>
              <span>
                <i className="w" />
                週末
              </span>
              <span>
                <i className="p" />
                最多的一天
              </span>
            </p>
          </section>

          <section className="card c-week">
            <div className="hd">
              <h2>星期幾最忙</h2>
              <p className="sum">
                星期{WD[stat.wBest]}平均 <b>{one(stat.wTop)}</b> 班
              </p>
            </div>
            <div className="cols">
              {WEEK_ORDER.map((w, k) => (
                <div key={w} className={`c${[0, 6].includes(w) ? ' we' : ''}${w === stat.wBest ? ' top' : ''}`} style={{ '--h': stat.wTop ? stat.byWd[w] / stat.wTop : 0, '--k': k * 3 }}>
                  <i />
                  <b>{stat.byWd[w] ? one(stat.byWd[w]) : '—'}</b>
                </div>
              ))}
            </div>
            <div className="xs big">
              {WEEK_ORDER.map((w) => (
                <span key={w} className={[0, 6].includes(w) ? 'we' : ''}>
                  {WD[w]}
                </span>
              ))}
            </div>
            <dl className="trio">
              {(m.dayTypeDisplayData || []).map((t) => (
                <div key={t.type}>
                  <dt>
                    {t.type.replace(/（.*）/, '')}
                    <small>{t.days} 天</small>
                  </dt>
                  <dd>
                    {one(t.average)}
                    <i>班</i>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card c-avg">
            <div className="hd">
              <h2>平均一天的壓力</h2>
              <p className="sum">
                {peak ? (
                  <>
                    最忙 <b>{peak.label}</b>，平均 {count(peak.flightCount)} 班
                  </>
                ) : (
                  '這個區間沒有航班'
                )}
              </p>
            </div>
            <div className="seg" role="group" aria-label="看哪一班">
              {storeShifts.map((sh) => (
                <button key={sh.key} type="button" aria-pressed={sh.key === stressShift} onClick={() => m.setStressShift(sh.key)}>
                  <b>{sh.label}</b>
                  <small>
                    {formatMinAsHHMM(sh.startMin)}–{formatMinAsHHMM(sh.endMin)}
                  </small>
                </button>
              ))}
            </div>
            <div className="cols dense tight">
              {tickSeries.map((s, k) => (
                <div key={s.startMin} className={`c${peak && s.startMin === peak.startMin ? ' top' : ''}`} style={{ '--h': summary?.maxScore ? s.score / summary.maxScore : 0, '--k': k / 2 }} title={`${s.label} 平均 ${count(s.flightCount)} 班`}>
                  <i />
                  <b>{count(s.flightCount)}</b>
                </div>
              ))}
            </div>
            <div className="xs tight">
              {tickSeries.map((s) => (
                <span key={s.startMin}>{s.startMin % 120 === 0 ? `${pad(s.startMin / 60)}:00` : ''}</span>
              ))}
            </div>
            <p className="key">
              <span>
                <i />
                從那一刻起 60 分鐘的平均登機壓力
              </span>
              <span>
                <i className="p" />
                最忙的一小時
              </span>
            </p>
          </section>

          <section className="card c-heat">
            <div className="hd">
              <h2>什麼時候有班機</h2>
              <p className="sum">一列一天、一格一小時，顏色越深班越多</p>
            </div>
            <div className="heat">
              <table>
                <thead>
                  <tr>
                    <th />
                    {Array.from({ length: H1 - H0 + 1 }, (_, i) => (
                      <th key={i}>{(H0 + i) % 3 === 0 ? pad(H0 + i) : ''}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days
                    .map((d, i) => ({ d, row: stat.heat[i] }))
                    .reverse()
                    .map(({ d, row }) => (
                      <tr key={d.date}>
                        <td className={isWeekend(d.date) ? 'we' : ''}>
                          {md(d.date)} {WD[dow(d.date)]}
                        </td>
                        {row.slice(H0, H1 + 1).map((v, i) => (
                          <td key={i} style={{ '--v': v / stat.hTop }} className={v / stat.hTop > 0.55 ? 'hot' : ''}>
                            {v || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="scale">
              少<i />多　滑到某一天可以看每小時的班數
            </p>
          </section>

          <section className="card c-gates">
            <div className="hd">
              <h2>哪個登機門最常用</h2>
            </div>
            <p className="sub">平均每天幾班</p>
            <Rank rows={gates} gates />
          </section>

          <section className="card c-top">
            <div className="two">
              <div>
                <h3>去哪裡的最多</h3>
                <Rank rows={m.statsByDestination || []} />
              </div>
              <div>
                <h3>哪家航空最多</h3>
                <Rank rows={m.statsByAirline || []} />
              </div>
            </div>
          </section>

          <section className="card c-cmp">
            <div className="hd">
              <h2>跟之前比</h2>
              <p className="sum">平均每天幾班</p>
              <button type="button" className="load" disabled={m.loadingHistorical} onClick={() => m.loadHistoricalComparisonData()}>
                {m.loadingHistorical ? '讀取中…' : '載入上週／上月／去年同期'}
              </button>
            </div>
            <dl className="cmp">
              {[
                ['這段期間', hist?.current, true],
                ['上週同期', hist?.lastWeek],
                ['上月同期', hist?.lastMonth],
                ['去年同期', hist?.lastYear],
              ].map(([label, p, current]) => (
                <div key={label}>
                  <dt>
                    {label}
                    <small>{p?.dateRange || (current ? '' : '還沒載入')}</small>
                  </dt>
                  <dd>
                    {p?.averagePerDay != null ? one(p.averagePerDay) : '—'}
                    <i>班</i>
                  </dd>
                  {current ? (
                    <em />
                  ) : p?.change != null ? (
                    <em className={p.change > 0 ? 'up' : p.change < 0 ? 'down' : ''}>
                      {p.change > 0 ? '＋' : p.change < 0 ? '−' : '±'}
                      {Math.abs(p.change)}%
                    </em>
                  ) : (
                    <em>{p?.days ? '資料不足' : ''}</em>
                  )}
                </div>
              ))}
            </dl>
            <p className="sub">百分比是那段期間比這段期間多或少幾成。</p>
          </section>
        </div>
      )}
    </div>
  )
}
