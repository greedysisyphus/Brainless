import { SUPPORT_SHIFT_CODE } from '../../pages/shifts/shiftConstants'
import {
  collectLeaveCodes,
  collectPositionCodes,
  collectShiftCodes,
  describeEntry,
  getLeaveDisplay,
  getPositionDisplay,
  getShiftDisplay,
} from '../../pages/shifts/shiftVocab'

export { describeEntry }

const NEUTRAL_SWATCH = { background: 'transparent', color: 'var(--cw-text-muted)' }

/** 班別色票。已知代碼用本站色，未知代碼（店長新增的）由語彙層配一組中性色。 */
/**
 * 交通車圖示。Heroicons 只有貨車（TruckIcon），那看起來是在送貨不是在接人；
 * 這顆照 Heroicons 的規格自己畫（24 格、線寬 1.5、圓角端點），才跟其他圖示是同一套。
 */
export function ShuttleBusIcon({ className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* 車身：前擋風玻璃斜切 */}
      <path d="M2.75 16.25V8.5a1.75 1.75 0 0 1 1.75-1.75h9.75c.46 0 .9.18 1.24.51l3.75 3.74c.33.33.51.78.51 1.24v4.01" />
      {/* 車底：只在輪子之間畫線，輪子的位置留白 */}
      <path d="M2.75 16.25h1.5m4.5 0h6m4.5 0h1.5" />
      {/* 側窗與前窗 */}
      <path d="M6.25 10.25h3.5v2.5h-3.5zM12.25 10.25h2.4l2.5 2.5h-4.9z" />
      {/* 輪子 */}
      <circle cx="6.75" cy="16.25" r="1.75" />
      <circle cx="17.25" cy="16.25" r="1.75" />
    </svg>
  )
}

export function shiftSwatchStyle(shiftCode, month) {
  if (!shiftCode) return NEUTRAL_SWATCH
  const display = getShiftDisplay(month, shiftCode)
  if (!display) return NEUTRAL_SWATCH
  return { background: display.bg, color: display.fg }
}

