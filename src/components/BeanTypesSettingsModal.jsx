import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, PlusIcon, TrashIcon, PencilIcon, CheckIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { db } from '../utils/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useTheme } from '../contexts/ThemeContext'
import { CwButton, CwInput, CwModalFrame } from './studio/ui'

// 預設品項結構
const DEFAULT_BEAN_TYPES = {
  brewing: {
    pourOver: ['水洗', '日曬', '阿寶', '台灣豆', 'Geisha'],
    espresso: ['ESP', '水洗']
  },
  retail: ['水洗', '日曬', '阿寶', '季節', '台灣豆', 'Geisha']
}

// 預設品項位置設定：{ '品項名稱': { store: true/false, breakRoom: true/false, dryStorage: true/false } }
const DEFAULT_BEAN_LOCATIONS = {
  '台灣豆': { store: true, breakRoom: false, dryStorage: false },
  'Geisha': { store: true, breakRoom: false, dryStorage: false }
}

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

// iOS 偵測：關閉 modal 後若還原 body position:fixed 會導致觸控層錯位，故在 iOS 僅用 overflow 鎖定
const isIOS = () => typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

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

// 初始化品項位置（如果品項不存在，根據店鋪設置預設值）
const initializeBeanLocation = (beanLocations, beanName, selectedStore) => {
  if (!beanLocations[beanName]) {
    const dryStorageDefault = selectedStore === 'd7' ? true : false
    return { store: true, breakRoom: true, dryStorage: dryStorageDefault }
  }
  // 確保現有數據包含 dryStorage 屬性（向後兼容）
  return {
    store: beanLocations[beanName].store ?? true,
    breakRoom: beanLocations[beanName].breakRoom ?? true,
    dryStorage: beanLocations[beanName].dryStorage ?? (selectedStore === 'd7' ? true : false)
  }
}

