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

/** Club：Cw* + 相同計算 */
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
      studio={<PoursteadyStudioView {...model} />}
    />
  )
}
