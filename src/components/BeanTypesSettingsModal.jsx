import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, PlusIcon, TrashIcon, PencilIcon, CheckIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { db } from '../utils/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'

// 預設品項結構
const DEFAULT_BEAN_TYPES = {
  brewing: {
    pourOver: ['水洗', '日曬', '阿寶', '台灣豆', 'Geisha'],
    espresso: ['ESP', '水洗']
  },
  retail: ['水洗', '日曬', '阿寶', '季節', '台灣豆', 'Geisha']
}

// 預設品項位置設定：{ '品項名稱': { store: true/false, breakRoom: true/false } }
const DEFAULT_BEAN_LOCATIONS = {
  '台灣豆': { store: true, breakRoom: false },
  'Geisha': { store: true, breakRoom: false }
}

// 將舊的 storeOnlyBeans 格式轉換為新的 beanLocations 格式
const convertStoreOnlyToLocations = (storeOnlyBeans, allBeanNames) => {
  const locations = {}
  allBeanNames.forEach(beanName => {
    locations[beanName] = {
      store: true,
      breakRoom: !storeOnlyBeans.includes(beanName)
    }
  })
  return locations
}

// 初始化品項位置（如果品項不存在，預設兩個位置都啟用）
const initializeBeanLocation = (beanLocations, beanName) => {
  if (!beanLocations[beanName]) {
    return { store: true, breakRoom: true }
  }
  return beanLocations[beanName]
}

