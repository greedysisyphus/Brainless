import { useState, useEffect } from 'react'
import DenominationCounter from '../components/cashier/DenominationCounter'
import ForeignCurrency from '../components/cashier/ForeignCurrency'
import Summary from '../components/cashier/Summary'
import { CurrencyDollarIcon, XMarkIcon, ArrowPathIcon, CalculatorIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../contexts/ThemeContext'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwAlert, CwBadge, CwButton, CwCard, CwGrid, CwInput, CwStack } from '../components/studio/ui'

const CASHIER_BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '門市營運', href: '#/' },
  { label: '收銀管理', href: '#/cashier' },
]

function CashierManagement() {
  const { isStudio } = useTheme()

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

  const dislikeDays = Math.floor((new Date() - new Date('2024-05-01')) / (1000 * 60 * 60 * 24))

  const fxFieldPanelCraft = 'rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-4'
  const fxFieldPanelClassic = 'rounded-xl border border-white/10 bg-gradient-to-br from-surface/40 to-surface/20 p-4'
  const fxMuted = isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'
  const fxRateInvalid = foreignChangeData.rate && parseFloat(foreignChangeData.rate) <= 0
  const fxPriceInvalid = foreignChangeData.productPrice && parseFloat(foreignChangeData.productPrice) < 0
  const fxForeignInvalid = foreignChangeData.foreignAmount && parseFloat(foreignChangeData.foreignAmount) < 0

  const mainGridClassic = (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <DenominationCounter
        title="收銀機現金"
        onTotalChange={setCashierTotal}
        savedKey="cashierDenominations"
        resetKey={resetKey}
      />
      <DenominationCounter title="抽屜現金" onTotalChange={setDrawerTotal} savedKey="drawerDenominations" resetKey={resetKey} />
      <ForeignCurrency onTotalChange={setForeignTotal} savedKey="foreignTransactions" resetKey={resetKey} />
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
  )

  const mainGridCraft = (
    <CwGrid className="!grid-cols-1 lg:!grid-cols-2">
      <CwCard title="收銀機現金" className="border-[var(--cw-border-strong)]">
        <DenominationCounter
          visualVariant="studio"
          omitTitle
          title="收銀機現金"
          onTotalChange={setCashierTotal}
          savedKey="cashierDenominations"
          resetKey={resetKey}
        />
      </CwCard>
      <CwCard title="抽屜現金" className="border-[var(--cw-border-strong)]">
        <DenominationCounter
          visualVariant="studio"
          omitTitle
          title="抽屜現金"
          onTotalChange={setDrawerTotal}
          savedKey="drawerDenominations"
          resetKey={resetKey}
        />
      </CwCard>
      <CwCard title="外幣交易" className="border-[var(--cw-border-strong)]">
        <ForeignCurrency
          visualVariant="studio"
          omitTitle
          onTotalChange={setForeignTotal}
          savedKey="foreignTransactions"
          resetKey={resetKey}
        />
      </CwCard>
      <CwCard title="日結匯總" className="border-[var(--cw-border-strong)]">
        <Summary
          visualVariant="studio"
          omitTitle
          cashierTotal={cashierTotal}
          drawerTotal={drawerTotal}
          foreignTotal={foreignTotal}
          posAmount={posAmount}
          onPosAmountChange={setPosAmount}
          foreignTransactions={resetKey > 0 ? [] : JSON.parse(localStorage.getItem('foreignTransactions') || '[]')}
          resetKey={resetKey}
        />
      </CwCard>
    </CwGrid>
  )

  const fabAndModal = (
    <>

      {/* 浮動外幣找零計算器按鈕 */}
      <button
        type="button"
        onClick={() => setShowForeignChangeCalculator(true)}
        className={
          isStudio
            ? 'cw-touch-target cw-pb-safe fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] text-[var(--cw-text)] shadow-lg transition-colors hover:bg-[var(--cw-surface)] active:scale-95 md:hover:opacity-95'
            : 'fixed bottom-6 right-6 z-50 flex touch-manipulation items-center justify-center rounded-full border border-green-400/30 bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 text-green-400 shadow-lg transition-all duration-200 hover:scale-110 hover:border-green-500/50 hover:from-green-500/30 hover:to-emerald-500/30 hover:shadow-xl active:scale-95'
        }
        style={{ minWidth: '56px', minHeight: '56px' }}
        aria-label="開啟外幣找零計算器"
      >
        <CurrencyDollarIcon className="w-7 h-7" />
      </button>

      {/* 浮動外幣找零計算器彈窗 */}
      {showForeignChangeCalculator && (
        <div
          className={
            isStudio
              ? 'fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/70 touch-manipulation'
              : 'fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm touch-manipulation'
          }
          onClick={() => setShowForeignChangeCalculator(false)}
        >
          <div
            className={`flex min-h-[100dvh] w-full items-center justify-center px-4 sm:px-5 ${isStudio ? 'cw-pb-safe py-10 pt-[max(2.75rem,calc(env(safe-area-inset-top)+1.25rem))] pb-[max(2rem,env(safe-area-inset-bottom)+1rem)] sm:py-14' : 'py-10 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1rem))] pb-12 sm:py-14'}`}
          >
            <div
              className={
                isStudio
                  ? 'w-full max-w-md rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] shadow-2xl touch-manipulation [-webkit-overflow-scrolling:touch]'
                  : 'w-full max-w-md touch-manipulation rounded-2xl border border-white/20 bg-surface/95 shadow-2xl backdrop-blur-md'
              }
              onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cashier-fx-modal-title"
          >
            {/* 固定的標題和關閉按鈕區域 */}
            <div
              className={
                isStudio
                  ? 'sticky top-0 z-10 rounded-t-[var(--cw-radius-lg)] border-b border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-6 pb-4 pt-5'
                  : 'sticky top-0 z-10 rounded-t-2xl border-b border-white/10 bg-surface/95 p-6 pb-4 backdrop-blur-md'
              }
            >
              <div className="flex justify-between gap-4">
                <div>
                  <h2
                    id="cashier-fx-modal-title"
                    className={`mb-1 text-xl font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-green-400'}`}
                  >
                    外幣找零計算器
                  </h2>
                  <p className={`text-sm ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>
                    計算外幣找零金額 • 按 ESC 關閉
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForeignChangeCalculator(false)}
                  className={
                    isStudio
                      ? 'cw-touch-target shrink-0 rounded-[var(--cw-radius)] border border-transparent p-3 text-[var(--cw-text-muted)] transition-colors hover:border-[var(--cw-border-strong)] hover:bg-[var(--cw-bg)] hover:text-[var(--cw-text)]'
                      : 'touch-manipulation rounded-xl p-4 text-red-400 transition-all duration-200 hover:bg-red-500/20 active:scale-95'
                  }
                  style={{ minWidth: '56px', minHeight: '56px' }}
                  aria-label="關閉外幣找零計算器"
                >
                  <XMarkIcon className="mx-auto h-7 w-7" />
                </button>
              </div>
            </div>

            {/* 可滾動的內容區域 */}
            <div className="p-6 pt-4 space-y-4 max-h-[70vh] overflow-y-auto [-webkit-overflow-scrolling:touch]">
              {/* 輸入區域 - 2x2 網格佈局 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 匯率輸入 */}
                <div className={isStudio ? fxFieldPanelCraft : fxFieldPanelClassic}>
                  {isStudio ? (
                    <CwInput
                      label="匯率 (1 外幣 = ? TWD)"
                      id="cashier-fx-rate"
                      type="number"
                      value={foreignChangeData.rate}
                      onChange={(e) => {
                        const newRate = e.target.value
                        setForeignChangeData((prev) => ({ ...prev, rate: newRate }))
                        if (newRate && parseFloat(newRate) > 0) {
                          localStorage.setItem('lastExchangeRate', newRate)
                        }
                      }}
                      onBlur={(e) => {
                        const newRate = e.target.value
                        if (newRate && parseFloat(newRate) > 0) {
                          addRateToHistory(newRate)
                          setRateHistoryKey((prev) => prev + 1)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newRate = e.target.value
                          if (newRate && parseFloat(newRate) > 0) {
                            addRateToHistory(newRate)
                            setRateHistoryKey((prev) => prev + 1)
                          }
                        }
                      }}
                      inputClassName={fxRateInvalid ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/25' : ''}
                      hint={fxRateInvalid ? '匯率必須大於 0' : undefined}
                      placeholder="輸入匯率"
                      step="0.01"
                      inputMode="decimal"
                      min="0.01"
                    />
                  ) : (
                    <>
                      <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        匯率 (1 外幣 = ? TWD)
                      </label>
                      <input
                        type="number"
                        value={foreignChangeData.rate}
                        onChange={(e) => {
                          const newRate = e.target.value
                          setForeignChangeData((prev) => ({ ...prev, rate: newRate }))
                          if (newRate && parseFloat(newRate) > 0) {
                            localStorage.setItem('lastExchangeRate', newRate)
                          }
                        }}
                        onBlur={(e) => {
                          const newRate = e.target.value
                          if (newRate && parseFloat(newRate) > 0) {
                            addRateToHistory(newRate)
                            setRateHistoryKey((prev) => prev + 1)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const newRate = e.target.value
                            if (newRate && parseFloat(newRate) > 0) {
                              addRateToHistory(newRate)
                              setRateHistoryKey((prev) => prev + 1)
                            }
                          }
                        }}
                        className={`input-field min-h-[52px] w-full touch-manipulation rounded-lg border bg-white/5 px-4 py-4 text-sm transition-all focus:bg-white/10 ${
                          foreignChangeData.rate && parseFloat(foreignChangeData.rate) <= 0
                            ? 'border-red-400/50 focus:border-red-400/70'
                            : 'border-white/10 hover:border-blue-400/30 focus:border-blue-400/50'
                        }`}
                        placeholder="輸入匯率"
                        step="0.01"
                        inputMode="decimal"
                        min="0.01"
                      />
                    </>
                  )}

                  <div className="mt-3">
                    {isStudio ? (
                      <CwButton
                        type="button"
                        variant="ghost"
                        className="!h-auto !min-h-0 !justify-start gap-2 !px-2 !py-2"
                        onClick={() => setShowRateHistory(!showRateHistory)}
                      >
                        <span className="text-sm text-[var(--cw-text)]">歷史匯率</span>
                        {getRateHistory().length > 0 ? <CwBadge tone="accent">{getRateHistory().length}</CwBadge> : null}
                        <span
                          className={`text-xs ${fxMuted} transition-transform duration-200 ${showRateHistory ? 'rotate-180' : ''}`}
                        >
                          ▼
                        </span>
                      </CwButton>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowRateHistory(!showRateHistory)}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                      >
                        <span>歷史匯率</span>
                        {getRateHistory().length > 0 && (
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                            {getRateHistory().length}
                          </span>
                        )}
                        <span className={`text-xs transition-transform duration-200 ${showRateHistory ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                    )}

                    {showRateHistory && (
                      <div
                        key={rateHistoryKey}
                        className={
                          isStudio
                            ? 'mt-3 rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-4'
                            : 'mt-2 rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 p-4'
                        }
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div
                            className={`text-sm font-medium ${isStudio ? 'text-[var(--cw-text)]' : 'text-blue-400'}`}
                          >
                            已儲存的匯率
                          </div>
                          {getRateHistory().length > 0 &&
                            (isStudio ? (
                              <CwButton
                                type="button"
                                variant="ghost"
                                className="!min-h-0 !px-2 !py-1 text-xs text-red-300 hover:bg-red-500/10"
                                onClick={clearRateHistory}
                                title="清除所有歷史記錄"
                              >
                                清除全部
                              </CwButton>
                            ) : (
                              <button
                                type="button"
                                onClick={clearRateHistory}
                                className="rounded px-2 py-1 text-xs text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                title="清除所有歷史記錄"
                              >
                                清除全部
                              </button>
                            ))}
                        </div>
                        {getRateHistory().length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {getRateHistory().map((rate, index) => (
                              <div
                                key={`${rate}-${index}`}
                                className={
                                  isStudio
                                    ? 'flex items-center gap-1 rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] px-2 py-1.5 transition-colors hover:border-[var(--cw-border-strong)]'
                                    : 'flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10'
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForeignChangeData((prev) => ({ ...prev, rate }))
                                    localStorage.setItem('lastExchangeRate', rate)
                                  }}
                                  className={
                                    isStudio
                                      ? 'text-sm font-medium text-[var(--cw-text)] transition-colors hover:text-[var(--cw-text)]'
                                      : 'text-sm font-medium text-white transition-colors hover:text-blue-400'
                                  }
                                >
                                  {rate}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeRateFromHistory(rate)}
                                  className={
                                    isStudio
                                      ? 'ml-1 flex h-6 w-6 items-center justify-center rounded text-xs text-[var(--cw-text-muted)] transition-colors hover:bg-red-500/15 hover:text-red-300'
                                      : 'ml-1 flex h-4 w-4 items-center justify-center rounded text-xs text-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400'
                                  }
                                  title="刪除此匯率"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            className={`py-2 text-center text-sm ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary/60'}`}
                          >
                            尚無歷史記錄
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {!isStudio && foreignChangeData.rate && parseFloat(foreignChangeData.rate) <= 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                      <span>⚠️</span>
                      <span>匯率必須大於 0</span>
                    </div>
                  )}
                </div>

                {/* 商品價格輸入 */}
                <div className={isStudio ? fxFieldPanelCraft : fxFieldPanelClassic}>
                  {isStudio ? (
                    <CwInput
                      label="商品價格 (TWD)"
                      id="cashier-fx-price"
                      type="number"
                      value={foreignChangeData.productPrice}
                      onChange={(e) => setForeignChangeData((prev) => ({ ...prev, productPrice: e.target.value }))}
                      inputClassName={fxPriceInvalid ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/25' : ''}
                      hint={fxPriceInvalid ? '商品價格不能為負數' : undefined}
                      placeholder="輸入商品價格"
                      step="0.01"
                      inputMode="decimal"
                      min="0"
                    />
                  ) : (
                    <>
                      <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                        商品價格 (TWD)
                      </label>
                      <input
                        type="number"
                        value={foreignChangeData.productPrice}
                        onChange={(e) => setForeignChangeData((prev) => ({ ...prev, productPrice: e.target.value }))}
                        className={`input-field min-h-[52px] w-full touch-manipulation rounded-lg border bg-white/5 px-4 py-4 text-sm transition-all focus:bg-white/10 ${
                          foreignChangeData.productPrice && parseFloat(foreignChangeData.productPrice) < 0
                            ? 'border-red-400/50 focus:border-red-400/70'
                            : 'border-white/10 hover:border-orange-400/30 focus:border-orange-400/50'
                        }`}
                        placeholder="輸入商品價格"
                        step="0.01"
                        inputMode="decimal"
                        min="0"
                      />
                    </>
                  )}
                  {!isStudio && foreignChangeData.productPrice && parseFloat(foreignChangeData.productPrice) < 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                      <span>⚠️</span>
                      <span>商品價格不能為負數</span>
                    </div>
                  )}
                </div>

                {/* 外幣金額輸入 - 跨兩欄 */}
                <div className={`sm:col-span-2 ${isStudio ? fxFieldPanelCraft : fxFieldPanelClassic}`}>
                  {isStudio ? (
                    <CwInput
                      label="客人付的外幣金額"
                      id="cashier-fx-foreign"
                      type="number"
                      value={foreignChangeData.foreignAmount}
                      onChange={(e) => setForeignChangeData((prev) => ({ ...prev, foreignAmount: e.target.value }))}
                      inputClassName={fxForeignInvalid ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/25' : ''}
                      hint={fxForeignInvalid ? '外幣金額不能為負數' : undefined}
                      placeholder="輸入外幣金額"
                      step="0.01"
                      inputMode="decimal"
                      min="0"
                    />
                  ) : (
                    <>
                      <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-purple-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                        客人付的外幣金額
                      </label>
                      <input
                        type="number"
                        value={foreignChangeData.foreignAmount}
                        onChange={(e) => setForeignChangeData((prev) => ({ ...prev, foreignAmount: e.target.value }))}
                        className={`input-field min-h-[52px] w-full touch-manipulation rounded-lg border bg-white/5 px-4 py-4 text-sm transition-all focus:bg-white/10 ${
                          foreignChangeData.foreignAmount && parseFloat(foreignChangeData.foreignAmount) < 0
                            ? 'border-red-400/50 focus:border-red-400/70'
                            : 'border-white/10 hover:border-purple-400/30 focus:border-purple-400/50'
                        }`}
                        placeholder="輸入外幣金額"
                        step="0.01"
                        inputMode="decimal"
                        min="0"
                      />
                    </>
                  )}
                  {!isStudio && foreignChangeData.foreignAmount && parseFloat(foreignChangeData.foreignAmount) < 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                      <span>⚠️</span>
                      <span>外幣金額不能為負數</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 計算結果 */}
              {result && (
                <div
                  className={
                    isStudio
                      ? `animate-fadeIn rounded-[var(--cw-radius-lg)] border p-5 shadow-sm ${
                          isExactAmount
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : isInsufficient
                              ? 'border-red-500/40 bg-red-500/10'
                              : hasChange
                                ? 'border-amber-500/40 bg-amber-500/10'
                                : 'border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)]'
                        }`
                      : `animate-fadeIn rounded-xl border p-6 shadow-lg ${
                          isExactAmount
                            ? 'border-green-400/40 bg-gradient-to-br from-green-500/20 to-emerald-500/20 shadow-green-500/20'
                            : isInsufficient
                              ? 'border-red-400/40 bg-gradient-to-br from-red-500/20 to-pink-500/20 shadow-red-500/20'
                              : hasChange
                                ? 'border-blue-400/40 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 shadow-blue-500/20'
                                : 'border-green-400/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 shadow-green-500/10'
                        }`
                  }
                >
                  {isStudio ? (
                    <>
                      {isExactAmount ? (
                        <CwAlert variant="success" title="金額剛好" className="mb-4">
                          無需找零
                        </CwAlert>
                      ) : null}
                      {isInsufficient ? (
                        <CwAlert variant="error" title="金額不足" className="mb-4">
                          需補差額
                        </CwAlert>
                      ) : null}
                      {hasChange ? (
                        <CwAlert variant="warning" title="需要找零" className="mb-4">
                          請確認找零金額與外幣等值
                        </CwAlert>
                      ) : null}

                      {!isExactAmount ? (
                        <div className="mb-4 text-center">
                          <div className={`mb-2 text-sm ${fxMuted}`}>最終找零金額</div>
                          <div
                            className={`mb-2 text-3xl font-bold tabular-nums ${
                              isInsufficient ? 'text-red-300' : 'text-[var(--cw-text)]'
                            }`}
                          >
                            ${result.changeInTWD.toFixed(0)}
                          </div>
                          <div className={`mb-4 text-base ${fxMuted}`}>外幣等值：{result.changeInForeign.toFixed(2)}</div>

                          <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className={`text-sm ${fxMuted}`}>付款金額</span>
                              <span className="text-sm font-semibold tabular-nums text-[var(--cw-text)]">
                                ${result.foreignAmountInTWD.toFixed(0)}
                              </span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--cw-border-strong)]">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isInsufficient ? 'bg-red-400' : 'bg-[var(--cw-text)]'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, (result.foreignAmountInTWD / result.productPrice) * 100))}%`,
                                }}
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className={`text-sm ${fxMuted}`}>商品價格</span>
                              <span className="text-sm font-semibold tabular-nums text-[var(--cw-text)]">
                                ${result.productPrice.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <details className="mt-2">
                        <summary
                          className={`flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold transition-colors ${fxMuted} hover:text-[var(--cw-text)]`}
                        >
                          查看詳細計算步驟
                        </summary>
                        <div className="mt-4 space-y-3 border-t border-[var(--cw-border)] pt-4 text-sm">
                          <div className="flex items-center justify-between">
                            <span className={fxMuted}>商品價格：</span>
                            <span className="font-semibold tabular-nums text-[var(--cw-text)]">
                              ${result.productPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={fxMuted}>客人付的外幣：</span>
                            <span className="font-semibold tabular-nums text-[var(--cw-text)]">
                              {result.foreignAmount.toFixed(0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={fxMuted}>客人付的台幣等值：</span>
                            <span className="font-semibold tabular-nums text-[var(--cw-text)]">
                              ${result.foreignAmountInTWD.toFixed(0)}
                            </span>
                          </div>
                          <div className="mt-2 border-t border-[var(--cw-border)] pt-2">
                            <div className="flex items-center justify-between">
                              <span className={fxMuted}>減去商品價格：</span>
                              <span className="font-semibold tabular-nums text-red-300">-${result.productPrice.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      </details>
                    </>
                  ) : (
                    <>
                      {isExactAmount && (
                        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-400/30 bg-green-500/20 p-4">
                          <div className="h-3 w-3 animate-pulse rounded-full bg-green-400" />
                          <span className="text-base font-semibold text-green-400">金額剛好，無需找零</span>
                        </div>
                      )}
                      {isInsufficient && (
                        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-400/30 bg-red-500/20 p-4">
                          <div className="h-3 w-3 rounded-full bg-red-400" />
                          <span className="text-base font-semibold text-red-400">金額不足，需補差額</span>
                        </div>
                      )}
                      {hasChange && (
                        <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-400/30 bg-blue-500/20 p-4">
                          <div className="h-3 w-3 rounded-full bg-blue-400" />
                          <span className="text-base font-semibold text-blue-400">需要找零</span>
                        </div>
                      )}

                      {!isExactAmount && (
                        <div className="mb-6 text-center">
                          <div className="mb-2 text-sm text-text-secondary">最終找零金額</div>
                          <div className={`mb-2 text-4xl font-bold ${isInsufficient ? 'text-red-400' : 'text-blue-400'}`}>
                            ${result.changeInTWD.toFixed(0)}
                          </div>
                          <div className="mb-4 text-base text-text-secondary">外幣等值：{result.changeInForeign.toFixed(2)}</div>

                          <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm text-text-secondary">付款金額</span>
                              <span className="text-sm font-semibold text-purple-400">${result.foreignAmountInTWD.toFixed(0)}</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isInsufficient ? 'bg-red-400' : 'bg-blue-400'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, (result.foreignAmountInTWD / result.productPrice) * 100))}%`,
                                }}
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm text-text-secondary">商品價格</span>
                              <span className="text-sm font-semibold text-orange-400">${result.productPrice.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <details className="mt-6">
                        <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold text-text-secondary transition-colors hover:text-white">
                          查看詳細計算步驟
                        </summary>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">商品價格：</span>
                            <span className="font-semibold text-orange-400">${result.productPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">客人付的外幣：</span>
                            <span className="font-semibold text-purple-400">{result.foreignAmount.toFixed(0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">客人付的台幣等值：</span>
                            <span className="font-semibold text-purple-400">${result.foreignAmountInTWD.toFixed(0)}</span>
                          </div>
                          <div className="mt-2 border-t border-white/10 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-text-secondary">減去商品價格：</span>
                              <span className="font-semibold text-red-400">-${result.productPrice.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      </details>
                    </>
                  )}
                </div>
              )}

              {/* 操作按鈕 */}
              {isStudio ? (
                <div className="grid grid-cols-2 gap-3">
                  <CwButton
                    type="button"
                    variant="secondary"
                    className="min-h-11"
                    onClick={() =>
                      setForeignChangeData({
                        rate: '',
                        foreignAmount: '',
                        productPrice: '',
                      })
                    }
                  >
                    清除輸入
                  </CwButton>
                  {result ? (
                    <CwButton
                      type="button"
                      variant="primary"
                      className="min-h-11"
                      onClick={() => {
                        navigator.clipboard.writeText(`找零金額：$${result.changeInTWD.toFixed(0)}`)
                      }}
                    >
                      複製結果
                    </CwButton>
                  ) : (
                    <div className="min-h-11" aria-hidden />
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setForeignChangeData({
                        rate: '',
                        foreignAmount: '',
                        productPrice: '',
                      })
                    }
                    className="min-h-[56px] touch-manipulation rounded-xl bg-white/5 px-6 py-4 text-base font-medium text-text-secondary transition-all duration-200 hover:bg-white/10 active:scale-95"
                  >
                    清除輸入
                  </button>
                  {result && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`找零金額：$${result.changeInTWD.toFixed(0)}`)
                      }}
                      className="min-h-[56px] touch-manipulation rounded-xl border border-blue-400/30 bg-blue-500/20 px-6 py-4 text-base font-medium text-blue-400 transition-all duration-200 hover:bg-blue-500/30 active:scale-95"
                    >
                      複製結果
                    </button>
                  )}
                </div>
              )}

              {/* 計算公式說明 */}
              {isStudio ? (
                <div className="rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--cw-text)]">計算公式</h3>
                  <div className={`space-y-2 text-sm ${fxMuted}`}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--cw-mega-surface)] text-[11px] font-bold text-[var(--cw-text)]">
                        1
                      </span>
                      <span className="text-[var(--cw-text)]">客人外幣 × 匯率 = 台幣等值（捨去）</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--cw-mega-surface)] text-[11px] font-bold text-[var(--cw-text)]">
                        2
                      </span>
                      <span className="text-[var(--cw-text)]">台幣等值 - 商品價格 = 找零金額</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-blue-400">計算公式</h3>
                  <div className="space-y-2 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400/20 text-xs font-bold text-blue-400">
                        1
                      </span>
                      <span>客人外幣 × 匯率 = 台幣等值（捨去）</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400/20 text-xs font-bold text-blue-400">
                        2
                      </span>
                      <span>台幣等值 - 商品價格 = 找零金額</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  )

  return (
    <DualThemePage
      breadcrumbs={CASHIER_BC}
      title="收銀管理系統"
      description={`討厭算錢的第 ${dislikeDays} 天。`}
      classic={
        <div className="container-custom py-6">
          <div className="mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">收銀管理系統</h1>
                <p className="text-text-secondary">
                  討厭算錢的第
                  <span className="mx-1 inline-block rounded-lg border border-primary/30 bg-primary/20 px-2 py-1 font-semibold text-primary">
                    {dislikeDays}
                  </span>
                  天
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForeignChangeCalculator(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-green-400/30 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-2 text-green-400 shadow-lg transition-all duration-200 hover:border-green-500/50 hover:from-green-500/30 hover:to-emerald-500/30 hover:shadow-xl"
                >
                  <CalculatorIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">外幣找零</span>
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-gradient-to-r from-red-500/20 to-pink-500/20 px-4 py-2 text-red-400 shadow-lg transition-all duration-200 hover:border-red-500/50 hover:from-red-500/30 hover:to-pink-500/30 hover:shadow-xl"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">重置數據</span>
                </button>
              </div>
            </div>
          </div>
          {mainGridClassic}
          {fabAndModal}
        </div>
      }
      studio={
        <>
          <CwStack className="!gap-[var(--cw-stack-gap)]">
            <div className="flex flex-wrap gap-3">
              <CwButton type="button" variant="secondary" className="min-h-11 gap-2" onClick={() => setShowForeignChangeCalculator(true)}>
                <CalculatorIcon className="h-5 w-5 shrink-0" />
                外幣找零
              </CwButton>
              <CwButton type="button" variant="danger" className="min-h-11 gap-2" onClick={resetAll}>
                <ArrowPathIcon className="h-5 w-5 shrink-0" />
                重置數據
              </CwButton>
            </div>
            {mainGridCraft}
          </CwStack>
          {fabAndModal}
        </>
      }
    />
  )
}

export default CashierManagement 