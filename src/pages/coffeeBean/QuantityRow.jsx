import { XMarkIcon } from '@heroicons/react/24/outline'

const MODES = [
  { key: 'quantity', label: '數', unit: '包', placeholder: '數量' },
  { key: 'weightBag', label: '袋', unit: '克', placeholder: '總重含袋' },
  { key: 'weightBox', label: '盒', unit: '克', placeholder: '總重含盒' },
]

/**
 * 盤點的一列：數字＋數／袋／盒＋刪除。出杯豆、義式豆、賣豆的每個位置都用這一個。
 *
 * 按鈕放大到 40px 高（原本約 20×16，手機很難點準）；輸入框右邊標單位（包／克），
 * 一眼就看得出這列填的是包數還是重量 —— 之前「克數被當成包數加總」就是因為看不出來。
 */
export default function QuantityRow({ value, mode, onChange, onModeChange, onRemove }) {
  const current = MODES.find((m) => m.key === mode) || MODES[0]
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative min-w-0 flex-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={current.placeholder}
          className="h-10 w-full min-w-0 rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] py-2 pl-3 pr-8 text-base text-[var(--cw-text)] placeholder:text-[var(--cw-text-muted)] focus:border-[var(--cw-text)] focus:outline-none"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-[var(--cw-text-muted)]">
          {current.unit}
        </span>
      </div>
      <div
        role="group"
        aria-label="填寫方式"
        className="flex h-10 shrink-0 overflow-hidden rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)]"
      >
        {MODES.map((m) => {
          const active = m.key === current.key
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={active}
              onClick={(e) => {
                e.stopPropagation()
                onModeChange(m.key)
              }}
              className={`!min-h-0 w-9 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-[var(--cw-text)] text-[var(--cw-bg)]'
                  : 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)]'
              }`}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {m.label}
            </button>
          )
        })}
      </div>
      {onRemove ? (
        <button
          type="button"
          aria-label="刪除這列"
          onClick={onRemove}
          className="grid h-10 w-10 !min-h-0 shrink-0 place-items-center rounded-[var(--cw-radius)] text-[var(--cw-text-muted)] hover:bg-[var(--cw-danger-muted)] hover:text-[var(--cw-danger)]"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  )
}
