import { useState } from 'react'

function SandwichCalculator() {
  const [settings, setSettings] = useState({
    breadPerBag: 8,
    targetHam: 60,
    targetSalami: 28
  })
  
  const [values, setValues] = useState({
    existingHam: '',
    existingSalami: '',
    extraBags: 0,
    distribution: 'even'
  })
  
  const [showSettings, setShowSettings] = useState(false)
  const [results, setResults] = useState(null)
  
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
  
  return (
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
                  onChange={e => setSettings({
                    ...settings,
                    breadPerBag: parseInt(e.target.value)
                  })}
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
                  onChange={e => setSettings({
                    ...settings,
                    targetHam: parseInt(e.target.value)
                  })}
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
                  onChange={e => setSettings({
                    ...settings,
                    targetSalami: parseInt(e.target.value)
                  })}
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
            <select
              className="input-field w-full"
              value={values.distribution}
              onChange={e => setValues({
                ...values,
                distribution: e.target.value
              })}
            >
              <option value="even">平均分配（若不均則優先火腿）</option>
              <option value="ham">優先分配給火腿三明治</option>
              <option value="salami">優先配給臘腸三明治</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">
              額外需要的麵包包數
            </label>
            <input
              type="number"
              className="input-field w-full"
              value={values.extraBags}
              onChange={e => setValues({
                ...values,
                extraBags: e.target.value
              })}
            />
          </div>
        </div>

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
  )
}

export default SandwichCalculator 