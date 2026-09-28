import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { CwButton, CwSelect } from '../studio/ui'

const CURRENCIES = [
  { code: 'USD', name: '美元' },
  { code: 'EUR', name: '歐元' },
  { code: 'JPY', name: '日圓' },
  { code: 'CNY', name: '人民幣' },
  { code: 'HKD', name: '港幣' },
]

/** 金額、匯率是按鈕，點了用頁面底部的數字鍵盤輸入（有小數點），不叫系統鍵盤 */
function KeypadField({ label, value, placeholder, active, onSelect }) {
  const ref = useRef(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [active])
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">{label}</span>
      <button
        ref={ref}
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        aria-label={`${label}：${value || '未填'}`}
        className={`cw-touch-target flex min-h-11 w-full items-center rounded-[var(--cw-radius)] border bg-[var(--cw-bg)] px-3 text-left text-base tabular-nums transition-colors ${
          active
            ? 'border-[var(--cw-brand)] shadow-[inset_0_0_0_1px_var(--cw-brand)]'
            : 'border-[var(--cw-border)] hover:border-[var(--cw-border-strong)]'
        }`}
      >
        {value ? (
          <span className="text-[var(--cw-text)]">{value}</span>
        ) : active ? null : (
          <span className="text-[var(--cw-text-muted)]">{placeholder}</span>
        )}
        {active ? <span className="ml-0.5 text-[var(--cw-brand)] motion-safe:animate-pulse">|</span> : null}
      </button>
    </div>
  )
}

function ForeignCurrency({ transactions, onChange, form, onCurrencyChange, activeField, onSelectField, onAdd }) {
  const clearAll = () => {
    if (confirm('確定清除所有外幣交易？')) onChange([])
  }

  return (
    <div className="space-y-4" role="region" aria-label="外幣交易管理">
      <div className="space-y-3">
        <CwSelect
          label="幣種"
          id="cashier-fx-currency"
          selectClassName="min-h-11 bg-[var(--cw-bg)]"
          value={form.currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} ({currency.name})
            </option>
          ))}
        </CwSelect>

        <div className="grid grid-cols-2 gap-3">
          <KeypadField
            label="金額"
            value={form.amount}
            placeholder="外幣金額"
            active={activeField === 'amount'}
            onSelect={() => onSelectField('amount')}
          />
          <KeypadField
            label="匯率"
            value={form.rate}
            placeholder="1 外幣 = ? TWD"
            active={activeField === 'rate'}
            onSelect={() => onSelectField('rate')}
          />
        </div>

        <CwButton type="button" variant="secondary" className="w-full min-h-11" onClick={onAdd}>
          新增
        </CwButton>
      </div>

      {transactions.length > 0 ? (
        <div>
          <div className="max-h-56 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex min-h-12 items-center justify-between gap-2 border-t border-[var(--cw-border)] text-sm tabular-nums first:border-t-0"
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-[var(--cw-text)]">{t.currency} {t.amount.toLocaleString()}</span>
                  <span className="text-[var(--cw-text-muted)]"> @ {t.rate}</span>
                </span>
                <div className="flex shrink-0 items-center">
                  <span className="font-semibold text-[var(--cw-text)]">${t.localValue.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => onChange(transactions.filter((x) => x.id !== t.id))}
                    className="cw-touch-target -mr-2 flex items-center justify-center text-[var(--cw-text-muted)] hover:text-[var(--cw-danger)]"
                    aria-label={`刪除 ${t.currency} ${t.amount} 交易`}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end border-t border-[var(--cw-border)] pt-2">
            <CwButton type="button" variant="ghost" className="min-h-11 text-xs" onClick={clearAll}>
              清除全部
            </CwButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ForeignCurrency
