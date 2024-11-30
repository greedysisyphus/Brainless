import { useState, useEffect } from 'react'
import { XCircleIcon } from '@heroicons/react/24/solid'

const CURRENCIES = [
  { code: 'USD', name: '美元' },
  { code: 'EUR', name: '歐元' },
  { code: 'JPY', name: '日圓' },
  { code: 'CNY', name: '人民幣' },
  { code: 'HKD', name: '港幣' }
]

function ForeignCurrency({ onTotalChange }) {
  const [transactions, setTransactions] = useState([])
  const [formData, setFormData] = useState({
    currency: 'USD',
    amount: '',
    rate: ''
  })

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
  }

  return (
    <div className="card">
      <h2 className="card-header">外幣計算</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          value={formData.currency}
          onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
          className="input-field w-full"
        >
          {CURRENCIES.map(currency => (
            <option key={currency.code} value={currency.code}>
              {currency.code} ({currency.name})
            </option>
          ))}
        </select>

        <input
          type="number"
          value={formData.amount}
          onChange={e => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
          className="input-field w-full"
          placeholder="金額"
          step="0.01"
        />

        <input
          type="number"
          value={formData.rate}
          onChange={e => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
          className="input-field w-full"
          placeholder="匯率"
          step="0.01"
        />

        <button type="submit" className="btn-primary w-full">
          新增
        </button>
      </form>

      <div className="mt-6 space-y-2 max-h-48 overflow-y-auto">
        {transactions.map(transaction => (
          <div key={transaction.id} 
               className="bg-white/5 rounded-lg p-3 flex justify-between items-center group">
            <div className="flex items-center gap-2">
              <span>
                {transaction.currency} {transaction.amount.toFixed(2)} @ {transaction.rate}
              </span>
              <button
                onClick={() => deleteTransaction(transaction.id)}
                className="text-text-secondary hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
            <span className="text-text-secondary">
              ${transaction.localValue.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        <div className="bg-primary/10 rounded-lg p-4 text-center">
          <span className="text-text-secondary">總計：</span>
          <span className="text-xl font-bold ml-2">
            ${transactions.reduce((sum, t) => sum + t.localValue, 0).toLocaleString()}
          </span>
        </div>

        <button
          onClick={clearAll}
          className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 
                    text-text-secondary rounded-lg transition-colors"
        >
          清除全部
        </button>
      </div>
    </div>
  )
}

export default ForeignCurrency 