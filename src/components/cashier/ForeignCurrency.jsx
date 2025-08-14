import { useState, useEffect } from 'react'
import { XCircleIcon } from '@heroicons/react/24/solid'

const CURRENCIES = [
  { code: 'USD', name: '美元' },
  { code: 'EUR', name: '歐元' },
  { code: 'JPY', name: '日圓' },
  { code: 'CNY', name: '人民幣' },
  { code: 'HKD', name: '港幣' }
]

function ForeignCurrency({ onTotalChange, savedKey, resetKey = 0 }) {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem(savedKey)
    return saved ? JSON.parse(saved) : []
  })
  const [formData, setFormData] = useState({
    currency: 'USD',
    amount: '',
    rate: ''
  })

  // 監聽重置信號
  useEffect(() => {
    if (resetKey > 0) {
      setTransactions([])
      setFormData({
        currency: 'USD',
        amount: '',
        rate: ''
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
    if (!formData.amount || !formData.rate) return

    const localValue = Math.floor(formData.amount * formData.rate)
    const newTransaction = {
      ...formData,
      localValue,
      id: Date.now()
    }

    setTransactions(prev => [...prev, newTransaction])
    setFormData(prev => ({ ...prev, amount: '', rate: '' }))
  }

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const clearAll = () => {
    setTransactions([])
    localStorage.removeItem(savedKey)
  }

  return (
    <div className="bg-surface rounded-xl p-6 shadow-lg" role="region" aria-label="外幣交易管理">
      <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        外幣交易
      </h2>

      <div className="space-y-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={formData.currency}
            onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
            aria-label="選擇幣種"
          >
            {CURRENCIES.map(currency => (
              <option key={currency.code} value={currency.code} className="bg-surface">
                {currency.code} ({currency.name})
              </option>
            ))}
          </select>

          <input
            type="number"
            value={formData.amount}
            onChange={e => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
            placeholder="金額"
            step="0.01"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            aria-label="外幣金額"
          />

          <input
            type="number"
            value={formData.rate}
            onChange={e => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
            placeholder="匯率"
            step="0.01"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            aria-label="匯率"
          />

          <button 
            type="submit" 
            className="w-full px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 hover:border-primary/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="新增外幣交易"
          >
            新增
          </button>
        </form>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {transactions.map(transaction => (
            <div key={transaction.id} 
                 className="bg-white/5 rounded-lg p-3 flex justify-between items-center group border border-white/10 hover:border-white/20 transition-all duration-200 hover:bg-white/10">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">
                  {transaction.currency} {transaction.amount.toFixed(2)} @ {transaction.rate}
                </span>
                <button
                  onClick={() => deleteTransaction(transaction.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                  aria-label={`刪除 ${transaction.currency} 交易`}
                >
                  <XCircleIcon className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-gray-200 font-medium">
                ${transaction.localValue.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-3 border border-primary/20">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs text-gray-300">總計</div>
            <div className="text-lg font-bold text-white">
              ${transactions.reduce((sum, t) => sum + t.localValue, 0).toLocaleString()}
            </div>
          </div>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 
                       text-gray-300 hover:text-white rounded-lg transition-all duration-200
                       border border-white/20 hover:border-white/30 text-sm
                       focus:outline-none focus:ring-2 focus:ring-red-500/50"
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