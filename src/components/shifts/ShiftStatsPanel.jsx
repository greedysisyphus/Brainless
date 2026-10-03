import { useShiftStats } from './useShiftPanels'
import { CwBadge, CwCard, CwEmptyState, CwSelect, CwTableShell, CwTd, CwTh, CwThead } from '../studio/ui'
import { getStoreName, getStoreShortName } from '../../pages/shifts/shiftConstants'
import { getLeaveDisplay, getShiftDisplay } from '../../pages/shifts/shiftVocab'

/** 0 印成淡點：整張表六成是 0 的時候，把 0 印出來只會蓋掉真正的數字。 */
function Num({ value, strong = false }) {
  if (!value) return <span className="text-[var(--cw-text-muted)]/35">·</span>
  return <span className={strong ? 'font-bold text-[var(--cw-text)]' : undefined}>{value}</span>
}
import { PersonOptionGroups, StoreFilterChips, shiftSwatchStyle } from './shiftUi'

/** 可排序的欄位標題。方向用箭頭表示，目前排序欄加粗。 */
function SortableTh({ sortKey, sort, onSort, className = '', title, children }) {
  const active = sort.key === sortKey
  return (
    <CwTh className={`p-0 ${className}`} title={title}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`cw-touch-target flex w-full items-center gap-1 px-4 py-3 hover:bg-[var(--cw-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)] ${
          className.includes('text-right') ? 'justify-end' : 'justify-start'
        } ${active ? 'font-bold text-[var(--cw-text)]' : ''}`}
      >
        {children}
        <span className={active ? 'text-[var(--cw-brand)]' : 'opacity-25'}>
          {active && sort.dir === 'asc' ? '▲' : '▼'}
        </span>
      </button>
    </CwTh>
  )
}

/**
 * 比例條。寬度一律以 total 為分母，跟旁邊印的百分比同一個基準
 * （先前以最大值為分母，會出現「35%」卻畫滿整條的矛盾）。
 */
/**
 * 一列裡的班別比重。數字欄回答「幾天」，這條回答「他是早班的人還是晚班的人」——
 * 掃一整欄的形狀比讀一整欄的數字快得多。長度按最忙的人歸一化，所以也看得出誰班少。
 */
function ShiftMixBar({ summary, codes, vocabMonth, max }) {
  const segments = codes
    .map((code) => ({ code, count: summary.byShift[code] || 0 }))
    .filter((seg) => seg.count > 0)
  if (!segments.length) return <span className="text-[var(--cw-text-muted)]">·</span>
  const label = segments
    .map((seg) => `${getShiftDisplay(vocabMonth, seg.code)?.label ?? seg.code} ${seg.count}`)
    .join('、')
  return (
    <span
      className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--cw-border)]"
      style={{ maxWidth: `${Math.max(12, (summary.workDays / max) * 100)}%` }}
      title={label}
      aria-label={label}
    >
      {segments.map((seg) => (
        <span
          key={seg.code}
          className="h-full"
          style={{
            width: `${(seg.count / summary.workDays) * 100}%`,
            background: getShiftDisplay(vocabMonth, seg.code)?.fg || 'var(--cw-text-muted)',
          }}
        />
      ))}
    </span>
  )
}

