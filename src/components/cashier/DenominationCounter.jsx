import { useEffect, useRef } from 'react'
import { BackspaceIcon, BanknotesIcon, CircleStackIcon } from '@heroicons/react/24/outline'
import { CwButton } from '../studio/ui'
import { DENOMINATIONS, sumCounts } from './cashMath'

const GROUPS = [
  { label: '紙鈔', unit: '張', icon: BanknotesIcon, values: DENOMINATIONS.filter((v) => v >= 100) },
  { label: '硬幣', unit: '枚', icon: CircleStackIcon, values: DENOMINATIONS.filter((v) => v < 100) },
]

/**
 * 面額磚：紙鈔一排、硬幣一排，兩排都切 4 欄讓磚對齊（紙鈔只有 3 張，最後一格留空）。每塊是按鈕，點了由頁面底部的數字鍵盤輸入張數，
 * 手機、iPad 都不會跳出系統鍵盤（iPad 網頁沒有純數字鍵盤可叫）。
 */
function DenominationCounter({ title, counts, activeValue, onSelect, onClear }) {
  const activeRef = useRef(null)
  const total = sumCounts(counts)

  // 鍵盤蓋住下半部，選到的列捲到中間
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeValue])

  const renderTile = (value, group) => {
    const count = Number(counts[value]) || 0
    const active = activeValue === value
    const empty = count === 0 && !active
    return (
      <button
        key={value}
        ref={active ? activeRef : null}
        type="button"
        onClick={() => onSelect(value)}
        aria-pressed={active}
        aria-label={`${title} $${value}，${count} ${group.unit}`}
        className={`cw-touch-target relative flex min-w-0 flex-col rounded-[var(--cw-radius)] px-1.5 py-2 text-left tabular-nums transition-colors sm:px-3 ${
          active
            ? 'bg-[var(--cw-brand-muted)] shadow-[inset_0_0_0_1.5px_var(--cw-brand)]'
            : 'bg-[var(--cw-bg)] hover:bg-[var(--cw-mega-surface)] hover:shadow-[inset_0_0_0_1px_var(--cw-border-strong)]'
        }`}
      >
        <span className={`text-xs font-semibold ${active ? 'text-[var(--cw-brand-strong)]' : 'text-[var(--cw-text-muted)]'}`}>
          ${value}
        </span>
        <span className="mt-0.5 flex items-baseline">
          <span className={`text-xl font-bold sm:text-2xl ${empty ? 'text-[var(--cw-border-strong)]' : 'text-[var(--cw-text)]'}`}>
            {count}
          </span>
          {active ? <span className="ml-0.5 text-xl text-[var(--cw-brand)] motion-safe:animate-pulse">|</span> : null}
        </span>
        <span className={`truncate text-[11px] tracking-tight sm:text-xs sm:tracking-normal ${empty ? 'text-[var(--cw-text-muted)]/60' : 'text-[var(--cw-text-muted)]'}`}>
          ${(count * value).toLocaleString()}
        </span>
      </button>
    )
  }

  return (
    <div role="region" aria-label={title} className="space-y-4">
      {GROUPS.map((group) => {
        const Icon = group.icon
        return (
          <div key={group.label}>
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--cw-text-muted)]">
              <span className="flex items-center gap-1.5">
                <Icon className="h-4 w-4" aria-hidden />
                {group.label}
              </span>
              <span className="tabular-nums">
                ${group.values.reduce((sum, v) => sum + v * (Number(counts[v]) || 0), 0).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {group.values.map((v) => renderTile(v, group))}
            </div>
          </div>
        )
      })}
      {total > 0 ? (
        <div className="-mb-2 flex justify-end">
          <CwButton type="button" variant="ghost" className="min-h-11 text-xs" onClick={onClear}>
            清除全部
          </CwButton>
        </div>
      ) : null}
    </div>
  )
}

const COUNT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'next']
// 外幣要打小數：點、0、倒退一排，「下一個」獨立整排
const DECIMAL_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back', 'next']

/** 固定在頁面底部的數字鍵盤；decimal = 多一顆小數點 */
export function CountKeypad({ decimal = false, nextLabel, onKey, onNext }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {(decimal ? DECIMAL_KEYS : COUNT_KEYS).map((key) =>
        key === 'next' ? (
          <button
            key={key}
            type="button"
            onClick={onNext}
            className={`cw-touch-target min-h-12 rounded-[var(--cw-radius)] bg-[var(--cw-fg-emphasis)] text-base font-semibold text-[var(--cw-fg-emphasis-contrast)] transition-opacity active:opacity-80 ${
              decimal ? 'col-span-3' : ''
            }`}
          >
            {nextLabel}
          </button>
        ) : (
          <button
            key={key}
            type="button"
            onClick={() => onKey(key)}
            aria-label={key === 'back' ? '刪除一位' : key === '.' ? '小數點' : key}
            className={`cw-touch-target flex min-h-12 items-center justify-center rounded-[var(--cw-radius)] bg-[var(--cw-bg)] text-2xl font-semibold tabular-nums transition-colors active:bg-[var(--cw-border)] ${
              key === 'back' ? 'text-[var(--cw-text-muted)]' : 'text-[var(--cw-text)]'
            }`}
          >
            {key === 'back' ? <BackspaceIcon className="h-6 w-6" /> : key}
          </button>
        ),
      )}
    </div>
  )
}

export default DenominationCounter
