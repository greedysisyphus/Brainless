import { useState } from 'react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../../contexts/ThemeContext'
import { CwButton, CwCard, CwInput } from '../studio/ui'

function CocktailIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 20v-7m0 0l6-6.5H6L12 13zm-4-9h8m-8 0l-2-2m10 2l2-2"
      />
    </svg>
  )
}

function AlcoholClassicBody({
  liquors,
  ice,
  result,
  unit,
  toggleUnit,
  addLiquor,
  removeLiquor,
  updateLiquor,
  toggleLiquorUnit,
  calculate,
  resetAll,
  setIce,
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="px-0 sm:px-2">
        <div className="rounded-2xl bg-surface p-6 shadow-xl">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-2">
                <CocktailIcon className="h-8 w-8 text-blue-400" />
              </div>
              <h1 className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-3xl font-bold text-transparent">
                酒精濃度計算器
              </h1>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4 rounded-xl bg-white/5 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
                <span className="h-5 w-1.5 rounded-full bg-blue-400" />
                酒類清單
              </h2>

              <div className="space-y-4">
                {liquors.map((liquor, index) => (
                  <div key={liquor.id} className="rounded-lg bg-white/5 p-4 transition-all duration-200 hover:bg-white/10">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium text-blue-400">酒類 {index + 1}</div>
                      {liquors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLiquor(liquor.id)}
                          className="rounded-lg p-1 text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-sm text-text-secondary">容量</label>
                          <button
                            type="button"
                            onClick={() => toggleLiquorUnit(liquor.id)}
                            className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/20"
                          >
                            {liquor.unit === 'shot' ? 'ml' : 'shot'}
                          </button>
                        </div>
                        <input
                          type="number"
                          value={liquor.volume}
                          onChange={(e) => updateLiquor(liquor.id, 'volume', e.target.value)}
                          className="input-field w-full"
                          placeholder={liquor.unit === 'shot' ? '1 shot = 30ml' : '輸入毫升'}
                          min="0"
                          step={liquor.unit === 'shot' ? '0.5' : '1'}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-text-secondary">濃度 (%)</label>
                        <input
                          type="number"
                          value={liquor.concentration}
                          onChange={(e) => updateLiquor(liquor.id, 'concentration', e.target.value)}
                          className="input-field w-full"
                          placeholder="輸入濃度"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addLiquor}
                className="group w-full rounded-lg border-2 border-dashed border-blue-500/30 py-3 text-blue-400 transition-all duration-200 hover:bg-blue-500/5"
              >
                <div className="flex items-center justify-center gap-2">
                  <PlusIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
                  <span className="text-sm font-medium">添加酒類</span>
                </div>
              </button>
            </div>

            <div className="rounded-xl bg-white/5 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
                <span className="h-5 w-1.5 rounded-full bg-blue-400" />
                融冰計算
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIce((s) => ({ ...s, method: 'volume' }))}
                    className={`rounded-lg p-3 transition-all duration-200 ${
                      ice.method === 'volume'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }`}
                  >
                    <div className="text-sm font-medium">直接輸入體積</div>
                    <div className="mt-1 text-xs opacity-60">手動輸入融冰量</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIce((s) => ({ ...s, method: 'cubes' }))}
                    className={`rounded-lg p-3 transition-all duration-200 ${
                      ice.method === 'cubes'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }`}
                  >
                    <div className="text-sm font-medium">計算冰塊體積</div>
                    <div className="mt-1 text-xs opacity-60">根據冰塊計算</div>
                  </button>
                </div>

                <div className="rounded-lg bg-white/5 p-4">
                  {ice.method === 'volume' ? (
                    <div>
                      <label className="mb-2 block text-sm text-text-secondary">融冰體積 (ml)</label>
                      <input
                        type="number"
                        value={ice.volume}
                        onChange={(e) => setIce((s) => ({ ...s, volume: e.target.value }))}
                        className="input-field w-full"
                        placeholder="輸入預計融化的體積"
                        min="0"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-2 block text-sm text-text-secondary">冰塊數量</label>
                          <input
                            type="number"
                            value={ice.cubes}
                            onChange={(e) => setIce((s) => ({ ...s, cubes: e.target.value }))}
                            className="input-field w-full"
                            placeholder="輸入數量"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm text-text-secondary">每個冰塊重量 (g)</label>
                          <input
                            type="number"
                            value={ice.cubeWeight}
                            onChange={(e) => setIce((s) => ({ ...s, cubeWeight: e.target.value }))}
                            className="input-field w-full"
                            placeholder="輸入冰塊重量"
                            min="0"
                          />
                        </div>
                      </div>
                      {ice.cubes && ice.cubeWeight ? (
                        <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-400">
                          預計融化體積：{(parseFloat(ice.cubes) * parseFloat(ice.cubeWeight)).toFixed(0)} ml
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={calculate}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 py-3 font-medium text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
              >
                計算結果
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="flex-1 rounded-lg bg-white/5 py-3 text-text-secondary transition-all duration-200 hover:bg-white/10"
              >
                重設
              </button>
            </div>

            {result ? (
              <div className="animate-fade-in grid grid-cols-2 gap-4">
                <div className="col-span-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-4">
                  <div className="text-sm text-gray-300">
                    {result.meltedIceVolume > 0 ? '加入融冰後濃度' : '酒精濃度'}
                  </div>
                  <div className="mt-1 text-3xl font-bold text-blue-400">{result.finalConcentration.toFixed(2)}%</div>
                  {result.meltedIceVolume > 0 ? (
                    <div className="mt-2 text-sm text-gray-300">
                      調酒前濃度：{result.originalConcentration.toFixed(2)}%
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg bg-white/5 p-4">
                  <div className="text-sm text-text-secondary">總容量</div>
                  <div className="mt-1 text-xl font-bold">
                    {unit === 'shot' ? `${(result.totalVolume / 30).toFixed(1)} shot` : `${result.totalVolume.toFixed(0)} ml`}
                  </div>
                  <div className="mt-1 text-sm text-text-secondary">
                    {unit === 'shot'
                      ? `${result.totalVolume.toFixed(0)} ml`
                      : `${(result.totalVolume / 30).toFixed(1)} shot`}
                  </div>
                  {result.meltedIceVolume > 0 ? (
                    <div className="mt-1 text-sm text-text-secondary">
                      含融冰：{result.meltedIceVolume.toFixed(0)} ml
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg bg-white/5 p-4">
                  <div className="text-sm text-text-secondary">純酒精含量</div>
                  <div className="mt-1 text-xl font-bold">
                    {unit === 'shot'
                      ? `${(result.pureAlcohol / 30).toFixed(1)} shot`
                      : `${result.pureAlcohol.toFixed(0)} ml`}
                  </div>
                  <div className="mt-1 text-sm text-text-secondary">
                    {unit === 'shot'
                      ? `${result.pureAlcohol.toFixed(0)} ml`
                      : `${(result.pureAlcohol / 30).toFixed(1)} shot`}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function AlcoholStudioBody({
  liquors,
  ice,
  result,
  unit,
  toggleUnit,
  addLiquor,
  removeLiquor,
  updateLiquor,
  toggleLiquorUnit,
  calculate,
  resetAll,
  setIce,
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4">
      <div className="flex flex-wrap justify-end gap-2">
        <CwButton type="button" variant="secondary" onClick={toggleUnit}>
          結果單位：{unit === 'shot' ? 'shot' : 'ml'}（點擊切換）
        </CwButton>
      </div>

      <CwCard title="酒類清單" subtitle="可多筆加總並支援 ml／shot">
        <div className="space-y-4">
          {liquors.map((liquor, index) => (
            <div
              key={liquor.id}
              className="rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--cw-text)]">酒類 {index + 1}</span>
                {liquors.length > 1 ? (
                  <CwButton type="button" variant="ghost" aria-label="移除" onClick={() => removeLiquor(liquor.id)}>
                    <XMarkIcon className="h-4 w-4" />
                  </CwButton>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase text-[var(--cw-text-muted)]">容量</span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--cw-text)]"
                      onClick={() => toggleLiquorUnit(liquor.id)}
                    >
                      {liquor.unit === 'shot' ? '改為 ml' : '改為 shot'}
                    </button>
                  </div>
                  <CwInput
                    type="number"
                    value={liquor.volume}
                    onChange={(e) => updateLiquor(liquor.id, 'volume', e.target.value)}
                    placeholder={liquor.unit === 'shot' ? '1 shot = 30ml' : '毫升'}
                    min="0"
                    step={liquor.unit === 'shot' ? '0.5' : '1'}
                  />
                </div>
                <CwInput
                  label="濃度 (%)"
                  type="number"
                  value={liquor.concentration}
                  onChange={(e) => updateLiquor(liquor.id, 'concentration', e.target.value)}
                  placeholder="0–100"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          ))}
          <CwButton type="button" variant="secondary" className="w-full gap-2" onClick={addLiquor}>
            <PlusIcon className="h-5 w-5" />
            添加酒類
          </CwButton>
        </div>
      </CwCard>

      <CwCard title="融冰計算">
        <div className="grid grid-cols-2 gap-2">
          <CwButton type="button" variant={ice.method === 'volume' ? 'primary' : 'secondary'} onClick={() => setIce((s) => ({ ...s, method: 'volume' }))}>
            輸入體積
          </CwButton>
          <CwButton type="button" variant={ice.method === 'cubes' ? 'primary' : 'secondary'} onClick={() => setIce((s) => ({ ...s, method: 'cubes' }))}>
            冰塊換算
          </CwButton>
        </div>
        <div className="mt-4">
          {ice.method === 'volume' ? (
            <CwInput
              label="融冰體積 (ml)"
              type="number"
              value={ice.volume}
              onChange={(e) => setIce((s) => ({ ...s, volume: e.target.value }))}
              placeholder="預計融化體積"
              min="0"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <CwInput label="冰塊數量" type="number" value={ice.cubes} onChange={(e) => setIce((s) => ({ ...s, cubes: e.target.value }))} min="0" />
              <CwInput
                label="每顆重量 (g)"
                type="number"
                value={ice.cubeWeight}
                onChange={(e) => setIce((s) => ({ ...s, cubeWeight: e.target.value }))}
                min="0"
              />
              {ice.cubes && ice.cubeWeight ? (
                <p className="sm:col-span-2 text-sm text-[var(--cw-text-muted)]">
                  預計融化體積：{(parseFloat(ice.cubes) * parseFloat(ice.cubeWeight)).toFixed(0)} ml
                </p>
              ) : null}
            </div>
          )}
        </div>
      </CwCard>

      <div className="flex flex-wrap gap-3">
        <CwButton type="button" variant="primary" className="min-w-[8rem]" onClick={calculate}>
          計算結果
        </CwButton>
        <CwButton type="button" variant="ghost" onClick={resetAll}>
          重設
        </CwButton>
      </div>

      {result ? (
        <CwCard title="結果" className="border-[var(--cw-border-strong)]">
          <p className="text-sm text-[var(--cw-text-muted)]">
            {result.meltedIceVolume > 0 ? '加入融冰後濃度' : '酒精濃度'}
          </p>
          <p className="mt-1 text-3xl font-bold text-[var(--cw-text)]">{result.finalConcentration.toFixed(2)}%</p>
          {result.meltedIceVolume > 0 ? (
            <p className="mt-2 text-sm text-[var(--cw-text-muted)]">
              調酒前濃度：{result.originalConcentration.toFixed(2)}%
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] p-4">
              <p className="text-xs text-[var(--cw-text-muted)]">總容量</p>
              <p className="mt-1 text-lg font-semibold text-[var(--cw-text)]">
                {unit === 'shot' ? `${(result.totalVolume / 30).toFixed(1)} shot` : `${result.totalVolume.toFixed(0)} ml`}
              </p>
              <p className="text-xs text-[var(--cw-text-muted)]">
                {unit === 'shot' ? `${result.totalVolume.toFixed(0)} ml` : `${(result.totalVolume / 30).toFixed(1)} shot`}
              </p>
              {result.meltedIceVolume > 0 ? (
                <p className="mt-2 text-xs text-[var(--cw-text-muted)]">含融冰 {result.meltedIceVolume.toFixed(0)} ml</p>
              ) : null}
            </div>
            <div className="rounded-[var(--cw-radius)] border border-[var(--cw-border)] p-4">
              <p className="text-xs text-[var(--cw-text-muted)]">純酒精含量</p>
              <p className="mt-1 text-lg font-semibold text-[var(--cw-text)]">
                {unit === 'shot'
                  ? `${(result.pureAlcohol / 30).toFixed(1)} shot`
                  : `${result.pureAlcohol.toFixed(0)} ml`}
              </p>
              <p className="text-xs text-[var(--cw-text-muted)]">
                {unit === 'shot'
                  ? `${result.pureAlcohol.toFixed(0)} ml`
                  : `${(result.pureAlcohol / 30).toFixed(1)} shot`}
              </p>
            </div>
          </div>
        </CwCard>
      ) : null}
    </div>
  )
}

function useAlcoholCalculatorState() {
  const [liquors, setLiquors] = useState([{ volume: '', concentration: '', unit: 'ml', id: Date.now() }])
  const [ice, setIce] = useState({
    method: 'volume',
    volume: '',
    cubes: '',
    cubeWeight: '',
  })
  const [result, setResult] = useState(null)
  const [unit, setUnit] = useState('ml')

  const convertValue = (value, fromUnit, toUnit) => {
    if (!value) return ''
    const val = parseFloat(value)
    if (fromUnit === toUnit) return val
    return fromUnit === 'shot' ? val * 30 : val / 30
  }

  const toggleUnit = () => {
    const newUnit = unit === 'shot' ? 'ml' : 'shot'
    setLiquors(
      liquors.map((liquor) => ({
        ...liquor,
        unit: newUnit,
        volume: convertValue(liquor.volume, liquor.unit, newUnit).toString(),
      }))
    )
    setIce((prev) => ({
      ...prev,
      volume: convertValue(prev.volume, unit, newUnit).toString(),
      cubes: convertValue(prev.cubes, unit, newUnit).toString(),
      cubeWeight: convertValue(prev.cubeWeight, unit, newUnit).toString(),
    }))
    setUnit(newUnit)
  }

  const addLiquor = () => {
    setLiquors([...liquors, { volume: '', concentration: '', unit: 'ml', id: Date.now() }])
  }

  const removeLiquor = (id) => {
    if (liquors.length > 1) setLiquors(liquors.filter((liquor) => liquor.id !== id))
  }

  const updateLiquor = (id, field, value) => {
    setLiquors(
      liquors.map((liquor) => (liquor.id === id ? { ...liquor, [field]: value } : liquor))
    )
  }

  const toggleLiquorUnit = (id) => {
    setLiquors(
      liquors.map((liquor) => {
        if (liquor.id !== id) return liquor
        const newUnit = liquor.unit === 'shot' ? 'ml' : 'shot'
        return {
          ...liquor,
          unit: newUnit,
          volume: convertValue(liquor.volume, liquor.unit, newUnit).toString(),
        }
      })
    )
  }

  const calculate = () => {
    const totalAlcohol = liquors.reduce((sum, { volume, concentration, unit: liquorUnit }) => {
      const v = parseFloat(volume) || 0
      const actualVolume = liquorUnit === 'shot' ? v * 30 : v
      const c = parseFloat(concentration) || 0
      return sum + actualVolume * (c / 100)
    }, 0)

    const totalVolume = liquors.reduce((sum, { volume, unit: liquorUnit }) => {
      const v = parseFloat(volume) || 0
      return sum + (liquorUnit === 'shot' ? v * 30 : v)
    }, 0)

    let meltedIceVolume = 0
    if (ice.method === 'volume') meltedIceVolume = parseFloat(ice.volume) || 0
    else {
      const cubes = parseFloat(ice.cubes) || 0
      const weight = parseFloat(ice.cubeWeight) || 0
      meltedIceVolume = cubes * weight
    }

    const finalVolume = totalVolume + meltedIceVolume
    const finalConcentration = (totalAlcohol / finalVolume) * 100

    setResult({
      originalConcentration: (totalAlcohol / totalVolume) * 100,
      finalConcentration,
      totalVolume: finalVolume,
      pureAlcohol: totalAlcohol,
      meltedIceVolume,
    })
  }

  const resetAll = () => {
    setLiquors([{ volume: '', concentration: '', unit: 'ml', id: Date.now() }])
    setIce({
      method: 'volume',
      volume: '',
      cubes: '',
      cubeWeight: '',
    })
    setResult(null)
  }

  const shared = {
    liquors,
    ice,
    result,
    unit,
    toggleUnit,
    addLiquor,
    removeLiquor,
    updateLiquor,
    toggleLiquorUnit,
    calculate,
    resetAll,
    setIce,
  }

  return shared
}

/** Playground 子頁：酒精濃度計算（Classic / Studio 各一套 UI） */
export default function AlcoholContent() {
  const { isStudio } = useTheme()
  const shared = useAlcoholCalculatorState()
  return isStudio ? <AlcoholStudioBody {...shared} /> : <AlcoholClassicBody {...shared} />
}
