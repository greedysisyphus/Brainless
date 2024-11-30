import { useState, useEffect } from 'react'

const DENOMINATIONS = [
  { value: 1000, label: '$1000' },
  { value: 500, label: '$500' },
  { value: 100, label: '$100' },
  { value: 50, label: '$50' },
  { value: 10, label: '$10' },
  { value: 5, label: '$5' },
  { value: 1, label: '$1' }
]

function DenominationCounter({ title, onTotalChange }) {
  const [counts, setCounts] = useState({})
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const newTotal = Object.entries(counts).reduce((sum, [value, count]) => {
      return sum + (parseInt(value) * (parseInt(count) || 0))
    }, 0)
    setTotal(newTotal)
    onTotalChange(newTotal)
  }, [counts, onTotalChange])

  const handleCountChange = (value, count) => {
    if (count < 0) count = 0
    setCounts(prev => ({
      ...prev,
      [value]: count
    }))
  }

  const clearAll = () => {
    setCounts({})
  }

  return (
    <div className="bg-surface rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        {title}
      </h2>

      <div className="space-y-4">
        {DENOMINATIONS.map(({ value, label }) => (
          <div key={value} className="flex items-center gap-4">
            <span className="w-20 text-text-secondary">{label}</span>
            <input
              type="number"
              min="0"
              value={counts[value] || ''}
              onChange={e => handleCountChange(value, parseInt(e.target.value))}
              className="input-field flex-1"
              placeholder="0"
            />
            <span className="w-28 text-right text-text-secondary">
              ${((counts[value] || 0) * value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        <div className="bg-primary/10 rounded-lg p-4 text-center">
          <span className="text-text-secondary">總計：</span>
          <span className="text-xl font-bold ml-2">
            ${total.toLocaleString()}
          </span>
        </div>
        
        <button
          onClick={clearAll}
          className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 
                     text-text-secondary rounded-lg transition-colors"
        >
          清除
        </button>
      </div>
    </div>
  )
}

export default DenominationCounter 