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
import anime from 'animejs/lib/anime.es.js'

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
  
  // 將 results 保存到 localStorage，避免被意外清除
  const [results, setResults] = useState(() => {
    const savedResults = localStorage.getItem(`sandwich_results_${selectedStore}`)
    return savedResults ? JSON.parse(savedResults) : null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showExtraBagsBubble, setShowExtraBagsBubble] = useState(false)
  
  // 用於追蹤 Firebase 訂閱
  const unsubscribeRef = useRef(null)
  const loadingRef = useRef(false)
  const resultCardsRef = useRef([])
  const [animationKey, setAnimationKey] = useState(0) // 用於重置動畫狀態
  
  // 分店選擇器滑動指示器
  const storeSelectorRef = useRef(null)
  const sliderRef = useRef(null)
  
  // 滑動指示器動畫
  useEffect(() => {
    if (!sliderRef.current || !storeSelectorRef.current) return

    // 等待 DOM 更新完成
    const timer = setTimeout(() => {
      const buttons = storeSelectorRef.current.querySelectorAll('button')
      const storeIndex = selectedStore === 'central' ? 0 : selectedStore === 'd7' ? 1 : 2
      const button = buttons[storeIndex]
      
      if (button && sliderRef.current) {
        const buttonRect = button.getBoundingClientRect()
        const containerRect = storeSelectorRef.current.getBoundingClientRect()
        const left = buttonRect.left - containerRect.left - 4
        
        // 使用 Anime.js 動畫
        anime({
          targets: sliderRef.current,
          left: left,
          duration: 400,
          easing: 'spring(1, 80, 10, 0)'
        })
      }
    }, 50) // 給 DOM 一點時間更新
    
    return () => clearTimeout(timer)
  }, [selectedStore])
  
  // 初始化滑動指示器位置（只在組件掛載時執行一次）
  useEffect(() => {
    if (!sliderRef.current || !storeSelectorRef.current) return
    
    const timer = setTimeout(() => {
      const buttons = storeSelectorRef.current.querySelectorAll('button')
      const storeIndex = selectedStore === 'central' ? 0 : selectedStore === 'd7' ? 1 : 2
      const button = buttons[storeIndex]
      
      if (button && sliderRef.current) {
        const buttonRect = button.getBoundingClientRect()
        const containerRect = storeSelectorRef.current.getBoundingClientRect()
        const left = buttonRect.left - containerRect.left - 4
        
        // 初始化位置（無動畫）
        sliderRef.current.style.left = `${left}px`
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, []) // 只在組件掛載時執行
  
  // 將 results 持久化到 localStorage
  useEffect(() => {
    if (results) {
      localStorage.setItem(`sandwich_results_${selectedStore}`, JSON.stringify(results))
    } else {
      localStorage.removeItem(`sandwich_results_${selectedStore}`)
    }
  }, [results, selectedStore])
  
  // 切換店鋪時清除計算結果
  useEffect(() => {
    // 清除舊店鋪的結果（避免混亂）
    const oldStore = selectedStore === 'd7' ? 'd13' : selectedStore === 'd13' ? 'central' : 'd7'
    localStorage.removeItem(`sandwich_results_${oldStore}`)
    
    // 清除當前結果
    setResults(null)
    setAnimationKey(prev => prev + 1) // 重置動畫鍵值
  }, [selectedStore])

  // 結果卡片進入動畫 - 使用 Anime.js Stagger
  useEffect(() => {
    if (!results) return

    // 使用 requestAnimationFrame 確保在下一幀立即設置初始狀態
    requestAnimationFrame(() => {
      const cards = resultCardsRef.current.filter(card => card !== null && card !== undefined)
      if (cards.length === 0) return

      // 立即設置卡片初始隱藏狀態（防止閃現）
      cards.forEach(card => {
        if (card) {
          card.style.opacity = '0'
          card.style.transform = 'translateY(30px) scale(0.9)'
        }
      })

      // 在下一幀再執行動畫
      requestAnimationFrame(() => {
        // 使用 Anime.js 創建波浪式進入動畫
        anime({
          targets: cards,
          opacity: [0, 1],
          translateY: [30, 0],
          scale: [0.9, 1],
          delay: anime.stagger(100), // 每個卡片延遲 100ms
          duration: 500,
          easing: 'spring(1, 80, 10, 0)',
          complete: () => {
            // 動畫完成後清除內聯樣式，讓 CSS 接管
            cards.forEach(card => {
              if (card) {
                card.style.opacity = ''
                card.style.transform = ''
              }
            })
          }
        })
      })
    })
  }, [results, animationKey])
  
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
          {/* 頁面標題 - 超現代設計 */}
        <div className="text-center mb-10 relative">
          {/* 背景動態光暈 */}
          <div className="absolute inset-0 flex justify-center -z-10">
            <div className="w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow opacity-50"></div>
          </div>
          
          {/* 圖標容器 - 3D 效果 */}
          <div className="inline-flex items-center justify-center mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
            <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/30 via-purple-500/30 to-blue-500/30 rounded-2xl border-2 border-primary/50 shadow-2xl shadow-primary/30 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 overflow-hidden">
              {/* 流動背景 */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
              <CalculatorIcon className="w-10 h-10 text-primary relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          
          {/* 標題 */}
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 relative">
            <span className="bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient">
              {zhtw.sandwich.title}
            </span>
            {/* 文字發光效果 */}
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent blur-xl opacity-30 -z-10 animate-pulse-glow">
              {zhtw.sandwich.title}
            </span>
          </h1>
          
          {/* 副標題 */}
          <p className="text-gray-400 text-base font-medium">{zhtw.sandwich.subtitle}</p>
        </div>

        {/* 分店選擇 - 現代化分段控制器 */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
              <BuildingStorefrontIcon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-primary">{zhtw.sandwich.selectStore}</h2>
          </div>
          
          {/* 分段控制器容器 */}
          <div 
            ref={storeSelectorRef}
            className="relative mx-auto max-w-2xl bg-surface/40 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 shadow-2xl"
          >
            {/* 滑動指示器 */}
            <div
              ref={sliderRef}
              className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 shadow-lg shadow-primary/30"
              style={{
                width: `calc(33.333% - 4px)`,
                left: '4px' // 初始位置，由 Anime.js 控制動畫
              }}
            />
            
            {/* 選項按鈕 */}
            <div className="relative grid grid-cols-3 gap-1.5">
              {stores.map((store, index) => {
                const isSelected = selectedStore === store.value
                return (
                  <button
                    key={store.value}
                    onClick={() => setSelectedStore(store.value)}
                    className={`
                      relative z-10
                      px-4 py-4 sm:px-6 sm:py-5
                      rounded-xl
                      font-bold text-sm sm:text-base
                      transition-all duration-300
                      transform
                      ${isSelected 
                        ? 'text-white scale-[1.02]' 
                        : 'text-gray-300 hover:text-white hover:scale-[1.01]'
                      }
                    `}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
                      )}
                      <span className="tracking-wide">{store.label}</span>
                    </span>
                    
                    {/* 選中時的發光效果 */}
                    {isSelected && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 animate-pulse-glow opacity-50" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* 計算卡片 - 超現代設計 */}
          <div className="relative group">
            {/* 卡片背景光暈 */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 border-2 border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-primary/20 transition-all duration-500 transform hover:-translate-y-1 overflow-hidden">
              {/* 流動背景效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-purple-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="relative group/icon">
                    <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg group-hover/icon:bg-primary/30 transition-all duration-300"></div>
                    <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/40 shadow-lg">
                      <CalculatorIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary transform group-hover/icon:scale-110 group-hover/icon:rotate-12 transition-transform duration-300" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                      {zhtw.sandwich.inputsTitle}
                    </h2>
                    <p className="text-xs sm:text-sm text-text-secondary">{zhtw.sandwich.inputsSubtitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 hover:from-primary/30 hover:to-purple-500/30 border border-primary/40 text-primary transition-all duration-300 hover:scale-110 hover:rotate-90 hover:shadow-lg hover:shadow-primary/30"
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
                 {/* 一行摘要條 - 超現代設計 */}
                 <div className="grid grid-cols-3 gap-2.5 relative z-10">
                   {/* 目標卡片 */}
                   <div className="group/card relative rounded-xl bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-blue-600/15 border border-blue-400/30 p-4 text-center backdrop-blur-md shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 overflow-hidden">
                     {/* 流動背景 */}
                     <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-white/10 to-blue-500/0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                     <div className="relative z-10">
                       <div className="text-xs text-blue-300/90 mb-1.5 font-semibold uppercase tracking-wider">{zhtw.sandwichUi.summaryTarget}</div>
                       <div className="text-xl sm:text-2xl font-extrabold text-blue-200 drop-shadow-lg">{preview.totalTarget}</div>
                     </div>
                   </div>
                   
                   {/* 現有卡片 */}
                   <div className="group/card relative rounded-xl bg-gradient-to-br from-gray-500/15 via-slate-500/10 to-gray-600/15 border border-gray-400/30 p-4 text-center backdrop-blur-md shadow-lg hover:shadow-xl hover:shadow-gray-500/20 transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-r from-gray-500/0 via-white/10 to-gray-500/0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                     <div className="relative z-10">
                       <div className="text-xs text-gray-300/90 mb-1.5 font-semibold uppercase tracking-wider">{zhtw.sandwichUi.summaryExisting}</div>
                       <div className="text-xl sm:text-2xl font-extrabold text-gray-200 drop-shadow-lg">{preview.totalExisting}</div>
                     </div>
                   </div>
                   
                   {/* 需要製作卡片 - 重點突出 */}
                   <div className="group/card relative rounded-xl bg-gradient-to-br from-primary/25 via-purple-500/20 to-blue-500/25 border-2 border-primary/50 p-4 text-center backdrop-blur-md shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-500 transform hover:scale-110 hover:-translate-y-1 overflow-hidden">
                     {/* 發光背景 */}
                     <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-50 group-hover/card:opacity-75 transition-opacity duration-500 animate-pulse-glow"></div>
                     {/* 背景光暈 */}
                     <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-xl blur-lg opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                     <div className="relative z-10">
                       <div className="text-xs text-primary/90 mb-1.5 font-semibold uppercase tracking-wider">{zhtw.sandwichUi.summaryToMake}</div>
                       <div className="text-2xl sm:text-3xl font-extrabold text-primary drop-shadow-lg">{preview.baseTotalNeeded}</div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="relative z-10">
                   <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                     {zhtw.sandwich.existingHam}
                   </label>
                   <div className="relative group">
                     {/* 輸入框光暈 */}
                     <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                     <input
                       type="number"
                       className="relative w-full pl-4 pr-12 py-2.5 bg-surface/60 border-2 border-white/10 focus:border-purple-400/50 focus:bg-surface/80 rounded-xl transition-all duration-300 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/30 shadow-lg hover:shadow-xl hover:shadow-purple-500/10"
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

                 <div className="relative z-10">
                   <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                     {zhtw.sandwich.existingSalami}
                   </label>
                   <div className="relative group">
                     {/* 輸入框光暈 */}
                     <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-400/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                     <input
                       type="number"
                       className="relative w-full pl-4 pr-12 py-2.5 bg-surface/60 border-2 border-white/10 focus:border-indigo-400/50 focus:bg-surface/80 rounded-xl transition-all duration-300 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 shadow-lg hover:shadow-xl hover:shadow-indigo-500/10"
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

                 <div className="relative z-10">
                   <label className="block text-sm font-medium text-gray-300 mb-2.5 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                     {zhtw.sandwich.distribution}
                   </label>
                   <div role="radiogroup" aria-label={zhtw.sandwich.distribution} className="grid grid-cols-3 gap-2.5">
                     {distributionMethods.map((method) => {
                       const isSelected = values.distribution === method.value
                       return (
                         <button
                           key={method.value}
                           role="radio"
                           aria-checked={isSelected}
                           title={method.value === 'even' ? zhtw.sandwichUi.tooltipEven : method.value === 'ham' ? zhtw.sandwichUi.tooltipHam : zhtw.sandwichUi.tooltipSalami}
                           onClick={() => setValues({
                             ...values,
                             distribution: method.value
                           })}
                           className={`group/btn relative px-3 py-2.5 rounded-xl transition-all duration-500 text-sm font-bold border-2 overflow-hidden whitespace-nowrap ${
                             isSelected
                               ? 'bg-gradient-to-br from-primary/40 via-purple-500/30 to-blue-500/40 border-primary/60 text-white shadow-2xl shadow-primary/30 transform scale-[1.05]'
                               : 'bg-gradient-to-br from-surface/40 to-surface/30 text-gray-300 border-white/10 hover:border-primary/40 hover:bg-surface/60 hover:scale-[1.02] hover:text-white'
                           }`}
                         >
                           {/* 選中時的發光效果 */}
                           {isSelected && (
                             <>
                               <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-50 animate-pulse-glow"></div>
                               <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-xl blur-lg opacity-50"></div>
                             </>
                           )}
                           <span className="relative z-10 flex items-center justify-center gap-1.5">
                             {isSelected && (
                               <CheckCircleIcon className="w-4 h-4 text-white" />
                             )}
                             <span>{method.label}</span>
                           </span>
                         </button>
                       )
                     })}
                   </div>
                 </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
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
          </div>

           {/* 結果卡片 - 超現代設計 */}
          <div className="relative group">
            {/* 卡片背景光暈 */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 border-2 border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-primary/20 transition-all duration-500 transform hover:-translate-y-1 overflow-hidden">
              {/* 流動背景效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-purple-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="relative group/icon">
                  <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg group-hover/icon:bg-primary/30 transition-all duration-300"></div>
                  <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/40 shadow-lg">
                    <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary transform group-hover/icon:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    {zhtw.sandwich.resultsTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary">{zhtw.sandwich.resultsSubtitle}</p>
                </div>
              </div>

            {results ? (
              <div className="space-y-4 relative z-10">
                  {/* 火腿卡片 - 超現代設計 */}
                  <div 
                    ref={(el) => { 
                      if (el) {
                        resultCardsRef.current[0] = el
                        el.style.opacity = '0'
                        el.style.transform = 'translateY(30px) scale(0.9)'
                      }
                    }}
                    className="group/card relative rounded-2xl bg-gradient-to-br from-purple-600/20 via-pink-500/15 to-purple-700/20 border-2 border-purple-400/30 p-6 shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-500 backdrop-blur-md transform hover:scale-105 hover:-translate-y-1 overflow-hidden"
                  >
                    {/* 發光背景 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-white/10 to-pink-500/0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <div className="text-3xl sm:text-4xl font-extrabold text-purple-200 mb-2 drop-shadow-lg">{results.totalHamNeeded}</div>
                      <div className="text-sm text-purple-300/90 font-semibold">{zhtw.sandwich.needHam}（{zhtw.sandwichUi.unitPiece}）</div>
                    </div>
                  </div>
                 
                  {/* 臘腸卡片 - 超現代設計 */}
                  <div 
                    ref={(el) => { 
                      if (el) {
                        resultCardsRef.current[1] = el
                        el.style.opacity = '0'
                        el.style.transform = 'translateY(30px) scale(0.9)'
                      }
                    }}
                    className="group/card relative rounded-2xl bg-gradient-to-br from-indigo-500/20 via-blue-500/15 to-indigo-600/20 border-2 border-indigo-400/30 p-6 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-500 backdrop-blur-md transform hover:scale-105 hover:-translate-y-1 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-white/10 to-blue-500/0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <div className="text-3xl sm:text-4xl font-extrabold text-indigo-200 mb-2 drop-shadow-lg">{results.totalSalamiNeeded}</div>
                      <div className="text-sm text-indigo-300/90 font-semibold">{zhtw.sandwich.needSalami}（{zhtw.sandwichUi.unitPiece}）</div>
                    </div>
                  </div>
                 
                  {/* 麵包卡片 - 超現代設計 */}
                  <div 
                    ref={(el) => { 
                      if (el) {
                        resultCardsRef.current[2] = el
                        el.style.opacity = '0'
                        el.style.transform = 'translateY(30px) scale(0.9)'
                      }
                    }}
                    className="group/card relative rounded-2xl bg-gradient-to-br from-blue-500/20 via-cyan-500/15 to-blue-600/20 border-2 border-blue-400/30 p-6 shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-500 backdrop-blur-md transform hover:scale-105 hover:-translate-y-1 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-white/10 to-cyan-500/0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <div className="text-3xl sm:text-4xl font-extrabold text-blue-200 mb-2 drop-shadow-lg">{results.bagsNeeded}</div>
                      <div className="text-sm text-blue-300/90 font-semibold">{zhtw.sandwich.needBags}（{zhtw.sandwichUi.unitBag}）</div>
                    </div>
                  </div>

                  {/* 總計卡片 - 超現代設計 */}
                  <div 
                    ref={(el) => { 
                      if (el) {
                        resultCardsRef.current[3] = el
                        el.style.opacity = '0'
                        el.style.transform = 'translateY(30px) scale(0.9)'
                      }
                    }}
                    className="group/card relative rounded-2xl bg-gradient-to-br from-primary/30 via-purple-500/25 to-blue-500/30 border-2 border-primary/50 p-6 shadow-2xl hover:shadow-primary/40 transition-all duration-500 backdrop-blur-md transform hover:scale-110 hover:-translate-y-1 overflow-hidden"
                  >
                    {/* 發光背景 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-50 group-hover/card:opacity-75 transition-opacity duration-500 animate-pulse-glow"></div>
                    {/* 背景光暈 */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-lg opacity-50 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <div className="text-4xl sm:text-5xl font-extrabold text-primary mb-2 drop-shadow-lg">{results.totalHamNeeded + results.totalSalamiNeeded}</div>
                      <div className="text-sm text-primary/90 font-semibold">{zhtw.sandwich.totalNeed}（{zhtw.sandwichUi.unitPiece}）</div>
                    </div>
                  </div>

                  {/* 容量與分配資訊 */}
                  <div 
                    ref={(el) => { 
                      if (el) {
                        resultCardsRef.current[4] = el
                        el.style.opacity = '0'
                        el.style.transform = 'translateY(30px) scale(0.9)'
                      }
                    }}
                    className="rounded-xl p-5 bg-gradient-to-br from-slate-700/30 to-slate-800/30 border-2 border-slate-600/30 space-y-2.5 backdrop-blur-sm shadow-lg"
                  >
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
              <div className="text-center py-12 text-text-secondary relative z-10">
                <CalculatorIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{zhtw.sandwich.emptyHint}</p>
              </div>
            )}
            </div>
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