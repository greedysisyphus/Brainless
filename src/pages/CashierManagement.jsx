import { useState, useEffect } from 'react'
import DenominationCounter from '../components/cashier/DenominationCounter'
import ForeignCurrency from '../components/cashier/ForeignCurrency'
import Summary from '../components/cashier/Summary'
import { CurrencyDollarIcon, XMarkIcon, ArrowPathIcon, CalculatorIcon } from '@heroicons/react/24/outline'

function CashierManagement() {
  // 從 localStorage 讀取初始值
  const [cashierTotal, setCashierTotal] = useState(() => {
    const saved = localStorage.getItem('cashierTotal')
    return saved ? parseFloat(saved) : 0
  })
  
  const [drawerTotal, setDrawerTotal] = useState(() => {
    const saved = localStorage.getItem('drawerTotal')
    return saved ? parseFloat(saved) : 0
  })
  
  const [foreignTotal, setForeignTotal] = useState(() => {
    const saved = localStorage.getItem('foreignTotal')
    return saved ? parseFloat(saved) : 0
  })
  
  const [posAmount, setPosAmount] = useState(() => {
    const saved = localStorage.getItem('posAmount')
    return saved ? parseFloat(saved) : 0
  })

  // 外幣找零工具狀態
  const [showForeignChangeCalculator, setShowForeignChangeCalculator] = useState(false)
  // 匯率歷史記錄管理
  const getRateHistory = () => {
    try {
      return JSON.parse(localStorage.getItem('rateHistory') || '[]')
    } catch {
      return []
    }
  }

  const addRateToHistory = (rate) => {
    if (!rate || parseFloat(rate) <= 0) return
    
    const history = getRateHistory()
    const rateStr = rate.toString()
    
    // 移除重複的匯率
    const filteredHistory = history.filter(item => item !== rateStr)
    
    // 將新匯率加到開頭
    const newHistory = [rateStr, ...filteredHistory].slice(0, 10)
    
    localStorage.setItem('rateHistory', JSON.stringify(newHistory))
  }

  const [rateHistoryKey, setRateHistoryKey] = useState(0) // 強制重新渲染
  const [showRateHistory, setShowRateHistory] = useState(false) // 控制歷史記錄顯示

  const removeRateFromHistory = (rateToRemove) => {
    const history = getRateHistory()
    const newHistory = history.filter(rate => rate !== rateToRemove)
    localStorage.setItem('rateHistory', JSON.stringify(newHistory))
    setRateHistoryKey(prev => prev + 1) // 強制重新渲染
  }

  const clearRateHistory = () => {
    localStorage.removeItem('rateHistory')
    setRateHistoryKey(prev => prev + 1) // 強制重新渲染
  }

  const [foreignChangeData, setForeignChangeData] = useState({
    rate: localStorage.getItem('lastExchangeRate') || '',
    foreignAmount: '',
    productPrice: ''
  })

  // 重置狀態管理
  const [resetKey, setResetKey] = useState(0)

  // 當數值改變時保存到 localStorage
  useEffect(() => {
    localStorage.setItem('cashierTotal', cashierTotal)
    localStorage.setItem('drawerTotal', drawerTotal)
    localStorage.setItem('foreignTotal', foreignTotal)
    localStorage.setItem('posAmount', posAmount)
  }, [cashierTotal, drawerTotal, foreignTotal, posAmount])

  // 重置所有數據
  const resetAll = () => {
    // 重置狀態
    setCashierTotal(0)
    setDrawerTotal(0)
    setForeignTotal(0)
    setPosAmount(0)

    // 清除所有相關的 localStorage 數據
    localStorage.removeItem('cashierTotal')
    localStorage.removeItem('drawerTotal')
    localStorage.removeItem('foreignTotal')
    localStorage.removeItem('posAmount')
    localStorage.removeItem('cashierDenominations')
    localStorage.removeItem('drawerDenominations')
    localStorage.removeItem('foreignTransactions')

    // 清除外幣找零相關數據
    localStorage.removeItem('lastExchangeRate')
    localStorage.removeItem('rateHistory')
    
    // 重置外幣找零計算器狀態
    setForeignChangeData({
      rate: '',
      foreignAmount: '',
      productPrice: ''
    })
    
    // 強制重新渲染歷史記錄
    setRateHistoryKey(prev => prev + 1)
    
    // 觸發子組件重置
    setResetKey(prev => prev + 1)
  }

  // 計算外幣找零
  const calculateForeignChange = () => {
    const { rate, foreignAmount, productPrice } = foreignChangeData
    if (!rate || !foreignAmount || !productPrice) return null

    const rateNum = parseFloat(rate)
    const foreignAmountNum = parseFloat(foreignAmount)
    const productPriceNum = parseFloat(productPrice)

    // 1. 客人付的外幣轉換為台幣，並無條件捨去
    const foreignAmountInTWD = Math.floor(foreignAmountNum * rateNum)
    
    // 2. 計算找零（台幣）
    const changeInTWD = foreignAmountInTWD - productPriceNum
    
    // 3. 計算找零（外幣）
    const changeInForeign = changeInTWD / rateNum

    return {
      changeInForeign,
      changeInTWD,
      foreignAmount: foreignAmountNum,
      rate: rateNum,
      productPrice: productPriceNum,
      foreignAmountInTWD
    }
  }

  const result = calculateForeignChange()
  
  // 計算狀態判斷
  const isExactAmount = result && result.changeInTWD === 0
  const isInsufficient = result && result.changeInTWD < 0
  const hasChange = result && result.changeInTWD > 0
  const isValidInput = result && result.rate > 0 && result.foreignAmount > 0 && result.productPrice > 0

  // 鍵盤快捷鍵支援
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showForeignChangeCalculator) {
        setShowForeignChangeCalculator(false)
      }
      if (e.key === 'Enter' && showForeignChangeCalculator && isValidInput) {
        // 可以加入確認動作
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showForeignChangeCalculator, isValidInput])

  return (
    <div className="container-custom py-6">
      {/* 頁面標題和操作區域 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">收銀管理系統</h1>
            <p className="text-text-secondary">
              討厭算錢的第<span className="inline-block px-2 py-1 bg-primary/20 border border-primary/30 rounded-lg text-primary font-semibold mx-1">
                {Math.floor((new Date() - new Date('2024-05-01')) / (1000 * 60 * 60 * 24))}
              </span>天
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForeignChangeCalculator(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 text-green-400 hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-500/50 transition-all duration-200 rounded-xl shadow-lg hover:shadow-xl"
            >
              <CalculatorIcon className="w-5 h-5" />
              <span className="hidden sm:inline">外幣找零</span>
            </button>
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-400/30 text-red-400 hover:from-red-500/30 hover:to-pink-500/30 hover:border-red-500/50 transition-all duration-200 rounded-xl shadow-lg hover:shadow-xl"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span className="hidden sm:inline">重置數據</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* 主要功能區域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 收銀機現金 - 左上 */}
        <DenominationCounter
          title="收銀機現金"
          onTotalChange={setCashierTotal}
          savedKey="cashierDenominations"
          resetKey={resetKey}
        />

        {/* 抽屜現金 - 右上 */}
        <DenominationCounter
          title="抽屜現金"
          onTotalChange={setDrawerTotal}
          savedKey="drawerDenominations"
          resetKey={resetKey}
        />

        {/* 外幣交易 - 左下 */}
        <ForeignCurrency
          onTotalChange={setForeignTotal}
          savedKey="foreignTransactions"
          resetKey={resetKey}
        />

        {/* 日結匯總 - 右下 */}
        <Summary
          cashierTotal={cashierTotal}
          drawerTotal={drawerTotal}
          foreignTotal={foreignTotal}
          posAmount={posAmount}
          onPosAmountChange={setPosAmount}
          foreignTransactions={resetKey > 0 ? [] : JSON.parse(localStorage.getItem('foreignTransactions') || '[]')}
          resetKey={resetKey}
        />
      </div>

      {/* 浮動外幣找零計算器按鈕 */}
      <button
        onClick={() => setShowForeignChangeCalculator(true)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 text-green-400 hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-500/50 transition-all duration-200 rounded-full shadow-lg hover:shadow-xl z-50 hover:scale-110 transform touch-manipulation active:scale-95"
        style={{ minWidth: '64px', minHeight: '64px' }}
        aria-label="開啟外幣找零計算器"
      >
        <CurrencyDollarIcon className="w-7 h-7" />
      </button>

      {/* 浮動外幣找零計算器彈窗 */}
      {showForeignChangeCalculator && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 touch-manipulation overflow-y-auto"
          onClick={() => setShowForeignChangeCalculator(false)}
        >
          <div 
            className="bg-surface/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-md shadow-2xl touch-manipulation my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 固定的標題和關閉按鈕區域 */}
            <div className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-white/10 rounded-t-2xl p-6 pb-4 z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-green-400 mb-1">外幣找零計算器</h2>
                  <p className="text-sm text-text-secondary">計算外幣找零金額 • 按 ESC 關閉</p>
                </div>
                <button
                  onClick={() => setShowForeignChangeCalculator(false)}
                  className="p-4 rounded-xl hover:bg-red-500/20 text-red-400 transition-all duration-200 touch-manipulation active:scale-95"
                  style={{ minWidth: '56px', minHeight: '56px' }}
                  aria-label="關閉外幣找零計算器"
                >
                  <XMarkIcon className="w-7 h-7" />
                </button>
              </div>
            </div>

            {/* 可滾動的內容區域 */}
            <div className="p-6 pt-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* 輸入區域 - 2x2 網格佈局 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 匯率輸入 */}
                <div className="bg-gradient-to-br from-surface/40 to-surface/20 rounded-xl p-4 border border-white/10">
                  <label className="block text-sm font-semibold mb-3 text-blue-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    匯率 (1 外幣 = ? TWD)
                  </label>
                  <input
                    type="number"
                    value={foreignChangeData.rate}
                    onChange={(e) => {
                      const newRate = e.target.value
                      setForeignChangeData(prev => ({ ...prev, rate: newRate }))
                      if (newRate && parseFloat(newRate) > 0) {
                        localStorage.setItem('lastExchangeRate', newRate)
                      }
                    }}
                    onBlur={(e) => {
                      const newRate = e.target.value
                      if (newRate && parseFloat(newRate) > 0) {
                        addRateToHistory(newRate)
                        setRateHistoryKey(prev => prev + 1) // 強制重新渲染
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const newRate = e.target.value
                        if (newRate && parseFloat(newRate) > 0) {
                          addRateToHistory(newRate)
                          setRateHistoryKey(prev => prev + 1) // 強制重新渲染
                        }
                      }
                    }}
                    className={`input-field w-full text-sm py-4 px-4 rounded-lg bg-white/5 border transition-all touch-manipulation min-h-[52px] ${
                      foreignChangeData.rate && parseFloat(foreignChangeData.rate) <= 0 
                        ? 'border-red-400/50 focus:border-red-400/70' 
                        : 'border-white/10 focus:border-blue-400/50 hover:border-blue-400/30'
                    } focus:bg-white/10`}
                    placeholder="輸入匯率"
                    step="0.01"
                    inputMode="decimal"
                    min="0.01"
                  />
                  
                  {/* 匯率歷史記錄按鈕 */}
                  <div className="mt-3">
                    <button
                      onClick={() => setShowRateHistory(!showRateHistory)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-500/10"
                    >
                      <span>歷史匯率</span>
                      {getRateHistory().length > 0 && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                          {getRateHistory().length}
                        </span>
                      )}
                      <span className={`text-xs transition-transform duration-200 ${showRateHistory ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>
                    
                    {/* 歷史記錄下拉內容 */}
                    {showRateHistory && (
                      <div className="mt-2 p-4 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-xl border border-blue-400/20" key={rateHistoryKey}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-medium text-blue-400">已儲存的匯率</div>
                          {getRateHistory().length > 0 && (
                            <button
                              onClick={clearRateHistory}
                              className="text-xs text-red-400/60 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                              title="清除所有歷史記錄"
                            >
                              清除全部
                            </button>
                          )}
                        </div>
                        {getRateHistory().length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {getRateHistory().map((rate, index) => (
                              <div key={`${rate}-${index}`} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors">
                                <button
                                  onClick={() => {
                                    setForeignChangeData(prev => ({ ...prev, rate }))
                                    localStorage.setItem('lastExchangeRate', rate)
                                  }}
                                  className="text-sm text-white hover:text-blue-400 transition-colors font-medium"
                                >
                                  {rate}
                                </button>
                                <button
                                  onClick={() => removeRateFromHistory(rate)}
                                  className="text-xs text-text-secondary hover:text-red-400 transition-colors ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/10"
                                  title="刪除此匯率"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-text-secondary/60 text-center py-2">尚無歷史記錄</div>
                        )}
                      </div>
                    )}
                  </div>
                  {foreignChangeData.rate && parseFloat(foreignChangeData.rate) <= 0 && (
                    <div className="text-red-400 text-xs mt-2 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>匯率必須大於 0</span>
                    </div>
                  )}
                </div>

                {/* 商品價格輸入 */}
                <div className="bg-gradient-to-br from-surface/40 to-surface/20 rounded-xl p-4 border border-white/10">
                  <label className="block text-sm font-semibold mb-3 text-orange-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                    商品價格 (TWD)
                  </label>
                  <input
                    type="number"
                    value={foreignChangeData.productPrice}
                    onChange={(e) => setForeignChangeData(prev => ({ ...prev, productPrice: e.target.value }))}
                    className={`input-field w-full text-sm py-4 px-4 rounded-lg bg-white/5 border transition-all touch-manipulation min-h-[52px] ${
                      foreignChangeData.productPrice && parseFloat(foreignChangeData.productPrice) < 0 
                        ? 'border-red-400/50 focus:border-red-400/70' 
                        : 'border-white/10 focus:border-orange-400/50 hover:border-orange-400/30'
                    } focus:bg-white/10`}
                    placeholder="輸入商品價格"
                    step="0.01"
                    inputMode="decimal"
                    min="0"
                  />
                  {foreignChangeData.productPrice && parseFloat(foreignChangeData.productPrice) < 0 && (
                    <div className="text-red-400 text-xs mt-2 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>商品價格不能為負數</span>
                    </div>
                  )}
                </div>

                {/* 外幣金額輸入 - 跨兩欄 */}
                <div className="sm:col-span-2 bg-gradient-to-br from-surface/40 to-surface/20 rounded-xl p-4 border border-white/10">
                  <label className="block text-sm font-semibold mb-3 text-purple-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                    客人付的外幣金額
                  </label>
                  <input
                    type="number"
                    value={foreignChangeData.foreignAmount}
                    onChange={(e) => setForeignChangeData(prev => ({ ...prev, foreignAmount: e.target.value }))}
                    className={`input-field w-full text-sm py-4 px-4 rounded-lg bg-white/5 border transition-all touch-manipulation min-h-[52px] ${
                      foreignChangeData.foreignAmount && parseFloat(foreignChangeData.foreignAmount) < 0 
                        ? 'border-red-400/50 focus:border-red-400/70' 
                        : 'border-white/10 focus:border-purple-400/50 hover:border-purple-400/30'
                    } focus:bg-white/10`}
                    placeholder="輸入外幣金額"
                    step="0.01"
                    inputMode="decimal"
                    min="0"
                  />
                  {foreignChangeData.foreignAmount && parseFloat(foreignChangeData.foreignAmount) < 0 && (
                    <div className="text-red-400 text-xs mt-2 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>外幣金額不能為負數</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 計算結果 */}
              {result && (
                <div className={`rounded-xl p-6 border shadow-lg animate-fadeIn ${
                  isExactAmount ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-400/40 shadow-green-500/20' :
                  isInsufficient ? 'bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-400/40 shadow-red-500/20' :
                  hasChange ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-400/40 shadow-blue-500/20' :
                  'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-400/20 shadow-green-500/10'
                }`}>
                  {/* 狀態提示 */}
                  {isExactAmount && (
                    <div className="flex items-center gap-3 mb-6 p-4 bg-green-500/20 rounded-xl border border-green-400/30">
                      <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-base font-semibold text-green-400">金額剛好，無需找零</span>
                    </div>
                  )}
                  {isInsufficient && (
                    <div className="flex items-center gap-3 mb-6 p-4 bg-red-500/20 rounded-xl border border-red-400/30">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <span className="text-base font-semibold text-red-400">金額不足，需補差額</span>
                    </div>
                  )}
                  {hasChange && (
                    <div className="flex items-center gap-3 mb-6 p-4 bg-blue-500/20 rounded-xl border border-blue-400/30">
                      <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                      <span className="text-base font-semibold text-blue-400">需要找零</span>
                    </div>
                  )}

                  {/* 主要結果 */}
                  {!isExactAmount && (
                    <div className="text-center mb-6">
                      <div className="text-sm text-text-secondary mb-2">最終找零金額</div>
                      <div className={`text-4xl font-bold mb-2 ${
                        isInsufficient ? 'text-red-400' :
                        'text-blue-400'
                      }`}>
                        ${result.changeInTWD.toFixed(0)}
                      </div>
                      <div className="text-base text-text-secondary mb-4">
                        外幣等值：{result.changeInForeign.toFixed(2)}
                      </div>
                      
                      {/* 進度條視覺化 */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-text-secondary">付款金額</span>
                          <span className="text-sm font-semibold text-purple-400">${result.foreignAmountInTWD.toFixed(0)}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isInsufficient ? 'bg-red-400' : 'bg-blue-400'
                            }`}
                            style={{ 
                              width: `${Math.min(100, Math.max(0, (result.foreignAmountInTWD / result.productPrice) * 100))}%` 
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-text-secondary">商品價格</span>
                          <span className="text-sm font-semibold text-orange-400">${result.productPrice.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 詳細計算步驟（可折疊） */}
                  <details className="mt-6">
                    <summary className="text-sm font-semibold text-text-secondary cursor-pointer hover:text-white transition-colors flex items-center gap-2 min-h-[44px]">
                      查看詳細計算步驟
                    </summary>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary">商品價格：</span>
                        <span className="font-semibold text-orange-400">${result.productPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary">客人付的外幣：</span>
                        <span className="font-semibold text-purple-400">{result.foreignAmount.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary">客人付的台幣等值：</span>
                        <span className="font-semibold text-purple-400">${result.foreignAmountInTWD.toFixed(0)}</span>
                      </div>
                      <div className="border-t border-white/10 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-text-secondary">減去商品價格：</span>
                          <span className="font-semibold text-red-400">-${result.productPrice.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setForeignChangeData({
                    rate: '',
                    foreignAmount: '',
                    productPrice: ''
                  })}
                  className="px-6 py-4 bg-white/5 hover:bg-white/10 
                            text-text-secondary rounded-xl transition-all duration-200 touch-manipulation active:scale-95
                            min-h-[56px] text-base font-medium"
                >
                  清除輸入
                </button>
                {result && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`找零金額：$${result.changeInTWD.toFixed(0)}`)
                    }}
                    className="px-6 py-4 bg-blue-500/20 hover:bg-blue-500/30 
                              text-blue-400 rounded-xl transition-all duration-200 touch-manipulation active:scale-95 
                              border border-blue-400/30 min-h-[56px] text-base font-medium"
                  >
                    複製結果
                  </button>
                )}
              </div>

              {/* 計算公式說明 */}
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-400/20">
                <h3 className="text-sm font-semibold text-blue-400 mb-3">
                  計算公式
                </h3>
                <div className="text-sm text-text-secondary space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-400/20 text-blue-400 text-xs flex items-center justify-center font-bold">1</span>
                    <span>客人外幣 × 匯率 = 台幣等值（捨去）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-400/20 text-blue-400 text-xs flex items-center justify-center font-bold">2</span>
                    <span>台幣等值 - 商品價格 = 找零金額</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashierManagement 