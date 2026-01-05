import { useState, useEffect, useRef, useMemo } from 'react'
import { PlusIcon, TrashIcon, CalculatorIcon, ClipboardDocumentListIcon, ArrowDownTrayIcon, XMarkIcon, BuildingStorefrontIcon, Cog6ToothIcon, ArrowPathIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { db } from '../utils/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useLocalStorage } from '../hooks/useLocalStorage'
import logoCat from '../assets/logo-cat.png'
import BeanTypesSettingsModal from '../components/BeanTypesSettingsModal'

// 預設咖啡豆種類定義
const DEFAULT_BEAN_TYPES = {
  brewing: {
    pourOver: ['水洗', '日曬', '阿寶', '台灣豆', 'Geisha'],
    espresso: ['ESP', '水洗']
  },
  retail: ['水洗', '日曬', '阿寶', '季節', '台灣豆', 'Geisha']
}

// 根據店鋪獲取預設品項位置設定
// D7 店：所有品項的 dryStorage 預設為 true
// 中央店和 D13 店：所有品項的 dryStorage 預設為 false
const getDefaultBeanLocationsForStore = (store) => {
  const dryStorageDefault = store === 'd7' ? true : false
  return {
    '台灣豆': { store: true, breakRoom: false, dryStorage: dryStorageDefault },
    'Geisha': { store: true, breakRoom: false, dryStorage: dryStorageDefault }
  }
}

// 預設品項位置設定（用於向後兼容，中央店預設）
const DEFAULT_BEAN_LOCATIONS = getDefaultBeanLocationsForStore('central')

// 將舊的 storeOnlyBeans 格式轉換為新的 beanLocations 格式
const convertStoreOnlyToLocations = (storeOnlyBeans, allBeanNames) => {
  const locations = {}
  allBeanNames.forEach(beanName => {
    locations[beanName] = {
      store: true,
      breakRoom: !storeOnlyBeans.includes(beanName),
      dryStorage: false
    }
  })
  return locations
}

// 預設重量設定
const DEFAULT_WEIGHTS = {
  bagWeight: 121,
  ikeaBoxWeight: 365,
  mujiBoxWeight: 365, // MUJI 盒子重量（預設與 IKEA 相同，可根據實際情況調整）
  beanWeightPerPack: 19
}

function CoffeeBeanManager() {
  const [showWeightCalculator, setShowWeightCalculator] = useState(false)
  const [showBeanTypesSettings, setShowBeanTypesSettings] = useState(false)
  
  // 店鋪選擇（用於庫存管理和品項設定）
  const [selectedStore, setSelectedStore] = useState('central') // 'central', 'd7', 'd13'
  
  // 為每個店鋪分別存儲品項設定
  const [beanTypesCentral, setBeanTypesCentral] = useState(DEFAULT_BEAN_TYPES)
  const [beanTypesD7, setBeanTypesD7] = useState(DEFAULT_BEAN_TYPES)
  const [beanTypesD13, setBeanTypesD13] = useState(DEFAULT_BEAN_TYPES)
  
  const [beanLocationsCentral, setBeanLocationsCentral] = useState(getDefaultBeanLocationsForStore('central'))
  const [beanLocationsD7, setBeanLocationsD7] = useState(getDefaultBeanLocationsForStore('d7'))
  const [beanLocationsD13, setBeanLocationsD13] = useState(getDefaultBeanLocationsForStore('d13'))
  
  const [beanLocationsLoaded, setBeanLocationsLoaded] = useState(false)
  
  // 當前選中店鋪的品項設定
  const beanTypes = useMemo(() => {
    if (selectedStore === 'd7') return beanTypesD7
    if (selectedStore === 'd13') return beanTypesD13
    return beanTypesCentral
  }, [selectedStore, beanTypesCentral, beanTypesD7, beanTypesD13])
  
  const beanLocations = useMemo(() => {
    if (selectedStore === 'd7') return beanLocationsD7
    if (selectedStore === 'd13') return beanLocationsD13
    return beanLocationsCentral
  }, [selectedStore, beanLocationsCentral, beanLocationsD7, beanLocationsD13])
  
  // 更新當前店鋪的品項設定（支持函數式更新）
  const setBeanTypes = (newBeanTypes) => {
    if (typeof newBeanTypes === 'function') {
      if (selectedStore === 'd7') setBeanTypesD7(newBeanTypes)
      else if (selectedStore === 'd13') setBeanTypesD13(newBeanTypes)
      else setBeanTypesCentral(newBeanTypes)
    } else {
      if (selectedStore === 'd7') setBeanTypesD7(newBeanTypes)
      else if (selectedStore === 'd13') setBeanTypesD13(newBeanTypes)
      else setBeanTypesCentral(newBeanTypes)
    }
  }
  
  const setBeanLocations = (newBeanLocations) => {
    if (typeof newBeanLocations === 'function') {
      if (selectedStore === 'd7') setBeanLocationsD7(newBeanLocations)
      else if (selectedStore === 'd13') setBeanLocationsD13(newBeanLocations)
      else setBeanLocationsCentral(newBeanLocations)
    } else {
      if (selectedStore === 'd7') setBeanLocationsD7(newBeanLocations)
      else if (selectedStore === 'd13') setBeanLocationsD13(newBeanLocations)
      else setBeanLocationsCentral(newBeanLocations)
    }
  }
  
  // 獲取品項的完整鍵（包含分類信息）
  const getBeanKey = (beanName, category, subCategory) => {
    if (category === 'retail') {
      return `retail.${beanName}`
    } else if (subCategory) {
      return `brewing.${subCategory}.${beanName}`
    } else {
      // 如果沒有提供分類信息，使用舊格式（向後兼容）
      return beanName
    }
  }

  // 初始化品項位置（如果品項不存在，預設所有位置都啟用）
  // category: 'brewing' | 'retail'
  // subCategory: 'pourOver' | 'espresso' (僅當 category === 'brewing' 時需要)
  const getBeanLocation = (beanName, category = null, subCategory = null) => {
    const defaultLocation = { store: true, breakRoom: true, dryStorage: true }
    
    // 如果還沒有載入完成，使用 DEFAULT_BEAN_LOCATIONS 作為臨時值，避免閃爍
    if (!beanLocationsLoaded) {
      const location = DEFAULT_BEAN_LOCATIONS[beanName] || defaultLocation
      return {
        store: location.store ?? true,
        breakRoom: location.breakRoom ?? true,
        dryStorage: location.dryStorage ?? false
      }
    }
    
    // 如果有分類信息，嘗試使用分類鍵（新格式）
    if (category) {
      const beanKey = getBeanKey(beanName, category, subCategory)
      if (beanLocations[beanKey]) {
        const location = beanLocations[beanKey]
        return {
          store: location.store ?? true,
          breakRoom: location.breakRoom ?? true,
          dryStorage: location.dryStorage ?? false
        }
      }
    }
    
    // 嘗試舊格式（向後兼容）
    if (beanLocations[beanName]) {
      const location = beanLocations[beanName]
      return {
        store: location.store ?? true,
        breakRoom: location.breakRoom ?? true,
        dryStorage: location.dryStorage ?? false
      }
    }
    
    // 都不存在，返回預設值
    return defaultLocation
  }
  
  // 用於追蹤 Firebase 品項設定訂閱
  const beanTypesUnsubscribeRef = useRef(null)
  
  // 用於追蹤 beanLocations 的變化
  const prevBeanLocationsRef = useRef('')
  const prevBeanTypesRef = useRef(JSON.stringify(beanTypes))
  
  // 滾動位置保存（用於彈窗關閉時恢復）
  const scrollPositionRef = useRef(0)
  
  // 浮動區域指示器位置（可拖動）
  const [indicatorPosition, setIndicatorPosition] = useLocalStorage('coffeeBeanIndicatorPosition', {
    top: 128, // top-32 = 128px
    right: 16, // right-4 = 16px
    left: null
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, top: 0, right: 0, left: 0 })
  
  // 處理拖動開始
  const handleIndicatorDragStart = (e) => {
    setIsDragging(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    // 獲取當前元素的絕對位置
    const element = e.currentTarget.parentElement
    const rect = element.getBoundingClientRect()
    
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startX: rect.left,
      startY: rect.top
    }
    
    e.preventDefault()
    e.stopPropagation()
  }
  
  // 處理拖動中
  useEffect(() => {
    if (!isDragging) return
    
    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      
      const deltaX = clientX - dragStartRef.current.x
      const deltaY = clientY - dragStartRef.current.y
      
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const elementWidth = 180 // 估計元素寬度
      
      // 計算新位置的絕對 left 值
      let newLeft = dragStartRef.current.startX + deltaX
      let newTop = dragStartRef.current.startY + deltaY
      
      // 限制在視窗範圍內
      newTop = Math.max(0, Math.min(newTop, windowHeight - 60))
      newLeft = Math.max(0, Math.min(newLeft, windowWidth - elementWidth))
      
      // 判斷應該使用 left 還是 right（根據位置是否超過中線）
      const centerX = windowWidth / 2
      const useRight = newLeft > centerX
      
      setIndicatorPosition({
        top: newTop,
        right: useRight ? windowWidth - newLeft - elementWidth : null,
        left: useRight ? null : newLeft
      })
      
      e.preventDefault()
    }
    
    const handleEnd = () => {
      setIsDragging(false)
    }
    
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
    
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, setIndicatorPosition])
  
  // 滾動鎖定功能
  useEffect(() => {
    if (showWeightCalculator) {
      // 保存當前滾動位置
      scrollPositionRef.current = window.scrollY
      // 鎖定背景滾動
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${scrollPositionRef.current}px`
    } else {
      // 恢復背景滾動
      const savedScrollY = scrollPositionRef.current
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      // 恢復滾動位置
      window.scrollTo(0, savedScrollY)
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
  
  // 為每個店鋪分別存儲盤點表
  const defaultInventory = {
    brewing: {
      pourOver: {},
      espresso: {}
    },
    retail: {}
  }
  const [inventoryCentral, setInventoryCentral] = useLocalStorage('coffeeBeanInventory_central', defaultInventory)
  const [inventoryD7, setInventoryD7] = useLocalStorage('coffeeBeanInventory_d7', defaultInventory)
  const [inventoryD13, setInventoryD13] = useLocalStorage('coffeeBeanInventory_d13', defaultInventory)
  
  // 當前選中店鋪的盤點表
  const inventory = useMemo(() => {
    if (selectedStore === 'd7') return inventoryD7
    if (selectedStore === 'd13') return inventoryD13
    return inventoryCentral
  }, [selectedStore, inventoryCentral, inventoryD7, inventoryD13])
  
  // 更新當前店鋪的盤點表（支持函數式更新）
  const setInventory = (newInventory) => {
    if (typeof newInventory === 'function') {
      // 函數式更新
      if (selectedStore === 'd7') setInventoryD7(newInventory)
      else if (selectedStore === 'd13') setInventoryD13(newInventory)
      else setInventoryCentral(newInventory)
    } else {
      // 直接設置值
      if (selectedStore === 'd7') setInventoryD7(newInventory)
      else if (selectedStore === 'd13') setInventoryD13(newInventory)
      else setInventoryCentral(newInventory)
    }
  }

  // 重量換算狀態
  const [weightMode, setWeightMode] = useState('bag') // 'bag' 或 'ikea'
  
  // 重量計算器店鋪選擇
  const [selectedWeightStore, setSelectedWeightStore] = useState('central') // 'central', 'd7', 'd13'
  
  // 區域指示器狀態
  const [currentSection, setCurrentSection] = useState('brewing')
  
  
  // 匯出模式狀態
  const [exportMode, setExportMode] = useState('cat') // 'cat'、'minimalist' 或 'custom'
  
  // 自訂 logo（用於匯出）
  const [customLogoBase64, setCustomLogoBase64] = useState(() => {
    // 從 localStorage 讀取自訂 logo
    try {
      const saved = localStorage.getItem('customExportLogo')
      return saved || null
    } catch (error) {
      console.error('讀取自訂 logo 失敗:', error)
      return null
    }
  })
  
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

  // 從 localStorage 載入重量模式
  useEffect(() => {
    const savedWeightMode = localStorage.getItem('coffeeBeanWeightMode')
    if (savedWeightMode) {
      setWeightMode(savedWeightMode)
    }
  }, [])

  // 用於追蹤 Firebase 庫存訂閱
  const inventoryUnsubscribeRef = useRef(null)
  // 用於追蹤當前同步操作的店鋪，避免店鋪切換時造成衝突
  const inventorySyncStoreRef = useRef(null)
  
  // 監聽 Firebase 庫存變更（根據選中的店鋪）
  useEffect(() => {
    // 清理舊的訂閱
    if (inventoryUnsubscribeRef.current) {
      inventoryUnsubscribeRef.current()
      inventoryUnsubscribeRef.current = null
    }
    
    const firebaseDocId = `coffeeBeanInventory_${selectedStore}`
    let unsubscribe
    let isMounted = true
    let timeoutId
    
    try {
      // 根據當前店鋪選擇對應的設定更新函數
      const updateInventoryForStore = (data) => {
        if (!isMounted) return
        // 確保數據結構正確
        const validData = {
          brewing: data?.brewing || { pourOver: {}, espresso: {} },
          retail: data?.retail || {}
        }
        if (selectedStore === 'd7') {
          setInventoryD7(validData)
        } else if (selectedStore === 'd13') {
          setInventoryD13(validData)
        } else {
          setInventoryCentral(validData)
        }
      }
      
      // 設置超時機制，5秒後如果還沒有回應就使用本地設定
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('Firebase 庫存連接超時，使用本地庫存')
        }
      }, 5000)
      
      unsubscribe = onSnapshot(
        doc(db, 'settings', firebaseDocId),
        (docSnapshot) => {
          if (!isMounted) return
          if (timeoutId) clearTimeout(timeoutId)
          
          if (docSnapshot.exists()) {
            updateInventoryForStore(docSnapshot.data())
          } else {
            // 如果文件不存在，使用預設值創建
            const defaultInventoryData = {
              brewing: { pourOver: {}, espresso: {} },
              retail: {}
            }
            setDoc(docSnapshot.ref, defaultInventoryData)
              .then(() => {
                if (isMounted) {
                  updateInventoryForStore(defaultInventoryData)
                }
              })
              .catch(error => {
                console.error('創建庫存文件失敗:', error)
              })
          }
        },
        (error) => {
          console.error('讀取庫存錯誤:', error)
          if (timeoutId) clearTimeout(timeoutId)
          // 如果 Firebase 連接失敗，使用本地設定
        }
      )
      
      inventoryUnsubscribeRef.current = unsubscribe
    } catch (error) {
      console.error('Firebase 庫存初始化錯誤:', error)
      if (timeoutId) clearTimeout(timeoutId)
    }

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (inventoryUnsubscribeRef.current) {
        inventoryUnsubscribeRef.current()
        inventoryUnsubscribeRef.current = null
      }
    }
  }, [selectedStore]) // 只需要在 selectedStore 改變時重新訂閱

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
          mujiBoxWeight: data?.mujiBoxWeight || DEFAULT_WEIGHTS.mujiBoxWeight,
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

  // 監聽 Firebase 品項設定變更（根據選中的店鋪）
  useEffect(() => {
    // 清理舊的訂閱
    if (beanTypesUnsubscribeRef.current) {
      beanTypesUnsubscribeRef.current()
      beanTypesUnsubscribeRef.current = null
    }

    let unsubscribe
    let isMounted = true
    let timeoutId

    try {
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('Firebase 品項設定連接超時，使用預設設定')
          setBeanLocationsLoaded(true)
        }
      }, 5000)

      const firebaseDocId = `coffeeBeanTypes_${selectedStore}`
      unsubscribe = onSnapshot(
        doc(db, 'settings', firebaseDocId),
        (docSnapshot) => {
          if (!isMounted) return
          if (timeoutId) clearTimeout(timeoutId)

          // 根據當前店鋪選擇對應的設定更新函數
          const updateBeanTypesForStore = (beanTypesData) => {
            if (!isMounted) return
            if (selectedStore === 'd7') {
              setBeanTypesD7(beanTypesData)
            } else if (selectedStore === 'd13') {
              setBeanTypesD13(beanTypesData)
            } else {
              setBeanTypesCentral(beanTypesData)
            }
          }
          
          const updateBeanLocationsForStore = (locationsData) => {
            if (!isMounted) return
            if (selectedStore === 'd7') {
              setBeanLocationsD7(locationsData)
            } else if (selectedStore === 'd13') {
              setBeanLocationsD13(locationsData)
            } else {
              setBeanLocationsCentral(locationsData)
            }
            setBeanLocationsLoaded(true)
          }

          if (docSnapshot.exists()) {
            const data = docSnapshot.data()
            updateBeanTypesForStore(data.beanTypes || DEFAULT_BEAN_TYPES)
            
            // 處理數據遷移：如果存在舊的 storeOnlyBeans，轉換為新的 beanLocations
            let newBeanLocations
            if (data.beanLocations) {
              newBeanLocations = data.beanLocations
            } else if (data.storeOnlyBeans) {
              // 遷移舊格式
              const allBeanNames = new Set()
              const beanTypesData = data.beanTypes || DEFAULT_BEAN_TYPES
              beanTypesData.brewing?.pourOver?.forEach(name => allBeanNames.add(name))
              beanTypesData.brewing?.espresso?.forEach(name => allBeanNames.add(name))
              beanTypesData.retail?.forEach(name => allBeanNames.add(name))
              newBeanLocations = convertStoreOnlyToLocations(data.storeOnlyBeans, Array.from(allBeanNames))
            } else {
              newBeanLocations = DEFAULT_BEAN_LOCATIONS
            }
            updateBeanLocationsForStore(newBeanLocations)
          } else {
            // 如果文件不存在，使用預設值創建
            setDoc(docSnapshot.ref, {
              beanTypes: DEFAULT_BEAN_TYPES,
              beanLocations: DEFAULT_BEAN_LOCATIONS,
              _lastUpdated: new Date().toISOString()
            }).catch(error => {
              console.error('創建品項設定文件失敗:', error)
            })
            updateBeanTypesForStore(DEFAULT_BEAN_TYPES)
            updateBeanLocationsForStore(DEFAULT_BEAN_LOCATIONS)
          }
        },
        (error) => {
          console.error('讀取品項設定錯誤:', error)
          if (timeoutId) clearTimeout(timeoutId)
          // 如果 Firebase 連接失敗，使用預設設定（根據店鋪設置不同的預設值）
          if (isMounted) {
            const defaultBeanLocations = getDefaultBeanLocationsForStore(selectedStore)
            if (selectedStore === 'd7') {
              setBeanLocationsD7(defaultBeanLocations)
            } else if (selectedStore === 'd13') {
              setBeanLocationsD13(defaultBeanLocations)
            } else {
              setBeanLocationsCentral(defaultBeanLocations)
            }
            setBeanLocationsLoaded(true)
          }
        }
      )

      beanTypesUnsubscribeRef.current = unsubscribe
    } catch (error) {
      console.error('Firebase 品項設定初始化錯誤:', error)
      if (timeoutId) clearTimeout(timeoutId)
      // 如果初始化失敗，使用預設設定（根據店鋪設置不同的預設值）
      const defaultBeanLocations = getDefaultBeanLocationsForStore(selectedStore)
      if (selectedStore === 'd7') {
        setBeanLocationsD7(defaultBeanLocations)
      } else if (selectedStore === 'd13') {
        setBeanLocationsD13(defaultBeanLocations)
      } else {
        setBeanLocationsCentral(defaultBeanLocations)
      }
      setBeanLocationsLoaded(true)
    }

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (beanTypesUnsubscribeRef.current) {
        beanTypesUnsubscribeRef.current()
        beanTypesUnsubscribeRef.current = null
      }
    }
  }, [selectedStore]) // 只需要在 selectedStore 改變時重新訂閱

  // 當 beanLocations 改變時，更新現有的 inventory 結構以符合新的設定
  useEffect(() => {
    // 如果 beanLocations 還沒有載入完成，等待載入
    if (!beanLocationsLoaded) return
    if (!beanLocations || Object.keys(beanLocations).length === 0) return
    if (!beanTypes) return

    const currentBeanLocationsStr = JSON.stringify(beanLocations)
    const currentBeanTypesStr = JSON.stringify(beanTypes)
    
    // 如果 beanLocations 或 beanTypes 沒有改變，跳過更新
    if (currentBeanLocationsStr === prevBeanLocationsRef.current && 
        currentBeanTypesStr === prevBeanTypesRef.current) {
      return
    }
    
    // 更新 ref
    prevBeanLocationsRef.current = currentBeanLocationsStr
    prevBeanTypesRef.current = currentBeanTypesStr

    setInventory(prev => {
      const updated = { ...prev }
      let hasChanges = false

      // 處理出杯豆
      Object.keys(beanTypes.brewing).forEach(subCategory => {
        if (!beanTypes.brewing[subCategory]) return
        
        beanTypes.brewing[subCategory].forEach(beanType => {
          const dryStorageDefault = selectedStore === 'd7' ? true : false
          // 先嘗試使用分類鍵（新格式）
          const beanKey = getBeanKey(beanType, 'brewing', subCategory)
          const location = beanLocations[beanKey] || beanLocations[beanType] || { store: true, breakRoom: true, dryStorage: dryStorageDefault }
          const currentData = prev.brewing[subCategory]?.[beanType]

          if (currentData) {
            const newData = { ...currentData }
            let dataChanged = false

            // 如果應該有 store 但沒有，添加它
            if (location.store && !currentData.store) {
              newData.store = ['']
              dataChanged = true
            }
            // 如果應該有 breakRoom 但沒有，添加它
            if (location.breakRoom && !currentData.breakRoom) {
              newData.breakRoom = ['']
              dataChanged = true
            }
            // 如果應該有 dryStorage 但沒有，添加它
            if (location.dryStorage && !currentData.dryStorage) {
              newData.dryStorage = ['']
              dataChanged = true
            }

            if (dataChanged) {
              if (!updated.brewing) updated.brewing = { ...prev.brewing }
              if (!updated.brewing[subCategory]) updated.brewing[subCategory] = { ...prev.brewing[subCategory] }
              updated.brewing[subCategory][beanType] = newData
              hasChanges = true
            }
          }
        })
      })

      // 處理賣豆
      if (beanTypes.retail && Array.isArray(beanTypes.retail)) {
        beanTypes.retail.forEach(beanType => {
          const dryStorageDefault = selectedStore === 'd7' ? true : false
          // 先嘗試使用分類鍵（新格式）
          const beanKey = getBeanKey(beanType, 'retail')
          const location = beanLocations[beanKey] || beanLocations[beanType] || { store: true, breakRoom: true, dryStorage: dryStorageDefault }
          const currentData = prev.retail?.[beanType]

          if (currentData) {
            const newData = { ...currentData }
            let dataChanged = false

            // 如果應該有 store 但沒有，添加它
            if (location.store && !currentData.store) {
              newData.store = ['']
              dataChanged = true
            }
            // 如果應該有 breakRoom 但沒有，添加它
            if (location.breakRoom && !currentData.breakRoom) {
              newData.breakRoom = ['']
              dataChanged = true
            }
            // 如果應該有 dryStorage 但沒有，添加它
            if (location.dryStorage && !currentData.dryStorage) {
              newData.dryStorage = ['']
              dataChanged = true
            }

            if (dataChanged) {
              if (!updated.retail) updated.retail = { ...prev.retail }
              updated.retail[beanType] = newData
              hasChanges = true
            }
          }
        })
      }

      return hasChanges ? updated : prev
    })
  }, [beanLocations, beanTypes, beanLocationsLoaded, selectedStore])

  // 同步盤點表到 Firebase（根據選中的店鋪）
  useEffect(() => {
    // 使用 ref 追蹤當前要同步的店鋪
    inventorySyncStoreRef.current = selectedStore
    const firebaseDocId = `coffeeBeanInventory_${selectedStore}`
    // 使用防抖來避免過於頻繁的寫入
    const timeoutId = setTimeout(() => {
      // 確保店鋪沒有改變才進行同步（避免在快速切換店鋪時造成衝突）
      if (inventorySyncStoreRef.current === selectedStore) {
        setDoc(doc(db, 'settings', firebaseDocId), inventory).catch(error => {
          console.error('同步庫存到 Firebase 失敗:', error)
        })
      }
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [inventory, selectedStore])

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


  // 初始化豆種的數量陣列（出杯豆用）
  const initializeBeanType = (category, subCategory, beanType) => {
    if (!inventory[category][subCategory]?.[beanType]) {
      const location = getBeanLocation(beanType, category, subCategory)
      const initialStructure = {}
      if (location.store) initialStructure.store = ['']
      if (location.breakRoom) initialStructure.breakRoom = ['']
      if (location.dryStorage) initialStructure.dryStorage = ['']
      
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

  // 初始化賣豆的數量陣列
  const initializeRetailBeanType = (beanType) => {
    if (!inventory.retail[beanType]) {
      const location = getBeanLocation(beanType, 'retail')
      const initialStructure = {}
      if (location.store) initialStructure.store = ['']
      if (location.breakRoom) initialStructure.breakRoom = ['']
      if (location.dryStorage) initialStructure.dryStorage = ['']
      
      setInventory(prev => ({
        ...prev,
        retail: {
          ...prev.retail,
          [beanType]: initialStructure
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
    if (beanData.dryStorage) {
      total += calculateTotal(beanData.dryStorage)
    }
    return total
  }

  // 重量換算計算
  const calculateEstimatedPacks = (totalWeight) => {
    if (!totalWeight) return 0
    const containerWeight = weightMode === 'bag' 
      ? weightSettings.bagWeight 
      : (selectedWeightStore === 'd13' 
          ? (weightSettings.mujiBoxWeight || weightSettings.ikeaBoxWeight)
          : weightSettings.ikeaBoxWeight)
    const beanWeight = totalWeight - containerWeight
    if (beanWeight <= 0) return 0
    return Math.round((beanWeight / weightSettings.beanWeightPerPack) * 10) / 10
  }

  // 臨時存儲輸入值（用於解決輸入框問題）
  const [tempInputValues, setTempInputValues] = useState({})

  // 當切換店鋪時清除臨時輸入值
  useEffect(() => {
    setTempInputValues({})
  }, [selectedWeightStore])

  // 更新重量設定
  // 更新重量設定（根據選中的店鋪）
  const updateWeightSetting = async (key, value, isBlur = false) => {
    // 如果是失去焦點事件，才真正更新設定值
    if (isBlur) {
      // 如果值為空或無效，保持原值
      const parsedValue = value === '' ? null : parseFloat(value)
      const newWeight = (parsedValue === null || isNaN(parsedValue)) 
        ? weightSettings[key] 
        : parsedValue
      
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
      
      // 清除臨時值
      setTempInputValues(prev => {
        const newTemp = { ...prev }
        delete newTemp[key]
        return newTemp
      })
    } else {
      // 輸入過程中只更新臨時值
      setTempInputValues(prev => ({
      ...prev,
        [key]: value
    }))
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

  // 重置計算結果
  const resetCalculations = () => {
    if (confirm('確定要重置所有計算結果嗎？')) {
      setCalculations([{ id: 1, totalWeight: '', estimatedPacks: 0 }])
            }
  }

  // 重置所有數據
  const resetAllData = () => {
    if (confirm('確定要重置所有數據嗎？此操作無法復原。')) {
      // 重置當前店鋪的庫存
      setInventory(defaultInventory)
      setCalculations([{ id: 1, totalWeight: '', estimatedPacks: 0 }])
      // 重置所有店鋪的重量設定
      setWeightSettingsCentral(DEFAULT_WEIGHTS)
      setWeightSettingsD7(DEFAULT_WEIGHTS)
      setWeightSettingsD13(DEFAULT_WEIGHTS)
      setWeightMode('bag')
      // 清除所有店鋪的庫存 localStorage
      localStorage.removeItem('coffeeBeanInventory_central')
      localStorage.removeItem('coffeeBeanInventory_d7')
      localStorage.removeItem('coffeeBeanInventory_d13')
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
    
    // 輔助函數：處理單一品項的數據
    const processBeanType = (beanType, beanData, categoryName, category = null, subCategory = null) => {
      const location = getBeanLocation(beanType, category, subCategory)
      const storeTotal = calculateTotal(beanData?.store || [])
      const breakRoomTotal = location.breakRoom ? calculateTotal(beanData?.breakRoom || []) : 0
      const dryStorageTotal = location.dryStorage ? calculateTotal(beanData?.dryStorage || []) : 0
      const grandTotal = storeTotal + breakRoomTotal + dryStorageTotal
      
      tableData.push({
        category: categoryName,
        beanType,
        storeTotal,
        breakRoomTotal,
        dryStorageTotal,
        grandTotal,
        hasDryStorage: location.dryStorage
      })
    }
    
    // 手沖豆
    beanTypes.brewing.pourOver.forEach(beanType => {
      const beanData = inventory.brewing.pourOver[beanType]
      processBeanType(beanType, beanData, '出杯豆', 'brewing', 'pourOver')
    })
    
    // 義式豆
    beanTypes.brewing.espresso.forEach(beanType => {
      const beanData = inventory.brewing.espresso[beanType]
      processBeanType(beanType, beanData, '義式豆', 'brewing', 'espresso')
    })
    
    // 賣豆
    beanTypes.retail.forEach(beanType => {
      const beanData = inventory.retail[beanType]
      processBeanType(beanType, beanData, '賣豆', 'retail')
    })
    
    return tableData
  }

  // 獲取店鋪名稱
  const getStoreName = (store) => {
    const storeNames = {
      'central': '中央店',
      'd7': 'D7 店',
      'd13': 'D13 店'
    }
    return storeNames[store] || '中央店'
  }

  // 創建 Minimalist 風格表格 HTML（不帶 logo，純簡潔風格）
  const createMinimalistTableHTML = (store = 'central') => {
    const tableData = createSummaryTable()
    const date = new Date().toLocaleDateString('zh-TW')
    const storeName = getStoreName(store)
    
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
          <div style="text-align: center; margin-bottom: 50px; display: block; width: 100%;">
            <h1 style="color: #1d1d1f; margin: 0 0 12px 0; font-size: 36px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.2; display: block; width: 100%;">咖啡豆盤點表</h1>
            <p style="color: #86868b; margin: 0; font-size: 17px; font-weight: 400; display: block; width: 100%;">${storeName} | 盤點日期：${date}</p>
          </div>
          
          ${Object.entries(groupedData).map(([category, rows]) => {
            const hasAnyDryStorage = rows.some(row => row.hasDryStorage)
            return `
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
                      ${hasAnyDryStorage ? '<th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">乾倉</th>' : ''}
                      <th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">總計</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map((row, index) => `
                      <tr style="background: ${index % 2 === 0 ? '#fafafa' : 'white'};">
                        <td style="padding: 16px 20px; text-align: left; font-weight: 500; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.beanType}</td>
                        <td style="padding: 16px 20px; text-align: center; color: #515154; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.storeTotal}</td>
                        <td style="padding: 16px 20px; text-align: center; color: #515154; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.breakRoomTotal}</td>
                        ${hasAnyDryStorage ? `<td style="padding: 16px 20px; text-align: center; color: #515154; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.hasDryStorage ? (row.dryStorageTotal || 0) : ''}</td>` : ''}
                        <td style="padding: 16px 20px; text-align: center; font-weight: 600; color: #007aff; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.grandTotal}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            </div>
            `
          }).join('')}
        </div>
      </div>
    `
  }

  // 將圖片轉換為 base64（用於匯出）
  const imageToBase64 = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('圖片轉換失敗:', error)
      return null
    }
  }

  // 處理 logo 上傳
  const handleLogoUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // 檢查文件類型
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片文件（PNG、JPG、WebP 等）')
      return
    }

    // 檢查文件大小（限制 5MB，base64 編碼後約 6.7MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('圖片大小不能超過 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result
      setCustomLogoBase64(base64)
      // 上傳後自動切換到自定 Logo 模式
      setExportMode('custom')
      try {
        localStorage.setItem('customExportLogo', base64)
      } catch (error) {
        console.error('保存自訂 logo 失敗:', error)
        alert('保存失敗，可能是存儲空間不足')
      }
    }
    reader.onerror = () => {
      alert('讀取圖片失敗，請重試')
    }
    reader.readAsDataURL(file)
    
    // 重置 input，允許重新選擇相同文件
    event.target.value = ''
  }

  // 移除自訂 logo，恢復預設
  const removeCustomLogo = () => {
    if (confirm('確定要移除自訂 Logo 嗎？')) {
      setCustomLogoBase64(null)
      // 移除後自動切換到 Cat 模式
      if (exportMode === 'custom') {
        setExportMode('cat')
      }
      try {
        localStorage.removeItem('customExportLogo')
      } catch (error) {
        console.error('移除自訂 logo 失敗:', error)
      }
    }
  }

  // 創建 Cat 風格表格 HTML（帶 logo）
  const createCatStyleTableHTML = (logoBase64 = null, store = 'central') => {
    const tableData = createSummaryTable()
    const date = new Date().toLocaleDateString('zh-TW')
    const storeName = getStoreName(store)
    
    // 按分類分組
    const groupedData = {}
    tableData.forEach(row => {
      if (!groupedData[row.category]) {
        groupedData[row.category] = []
      }
      groupedData[row.category].push(row)
    })
    
    const logoUrl = logoBase64 || logoCat
    
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #fafafa; color: #1d1d1f; min-height: 100vh;">
        <div style="background: white; border-radius: 20px; padding: 50px; box-shadow: 0 8px 32px rgba(0,0,0,0.08); position: relative;">
          <!-- Logo 水印背景 -->
          ${logoUrl ? `<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.03; pointer-events: none; background-image: url('${logoUrl}'); background-repeat: repeat; background-size: 200px 200px; background-position: center;"></div>` : ''}
          
          <div style="text-align: center; margin-bottom: 50px; position: relative; z-index: 1;">
            <!-- Logo 和標題 -->
            <div style="display: inline-flex; align-items: center; gap: 16px; margin-bottom: 16px;">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid #e5e5e7; flex-shrink: 0; transform: translateY(16px);" />` : ''}
              <h1 style="color: #1d1d1f; margin: 0; font-size: 36px; font-weight: 600; letter-spacing: -0.5px; line-height: 1;">咖啡豆盤點表</h1>
            </div>
            <p style="color: #86868b; margin: 8px 0 0 0; font-size: 17px; font-weight: 400;">${storeName} | 盤點日期：${date}</p>
          </div>
          
          ${Object.entries(groupedData).map(([category, rows]) => {
            const hasAnyDryStorage = rows.some(row => row.hasDryStorage)
            return `
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
                      ${hasAnyDryStorage ? '<th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">乾倉</th>' : ''}
                      <th style="padding: 0 20px; text-align: center; vertical-align: middle; font-weight: 600; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">總計</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.map((row, index) => `
                      <tr style="background: ${index % 2 === 0 ? '#fafafa' : 'white'};">
                        <td style="padding: 16px 20px; text-align: left; font-weight: 500; color: #1d1d1f; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.beanType}</td>
                        <td style="padding: 16px 20px; text-align: center; color: #515154; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.storeTotal}</td>
                        <td style="padding: 16px 20px; text-align: center; color: #515154; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.breakRoomTotal}</td>
                        ${hasAnyDryStorage ? `<td style="padding: 16px 20px; text-align: center; color: #515154; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.hasDryStorage ? (row.dryStorageTotal || 0) : ''}</td>` : ''}
                        <td style="padding: 16px 20px; text-align: center; font-weight: 600; color: #007aff; font-size: 15px; border-bottom: 1px solid #e5e5e7;">${row.grandTotal}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            `
          }).join('')}
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
      if (exportMode === 'custom') {
        // 自定 Logo 模式：必須使用自訂 logo
        if (!customLogoBase64) {
          alert('請先上傳自訂 Logo')
          return
        }
        htmlContent = createCatStyleTableHTML(customLogoBase64, selectedStore)
      } else if (exportMode === 'cat') {
        // Cat 模式：使用預設 logo
        let logoBase64 = null
        try {
          logoBase64 = await imageToBase64(logoCat)
        } catch (error) {
          console.warn('Logo 轉換失敗，將使用原始路徑:', error)
        }
        htmlContent = createCatStyleTableHTML(logoBase64, selectedStore)
      } else {
        // Minimalist 模式：無 logo
        htmlContent = createMinimalistTableHTML(selectedStore)
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
      
      // Minimalist 模式：移除所有可能的 logo 相關元素和圓形陰影
      if (exportMode === 'minimalist') {
        // 移除所有圖片元素
        const images = tempContainer.querySelectorAll('img')
        images.forEach(img => img.remove())
        
        // 移除所有可能的圓形陰影元素（border-radius: 50% 且可能在標題區域）
        const allElements = tempContainer.querySelectorAll('*')
        allElements.forEach(el => {
          const style = el.style
          const computedStyle = window.getComputedStyle(el)
          
          // 檢查是否是圓形元素且在標題區域
          const isCircular = style.borderRadius === '50%' || 
                            computedStyle.borderRadius === '50%' ||
                            computedStyle.borderRadius?.includes('50%')
          
          if (isCircular) {
            const rect = el.getBoundingClientRect()
            const containerRect = tempContainer.getBoundingClientRect()
            // 如果是標題區域（前 200px）的圓形元素，移除它
            if (rect.top < containerRect.top + 200) {
              el.style.display = 'none'
              el.style.visibility = 'hidden'
            }
          }
        })
      }
      
      const canvas = await html2canvas(tempContainer.firstElementChild, {
        backgroundColor: '#fafafa',
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 900,
        height: tempContainer.firstElementChild.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 900,
        windowHeight: tempContainer.firstElementChild.scrollHeight,
        ignoreElements: (element) => {
          // Minimalist 模式：忽略所有可能的 logo 相關元素
          if (exportMode === 'minimalist') {
            if (element.tagName === 'IMG') return true
            const style = element.style
            const computedStyle = window.getComputedStyle(element)
            const isCircular = style.borderRadius === '50%' || 
                              computedStyle.borderRadius === '50%' ||
                              computedStyle.borderRadius?.includes('50%')
            if (isCircular) {
              const rect = element.getBoundingClientRect()
              const containerRect = tempContainer.getBoundingClientRect()
              return rect.top < containerRect.top + 200
            }
          }
          return false
        }
      })
      
      // 移除臨時容器
      document.body.removeChild(tempContainer)
      
      // 檢查canvas是否有效
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas 渲染失敗')
      }
      
      // 創建下載連結
      const link = document.createElement('a')
      const modeText = exportMode === 'custom' ? '自定Logo' : (exportMode === 'cat' ? 'Cat' : 'Minimalist')
      link.download = `咖啡豆盤點表_${modeText}_${new Date().toLocaleDateString('zh-TW')}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    } catch (error) {
      console.error('匯出圖片失敗:', error)
      alert(`匯出圖片失敗：${error.message}`)
    }
  }



  return (
    <div className="coffee-bean-container container-custom py-4 sm:py-6 md:py-8">
      
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
          <p className="text-gray-400 text-sm sm:text-base font-medium px-4 mb-6 sm:mb-8">所以又到星期天</p>
        </div>

        {/* 分店選擇 - 現代化分段控制器 */}
        <div className="mb-6 sm:mb-7 md:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-5 md:mb-6">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl border border-primary/20">
              <BuildingStorefrontIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-primary">選擇分店</h2>
          </div>
          
          {/* 分段控制器容器 - 簡化設計，優化性能 */}
          <div className="relative mx-auto max-w-2xl bg-surface/60 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-white/10">
            {/* 滑動指示器 - 純 CSS 動畫，極簡實現 */}
            <div
              className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 transition-[transform] duration-200 ease-out"
              style={{
                width: 'calc(33.333% - 4px)',
                left: '4px',
                transform: selectedStore === 'central' ? 'translateX(0%)' :
                          selectedStore === 'd7' ? 'translateX(100%)' :
                          'translateX(200%)'
              }}
            />
            
            {/* 選項按鈕 - 簡化動畫效果 */}
            <div className="relative grid grid-cols-3 gap-1.5">
              {[
                { value: 'central', label: '中央店' },
                { value: 'd7', label: 'D7 店' },
                { value: 'd13', label: 'D13 店' }
              ].map((store) => {
                const isSelected = selectedStore === store.value
                return (
            <button
                    key={store.value}
                    onClick={() => setSelectedStore(store.value)}
                    className={`
                      relative z-10
                      px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5
                      rounded-lg sm:rounded-xl
                      font-bold text-xs sm:text-sm md:text-base
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
                    
                    {/* 選中時的背景效果 - 簡化版本 */}
                    {isSelected && (
                      <div className="absolute inset-0 rounded-xl bg-primary/10 opacity-100" />
                    )}
            </button>
                )
              })}
            </div>
          </div>
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
              <button
            onClick={() => setShowBeanTypesSettings(true)}
            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 hover:from-purple-500/30 hover:to-pink-500/30 hover:border-purple-500/50 transition-all duration-200 flex items-center gap-2"
              >
            <Cog6ToothIcon className="w-4 h-4" />
            品項設定
              </button>
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
              {/* 匯出模式選擇 - 三選一 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-surface/40 rounded-lg border border-white/10">
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="radio"
                    value="cat"
                    checked={exportMode === 'cat'}
                  onChange={(e) => setExportMode(e.target.value)}
                  className="text-blue-400 w-3 h-3"
                />
                  <span>Cat</span>
              </label>
              <div className="w-px h-4 bg-white/20"></div>
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
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
                <label 
                  className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer"
                  onClick={(e) => {
                    if (!customLogoBase64) {
                      // 如果沒有自訂 logo，阻止 radio 選中，觸發文件選擇
                      e.preventDefault()
                      document.getElementById('custom-logo-upload').click()
                    }
                  }}
                >
                <input
                  type="radio"
                    value="custom"
                    checked={exportMode === 'custom'}
                    onChange={(e) => {
                      if (customLogoBase64) {
                        setExportMode('custom')
                      }
                    }}
                    className="text-purple-400 w-3 h-3"
                />
                  <span className={exportMode === 'custom' ? 'text-purple-400' : ''}>自定 Logo</span>
              </label>
            </div>
              
              {/* Logo 預覽和移除（僅在自定 Logo 模式顯示） */}
              {exportMode === 'custom' && customLogoBase64 && (
                <div className="relative flex items-center gap-2 px-3 py-2 bg-surface/40 rounded-lg border border-white/10">
                  <img 
                    src={customLogoBase64} 
                    alt="自訂 Logo" 
                    className="w-6 h-6 rounded-full object-cover border border-white/20"
                  />
                  <button
                    onClick={removeCustomLogo}
                    className="text-xs text-text-secondary hover:text-red-400 transition-colors"
                    title="移除自訂 Logo"
                  >
                    移除
                  </button>
                </div>
              )}
              
              {/* 隱藏的檔案上傳 input */}
              <input
                id="custom-logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              
              {/* 更換 Logo 按鈕（僅在自定 Logo 模式且已有 logo 時顯示） */}
              {exportMode === 'custom' && customLogoBase64 && (
                <label className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-purple-400 hover:from-purple-500/30 hover:to-pink-500/30 hover:border-purple-500/50 transition-all duration-200 flex items-center gap-2 cursor-pointer">
                  <PhotoIcon className="w-4 h-4" />
                  更換 Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            
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
              {beanTypes.brewing.pourOver.map(beanType => {
                const location = getBeanLocation(beanType, 'brewing', 'pourOver')
                const beanData = inventory.brewing.pourOver[beanType]
                
                return (
                  <div key={beanType} className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-xl p-3 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-sm text-primary">{beanType}</h5>
                      <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                    </div>
                    
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

                    {/* 員休室庫存 */}
                    {location.breakRoom && (
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

                    {/* 乾倉 */}
                    {location.dryStorage && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                            乾倉
                          </h6>
                          <button
                            onClick={() => addQuantityField('brewing', 'pourOver', beanType, 'dryStorage')}
                            className="p-1 rounded-lg hover:bg-orange-500/20 text-orange-400 transition-colors"
                          >
                            <PlusIcon className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <div className="space-y-1.5">
                          {(beanData?.dryStorage || ['']).map((quantity, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={quantity}
                                onChange={(e) => updateQuantity('brewing', 'pourOver', beanType, 'dryStorage', index, e.target.value)}
                                placeholder="數量"
                                className="input-field flex-1 text-sm py-1.5 px-2.5 rounded-lg bg-white/5 border-white/10 focus:border-orange-400/50 focus:bg-white/10"
                                inputMode="decimal"
                              />
                              {(beanData?.dryStorage || []).length > 1 && (
                                <button
                                  onClick={() => removeQuantityField('brewing', 'pourOver', beanType, 'dryStorage', index)}
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
              {beanTypes.brewing.espresso.map(beanType => {
                const location = getBeanLocation(beanType, 'brewing', 'espresso')
                const beanData = inventory.brewing.espresso[beanType]
                
                return (
                  <div key={beanType} className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-xl p-3 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-sm text-primary">{beanType}</h5>
                      <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                    </div>
                    
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

                    {/* 員休室庫存 */}
                    {location.breakRoom && (
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

                    {/* 乾倉 */}
                    {location.dryStorage && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                            乾倉
                          </h6>
                          <button
                            onClick={() => addQuantityField('brewing', 'espresso', beanType, 'dryStorage')}
                            className="p-1 rounded-lg hover:bg-orange-500/20 text-orange-400 transition-colors"
                          >
                            <PlusIcon className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <div className="space-y-1.5">
                          {(beanData?.dryStorage || ['']).map((quantity, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={quantity}
                                onChange={(e) => updateQuantity('brewing', 'espresso', beanType, 'dryStorage', index, e.target.value)}
                                placeholder="數量"
                                className="input-field flex-1 text-sm py-1.5 px-2.5 rounded-lg bg-white/5 border-white/10 focus:border-orange-400/50 focus:bg-white/10"
                                inputMode="decimal"
                              />
                              {(beanData?.dryStorage || []).length > 1 && (
                                <button
                                  onClick={() => removeQuantityField('brewing', 'espresso', beanType, 'dryStorage', index)}
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
            {beanTypes.retail.map(beanType => {
              const location = getBeanLocation(beanType, 'retail')
              const beanData = inventory.retail[beanType]
              
              return (
                <div key={beanType} className="bg-gradient-to-br from-surface/60 to-surface/40 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-semibold text-sm text-primary">{beanType}</h5>
                    <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                  </div>
                  
                      {/* 店面庫存 */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                            店面庫存
                          </h6>
                          <button
                            onClick={() => {
                          initializeRetailBeanType(beanType)
                              
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
                              initializeRetailBeanType(beanType)
                                  
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

                  {/* 員休室庫存 */}
                  {location.breakRoom && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                              員休室庫存
                            </h6>
                            <button
                              onClick={() => {
                            initializeRetailBeanType(beanType)
                                
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
                                initializeRetailBeanType(beanType)
                                
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

                  {/* 乾倉 */}
                  {location.dryStorage && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h6 className="text-xs font-medium text-text-secondary flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                          乾倉
                        </h6>
                        <button
                          onClick={() => {
                            initializeRetailBeanType(beanType)
                            
                            // 新增數量欄位
                            setInventory(prev => ({
                              ...prev,
                              retail: {
                                ...prev.retail,
                                [beanType]: {
                                  ...prev.retail[beanType],
                                  dryStorage: [...(prev.retail[beanType]?.dryStorage || ['']), '']
                                }
                                        }
                                      }))
                          }}
                          className="p-1 rounded-lg hover:bg-orange-500/20 text-orange-400 transition-colors"
                        >
                          <PlusIcon className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <div className="space-y-1.5">
                        {(beanData?.dryStorage || ['']).map((quantity, index) => (
                          <div key={index} className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={quantity}
                              onChange={(e) => {
                                initializeRetailBeanType(beanType)
                                    
                                    // 更新數量
                                    setInventory(prev => ({
                                      ...prev,
                                      retail: {
                                        ...prev.retail,
                                        [beanType]: {
                                          ...prev.retail[beanType],
                                      dryStorage: prev.retail[beanType]?.dryStorage?.map((q, i) => 
                                            i === index ? e.target.value : q
                                          ) || ['']
                                        }
                                      }
                                    }))
                                  }}
                                  placeholder="數量"
                              className="input-field flex-1 text-sm py-1.5 px-2.5 rounded-lg bg-white/5 border-white/10 focus:border-orange-400/50 focus:bg-white/10"
                                  inputMode="decimal"
                                />
                            {(beanData?.dryStorage || []).length > 1 && (
                                  <button
                                    onClick={() => {
                                      setInventory(prev => ({
                                        ...prev,
                                        retail: {
                                          ...prev.retail,
                                          [beanType]: {
                                            ...prev.retail[beanType],
                                        dryStorage: prev.retail[beanType]?.dryStorage?.filter((_, i) => i !== index) || ['']
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
                </div>
              )
            })}
          </div>
        </div>
        </div>
      </div>

      {/* 浮動區域指示器 - 可拖動 */}
      <div 
        className={`fixed z-40 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          top: `${indicatorPosition.top}px`,
          right: indicatorPosition.right !== null ? `${indicatorPosition.right}px` : 'auto',
          left: indicatorPosition.left !== null ? `${indicatorPosition.left}px` : 'auto',
          opacity: isDragging ? 0.8 : 1,
          transition: isDragging ? 'none' : 'opacity 0.2s'
        }}
      >
        <div 
          className="bg-surface/90 backdrop-blur-md border border-white/20 rounded-full px-3 py-2 shadow-lg select-none"
          onMouseDown={handleIndicatorDragStart}
          onTouchStart={handleIndicatorDragStart}
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <button 
              onClick={(e) => {
                e.stopPropagation()
                document.getElementById('brewing-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300 pointer-events-auto ${currentSection === 'brewing' ? 'bg-blue-400/20 text-blue-400' : 'text-gray-400 hover:text-blue-300'}`}
            >
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSection === 'brewing' ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
              <span className="text-xs sm:text-sm font-medium">出杯豆</span>
            </button>
            <div className="w-px h-4 bg-gray-600"></div>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                document.getElementById('retail-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300 pointer-events-auto ${currentSection === 'retail' ? 'bg-orange-400/20 text-orange-400' : 'text-gray-400 hover:text-orange-300'}`}
            >
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSection === 'retail' ? 'bg-orange-400' : 'bg-gray-400'}`}></div>
              <span className="text-xs sm:text-sm font-medium">賣豆</span>
            </button>
          </div>
        </div>
      </div>

      {/* 浮動重量換算計算器按鈕 */}
      <button
        onClick={() => setShowWeightCalculator(true)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 text-primary hover:from-primary/30 hover:to-purple-500/30 hover:border-primary/50 transition-all duration-200 rounded-full shadow-lg hover:shadow-xl z-50 hover:scale-110 transform"
      >
        <CalculatorIcon className="w-6 h-6" />
      </button>

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
                    <span className="font-medium">銀袋</span>
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
                    <span className="font-medium">{selectedWeightStore === 'd13' ? 'MUJI 盒子' : 'IKEA 盒子'}</span>
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
                    {weightMode === 'bag' 
                      ? '銀袋重量' 
                      : (selectedWeightStore === 'd13' ? 'MUJI 盒重量' : 'IKEA 盒重量')} (g)
                  </label>
                  <input
                    type="number"
                    value={(() => {
                      const key = weightMode === 'bag' ? 'bagWeight' : (selectedWeightStore === 'd13' ? 'mujiBoxWeight' : 'ikeaBoxWeight')
                      return tempInputValues[key] !== undefined ? tempInputValues[key] : (weightMode === 'bag' ? weightSettings.bagWeight : (selectedWeightStore === 'd13' ? weightSettings.mujiBoxWeight || weightSettings.ikeaBoxWeight : weightSettings.ikeaBoxWeight))
                    })()}
                    onChange={(e) => updateWeightSetting(
                      weightMode === 'bag' ? 'bagWeight' : (selectedWeightStore === 'd13' ? 'mujiBoxWeight' : 'ikeaBoxWeight'), 
                      e.target.value,
                      false
                    )}
                    onBlur={(e) => updateWeightSetting(
                      weightMode === 'bag' ? 'bagWeight' : (selectedWeightStore === 'd13' ? 'mujiBoxWeight' : 'ikeaBoxWeight'), 
                      e.target.value,
                      true
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
                    value={tempInputValues.beanWeightPerPack !== undefined ? tempInputValues.beanWeightPerPack : weightSettings.beanWeightPerPack}
                    onChange={(e) => updateWeightSetting('beanWeightPerPack', e.target.value, false)}
                    onBlur={(e) => updateWeightSetting('beanWeightPerPack', e.target.value, true)}
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-gradient-to-b from-green-400 to-emerald-400 rounded-full"></div>
                <h3 className="text-lg font-bold text-primary">計算結果</h3>
                </div>
                <button
                  onClick={resetCalculations}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-200 flex items-center gap-2"
                  title="重置所有計算結果"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  重置結果
                </button>
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
              
              {/* 總計卡片 - 僅在有多個計算欄位時顯示 */}
              {calculations.length > 1 && (
                <div className="relative group mt-6">
                  {/* 卡片背景光暈 */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-green-400/30 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                  
                  <div className="relative backdrop-blur-xl bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-green-400/20 border-2 border-green-400/40 rounded-2xl p-6 shadow-2xl overflow-hidden">
                    {/* 流動背景效果 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-emerald-500/10 to-green-400/0 opacity-50 animate-gradient bg-[length:200%_100%]"></div>
                    
                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-green-400/30 to-emerald-400/30 border border-green-400/50 shadow-lg">
                          <CalculatorIcon className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-text-secondary mb-1">總計估算包數</h4>
                          <p className="text-xs text-text-secondary/70">所有計算欄位的加總</p>
                        </div>
                      </div>
                      <div className="text-center sm:text-right">
                        <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent mb-1">
                          {calculations.reduce((sum, calc) => sum + (calc.estimatedPacks || 0), 0).toFixed(1)}
                        </div>
                        <div className="text-base font-bold text-green-400">包</div>
                      </div>
            </div>
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      )}

      {/* 品項設定模態視窗 */}
      <BeanTypesSettingsModal
        isOpen={showBeanTypesSettings}
        onClose={() => setShowBeanTypesSettings(false)}
        selectedStore={selectedStore}
      />
      </div>
    </div>
  )
}

export default CoffeeBeanManager 