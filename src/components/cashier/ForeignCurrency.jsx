import { useState, useEffect } from 'react'
import { XCircleIcon } from '@heroicons/react/24/solid'
import { CwButton, CwInput, CwSelect } from '../studio/ui'

const CURRENCIES = [
  { code: 'USD', name: '美元' },
  { code: 'EUR', name: '歐元' },
  { code: 'JPY', name: '日圓' },
  { code: 'CNY', name: '人民幣' },
  { code: 'HKD', name: '港幣' },
]

function ForeignCurrency({
  onTotalChange,
  savedKey,
  resetKey = 0,
  visualVariant = 'classic',
  omitTitle = false,
}) {
  const isCraft = visualVariant === 'studio'
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem(savedKey)
    return saved ? JSON.parse(saved) : []
  })
  const [formData, setFormData] = useState({
    currency: 'USD',
    amount: '',
    rate: '',
  })

  useEffect(() => {
    if (resetKey > 0) {
      setTransactions([])
      setFormData({
        currency: 'USD',
        amount: '',
        rate: '',
      })
      onTotalChange(0)
    }
  }, [resetKey, onTotalChange])

  useEffect(() => {
    localStorage.setItem(savedKey, JSON.stringify(transactions))
  }, [transactions, savedKey])

  useEffect(() => {
    const total = transactions.reduce((sum, t) => sum + t.localValue, 0)
    onTotalChange(total)
  }, [transactions, onTotalChange])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!String(formData.amount).trim() || !String(formData.rate).trim()) return
    const amt = parseFloat(formData.amount)
    const rateNum = parseFloat(formData.rate)
    if (!Number.isFinite(amt) || !Number.isFinite(rateNum)) return

    const localValue = Math.floor(amt * rateNum)
    const newTransaction = {
      currency: formData.currency,
      amount: amt,
      rate: rateNum,
      localValue,
      id: Date.now(),
    }

    setTransactions((prev) => [...prev, newTransaction])
    setFormData((prev) => ({ ...prev, amount: '', rate: '' }))
  }

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const clearAll = () => {
    setTransactions([])
    localStorage.removeItem(savedKey)
  }

  if (isCraft) {
    return (
      <div className="space-y-4" role="region" aria-label="外幣交易管理">
        {!omitTitle && (
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--cw-text-muted)]">外幣交易</h2>
        )}

        <div className="space-y-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <CwSelect
              label="幣種"
              id="cashier-fx-currency"
              selectClassName="min-h-11 bg-[var(--cw-bg)]"
              value={formData.currency}
              onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
              aria-label="選擇幣種"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} ({currency.name})
                </option>
              ))}
            </CwSelect>

            <CwInput
              label="金額"
              id="cashier-fx-amt"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="外幣金額"
              step="0.01"
              inputMode="decimal"
              aria-label="外幣金額"
            />

            <CwInput
              label="匯率"
              id="cashier-fx-rate"
              type="number"
              value={formData.rate}
              onChange={(e) => setFormData((prev) => ({ ...prev, rate: e.target.value }))}
              placeholder="1 外幣 = ? TWD"
              step="0.01"
              inputMode="decimal"
              aria-label="匯率"
            />

            <CwButton type="submit" variant="secondary" className="w-full min-h-11 border-[var(--cw-border-strong)] hover:border-[var(--cw-border-strong)]">
              新增
            </CwButton>
          </form>

          <div className="max-h-48 space-y-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="group flex items-center justify-between rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-3 transition-colors hover:border-[var(--cw-border)]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm text-[var(--cw-text)]">
                    {transaction.currency} {transaction.amount.toFixed(2)} @ {transaction.rate}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteTransaction(transaction.id)}
                    className="shrink-0 text-[var(--cw-text-muted)] opacity-100 transition-colors hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                    aria-label={`刪除 ${transaction.currency} 交易`}
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                </div>
                <span className="text-sm font-medium tabular-nums text-[var(--cw-text)]">${transaction.localValue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-3">
          <div>
            <div className="text-[11px] text-[var(--cw-text-muted)]">總計（台幣）</div>
            <div className="text-lg font-bold text-[var(--cw-text)]">
              ${transactions.reduce((sum, t) => sum + t.localValue, 0).toLocaleString()}
            </div>
          </div>
          <CwButton type="button" variant="ghost" className="min-h-11 text-xs" onClick={clearAll} aria-label="清除所有外幣交易">
            清除全部
          </CwButton>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-surface p-6 shadow-lg" role="region" aria-label="外幣交易管理">
      <h2 className="mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-xl font-bold text-transparent">外幣交易</h2>

      <div className="space-y-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={formData.currency}
            onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-white transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="選擇幣種"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code} className="bg-surface">
                {currency.code} ({currency.name})
              </option>
            ))}
          </select>

          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-white placeholder:text-gray-400 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="金額"
            step="0.01"
            inputMode="decimal"
            aria-label="外幣金額"
          />

          <input
            type="number"
            value={formData.rate}
            onChange={(e) => setFormData((prev) => ({ ...prev, rate: e.target.value }))}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-white placeholder:text-gray-400 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="匯率"
            step="0.01"
            inputMode="decimal"
            aria-label="匯率"
          />

          <button
            type="submit"
            className="w-full rounded-lg border border-primary/30 bg-primary/20 px-4 py-2.5 text-primary transition-all duration-200 hover:border-primary/50 hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="新增外幣交易"
          >
            新增
          </button>
        </form>

        <div className="max-h-48 space-y-2 overflow-y-auto">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 transition-all duration-200 hover:border-white/20 hover:bg-white/10"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">
                  {transaction.currency} {transaction.amount.toFixed(2)} @ {transaction.rate}
                </span>
                <button
                  type="button"
                  onClick={() => deleteTransaction(transaction.id)}
                  className="text-gray-300 opacity-0 transition-colors duration-200 group-hover:opacity-100 hover:text-red-400"
                  aria-label={`刪除 ${transaction.currency} 交易`}
                >
                  <XCircleIcon className="h-4 w-4" />
                </button>
              </div>
              <span className="text-sm font-medium text-gray-200">${transaction.localValue.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-300">總計</div>
            <div className="text-lg font-bold text-white">${transactions.reduce((sum, t) => sum + t.localValue, 0).toLocaleString()}</div>
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-gray-300 transition-all duration-200 hover:border-white/30 hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
            aria-label="清除所有外幣交易"
          >
            清除全部
          </button>
        </div>
      </div>
    </div>
  )
}

export default ForeignCurrency
