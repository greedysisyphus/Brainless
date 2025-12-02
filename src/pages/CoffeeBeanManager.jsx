import { useState, useEffect, useRef, useMemo } from 'react'
import { PlusIcon, TrashIcon, CalculatorIcon, ClipboardDocumentListIcon, ArrowDownTrayIcon, XMarkIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline'
import { db } from '../utils/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useLocalStorage } from '../hooks/useLocalStorage'

// 咖啡豆種類定義
const BEAN_TYPES = {
  brewing: {
    pourOver: ['水洗', '日曬', '阿寶', '台灣豆', 'Geisha'],
    espresso: ['ESP', '水洗']
  },
  retail: ['水洗', '日曬', '阿寶', '季節', '台灣豆', 'Geisha']
}

// 只有店面庫存的豆種
const STORE_ONLY_BEANS = ['台灣豆', 'Geisha']

// 預設重量設定
const DEFAULT_WEIGHTS = {
  bagWeight: 121,
  ikeaBoxWeight: 365,
  beanWeightPerPack: 19
}

function CoffeeBeanManager() {
  const [showWeightCalculator, setShowWeightCalculator] = useState(false)
  
  // 滾動鎖定功能
  useEffect(() => {
    if (showWeightCalculator) {
      // 鎖定背景滾動
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${window.scrollY}px`
    } else {
      // 恢復背景滾動
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }
    
    // 清理函數
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }
  }, [showWeightCalculator])

  const inventoryRef = useRef(null)
  
  // 盤點表狀態
  const [inventory, setInventory] = useState({
    brewing: {
      pourOver: {},
      espresso: {}
    },
    retail: {}
  })

  // 重量換算狀態
  const [weightMode, setWeightMode] = useState('bag') // 'bag' 或 'ikea'
  
  // 重量計算器店鋪選擇
  const [selectedWeightStore, setSelectedWeightStore] = useState('central') // 'central', 'd7', 'd13'
  
  // 快速輸入模式狀態
  const [quickInputMode, setQuickInputMode] = useState(false)
  const [quickInputData, setQuickInputData] = useState({})
  
  // 區域指示器狀態
  const [currentSection, setCurrentSection] = useState('brewing')
  
  // 當前可見的子分類標題（用於顯示在頂部固定欄）
  const [currentSubSection, setCurrentSubSection] = useState(null) // 'pourOver', 'espresso', null
  
  // 匯出模式狀態
  const [exportMode, setExportMode] = useState('original') // 'original'、'minimalist' 或 'web-consistent'
  
  // 為每個店鋪分別存儲重量設定
  const [weightSettingsCentral, setWeightSettingsCentral] = useLocalStorage('coffeeBeanWeightSettings_central', DEFAULT_WEIGHTS)
  const [weightSettingsD7, setWeightSettingsD7] = useLocalStorage('coffeeBeanWeightSettings_d7', DEFAULT_WEIGHTS)
  const [weightSettingsD13, setWeightSettingsD13] = useLocalStorage('coffeeBeanWeightSettings_d13', DEFAULT_WEIGHTS)
  
  // 當前選中店鋪的重量設定
  const weightSettings = useMemo(() => {
    if (selectedWeightStore === 'd7') return weightSettingsD7
    if (selectedWeightStore === 'd13') return weightSettingsD13
    return weightSettingsCentral
  }, [selectedWeightStore, weightSettingsCentral, weightSettingsD7, weightSettingsD13])
  
  // 用於追蹤 Firebase 訂閱
  const weightUnsubscribeRef = useRef(null)
  const [calculations, setCalculations] = useState(() => {
    // 在初始化時就從 localStorage 讀取
    const savedCalculations = localStorage.getItem('coffeeBeanCalculations')
    if (savedCalculations) {
      try {
        return JSON.parse(savedCalculations)
      } catch (e) {
        console.error('解析計算欄位失敗:', e)
        return [{ id: 1, totalWeight: '', estimatedPacks: 0 }]
      }
    }
    return [{ id: 1, totalWeight: '', estimatedPacks: 0 }]
  })

  // 從 localStorage 載入設定
  useEffect(() => {
    // 只載入盤點表和重量模式，重量設定和計算欄位已在初始化時載入
    const savedInventory = localStorage.getItem('coffeeBeanInventory')
    if (savedInventory) {
      setInventory(JSON.parse(savedInventory))
    }

    const savedWeightMode = localStorage.getItem('coffeeBeanWeightMode')
    if (savedWeightMode) {
      setWeightMode(savedWeightMode)
    }
  }, [])

  // 監聽 Firebase 重量設定變更（根據選中的店鋪）
  useEffect(() => {
    // 清理舊的訂閱
    if (weightUnsubscribeRef.current) {
      weightUnsubscribeRef.current()
      weightUnsubscribeRef.current = null
    }
    
    const firebaseDocId = `coffeeBeanWeight_${selectedWeightStore}`
    let unsubscribe
    let isMounted = true
    let timeoutId
    
    try {
      // 根據當前店鋪選擇對應的設定更新函數
      const updateWeightSettingsForStore = (data) => {
        if (!isMounted) return
        // 確保數據結構正確
        const validData = {
          bagWeight: data?.bagWeight || DEFAULT_WEIGHTS.bagWeight,
          ikeaBoxWeight: data?.ikeaBoxWeight || DEFAULT_WEIGHTS.ikeaBoxWeight,
          beanWeightPerPack: data?.beanWeightPerPack || DEFAULT_WEIGHTS.beanWeightPerPack
        }
        if (selectedWeightStore === 'd7') {
          setWeightSettingsD7(validData)
        } else if (selectedWeightStore === 'd13') {
          setWeightSettingsD13(validData)
        } else {
          setWeightSettingsCentral(validData)
        }
      }
      
      // 設置超時機制，5秒後如果還沒有回應就使用本地設定
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('Firebase 連接超時，使用本地重量設定')
        }
      }, 5000)
      
      unsubscribe = onSnapshot(
        doc(db, 'settings', firebaseDocId),
        (docSnapshot) => {
          if (!isMounted) return
          if (timeoutId) clearTimeout(timeoutId)
          
          if (docSnapshot.exists()) {
            updateWeightSettingsForStore(docSnapshot.data())
          } else {
            // 如果文件不存在，創建預設值
            setDoc(docSnapshot.ref, DEFAULT_WEIGHTS)
              .then(() => {
                if (isMounted) {
                  updateWeightSettingsForStore(DEFAULT_WEIGHTS)
                }
              })
              .catch(error => {
                console.error('創建重量設定文件失敗:', error)
              })
          }
        },
        (error) => {
          console.error('讀取重量設定錯誤:', error)
          if (timeoutId) clearTimeout(timeoutId)
          // 如果 Firebase 連接失敗，使用本地設定
        }
      )
      
      weightUnsubscribeRef.current = unsubscribe
    } catch (error) {
      console.error('Firebase 初始化錯誤:', error)
      if (timeoutId) clearTimeout(timeoutId)
    }

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (weightUnsubscribeRef.current) {
        weightUnsubscribeRef.current()
        weightUnsubscribeRef.current = null
      }
    }
  }, [selectedWeightStore, setWeightSettingsCentral, setWeightSettingsD7, setWeightSettingsD13]) // 依賴店鋪選擇和設定函數

  // 儲存盤點表到 localStorage
  useEffect(() => {
    localStorage.setItem('coffeeBeanInventory', JSON.stringify(inventory))
  }, [inventory])

  // 儲存計算欄位到 localStorage
  useEffect(() => {
    localStorage.setItem('coffeeBeanCalculations', JSON.stringify(calculations))
  }, [calculations])

  // 儲存重量模式到 localStorage
  useEffect(() => {
    localStorage.setItem('coffeeBeanWeightMode', weightMode)
  }, [weightMode])

  // 檢測主要區域
  useEffect(() => {
    const brewingSection = document.getElementById('brewing-section')
    const retailSection = document.getElementById('retail-section')
    
    if (!brewingSection || !retailSection) return

    let ticking = false

    const updateCurrentSection = () => {
      const brewingRect = brewingSection.getBoundingClientRect()
      const retailRect = retailSection.getBoundingClientRect()
      const viewportCenter = window.innerHeight / 2
      
      const brewingCenter = brewingRect.top + brewingRect.height / 2
      const retailCenter = retailRect.top + retailRect.height / 2
      
      const brewingDistance = Math.abs(brewingCenter - viewportCenter)
      const retailDistance = Math.abs(retailCenter - viewportCenter)
      
      const brewingVisible = brewingRect.top < window.innerHeight && brewingRect.bottom > 0
      const retailVisible = retailRect.top < window.innerHeight && retailRect.bottom > 0
      
      if (brewingVisible && retailVisible) {
        setCurrentSection(brewingDistance < retailDistance ? 'brewing' : 'retail')
      } else if (brewingVisible) {
        setCurrentSection('brewing')
      } else if (retailVisible) {
        setCurrentSection('retail')
      }
      
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateCurrentSection)
        ticking = true
      }
    }

    updateCurrentSection()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  // 檢測子分類標題可見性 - 使用滾動事件
  useEffect(() => {
    if (currentSection !== 'brewing') {
      setCurrentSubSection(null)
      return
    }

    const pourOverTitle = document.getElementById('pourOver-title')
    const espressoTitle = document.getElementById('espresso-title')
    
    if (!pourOverTitle || !espressoTitle) return

    let ticking = false

    const checkTitles = () => {
      const pourOverRect = pourOverTitle.getBoundingClientRect()
      const espressoRect = espressoTitle.getBoundingClientRect()
      
      // Header + Navigation 高度約 180px
      const headerHeight = 180
      
      // 判斷標題是否在視窗內可見（標題底部在 headerHeight 以下且在視窗內）
      const pourOverVisible = pourOverRect.bottom > headerHeight && pourOverRect.top < window.innerHeight
      const espressoVisible = espressoRect.bottom > headerHeight && espressoRect.top < window.innerHeight
      
      if (pourOverVisible || espressoVisible) {
        // 至少有一個標題可見，不顯示固定欄
        setCurrentSubSection(null)
      } else {
        // 兩個標題都不可見，判斷當前在哪個區域
        const viewportCenter = window.innerHeight / 2
        const pourOverCenter = pourOverRect.top + pourOverRect.height / 2
        const espressoCenter = espressoRect.top + espressoRect.height / 2
        
        const pourOverDistance = Math.abs(viewportCenter - pourOverCenter)
        const espressoDistance = Math.abs(viewportCenter - espressoCenter)
        
        // 選擇更接近視窗中心的標題
        if (pourOverDistance < espressoDistance) {
          setCurrentSubSection('pourOver')
        } else {
          setCurrentSubSection('espresso')
        }
      }
      
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkTitles)
        ticking = true
      }
    }

    checkTitles()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [currentSection])

  // 初始化豆種的數量陣列
  const initializeBeanType = (category, subCategory, beanType) => {
    if (!inventory[category][subCategory]?.[beanType]) {
      const isStoreOnly = STORE_ONLY_BEANS.includes(beanType)
      const initialStructure = isStoreOnly 
        ? { store: [''] }
        : { store: [''], breakRoom: [''] }
      
      setInventory(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [subCategory]: {
            ...prev[category]?.[subCategory],
            [beanType]: initialStructure
          }
        }
      }))
    }
  }

  // 新增數量欄位
  const addQuantityField = (category, subCategory, beanType, location) => {
    initializeBeanType(category, subCategory, beanType)
    setInventory(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subCategory]: {
          ...prev[category][subCategory],
          [beanType]: {
            ...prev[category][subCategory]?.[beanType],
            [location]: [...(prev[category][subCategory]?.[beanType]?.[location] || ['']), '']
          }
        }
      }
    }))
  }

  // 更新數量
  const updateQuantity = (category, subCategory, beanType, location, index, value) => {
    initializeBeanType(category, subCategory, beanType)
    setInventory(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subCategory]: {
          ...prev[category][subCategory],
          [beanType]: {
            ...prev[category][subCategory]?.[beanType],
            [location]: prev[category][subCategory]?.[beanType]?.[location]?.map((q, i) => 
              i === index ? value : q
            ) || ['']
          }
        }
      }
    }))
  }

  // 移除數量欄位
  const removeQuantityField = (category, subCategory, beanType, location, index) => {
    setInventory(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subCategory]: {
          ...prev[category][subCategory],
          [beanType]: {
            ...prev[category][subCategory]?.[beanType],
            [location]: prev[category][subCategory]?.[beanType]?.[location]?.filter((_, i) => i !== index) || ['']
          }
        }
      }
    }))
  }

  // 計算總數
  const calculateTotal = (quantities) => {
    return quantities?.reduce((sum, q) => sum + (parseInt(q) || 0), 0) || 0
  }

  // 計算豆種總數（包含所有位置）
  const calculateBeanTypeTotal = (beanData) => {
    if (!beanData) return 0
    let total = 0
    if (beanData.store) {
      total += calculateTotal(beanData.store)
    }
    if (beanData.breakRoom) {
      total += calculateTotal(beanData.breakRoom)
    }
    return total
  }

  // 重量換算計算
  const calculateEstimatedPacks = (totalWeight) => {
    if (!totalWeight) return 0
    const containerWeight = weightMode === 'bag' ? weightSettings.bagWeight : weightSettings.ikeaBoxWeight
    const beanWeight = totalWeight - containerWeight
    if (beanWeight <= 0) return 0
    return Math.round((beanWeight / weightSettings.beanWeightPerPack) * 10) / 10
  }

  // 更新重量設定
  // 更新重量設定（根據選中的店鋪）
  const updateWeightSetting = async (key, value) => {
    const newWeight = parseFloat(value) || 0
    const updatedSettings = {
      ...weightSettings,
      [key]: newWeight
    }
    
    // 先更新本地（含 localStorage）
    if (selectedWeightStore === 'd7') {
      setWeightSettingsD7(updatedSettings)
    } else if (selectedWeightStore === 'd13') {
      setWeightSettingsD13(updatedSettings)
    } else {
      setWeightSettingsCentral(updatedSettings)
    }
    
    // 同步到 Firebase
    try {
      const firebaseDocId = `coffeeBeanWeight_${selectedWeightStore}`
      await setDoc(doc(db, 'settings', firebaseDocId), updatedSettings)
    } catch (error) {
      console.error('更新重量設定錯誤:', error)
      // 即使 Firebase 失敗，本地設定已保存
    }
  }

  // 新增計算欄位
  const addCalculation = () => {
    const newId = Math.max(...calculations.map(c => c.id), 0) + 1
    setCalculations(prev => [...prev, { id: newId, totalWeight: '', estimatedPacks: 0 }])
  }

  // 移除計算欄位
  const removeCalculation = (id) => {
    if (calculations.length > 1) {
      setCalculations(prev => prev.filter(c => c.id !== id))
    }
  }

  // 更新計算欄位
  const updateCalculation = (id, totalWeight) => {
    setCalculations(prev => prev.map(c => 
      c.id === id 
        ? { ...c, totalWeight, estimatedPacks: calculateEstimatedPacks(totalWeight) }
        : c
    ))
  }

  // 快速輸入模式相關函數
  const startQuickInput = () => {
    setQuickInputMode(true)
    // 初始化快速輸入數據
    const initialData = {}
    
    // 初始化所有豆種的快速輸入數據
    BEAN_TYPES.brewing.pourOver.forEach(beanType => {
      const beanData = inventory.brewing.pourOver[beanType]
      const storeTotal = calculateTotal(beanData?.store || [])
      const breakRoomTotal = STORE_ONLY_BEANS.includes(beanType) ? 0 : calculateTotal(beanData?.breakRoom || [])
      
      initialData[`brewing-pourOver-${beanType}`] = {
        store: storeTotal.toString(),
        breakRoom: breakRoomTotal.toString(),
        category: 'brewing',
        subCategory: 'pourOver',
        beanType
      }
    })
    
    BEAN_TYPES.brewing.espresso.forEach(beanType => {
      const beanData = inventory.brewing.espresso[beanType]
      const storeTotal = calculateTotal(beanData?.store || [])
      const breakRoomTotal = STORE_ONLY_BEANS.includes(beanType) ? 0 : calculateTotal(beanData?.breakRoom || [])
      
      initialData[`brewing-espresso-${beanType}`] = {
        store: storeTotal.toString(),
        breakRoom: breakRoomTotal.toString(),
        category: 'brewing',
        subCategory: 'espresso',
        beanType
      }
    })
    
    BEAN_TYPES.retail.forEach(beanType => {
      const beanData = inventory.retail[beanType]
      const storeTotal = calculateTotal(beanData?.store || [])
      const breakRoomTotal = STORE_ONLY_BEANS.includes(beanType) ? 0 : calculateTotal(beanData?.breakRoom || [])
      
      initialData[`retail-${beanType}`] = {
        store: storeTotal.toString(),
        breakRoom: breakRoomTotal.toString(),
        category: 'retail',
        subCategory: null,
        beanType
      }
    })
    
    setQuickInputData(initialData)
  }

  const saveQuickInput = () => {
    // 將快速輸入的數據轉換為正式庫存格式
    Object.entries(quickInputData).forEach(([key, data]) => {
      const { category, subCategory, beanType, store, breakRoom } = data
      
      if (category === 'retail') {
        // 賣豆處理
        setInventory(prev => ({
          ...prev,
          retail: {
            ...prev.retail,
            [beanType]: {
              store: [store],
              ...(STORE_ONLY_BEANS.includes(beanType) ? {} : { breakRoom: [breakRoom] })
            }
          }
        }))
      } else {
        // 出杯豆處理
        setInventory(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            [subCategory]: {
              ...prev[category][subCategory],
              [beanType]: {
                store: [store],
                ...(STORE_ONLY_BEANS.includes(beanType) ? {} : { breakRoom: [breakRoom] })
              }
            }
          }
        }))
      }
    })
    
    setQuickInputMode(false)
    setQuickInputData({})
  }

  const cancelQuickInput = () => {
    setQuickInputMode(false)
    setQuickInputData({})
  }

  const updateQuickInput = (key, field, value) => {
    setQuickInputData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }))
  }

  // 重置所有數據
  const resetAllData = () => {
    if (confirm('確定要重置所有數據嗎？此操作無法復原。')) {
      setInventory({
        brewing: { pourOver: {}, espresso: {} },
        retail: {}
      })
      setCalculations([{ id: 1, totalWeight: '', estimatedPacks: 0 }])
      // 重置所有店鋪的重量設定
      setWeightSettingsCentral(DEFAULT_WEIGHTS)
      setWeightSettingsD7(DEFAULT_WEIGHTS)
      setWeightSettingsD13(DEFAULT_WEIGHTS)
      setWeightMode('bag')
      setQuickInputMode(false)
      setQuickInputData({})
      localStorage.removeItem('coffeeBeanInventory')
      localStorage.removeItem('coffeeBeanWeightSettings_central')
      localStorage.removeItem('coffeeBeanWeightSettings_d7')
      localStorage.removeItem('coffeeBeanWeightSettings_d13')
      localStorage.removeItem('coffeeBeanCalculations')
      localStorage.removeItem('coffeeBeanWeightMode')
    }
  }

  // 回復原本重量設定
  // 回復原本重量設定（根據選中的店鋪）
  const resetWeightSettings = async () => {
    if (confirm('確定要回復原本的重量設定嗎？')) {
      // 先更新本地
      if (selectedWeightStore === 'd7') {
        setWeightSettingsD7(DEFAULT_WEIGHTS)
      } else if (selectedWeightStore === 'd13') {
        setWeightSettingsD13(DEFAULT_WEIGHTS)
      } else {
        setWeightSettingsCentral(DEFAULT_WEIGHTS)
      }
      
      // 同步到 Firebase
      try {
        const firebaseDocId = `coffeeBeanWeight_${selectedWeightStore}`
        await setDoc(doc(db, 'settings', firebaseDocId), DEFAULT_WEIGHTS)
      } catch (error) {
        console.error('更新重量設定錯誤:', error)
      }
    }
  }

  // 創建整合表格資料
  const createSummaryTable = () => {
    const tableData = []
    
    // 手沖豆
    BEAN_TYPES.brewing.pourOver.forEach(beanType => {
      const beanData = inventory.brewing.pourOver[beanType]
      const storeTotal = calculateTotal(beanData?.store || [])
      const breakRoomTotal = STORE_ONLY_BEANS.includes(beanType) ? 0 : calculateTotal(beanData?.breakRoom || [])
      const grandTotal = storeTotal + breakRoomTotal
      
      tableData.push({
        category: '出杯豆',
        beanType,
        storeTotal,
        breakRoomTotal,
        grandTotal
      })
    })
    
    // 義式豆
    BEAN_TYPES.brewing.espresso.forEach(beanType => {
      const beanData = inventory.brewing.espresso[beanType]
      const storeTotal = calculateTotal(beanData?.store || [])
      const breakRoomTotal = STORE_ONLY_BEANS.includes(beanType) ? 0 : calculateTotal(beanData?.breakRoom || [])
      const grandTotal = storeTotal + breakRoomTotal
      
      tableData.push({
        category: '義式豆',
        beanType,
        storeTotal,
        breakRoomTotal,
        grandTotal
      })
    })
    
    // 賣豆
    BEAN_TYPES.retail.forEach(beanType => {
      const beanData = inventory.retail[beanType]
      const storeTotal = calculateTotal(beanData?.store || [])
      const breakRoomTotal = STORE_ONLY_BEANS.includes(beanType) ? 0 : calculateTotal(beanData?.breakRoom || [])
      const grandTotal = storeTotal + breakRoomTotal
      
      tableData.push({
        category: '賣豆',
        beanType,
        storeTotal,
        breakRoomTotal,
        grandTotal
      })
    })
    
    return tableData
  }

  // 創建表格 HTML (原始風格)
  const createTableHTML = () => {
    const tableData = createSummaryTable()
    const date = new Date().toLocaleDateString('zh-TW')
    
    // 按分類分組
    const groupedData = {}
    tableData.forEach(row => {
      if (!groupedData[row.category]) {
        groupedData[row.category] = []
      }
      groupedData[row.category].push(row)
    })
    
    return `
      <div style="font-family: 'Microsoft JhengHei', Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); color: #2c3e50; min-height: 100vh;">
        <div style="background: white; border-radius: 15px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">咖啡豆盤點表</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">盤點日期：${date}</p>
          </div>
          
          ${Object.entries(groupedData).map(([category, rows]) => `
            <div style="margin-bottom: 30px;">
              <h2 style="color: white; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 12px 25px; border-radius: 10px 10px 0 0; margin: 0; font-size: 18px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                ${category}
              </h2>
              
              <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 0 0 10px 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                <thead>
                  <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 40px;">
                    <th style="padding: 0 15px; text-align: center; vertical-align: middle; font-weight: 600; color: white; font-size: 14px;">豆種</th>
                    <th style="padding: 0 15px; text-align: center; vertical-align: middle; font-weight: 600; color: white; font-size: 14px;">店面庫存</th>
                    <th style="padding: 0 15px; text-align: center; vertical-align: middle; font-weight: 600; color: white; font-size: 14px;">員休室庫存</th>
                    <th style="padding: 0 15px; text-align: center; vertical-align: middle; font-weight: 600; color: white; font-size: 14px;">總計</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map((row, index) => `
                    <tr style="${index % 2 === 0 ? 'background: #f8f9fa;' : 'background: white;'}">
                      <td style="padding: 12px 15px; text-align: center; font-weight: 600; color: #2c3e50; border-bottom: 1px solid #ecf0f1;">${row.beanType}</td>
                      <td style="padding: 12px 15px; text-align: center; color: #34495e; border-bottom: 1px solid #ecf0f1;">${row.storeTotal}</td>
                      <td style="padding: 12px 15px; text-align: center; color: #34495e; border-bottom: 1px solid #ecf0f1;">${row.breakRoomTotal}</td>
                      <td style="padding: 12px 15px; text-align: center; font-weight: 700; color: #27ae60; background: linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%); border-bottom: 1px solid #ecf0f1;">${row.grandTotal}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  // 創建網頁風格一致的表格 HTML
  const createWebConsistentTableHTML = () => {
    const tableData = createSummaryTable()
    const date = new Date().toLocaleDateString('zh-TW')
    
    // 按分類分組
    const groupedData = {}
    tableData.forEach(row => {
      if (!groupedData[row.category]) {
        groupedData[row.category] = []
      }
      groupedData[row.category].push(row)
    })
    
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; background: #13131a; color: #ffffff; min-height: 100vh; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
        <div style="background: #1e1e2e; border-radius: 20px; padding: 50px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
          <div style="text-align: center; margin-bottom: 50px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 36px; font-weight: 600; letter-spacing: -0.5px;">咖啡豆盤點表</h1>
            <p style="color: #94a3b8; margin: 12px 0 0 0; font-size: 17px; font-weight: 400;">盤點日期：${date}</p>
          </div>
          
          ${Object.entries(groupedData).map(([category, rows]) => `
            <div style="margin-bottom: 40px;">
              <h2 style="color: #ffffff; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 16px 24px; border-radius: 12px; margin: 0 0 24px 0; font-size: 20px; font-weight: 600; text-align: center; border: none; box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2);">
                ${category}
              </h2>
              
              <div style="background: #1e1e2e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
                <table style="width: 100%; border-collapse: collapse; background: #1e1e2e;">
                  <thead>
                    <tr style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); height: 48px;">
                      <th style="padding: 0 20px; text-align: left; vertical-align: middle; font-weight: 600; color: #ffffff; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">豆種</th>
                      <th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #ffffff; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">店面庫存</th>
                      <th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #ffffff; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">員休室庫存</th>
                      <th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #ffffff; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">總計</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.map((row, index) => `
                      <tr style="background: ${index % 2 === 0 ? '#1e1e2e' : 'rgba(255,255,255,0.02)'}; transition: all 0.3s ease;">
                        <td style="padding: 16px 20px; text-align: left; font-weight: 500; color: #ffffff; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">${row.beanType}</td>
                        <td style="padding: 16px 20px; text-align: center; color: #3b82f6; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 500;">${row.storeTotal}</td>
                        <td style="padding: 16px 20px; text-align: center; color: #10b981; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 500;">${row.breakRoomTotal}</td>
                        <td style="padding: 16px 20px; text-align: center; font-weight: 600; color: #6366f1; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);">${row.grandTotal}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  // 創建蘋果風格表格 HTML
  const createAppleStyleTableHTML = () => {
    const tableData = createSummaryTable()
    const date = new Date().toLocaleDateString('zh-TW')
    
    // 按分類分組
    const groupedData = {}
    tableData.forEach(row => {
      if (!groupedData[row.category]) {
        groupedData[row.category] = []
      }
      groupedData[row.category].push(row)
    })
    
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #fafafa; color: #1d1d1f; min-height: 100vh;">
        <div style="background: white; border-radius: 20px; padding: 50px; box-shadow: 0 8px 32px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 50px;">
            <h1 style="color: #1d1d1f; margin: 0; font-size: 36px; font-weight: 600; letter-spacing: -0.5px;">咖啡豆盤點表</h1>
            <p style="color: #86868b; margin: 12px 0 0 0; font-size: 17px; font-weight: 400;">盤點日期：${date}</p>
          </div>
          
          ${Object.entries(groupedData).map(([category, rows]) => `
            <div style="margin-bottom: 40px;">
              <h2 style="color: #1d1d1f; background: #f5f5f7; padding: 16px 24px; border-radius: 12px; margin: 0 0 24px 0; font-size: 20px; font-weight: 600; text-align: center; border: none;">
                ${category}
              </h2>
              
              <div style="background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e7;">
                <table style="width: 100%; border-collapse: collapse; background: white;">
                  <thead>
                    <tr style="background: #f5f5f7; height: 48px;">
                      <th style="padding: 0 20px; text-align: left; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">豆種</th>
                      <th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">店面庫存</th>
                      <th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">員休室庫存</th>
                      <th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">總計</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.map((row, index) => `
                      <tr style="background: ${index % 2 === 0 ? '#fafafa' : 'white'};">
                        <td style="padding: 16px 20px; text-align: left; font-weight: 500; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.beanType}</td>
                        <td style="padding: 16px 20px; text-align: center; color: #515154; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.storeTotal}</td>
                        <td style="padding: 16px 20px; text-align: center; color: #515154; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.breakRoomTotal}</td>
                        <td style="padding: 16px 20px; text-align: center; font-weight: 600; color: #007aff; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.grandTotal}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  // 匯出盤點表為圖片
  const exportInventoryAsImage = async () => {
    try {
      // 先檢查模組是否可用
      let html2canvas
      try {
        html2canvas = (await import('html2canvas')).default
      } catch (importError) {
        console.error('html2canvas 載入失敗:', importError)
        alert('匯出功能暫時無法使用，請重新整理頁面後再試')
        return
      }
      
      // 根據模式選擇HTML模板
      let htmlContent
      if (exportMode === 'minimalist') {
        htmlContent = createAppleStyleTableHTML()
      } else if (exportMode === 'web-consistent') {
        htmlContent = createWebConsistentTableHTML()
      } else {
        htmlContent = createTableHTML()
      }
      
      // 創建臨時容器
      const tempContainer = document.createElement('div')
      tempContainer.innerHTML = htmlContent
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      tempContainer.style.width = '900px'
      tempContainer.style.height = 'auto'
      tempContainer.style.overflow = 'visible'
      document.body.appendChild(tempContainer)
      
      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const canvas = await html2canvas(tempContainer.firstElementChild, {
        backgroundColor: exportMode === 'minimalist' ? '#fafafa' : exportMode === 'web-consistent' ? '#13131a' : '#ffffff',
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: true,
        width: 900,
        height: tempContainer.firstElementChild.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 900,
        windowHeight: tempContainer.firstElementChild.scrollHeight
      })
      
      // 移除臨時容器
      document.body.removeChild(tempContainer)
      
      // 檢查canvas是否有效
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas 渲染失敗')
      }
      
      // 創建下載連結
      const link = document.createElement('a')
      let modeText
      if (exportMode === 'minimalist') {
        modeText = 'Minimalist'
      } else if (exportMode === 'web-consistent') {
        modeText = '網頁風格'
      } else {
        modeText = '原始風格'
      }
      link.download = `咖啡豆盤點表_${modeText}_${new Date().toLocaleDateString('zh-TW')}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    } catch (error) {
      console.error('匯出圖片失敗:', error)
      alert(`匯出圖片失敗：${error.message}`)
    }
  }



  // 獲取當前區塊的完整路徑文字
  const getCurrentBreadcrumb = () => {
    if (currentSection === 'brewing') {
      if (currentSubSection === 'pourOver') {
        return { main: '出杯豆', sub: '手沖豆' }
      } else if (currentSubSection === 'espresso') {
        return { main: '出杯豆', sub: '義式豆' }
      }
      return { main: '出杯豆', sub: null }
    } else if (currentSection === 'retail') {
      return { main: '賣豆', sub: null }
    }
    return { main: null, sub: null }
  }

  const breadcrumb = getCurrentBreadcrumb()

  return (
    <div className="coffee-bean-container container-custom py-4 sm:py-6 md:py-8">
      {/* 固定標題欄 - 當子分類標題不可見時顯示 */}
      {breadcrumb.main && breadcrumb.sub && (
        <div className="fixed top-[140px] sm:top-[160px] md:top-[180px] left-0 right-0 z-40 px-4 sm:px-6 md:px-8 pointer-events-none">
          <div className="max-w-6xl mx-auto">
            <div className="bg-surface/95 backdrop-blur-md border-b border-white/20 shadow-lg rounded-b-xl p-3 pointer-events-auto animate-slide-in">
              <div className="flex items-center gap-2 text-sm sm:text-base">
                <span className="text-blue-400 font-semibold">{breadcrumb.main}</span>
                <span className="text-gray-400">/</span>
                <span className="text-blue-300 font-medium">{breadcrumb.sub}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 - 超現代設計 */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10 relative">
          {/* 背景動態光暈 - 移動設備縮小 */}
          <div className="absolute inset-0 flex justify-center -z-10">
            <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow opacity-50"></div>
          </div>
          
          {/* 圖標容器 - 3D 效果 */}
          <div className="inline-flex items-center justify-center mb-4 sm:mb-5 md:mb-6 relative group title-icon-group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
            <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br from-primary/30 via-purple-500/30 to-blue-500/30 rounded-xl sm:rounded-2xl border-2 border-primary/50 shadow-2xl shadow-primary/30 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 overflow-hidden">
              {/* 流動背景 */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
              <ClipboardDocumentListIcon className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-primary relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          
          {/* 標題 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2 sm:mb-3 relative px-4">
            <span className="bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient">
              咖啡豆管理工具
            </span>
            {/* 文字發光效果 */}
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent blur-xl opacity-30 -z-10 animate-pulse-glow">
              咖啡豆管理工具
            </span>
          </h1>
          
          {/* 副標題 */}
          <p className="text-gray-400 text-sm sm:text-base font-medium px-4 mb-6 sm:mb-8">庫存管理與重量換算</p>
        </div>

        {/* 操作按鈕區域 */}
        <div className="flex flex-wrap justify-center gap-3 mb-6 sm:mb-8">
          <button
            onClick={() => setShowWeightCalculator(true)}
            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 hover:from-amber-500/30 hover:to-orange-500/30 hover:border-amber-500/50 transition-all duration-200 flex items-center gap-2"
          >
            <CalculatorIcon className="w-4 h-4" />
            重量換算
          </button>
          {!quickInputMode ? (
            <button
              onClick={startQuickInput}
              className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-500/50 transition-all duration-200 flex items-center gap-2"
            >
              <CalculatorIcon className="w-4 h-4" />
              快速盤點
            </button>
          ) : (
            <>
              <button
                onClick={saveQuickInput}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-400 hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-500/50 transition-all duration-200 flex items-center gap-2"
              >
                <ClipboardDocumentListIcon className="w-4 h-4" />
                儲存盤點
              </button>
              <button
                onClick={cancelQuickInput}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-200"
              >
                取消
              </button>
            </>
          )}
          <button
            onClick={resetAllData}
            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-200"
          >
            重置數據
          </button>
        </div>

      {/* 一、咖啡豆盤點表 */}
      <div className="relative group mb-6 sm:mb-8">
        {/* 卡片背景光暈 */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative backdrop-blur-xl bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 border-2 border-white/20 rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl overflow-hidden" ref={inventoryRef} style={{ transform: 'none', willChange: 'auto' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.scale = '1'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.scale = '1'; }}>
          {/* 流動背景效果 */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-purple-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient bg-[length:200%_100%]"></div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative group/icon">
                <div className="absolute inset-0 bg-primary/20 rounded-lg sm:rounded-xl blur-lg group-hover/icon:bg-primary/30 transition-all duration-300"></div>
                <div className="relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/40 shadow-lg">
                  <ClipboardDocumentListIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary transform group-hover/icon:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-1">咖啡豆盤點表</h2>
                <p className="text-xs sm:text-sm text-text-secondary">即時更新庫存數量</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* 匯出模式選擇 */}
              <div className="flex items-center gap-2 px-3 py-2 bg-surface/40 rounded-lg border border-white/10">
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="radio"
                    value="original"
                    checked={exportMode === 'original'}
                    onChange={(e) => setExportMode(e.target.value)}
                    className="text-blue-400 w-3 h-3"
                  />
                  <span>原始風格</span>
                </label>
                <div className="w-px h-4 bg-white/20"></div>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="radio"
                    value="minimalist"
                    checked={exportMode === 'minimalist'}
                    onChange={(e) => setExportMode(e.target.value)}
                    className="text-blue-400 w-3 h-3"
                  />
                  <span>Minimalist</span>
                </label>
                <div className="w-px h-4 bg-white/20"></div>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="radio"
                    value="web-consistent"
                    checked={exportMode === 'web-consistent'}
                    onChange={(e) => setExportMode(e.target.value)}
                    className="text-blue-400 w-3 h-3"
                  />
                  <span>網頁風格</span>
                </label>
              </div>
              
              <button
                onClick={exportInventoryAsImage}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-400 hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-500/50 transition-all duration-200 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                匯出圖片
              </button>
            </div>
          </div>
        
                          {/* 出杯豆 */}
        <div id="brewing-section" className="space-y-4">
          <div id="brewing-title" className="flex items-center gap-3 mb-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-400/20 backdrop-blur-md shadow-lg">
            <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
            <div>
              <h3 className="text-xl font-bold text-blue-400">出杯豆</h3>
              <p className="text-sm text-blue-300/70">用於製作飲品的咖啡豆</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></div>
              <span className="text-xs text-blue-300 font-medium">當前區域</span>
            </div>
          </div>
            
            {/* 手沖豆 */}
            <div className="space-y-3">
              <div id="pourOver-title" className="flex items-center gap-3 mb-3 p-3 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-lg border border-blue-400/10 backdrop-blur-sm shadow-md">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <h4 className="text-md font-semibold text-blue-300">手沖豆</h4>
                <span className="text-xs text-blue-300/60">手沖咖啡專用</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {BEAN_TYPES.brewing.pourOver.map(beanType => {
                const isStoreOnly = STORE_ONLY_BEANS.includes(beanType)
                const beanData = inventory.brewing.pourOver[beanType]
                const quickKey = `brewing-pourOver-${beanType}`
                const quickData = quickInputData[quickKey]
                
                return (
                  <div key={beanType} className={`bg-gradient-to-br from-surface/60 to-surface/40 rounded-xl p-3 border ${
                    quickInputMode ? 'border-green-400/50' : 'border-white/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-sm text-primary">{beanType}</h5>
                      <div className={`w-2 h-2 rounded-full ${quickInputMode ? 'bg-green-400' : 'bg-primary/60'}`}></div>
                    </div>
                    
                    {quickInputMode ? (
                      // 快速輸入模式
                      <div className="space-y-3">
                        {/* 店面庫存 */}
                        <div>
                          <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                            店面庫存
                          </h6>
                          <input
                            type="number"
                            value={quickData?.store || '0'}
                            onChange={(e) => updateQuickInput(quickKey, 'store', e.target.value)}
                            placeholder="數量"
                            className="w-full text-sm py-3 px-4 rounded-lg bg-white/5 border border-white/10 focus:border-blue-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-colors text-center font-semibold text-white placeholder-gray-500"
                            inputMode="decimal"
                          />
                        </div>

                        {/* 員休室庫存（只有非 Taiwan/Geisha 才有） */}
                        {!isStoreOnly && (
                          <div>
                            <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                              員休室庫存
                            </h6>
                            <input
                              type="number"
                              value={quickData?.breakRoom || '0'}
                              onChange={(e) => updateQuickInput(quickKey, 'breakRoom', e.target.value)}
                              placeholder="數量"
                              className="w-full text-sm py-3 px-4 rounded-lg bg-white/5 border border-white/10 focus:border-green-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-colors text-center font-semibold text-white placeholder-gray-500"
                              inputMode="decimal"
                            />
                          </div>
                        )}
                        
                        <div className="mt-3 pt-2 border-t border-white/10 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg p-2">
                          <span className="text-xs font-semibold text-green-400">
                            總計: {parseInt(quickData?.store || 0) + parseInt(quickData?.breakRoom || 0)} 包
                          </span>
                        </div>
                      </div>
                    ) : (
                      // 正常模式
                      <>
                        {/* 店面庫存 */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                              店面庫存
                            </h6>
                            <button
                              onClick={() => addQuantityField('brewing', 'pourOver', beanType, 'store')}
                              className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors hover:scale-110 transform"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-1.5">
                            {(beanData?.store || ['']).map((quantity, index) => (
                              <div key={index} className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => updateQuantity('brewing', 'pourOver', beanType, 'store', index, e.target.value)}
                                  placeholder="數量"
                                  className="input-field flex-1 text-sm py-2 px-3 rounded-lg bg-white/5 border-white/10 focus:border-blue-400/50 focus:bg-white/10 transition-all"
                                  inputMode="decimal"
                                />
                                {(beanData?.store || []).length > 1 && (
                                  <button
                                    onClick={() => removeQuantityField('brewing', 'pourOver', beanType, 'store', index)}
                                    className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 員休室庫存（只有非 Taiwan/Geisha 才有） */}
                        {!isStoreOnly && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                員休室庫存
                              </h6>
                              <button
                                onClick={() => addQuantityField('brewing', 'pourOver', beanType, 'breakRoom')}
                                className="p-1 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                              >
                                <PlusIcon className="w-3 h-3" />
                              </button>
                            </div>
                            
                            <div className="space-y-1.5">
                              {(beanData?.breakRoom || ['']).map((quantity, index) => (
                                <div key={index} className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => updateQuantity('brewing', 'pourOver', beanType, 'breakRoom', index, e.target.value)}
                                    placeholder="數量"
                                    className="input-field flex-1 text-sm py-1.5 px-2.5 rounded-lg bg-white/5 border-white/10 focus:border-green-400/50 focus:bg-white/10"
                                    inputMode="decimal"
                                  />
                                  {(beanData?.breakRoom || []).length > 1 && (
                                    <button
                                      onClick={() => removeQuantityField('brewing', 'pourOver', beanType, 'breakRoom', index)}
                                      className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                    >
                                      <TrashIcon className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-3 pt-2 border-t border-white/10 bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-2">
                          <span className="text-xs font-semibold text-primary">
                            {beanType}：總共 {calculateBeanTypeTotal(beanData)} 包
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 義式豆 */}
          <div className="space-y-3">
            <div id="espresso-title" className="flex items-center gap-3 mb-3 p-3 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-lg border border-purple-400/10 backdrop-blur-sm shadow-md">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <h4 className="text-md font-semibold text-purple-300">義式豆</h4>
              <span className="text-xs text-purple-300/60">義式咖啡專用</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {BEAN_TYPES.brewing.espresso.map(beanType => {
                const isStoreOnly = STORE_ONLY_BEANS.includes(beanType)
                const beanData = inventory.brewing.espresso[beanType]
                const quickKey = `brewing-espresso-${beanType}`
                const quickData = quickInputData[quickKey]
                
                return (
                  <div key={beanType} className={`bg-gradient-to-br from-surface/60 to-surface/40 rounded-xl p-3 border ${
                    quickInputMode ? 'border-green-400/50' : 'border-white/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-sm text-primary">{beanType}</h5>
                      <div className={`w-2 h-2 rounded-full ${quickInputMode ? 'bg-green-400' : 'bg-primary/60'}`}></div>
                    </div>
                    
                    {quickInputMode ? (
                      // 快速輸入模式
                      <div className="space-y-3">
                        {/* 店面庫存 */}
                        <div>
                          <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                            店面庫存
                          </h6>
                          <input
                            type="number"
                            value={quickData?.store || '0'}
                            onChange={(e) => updateQuickInput(quickKey, 'store', e.target.value)}
                            placeholder="數量"
                            className="w-full text-sm py-3 px-4 rounded-lg bg-white/5 border border-white/10 focus:border-blue-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-colors text-center font-semibold text-white placeholder-gray-500"
                            inputMode="decimal"
                          />
                        </div>

                        {/* 員休室庫存（只有非 Taiwan/Geisha 才有） */}
                        {!isStoreOnly && (
                          <div>
                            <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                              員休室庫存
                            </h6>
                            <input
                              type="number"
                              value={quickData?.breakRoom || '0'}
                              onChange={(e) => updateQuickInput(quickKey, 'breakRoom', e.target.value)}
                              placeholder="數量"
                              className="w-full text-sm py-3 px-4 rounded-lg bg-white/5 border border-white/10 focus:border-green-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-colors text-center font-semibold text-white placeholder-gray-500"
                              inputMode="decimal"
                            />
                          </div>
                        )}
                        
                        <div className="mt-3 pt-2 border-t border-white/10 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg p-2">
                          <span className="text-xs font-semibold text-green-400">
                            總計: {parseInt(quickData?.store || 0) + parseInt(quickData?.breakRoom || 0)} 包
                          </span>
                        </div>
                      </div>
                    ) : (
                      // 正常模式
                      <>
                        {/* 店面庫存 */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                              店面庫存
                            </h6>
                            <button
                              onClick={() => addQuantityField('brewing', 'espresso', beanType, 'store')}
                              className="p-1 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"
                            >
                              <PlusIcon className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <div className="space-y-1.5">
                            {(beanData?.store || ['']).map((quantity, index) => (
                              <div key={index} className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => updateQuantity('brewing', 'espresso', beanType, 'store', index, e.target.value)}
                                  placeholder="數量"
                                  className="input-field flex-1 text-sm py-1.5 px-2.5 rounded-lg bg-white/5 border-white/10 focus:border-blue-400/50 focus:bg-white/10"
                                  inputMode="decimal"
                                />
                                {(beanData?.store || []).length > 1 && (
                                  <button
                                    onClick={() => removeQuantityField('brewing', 'espresso', beanType, 'store', index)}
                                    className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 員休室庫存（只有非 Taiwan/Geisha 才有） */}
                        {!isStoreOnly && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                員休室庫存
                              </h6>
                              <button
                                onClick={() => addQuantityField('brewing', 'espresso', beanType, 'breakRoom')}
                                className="p-1 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                              >
                                <PlusIcon className="w-3 h-3" />
                              </button>
                            </div>
                            
                            <div className="space-y-1.5">
                              {(beanData?.breakRoom || ['']).map((quantity, index) => (
                                <div key={index} className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => updateQuantity('brewing', 'espresso', beanType, 'breakRoom', index, e.target.value)}
                                    placeholder="數量"
                                    className="input-field flex-1 text-sm py-1.5 px-2.5 rounded-lg bg-white/5 border-white/10 focus:border-green-400/50 focus:bg-white/10"
                                    inputMode="decimal"
                                  />
                                  {(beanData?.breakRoom || []).length > 1 && (
                                    <button
                                      onClick={() => removeQuantityField('brewing', 'espresso', beanType, 'breakRoom', index)}
                                      className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                    >
                                      <TrashIcon className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-3 pt-2 border-t border-white/10 bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-2">
                          <span className="text-xs font-semibold text-primary">
                            {beanType}：總共 {calculateBeanTypeTotal(beanData)} 包
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 賣豆 */}
        <div id="retail-section" className="space-y-4 mt-8">
          <div id="retail-title" className="flex items-center gap-3 mb-4 p-4 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-xl border border-orange-400/20 backdrop-blur-md shadow-lg">
            <div className="w-2 h-8 bg-gradient-to-b from-orange-400 to-yellow-400 rounded-full"></div>
            <div>
              <h3 className="text-xl font-bold text-orange-400">賣豆</h3>
              <p className="text-sm text-orange-300/70">用於販售的咖啡豆</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400 animate-pulse"></div>
              <span className="text-xs text-orange-300 font-medium">當前區域</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {BEAN_TYPES.retail.map(beanType => {
              const isStoreOnly = STORE_ONLY_BEANS.includes(beanType)
              const beanData = inventory.retail[beanType]
              const quickKey = `retail-${beanType}`
              const quickData = quickInputData[quickKey]
              
              return (
                <div key={beanType} className={`bg-gradient-to-br from-surface/60 to-surface/40 rounded-xl p-3 border ${
                  quickInputMode ? 'border-green-400/50' : 'border-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-semibold text-sm text-primary">{beanType}</h5>
                    <div className={`w-2 h-2 rounded-full ${quickInputMode ? 'bg-green-400' : 'bg-primary/60'}`}></div>
                  </div>
                  
                  {quickInputMode ? (
                    // 快速輸入模式
                    <div className="space-y-3">
                      {/* 店面庫存 */}
                      <div>
                        <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                          店面庫存
                        </h6>
                        <input
                          type="number"
                          value={quickData?.store || '0'}
                          onChange={(e) => updateQuickInput(quickKey, 'store', e.target.value)}
                          placeholder="數量"
                          className="w-full text-sm py-3 px-4 rounded-lg bg-white/5 border border-white/10 focus:border-blue-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-colors text-center font-semibold text-white placeholder-gray-500"
                          inputMode="decimal"
                        />
                      </div>

                      {/* 員休室庫存（只有非 Taiwan/Geisha 才有） */}
                      {!isStoreOnly && (
                        <div>
                          <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                            員休室庫存
                          </h6>
                          <input
                            type="number"
                            value={quickData?.breakRoom || '0'}
                            onChange={(e) => updateQuickInput(quickKey, 'breakRoom', e.target.value)}
                            placeholder="數量"
                            className="w-full text-sm py-3 px-4 rounded-lg bg-white/5 border border-white/10 focus:border-green-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-colors text-center font-semibold text-white placeholder-gray-500"
                            inputMode="decimal"
                          />
                        </div>
                      )}
                      
                      <div className="mt-3 pt-2 border-t border-white/10 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg p-2">
                        <span className="text-xs font-semibold text-green-400">
                          總計: {parseInt(quickData?.store || 0) + parseInt(quickData?.breakRoom || 0)} 包
                        </span>
                      </div>
                    </div>
                  ) : (
                    // 正常模式
                    <>
                      {/* 店面庫存 */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                            店面庫存
                          </h6>
                          <button
                            onClick={() => {
                              // 為賣豆初始化結構
                              if (!inventory.retail[beanType]) {
                                const isStoreOnly = STORE_ONLY_BEANS.includes(beanType)
                                const initialStructure = isStoreOnly 
                                  ? { store: [''] }
                                  : { store: [''], breakRoom: [''] }
                                
                                setInventory(prev => ({
                                  ...prev,
                                  retail: {
                                    ...prev.retail,
                                    [beanType]: initialStructure
                                  }
                                }))
                              }
                              
                              // 新增數量欄位
                              setInventory(prev => ({
                                ...prev,
                                retail: {
                                  ...prev.retail,
                                  [beanType]: {
                                    ...prev.retail[beanType],
                                    store: [...(prev.retail[beanType]?.store || ['']), '']
                                  }
                                }
                              }))
                            }}
                            className="p-1 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"
                          >
                            <PlusIcon className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <div className="space-y-1.5">
                          {(beanData?.store || ['']).map((quantity, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={quantity}
                                onChange={(e) => {
                                  // 為賣豆初始化結構
                                  if (!inventory.retail[beanType]) {
                                    const isStoreOnly = STORE_ONLY_BEANS.includes(beanType)
                                    const initialStructure = isStoreOnly 
                                      ? { store: [''] }
                                      : { store: [''], breakRoom: [''] }
                                    
                                    setInventory(prev => ({
                                      ...prev,
                                      retail: {
                                        ...prev.retail,
                                        [beanType]: initialStructure
                                      }
                                    }))
                                  }
                                  
                                  // 更新數量
                                  setInventory(prev => ({
                                    ...prev,
                                    retail: {
                                      ...prev.retail,
                                      [beanType]: {
                                        ...prev.retail[beanType],
                                        store: prev.retail[beanType]?.store?.map((q, i) => 
                                          i === index ? e.target.value : q
                                        ) || ['']
                                      }
                                    }
                                  }))
                                }}
                                placeholder="數量"
                                className="input-field flex-1 text-sm py-1.5 px-2.5 rounded-lg bg-white/5 border-white/10 focus:border-blue-400/50 focus:bg-white/10"
                                inputMode="decimal"
                              />
                              {(beanData?.store || []).length > 1 && (
                                <button
                                  onClick={() => {
                                    setInventory(prev => ({
                                      ...prev,
                                      retail: {
                                        ...prev.retail,
                                        [beanType]: {
                                          ...prev.retail[beanType],
                                          store: prev.retail[beanType]?.store?.filter((_, i) => i !== index) || ['']
                                        }
                                      }
                                    }))
                                  }}
                                  className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 員休室庫存（只有非 Taiwan/Geisha 才有） */}
                      {!isStoreOnly && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                              員休室庫存
                            </h6>
                            <button
                              onClick={() => {
                                // 為賣豆初始化結構
                                if (!inventory.retail[beanType]) {
                                  const isStoreOnly = STORE_ONLY_BEANS.includes(beanType)
                                  const initialStructure = isStoreOnly 
                                    ? { store: [''] }
                                    : { store: [''], breakRoom: [''] }
                                  
                                  setInventory(prev => ({
                                    ...prev,
                                    retail: {
                                      ...prev.retail,
                                      [beanType]: initialStructure
                                    }
                                  }))
                                }
                                
                                // 新增數量欄位
                                setInventory(prev => ({
                                  ...prev,
                                  retail: {
                                    ...prev.retail,
                                    [beanType]: {
                                      ...prev.retail[beanType],
                                      breakRoom: [...(prev.retail[beanType]?.breakRoom || ['']), '']
                                    }
                                  }
                                }))
                              }}
                              className="p-1 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                            >
                              <PlusIcon className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <div className="space-y-1.5">
                            {(beanData?.breakRoom || ['']).map((quantity, index) => (
                              <div key={index} className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => {
                                    // 為賣豆初始化結構
                                    if (!inventory.retail[beanType]) {
                                      const isStoreOnly = STORE_ONLY_BEANS.includes(beanType)
                                      const initialStructure = isStoreOnly 
                                        ? { store: [''] }
                                        : { store: [''], breakRoom: [''] }
                                      
                                      setInventory(prev => ({
                                        ...prev,
                                        retail: {
                                          ...prev.retail,
                                          [beanType]: initialStructure
                                        }
                                      }))
                                    }
                                    
                                    // 更新數量
                                    setInventory(prev => ({
                                      ...prev,
                                      retail: {
                                        ...prev.retail,
                                        [beanType]: {
                                          ...prev.retail[beanType],
                                          breakRoom: prev.retail[beanType]?.breakRoom?.map((q, i) => 
                                            i === index ? e.target.value : q
                                          ) || ['']
                                        }
                                      }
                                    }))
                                  }}
                                  placeholder="數量"
                                  className="input-field flex-1 text-sm py-1.5 px-2.5 rounded-lg bg-white/5 border-white/10 focus:border-green-400/50 focus:bg-white/10"
                                  inputMode="decimal"
                                />
                                {(beanData?.breakRoom || []).length > 1 && (
                                  <button
                                    onClick={() => {
                                      setInventory(prev => ({
                                        ...prev,
                                        retail: {
                                          ...prev.retail,
                                          [beanType]: {
                                            ...prev.retail[beanType],
                                            breakRoom: prev.retail[beanType]?.breakRoom?.filter((_, i) => i !== index) || ['']
                                          }
                                        }
                                      }))
                                    }}
                                    className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3 pt-2 border-t border-white/10 bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-2">
                        <span className="text-xs font-semibold text-primary">
                          {beanType}：總共 {calculateBeanTypeTotal(beanData)} 包
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        </div>
      </div>

      {/* 浮動區域指示器 - 放在右側，不擋到標題和導航 */}
      <div className="fixed top-32 right-4 sm:top-36 sm:right-6 md:top-40 md:right-8 z-40">
        <div className="bg-surface/90 backdrop-blur-md border border-white/20 rounded-full px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => document.getElementById('brewing-section')?.scrollIntoView({ behavior: 'smooth' })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300 ${currentSection === 'brewing' ? 'bg-blue-400/20 text-blue-400' : 'text-gray-400 hover:text-blue-300'}`}
            >
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSection === 'brewing' ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
              <span className="text-xs sm:text-sm font-medium">出杯豆</span>
            </button>
            <div className="w-px h-4 bg-gray-600"></div>
            <button 
              onClick={() => document.getElementById('retail-section')?.scrollIntoView({ behavior: 'smooth' })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300 ${currentSection === 'retail' ? 'bg-orange-400/20 text-orange-400' : 'text-gray-400 hover:text-orange-300'}`}
            >
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSection === 'retail' ? 'bg-orange-400' : 'bg-gray-400'}`}></div>
              <span className="text-xs sm:text-sm font-medium">賣豆</span>
            </button>
          </div>
        </div>
      </div>

      {/* 重量換算計算器彈窗 */}
              {showWeightCalculator && (
          <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            // 點擊背景時關閉彈窗
            if (e.target === e.currentTarget) {
              setShowWeightCalculator(false)
            }
          }}
        >
            <div 
            className="bg-surface/95 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()} // 防止點擊內容區域時關閉彈窗
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-primary mb-1">重量換算計算器</h2>
                <p className="text-sm text-text-secondary">估算豆包數量</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={resetWeightSettings}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-200 flex items-center gap-1"
                >
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  回復設定
                </button>
                <button
                  onClick={() => setShowWeightCalculator(false)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 店鋪選擇 */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
                  <BuildingStorefrontIcon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-base font-bold text-primary">選擇分店</h3>
              </div>
              
              {/* 分段控制器容器 */}
              <div className="relative mx-auto max-w-2xl bg-surface/60 rounded-xl p-1 border border-white/10">
                {/* 滑動指示器 */}
                <div
                  className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 transition-[transform] duration-200 ease-out"
                  style={{
                    width: 'calc(33.333% - 4px)',
                    left: '4px',
                    transform: selectedWeightStore === 'central' ? 'translateX(0%)' :
                              selectedWeightStore === 'd7' ? 'translateX(100%)' :
                              'translateX(200%)'
                  }}
                />
                
                {/* 選項按鈕 */}
                <div className="relative grid grid-cols-3 gap-1.5">
                  {[
                    { value: 'central', label: '中央店' },
                    { value: 'd7', label: 'D7 店' },
                    { value: 'd13', label: 'D13 店' }
                  ].map((store) => {
                    const isSelected = selectedWeightStore === store.value
                    return (
                      <button
                        key={store.value}
                        onClick={() => setSelectedWeightStore(store.value)}
                        className={`
                          relative z-10
                          px-3 py-3 sm:px-4 sm:py-4
                          rounded-lg
                          font-bold text-xs sm:text-sm
                          transition-colors duration-200
                          ${isSelected 
                            ? 'text-white' 
                            : 'text-gray-300 active:text-white'
                          }
                        `}
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation'
                        }}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full shadow-sm" />
                          )}
                          <span className="tracking-wide">{store.label}</span>
                        </span>
                        
                        {isSelected && (
                          <div className="absolute inset-0 rounded-xl bg-primary/10 opacity-100" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* 模式切換 */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-amber-400 to-orange-400 rounded-full"></div>
                <h3 className="text-lg font-bold text-primary">計算模式</h3>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:border-amber-400/30 transition-all duration-200 cursor-pointer bg-gradient-to-br from-surface/40 to-surface/20">
                  <input
                    type="radio"
                    value="bag"
                    checked={weightMode === 'bag'}
                    onChange={(e) => setWeightMode(e.target.value)}
                    className="text-amber-400 w-4 h-4"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <span className="font-medium">外包裝袋</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:border-amber-400/30 transition-all duration-200 cursor-pointer bg-gradient-to-br from-surface/40 to-surface/20">
                  <input
                    type="radio"
                    value="ikea"
                    checked={weightMode === 'ikea'}
                    onChange={(e) => setWeightMode(e.target.value)}
                    className="text-amber-400 w-4 h-4"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <span className="font-medium">IKEA 盒子</span>
                  </div>
                </label>
              </div>
            </div>

            {/* 重量設定 */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                <h3 className="text-lg font-bold text-primary">重量設定</h3>
              </div>
              
              {/* 重量輸入欄位 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-surface/40 to-surface/20 rounded-xl p-4 border border-white/10">
                  <label className="block text-sm font-semibold mb-3 text-primary flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    {weightMode === 'bag' ? '外包裝袋重量' : 'IKEA 盒重量'} (g)
                  </label>
                  <input
                    type="number"
                    value={weightMode === 'bag' ? weightSettings.bagWeight : weightSettings.ikeaBoxWeight}
                    onChange={(e) => updateWeightSetting(
                      weightMode === 'bag' ? 'bagWeight' : 'ikeaBoxWeight', 
                      e.target.value
                    )}
                    className="input-field w-full text-sm py-3 px-4 rounded-lg bg-white/5 border-white/10 focus:border-blue-400/50 focus:bg-white/10 transition-all"
                    placeholder="輸入重量"
                    inputMode="decimal"
                  />
                </div>
                <div className="bg-gradient-to-br from-surface/40 to-surface/20 rounded-xl p-4 border border-white/10">
                  <label className="block text-sm font-semibold mb-3 text-primary flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    每包豆子重量 (g)
                  </label>
                  <input
                    type="number"
                    value={weightSettings.beanWeightPerPack}
                    onChange={(e) => updateWeightSetting('beanWeightPerPack', e.target.value)}
                    className="input-field w-full text-sm py-2.5 px-3 rounded-lg bg-white/5 border-white/10 focus:border-green-400/50 focus:bg-white/10"
                    placeholder="輸入重量"
                    inputMode="decimal"
                  />
                </div>
              </div>
              
              {/* 操作按鈕 */}
              <div className="flex justify-end">
                <button
                  onClick={addCalculation}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 text-primary hover:from-primary/30 hover:to-purple-500/30 hover:border-primary/50 transition-all duration-200 flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  新增計算欄位
                </button>
              </div>
            </div>

            {/* 計算欄位 */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-green-400 to-emerald-400 rounded-full"></div>
                <h3 className="text-lg font-bold text-primary">計算結果</h3>
              </div>
              
              {calculations.map((calc) => (
                <div key={calc.id} className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h5 className="font-semibold text-primary">計算欄位 #{calc.id}</h5>
                      <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                    </div>
                    {calculations.length > 1 && (
                      <button
                        onClick={() => removeCalculation(calc.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-surface/40 to-surface/20 rounded-lg p-3 border border-white/10">
                      <label className="block text-sm font-semibold mb-2 text-text-secondary flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                        總重量 (g)
                      </label>
                      <input
                        type="number"
                        value={calc.totalWeight}
                        onChange={(e) => updateCalculation(calc.id, e.target.value)}
                        placeholder="輸入總重量"
                        className="input-field w-full text-sm py-2 px-3 rounded-lg bg-white/5 border-white/10 focus:border-blue-400/50 focus:bg-white/10"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="bg-gradient-to-br from-surface/40 to-surface/20 rounded-lg p-3 border border-white/10">
                      <label className="block text-sm font-semibold mb-2 text-text-secondary flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                        估算包數
                      </label>
                      <div className="w-full text-sm py-3 px-4 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 text-center font-bold text-green-400 hover:border-green-500/50 transition-all">
                        {calc.estimatedPacks} 包
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default CoffeeBeanManager 