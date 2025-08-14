import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'

function Summary({
  cashierTotal,
  drawerTotal,
  foreignTotal,
  posAmount,
  onPosAmountChange,
  foreignTransactions,
  resetKey = 0
}) {
  const [showResult, setShowResult] = useState(false)
  const [isNightShift, setIsNightShift] = useState(false)
  
  // 監聽重置信號
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
    <div className="bg-surface rounded-xl p-6 shadow-lg" role="region" aria-label="日結匯總管理">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          日結匯總
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">晚班模式</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isNightShift}
              onChange={(e) => setIsNightShift(e.target.checked)}
              aria-label="切換晚班模式"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <label className="block text-sm text-gray-300 mb-2">
            POS機金額
          </label>
          <input
            type="number"
            value={posAmount || ''}
            onChange={e => {
              onPosAmountChange(parseFloat(e.target.value) || 0)
              setShowResult(false)
            }}
            className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 mb-3"
            placeholder="請輸入POS機金額"
            inputMode="decimal"
            aria-label="POS機金額"
          />
          <button 
            onClick={handleCalculate}
            className="w-full px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 hover:border-primary/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="計算日結差異"
          >
            計算
          </button>
        </div>

        <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          <div className="p-3 border-b border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">收銀機現金</span>
              <span className="text-sm text-white font-medium">${cashierTotal.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 border-b border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">抽屜現金</span>
              <span className="text-sm text-white font-medium">${drawerTotal.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 border-b border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">外幣總額</span>
              <span className="text-sm text-white font-medium">${foreignTotal.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 border-b border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-400">基本金額</span>
              <span className="text-sm text-red-400 font-medium">-$20,000</span>
            </div>
          </div>
          <div className="p-3 bg-primary/10">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-white">實際現金收入</span>
              <span className="text-lg font-bold text-primary">
                ${actualCashProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {showResult && (
          <div className={`rounded-lg p-3 border transition-all duration-300 ${
            difference === 0 ? 'bg-green-500/10 border-green-500/20' :
            difference > 0 ? 'bg-yellow-500/10 border-yellow-500/20' :
            'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">差額</span>
                {style.icon}
                <span className={`text-sm ${style.textClass}`}>
                  {style.message}
                </span>
              </div>
              <span className={`text-lg font-bold ${style.textClass}`}>
                ${difference.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {isNightShift && (
          <div className="bg-background/50 rounded-lg overflow-hidden">
            <div className="bg-surface/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    需上繳金額
                  </span>
                  <div className="h-4 w-4 rounded-full bg-gradient-to-r from-primary to-secondary animate-pulse opacity-75" />
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  晚班結算
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 台幣區塊 */}
              <div className="relative bg-surface/30 rounded-xl p-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
                <div className="relative flex justify-between items-center">
                  <span className="text-text-secondary font-medium">台幣</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    ${submitAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 外幣區塊 */}
              <div className="bg-surface/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-text-secondary font-medium">外幣</span>
                  {!foreignTransactions?.length && (
                    <span className="text-sm text-text-secondary">無外幣紀錄</span>
                  )}
                </div>
                
                {foreignTransactions?.length > 0 && (
                  <div className="bg-background/30 rounded-lg p-2 space-y-2">
                    {foreignTransactions.map((transaction, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center px-3 py-2 rounded-lg hover:bg-surface/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary/50" />
                          <span className="font-medium text-text-secondary">
                            {transaction.currency}
                          </span>
                        </div>
                        <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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

export default Summary;