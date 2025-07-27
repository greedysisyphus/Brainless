import { useState, useEffect } from 'react'
import { db } from '../utils/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'

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
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'sandwich'),
      (doc) => {
        if (doc.exists()) {
          setSettings(doc.data())
        } else {
          // 如果文件不存在，創建預設值
          setDoc(doc.ref, settings)
        }
        setLoading(false)
      },
      (error) => {
        console.error('讀取設定錯誤:', error)
        setError('無法讀取設定')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // 更新 Firebase 設定
  const updateSettings = async (newSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'sandwich'), newSettings)
    } catch (error) {
      console.error('更新設定錯誤:', error)
      setError('無法更新設定')
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
      bagsNeeded
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
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-surface rounded-2xl p-6 shadow-xl">
          <div className="header">
            <h1 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              三明治計算器
            </h1>
          </div>

          <button 
            className="btn-primary w-full mb-6"
            onClick={() => setShowSettings(!showSettings)}
          >
            設定
          </button>

          {showSettings && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 gap-4">
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
              <button 
                className="btn-primary w-full"
                onClick={() => setShowSettings(false)}
              >
                確認設定
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">
              {error}
            </div>
          ) : (
            <div className="space-y-4 mb-6">
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
                <div className="flex gap-2">
                  {distributionMethods.map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setValues({
                        ...values,
                        distribution: method.value
                      })}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        values.distribution === method.value
                          ? 'bg-primary text-white'
                          : 'bg-white/5 hover:bg-white/10 text-text-secondary'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  額外需要的麵包包數：{values.extraBags}
                </label>
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
                  className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer
                             touch-manipulation
                             [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:w-6
                             [&::-webkit-slider-thumb]:h-6
                             [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:bg-primary
                             [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-webkit-slider-thumb]:hover:bg-primary/80
                             [&::-webkit-slider-thumb]:transition-colors
                             [&::-moz-range-thumb]:appearance-none
                             [&::-moz-range-thumb]:border-0
                             [&::-moz-range-thumb]:w-6
                             [&::-moz-range-thumb]:h-6
                             [&::-moz-range-thumb]:rounded-full
                             [&::-moz-range-thumb]:bg-primary
                             [&::-moz-range-thumb]:cursor-pointer
                             [&::-moz-range-thumb]:hover:bg-primary/80
                             [&::-moz-range-thumb]:transition-colors
                             [&::-ms-thumb]:appearance-none
                             [&::-ms-thumb]:w-6
                             [&::-ms-thumb]:h-6
                             [&::-ms-thumb]:rounded-full
                             [&::-ms-thumb]:bg-primary
                             [&::-ms-thumb]:cursor-pointer
                             [&::-ms-thumb]:hover:bg-primary/80
                             [&::-ms-thumb]:transition-colors"
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
          )}

          <div className="space-y-4">
            <button 
              onClick={calculate}
              className="btn-primary w-full"
            >
              計算
            </button>
            <button 
              onClick={resetFields}
              className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 
                       text-text-secondary rounded-lg transition-colors"
            >
              重設
            </button>
          </div>

          {results && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-sm text-text-secondary">需製作的火腿三明治</div>
                <div className="text-xl font-bold">{results.totalHamNeeded} 個</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-sm text-text-secondary">需製作的臘腸三明治</div>
                <div className="text-xl font-bold">{results.totalSalamiNeeded} 個</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-sm text-text-secondary">需要的麵包數量</div>
                <div className="text-xl font-bold">{results.bagsNeeded} 包</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SandwichCalculator 