/** 同一份資料的兩種看法，不是兩個篩選條件，所以用分段切換而不是核取方塊。 */
function SegmentedToggle({ value, onChange, options }) {
  return (
    <div
      role="tablist"
      className="inline-flex h-11 items-stretch rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-mega-surface)] p-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`flex min-h-0 items-center rounded-[var(--cw-radius-sm)] px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)] ${
              active
                ? 'bg-[var(--cw-surface)] text-[var(--cw-text)] shadow-[var(--cw-shadow-sm)]'
                : 'text-[var(--cw-text-muted)] hover:text-[var(--cw-text)]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * 姓名底下那行店別。跨店的人只寫店名不寫天數——
 * 「他主要在一店、偶爾去 D13」這件事看店名順序就夠了，掛上天數會把整欄變成第二張表。
 */
function storeTrail(summary) {
  const stores = Object.entries(summary.byStore || {})
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => getStoreShortName(code))
  return stores.join(' · ')
}

function Bar({ value, total, color }) {
  const percent = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--cw-bg)] ring-1 ring-inset ring-[var(--cw-border)]">
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.max(value > 0 ? 3 : 0, percent)}%`, background: color }}
      />
    </div>
  )
}

export function ShiftStatsPanel({ book, peopleSettings, selectedPersonKey, onSelectPerson }) {
  const {
    monthFilter,
    setMonthFilter,
    metricView,
    setMetricView,
    partnerView,
    setPartnerView,
    storeFilter,
    setStoreFilter,
    sort,
    toggleSort,
    monthKeys,
    excludeKeys,
    distribution,
    summaries,
    storeLoad,
    partners,
    shiftCodes,
    leaveCodes,
    vocabMonth,
    rankedPartners,
    partnerMax,
    peopleGroups,
    visibleSummaries,
    distributionCodes,
    shownShiftCodes,
    shownLeaveCodes,
    hasSupport,
    maxWorkDays,
    selectedSummary,
  } = useShiftStats({ book, peopleSettings, selectedPersonKey })

  if (!book.months.length) {
    return (
      <CwEmptyState
        title="還沒有可統計的班表"
        description="匯入至少一份班表後，這裡會出現班別分布、崗位分布與搭班頻率。"
      />
    )
  }

  return (
    <div className="space-y-5">
      <CwCard
        title="統計範圍"
        subtitle="調店與 T3 支援都算在實際上班的那家店，統計跟著人走而不是跟著店走。"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <CwSelect
            label="月份"
            name="stats-month"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
          >
            <option value="all">全部月份</option>
            {book.monthKeys.map((key) => (
              <option key={key} value={key}>
                {key.replace('-', ' 年 ')} 月
              </option>
            ))}
          </CwSelect>
          <div className="flex items-end text-xs text-[var(--cw-text-muted)]">
            {excludeKeys.length ? `已排除 ${excludeKeys.length} 人不列入統計` : '所有同事都列入統計'}
          </div>
        </div>
      </CwCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <CwCard title="班別分布" subtitle={`合計 ${distribution.total} 個班`}>
          {distributionCodes.length === 0 ? (
            <p className="text-sm text-[var(--cw-text-muted)]">這個範圍沒有排到班。</p>
          ) : null}
          <ul className="space-y-3">
            {distributionCodes.map((code) => {
              const count = distribution.counts[code] || 0
              const percent = distribution.total
                ? Math.round((count / distribution.total) * 100)
                : 0
              return (
                <li key={code}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span
                      className="rounded-[var(--cw-radius-sm)] px-2 py-0.5 text-xs font-semibold"
                      style={shiftSwatchStyle(code, vocabMonth)}
                    >
                      {getShiftDisplay(vocabMonth, code)?.label ?? code}
                    </span>
                    <span className="text-[var(--cw-text-muted)]">
                      {count} 個 · {percent}%
                    </span>
                  </div>
                  <Bar
                    value={count}
                    total={distribution.total}
                    color={getShiftDisplay(vocabMonth, code)?.fg || 'var(--cw-brand)'}
                  />
                </li>
              )
            })}
          </ul>
          {distribution.unknownSupport ? (
            <p className="mt-3 text-xs text-[var(--cw-text-muted)]">
              另有 {distribution.unknownSupport} 個支援班紙本沒寫班別（只寫 T3／D7），未計入以上分布。
            </p>
          ) : null}
        </CwCard>

        <CwCard title="各店出勤" subtitle="人次含跨店支援進來的班。">
          <ul className="space-y-3">
            {storeLoad.map((store) => (
              <li
                key={store.storeCode}
                className="flex items-baseline justify-between gap-3 rounded-[var(--cw-radius)] border border-[var(--cw-border)] px-3 py-2"
              >
                <span className="font-semibold text-[var(--cw-text)]">{store.storeName}</span>
                <span className="shrink-0 text-sm tabular-nums text-[var(--cw-text-muted)]">
                  <span className="font-bold text-[var(--cw-text)]">{store.shifts}</span> 人次 ·{' '}
                  {store.headcount} 人
                  {store.supportShifts ? ` · 支援 ${store.supportShifts}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </CwCard>
      </div>

      <CwCard
        title={selectedSummary ? `${selectedSummary.name} 的搭班頻率` : '搭班頻率'}
        subtitle={
          partnerView === 'rate'
            ? '百分比是「你上班的日子裡有幾成跟他同店」，逐月算完再平均——只同期一個月的人不會被同期五個月的人蓋掉。'
            : '實際重疊時數，依各店班別時間累加——同期越久累積越多，看的是總相處時間。'
        }
        actions={
          // 選單一直在。選完就換成結果的話，想看下一個人只能重整頁面。
          <div className="flex flex-wrap items-end gap-3">
            <SegmentedToggle
              value={partnerView}
              onChange={setPartnerView}
              options={[
                { value: 'rate', label: '每月平均' },
                { value: 'hours', label: '總時數' },
              ]}
            />
            <CwSelect
              label="選一位同事"
              name="partner-person"
              className="min-w-0 flex-1 sm:min-w-[12rem] sm:flex-none"
              value={selectedPersonKey || ''}
              onChange={(event) => onSelectPerson(event.target.value || null)}
            >
              <option value="">請選擇同事</option>
              <PersonOptionGroups groups={peopleGroups} />
            </CwSelect>
          </div>
        }
      >
        {!selectedPersonKey ? (
          <p className="text-sm text-[var(--cw-text-muted)]">
            選一位同事，或直接點下面表格裡的姓名。
          </p>
        ) : partners.length === 0 ? (
          <p className="text-sm text-[var(--cw-text-muted)]">這個範圍內沒有搭到班的紀錄。</p>
        ) : (
          <div>
            {/* 單位放表頭，每一列就只剩數字；欄寬固定，數字才會上下對齊 */}
            <div className="grid grid-cols-[minmax(3rem,1fr)_3rem_4rem] sm:grid-cols-[minmax(0,1fr)_3.25rem_4.25rem_3rem_3.5rem] gap-x-3 border-b border-[var(--cw-border)] pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
              <span>同事</span>
              <span className="text-right">搭班</span>
              <span className="text-right">時數</span>
              <span className="hidden text-right sm:block">天數</span>
              <span className="hidden text-right sm:block">同班別</span>
            </div>
            <ul className="divide-y divide-[var(--cw-border)]">
              {rankedPartners.slice(0, 15).map((partner) => {
                const lead = partnerView === 'hours' ? 'hours' : 'rate'
                return (
                  <li key={partner.personKey} className="py-2">
                    <div className="grid grid-cols-[minmax(3rem,1fr)_3rem_4rem] sm:grid-cols-[minmax(0,1fr)_3.25rem_4.25rem_3rem_3.5rem] items-baseline gap-x-3 text-sm tabular-nums">
                      <button
                        type="button"
                        className="truncate text-left font-semibold text-[var(--cw-text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
                        onClick={() => onSelectPerson(partner.personKey)}
                      >
                        {partner.name}
                      </button>
                      <span
                        className={`text-right ${lead === 'rate' ? 'font-bold text-[var(--cw-text)]' : 'text-[var(--cw-text-muted)]'}`}
                      >
                        {Math.round(partner.monthlyRate * 100)}%
                      </span>
                      <span
                        className={`text-right ${lead === 'hours' ? 'font-bold text-[var(--cw-text)]' : 'text-[var(--cw-text-muted)]'}`}
                        title={
                          partner.overlapMinutes === 0 && partner.days > 0
                            ? '那天兩人都有班，但一個下班另一個才上班，時間沒有重疊'
                            : undefined
                        }
                      >
                        {/* 0 小時不是壞掉：中班 14:00 下班、晚班 14:00 上班，剛好接在一起而已 */}
                        {partner.overlapMinutes === 0 && partner.days > 0 ? '交班' : partner.overlapHours}
                      </span>
                      <span className="hidden text-right text-[var(--cw-text-muted)] sm:block">
                        {partner.days}
                      </span>
                      <span className="hidden text-right text-[var(--cw-text-muted)] sm:block">
                        {partner.sameShiftDays}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Bar
                        value={partnerView === 'hours' ? partner.overlapMinutes : partner.monthlyRate}
                        total={partnerMax}
                        color="var(--cw-text-muted)"
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {selectedSummary?.positions?.length ? (
          <div className="mt-5 border-t border-[var(--cw-border)] pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">
              {selectedSummary.name} 的崗位分布（崗位名稱各店不同）
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedSummary.positions.map((position) => (
                <CwBadge key={`${position.storeCode}-${position.position}`}>
                  {getStoreName(position.storeCode)}·{position.label} {position.count}
                </CwBadge>
              ))}
            </div>
          </div>
        ) : null}
      </CwCard>

      <CwCard
        title="每個人的班"
        subtitle="點姓名可切換上面的搭班分析對象。"
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <StoreFilterChips
              groups={peopleGroups}
              value={storeFilter}
              onChange={setStoreFilter}
              total={summaries.length}
            />
            <SegmentedToggle
              value={metricView}
              onChange={setMetricView}
              options={[
                { value: 'shift', label: '班別' },
                { value: 'leave', label: '假別' },
              ]}
            />
          </div>
        }
      >
        <CwTableShell>
          <CwThead>
            <tr>
              <SortableTh
                sortKey="name"
                sort={sort}
                onSort={toggleSort}
                className="sticky left-0 z-20 bg-[var(--cw-mega-surface)]"
              >
                同事
              </SortableTh>
              <SortableTh
                sortKey="workDays"
                sort={sort}
                onSort={toggleSort}
                className="border-l border-[var(--cw-border)] text-right"
              >
                上班
              </SortableTh>
              {metricView === 'shift' ? (
                <>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-semibold text-[var(--cw-text-muted)]"
                  >
                    班別比重
                  </th>
                  {shownShiftCodes.map((code) => (
                    <SortableTh
                      key={code}
                      sortKey={`shift:${code}`}
                      sort={sort}
                      onSort={toggleSort}
                      className="text-right"
                      title={getShiftDisplay(vocabMonth, code)?.label}
                    >
                      {getShiftDisplay(vocabMonth, code)?.short ?? code}
                    </SortableTh>
                  ))}
                  {hasSupport ? (
                    <SortableTh
                      sortKey="supportDays"
                      sort={sort}
                      onSort={toggleSort}
                      className="border-l border-[var(--cw-border)] text-right"
                      title="在別家店上班的班數"
                    >
                      支援
                    </SortableTh>
                  ) : null}
                  <SortableTh
                    sortKey="leaveDays"
                    sort={sort}
                    onSort={toggleSort}
                    className="border-l border-[var(--cw-border)] text-right"
                  >
                    休假
                  </SortableTh>
                </>
              ) : (
                <>
                  <SortableTh
                    sortKey="leaveDays"
                    sort={sort}
                    onSort={toggleSort}
                    className="border-l border-[var(--cw-border)] text-right"
                    title="所有假別加總"
                  >
                    合計
                  </SortableTh>
                  {shownLeaveCodes.map((code) => (
                    <SortableTh
                      key={code}
                      sortKey={`leave:${code}`}
                      sort={sort}
                      onSort={toggleSort}
                      className="whitespace-nowrap text-right"
                      title={getLeaveDisplay(vocabMonth, code)?.label}
                    >
                      {getLeaveDisplay(vocabMonth, code)?.label ?? code}
                    </SortableTh>
                  ))}
                </>
              )}
            </tr>
          </CwThead>
          <tbody>
            {visibleSummaries.map((summary) => (
              <tr
                key={summary.personKey}
                className={
                  summary.personKey === selectedPersonKey
                    ? 'bg-[var(--cw-brand-muted)]'
                    : 'odd:bg-[var(--cw-mega-surface)]'
                }
              >
                <CwTd className="sticky left-0 z-10 bg-inherit">
                  <button
                    type="button"
                    className="cw-touch-target flex flex-col items-start justify-center py-1 text-left hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
                    onClick={() => onSelectPerson(summary.personKey)}
                  >
                    <span className="font-semibold">{summary.name}</span>
                    <span className="text-[11px] font-normal text-[var(--cw-text-muted)]">
                      {storeTrail(summary)}
                    </span>
                  </button>
                </CwTd>
                <CwTd className="border-l border-[var(--cw-border)] text-right">
                  <Num value={summary.workDays} strong />
                </CwTd>
                {metricView === 'shift' ? (
                  <>
                    <CwTd className="w-[180px] min-w-[140px]">
                      <ShiftMixBar
                        summary={summary}
                        codes={shownShiftCodes}
                        vocabMonth={vocabMonth}
                        max={maxWorkDays}
                      />
                    </CwTd>
                    {shownShiftCodes.map((code) => (
                      <CwTd key={code} className="text-right">
                        <Num value={summary.byShift[code]} />
                      </CwTd>
                    ))}
                    {hasSupport ? (
                      <CwTd className="border-l border-[var(--cw-border)] text-right">
                        <Num value={summary.supportDays} />
                      </CwTd>
                    ) : null}
                    <CwTd className="border-l border-[var(--cw-border)] text-right text-[var(--cw-text-muted)]">
                      <Num value={summary.leaveDays} />
                    </CwTd>
                  </>
                ) : (
                  <>
                    <CwTd className="border-l border-[var(--cw-border)] text-right">
                      <Num value={summary.leaveDays} strong />
                    </CwTd>
                    {shownLeaveCodes.map((code) => (
                      <CwTd key={code} className="text-right text-[var(--cw-text-muted)]">
                        <Num value={summary.byLeave[code]} />
                      </CwTd>
                    ))}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </CwTableShell>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-[var(--cw-text-muted)]">
          <p>
            {metricView === 'shift'
              ? '「支援」是去別家店上的班，已計入上班天數。'
              : '「排班日」是店長的排班日，不上班，計入休假。欄位依匯入檔的假別表產生，沒人請過的假別不列出來。'}
          </p>
          {storeFilter !== 'all' ? (
            <p>
              只看 {getStoreName(storeFilter)}（{visibleSummaries.length} 人）；
              在兩家店都有班的人兩邊都會出現。
            </p>
          ) : null}
        </div>
      </CwCard>
    </div>
  )
}

export default ShiftStatsPanel
