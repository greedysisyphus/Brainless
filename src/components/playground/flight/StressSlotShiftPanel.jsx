import {
  STRESS_SHIFT_ORDER,
  STRESS_SHIFT_PRESETS,
  formatStressShiftSpan
} from '../../../utils/flightData/stressSlots'

export default function StressSlotShiftPanel({ variant, groupLabel, value, onChange, isClub = false }) {
  const isPeak = variant === 'peak'
  const shell = isClub
    ? isPeak
      ? 'rounded-lg border border-amber-500/35 bg-amber-50/80 p-2 sm:p-2.5'
      : 'rounded-lg border border-[#d9b9ad] bg-[#f8eeea] p-2 sm:p-2.5'
    : isPeak
    ? 'rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 sm:p-2.5'
    : 'rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-2 sm:p-2.5'
  const titleCls = isClub ? (isPeak ? 'text-[11px] font-semibold text-amber-800 mb-2' : 'text-[11px] font-semibold text-[#76564b] mb-2') : isPeak ? 'text-[11px] font-semibold text-amber-200/95 mb-2' : 'text-[11px] font-semibold text-cyan-200/95 mb-2'
  const btnActive = isClub
    ? isPeak ? 'bg-amber-700 text-white border border-amber-800 shadow-sm' : 'bg-[#76564b] text-white border border-[#65463c] shadow-sm'
    : isPeak
    ? 'bg-white/15 text-amber-50 border border-amber-400/35 shadow-sm'
    : 'bg-white/15 text-cyan-50 border border-cyan-400/35 shadow-sm'
  const btnIdle = isClub
    ? isPeak ? 'bg-white/80 text-amber-800 border border-amber-500/30 hover:bg-amber-100' : 'bg-white/80 text-[#76564b] border border-[#d9b9ad] hover:bg-[#f2ddd6]'
    : isPeak
    ? 'bg-black/10 text-amber-100/75 border border-amber-500/15 hover:bg-amber-500/10'
    : 'bg-black/10 text-cyan-100/75 border border-cyan-500/15 hover:bg-cyan-500/10'

  return (
    <div className={shell}>
      <div className={titleCls}>{groupLabel}</div>
      <div className="flex flex-wrap gap-1" role="group" aria-label={groupLabel}>
        {STRESS_SHIFT_ORDER.map((k) => {
          const active = value === k
          const p = STRESS_SHIFT_PRESETS[k]
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              className={`flex-1 min-w-[4.75rem] px-2 py-1.5 rounded-md text-center transition-colors ${
                active ? btnActive : btnIdle
              }`}
            >
              <span className="block text-xs font-semibold">{p.label}</span>
              <span className={`block text-[10px] font-normal mt-0.5 tabular-nums leading-tight ${isClub ? (active ? 'text-white/85' : isPeak ? 'text-amber-700' : 'text-[#76564b]') : isPeak ? 'text-amber-100/80' : 'text-cyan-100/80'}`}>
                {formatStressShiftSpan(k)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
