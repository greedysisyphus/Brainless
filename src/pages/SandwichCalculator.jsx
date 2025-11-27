import { useState, useEffect, useMemo, useRef } from 'react'
import { db } from '../utils/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { 
  Cog6ToothIcon, 
  CalculatorIcon, 
  ChartBarIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import { useLocalStorage } from '../hooks/useLocalStorage'
import zhtw from '../locales/zh-TW'
import { calculateSandwichPlan } from '../services/sandwichCalculator'

function SandwichCalculator() {
  const defaultSettings = { breadPerBag: 8, targetHam: 60, targetSalami: 30 }
  const defaultValues = {
    existingHam: '',
    existingSalami: '',
    extraBags: 0,
    distribution: 'even'
  }
  
  // 店鋪選擇
  const [selectedStore, setSelectedStore] = useState('central') // 'central', 'd7', 'd13'
  
  // 為每個店鋪分別存儲設定
  const [settingsCentral, setSettingsCentral] = useLocalStorage('sandwich_settings_central', defaultSettings)
  const [settingsD7, setSettingsD7] = useLocalStorage('sandwich_settings_d7', defaultSettings)
  const [settingsD13, setSettingsD13] = useLocalStorage('sandwich_settings_d13', defaultSettings)
  
  // 為每個店鋪分別存儲輸入值
  const [valuesCentral, setValuesCentral] = useLocalStorage('sandwich_values_central', defaultValues)
  const [valuesD7, setValuesD7] = useLocalStorage('sandwich_values_d7', defaultValues)
  const [valuesD13, setValuesD13] = useLocalStorage('sandwich_values_d13', defaultValues)
  
  // 當前選中店鋪的設定和輸入值
  const settings = useMemo(() => {
    if (selectedStore === 'd7') return settingsD7
    if (selectedStore === 'd13') return settingsD13
    return settingsCentral
  }, [selectedStore, settingsCentral, settingsD7, settingsD13])
  
  const values = useMemo(() => {
    if (selectedStore === 'd7') return valuesD7
    if (selectedStore === 'd13') return valuesD13
    return valuesCentral
  }, [selectedStore, valuesCentral, valuesD7, valuesD13])
  
  // 更新當前店鋪的輸入值（支持函數式更新）
  const setValues = (newValues) => {
    if (typeof newValues === 'function') {
      // 函數式更新
      if (selectedStore === 'd7') setValuesD7(newValues)
      else if (selectedStore === 'd13') setValuesD13(newValues)
      else setValuesCentral(newValues)
    } else {
      // 直接設置值
      if (selectedStore === 'd7') setValuesD7(newValues)
      else if (selectedStore === 'd13') setValuesD13(newValues)
      else setValuesCentral(newValues)
    }
  }
  
  const [showSettings, setShowSettings] = useState(false)
  const [draftSettings, setDraftSettings] = useState(settings)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showExtraBagsBubble, setShowExtraBagsBubble] = useState(false)
  
  // 用於追蹤 Firebase 訂閱
  const unsubscribeRef = useRef(null)
  const loadingRef = useRef(false)
  
  // 切換店鋪時清除計算結果
  useEffect(() => {
    setResults(null)
  }, [selectedStore])
  
  // 監聽 Firebase 設定變更（根據選中的店鋪）
  useEffect(() => {
    // 清理舊的訂閱
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    
    setLoading(true)
    loadingRef.current = true
    setError(null)
    const firebaseDocId = `sandwich_${selectedStore}`
    let unsubscribe
    let isMounted = true
    let timeoutId
    
    try {
      // 根據當前店鋪選擇對應的設定更新函數
      const updateSettingsForStore = (data) => {
        if (!isMounted) return
        if (selectedStore === 'd7') {
          setSettingsD7(data)
        } else if (selectedStore === 'd13') {
          setSettingsD13(data)
        } else {
          setSettingsCentral(data)
        }
        if (isMounted) {
          setLoading(false)
          loadingRef.current = false
          if (timeoutId) clearTimeout(timeoutId)
        }
      }
      
      // 設置超時機制，5秒後如果還沒有回應就使用本地設定
      timeoutId = setTimeout(() => {
        if (isMounted && loadingRef.current) {
          console.warn('Firebase 連接超時，使用本地設定')
          setError('連接超時，使用本地設定')
          setLoading(false)
          loadingRef.current = false
        }
      }, 5000)
      
      unsubscribe = onSnapshot(
        doc(db, 'settings', firebaseDocId),
        (docSnapshot) => {
          if (!isMounted) return
          if (timeoutId) clearTimeout(timeoutId)
          
          if (docSnapshot.exists()) {
            updateSettingsForStore(docSnapshot.data())
          } else {
            // 如果文件不存在，創建預設值
            setDoc(docSnapshot.ref, defaultSettings)
              .then(() => {
                if (isMounted) {
                  updateSettingsForStore(defaultSettings)
                }
              })
              .catch(error => {
                console.error('創建設定文件失敗:', error)
                if (isMounted) {
                  setError('無法同步到 Firebase，使用本地設定')
                  setLoading(false)
                  loadingRef.current = false
                }
              })
          }
        },
        (error) => {
          console.error('讀取設定錯誤:', error)
          if (timeoutId) clearTimeout(timeoutId)
          // 如果 Firebase 連接失敗，使用本地設定
          if (isMounted) {
            setError('無法連接到 Firebase，使用本地設定')
            setLoading(false)
            loadingRef.current = false
          }
        }
      )
      
      unsubscribeRef.current = unsubscribe
    } catch (error) {
      console.error('Firebase 初始化錯誤:', error)
      if (timeoutId) clearTimeout(timeoutId)
      if (isMounted) {
        setError('Firebase 連接失敗，使用本地設定')
        setLoading(false)
        loadingRef.current = false
      }
    }

    return () => {
      isMounted = false
      loadingRef.current = false
      if (timeoutId) clearTimeout(timeoutId)
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [selectedStore]) // 只依賴 selectedStore，避免無限循環
  
  // 開啟設定視窗時帶入當前設定作為草稿
  useEffect(() => {
    if (showSettings) setDraftSettings(settings)
  }, [showSettings, settings])

  // 更新 Firebase 設定（根據選中的店鋪）
  const updateSettings = async (newSettings) => {
    // 先更新本地（含 localStorage）
    if (selectedStore === 'd7') {
      setSettingsD7(newSettings)
    } else if (selectedStore === 'd13') {
      setSettingsD13(newSettings)
    } else {
      setSettingsCentral(newSettings)
    }
    
    try {
      const firebaseDocId = `sandwich_${selectedStore}`
      await setDoc(doc(db, 'settings', firebaseDocId), newSettings)
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
  
  // 店鋪選項
  const stores = [
    { value: 'central', label: zhtw.sandwich.storeCentral },
    { value: 'd7', label: zhtw.sandwich.storeD7 },
    { value: 'd13', label: zhtw.sandwich.storeD13 }
  ]
  
  return (
    <div className="container-custom py-8">
      <div className="max-w-6xl mx-auto">
          {/* 頁面標題 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl mb-4 border border-primary/30 shadow-lg">
            <CalculatorIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent">
            {zhtw.sandwich.title}
          </h1>
          <p className="text-gray-400 text-sm">{zhtw.sandwich.subtitle}</p>
        </div>

        {/* 分店選擇 */}
        <div className="card backdrop-blur-sm bg-gradient-to-br from-surface/80 to-surface/40 border border-white/20 shadow-xl mb-6">
          <div className="p-6">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center justify-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <BuildingStorefrontIcon className="w-5 h-5" />
              </div>
              {zhtw.sandwich.selectStore}
            </h2>
            
            <div className="grid grid-cols-3 gap-3">
              {stores.map((store) => (
                <button
                  key={store.value}
                  onClick={() => setSelectedStore(store.value)}
                  className={`group relative px-4 py-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    selectedStore === store.value
                      ? 'bg-gradient-to-br from-primary/30 to-purple-500/30 border-primary shadow-lg shadow-primary/20'
                      : 'bg-surface/40 border-white/20 hover:border-primary/50'
                  }`}
                >
                  <div className={`text-center ${selectedStore === store.value ? 'text-primary' : 'text-gray-300'}`}>
                    <div className="text-xl font-bold">{store.label}</div>
                  </div>
                  {selectedStore === store.value && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* 計算卡片 */}
          <div className="card backdrop-blur-sm bg-gradient-to-br from-surface/80 to-surface/60 border border-white/20 shadow-xl">
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
                 <div className="grid grid-cols-3 gap-3">
                   <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-400/20 p-4 text-center backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300">
                     <div className="text-xs text-blue-300 mb-1 font-medium">{zhtw.sandwichUi.summaryTarget}</div>
                     <div className="text-xl font-bold text-blue-200">{preview.totalTarget}</div>
                   </div>
                   <div className="rounded-xl bg-gradient-to-br from-gray-500/10 to-slate-500/10 border border-gray-400/20 p-4 text-center backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300">
                     <div className="text-xs text-gray-300 mb-1 font-medium">{zhtw.sandwichUi.summaryExisting}</div>
                     <div className="text-xl font-bold text-gray-200">{preview.totalExisting}</div>
                   </div>
                   <div className="rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border-2 border-primary/40 p-4 text-center backdrop-blur-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 transform hover:scale-105">
                     <div className="text-xs text-primary/80 mb-1 font-medium">{zhtw.sandwichUi.summaryToMake}</div>
                     <div className="text-2xl font-bold text-primary">{preview.baseTotalNeeded}</div>
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2.5">
                     {zhtw.sandwich.existingHam}
                   </label>
                   <div className="relative group">
                     <input
                       type="number"
                       className="input-field w-full pr-12 py-3 bg-surface/60 border-2 border-white/10 focus:border-purple-400/50 focus:bg-surface/80 rounded-xl transition-all duration-300 text-base"
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
                     <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 text-sm font-medium">{zhtw.sandwichUi.unitPiece}</span>
                   </div>
                </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2.5">
                     {zhtw.sandwich.existingSalami}
                   </label>
                   <div className="relative group">
                     <input
                       type="number"
                       className="input-field w-full pr-12 py-3 bg-surface/60 border-2 border-white/10 focus:border-indigo-400/50 focus:bg-surface/80 rounded-xl transition-all duration-300 text-base"
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
                     <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 text-sm font-medium">{zhtw.sandwichUi.unitPiece}</span>
                   </div>
                </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2.5">
                     {zhtw.sandwich.distribution}
                   </label>
                   <div role="radiogroup" aria-label={zhtw.sandwich.distribution} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                         className={`px-4 py-3 rounded-xl transition-all duration-300 text-sm sm:text-base font-medium border-2 ${
                           values.distribution === method.value
                             ? 'bg-gradient-to-br from-primary/30 to-purple-500/30 border-primary/50 text-primary shadow-lg shadow-primary/20 transform scale-[1.02]'
                             : 'bg-surface/40 hover:bg-surface/60 text-gray-300 border-white/10 hover:border-primary/30 hover:scale-[1.02]'
                         }`}
                       >
                         <span>{method.label}</span>
                       </button>
                     ))}
                   </div>
                 </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2.5">
                    {zhtw.sandwich.extraBagsLabel}：<span className="text-primary font-bold">{values.extraBags}</span>
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

                                 <div className="space-y-3 pt-6">
                   <button 
                     onClick={calculate}
                     className="group relative w-full py-3 sm:py-4 bg-gradient-to-r from-primary via-purple-500 to-blue-500 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 transform hover:scale-[1.02] overflow-hidden"
                   >
                     <span className="relative z-10 flex items-center justify-center gap-2">
                       <CalculatorIcon className="w-5 h-5" />
                       {zhtw.sandwich.calculate}
                     </span>
                     <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                   </button>
                   <button 
                     onClick={resetFields}
                     className="w-full px-4 py-3 bg-gradient-to-br from-white/5 to-white/5 hover:from-white/10 hover:to-white/10 
                              text-text-secondary rounded-xl border border-white/10 hover:border-white/20 
                              transition-all duration-300 text-sm sm:text-base font-medium shadow-sm hover:shadow-md"
                   >
                     {zhtw.sandwich.reset}
                   </button>
                 </div>
              </div>
            )}
          </div>

           {/* 結果卡片 */}
          <div className="card backdrop-blur-sm bg-gradient-to-br from-surface/80 to-surface/60 border border-white/20 shadow-xl">
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
                  <div className="bg-gradient-to-br from-purple-600/20 to-pink-500/20 rounded-xl p-5 border-2 border-purple-400/30 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-purple-200 mb-1">{results.totalHamNeeded}</div>
                    <div className="text-sm text-purple-300/80 font-medium">{zhtw.sandwich.needHam}（{zhtw.sandwichUi.unitPiece}）</div>
                  </div>
                 
                  <div className="bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-xl p-5 border-2 border-indigo-400/30 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-indigo-200 mb-1">{results.totalSalamiNeeded}</div>
                    <div className="text-sm text-indigo-300/80 font-medium">{zhtw.sandwich.needSalami}（{zhtw.sandwichUi.unitPiece}）</div>
                  </div>
                 
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-5 border-2 border-blue-400/30 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-blue-200 mb-1">{results.bagsNeeded}</div>
                    <div className="text-sm text-blue-300/80 font-medium">{zhtw.sandwich.needBags}（{zhtw.sandwichUi.unitBag}）</div>
                  </div>

                  <div className="bg-gradient-to-br from-primary/30 to-purple-500/30 rounded-xl p-5 border-2 border-primary/50 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm transform hover:scale-[1.02]">
                    <div className="text-3xl font-bold text-primary mb-1">{results.totalHamNeeded + results.totalSalamiNeeded}</div>
                    <div className="text-sm text-primary/90 font-medium">{zhtw.sandwich.totalNeed}（{zhtw.sandwichUi.unitPiece}）</div>
                  </div>

                  {/* 容量與分配資訊 */}
                  <div className="rounded-xl p-5 bg-gradient-to-br from-slate-700/30 to-slate-800/30 border-2 border-slate-600/30 space-y-2.5 backdrop-blur-sm shadow-lg">
                    <div className="text-base font-bold text-white mb-3 pb-2 border-b border-white/10">{zhtw.sandwichUi.capacityTitle}</div>
                    <div className="text-sm text-gray-300">
                      <span className="font-medium text-gray-400">{zhtw.sandwichUi.capacityFormula}：</span>
                      <span className="text-white font-semibold">{results.bagsNeeded}</span>
                      <span className="mx-1">×</span>
                      <span className="text-white font-semibold">{settings.breadPerBag}</span>
                      <span className="mx-1">=</span>
                      <span className="text-primary font-bold text-base">{results.totalSlices}</span>
                    </div>
                    <div className="text-sm text-gray-300">
                      <span className="font-medium text-gray-400">{zhtw.sandwichUi.capacityLeftover}：</span>
                      <span className="text-primary font-bold text-base">{results.extraSlices}</span>
                    </div>
                    <div className="text-sm text-gray-300 pt-2 border-t border-white/5">
                      <span className="font-medium text-gray-400">{zhtw.sandwichUi.capacityDistributionTitle}：</span>
                      <span className="ml-2 text-gray-200">
                        {values.distribution === 'even' && zhtw.sandwichUi.capacityEvenDetail}
                        {values.distribution === 'ham' && zhtw.sandwichUi.capacityHamDetail}
                        {values.distribution === 'salami' && zhtw.sandwichUi.capacitySalamiDetail}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 pt-2 border-t border-white/5">
                      <span className="font-medium text-gray-400">{zhtw.sandwichUi.capacityActual}：</span>
                      <span className="ml-2 px-2 py-1 rounded bg-purple-500/20 text-purple-200 font-semibold">火腿 +{results.extraHam}</span>
                      <span className="mx-2 text-gray-500">/</span>
                      <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-200 font-semibold">臘腸 +{results.extraSalami}</span>
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