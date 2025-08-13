import { useState, useEffect, useMemo } from 'react'
import { db } from '../utils/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { 
  Cog6ToothIcon, 
  CalculatorIcon, 
  ChartBarIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useLocalStorage } from '../hooks/useLocalStorage'
import zhtw from '../locales/zh-TW'
import { calculateSandwichPlan } from '../services/sandwichCalculator'

function SandwichCalculator() {
  const defaultSettings = { breadPerBag: 8, targetHam: 60, targetSalami: 30 }
  const [settings, setSettings] = useLocalStorage('sandwich_settings', defaultSettings)
  
  const [values, setValues] = useState({
    existingHam: '',
    existingSalami: '',
    extraBags: 0,
    distribution: 'even'
  })
  
  const [showSettings, setShowSettings] = useState(false)
  const [draftSettings, setDraftSettings] = useState(settings)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showExtraBagsBubble, setShowExtraBagsBubble] = useState(false)

  // 監聽 Firebase 設定變更
  useEffect(() => {
    let unsubscribe;
    
    try {
      unsubscribe = onSnapshot(
        doc(db, 'settings', 'sandwich'),
        (doc) => {
          if (doc.exists()) {
            setSettings(doc.data())
          } else {
            // 如果文件不存在，創建預設值
            setDoc(doc.ref, settings).catch(error => {
              console.error('創建設定文件失敗:', error)
            })
          }
          setLoading(false)
        },
        (error) => {
          console.error('讀取設定錯誤:', error)
          // 如果 Firebase 連接失敗，使用本地設定
          setError('無法連接到 Firebase，使用本地設定')
          setLoading(false)
        }
      )
    } catch (error) {
      console.error('Firebase 初始化錯誤:', error)
      setError('Firebase 連接失敗，使用本地設定')
      setLoading(false)
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])
  
  // 開啟設定視窗時帶入當前設定作為草稿
  useEffect(() => {
    if (showSettings) setDraftSettings(settings)
  }, [showSettings, settings])

  // 更新 Firebase 設定
  const updateSettings = async (newSettings) => {
    // 先更新本地（含 localStorage）
    setSettings(newSettings)
    try {
      await setDoc(doc(db, 'settings', 'sandwich'), newSettings)
    } catch (error) {
      console.error('更新設定錯誤:', error)
      setError('無法同步到 Firebase，設定已保存到本地')
    }
  }

  const saveSettings = async () => {
    await updateSettings(draftSettings)
    setShowSettings(false)
  }

  const calculate = () => {
    const r = calculateSandwichPlan(values, settings)
    setResults(r)
  }

  // 預覽用（摘要條）：即時根據當前輸入與設定顯示總結
  const preview = useMemo(() => calculateSandwichPlan(values, settings), [values, settings])

  const resetFields = () => {
    setValues({
      existingHam: '',
      existingSalami: '',
      extraBags: 0,
      distribution: 'even'
    })
    setResults(null)
  }
  
  // 分配方式選項
  const distributionMethods = [
    { value: 'even', label: zhtw.sandwich.distributionEven },
    { value: 'ham', label: zhtw.sandwich.distributionHam },
    { value: 'salami', label: zhtw.sandwich.distributionSalami }
  ]
  
  return (
    <div className="container-custom py-8">
      <div className="max-w-6xl mx-auto">
          {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            {zhtw.sandwich.title}
          </h1>
            <p className="text-text-secondary">{zhtw.sandwich.subtitle}</p>
        </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* 計算卡片 */}
          <div className="card bg-gradient-to-br from-surface/80 to-surface/60 border-primary/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                  <CalculatorIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-primary">{zhtw.sandwich.inputsTitle}</h2>
                  <p className="text-xs sm:text-sm text-text-secondary">{zhtw.sandwich.inputsSubtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary transition-all duration-200 hover:scale-110"
                title={zhtw.settings.title}
              >
                <Cog6ToothIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>


            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            ) : error ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                 {/* 一行摘要條 */}
                 <div className="grid grid-cols-3 gap-2">
                   <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
                     <div className="text-xs text-text-secondary">{zhtw.sandwichUi.summaryTarget}</div>
                     <div className="text-base font-semibold">{preview.totalTarget}</div>
                   </div>
                   <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
                     <div className="text-xs text-text-secondary">{zhtw.sandwichUi.summaryExisting}</div>
                     <div className="text-base font-semibold text-text-secondary">{preview.totalExisting}</div>
                   </div>
                   <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-center">
                     <div className="text-xs text-text-secondary">{zhtw.sandwichUi.summaryToMake}</div>
                     <div className="text-lg sm:text-xl font-bold text-primary">{preview.baseTotalNeeded}</div>
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-sm text-text-secondary mb-2">
                     {zhtw.sandwich.existingHam}
                   </label>
                   <div className="relative">
                     <input
                       type="number"
                       className="input-field w-full pr-10"
                       placeholder={zhtw.sandwichUi.inputPlaceholderNumber}
                       min={0}
                       inputMode="numeric"
                       pattern="[0-9]*"
                       onWheel={e => e.target.blur()}
                       value={values.existingHam}
                       onChange={e => setValues({
                         ...values,
                         existingHam: e.target.value
                       })}
                     />
                     <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-text-secondary text-sm">{zhtw.sandwichUi.unitPiece}</span>
                   </div>
                </div>

                 <div>
                   <label className="block text-sm text-text-secondary mb-2">
                     {zhtw.sandwich.existingSalami}
                   </label>
                   <div className="relative">
                     <input
                       type="number"
                       className="input-field w-full pr-10"
                       placeholder={zhtw.sandwichUi.inputPlaceholderNumber}
                       min={0}
                       inputMode="numeric"
                       pattern="[0-9]*"
                       onWheel={e => e.target.blur()}
                       value={values.existingSalami}
                       onChange={e => setValues({
                         ...values,
                         existingSalami: e.target.value
                       })}
                     />
                     <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-text-secondary text-sm">{zhtw.sandwichUi.unitPiece}</span>
                   </div>
                </div>

                 <div>
                   <label className="block text-sm text-text-secondary mb-2">
                     {zhtw.sandwich.distribution}
                   </label>
                                   <div role="radiogroup" aria-label={zhtw.sandwich.distribution} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                   {distributionMethods.map((method) => (
                     <button
                       key={method.value}
                       role="radio"
                       aria-checked={values.distribution === method.value}
                        title={method.value === 'even' ? zhtw.sandwichUi.tooltipEven : method.value === 'ham' ? zhtw.sandwichUi.tooltipHam : zhtw.sandwichUi.tooltipSalami}
                       onClick={() => setValues({
                         ...values,
                         distribution: method.value
                       })}
                       className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg transition-all duration-200 text-sm sm:text-base ${
                         values.distribution === method.value
                           ? 'bg-primary/20 border border-primary/30 text-primary'
                           : 'bg-white/5 hover:bg-white/10 text-text-secondary border border-transparent'
                       }`}
                     >
                       <span className="font-medium">{method.label}</span>
                     </button>
                   ))}
                 </div>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    {zhtw.sandwich.extraBagsLabel}：{values.extraBags}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={values.extraBags}
                      aria-label={zhtw.sandwich.extraBagsLabel}
                      onMouseEnter={() => setShowExtraBagsBubble(true)}
                      onMouseLeave={() => setShowExtraBagsBubble(false)}
                      onTouchStart={() => setShowExtraBagsBubble(true)}
                      onTouchEnd={() => setShowExtraBagsBubble(false)}
                      onChange={e => setValues(v => ({
                        ...v,
                        extraBags: parseInt(e.target.value, 10) || 0
                      }))}
                      className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer
                                touch-manipulation
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:w-6
                                [&::-webkit-slider-thumb]:h-6
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-primary
                                [&::-webkit-slider-thumb]:cursor-pointer
                                [&::-webkit-slider-thumb]:hover:bg-primary/80
                                [&::-webkit-slider-thumb]:transition-all
                                [&::-webkit-slider-thumb]:shadow-lg
                                [&::-moz-range-thumb]:appearance-none
                                [&::-moz-range-thumb]:border-0
                                [&::-moz-range-thumb]:w-6
                                [&::-moz-range-thumb]:h-6
                                [&::-moz-range-thumb]:rounded-full
                                [&::-moz-range-thumb]:bg-primary
                                [&::-moz-range-thumb]:cursor-pointer
                                [&::-moz-range-thumb]:hover:bg-primary/80
                                [&::-moz-range-thumb]:transition-all
                                [&::-moz-range-thumb]:shadow-lg"
                    />
                    {showExtraBagsBubble && (
                      <div
                        className="absolute -top-7"
                        style={{ left: `${(values.extraBags / 5) * 100}%`, transform: 'translateX(-50%)' }}
                      >
                        <div className="px-2 py-0.5 rounded bg-primary/80 text-white text-xs shadow">
                          {values.extraBags}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-text-secondary mt-2 px-1">
                    <span>0</span>
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>

                                 <div className="space-y-3 pt-4">
                   <button 
                     onClick={calculate}
                     className="btn-primary w-full py-3 sm:py-4 text-sm sm:text-base"
                   >
                     {zhtw.sandwich.calculate}
                   </button>
                   <button 
                     onClick={resetFields}
                     className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/5 hover:bg-white/10 
                              text-text-secondary rounded-lg transition-all duration-200 text-sm sm:text-base"
                   >
                     {zhtw.sandwich.reset}
                   </button>
                 </div>
              </div>
            )}
          </div>

           {/* 結果卡片 */}
          <div className="card bg-gradient-to-br from-surface/60 to-surface/40 border-primary/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-primary">{zhtw.sandwich.resultsTitle}</h2>
                <p className="text-xs sm:text-sm text-text-secondary">{zhtw.sandwich.resultsSubtitle}</p>
              </div>
            </div>

            {results ? (
              <div className="space-y-4 animate-fade-in">
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/30">
                    <div className="text-2xl font-bold text-white">{results.totalHamNeeded}</div>
                    <div className="text-xs text-text-secondary mt-1">{zhtw.sandwich.needHam}（{zhtw.sandwichUi.unitPiece}）</div>
                  </div>
                 
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/30">
                    <div className="text-2xl font-bold text-white">{results.totalSalamiNeeded}</div>
                    <div className="text-xs text-text-secondary mt-1">{zhtw.sandwich.needSalami}（{zhtw.sandwichUi.unitPiece}）</div>
                  </div>
                 
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/30">
                    <div className="text-2xl font-bold text-white">{results.bagsNeeded}</div>
                    <div className="text-xs text-text-secondary mt-1">{zhtw.sandwich.needBags}（{zhtw.sandwichUi.unitBag}）</div>
                  </div>

                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/30">
                    <div className="text-2xl font-bold text-white">{results.totalHamNeeded + results.totalSalamiNeeded}</div>
                    <div className="text-xs text-text-secondary mt-1">{zhtw.sandwich.totalNeed}（{zhtw.sandwichUi.unitPiece}）</div>
                  </div>

                  {/* 容量與分配資訊 */}
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10 space-y-1.5">
                    <div className="text-sm font-semibold">{zhtw.sandwichUi.capacityTitle}</div>
                    <div className="text-xs text-text-secondary">{zhtw.sandwichUi.capacityFormula}：{results.bagsNeeded} × {settings.breadPerBag} = <span className="text-white font-medium">{results.totalSlices}</span></div>
                    <div className="text-xs text-text-secondary">{zhtw.sandwichUi.capacityLeftover}：<span className="text-white font-medium">{results.extraSlices}</span></div>
                    <div className="text-xs text-text-secondary mt-2">{zhtw.sandwichUi.capacityDistributionTitle}：
                      <span className="ml-1">
                        {values.distribution === 'even' && zhtw.sandwichUi.capacityEvenDetail}
                        {values.distribution === 'ham' && zhtw.sandwichUi.capacityHamDetail}
                        {values.distribution === 'salami' && zhtw.sandwichUi.capacitySalamiDetail}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {zhtw.sandwichUi.capacityActual}：
                      <span className="ml-1 text-white font-medium">火腿 +{results.extraHam}</span>
                      <span className="mx-2">/</span>
                      <span className="text-white font-medium">臘腸 +{results.extraSalami}</span>
                    </div>
                  </div>
              </div>
            ) : (
              <div className="text-center py-12 text-text-secondary">
                <CalculatorIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{zhtw.sandwich.emptyHint}</p>
              </div>
            )}
          </div>
        </div>

        {/* 設定彈窗 */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface/95 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                  <Cog6ToothIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary">{zhtw.settings.title}</h2>
                  <p className="text-sm text-text-secondary">{zhtw.settings.subtitle}</p>
                </div>
              </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    {zhtw.settings.breadPerBag}
                  </label>
                  <input
                    type="number"
                    className="input-field w-full"
                    min={1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onWheel={e => e.target.blur()}
                    value={draftSettings.breadPerBag}
                    onChange={e => setDraftSettings(s => ({ ...s, breadPerBag: parseInt(e.target.value, 10) || 1 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    {zhtw.settings.targetHam}
                  </label>
                  <input
                    type="number"
                    className="input-field w-full"
                    min={0}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onWheel={e => e.target.blur()}
                    value={draftSettings.targetHam}
                    onChange={e => setDraftSettings(s => ({ ...s, targetHam: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    {zhtw.settings.targetSalami}
                  </label>
                  <input
                    type="number"
                    className="input-field w-full"
                    min={0}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onWheel={e => e.target.blur()}
                    value={draftSettings.targetSalami}
                    onChange={e => setDraftSettings(s => ({ ...s, targetSalami: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
               <button 
                 className="flex-1 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                 onClick={saveSettings}
               >
                 {zhtw.settings.done}
               </button>
                <button 
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary rounded-lg transition-colors"
                  onClick={() => setShowSettings(false)}
                >
                  {zhtw.common.cancel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SandwichCalculator 