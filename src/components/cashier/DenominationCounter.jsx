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

function DenominationCounter({ title, onTotalChange, savedKey, resetKey = 0 }) {
  const [counts, setCounts] = useState(() => {
    const saved = localStorage.getItem(savedKey)
    return saved ? JSON.parse(saved) : {}
  })
  const [total, setTotal] = useState(0)

  // 監聽重置信號
  useEffect(() => {
    if (resetKey > 0) {
      setCounts({})
      setTotal(0)
      onTotalChange(0)
    }
  }, [resetKey, onTotalChange])

  useEffect(() => {
    const newTotal = Object.entries(counts).reduce((sum, [value, count]) => {
      return sum + (parseInt(value) * (parseInt(count) || 0))
    }, 0)
    setTotal(newTotal)
    onTotalChange(newTotal)
  }, [counts, onTotalChange])

  useEffect(() => {
    localStorage.setItem(savedKey, JSON.stringify(counts))
  }, [counts, savedKey])

  const handleCountChange = (value, count) => {
    if (count < 0) count = 0
    setCounts(prev => ({
      ...prev,
      [value]: count
    }))
  }

  const clearAll = () => {
    setCounts({})
    localStorage.removeItem(savedKey)
  }

  return (
    <div className="bg-surface rounded-xl p-4 shadow-lg" role="region" aria-label={title}>
      <h2 className="text-lg font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        {title}
      </h2>

      <div className="grid gap-1.5">
        {DENOMINATIONS.map(({ value, label }) => (
          <div key={value} className="bg-white/5 rounded-lg p-2.5 border border-white/10 hover:border-white/20 transition-all duration-200 hover:bg-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">{label}</span>
              <span className="text-xs text-gray-300">小計</span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={counts[value] || ''}
                onChange={e => handleCountChange(value, parseInt(e.target.value))}
                className="flex-1 px-2.5 py-2 bg-white/10 border border-white/20 rounded-lg text-center text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 text-sm font-medium"
                placeholder="0"
                inputMode="decimal"
                aria-label={`${label} 數量`}
                role="spinbutton"
                aria-valuemin="0"
                aria-valuenow={counts[value] || 0}
              />
              
              <div className="w-20 px-2 py-1.5 bg-primary/20 rounded-lg border border-primary/30">
                <div className="text-center">
                  <div className="text-xs text-gray-300">金額</div>
                  <div className="text-sm font-bold text-primary">
                    ${((counts[value] || 0) * value).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-2.5 border border-primary/20">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs text-gray-300">總計金額</div>
            <div className="text-base font-bold text-white">
              ${total.toLocaleString()}
            </div>
          </div>
          <button
            onClick={clearAll}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 
                       text-gray-300 hover:text-white rounded-lg transition-all duration-200
                       border border-white/20 hover:border-white/30 text-xs
                       focus:outline-none focus:ring-2 focus:ring-red-500/50"
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