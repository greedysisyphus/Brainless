import { useState, useEffect } from 'react'
import DenominationCounter from '../components/cashier/DenominationCounter'
import ForeignCurrency from '../components/cashier/ForeignCurrency'
import Summary from '../components/cashier/Summary'
import { CurrencyDollarIcon, XMarkIcon } from '@heroicons/react/24/outline'

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
  const [foreignChangeData, setForeignChangeData] = useState({
    rate: '',
    foreignAmount: '',
    productPrice: ''
  })

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

    // 強制重新加載組件
    window.location.reload()
  }

  // 計算外幣找零
  const calculateForeignChange = () => {
    const { rate, foreignAmount, productPrice } = foreignChangeData
    if (!rate || !foreignAmount || !productPrice) return null

    const rateNum = parseFloat(rate)
    const foreignAmountNum = parseFloat(foreignAmount)
    const productPriceNum = parseFloat(productPrice)

    // 將商品價格轉換為外幣等值，然後無條件進位
    const productPriceInForeign = productPriceNum / rateNum
    const roundedProductPriceInForeign = Math.ceil(productPriceInForeign)
    
    // 客人付的外幣減去進位後的外幣商品價格
    const changeInForeign = foreignAmountNum - roundedProductPriceInForeign
    
    // 找零的外幣金額轉換為台幣，並無條件捨去
    const changeInTWD = Math.floor(changeInForeign * rateNum)

    return {
      changeInForeign,
      changeInTWD,
      foreignAmount: foreignAmountNum,
      rate: rateNum,
      productPrice: productPriceNum,
      productPriceInForeign,
      roundedProductPriceInForeign
    }
  }

  const result = calculateForeignChange()

  return (
    <div className="container-custom py-8">
      <div className="flex justify-end mb-4">
        <button
          onClick={resetAll}
          className="btn-primary bg-red-500 hover:bg-red-600"
        >
          重置所有數據
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DenominationCounter
          title="收銀機現金"
          onTotalChange={setCashierTotal}
          savedKey="cashierDenominations"
        />
        
        <DenominationCounter
          title="抽屜現金"
          onTotalChange={setDrawerTotal}
          savedKey="drawerDenominations"
        />
        
        <ForeignCurrency
          onTotalChange={setForeignTotal}
          savedKey="foreignTransactions"
        />
        
        <Summary
          cashierTotal={cashierTotal}
          drawerTotal={drawerTotal}
          foreignTotal={foreignTotal}
          posAmount={posAmount}
          onPosAmountChange={setPosAmount}
          foreignTransactions={JSON.parse(localStorage.getItem('foreignTransactions') || '[]')}
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
                  <p className="text-sm text-text-secondary">計算外幣找零金額</p>
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
              {/* 匯率輸入 */}
              <div className="bg-gradient-to-br from-surface/40 to-surface/20 rounded-xl p-4 border border-white/10">
                <label className="block text-sm font-semibold mb-3 text-blue-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  匯率 (1 外幣 = ? TWD)
                </label>
                <input
                  type="number"
                  value={foreignChangeData.rate}
                  onChange={(e) => setForeignChangeData(prev => ({ ...prev, rate: e.target.value }))}
                  className="input-field w-full text-sm py-4 px-4 rounded-lg bg-white/5 border-white/10 focus:border-blue-400/50 focus:bg-white/10 hover:border-blue-400/30 transition-all touch-manipulation"
                  placeholder="輸入匯率"
                  step="0.01"
                  inputMode="decimal"
                />
              </div>

              {/* 外幣金額輸入 */}
              <div className="bg-gradient-to-br from-surface/40 to-surface/20 rounded-xl p-4 border border-white/10">
                <label className="block text-sm font-semibold mb-3 text-purple-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  客人付的外幣金額
                </label>
                <input
                  type="number"
                  value={foreignChangeData.foreignAmount}
                  onChange={(e) => setForeignChangeData(prev => ({ ...prev, foreignAmount: e.target.value }))}
                  className="input-field w-full text-sm py-4 px-4 rounded-lg bg-white/5 border-white/10 focus:border-purple-400/50 focus:bg-white/10 hover:border-purple-400/30 transition-all touch-manipulation"
                  placeholder="輸入外幣金額"
                  step="0.01"
                  inputMode="decimal"
                />
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
                  className="input-field w-full text-sm py-4 px-4 rounded-lg bg-white/5 border-white/10 focus:border-orange-400/50 focus:bg-white/10 hover:border-orange-400/30 transition-all touch-manipulation"
                  placeholder="輸入商品價格"
                  step="0.01"
                  inputMode="decimal"
                />
              </div>

              {/* 計算結果 */}
              {result && (
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-400/20">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">外幣金額：</span>
                      <span className="font-semibold text-green-400">
                        {result.foreignAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">匯率：</span>
                      <span className="font-semibold text-blue-400">
                        1 外幣 = {result.rate} TWD
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">原始商品價格：</span>
                      <span className="font-semibold text-orange-400">
                        ${result.productPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">商品價格（外幣等值）：</span>
                      <span className="font-semibold text-yellow-400">
                        {result.productPriceInForeign.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">進位後商品價格（外幣）：</span>
                      <span className="font-semibold text-cyan-400">
                        {result.roundedProductPriceInForeign.toFixed(0)}
                      </span>
                    </div>
                    <div className="border-t border-green-400/20 pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-text-secondary">客人付的外幣：</span>
                        <span className="font-semibold text-purple-400">
                          {result.foreignAmount.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-text-secondary">減去商品價格（外幣）：</span>
                        <span className="font-semibold text-red-400">
                          -{result.roundedProductPriceInForeign.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-text-secondary">找零（外幣）：</span>
                        <span className="font-semibold text-yellow-400">
                          {result.changeInForeign.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-green-400">找零金額（台幣，無條件捨去）：</span>
                        <span className={`text-xl font-bold ${result.changeInTWD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${result.changeInTWD.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 清除按鈕 */}
              <button
                onClick={() => setForeignChangeData({
                  rate: '',
                  foreignAmount: '',
                  productPrice: ''
                })}
                className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 
                          text-text-secondary rounded-lg transition-all duration-200 touch-manipulation active:scale-95"
              >
                清除輸入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashierManagement 