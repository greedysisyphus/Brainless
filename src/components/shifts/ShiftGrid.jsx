import { useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { CwCard, CwEmptyState } from '../studio/ui'
import { WEEKDAY_LABELS } from '../../pages/shifts/shiftConstants'
import { chunkIntoWeeks, formatDateShort, parseDateKey, formatTimestamp } from '../../pages/shifts/shiftModel'
import { useIsNarrow } from '../../hooks/useIsNarrow'
import { DEFAULT_VIEW_MODE, VIEW_MODES, ShiftCell, ShiftLegend, describeEntry } from './shiftUi'

function buildDateList(month) {
  const dates = Object.keys(month?.days || {}).sort()
  if (dates.length) return dates
  const [year, monthNum] = String(month?.monthKey || '').split('-').map(Number)
  if (!year || !monthNum) return []
  const total = month?.daysInMonth || new Date(year, monthNum, 0).getDate()
  return Array.from(
    { length: total },
    (_, i) => `${month.monthKey}-${String(i + 1).padStart(2, '0')}`
  )
}

function rowTotals(entriesByDate, dates) {
  let work = 0
  let leave = 0
  dates.forEach((date) => {
    const entry = entriesByDate?.[date]
    if (entry?.kind === 'WORK') work += 1
    else if (entry?.kind === 'LEAVE') leave += 1
  })
  return { work, leave }
}

/** 單一店別的完整月班表，與紙本一樣是「人×日」的格子。 */
export function ShiftGrid({ month, highlightDate, highlightPersonKey, onSelectPerson }) {
  const [view, setView] = useState(DEFAULT_VIEW_MODE)
  // title 在手機上不存在，所以格子要能點開看細節
  const [detail, setDetail] = useState(null)
  const dates = useMemo(() => buildDateList(month), [month])

  // 30 欄在手機上只看得到 2.5 天，所以窄螢幕預設一次一週
  const isNarrow = useIsNarrow()
  const [span, setSpan] = useState('month')
  const [weekIndex, setWeekIndex] = useState(0)
  const weeks = useMemo(() => chunkIntoWeeks(dates), [dates])

  useEffect(() => {
    setSpan(isNarrow ? 'week' : 'month')
  }, [isNarrow])

  // 換月或換店時，把週指標帶到含選取日的那一週
  useEffect(() => {
    const index = weeks.findIndex((week) => week.includes(highlightDate))
    setWeekIndex(index >= 0 ? index : 0)
  }, [weeks, highlightDate])

  const weekMode = span === 'week' && weeks.length > 0
  const safeWeekIndex = Math.min(Math.max(weekIndex, 0), Math.max(weeks.length - 1, 0))
  const visibleDates = weekMode ? weeks[safeWeekIndex] || [] : dates

  const reviewCount = useMemo(() => {
    if (!month) return 0
    return Object.values(month.entries || {}).reduce(
      (sum, byDate) =>
        sum +
        Object.values(byDate).filter(
          (entry) =>
            entry?.needsReview ||
            // 連字都認不出來的格子
            entry?.kind === 'UNKNOWN' ||
            // 判出「有上班」卻判不出班別的格子，同樣要人去對原圖
            (entry?.kind === 'WORK' && !entry.shift && !entry.isSupport)
        ).length,
      0
    )
  }, [month])

  /**
   * 當日本店人力，定義比照班表的 Total 列：上班且**不是**去別店支援。
   * 同時把表上寫的 Total 帶出來對照 —— 對不上就代表那天一定有格子判錯。
   */
  const dailyTotals = useMemo(() => {
    if (!month) return {}
    const totals = {}
    dates.forEach((date) => {
      const counted = (month.people || []).reduce((sum, person) => {
        const entry = month.entries?.[person.key]?.[date]
        return sum + (entry?.kind === 'WORK' && !entry.isSupport ? 1 : 0)
      }, 0)
      const day = month.days?.[date]
      const stated = day?.total ?? null
      const mismatch = stated !== null && stated !== counted
      // 對不上時，把那一欄最沒把握的格子點出來 —— 錯的多半就在那幾格。
      // confidence 只是同一批判讀內的相對刻度，所以這裡**只做欄內排序**，
      // 不設固定門檻（跨檔比大小沒有意義）。
      const suspects = mismatch
        ? (month.people || [])
            .map((person) => ({ person, entry: month.entries?.[person.key]?.[date] }))
            .filter(({ entry }) => entry && (entry.needsReview || entry.confidence !== null))
            .sort((a, b) => {
              // needsReview 一律優先，其餘依欄內信心度由低到高
              if (!!b.entry.needsReview !== !!a.entry.needsReview) {
                return a.entry.needsReview ? -1 : 1
              }
              return (a.entry.confidence ?? 1) - (b.entry.confidence ?? 1)
            })
            .slice(0, 3)
            .map(({ person, entry }) =>
              entry.confidence === null
                ? person.name
                : `${person.name}（信心 ${Math.round(entry.confidence * 100)}%）`
            )
        : []
      totals[date] = { counted, stated, mismatch, suspects, source: day?.totalSource || '' }
    })
    return totals
  }, [month, dates])

  const totalMismatches = useMemo(
    () => dates.filter((date) => dailyTotals[date]?.mismatch),
    [dates, dailyTotals]
  )

  if (!month) {
    return (
      <CwEmptyState
        title="這個月份還沒有這家店的班表"
        description="到「匯入」分頁上傳該店的 JSON 匯出檔後就會出現。"
      />
    )
  }

  return (
    <CwCard
      title={month.storeName}
      subtitle={`${month.year} 年 ${month.month} 月 · 營業時間 ${month.businessHours?.open || '—'}–${
        month.businessHours?.close || '—'
      }`}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--cw-text-muted)]">顯示</span>
          <div className="flex items-center gap-1 rounded-[var(--cw-radius-pill)] border border-[var(--cw-border-strong)] p-1">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                aria-pressed={view === mode.key}
                onClick={() => setView(mode.key)}
                title={mode.hint}
                className={`cw-touch-target rounded-[var(--cw-radius-pill)] px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)] ${
                  view === mode.key
                    ? 'bg-[var(--cw-fg-emphasis)] text-[var(--cw-fg-emphasis-contrast)]'
                    : 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {weekMode ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="前一週"
              disabled={safeWeekIndex === 0}
              onClick={() => setWeekIndex((prev) => Math.max(prev - 1, 0))}
              className="cw-touch-target grid h-11 w-11 place-items-center rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] text-[var(--cw-text)] disabled:opacity-35 hover:bg-[var(--cw-mega-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="min-w-[132px] text-center text-sm font-semibold tabular-nums text-[var(--cw-text)]">
              {visibleDates.length
                ? `${formatDateShort(visibleDates[0])}–${formatDateShort(
                    visibleDates[visibleDates.length - 1]
                  )}`
                : ''}
            </span>
            <button
              type="button"
              aria-label="後一週"
              disabled={safeWeekIndex >= weeks.length - 1}
              onClick={() => setWeekIndex((prev) => Math.min(prev + 1, weeks.length - 1))}
              className="cw-touch-target grid h-11 w-11 place-items-center rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] text-[var(--cw-text)] disabled:opacity-35 hover:bg-[var(--cw-mega-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-[var(--cw-text-muted)]">
            整月 {dates.length} 天
          </span>
        )}

        <div className="flex items-center gap-1 rounded-[var(--cw-radius-pill)] border border-[var(--cw-border-strong)] p-1">
          {[
            { key: 'week', label: '一週' },
            { key: 'month', label: '整月' },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={span === option.key}
              onClick={() => setSpan(option.key)}
              className={`cw-touch-target rounded-[var(--cw-radius-pill)] px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)] ${
                span === option.key
                  ? 'bg-[var(--cw-fg-emphasis)] text-[var(--cw-fg-emphasis-contrast)]'
                  : 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {detail ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--cw-radius)] border border-[var(--cw-brand)]/35 bg-[var(--cw-brand-muted)] px-3 py-2 text-sm">
          <span className="font-bold text-[var(--cw-text)]">{detail.person.name}</span>
          <span className="text-[var(--cw-text-muted)]">{formatDateShort(detail.date)}</span>
          <span className="text-[var(--cw-text)]">{detail.text}</span>
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="ml-auto cw-touch-target px-2 text-xs font-semibold text-[var(--cw-brand-strong)] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
          >
            關閉
          </button>
        </div>
      ) : (
        <p className="mb-3 text-xs text-[var(--cw-text-muted)]">
          {VIEW_MODES.find((mode) => mode.key === view)?.hint}。點任一格看班別、時間與崗位。
        </p>
      )}

      <div
        className="-mx-5 overflow-x-auto border-y border-[var(--cw-border)] sm:mx-0 sm:rounded-[var(--cw-radius)] sm:border-x"
        style={{ WebkitOverflowScrolling: 'touch', maxHeight: '70vh' }}
      >
        <table className="border-collapse text-sm">
          <caption className="sr-only">
            {month.storeName} {month.year} 年 {month.month} 月班表：每一列是一位同事，每一欄是一天
          </caption>
          <thead>
            <tr className="bg-[var(--cw-mega-surface)]">
              <th
                scope="col"
                className="sticky left-0 top-0 z-30 min-w-[72px] border-b border-r border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)] sm:min-w-[104px] sm:px-3"
              >
                同事
              </th>
              {visibleDates.map((date) => {
                const day = month.days?.[date]
                const weekday = parseDateKey(date)?.getDay()
                const isWeekend = day?.isWeekend ?? (weekday === 0 || weekday === 6)
                return (
                  <th
                    key={date}
                    scope="col"
                    className={`sticky top-0 z-20 min-w-[32px] border-b border-l border-[var(--cw-border)] px-0.5 py-1.5 text-center text-[11px] font-semibold sm:min-w-[40px] sm:px-1 ${
                      isWeekend
                        ? 'bg-[var(--cw-mega-surface)] text-[var(--cw-brand-strong)]'
                        : 'bg-[var(--cw-surface)] text-[var(--cw-text-muted)]'
                    }`}
                  >
                    <div
                      className={`mx-auto grid h-5 w-5 place-items-center text-xs ${
                        date === highlightDate
                          ? 'rounded-full bg-[var(--cw-brand)] font-bold text-white'
                          : ''
                      }`}
                    >
                      {Number(date.slice(8, 10))}
                    </div>
                    <div className="font-normal opacity-70">
                      {WEEKDAY_LABELS[weekday] ?? ''}
                    </div>
                    {day?.note ? (
                      <div
                        className="truncate text-[10px] font-semibold text-[var(--cw-brand)]"
                        title={day.note}
                      >
                        節
                      </div>
                    ) : null}
                  </th>
                )
              })}
              {weekMode ? null : (
                <th
                  scope="col"
                  className="sticky top-0 z-20 min-w-[64px] border-b border-l border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-2 py-1.5 text-center text-[11px] font-semibold uppercase text-[var(--cw-text-muted)]"
                >
                  <div>上班</div>
                  <div className="font-normal opacity-70">休假</div>
                  <div className="text-[10px] font-normal opacity-60">整月</div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {(month.people || []).map((person) => {
              const entriesByDate = month.entries?.[person.key] || {}
              const totals = rowTotals(entriesByDate, dates)
              const selected = person.key === highlightPersonKey
              return (
                <tr
                  key={person.key}
                  className={selected ? 'bg-[var(--cw-brand-muted)]/50' : undefined}
                >
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 border-b border-r border-[var(--cw-border)] px-2 py-1.5 text-left text-sm font-semibold sm:px-3 ${
                      selected
                        ? 'bg-[var(--cw-brand-muted)] text-[var(--cw-brand-strong)]'
                        : 'bg-[var(--cw-surface)] text-[var(--cw-text)]'
                    }`}
                  >
                    <button
                      type="button"
                      className="cw-touch-target flex w-full max-w-[68px] items-center py-2 text-left hover:underline sm:max-w-[120px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
                      onClick={() => onSelectPerson?.(person.key)}
                      title={person.placeholder ? `${person.name}（匯出檔的支援列，非個人）` : person.name}
                    >
                      <span className="truncate">{person.name}</span>
                      {person.placeholder ? (
                        <span className="ml-1 text-[10px] font-normal text-[var(--cw-text-muted)]">
                          列
                        </span>
                      ) : null}
                    </button>
                  </th>
                  {visibleDates.map((date) => {
                    const weekday = parseDateKey(date)?.getDay()
                    const isWeekend = month.days?.[date]?.isWeekend ?? (weekday === 0 || weekday === 6)
                    const entry = entriesByDate[date]
                    return (
                      <td
                        key={date}
                        className={`border-b border-l border-[var(--cw-border)] p-0 text-center ${
                          isWeekend ? 'bg-[var(--cw-mega-surface)]' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
                          onClick={() =>
                            setDetail(
                              entry
                                ? { date, person, text: describeEntry(entry, month) }
                                : null
                            )
                          }
                          title={describeEntry(entry, month) || undefined}
                          aria-label={`${person.name} ${date} ${describeEntry(entry, month) || '無班'}`}
                        >
                          <ShiftCell entry={entry} month={month} view={view} />
                        </button>
                      </td>
                    )
                  })}
                  {weekMode ? null : (
                    <td className="border-b border-l border-[var(--cw-border-strong)] px-2 py-1 text-center text-[11px] tabular-nums text-[var(--cw-text-muted)]">
                      <span className="font-semibold text-[var(--cw-text)]">{totals.work}</span>
                      <span className="opacity-60"> · {totals.leave}</span>
                    </td>
                  )}
                </tr>
              )
            })}
            <tr className="border-t-2 border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)]">
              <th
                scope="row"
                className="sticky left-0 z-10 border-r border-t-2 border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-2 py-2 text-left text-xs font-semibold uppercase text-[var(--cw-text-muted)] sm:px-3"
              >
                本店人力
              </th>
              {visibleDates.map((date) => {
                const totals = dailyTotals[date] || { counted: 0, stated: null, mismatch: false }
                return (
                  <td
                    key={date}
                    className={`border-l border-t-2 border-[var(--cw-border-strong)] px-1 py-2 text-center text-[11px] font-bold tabular-nums ${
                      totals.mismatch
                        ? 'bg-[var(--cw-warning-muted)] text-[var(--cw-warning)]'
                        : 'text-[var(--cw-text)]'
                    }`}
                    title={
                      totals.mismatch
                        ? [
                            `班表 Total 列寫 ${totals.stated} 人，這裡判讀出 ${totals.counted} 人`,
                            totals.source === 'cells'
                              ? 'Total 列本身讀不清楚，是依儲存格校正過的'
                              : totals.source === 'confirmed'
                                ? 'Total 列已經人工確認過'
                                : null,
                            totals.suspects.length
                              ? `最可疑的格子：${totals.suspects.join('、')}`
                              : '這一欄沒有低信心的格子，可能是 Total 列本身判錯',
                          ]
                            .filter(Boolean)
                            .join('。')
                        : undefined
                    }
                  >
                    {totals.counted}
                    {/* 確切數字放 tooltip 與「轉檔資訊」，格子只標「這天對不上」 */}
                    {totals.mismatch ? <span aria-hidden="true"> ⚠</span> : null}
                  </td>
                )
              })}
              {weekMode ? null : (
                <td className="border-l border-t-2 border-[var(--cw-border-strong)]" />
              )}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <ShiftLegend month={month} view={view} />
      </div>

      {month.warnings?.length || reviewCount || totalMismatches.length || month.notes ? (
        <details className="mt-4 rounded-[var(--cw-radius)] border border-[var(--cw-border)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--cw-text-muted)]">
            轉檔資訊
            {month.warnings?.length || reviewCount || totalMismatches.length ? (
              <span className="ml-2 text-[var(--cw-warning)]">
                {(month.warnings?.length || 0) +
                  (reviewCount ? 1 : 0) +
                  (totalMismatches.length ? 1 : 0)}{' '}
                則提醒
              </span>
            ) : null}
          </summary>
          <div className="mt-3 space-y-3 text-xs text-[var(--cw-text-muted)]">
            {month.source?.exportedAt ? (
              <p>轉檔於 {formatTimestamp(month.source.exportedAt)}</p>
            ) : null}
            {month.warnings?.length || reviewCount || totalMismatches.length ? (
              <ul className="space-y-1 text-[var(--cw-text)]">
                {(month.warnings || []).map((warning, index) => (
                  <li key={index}>· {warning}</li>
                ))}
                {totalMismatches.length ? (
                  <li>
                    · 有 {totalMismatches.length} 天的人力對不上班表的 Total 列，那幾天一定有格子判錯：
                    <ul className="mt-1 space-y-0.5 pl-4">
                      {totalMismatches.map((date) => {
                        const totals = dailyTotals[date]
                        return (
                          <li key={date}>
                            {Number(date.slice(8, 10))} 號：表上 {totals.stated} 人、判讀 {totals.counted} 人
                            {totals.suspects.length ? `，最可疑：${totals.suspects.join('、')}` : ''}
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ) : null}
                {reviewCount ? (
                  <li>· 有 {reviewCount} 格判讀信心不足（虛線框），請對照原圖確認後再依賴。</li>
                ) : null}
              </ul>
            ) : null}
            {month.notes ? (
              <div>
                <p className="mb-1 font-semibold text-[var(--cw-text)]">匯出檔備註原文</p>
                <pre className="whitespace-pre-wrap font-sans">{month.notes}</pre>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </CwCard>
  )
}

export default ShiftGrid
