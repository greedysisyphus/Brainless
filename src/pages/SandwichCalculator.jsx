import { useState, useEffect, useMemo, useRef } from 'react'
import { db } from '../utils/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useLocalStorage } from '../hooks/useLocalStorage'
import zhtw from '../locales/zh-TW'
import { calculateSandwichPlan, normalizeThickSettings, normalizeThickValues } from '../services/sandwichCalculator'
import { DualThemePage } from '../components/studio/DualThemePage'
import SandwichStudioPanel from './sandwich/SandwichStudioPanel'
import { CwInput } from '../components/studio/ui'

function SandwichCalculator() {
  const defaultSettings = {
    slicesPerLoaf: 10,
    targetSignature: 60,
    targetDark: 30,
    targetLight: 30,
  }
  const defaultValues = {
    existingSignature: '',
    existingDark: '',
    existingLight: '',
    packMode: 'up',
    distribution: 'even',
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
  // 正規化從 localStorage 讀出的舊格式
  useEffect(() => {
    setSettingsCentral((s) => normalizeThickSettings(s, defaultSettings))
    setSettingsD7((s) => normalizeThickSettings(s, defaultSettings))
    setSettingsD13((s) => normalizeThickSettings(s, defaultSettings))
    setValuesCentral((v) => normalizeThickValues(v, defaultValues))
    setValuesD7((v) => normalizeThickValues(v, defaultValues))
    setValuesD13((v) => normalizeThickValues(v, defaultValues))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 僅掛載時遷移一次
  }, [])

  // 用於追蹤 Firebase 訂閱
  const unsubscribeRef = useRef(null)
  const loadingRef = useRef(false)
  
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
        const normalized = normalizeThickSettings(data, defaultSettings)
        if (selectedStore === 'd7') {
          setSettingsD7(normalized)
        } else if (selectedStore === 'd13') {
          setSettingsD13(normalized)
        } else {
          setSettingsCentral(normalized)
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

  // 無法少做時自動回到多做
  useEffect(() => {
    if (values.packMode === 'down' && !preview.canPackDown) {
      setValues((v) => ({ ...v, packMode: 'up' }))
    }
  }, [preview.canPackDown, values.packMode])

  const resetFields = () => {
    setValues({
      existingSignature: '',
      existingDark: '',
      existingLight: '',
      packMode: 'up',
      distribution: 'even',
    })
    setResults(null)
  }
  
  // 分配方式選項
  const distributionMethods = [
    { value: 'even', label: zhtw.sandwich.distributionEven },
    { value: 'signature', label: zhtw.sandwich.distributionSignature },
    { value: 'dark', label: zhtw.sandwich.distributionDark },
    { value: 'light', label: zhtw.sandwich.distributionLight },
  ]
  
  // 店鋪選項
  const stores = [
    { value: 'central', label: zhtw.sandwich.storeCentral },
    { value: 'd7', label: zhtw.sandwich.storeD7 },
    { value: 'd13', label: zhtw.sandwich.storeD13 }
  ]

  const studioSettingsModal =
    showSettings ? (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 cw-pb-safe cw-px-safe">
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-6 shadow-2xl">
          <div className="mb-6 flex justify-between gap-3">
            <div className="flex items-center gap-3">
              <Cog6ToothIcon className="h-8 w-8 text-[var(--cw-text)]" />
              <div>
                <h2 className="text-lg font-bold text-[var(--cw-text)]">{zhtw.settings.title}</h2>
                <p className="text-sm text-[var(--cw-text-muted)]">{zhtw.settings.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="cw-touch-target rounded-[var(--cw-radius)] p-2 text-[var(--cw-text-muted)] hover:bg-white/10"
            >
              ×
            </button>
          </div>
          <div className="space-y-4">
            <CwInput
              label={zhtw.settings.slicesPerLoaf}
              type="number"
              min={1}
              inputMode="numeric"
              value={draftSettings.slicesPerLoaf}
              onWheel={(e) => e.target.blur()}
              onChange={(e) =>
                setDraftSettings((s) => ({
                  ...s,
                  slicesPerLoaf: parseInt(e.target.value, 10) || 1,
                }))
              }
            />
            <CwInput
              label={zhtw.settings.targetSignature}
              type="number"
              min={0}
              inputMode="numeric"
              value={draftSettings.targetSignature}
              onWheel={(e) => e.target.blur()}
              onChange={(e) =>
                setDraftSettings((s) => ({
                  ...s,
                  targetSignature: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
            <CwInput
              label={zhtw.settings.targetDark}
              type="number"
              min={0}
              inputMode="numeric"
              value={draftSettings.targetDark}
              onWheel={(e) => e.target.blur()}
              onChange={(e) =>
                setDraftSettings((s) => ({
                  ...s,
                  targetDark: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
            <CwInput
              label={zhtw.settings.targetLight}
              type="number"
              min={0}
              inputMode="numeric"
              value={draftSettings.targetLight}
              onWheel={(e) => e.target.blur()}
              onChange={(e) =>
                setDraftSettings((s) => ({
                  ...s,
                  targetLight: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-[var(--cw-radius)] bg-[var(--cw-fg-emphasis)] py-3 text-sm font-semibold text-[var(--cw-fg-emphasis-contrast)]"
              onClick={saveSettings}
            >
              {zhtw.settings.done}
            </button>
            <button
              type="button"
              className="flex-1 rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] py-3 text-sm text-[var(--cw-text-muted)]"
              onClick={() => setShowSettings(false)}
            >
              {zhtw.common.cancel}
            </button>
          </div>
        </div>
      </div>
    ) : null

  return (
    <DualThemePage
      breadcrumbs={[
        { label: 'Brainless', href: '#/' },
        { label: '門市營運' },
        { label: zhtw.sandwich.title },
      ]}
      title={zhtw.sandwich.title}
      description={zhtw.sandwich.subtitle}
      studio={
        <>
          <SandwichStudioPanel
            zhtw={zhtw}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            loading={loading}
            error={error}
            values={values}
            setValues={setValues}
            preview={preview}
            results={results}
            distributionMethods={distributionMethods}
            stores={stores}
            calculate={calculate}
            resetFields={resetFields}
            setShowSettings={setShowSettings}
            settings={settings}
          />
          {studioSettingsModal}
        </>
      }
    />
  )
}

export default SandwichCalculator 