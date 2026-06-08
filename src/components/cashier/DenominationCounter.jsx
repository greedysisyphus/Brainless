import { useState, useEffect } from 'react'
import { CwButton, CwInput } from '../studio/ui'

const DENOMINATIONS = [
  { value: 1000, label: '$1000' },
  { value: 500, label: '$500' },
  { value: 100, label: '$100' },
  { value: 50, label: '$50' },
  { value: 10, label: '$10' },
  { value: 5, label: '$5' },
  { value: 1, label: '$1' },
]

/** omitTitle：外層 CwCard 已顯示標題時為 true（僅 Studio 組合版面使用） */
function DenominationCounter({
  title,
  onTotalChange,
  savedKey,
  resetKey = 0,
  visualVariant = 'classic',
  omitTitle = false,
}) {
  const isCraft = visualVariant === 'studio'
  const [counts, setCounts] = useState(() => {
    const saved = localStorage.getItem(savedKey)
    return saved ? JSON.parse(saved) : {}
  })
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (resetKey > 0) {
      setCounts({})
      setTotal(0)
      onTotalChange(0)
    }
  }, [resetKey, onTotalChange])

  useEffect(() => {
    const newTotal = Object.entries(counts).reduce((sum, [value, count]) => {
      return sum + parseInt(value) * (parseInt(count) || 0)
    }, 0)
    setTotal(newTotal)
    onTotalChange(newTotal)
  }, [counts, onTotalChange])

  useEffect(() => {
    localStorage.setItem(savedKey, JSON.stringify(counts))
  }, [counts, savedKey])

  const handleCountChange = (value, count) => {
    if (count < 0) count = 0
    setCounts((prev) => ({
      ...prev,
      [value]: count,
    }))
  }

  const clearAll = () => {
    setCounts({})
    localStorage.removeItem(savedKey)
  }

  if (isCraft) {
    return (
      <div className="space-y-4" role="region" aria-label={title}>
        {!omitTitle ? (
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">{title}</h2>
        ) : null}

        <div className="flex flex-col gap-2">
          {DENOMINATIONS.map(({ value, label }) => {
            const lineTotal = (counts[value] || 0) * value
            return (
              <div
                key={value}
                className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-3 transition-colors hover:border-[var(--cw-border-strong)]"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--cw-text)]">{label}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">小計</span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <CwInput
                      label="數量"
                      id={`cashier-denom-${savedKey}-${value}`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={counts[value] === undefined || counts[value] === null ? '' : String(counts[value])}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => {
                        const raw = e.target.value
                        if (raw === '') {
                          handleCountChange(value, 0)
                        } else {
                          const n = parseInt(raw, 10)
                          handleCountChange(value, Number.isNaN(n) ? 0 : n)
                        }
                      }}
                      placeholder="0"
                      className="[&_span]:text-[10px]"
                      aria-label={`${label} 數量`}
                    />
                  </div>
                  <div
                    className={`shrink-0 rounded-[var(--cw-radius)] border p-2.5 text-center sm:w-[5.75rem] ${
                      lineTotal > 0
                        ? 'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)]'
                        : 'border-[var(--cw-border)] bg-[var(--cw-mega-surface)]'
                    }`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">金額</div>
                    <div
                      className={`mt-1 text-sm font-bold tabular-nums ${
                        lineTotal > 0 ? 'text-[var(--cw-text)]' : 'text-[var(--cw-text)]'
                      }`}
                    >
                      ${lineTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-[var(--cw-radius-lg)] border p-3 ${
            total > 0
              ? 'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)]'
              : 'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)]'
          }`}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">總計金額</div>
            <div
              className={`text-base font-bold tabular-nums ${total > 0 ? 'text-[var(--cw-text)]' : 'text-[var(--cw-text)]'}`}
            >
              ${total.toLocaleString()}
            </div>
          </div>
          <CwButton type="button" variant="secondary" className="min-h-11 shrink-0 text-xs" onClick={clearAll} aria-label="清除所有數據">
            清除全部
          </CwButton>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-surface p-4 shadow-lg" role="region" aria-label={title}>
      <h2 className="mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-bold text-transparent">
        {title}
      </h2>

      <div className="grid gap-1.5">
        {DENOMINATIONS.map(({ value, label }) => (
          <div
            key={value}
            className="rounded-lg border border-white/10 bg-white/5 p-2.5 transition-all duration-200 hover:border-white/20 hover:bg-white/10"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{label}</span>
              <span className="text-xs text-gray-300">小計</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={counts[value] || ''}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    handleCountChange(value, 0)
                  } else {
                    const n = parseInt(raw, 10)
                    handleCountChange(value, Number.isNaN(n) ? 0 : n)
                  }
                }}
                className="flex-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-center text-sm font-medium text-white transition-all duration-200 placeholder:text-gray-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0"
                inputMode="decimal"
                aria-label={`${label} 數量`}
                aria-valuemin={0}
                aria-valuenow={counts[value] || 0}
              />

              <div className="w-20 rounded-lg border border-primary/30 bg-primary/20 px-2 py-1.5">
                <div className="text-center">
                  <div className="text-xs text-gray-300">金額</div>
                  <div className="text-sm font-bold text-primary">${((counts[value] || 0) * value).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10 p-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-300">總計金額</div>
            <div className="text-base font-bold text-white">${total.toLocaleString()}</div>
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-gray-300 transition-all duration-200 hover:border-white/30 hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
            aria-label="清除所有數據"
          >
            清除全部
          </button>
        </div>
      </div>
    </div>
  )
}

export default DenominationCounter
