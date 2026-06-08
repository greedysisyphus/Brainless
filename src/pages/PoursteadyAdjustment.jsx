import { useState } from 'react'
import { BeakerIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { DualThemePage } from '../components/studio/DualThemePage'
import { CwBadge, CwButton, CwCard, CwInput, CwStack } from '../components/studio/ui'

const STANDARD_VOLUMES = {
  hot: [40, 78, 120, 162, 200, 230],
  cold: {
    '150ml': [40, 58, 80, 102, 120, 150],
    '140ml': [40, 58, 80, 102, 120, 140],
    '130ml': [40, 58, 80, 102, 120, 130],
  },
}

const STANDARD_SEGMENTS = {
  hot: [40, 38, 42, 42, 38, 30],
  cold: {
    '150ml': [40, 18, 22, 22, 18, 30],
    '140ml': [40, 18, 22, 22, 18, 20],
    '130ml': [40, 18, 22, 22, 18, 10],
  },
}

function usePoursteadyModel() {
  const [mode, setMode] = useState('hot')
  const [coldScheme, setColdScheme] = useState('150ml')
  const [currentVolumes, setCurrentVolumes] = useState({
    hot: Array(6).fill(''),
    cold: Array(6).fill(''),
  })

  const handleDirectInput = (index, value) => {
    const newVolumes = [...currentVolumes[mode]]
    newVolumes[index] = value
    setCurrentVolumes({
      ...currentVolumes,
      [mode]: newVolumes,
    })
  }

  const handleReset = () => {
    setCurrentVolumes({
      ...currentVolumes,
      [mode]: Array(6).fill(''),
    })
  }

  const handleColdSchemeChange = (scheme) => {
    setColdScheme(scheme)
    setCurrentVolumes({
      ...currentVolumes,
      cold: Array(6).fill(''),
    })
  }

  const getDisplayVolume = (index) => {
    const value = currentVolumes[mode][index]
    if (mode === 'hot') {
      return value === '' ? STANDARD_VOLUMES.hot[index] : Number(value)
    }
    return value === '' ? STANDARD_VOLUMES.cold[coldScheme][index] : Number(value)
  }

  return {
    mode,
    setMode,
    coldScheme,
    handleColdSchemeChange,
    currentVolumes,
    handleDirectInput,
    handleReset,
    getDisplayVolume,
    STANDARD_VOLUMES,
    STANDARD_SEGMENTS,
  }
}

/** Classic：保留原有視覺與標記結構（零破壞） */
function PoursteadyClassicView(model) {
  const {
    mode,
    setMode,
    coldScheme,
    handleColdSchemeChange,
    currentVolumes,
    handleDirectInput,
    handleReset,
    getDisplayVolume,
    STANDARD_SEGMENTS,
  } = model

  return (
    <div className="container-custom py-4 sm:py-6 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative mb-6 text-center sm:mb-8 md:mb-10">
          <div className="absolute inset-0 -z-10 flex justify-center">
            <div className="animate-pulse-glow h-64 w-64 rounded-full bg-primary/10 opacity-50 blur-3xl sm:h-80 sm:w-80 md:h-96 md:w-96" />
          </div>

          <div className="group relative mb-4 inline-flex items-center justify-center sm:mb-5 md:mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 blur-xl opacity-50 transition-opacity duration-500 group-hover:opacity-75" />
            <div className="relative inline-flex transform items-center justify-center overflow-hidden rounded-xl border-2 border-primary/50 bg-gradient-to-br from-primary/30 via-purple-500/30 to-blue-500/30 shadow-2xl shadow-primary/30 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 sm:h-18 sm:w-18 md:h-20 md:w-20 sm:rounded-2xl">
              <div className="animate-gradient absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 bg-[length:200%_100%] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <BeakerIcon className="relative z-10 h-8 w-8 transform text-primary transition-transform duration-300 group-hover:scale-110 sm:h-9 sm:w-9 md:h-10 md:w-10" />
            </div>
          </div>

          <h1 className="relative mb-2 px-4 text-3xl font-extrabold sm:mb-3 sm:text-4xl md:text-5xl">
            <span className="animate-gradient bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text bg-[length:200%_100%] text-transparent">
              Poursteady 注水量調整
            </span>
            <span className="animate-pulse-glow absolute inset-0 -z-10 bg-gradient-to-r from-primary via-purple-400 via-blue-400 to-primary bg-clip-text text-transparent opacity-30 blur-xl">
              Poursteady 注水量調整
            </span>
          </h1>
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-3 sm:mb-8">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-gradient-to-r from-red-500/20 to-orange-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-all duration-200 hover:border-red-500/50 hover:from-red-500/30 hover:to-orange-500/30"
          >
            <ArrowPathIcon className="h-4 w-4" />
            重設
          </button>
        </div>

        <div className="mb-6 sm:mb-7 md:mb-8">
          <div className="relative mx-auto max-w-md rounded-xl border border-white/10 bg-surface/60 p-1.5 shadow-lg backdrop-blur-md sm:p-2">
            <div
              className="absolute bottom-1.5 left-1 top-1.5 rounded-lg bg-gradient-to-r from-primary to-purple-500 shadow-md transition-all duration-300 ease-out sm:bottom-2 sm:left-2 sm:top-2"
              style={{
                width: 'calc(50% - 4px)',
                transform: mode === 'hot' ? 'translateX(0%)' : 'translateX(100%)',
              }}
            />
            <div className="relative grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setMode('hot')}
                className={`relative z-10 flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-300 sm:text-base ${
                  mode === 'hot' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                熱手沖
              </button>
              <button
                type="button"
                onClick={() => setMode('cold')}
                className={`relative z-10 flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-300 sm:text-base ${
                  mode === 'cold' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                冰手沖
              </button>
            </div>
          </div>
        </div>

        {mode === 'cold' && (
          <div className="mb-6 sm:mb-7 md:mb-8">
            <div className="relative mx-auto max-w-md rounded-xl border border-white/10 bg-surface/60 p-1.5 shadow-lg backdrop-blur-md sm:p-2">
              <div
                className="absolute bottom-1.5 left-1 top-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 shadow-md transition-all duration-300 ease-out sm:bottom-2 sm:left-2 sm:top-2"
                style={{
                  width: 'calc(33.333% - 4px)',
                  transform:
                    coldScheme === '150ml'
                      ? 'translateX(0%)'
                      : coldScheme === '140ml'
                        ? 'translateX(100%)'
                        : 'translateX(200%)',
                }}
              />
              <div className="relative grid grid-cols-3 gap-1.5">
                {['150ml', '140ml', '130ml'].map((scheme) => (
                  <button
                    key={scheme}
                    type="button"
                    onClick={() => handleColdSchemeChange(scheme)}
                    className={`relative z-10 flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-300 sm:text-base ${
                      coldScheme === scheme ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {scheme}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 space-y-4 sm:space-y-5 md:space-y-6 sm:mb-8">
          {(mode === 'hot' ? STANDARD_VOLUMES.hot : STANDARD_VOLUMES.cold[coldScheme]).map((standardVolume, index) => {
            const displayVolume = getDisplayVolume(index)
            const prevDisplayVolume = index > 0 ? getDisplayVolume(index - 1) : 0
            const segmentVolume = index === 0 ? displayVolume : displayVolume - prevDisplayVolume
            const standardSegmentVolume =
              mode === 'hot' ? STANDARD_SEGMENTS.hot[index] : STANDARD_SEGMENTS.cold[coldScheme][index]
            const adjustment = Math.round(segmentVolume - standardSegmentVolume)

            return (
              <div key={index} className="group relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 p-4 shadow-2xl backdrop-blur-xl sm:p-5 md:p-6">
                  <div className="animate-gradient absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/5 to-blue-500/0 bg-[length:200%_100%] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="group/icon relative">
                        {mode === 'hot' ? (
                          <>
                            <div className="absolute inset-0 rounded-lg blur-lg transition-all duration-300 group-hover/icon:bg-rose-500/30 sm:rounded-xl" />
                            <div className="relative rounded-lg border border-rose-500/40 bg-gradient-to-br from-rose-500/20 to-amber-500/20 p-2 shadow-lg sm:rounded-xl sm:p-2.5">
                              <span className="text-lg font-bold text-white sm:text-xl md:text-2xl">{index + 1}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 rounded-lg blur-lg transition-all duration-300 group-hover/icon:bg-blue-500/30 sm:rounded-xl" />
                            <div className="relative rounded-lg border border-blue-500/40 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-2 shadow-lg sm:rounded-xl sm:p-2.5">
                              <span className="text-lg font-bold text-white sm:text-xl md:text-2xl">{index + 1}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div>
                        <h3 className="mb-1 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-lg font-bold text-transparent sm:text-xl md:text-2xl">
                          第 {index + 1} 段注水
                        </h3>
                        <p className="text-xs text-text-secondary sm:text-sm">
                          累計標準: {standardVolume} ml
                          <span className="block sm:ml-2 sm:inline">單段標準: {standardSegmentVolume} ml</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="text-center">
                        <input
                          type="number"
                          value={currentVolumes[mode][index]}
                          onChange={(e) => handleDirectInput(index, e.target.value)}
                          placeholder={
                            mode === 'hot'
                              ? String(STANDARD_VOLUMES.hot[index])
                              : String(STANDARD_VOLUMES.cold[coldScheme][index])
                          }
                          step="0.1"
                          className="w-24 rounded-lg border border-white/10 bg-surface/60 px-3 py-2.5 text-center text-lg font-bold text-white transition-colors focus:border-blue-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/30 sm:w-32 sm:text-xl"
                        />
                        {adjustment !== 0 && (
                          <div
                            className={`mt-1 text-xs font-medium sm:text-sm ${adjustment > 0 ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {adjustment > 0 ? `+${adjustment}` : adjustment} ml
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="group relative mb-6 sm:mb-8">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

          <div className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 p-4 shadow-2xl backdrop-blur-xl sm:p-5 md:p-6">
            <div className="animate-gradient absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/5 to-blue-500/0 bg-[length:200%_100%] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 text-xs text-text-secondary sm:text-sm">總注水量</div>
                <div className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">
                  {getDisplayVolume(5)} ml
                </div>
                {(() => {
                  const currentTotal = getDisplayVolume(5)
                  const standardTotal =
                    mode === 'hot' ? STANDARD_VOLUMES.hot[5] : STANDARD_VOLUMES.cold[coldScheme][5]
                  const difference = Math.round(currentTotal - standardTotal)
                  return difference !== 0 ? (
                    <div className={`mt-1 text-sm font-medium ${difference > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {difference > 0 ? `+${difference}` : difference} ml
                    </div>
                  ) : null
                })()}
              </div>
              <div className="text-right">
                <div className="mb-1 text-xs text-text-secondary sm:text-sm">標準總量</div>
                <div className="text-xl font-medium sm:text-2xl">
                  {mode === 'hot' ? STANDARD_VOLUMES.hot[5] : STANDARD_VOLUMES.cold[coldScheme][5]} ml
                </div>
                <div
                  className={`mt-2 ml-auto w-fit rounded-full px-3 py-1 text-xs ${
                    mode === 'hot' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  {mode === 'hot' ? '熱手沖' : '冰手沖'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

          <div className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-surface/90 via-surface/70 to-surface/90 p-4 shadow-2xl backdrop-blur-xl sm:p-5 md:p-6">
            <div className="animate-gradient absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/5 to-blue-500/0 bg-[length:200%_100%] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-3 sm:mb-5">
                <div className={`h-5 w-1 rounded-full sm:h-6 ${mode === 'hot' ? 'bg-rose-400' : 'bg-blue-400'}`} />
                <h2 className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-lg font-bold text-transparent sm:text-xl md:text-2xl">
                  需調整水量
                </h2>
              </div>

              <div className="grid gap-2 sm:gap-3">
                {(mode === 'hot' ? STANDARD_SEGMENTS.hot : STANDARD_SEGMENTS.cold[coldScheme]).map(
                  (standardSegment, index) => {
                    const displayVolume = getDisplayVolume(index)
                    const prevDisplayVolume = index > 0 ? getDisplayVolume(index - 1) : 0
                    const segmentVolume = index === 0 ? displayVolume : displayVolume - prevDisplayVolume
                    const adjustment = Math.round(standardSegment - segmentVolume)

                    if (adjustment === 0) return null

                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                          mode === 'hot'
                            ? 'border border-rose-500/20 bg-rose-500/10'
                            : 'border border-blue-500/20 bg-blue-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                              mode === 'hot' ? 'bg-rose-400/20 text-rose-400' : 'bg-blue-400/20 text-blue-400'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <span className="font-medium">第 {index + 1} 段注水</span>
                        </div>
                        <span
                          className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                            adjustment > 0
                              ? 'border-green-400/30 bg-green-400/20 text-green-400'
                              : 'border-red-400/30 bg-red-400/20 text-red-400'
                          }`}
                        >
                          {adjustment > 0 ? `+${adjustment}` : adjustment} ml
                        </span>
                      </div>
                    )
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Studio：Cw* + 相同計算 */
function PoursteadyStudioView(model) {
  const {
    mode,
    setMode,
    coldScheme,
    handleColdSchemeChange,
    currentVolumes,
    handleDirectInput,
    handleReset,
    getDisplayVolume,
    STANDARD_SEGMENTS,
  } = model

  const adjustmentsList = (mode === 'hot' ? STANDARD_SEGMENTS.hot : STANDARD_SEGMENTS.cold[coldScheme])
    .map((standardSegment, index) => {
      const displayVolume = getDisplayVolume(index)
      const prevDisplayVolume = index > 0 ? getDisplayVolume(index - 1) : 0
      const segmentVolume = index === 0 ? displayVolume : displayVolume - prevDisplayVolume
      const adjustment = Math.round(standardSegment - segmentVolume)
      return adjustment === 0 ? null : { index, adjustment }
    })
    .filter(Boolean)

  const currentTotal = getDisplayVolume(5)
  const standardTotal = mode === 'hot' ? STANDARD_VOLUMES.hot[5] : STANDARD_VOLUMES.cold[coldScheme][5]
  const difference = Math.round(currentTotal - standardTotal)

  return (
    <CwStack className="!gap-[var(--cw-stack-gap)]">
      <div className="flex flex-wrap items-center gap-2">
        <CwButton type="button" variant="ghost" className="gap-2" onClick={handleReset}>
          <ArrowPathIcon className="h-4 w-4" />
          重設本模式
        </CwButton>
        <CwBadge>{mode === 'hot' ? '熱手沖' : '冰手沖'}</CwBadge>
        {mode === 'cold' ? <CwBadge tone="neutral">{coldScheme}</CwBadge> : null}
      </div>

      <div className="grid max-w-md grid-cols-2 gap-2">
        <CwButton type="button" variant={mode === 'hot' ? 'primary' : 'secondary'} onClick={() => setMode('hot')}>
          熱手沖
        </CwButton>
        <CwButton type="button" variant={mode === 'cold' ? 'primary' : 'secondary'} onClick={() => setMode('cold')}>
          冰手沖
        </CwButton>
      </div>

      {mode === 'cold' ? (
        <div className="grid max-w-lg grid-cols-3 gap-2">
          {['150ml', '140ml', '130ml'].map((scheme) => (
            <CwButton
              key={scheme}
              type="button"
              variant={coldScheme === scheme ? 'primary' : 'secondary'}
              onClick={() => handleColdSchemeChange(scheme)}
            >
              {scheme}
            </CwButton>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {(mode === 'hot' ? STANDARD_VOLUMES.hot : STANDARD_VOLUMES.cold[coldScheme]).map((standardVolume, index) => {
          const displayVolume = getDisplayVolume(index)
          const prevDisplayVolume = index > 0 ? getDisplayVolume(index - 1) : 0
          const segmentVolume = index === 0 ? displayVolume : displayVolume - prevDisplayVolume
          const standardSegmentVolume =
            mode === 'hot' ? STANDARD_SEGMENTS.hot[index] : STANDARD_SEGMENTS.cold[coldScheme][index]
          const adjustment = Math.round(segmentVolume - standardSegmentVolume)

          return (
            <CwCard key={index} className="border-[var(--cw-border-strong)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--cw-text)]">第 {index + 1} 段注水</p>
                  <p className="mt-1 text-xs text-[var(--cw-text-muted)]">
                    累計標準 {standardVolume} ml · 單段標準 {standardSegmentVolume} ml
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <CwInput
                    type="number"
                    value={currentVolumes[mode][index]}
                    onChange={(e) => handleDirectInput(index, e.target.value)}
                    placeholder={
                      mode === 'hot'
                        ? String(STANDARD_VOLUMES.hot[index])
                        : String(STANDARD_VOLUMES.cold[coldScheme][index])
                    }
                    step="0.1"
                    inputClassName="max-w-[8rem] text-center font-mono text-base"
                  />
                  {adjustment !== 0 ? (
                    <span className={`text-xs font-medium ${adjustment > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {adjustment > 0 ? '+' : ''}
                      {adjustment} ml vs 標準段
                    </span>
                  ) : null}
                </div>
              </div>
            </CwCard>
          )
        })}
      </div>

      <CwCard className="p-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs text-[var(--cw-text-muted)]">總注水量</p>
            <p className="mt-1 text-3xl font-bold text-[var(--cw-text)]">{currentTotal} ml</p>
            {difference !== 0 ? (
              <p className={`mt-1 text-sm ${difference > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                與標準總量 {difference > 0 ? '+' : ''}
                {difference} ml
              </p>
            ) : null}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-[var(--cw-text-muted)]">標準總量</p>
            <p className="mt-1 text-xl font-semibold text-[var(--cw-text)]">{standardTotal} ml</p>
          </div>
        </div>
      </CwCard>

      {adjustmentsList.length > 0 ? (
        <CwCard className="p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--cw-text)]">需調整水量（對照標準段）</p>
          <ul className="space-y-2">
            {adjustmentsList.map((row) => (
              <li
                key={row.index}
                className="flex items-center justify-between rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--cw-text)]">第 {row.index + 1} 段</span>
                <span className={`font-medium ${row.adjustment > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {row.adjustment > 0 ? '+' : ''}
                  {row.adjustment} ml
                </span>
              </li>
            ))}
          </ul>
        </CwCard>
      ) : null}
    </CwStack>
  )
}

const POUR_BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '門市工具', href: '#/' },
  { label: '手沖機調整', href: '#/poursteady' },
]

export default function PoursteadyAdjustment() {
  const model = usePoursteadyModel()
  return (
    <DualThemePage
      breadcrumbs={POUR_BC}
      title="Poursteady 注水量調整"
      description="對照標準曲線輸入各段累計水量，並檢視與標準段的差異"
      classic={<PoursteadyClassicView {...model} />}
      studio={<PoursteadyStudioView {...model} />}
    />
  )
}