export function ShiftPill({ shift, month, children, className = '' }) {
  const display = getShiftDisplay(month, shift)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--cw-radius-sm)] px-2 py-0.5 text-xs font-semibold ${className}`}
      style={shiftSwatchStyle(shift, month)}
    >
      {children ?? display?.label ?? shift ?? '其他'}
    </span>
  )
}

/** 崗位標記。名單類畫面用小標籤而不是小圓點 —— 圓點太小，橘與黃分不出來。 */
export function PositionTag({ month, position }) {
  const display = getPositionDisplay(month, position)
  if (!display || position === 'NONE') return null
  return (
    <span
      className="inline-flex items-center rounded-[var(--cw-radius-sm)] px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ background: display.bg, color: display.fg }}
    >
      {display.label}
    </span>
  )
}

/**
 * 班表格的三種看法。預設 `position`（只有底色，畫面最乾淨）。
 *
 * 註：崗位在三種看法下都會進 `aria-label` 與點開的詳情，
 * 所以讀屏與觸控的路徑一直都在；切換影響的只是「看得見的冗餘」。
 */
export const VIEW_MODES = [
  { key: 'position', label: '崗位', hint: '底色代表崗位，畫面最乾淨' },
  { key: 'positionText', label: '崗位＋字', hint: '底色再加崗位單字，色盲同事也讀得到' },
  { key: 'shift', label: '班別', hint: '底色改成班別，用來掃早晚班分布' },
]

export const DEFAULT_VIEW_MODE = 'position'

/**
 * 班表格的單一格。
 *
 * 底色預設走「崗位」，跟紙本班表一致；格子裡印**班別字 + 崗位字**兩個字。
 * 崗位字不是裝飾 —— 六個崗位色在色盲下無法全部拉開安全距離，
 * 所以顏色只負責掃視速度，那個字才是崗位的正確來源。
 */
export function ShiftCell({ entry, month, view = DEFAULT_VIEW_MODE }) {
  const colorBy = view === 'shift' ? 'shift' : 'position'
  const showInitial = view === 'positionText'
  if (!entry || entry.kind === 'EMPTY') {
    return <span className="block py-2 text-center text-[var(--cw-text-muted)]/40">·</span>
  }

  // 轉檔連字都認不出來。不能讓它掉進下面的上班分支被畫成一個正常的班。
  if (entry.kind === 'UNKNOWN') {
    return (
      <span className="flex h-full items-center justify-center py-2 text-center text-xs font-bold text-[var(--cw-warning)] outline-dashed outline-1 -outline-offset-2 outline-[var(--cw-warning)]">
        {entry.raw?.slice(0, 2) || '?'}
      </span>
    )
  }

  if (entry.kind === 'LEAVE') {
    const leave = getLeaveDisplay(month, entry.leave)
    const isScheduling = entry.leave === 'SCHEDULING'
    return (
      <span
        className={`block py-2 text-center text-xs ${
          isScheduling
            ? 'font-semibold text-[var(--cw-text)]'
            : 'font-normal text-[var(--cw-text-muted)]'
        }`}
      >
        {leave?.marker ?? '休'}
      </span>
    )
  }

  const shift =
    entry.shift === SUPPORT_SHIFT_CODE ? entry.resolvedShift || SUPPORT_SHIFT_CODE : entry.shift
  const shiftDisplay = getShiftDisplay(month, shift)
  const position = entry.position || entry.resolvedPosition
  const positionDisplay = getPositionDisplay(month, position)
  const hasPosition = positionDisplay && position && position !== 'NONE'

  const swatch =
    colorBy === 'position' && hasPosition
      ? { background: positionDisplay.bg, color: positionDisplay.fg }
      : shiftSwatchStyle(shift, month)

  // 支援班顯示紙本上的原記號（T3、D7、3晚…），一眼對得回原圖；
  // 判不出班別的上班格用「?」標出來，不要靜靜地顯示成一個點
  const shiftText = entry.isSupport
    ? entry.raw?.slice(0, 3) || shiftDisplay?.short || '支'
    : (shiftDisplay?.short ?? (shift || (entry.raw?.slice(0, 2) || '?')))

  return (
    <span
      className={`flex h-full items-center justify-center gap-[3px] px-1 py-2 text-xs font-bold leading-none ${
        entry.isSupport ? 'ring-1 ring-inset ring-[var(--cw-brand)]/60' : ''
      } ${
        entry.needsReview || (!entry.isSupport && !shift)
          ? 'outline-dashed outline-1 -outline-offset-2 outline-[var(--cw-warning)]'
          : ''
      }`}
      style={swatch}
    >
      {shiftText}
      {showInitial && hasPosition && !entry.isSupport ? (
        <span className="text-[11px] font-semibold opacity-60">{positionDisplay.initial}</span>
      ) : null}
    </span>
  )
}

export function ShiftLegend({ month, view = DEFAULT_VIEW_MODE }) {
  const colorBy = view === 'shift' ? 'shift' : 'position'
  const shiftCodes = collectShiftCodes([month])
  const leaveCodes = collectLeaveCodes([month])
  const positionCodes = collectPositionCodes(month)

  return (
    <div className="flex flex-col gap-3 text-xs text-[var(--cw-text-muted)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-semibold text-[var(--cw-text)]">
          崗位{view === 'positionText' ? '（底色＋單字）' : view === 'position' ? '（底色）' : ''}
        </span>
        {positionCodes.length ? (
          positionCodes.map((code) => {
            const display = getPositionDisplay(month, code)
            return colorBy === 'position' ? (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-[var(--cw-radius-sm)] px-2 py-0.5 font-semibold"
                style={{ background: display.bg, color: display.fg }}
              >
                {view === 'positionText' ? (
                  <span className="opacity-60">{display.initial}</span>
                ) : null}
                {display.label}
              </span>
            ) : (
              <span key={code} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                  style={{ background: display.color }}
                />
                {display.label}
              </span>
            )
          })
        ) : (
          <span>這個月沒有標崗位</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-semibold text-[var(--cw-text)]">
          班別{view === 'shift' ? '（底色）' : '（格子裡的字）'}
        </span>
        {shiftCodes.map((code) => {
          const display = getShiftDisplay(month, code)
          return (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-[var(--cw-radius-sm)] px-2 py-0.5 font-semibold"
              style={colorBy === 'shift' ? shiftSwatchStyle(code, month) : undefined}
            >
              <span className={colorBy === 'shift' ? '' : 'font-bold text-[var(--cw-text)]'}>
                {display.short}
              </span>
              {display.label}
              {display.start && display.end ? (
                <span className="font-normal opacity-80">
                  {display.start}–{display.end}
                  {display.crossesMidnight ? ' 跨夜' : ''}
                </span>
              ) : null}
            </span>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-semibold text-[var(--cw-text)]">假別</span>
        {leaveCodes.map((code) => {
          const display = getLeaveDisplay(month, code)
          return (
            <span key={code} className="inline-flex items-center gap-1">
              <span
                className={
                  code === 'SCHEDULING'
                    ? 'font-semibold text-[var(--cw-text)]'
                    : 'font-semibold text-[var(--cw-danger)]'
                }
              >
                {display.marker}
              </span>
              {display.label}
              {code === 'SCHEDULING' ? '（店長，不上班）' : ''}
            </span>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block rounded-[var(--cw-radius-sm)] px-2 py-0.5 font-bold ring-1 ring-inset ring-[var(--cw-brand)]/60">
            T3
          </span>
          支援其他店（T3＝D13、D7＝D7；3晚／7早已指定班別）
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block rounded-[var(--cw-radius-sm)] px-2 py-0.5 font-bold outline-dashed outline-1 -outline-offset-2 outline-[var(--cw-warning)]">
            早
          </span>
          判讀信心不足，請對照原圖
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block rounded-[var(--cw-radius-sm)] px-2 py-0.5 font-bold text-[var(--cw-warning)] outline-dashed outline-1 -outline-offset-2 outline-[var(--cw-warning)]">
            ?
          </span>
          轉檔認不出這一格
        </span>
      </div>
    </div>
  )
}

/** 依店別篩選的芯片列，附人數。三家店的名單混在一起時，先縮到一家最快找到人。 */
export function StoreFilterChips({ groups, value, onChange, total, allLabel = '全部' }) {
  const options = [
    { code: 'all', name: allLabel, count: total },
    ...groups.map((group) => ({
      code: group.storeCode,
      name: group.storeName,
      count: group.people.length,
    })),
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.code === value
        return (
          <button
            key={option.code || 'none'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.code)}
            className={`cw-touch-target inline-flex items-center gap-1.5 rounded-[var(--cw-radius-pill)] border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)] ${
              active
                ? 'border-[var(--cw-brand)]/40 bg-[var(--cw-brand-muted)] text-[var(--cw-brand-strong)]'
                : 'border-[var(--cw-border-strong)] text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]'
            }`}
          >
            {option.name}
            <span className="text-xs font-normal tabular-nums opacity-70">{option.count}</span>
          </button>
        )
      })}
    </div>
  )
}

/** 下拉選單裡依店別分組的同事選項。跨店的人每一組都會出現。 */
export function PersonOptionGroups({ groups, labelOf }) {
  return groups.map((group) => (
    <optgroup key={group.storeCode || 'none'} label={group.storeName}>
      {group.people.map((person) => (
        <option key={`${group.storeCode}-${person.key}`} value={person.key}>
          {labelOf ? labelOf(person) : person.name}
        </option>
      ))}
    </optgroup>
  ))
}

export function StoreTabs({ stores, value, onChange, allLabel }) {
  const options = allLabel ? [{ code: 'all', name: allLabel }, ...stores] : stores
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((store) => {
        const active = store.code === value
        return (
          <button
            key={store.code}
            type="button"
            onClick={() => onChange(store.code)}
            aria-pressed={active}
            className={`cw-touch-target rounded-[var(--cw-radius-pill)] border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)] ${
              active
                ? 'border-[var(--cw-brand)]/40 bg-[var(--cw-brand-muted)] text-[var(--cw-brand-strong)]'
                : 'border-[var(--cw-border-strong)] bg-transparent text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]'
            }`}
          >
            {store.name}
          </button>
        )
      })}
    </div>
  )
}
