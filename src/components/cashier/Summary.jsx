import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'
import { CwButton, CwInput } from '../studio/ui'

function Summary({
  cashierTotal,
  drawerTotal,
  foreignTotal,
  posAmount,
  onPosAmountChange,
  foreignTransactions,
  resetKey = 0,
  visualVariant = 'classic',
  omitTitle = false,
}) {
  const isCraft = visualVariant === 'studio'
  const [showResult, setShowResult] = useState(false)
  const [isNightShift, setIsNightShift] = useState(false)

  useEffect(() => {
    if (resetKey > 0) {
      setShowResult(false)
      setIsNightShift(false)
      onPosAmountChange(0)
    }
  }, [resetKey, onPosAmountChange])

  const actualCashProfit = cashierTotal + drawerTotal + foreignTotal - 20000
  const difference = actualCashProfit - posAmount
  const submitAmount = cashierTotal + drawerTotal - 20000 - foreignTotal

  const getDifferenceStyle = () => {
    if (difference === 0) {
      return {
        containerClass: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20',
        textClass: 'text-green-400',
        icon: (
          <div className="relative">
            <CheckCircleIcon className="h-6 w-6 animate-pulse text-green-400" />
            <div className="absolute inset-0 animate-pulse rounded-full bg-green-400/20 blur-lg" />
          </div>
        ),
        message: '金額正確',
      }
    }
    if (difference > 0) {
      return {
        containerClass: 'border border-yellow-500/20 bg-yellow-500/10',
        textClass: 'text-yellow-400',
        icon: <XCircleIcon className="h-6 w-6 text-yellow-400" />,
        message: '金額過多',
      }
    }
    return {
      containerClass: 'border border-red-500/20 bg-red-500/10',
      textClass: 'text-red-400',
      icon: <XCircleIcon className="h-6 w-6 text-red-400" />,
      message: '金額不足',
    }
  }

  const handleCalculate = () => {
    setShowResult(true)
  }

  const style = getDifferenceStyle()

  if (isCraft) {
    return (
      <div className="space-y-4" role="region" aria-label="日結匯總管理">
        <div className={`flex flex-wrap items-center gap-3 ${omitTitle ? 'justify-end' : 'justify-between'}`}>
          {!omitTitle ? (
            <h2 className="min-w-0 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">日結匯總</h2>
          ) : null}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--cw-text-muted)]">晚班模式</span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={isNightShift}
                onChange={(e) => setIsNightShift(e.target.checked)}
                aria-label="切換晚班模式"
              />
              <div className="relative h-6 w-11 rounded-full border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] after:absolute after:left-[3px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[var(--cw-border)] after:bg-[var(--cw-mega-surface)] after:transition-all peer-checked:bg-[var(--cw-mega-surface)] peer-checked:after:translate-x-full peer-checked:after:border-transparent peer-checked:after:bg-[var(--cw-text)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--cw-focus-ring)]" />
            </label>
          </div>
        </div>

        <div className="rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-4">
          <CwInput
            label="POS 機金額"
            id="cashier-summary-pos"
            type="number"
            value={Number.isFinite(posAmount) ? posAmount : ''}
            onChange={(e) => {
              const raw = e.target.value
              onPosAmountChange(raw === '' ? 0 : parseFloat(raw) || 0)
              setShowResult(false)
            }}
            placeholder="請輸入 POS 機金額"
            inputMode="decimal"
            aria-label="POS機金額"
          />
          <CwButton type="button" variant="secondary" className="mt-3 w-full min-h-11 border-[var(--cw-border-strong)]" onClick={handleCalculate} aria-label="計算日結差異">
            計算
          </CwButton>
        </div>

        <div className="overflow-hidden rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)]">
          {[
            { k: '收銀機現金', v: cashierTotal },
            { k: '抽屜現金', v: drawerTotal },
            { k: '外幣總額', v: foreignTotal },
          ].map((row) => (
            <div key={row.k} className="border-b border-[var(--cw-border)] p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--cw-text-muted)]">{row.k}</span>
                <span className="font-medium tabular-nums text-[var(--cw-text)]">${row.v.toLocaleString()}</span>
              </div>
            </div>
          ))}
          <div className="border-b border-[var(--cw-border)] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-400">基本金額</span>
              <span className="font-medium tabular-nums text-red-400">-$20,000</span>
            </div>
          </div>
          <div className="bg-[var(--cw-mega-surface)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--cw-text)]">實際現金收入</span>
              <span className="text-lg font-bold text-[var(--cw-text)] tabular-nums">${actualCashProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {showResult && (
          <div
            className={`rounded-[var(--cw-radius-lg)] border p-3 transition-all duration-300 ${
              difference === 0
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : difference > 0
                  ? 'border-amber-500/35 bg-amber-500/10'
                  : 'border-red-500/40 bg-red-500/10'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-sm font-semibold text-[var(--cw-text)]">差額</span>
                {difference === 0 ? (
                  <CheckCircleIcon className="h-6 w-6 shrink-0 text-emerald-400" />
                ) : (
                  <XCircleIcon className={`h-6 w-6 shrink-0 ${difference > 0 ? 'text-amber-400' : 'text-red-400'}`} />
                )}
                <span className={`text-sm ${difference === 0 ? 'text-emerald-300' : difference > 0 ? 'text-amber-200' : 'text-red-300'}`}>{style.message}</span>
              </div>
              <span
                className={`shrink-0 text-lg font-bold tabular-nums ${difference === 0 ? 'text-emerald-300' : difference > 0 ? 'text-amber-200' : 'text-red-300'}`}
              >
                ${difference.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {isNightShift && (
          <div className="overflow-hidden rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)]">
            <div className="border-b border-[var(--cw-border-strong)] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-[var(--cw-text)]">需上繳金額</span>
                <span className="rounded-full border border-[var(--cw-border-strong)] px-2 py-0.5 text-[11px] font-semibold uppercase text-[var(--cw-text-muted)]">
                  晚班結算
                </span>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div className="rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--cw-text-muted)]">台幣</span>
                  <span className="text-xl font-bold tabular-nums text-[var(--cw-text)]">${submitAmount.toLocaleString()}</span>
                </div>
              </div>
              <div className="rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-4">
                <div className="mb-3 flex justify-between">
                  <span className="text-sm text-[var(--cw-text-muted)]">外幣</span>
                  {!foreignTransactions?.length && (
                    <span className="text-xs text-[var(--cw-text-muted)]">無外幣紀錄</span>
                  )}
                </div>
                {foreignTransactions?.length > 0 && (
                  <div className="space-y-2">
                    {foreignTransactions.map((transaction, index) => (
                      <div
                        key={`${transaction.id ?? index}`}
                        className="flex items-center justify-between rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2"
                      >
                        <span className="text-sm font-medium text-[var(--cw-text-muted)]">{transaction.currency}</span>
                        <span className="text-base font-bold tabular-nums text-[var(--cw-text)]">
                          ${transaction.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-surface p-6 shadow-lg" role="region" aria-label="日結匯總管理">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-xl font-bold text-transparent">
          日結匯總
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">晚班模式</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" checked={isNightShift} onChange={(e) => setIsNightShift(e.target.checked)} aria-label="切換晚班模式" />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20" />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <label className="mb-2 block text-sm text-gray-300">POS機金額</label>
          <input
            type="number"
            value={posAmount === 0 ? '' : posAmount}
            onChange={(e) => {
              onPosAmountChange(parseFloat(e.target.value) || 0)
              setShowResult(false)
            }}
            className="mb-3 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-white placeholder:text-gray-400 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="請輸入POS機金額"
            inputMode="decimal"
            aria-label="POS機金額"
          />
          <button
            type="button"
            onClick={handleCalculate}
            className="w-full rounded-lg border border-primary/30 bg-primary/20 px-4 py-2.5 text-primary transition-all duration-200 hover:border-primary/50 hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="計算日結差異"
          >
            計算
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">收銀機現金</span>
              <span className="text-sm font-medium text-white">${cashierTotal.toLocaleString()}</span>
            </div>
          </div>
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">抽屜現金</span>
              <span className="text-sm font-medium text-white">${drawerTotal.toLocaleString()}</span>
            </div>
          </div>
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">外幣總額</span>
              <span className="text-sm font-medium text-white">${foreignTotal.toLocaleString()}</span>
            </div>
          </div>
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-400">基本金額</span>
              <span className="text-sm font-medium text-red-400">-$20,000</span>
            </div>
          </div>
          <div className="bg-primary/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">實際現金收入</span>
              <span className="text-lg font-bold text-primary">${actualCashProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {showResult && (
          <div
            className={`rounded-lg border p-3 transition-all duration-300 ${
              difference === 0
                ? 'border-green-500/20 bg-green-500/10'
                : difference > 0
                  ? 'border-yellow-500/20 bg-yellow-500/10'
                  : 'border-red-500/20 bg-red-500/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">差額</span>
                {style.icon}
                <span className={`text-sm ${style.textClass}`}>{style.message}</span>
              </div>
              <span className={`text-lg font-bold ${style.textClass}`}>${difference.toLocaleString()}</span>
            </div>
          </div>
        )}

        {isNightShift && (
          <div className="overflow-hidden rounded-lg bg-background/50">
            <div className="bg-surface/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-semibold text-transparent">
                    需上繳金額
                  </span>
                  <div className="h-4 w-4 animate-pulse rounded-full bg-gradient-to-r from-primary to-secondary opacity-75" />
                </div>
                <div className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">晚班結算</div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div className="relative overflow-hidden rounded-xl bg-surface/30 p-4">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
                <div className="relative flex items-center justify-between">
                  <span className="font-medium text-text-secondary">台幣</span>
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-xl font-bold text-transparent">
                    ${submitAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-surface/30 p-4">
                <div className="mb-3 flex justify-between">
                  <span className="font-medium text-text-secondary">外幣</span>
                  {!foreignTransactions?.length && <span className="text-sm text-text-secondary">無外幣紀錄</span>}
                </div>
                {foreignTransactions?.length > 0 && (
                  <div className="space-y-2 rounded-lg bg-background/30 p-2">
                    {foreignTransactions.map((transaction, index) => (
                      <div key={`${transaction.id ?? index}`} className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-surface/50">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary/50" />
                          <span className="font-medium text-text-secondary">{transaction.currency}</span>
                        </div>
                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-bold text-transparent">
                          ${transaction.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Summary
