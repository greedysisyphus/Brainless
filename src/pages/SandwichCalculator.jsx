import { useState, useEffect } from 'react'
import { db } from '../utils/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { 
  Cog6ToothIcon, 
  CalculatorIcon, 
  ChartBarIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

function SandwichCalculator() {
  const [settings, setSettings] = useState({
    breadPerBag: 8,
    targetHam: 60,
    targetSalami: 30
  })
  
  const [values, setValues] = useState({
    existingHam: '',
    existingSalami: '',
    extraBags: 0,
    distribution: 'even'
  })
  
  const [showSettings, setShowSettings] = useState(false)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  // 更新 Firebase 設定
  const updateSettings = async (newSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'sandwich'), newSettings)
    } catch (error) {
      console.error('更新設定錯誤:', error)
      // 如果 Firebase 更新失敗，只更新本地狀態
      setSettings(newSettings)
      setError('無法同步到 Firebase，設定已保存到本地')
    }
  }

  const calculate = () => {
    const { breadPerBag, targetHam, targetSalami } = settings
    const { existingHam, existingSalami, extraBags, distribution } = values
    
    let totalHamNeeded = targetHam - (parseInt(existingHam) || 0)
    let totalSalamiNeeded = targetSalami - (parseInt(existingSalami) || 0)
    let totalNeeded = totalHamNeeded + totalSalamiNeeded
    let bagsNeeded = Math.ceil(totalNeeded / breadPerBag) + parseInt(extraBags)
    
    let extraSlices = bagsNeeded * breadPerBag - totalNeeded
    let extraHam = 0
    let extraSalami = 0
    
    switch(distribution) {
      case 'even':
        extraHam = Math.floor(extraSlices / 2)
        extraSalami = extraSlices - extraHam
        break
      case 'ham':
        extraHam = extraSlices
        break
      case 'salami':
        extraSalami = extraSlices
        break
    }
    
    totalHamNeeded += extraHam
    totalSalamiNeeded += extraSalami
    
    setResults({
      totalHamNeeded,
      totalSalamiNeeded,
      bagsNeeded,
      totalTarget: targetHam + targetSalami,
      totalExisting: (parseInt(existingHam) || 0) + (parseInt(existingSalami) || 0)
    })
  }

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
    { value: 'even', label: '平均分配' },
    { value: 'ham', label: '優先火腿' },
    { value: 'salami', label: '優先臘腸' }
  ]
  
  return (
    <div className="container-custom py-8">
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            三明治計算器
          </h1>
          <p className="text-text-secondary">選擇拉奶，選擇成功</p>
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
                  <h2 className="text-lg sm:text-xl font-bold text-primary">計算輸入</h2>
                  <p className="text-xs sm:text-sm text-text-secondary">輸入現有數量</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary transition-all duration-200 hover:scale-110"
                title="基本設定"
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
                                 <div>
                   <label className="block text-sm text-text-secondary mb-2">
                     現有的火腿三明治
                   </label>
                  <input
                    type="number"
                    className="input-field w-full"
                    placeholder="請輸入數量"
                    value={values.existingHam}
                    onChange={e => setValues({
                      ...values,
                      existingHam: e.target.value
                    })}
                  />
                </div>

                                 <div>
                   <label className="block text-sm text-text-secondary mb-2">
                     現有的臘腸三明治
                   </label>
                  <input
                    type="number"
                    className="input-field w-full"
                    placeholder="請輸入數量"
                    value={values.existingSalami}
                    onChange={e => setValues({
                      ...values,
                      existingSalami: e.target.value
                    })}
                  />
                </div>

                                 <div>
                   <label className="block text-sm text-text-secondary mb-2">
                     分配方式
                   </label>
                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                   {distributionMethods.map((method) => (
                     <button
                       key={method.value}
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
                     額外需要的麵包包數：{values.extraBags}
                   </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={values.extraBags}
                      onChange={e => setValues({
                        ...values,
                        extraBags: parseInt(e.target.value)
                      })}
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
                    <div className="flex justify-between text-xs text-text-secondary mt-2 px-1">
                      <span>0</span>
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                      <span>5</span>
                    </div>
                  </div>
                </div>

                                 <div className="space-y-3 pt-4">
                   <button 
                     onClick={calculate}
                     className="btn-primary w-full py-3 sm:py-4 text-sm sm:text-base"
                   >
                     計算結果
                   </button>
                   <button 
                     onClick={resetFields}
                     className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/5 hover:bg-white/10 
                              text-text-secondary rounded-lg transition-all duration-200 text-sm sm:text-base"
                   >
                     重設輸入
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
                <h2 className="text-lg sm:text-xl font-bold text-primary">計算結果</h2>
                <p className="text-xs sm:text-sm text-text-secondary">製作需求總覽</p>
              </div>
            </div>

            {results ? (
              <div className="space-y-4 animate-fade-in">
                                                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/30">
                   <div className="mb-2">
                     <span className="text-sm text-text-secondary font-medium">需製作的火腿三明治</span>
                   </div>
                   <div className="text-xl sm:text-2xl font-bold text-white">{results.totalHamNeeded} 個</div>
                 </div>
                 
                 <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/30">
                   <div className="mb-2">
                     <span className="text-sm text-text-secondary font-medium">需製作的臘腸三明治</span>
                   </div>
                   <div className="text-xl sm:text-2xl font-bold text-white">{results.totalSalamiNeeded} 個</div>
                 </div>
                 
                 <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/30">
                   <div className="mb-2">
                     <span className="text-sm text-text-secondary font-medium">需要的麵包數量</span>
                   </div>
                   <div className="text-xl sm:text-2xl font-bold text-white">{results.bagsNeeded} 包</div>
                 </div>

                 <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/30">
                   <div className="mb-2">
                     <span className="text-sm text-text-secondary font-medium">總計需求</span>
                   </div>
                   <div className="text-lg sm:text-xl font-bold text-white">
                     {results.totalHamNeeded + results.totalSalamiNeeded} 個三明治
                   </div>
                 </div>
              </div>
            ) : (
              <div className="text-center py-12 text-text-secondary">
                <CalculatorIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>點擊計算按鈕查看結果</p>
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
                  <h2 className="text-xl font-bold text-primary">基本設定</h2>
                  <p className="text-sm text-text-secondary">調整計算參數</p>
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
                    每包麵包的數量
                  </label>
                  <input
                    type="number"
                    className="input-field w-full"
                    value={settings.breadPerBag}
                    onChange={e => {
                      const newSettings = {
                        ...settings,
                        breadPerBag: parseInt(e.target.value)
                      }
                      setSettings(newSettings)
                      updateSettings(newSettings)
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    目標火腿三明治數量
                  </label>
                  <input
                    type="number"
                    className="input-field w-full"
                    value={settings.targetHam}
                    onChange={e => {
                      const newSettings = {
                        ...settings,
                        targetHam: parseInt(e.target.value)
                      }
                      setSettings(newSettings)
                      updateSettings(newSettings)
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    目標臘腸三明治數量
                  </label>
                  <input
                    type="number"
                    className="input-field w-full"
                    value={settings.targetSalami}
                    onChange={e => {
                      const newSettings = {
                        ...settings,
                        targetSalami: parseInt(e.target.value)
                      }
                      setSettings(newSettings)
                      updateSettings(newSettings)
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                               <button 
                 className="flex-1 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                 onClick={() => setShowSettings(false)}
               >
                 完成設定
               </button>
                <button 
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary rounded-lg transition-colors"
                  onClick={() => setShowSettings(false)}
                >
                  取消
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