function BeanTypesSettingsModal({ isOpen, onClose, selectedStore = 'central' }) {
  const { isStudio } = useTheme()
  const [beanTypes, setBeanTypes] = useState(DEFAULT_BEAN_TYPES)
  const [beanLocations, setBeanLocations] = useState(getDefaultBeanLocationsForStore(selectedStore))
  const [editingItem, setEditingItem] = useState(null) // { category, subCategory, index } 或 { category, index } 或 'storeOnly'
  const [editValue, setEditValue] = useState('')
  const [newItemValue, setNewItemValue] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('brewing')
  const [selectedSubCategory, setSelectedSubCategory] = useState('pourOver')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 從 Firebase 載入設定（根據選中的店鋪）
  useEffect(() => {
    if (!isOpen) return

    setIsLoading(true)
    let unsubscribe
    let isMounted = true

    const loadSettings = async () => {
      try {
        const firebaseDocId = `coffeeBeanTypes_${selectedStore}`
        unsubscribe = onSnapshot(
          doc(db, 'settings', firebaseDocId),
          (docSnapshot) => {
            if (!isMounted) return

            if (docSnapshot.exists()) {
              const data = docSnapshot.data()
              setBeanTypes(data.beanTypes || DEFAULT_BEAN_TYPES)
              
              // 處理數據遷移：如果存在舊的 storeOnlyBeans，轉換為新的 beanLocations
              if (data.beanLocations) {
                setBeanLocations(data.beanLocations)
              } else if (data.storeOnlyBeans) {
                // 遷移舊格式
                const allBeanNames = new Set()
                const beanTypesData = data.beanTypes || DEFAULT_BEAN_TYPES
                beanTypesData.brewing?.pourOver?.forEach(name => allBeanNames.add(name))
                beanTypesData.brewing?.espresso?.forEach(name => allBeanNames.add(name))
                beanTypesData.retail?.forEach(name => allBeanNames.add(name))
                const converted = convertStoreOnlyToLocations(data.storeOnlyBeans, Array.from(allBeanNames))
                setBeanLocations(converted)
              } else {
                setBeanLocations(getDefaultBeanLocationsForStore(selectedStore))
              }
            } else {
              // 如果文件不存在，創建預設值（根據店鋪設置不同的預設值）
              const defaultBeanLocations = getDefaultBeanLocationsForStore(selectedStore)
              setDoc(doc(db, 'settings', firebaseDocId), {
                beanTypes: DEFAULT_BEAN_TYPES,
                beanLocations: defaultBeanLocations,
                _lastUpdated: new Date().toISOString()
              }).catch(error => {
                console.error('創建品項設定文件失敗:', error)
              })
              setBeanTypes(DEFAULT_BEAN_TYPES)
              setBeanLocations(defaultBeanLocations)
            }
            setIsLoading(false)
          },
          (error) => {
            console.error('讀取品項設定錯誤:', error)
            if (isMounted) {
              setIsLoading(false)
              setBeanTypes(DEFAULT_BEAN_TYPES)
              setBeanLocations(getDefaultBeanLocationsForStore(selectedStore))
            }
          }
        )
      } catch (error) {
        console.error('Firebase 初始化錯誤:', error)
        if (isMounted) {
          setIsLoading(false)
          setBeanTypes(DEFAULT_BEAN_TYPES)
          setBeanLocations(getDefaultBeanLocationsForStore(selectedStore))
        }
      }
    }

    loadSettings()

    return () => {
      isMounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [isOpen, selectedStore])

  // 滾動鎖定：iOS 上不用 body position:fixed，避免關閉後觸控層錯位
  useEffect(() => {
    if (!isOpen) return
    const ios = isIOS()
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    if (!ios) {
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${scrollY}px`
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      if (!ios) requestAnimationFrame(() => { window.scrollTo(0, scrollY) })
    }
  }, [isOpen])

  // 保存設定到 Firebase（根據選中的店鋪）
  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const firebaseDocId = `coffeeBeanTypes_${selectedStore}`
      await setDoc(doc(db, 'settings', firebaseDocId), {
        beanTypes,
        beanLocations,
        _lastUpdated: new Date().toISOString()
      })
      setIsSaving(false)
      onClose()
    } catch (error) {
      console.error('保存品項設定錯誤:', error)
      alert('保存失敗，請稍後再試')
      setIsSaving(false)
    }
  }

  // 開始編輯
  const startEdit = (item) => {
    setEditingItem(item)
    if (item.subCategory) {
      setEditValue(beanTypes[item.category][item.subCategory][item.index])
    } else {
      setEditValue(beanTypes[item.category][item.index])
    }
  }

  // 取消編輯
  const cancelEdit = () => {
    setEditingItem(null)
    setEditValue('')
  }

  // 保存編輯
  const saveEdit = () => {
    if (!editValue.trim()) {
      alert('品項名稱不能為空')
      return
    }

    const oldBeanName = editingItem.subCategory
      ? beanTypes[editingItem.category][editingItem.subCategory][editingItem.index]
      : beanTypes[editingItem.category][editingItem.index]
    const newBeanName = editValue.trim()

    // 如果名稱改變，需要更新位置設定（使用分類鍵）
    if (oldBeanName !== newBeanName) {
      // 計算舊鍵和新鍵
      const oldKey = editingItem.subCategory
        ? `brewing.${editingItem.subCategory}.${oldBeanName}`
        : `retail.${oldBeanName}`
      const newKey = editingItem.subCategory
        ? `brewing.${editingItem.subCategory}.${newBeanName}`
        : `retail.${newBeanName}`
      
      setBeanLocations(prev => {
        const newLocations = { ...prev }
        // 如果舊鍵存在，移動到新鍵
        if (newLocations[oldKey]) {
          newLocations[newKey] = newLocations[oldKey]
          delete newLocations[oldKey]
        }
        // 也處理舊格式（向後兼容）
        if (newLocations[oldBeanName] && !newLocations[newKey]) {
          newLocations[newKey] = newLocations[oldBeanName]
          delete newLocations[oldBeanName]
        }
        return newLocations
      })
    }

    const newBeanTypes = { ...beanTypes }

    if (editingItem.subCategory) {
      // 編輯子分類中的品項
      newBeanTypes[editingItem.category][editingItem.subCategory] = [
        ...newBeanTypes[editingItem.category][editingItem.subCategory]
      ]
      newBeanTypes[editingItem.category][editingItem.subCategory][editingItem.index] = newBeanName
    } else {
      // 編輯主分類中的品項（retail）
      newBeanTypes[editingItem.category] = [...newBeanTypes[editingItem.category]]
      newBeanTypes[editingItem.category][editingItem.index] = newBeanName
    }

    setBeanTypes(newBeanTypes)
    cancelEdit()
  }

  // 新增品項
  const addItem = () => {
    if (!newItemValue.trim()) {
      alert('品項名稱不能為空')
      return
    }

    const newBeanTypes = { ...beanTypes }
    const newBeanName = newItemValue.trim()

    if (selectedCategory === 'retail') {
      newBeanTypes.retail = [...newBeanTypes.retail, newBeanName]
    } else {
      newBeanTypes.brewing[selectedSubCategory] = [
        ...newBeanTypes.brewing[selectedSubCategory],
        newBeanName
      ]
    }

    // 為新品項初始化位置設定（根據店鋪設置不同的預設值，使用分類鍵）
    const newBeanKey = getBeanKey(newBeanName)
    if (!beanLocations[newBeanKey] && !beanLocations[newBeanName]) {
      const dryStorageDefault = selectedStore === 'd7' ? true : false
      setBeanLocations(prev => ({
        ...prev,
        [newBeanKey]: { store: true, breakRoom: true, dryStorage: dryStorageDefault }
      }))
    }

    setBeanTypes(newBeanTypes)
    setNewItemValue('')
  }

  // 刪除品項
  const deleteItem = (item) => {
    const beanName = item.subCategory 
      ? beanTypes[item.category][item.subCategory][item.index]
      : beanTypes[item.category][item.index]
    
    if (!confirm(`確定要刪除「${beanName}」嗎？`)) {
      return
    }

    const newBeanTypes = { ...beanTypes }

    if (item.subCategory) {
      newBeanTypes[item.category][item.subCategory] = newBeanTypes[item.category][item.subCategory].filter(
        (_, i) => i !== item.index
      )
    } else {
      newBeanTypes[item.category] = newBeanTypes[item.category].filter((_, i) => i !== item.index)
    }

    // 如果刪除的品項有位置設定，也一併刪除（使用分類鍵和舊格式）
    const beanKey = getBeanKey(beanName)
    setBeanLocations(prev => {
      const newLocations = { ...prev }
      if (newLocations[beanKey]) {
        delete newLocations[beanKey]
      }
      // 也刪除舊格式（向後兼容）
      if (newLocations[beanName]) {
        delete newLocations[beanName]
      }
      return newLocations
    })

    setBeanTypes(newBeanTypes)
  }

  // 移動品項順序
  const moveItem = (item, direction) => {
    const newBeanTypes = {
      ...beanTypes,
      brewing: {
        ...beanTypes.brewing,
        pourOver: [...beanTypes.brewing.pourOver],
        espresso: [...beanTypes.brewing.espresso]
      },
      retail: [...beanTypes.retail]
    }
    
    const newIndex = direction === 'up' ? item.index - 1 : item.index + 1
    const currentList = item.subCategory
      ? newBeanTypes[item.category][item.subCategory]
      : newBeanTypes[item.category]
    
    // 檢查邊界
    if (newIndex < 0 || newIndex >= currentList.length) return
    
    // 交換位置
    const temp = currentList[item.index]
    currentList[item.index] = currentList[newIndex]
    currentList[newIndex] = temp
    
    setBeanTypes(newBeanTypes)
  }

  // 獲取品項的完整鍵（包含分類信息）
  const getBeanKey = (beanName) => {
    if (selectedCategory === 'retail') {
      return `retail.${beanName}`
    } else {
      return `brewing.${selectedSubCategory}.${beanName}`
    }
  }

  // 從 beanLocations 中獲取指定品項的位置設定（支援分類區分）
  const getLocationForBean = (beanName) => {
    const beanKey = getBeanKey(beanName)
    // 先嘗試使用分類鍵（新格式）
    if (beanLocations[beanKey]) {
      return beanLocations[beanKey]
    }
    // 如果不存在，嘗試舊格式（向後兼容）
    if (beanLocations[beanName]) {
      return beanLocations[beanName]
    }
    // 如果都不存在，返回預設值
    const dryStorageDefault = selectedStore === 'd7' ? true : false
    return { store: true, breakRoom: true, dryStorage: dryStorageDefault }
  }

  // 切換品項位置設定（使用分類鍵）
  const toggleBeanLocation = (beanName, location) => {
    setBeanLocations(prev => {
      const beanKey = getBeanKey(beanName)
      const currentLocation = getLocationForBean(beanName)
      return {
        ...prev,
        [beanKey]: {
          ...currentLocation,
          [location]: !currentLocation[location]
        }
      }
    })
  }

  // 獲取當前選中分類的所有品項名稱
  const getCurrentBeanNames = () => {
    if (selectedCategory === 'retail') {
      return beanTypes.retail || []
    } else {
      return beanTypes.brewing[selectedSubCategory] || []
    }
  }

  // 檢查指定位置是否全部開啟
  const areAllLocationsEnabled = (location) => {
    const beanNames = getCurrentBeanNames()
    if (beanNames.length === 0) return false
    return beanNames.every(beanName => {
      const loc = getLocationForBean(beanName)
      return loc[location] === true
    })
  }

  // 一鍵切換所有品項的位置設定（只影響當前分類）
  const toggleAllLocations = (location) => {
    const beanNames = getCurrentBeanNames()
    const allEnabled = areAllLocationsEnabled(location)
    const newValue = !allEnabled

    setBeanLocations(prev => {
      const updated = { ...prev }
      beanNames.forEach(beanName => {
        const beanKey = getBeanKey(beanName)
        const currentLocation = getLocationForBean(beanName)
        // 使用分類鍵存儲，確保不同分類的設定分開
        updated[beanKey] = {
          ...currentLocation,
          [location]: newValue
        }
      })
      return updated
    })
  }

  const storeLabel = selectedStore === 'central' ? '中央店' : selectedStore === 'd7' ? 'D7 店' : 'D13 店'
  const itemRowClass = isStudio
    ? 'flex items-center gap-2 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] p-3'
    : 'flex items-center gap-2 rounded-xl border border-white/10 bg-gradient-to-br from-surface/40 to-surface/20 p-3'
  const studioCheckboxClass =
    'h-4 w-4 shrink-0 rounded border-[var(--cw-border)] bg-[var(--cw-bg)] text-[var(--cw-text)] focus:ring-[var(--cw-focus-ring)]'
  const locLabelClass = isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'


  const renderBody = () => (
    <>
      {isLoading ? (
      <div className="flex items-center justify-center py-12">
        <div className={isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}>載入中...</div>
      </div>
    ) : (
      <>
        {/* 分類選擇 */}
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-3">
            <div
              className={
                isStudio
                  ? 'h-6 w-1 rounded-full bg-[var(--cw-text)]'
                  : 'h-6 w-1 rounded-full bg-gradient-to-b from-primary to-purple-400'
              }
            />
            <h3 className={`text-lg font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>選擇分類</h3>
          </div>
          {isStudio ? (
            <div className="flex flex-wrap gap-2">
              <CwButton
                type="button"
                variant={selectedCategory === 'brewing' ? 'primary' : 'secondary'}
                className="min-h-11"
                onClick={() => setSelectedCategory('brewing')}
              >
                出杯豆
              </CwButton>
              <CwButton
                type="button"
                variant={selectedCategory === 'retail' ? 'primary' : 'secondary'}
                className="min-h-11"
                onClick={() => setSelectedCategory('retail')}
              >
                賣豆
              </CwButton>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('brewing')}
                className={`rounded-lg px-4 py-2 font-medium transition-all ${
                  selectedCategory === 'brewing'
                    ? 'border border-primary/50 bg-primary/20 text-primary'
                    : 'border border-white/10 bg-surface/40 text-text-secondary hover:border-primary/30'
                }`}
              >
                出杯豆
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('retail')}
                className={`rounded-lg px-4 py-2 font-medium transition-all ${
                  selectedCategory === 'retail'
                    ? 'border border-primary/50 bg-primary/20 text-primary'
                    : 'border border-white/10 bg-surface/40 text-text-secondary hover:border-primary/30'
                }`}
              >
                賣豆
              </button>
            </div>
          )}
    
          {selectedCategory === 'brewing' &&
            (isStudio ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <CwButton
                  type="button"
                  variant={selectedSubCategory === 'pourOver' ? 'primary' : 'secondary'}
                  className="min-h-11"
                  onClick={() => setSelectedSubCategory('pourOver')}
                >
                  手沖豆
                </CwButton>
                <CwButton
                  type="button"
                  variant={selectedSubCategory === 'espresso' ? 'primary' : 'secondary'}
                  className="min-h-11"
                  onClick={() => setSelectedSubCategory('espresso')}
                >
                  義式豆
                </CwButton>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubCategory('pourOver')}
                  className={`rounded-lg px-4 py-2 font-medium transition-all ${
                    selectedSubCategory === 'pourOver'
                      ? 'border border-blue-500/50 bg-blue-500/20 text-blue-400'
                      : 'border border-white/10 bg-surface/40 text-text-secondary hover:border-blue-500/30'
                  }`}
                >
                  手沖豆
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubCategory('espresso')}
                  className={`rounded-lg px-4 py-2 font-medium transition-all ${
                    selectedSubCategory === 'espresso'
                      ? 'border border-purple-500/50 bg-purple-500/20 text-purple-400'
                      : 'border border-white/10 bg-surface/40 text-text-secondary hover:border-purple-500/30'
                  }`}
                >
                  義式豆
                </button>
              </div>
            ))}
        </div>
    
        {/* 品項列表 */}
        <div className="mb-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={
                  isStudio
                    ? 'h-6 w-1 rounded-full bg-emerald-500/80'
                    : 'h-6 w-1 rounded-full bg-gradient-to-b from-green-400 to-emerald-400'
                }
              />
              <h3 className={`text-lg font-bold ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>
                {selectedCategory === 'brewing'
                  ? selectedSubCategory === 'pourOver'
                    ? '手沖豆品項'
                    : '義式豆品項'
                  : '賣豆品項'}
              </h3>
            </div>
            {/* 一鍵全開/全關按鈕 */}
            {isStudio ? (
              <div className="flex flex-wrap items-center gap-2">
                <CwButton
                  type="button"
                  variant={areAllLocationsEnabled('store') ? 'primary' : 'secondary'}
                  className="!min-h-9 !gap-1.5 !px-3 !py-1.5 !text-xs"
                  title={areAllLocationsEnabled('store') ? '一鍵全關店面' : '一鍵全開店面'}
                  onClick={() => toggleAllLocations('store')}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${areAllLocationsEnabled('store') ? 'bg-[var(--cw-text)]' : 'bg-[var(--cw-text-muted)]'}`}
                  />
                  全{areAllLocationsEnabled('store') ? '關' : '開'}店面
                </CwButton>
                <CwButton
                  type="button"
                  variant={areAllLocationsEnabled('breakRoom') ? 'primary' : 'secondary'}
                  className="!min-h-9 !gap-1.5 !px-3 !py-1.5 !text-xs"
                  title={areAllLocationsEnabled('breakRoom') ? '一鍵全關員休庫存' : '一鍵全開員休庫存'}
                  onClick={() => toggleAllLocations('breakRoom')}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${areAllLocationsEnabled('breakRoom') ? 'bg-[var(--cw-text)]' : 'bg-[var(--cw-text-muted)]'}`}
                  />
                  全{areAllLocationsEnabled('breakRoom') ? '關' : '開'}員休庫存
                </CwButton>
                <CwButton
                  type="button"
                  variant={areAllLocationsEnabled('dryStorage') ? 'primary' : 'secondary'}
                  className="!min-h-9 !gap-1.5 !px-3 !py-1.5 !text-xs"
                  title={areAllLocationsEnabled('dryStorage') ? '一鍵全關乾倉' : '一鍵全開乾倉'}
                  onClick={() => toggleAllLocations('dryStorage')}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${areAllLocationsEnabled('dryStorage') ? 'bg-[var(--cw-text)]' : 'bg-[var(--cw-text-muted)]'}`}
                  />
                  全{areAllLocationsEnabled('dryStorage') ? '關' : '開'}乾倉
                </CwButton>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleAllLocations('store')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    areAllLocationsEnabled('store')
                      ? 'border border-blue-500/50 bg-blue-500/20 text-blue-400'
                      : 'border border-white/10 bg-surface/40 text-text-secondary hover:border-blue-500/30'
                  }`}
                  title={areAllLocationsEnabled('store') ? '一鍵全關店面' : '一鍵全開店面'}
                >
                  <span className={`h-2 w-2 rounded-full ${areAllLocationsEnabled('store') ? 'bg-blue-400' : 'bg-gray-400'}`} />
                  <span>全{areAllLocationsEnabled('store') ? '關' : '開'}店面</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllLocations('breakRoom')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    areAllLocationsEnabled('breakRoom')
                      ? 'border border-green-500/50 bg-green-500/20 text-green-400'
                      : 'border border-white/10 bg-surface/40 text-text-secondary hover:border-green-500/30'
                  }`}
                  title={areAllLocationsEnabled('breakRoom') ? '一鍵全關員休庫存' : '一鍵全開員休庫存'}
                >
                  <span className={`h-2 w-2 rounded-full ${areAllLocationsEnabled('breakRoom') ? 'bg-green-400' : 'bg-gray-400'}`} />
                  <span>全{areAllLocationsEnabled('breakRoom') ? '關' : '開'}員休庫存</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllLocations('dryStorage')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    areAllLocationsEnabled('dryStorage')
                      ? 'border border-orange-500/50 bg-orange-500/20 text-orange-400'
                      : 'border border-white/10 bg-surface/40 text-text-secondary hover:border-orange-500/30'
                  }`}
                  title={areAllLocationsEnabled('dryStorage') ? '一鍵全關乾倉' : '一鍵全開乾倉'}
                >
                  <span className={`h-2 w-2 rounded-full ${areAllLocationsEnabled('dryStorage') ? 'bg-orange-400' : 'bg-gray-400'}`} />
                  <span>全{areAllLocationsEnabled('dryStorage') ? '關' : '開'}乾倉</span>
                </button>
              </div>
            )}
          </div>
    
          <div className="space-y-2 mb-4">
            {(selectedCategory === 'retail'
              ? beanTypes.retail
              : beanTypes.brewing[selectedSubCategory]
            ).map((item, index) => {
              const itemKey = selectedCategory === 'retail'
                ? { category: selectedCategory, index }
                : { category: selectedCategory, subCategory: selectedSubCategory, index }
              const isEditing = editingItem && JSON.stringify(editingItem) === JSON.stringify(itemKey)
    
              return (
                <div key={index} className={itemRowClass}>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className={
                          isStudio
                            ? 'min-w-0 flex-1 rounded-[var(--cw-radius)] border border-[var(--cw-border)] bg-[var(--cw-bg)] px-3 py-2 text-sm text-[var(--cw-text)] focus:border-[var(--cw-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-focus-ring)]'
                            : 'flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-primary/50 focus:bg-white/10 focus:outline-none'
                        }
                        autoFocus
                      />
                      {isStudio ? (
                        <>
                          <CwButton type="button" variant="secondary" className="!min-h-10 !p-2" onClick={saveEdit} aria-label="儲存">
                            <CheckIcon className="h-5 w-5 text-emerald-500" />
                          </CwButton>
                          <CwButton type="button" variant="ghost" className="!min-h-10 !p-2" onClick={cancelEdit} aria-label="取消">
                            <XMarkIcon className="h-5 w-5" />
                          </CwButton>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={saveEdit} className="rounded-lg p-2 text-green-400 transition-colors hover:bg-green-500/20">
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button type="button" onClick={cancelEdit} className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/20">
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1">
                        {isStudio ? (
                          <>
                            <CwButton
                              type="button"
                              variant="ghost"
                              className="!min-h-8 !p-1"
                              disabled={index === 0}
                              title="向上移動"
                              onClick={() => moveItem(itemKey, 'up')}
                            >
                              <ArrowUpIcon className="h-4 w-4" />
                            </CwButton>
                            <CwButton
                              type="button"
                              variant="ghost"
                              className="!min-h-8 !p-1"
                              disabled={
                                index ===
                                (selectedCategory === 'retail' ? beanTypes.retail : beanTypes.brewing[selectedSubCategory]).length - 1
                              }
                              title="向下移動"
                              onClick={() => moveItem(itemKey, 'down')}
                            >
                              <ArrowDownIcon className="h-4 w-4" />
                            </CwButton>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => moveItem(itemKey, 'up')}
                              disabled={index === 0}
                              className="rounded-lg p-1 text-purple-400 transition-colors hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                              title="向上移動"
                            >
                              <ArrowUpIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(itemKey, 'down')}
                              disabled={
                                index ===
                                (selectedCategory === 'retail' ? beanTypes.retail : beanTypes.brewing[selectedSubCategory]).length - 1
                              }
                              className="rounded-lg p-1 text-purple-400 transition-colors hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                              title="向下移動"
                            >
                              <ArrowDownIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <span className={`shrink-0 font-medium ${isStudio ? 'text-[var(--cw-text)]' : 'text-primary'}`}>{item}</span>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={getLocationForBean(item).store}
                              onChange={() => toggleBeanLocation(item, 'store')}
                              className={
                                isStudio
                                  ? studioCheckboxClass
                                  : 'h-4 w-4 rounded border-white/20 bg-white/5 text-blue-400 focus:ring-blue-400/50'
                              }
                            />
                            <span className={`text-xs ${locLabelClass}`}>店面</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={getLocationForBean(item).breakRoom}
                              onChange={() => toggleBeanLocation(item, 'breakRoom')}
                              className={
                                isStudio
                                  ? studioCheckboxClass
                                  : 'h-4 w-4 rounded border-white/20 bg-white/5 text-green-400 focus:ring-green-400/50'
                              }
                            />
                            <span className={`text-xs ${locLabelClass}`}>員休庫存</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={getLocationForBean(item).dryStorage}
                              onChange={() => toggleBeanLocation(item, 'dryStorage')}
                              className={
                                isStudio
                                  ? studioCheckboxClass
                                  : 'h-4 w-4 rounded border-white/20 bg-white/5 text-orange-400 focus:ring-orange-400/50'
                              }
                            />
                            <span className={`text-xs ${locLabelClass}`}>乾倉</span>
                          </label>
                        </div>
                      </div>
                      {isStudio ? (
                        <>
                          <CwButton type="button" variant="ghost" className="!min-h-10 !p-2" onClick={() => startEdit(itemKey)} aria-label="編輯">
                            <PencilIcon className="h-5 w-5" />
                          </CwButton>
                          <CwButton type="button" variant="ghost" className="!min-h-10 !p-2" onClick={() => deleteItem(itemKey)} aria-label="刪除">
                            <TrashIcon className="h-5 w-5 text-red-500/90" />
                          </CwButton>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(itemKey)}
                            className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-500/20"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(itemKey)}
                            className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/20"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
    
          {/* 新增品項 */}
          {isStudio ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <CwInput
                className="min-w-0 flex-1"
                value={newItemValue}
                onChange={(e) => setNewItemValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem()
                }}
                placeholder="輸入新品項名稱"
              />
              <CwButton type="button" variant="primary" className="w-full shrink-0 sm:w-auto" onClick={addItem}>
                <PlusIcon className="h-5 w-5" />
                新增
              </CwButton>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemValue}
                onChange={(e) => setNewItemValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem()
                }}
                placeholder="輸入新品項名稱"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-primary/50 focus:bg-white/10 focus:outline-none"
              />
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/20 to-purple-500/20 px-4 py-2 text-primary transition-all duration-200 hover:border-primary/50 hover:from-primary/30 hover:to-purple-500/30"
              >
                <PlusIcon className="h-5 w-5" />
                新增
              </button>
            </div>
          )}
        </div>
    
      </>
    )}
    </>
  )

  if (isStudio) {
    return (
      <CwModalFrame
        open={isOpen}
        onClose={onClose}
        title="品項設定"
        description={`管理咖啡豆品項和分類（${storeLabel}）`}
        headerActions={
          <CwButton type="button" variant="ghost" className="!min-h-11 !p-2" onClick={onClose} aria-label="關閉">
            <XMarkIcon className="h-6 w-6" />
          </CwButton>
        }
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <CwButton type="button" variant="secondary" onClick={onClose}>
              取消
            </CwButton>
            <CwButton type="button" variant="primary" onClick={saveSettings} disabled={isSaving}>
              {isSaving ? '儲存中...' : '儲存設定'}
            </CwButton>
          </div>
        }
        zOverlay={10001}
        maxWidthClass="max-w-4xl"
        contentMaxHeightClass="max-h-[min(78dvh,720px)]"
      >
        {renderBody()}
      </CwModalFrame>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <div className="pointer-events-none fixed inset-0 z-[10001] flex items-center justify-center p-4 py-10 sm:py-14">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="pointer-events-auto relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-surface/95 shadow-2xl backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 標題欄 */}
              <div className="flex items-center justify-between border-b border-white/10 p-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold text-primary">品項設定</h2>
                  <p className="text-sm text-text-secondary">管理咖啡豆品項和分類（{storeLabel}）</p>
                </div>
                <button type="button" onClick={onClose} className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/20">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* 內容區域 */}
              <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6 [-webkit-overflow-scrolling:touch]">
                {renderBody()}
              </div>

              {/* 底部按鈕 */}
              <div className="flex items-center justify-end gap-3 border-t border-white/10 p-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/10 bg-surface/40 px-4 py-2 text-text-secondary transition-all duration-200 hover:border-white/30"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/20 to-purple-500/20 px-4 py-2 text-primary transition-all duration-200 hover:border-primary/50 hover:from-primary/30 hover:to-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? '儲存中...' : '儲存設定'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default BeanTypesSettingsModal