function BeanTypesSettingsModal({ isOpen, onClose, selectedStore = 'central' }) {
  const [beanTypes, setBeanTypes] = useState(DEFAULT_BEAN_TYPES)
  const [beanLocations, setBeanLocations] = useState(DEFAULT_BEAN_LOCATIONS)
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
                setBeanLocations(DEFAULT_BEAN_LOCATIONS)
              }
            } else {
              // 如果文件不存在，創建預設值
              setDoc(doc(db, 'settings', firebaseDocId), {
                beanTypes: DEFAULT_BEAN_TYPES,
                beanLocations: DEFAULT_BEAN_LOCATIONS,
                _lastUpdated: new Date().toISOString()
              }).catch(error => {
                console.error('創建品項設定文件失敗:', error)
              })
              setBeanTypes(DEFAULT_BEAN_TYPES)
              setBeanLocations(DEFAULT_BEAN_LOCATIONS)
            }
            setIsLoading(false)
          },
          (error) => {
            console.error('讀取品項設定錯誤:', error)
            if (isMounted) {
              setIsLoading(false)
              setBeanTypes(DEFAULT_BEAN_TYPES)
              setBeanLocations(DEFAULT_BEAN_LOCATIONS)
            }
          }
        )
      } catch (error) {
        console.error('Firebase 初始化錯誤:', error)
        if (isMounted) {
          setIsLoading(false)
          setBeanTypes(DEFAULT_BEAN_TYPES)
          setBeanLocations(DEFAULT_BEAN_LOCATIONS)
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

  // 滾動鎖定
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${scrollY}px`

      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
        document.body.style.top = ''
        window.scrollTo(0, scrollY)
      }
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

    // 如果名稱改變，需要更新位置設定
    if (oldBeanName !== newBeanName && beanLocations[oldBeanName]) {
      setBeanLocations(prev => {
        const newLocations = { ...prev }
        newLocations[newBeanName] = prev[oldBeanName]
        delete newLocations[oldBeanName]
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

    // 為新品項初始化位置設定（預設兩個位置都啟用）
    if (!beanLocations[newBeanName]) {
      setBeanLocations(prev => ({
        ...prev,
        [newBeanName]: { store: true, breakRoom: true }
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

    // 如果刪除的品項有位置設定，也一併刪除
    if (beanLocations[beanName]) {
      setBeanLocations(prev => {
        const newLocations = { ...prev }
        delete newLocations[beanName]
        return newLocations
      })
    }

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

  // 切換品項位置設定
  const toggleBeanLocation = (beanName, location) => {
    setBeanLocations(prev => {
      const currentLocation = initializeBeanLocation(prev, beanName)
      return {
        ...prev,
        [beanName]: {
          ...currentLocation,
          [location]: !currentLocation[location]
        }
      }
    })
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-surface/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 標題欄 */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold text-primary mb-1">品項設定</h2>
                  <p className="text-sm text-text-secondary">
                    管理咖啡豆品項和分類（{selectedStore === 'central' ? '中央店' : selectedStore === 'd7' ? 'D7 店' : 'D13 店'}）
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* 內容區域 */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-text-secondary">載入中...</div>
                  </div>
                ) : (
                  <>
                    {/* 分類選擇 */}
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-6 bg-gradient-to-b from-primary to-purple-400 rounded-full"></div>
                        <h3 className="text-lg font-bold text-primary">選擇分類</h3>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedCategory('brewing')}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            selectedCategory === 'brewing'
                              ? 'bg-primary/20 text-primary border border-primary/50'
                              : 'bg-surface/40 text-text-secondary border border-white/10 hover:border-primary/30'
                          }`}
                        >
                          出杯豆
                        </button>
                        <button
                          onClick={() => setSelectedCategory('retail')}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            selectedCategory === 'retail'
                              ? 'bg-primary/20 text-primary border border-primary/50'
                              : 'bg-surface/40 text-text-secondary border border-white/10 hover:border-primary/30'
                          }`}
                        >
                          賣豆
                        </button>
                      </div>

                      {selectedCategory === 'brewing' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setSelectedSubCategory('pourOver')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              selectedSubCategory === 'pourOver'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                : 'bg-surface/40 text-text-secondary border border-white/10 hover:border-blue-500/30'
                            }`}
                          >
                            手沖豆
                          </button>
                          <button
                            onClick={() => setSelectedSubCategory('espresso')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              selectedSubCategory === 'espresso'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                : 'bg-surface/40 text-text-secondary border border-white/10 hover:border-purple-500/30'
                            }`}
                          >
                            義式豆
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 品項列表 */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-6 bg-gradient-to-b from-green-400 to-emerald-400 rounded-full"></div>
                          <h3 className="text-lg font-bold text-primary">
                            {selectedCategory === 'brewing'
                              ? selectedSubCategory === 'pourOver'
                                ? '手沖豆品項'
                                : '義式豆品項'
                              : '賣豆品項'}
                          </h3>
                        </div>
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
                            <div
                              key={index}
                              className="flex items-center gap-2 p-3 bg-gradient-to-br from-surface/40 to-surface/20 rounded-xl border border-white/10"
                            >
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
                                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/50 focus:bg-white/10 focus:outline-none text-white"
                                    autoFocus
                                  />
                                  <button
                                    onClick={saveEdit}
                                    className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                                  >
                                    <CheckIcon className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                  >
                                    <XMarkIcon className="w-5 h-5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {/* 排序按鈕 */}
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => moveItem(itemKey, 'up')}
                                      disabled={index === 0}
                                      className="p-1 rounded-lg hover:bg-purple-500/20 text-purple-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                      title="向上移動"
                                    >
                                      <ArrowUpIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => moveItem(itemKey, 'down')}
                                      disabled={index === ((selectedCategory === 'retail'
                                        ? beanTypes.retail
                                        : beanTypes.brewing[selectedSubCategory]
                                      ).length - 1)}
                                      className="p-1 rounded-lg hover:bg-purple-500/20 text-purple-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                      title="向下移動"
                                    >
                                      <ArrowDownIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div className="flex-1 flex items-center gap-3">
                                    <span className="text-primary font-medium">{item}</span>
                                    <div className="flex items-center gap-3">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={initializeBeanLocation(beanLocations, item).store}
                                          onChange={() => toggleBeanLocation(item, 'store')}
                                          className="w-4 h-4 text-blue-400 rounded border-white/20 bg-white/5 focus:ring-blue-400/50"
                                        />
                                        <span className="text-xs text-text-secondary">店面</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={initializeBeanLocation(beanLocations, item).breakRoom}
                                          onChange={() => toggleBeanLocation(item, 'breakRoom')}
                                          className="w-4 h-4 text-green-400 rounded border-white/20 bg-white/5 focus:ring-green-400/50"
                                        />
                                        <span className="text-xs text-text-secondary">員休庫存</span>
                                      </label>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => startEdit(itemKey)}
                                    className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"
                                  >
                                    <PencilIcon className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => deleteItem(itemKey)}
                                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                  >
                                    <TrashIcon className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* 新增品項 */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newItemValue}
                          onChange={(e) => setNewItemValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addItem()
                          }}
                          placeholder="輸入新品項名稱"
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/50 focus:bg-white/10 focus:outline-none text-white placeholder-gray-500"
                        />
                        <button
                          onClick={addItem}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 text-primary hover:from-primary/30 hover:to-purple-500/30 hover:border-primary/50 transition-all duration-200 flex items-center gap-2"
                        >
                          <PlusIcon className="w-5 h-5" />
                          新增
                        </button>
                      </div>
                    </div>

                  </>
                )}
              </div>

              {/* 底部按鈕 */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-surface/40 border border-white/10 text-text-secondary hover:border-white/30 transition-all duration-200"
                >
                  取消
                </button>
                <button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 text-primary hover:from-primary/30 hover:to-purple-500/30 hover:border-primary/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

