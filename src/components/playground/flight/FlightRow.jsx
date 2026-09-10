import { memo } from 'react'
import { parseHHMMToMinutes } from '../../../utils/flightData/flightTime'
import { isNightSupportTargetGate } from '../../../utils/flightData/nightShiftSupport'
import { gateToFamily } from '../../../utils/flightData/gates'

function getStatusColor(status, isClub) {
  if (isClub) {
    if (status.includes('DEPARTED') || status.includes('已出發')) return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    if (status.includes('BOARDING') || status.includes('登機中')) return 'bg-blue-100 text-blue-800 border-blue-300'
    if (status.includes('DELAYED') || status.includes('延誤')) return 'bg-amber-100 text-amber-800 border-amber-300'
    if (status.includes('CANCELLED') || status.includes('取消')) return 'bg-red-100 text-red-800 border-red-300'
    return 'bg-slate-100 text-slate-700 border-slate-300'
  }
  if (status.includes('DEPARTED') || status.includes('已出發')) return 'bg-green-500/25 text-green-300 border-green-400/40'
  if (status.includes('BOARDING') || status.includes('登機中')) return 'bg-blue-500/25 text-blue-300 border-blue-400/40'
  if (status.includes('DELAYED') || status.includes('延誤')) return 'bg-yellow-500/25 text-yellow-300 border-yellow-400/40'
  if (status.includes('CANCELLED') || status.includes('取消')) return 'bg-red-500/25 text-red-300 border-red-400/40'
  return 'bg-gray-500/20 text-gray-300 border-gray-400/30'
}

/** 桌機的欄寬；手機不套（改成堆疊卡片） */
export const FLIGHT_ROW_GRID = 'sm:grid sm:items-center sm:gap-3 sm:grid-cols-[5.5rem_5.5rem_1fr_9.5rem]'
export const FLIGHT_ROW_GRID_WITH_SUPPORT =
  'sm:grid sm:items-center sm:gap-3 sm:grid-cols-[5.5rem_5.5rem_1fr_9.5rem_9rem]'

/**
 * 一筆航班。手機是堆疊卡片、桌機是表格列 —— 同一份 DOM，靠 `sm:contents`
 * 讓手機用的包裹層在桌機消失，子元素直接變成 grid 的欄。
 * 原本是寫死 min-w-[780px] 的 <table>，375px 螢幕看一列要橫向滑兩三次。
 */
function FlightRow({
  flight,
  idx,
  isUpcoming,
  nsCfg,
  store,
  keepStoreUntil,
  isLastDefining,
  onSelectFlight,
  isStudio = false,
  isClub = false
}) {
  const codeshareFlights = flight.codeshare_flights || []
  const flightDisplay = [flight.flight_code, ...codeshareFlights.map((cf) => cf.flight_code)].join(' / ')
  const status = flight.status || ''
  const statusColorClass = getStatusColor(status, isClub)

  const flightMinutes = store.nightSupport ? parseHHMMToMinutes(flight.time) : null
  const showNightSupportHint =
    store.nightSupport &&
    isNightSupportTargetGate(flight.gate, nsCfg, store) &&
    flightMinutes !== null &&
    flightMinutes >= nsCfg.supportStartMin &&
    flightMinutes <= nsCfg.supportEndMin
  const gateFamily = gateToFamily(flight.gate)
  const isExcludedFromNightSupport =
    store.nightSupport && Boolean(gateFamily && !nsCfg.gateIncluded[gateFamily])
  const isAfterSupportStart = flightMinutes !== null && flightMinutes >= nsCfg.supportStartMin

  const excludedHintCls = isClub ? 'text-[#9f3d28]' : isStudio ? 'text-amber-800' : 'text-amber-200'
  const keepStoreHintCls = isClub ? 'text-[#76564b]' : isStudio ? 'text-indigo-700' : 'text-indigo-200'
  const mutedCls = isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'

  const supportNote = isExcludedFromNightSupport && isAfterSupportStart
    ? `${gateFamily} 不列入考慮`
    : showNightSupportHint && isLastDefining
      ? `留店至 ${keepStoreUntil || '--:--'}`
      : null

  return (
    <li
      className={`border-b last:border-0 ${
        isStudio
          ? `border-[var(--cw-border)] ${isUpcoming ? 'bg-amber-500/10' : idx % 2 === 0 ? '' : 'bg-[var(--cw-bg)]/45'}`
          : `border-white/10 ${isUpcoming ? 'bg-yellow-500/20' : idx % 2 === 0 ? 'bg-white/3' : 'bg-white/6'}`
      }`}
    >
      <button
        type="button"
        onClick={() => onSelectFlight(flight)}
        aria-label={`${flight.time} ${flight.gate} ${flightDisplay} ${status}`}
        className={`w-full cursor-pointer px-3 py-3 text-left transition-colors sm:px-4 ${
          isStudio ? 'hover:bg-[var(--cw-mega-surface)]' : 'hover:bg-purple-500/20'
        } ${store.nightSupport ? FLIGHT_ROW_GRID_WITH_SUPPORT : FLIGHT_ROW_GRID}`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* 手機第一行：時間＋登機門＋狀態；桌機這層消失，三個直接變成欄 */}
        <div className="flex items-center gap-3 sm:contents">
          <span
            className={`text-base font-bold tabular-nums tracking-tight sm:col-start-1 sm:row-start-1 sm:text-lg ${
              isStudio ? 'text-[var(--cw-text)]' : 'text-primary'
            }`}
          >
            {flight.time}
          </span>
          <span
            className={`inline-flex h-6 min-w-[3rem] shrink-0 items-center justify-center rounded-lg px-2.5 text-xs font-bold sm:col-start-2 sm:row-start-1 sm:h-7 sm:text-sm ${
              isStudio
                ? 'border border-[var(--cw-border)] bg-[var(--cw-surface-elevated)] text-[var(--cw-text)]'
                : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md'
            }`}
          >
            {flight.gate}
          </span>
          <span
            className={`ml-auto inline-block w-fit whitespace-nowrap rounded-lg border-2 px-2 py-0.5 text-[10px] font-bold sm:col-start-4 sm:row-start-1 sm:ml-0 sm:px-3 sm:py-1 sm:text-xs ${statusColorClass}`}
          >
            {status || '未知'}
          </span>
        </div>

        {/* 手機第二行：航班號（桌機回到第三欄，排在狀態之前） */}
        <span
          className={`mt-1.5 block break-words text-sm font-medium sm:col-start-3 sm:row-start-1 sm:mt-0 sm:text-base ${mutedCls}`}
        >
          {flightDisplay}
        </span>

        {store.nightSupport && (
          <span
            className={`mt-1 block text-xs sm:col-start-5 sm:row-start-1 sm:mt-0 sm:text-sm ${
              supportNote
                ? isExcludedFromNightSupport && isAfterSupportStart
                  ? excludedHintCls
                  : keepStoreHintCls
                : mutedCls
            } ${supportNote ? 'font-semibold' : 'hidden sm:block'}`}
          >
            {supportNote || '-'}
          </span>
        )}
      </button>
    </li>
  )
}

export default memo(FlightRow)
