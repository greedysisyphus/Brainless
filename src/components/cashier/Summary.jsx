import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'

function Summary({
  cashierTotal,
  drawerTotal,
  foreignTotal,
  posAmount,
  onPosAmountChange
}) {
  const [showResult, setShowResult] = useState(false)
  const actualCashProfit = cashierTotal + drawerTotal + foreignTotal
  const difference = actualCashProfit - posAmount - 20000

  const getDifferenceStyle = () => {
    if (difference === 0) {
      return {
        containerClass: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20',
        textClass: 'text-green-400',
        icon: (
          <div className="relative">
            <CheckCircleIcon className="w-6 h-6 text-green-400 animate-pulse" />
            <div className="absolute inset-0 bg-green-400/20 rounded-full blur-lg animate-pulse" />
          </div>
        ),
        message: '金額正確'
      }
    }
    if (difference > 0) {
      return {
        containerClass: 'bg-yellow-500/10 border border-yellow-500/20',
        textClass: 'text-yellow-400',
        icon: <XCircleIcon className="w-6 h-6 text-yellow-400" />,
        message: '金額過多'
      }
    }
    return {
      containerClass: 'bg-red-500/10 border border-red-500/20',
      textClass: 'text-red-400',
      icon: <XCircleIcon className="w-6 h-6 text-red-400" />,
      message: '金額不足'
    }
  }

  const handleCalculate = () => {
    setShowResult(true)
  }

  const style = getDifferenceStyle()

  return (
    <div className="card">
      <h2 className="card-header">日結匯總</h2>

      <div className="space-y-6">
        <div className="bg-background/50 rounded-lg p-4 backdrop-blur-sm">
          <label className="block text-sm text-text-secondary mb-2">
            POS機金額
          </label>
          <input
            type="number"
            value={posAmount || ''}
            onChange={e => {
              onPosAmountChange(parseFloat(e.target.value) || 0)
              setShowResult(false)
            }}
            className="input-field w-full mb-3"
            placeholder="請輸入POS機金額"
          />
          <button 
            onClick={handleCalculate}
            className="btn-primary w-full"
          >
            計算
          </button>
        </div>

        <div className="bg-background/50 rounded-lg overflow-hidden">
          <div className="summary-row">
            <span className="summary-label">收銀機現金</span>
            <span className="summary-value">${cashierTotal.toLocaleString()}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">抽屜現金</span>
            <span className="summary-value">${drawerTotal.toLocaleString()}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">外幣總額</span>
            <span className="summary-value">${foreignTotal.toLocaleString()}</span>
          </div>
          <div className="bg-surface/50 p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">實際現金收入</span>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ${actualCashProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {showResult && (
          <div className={`rounded-lg p-4 backdrop-blur-sm ${style.containerClass}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">差額</span>
                {style.icon}
                <span className={`text-sm ${style.textClass}`}>
                  {style.message}
                </span>
              </div>
              <span className={`text-xl font-bold ${style.textClass}`}>
                ${difference.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Summary 