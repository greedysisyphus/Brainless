import { memo } from 'react'
import { parseHHMMToMinutes } from '../../../utils/flightData/flightTime'
import { gateToD11D18Family, isNightSupportTargetGate } from '../../../utils/flightData/nightShiftSupport'

function getStatusColor(status, isClub) {
  if (isClub) {
    if (status.includes('DEPARTED') || status.includes('已出發')) return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    if (status.includes('BOARDING') || status.includes('登機中')) return 'bg-blue-100 text-blue-800 border-blue-300'
    if (status.includes('DELAYED') || status.includes('延誤')) return 'bg-amber-100 text-amber-800 border-amber-300'
    if (status.includes('CANCELLED') || status.includes('取消')) return 'bg-red-100 text-red-800 border-red-300'
    return 'bg-slate-100 text-slate-700 border-slate-300'
  }
  if (status.includes('DEPARTED') || status.includes('已出發')) {
    return 'bg-green-500/25 text-green-300 border-green-400/40'
  }
  if (status.includes('BOARDING') || status.includes('登機中')) {
    return 'bg-blue-500/25 text-blue-300 border-blue-400/40'
  }
  if (status.includes('DELAYED') || status.includes('延誤')) {
    return 'bg-yellow-500/25 text-yellow-300 border-yellow-400/40'
  }
  if (status.includes('CANCELLED') || status.includes('取消')) {
    return 'bg-red-500/25 text-red-300 border-red-400/40'
  }
  return 'bg-gray-500/20 text-gray-300 border-gray-400/30'
}

function FlightDataTableRow({
  flight,
  idx,
  isUpcoming,
  nsCfg,
  keepStoreUntil,
  isLastDefining,
  onSelectFlight,
  isStudio = false,
  isClub = false
}) {
  const codeshareFlights = flight.codeshare_flights || []
  const allFlights = [flight.flight_code, ...codeshareFlights.map((cf) => cf.flight_code)]
  const flightDisplay = allFlights.join(' / ')
  const status = flight.status || ''
  const statusColorClass = getStatusColor(status, isClub)

  const flightMinutes = parseHHMMToMinutes(flight.time)
  const showNightSupportHint =
    isNightSupportTargetGate(flight.gate, nsCfg) &&
    flightMinutes !== null &&
    flightMinutes >= nsCfg.supportStartMin &&
    flightMinutes <= nsCfg.supportEndMin
  const gateFamily = gateToD11D18Family(flight.gate)
  const isExcludedFromNightSupport = Boolean(gateFamily && !nsCfg.gateIncluded[gateFamily])
  const isAfterSupportStart = flightMinutes !== null && flightMinutes >= nsCfg.supportStartMin

  return (
    <tr
      onClick={() => onSelectFlight(flight)}
      className={`cursor-pointer border-b transition-all duration-200 ${
        isStudio
          ? `border-[var(--cw-border)] hover:bg-[var(--cw-mega-surface)] ${
              isUpcoming
                ? 'bg-amber-500/10'
                : idx % 2 === 0
                  ? 'bg-transparent'
                  : 'bg-[var(--cw-bg)]/45'
            }`
          : `border-white/10 hover:bg-purple-500/20 ${
              isUpcoming
                ? 'bg-yellow-500/20 active:bg-yellow-500/30'
                : idx % 2 === 0
                  ? 'bg-white/3 active:bg-white/10'
                  : 'bg-white/6 active:bg-white/12'
            }`
      }`}
    >
      <td className="px-3 sm:px-5 py-3 sm:py-4">
        <span
          className={`font-bold text-base sm:text-lg tracking-tight drop-shadow-sm ${
            isStudio
              ? isUpcoming
                ? isClub ? 'text-amber-700' : 'text-amber-300'
                : 'text-[var(--cw-text)]'
              : isUpcoming
                ? 'text-yellow-300'
                : 'text-purple-300 dark:text-purple-200'
          }`}
        >
          {flight.time}
        </span>
      </td>
      <td className="px-3 sm:px-5 py-3 sm:py-4">
        <span
          className={`inline-flex h-6 min-w-[3rem] items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold sm:h-7 sm:min-w-[3.5rem] sm:px-3 sm:py-1.5 sm:text-sm ${
            isStudio
              ? 'border border-[var(--cw-border)] bg-[var(--cw-surface-elevated)] text-[var(--cw-text)] shadow-none'
              : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md'
          }`}
        >
          {flight.gate}
        </span>
      </td>
      <td className="px-3 sm:px-5 py-3 sm:py-4">
        <span
          className={`break-words text-sm font-medium sm:text-base ${
            isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'
          }`}
        >
          {flightDisplay}
        </span>
      </td>
      <td className="px-3 sm:px-5 py-3 sm:py-4">
        <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border-2 ${statusColorClass} shadow-sm inline-block whitespace-nowrap`}>
          {status || '未知'}
        </span>
      </td>
      <td className="px-3 sm:px-5 py-3 sm:py-4">
        {isExcludedFromNightSupport && isAfterSupportStart ? (
          <span className="text-xs font-semibold text-amber-200 sm:text-sm">{gateFamily} 不列入考慮</span>
        ) : showNightSupportHint && isLastDefining ? (
          <span
            className="text-xs font-semibold text-indigo-200 sm:text-sm"
            title={`彙總與本列一致，留店至 ${keepStoreUntil || '--:--'}`}
          >
            {`留店至 ${keepStoreUntil || '--:--'}`}
          </span>
        ) : (
          <span className={`text-xs sm:text-sm ${isStudio ? 'text-[var(--cw-text-muted)]' : 'text-text-secondary'}`}>-</span>
        )}
      </td>
    </tr>
  )
}

export default memo(FlightDataTableRow)
