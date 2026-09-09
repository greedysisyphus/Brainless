import { useEffect, useState } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'

import { isGateInStore } from '../../utils/flightData/gates'
import { getFlightStoreByScheduleCode } from '../../utils/flightData/stores'
import { loadStoredGateStressWeights } from '../../utils/flightData/gateStressWeights'
import { loadFlightDataRecord } from '../../utils/flightData/loadFlightDay'
import { stressSlotSeriesDay, summarizeStressSeries } from '../../utils/flightData/stressSlots'
import { getShiftDisplay } from '../../pages/shifts/shiftVocab'
import { parseHHMMToMinutes } from '../../utils/flightData/flightTime'

/**
 * 某一天某家店的航班檔。航班資料只有當天與隔天，所以這裡不做快取也不預抓。
 * 沒有對應門市（例如一店）就完全不發請求。
 */
export function useFlightDay(scheduleStoreCode, dateKey) {
  const [flights, setFlights] = useState(null)
  const store = getFlightStoreByScheduleCode(scheduleStoreCode)

  useEffect(() => {
    if (!store || !dateKey) {
      setFlights(null)
      return undefined
    }
    const controller = new AbortController()
    let alive = true
    loadFlightDataRecord(dateKey, controller.signal)
      .then((result) => {
        if (!alive) return
        const all = result?.data?.flights || []
        setFlights(all.filter((f) => isGateInStore(f.gate, store)))
      })
      .catch(() => {
        if (alive) setFlights(null)
      })
    return () => {
      alive = false
      controller.abort()
    }
  }, [store, dateKey])

  return { store, flights }
}

/**
 * 班表上每個班別旁邊的航班負載：這一班有幾班機、最忙的一小時是哪段。
 *
 * 尖峰用的是這台裝置上次同步到的登機門權重（航班頁存的），
 * 沒有就用該店預設 —— 為了一行字再開一個 Firestore 訂閱不划算。
 */
export default function ShiftFlightLoad({ store, flights, month, shiftCode, dateKey }) {
  if (!store || !flights || flights.length === 0) return null

  const display = getShiftDisplay(month, shiftCode)
  const startMin = parseHHMMToMinutes(display?.start)
  let endMin = parseHHMMToMinutes(display?.end)
  if (startMin == null || endMin == null) return null
  if (endMin <= startMin) endMin += 24 * 60

  const inShift = flights.filter((f) => {
    const m = parseHHMMToMinutes(f.time)
    return m !== null && m >= startMin && m < endMin
  })
  if (inShift.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--cw-text-muted)]">
        <PaperAirplaneIcon className="h-3 w-3" />這班沒有航班
      </span>
    )
  }

  const shifts = [{ key: shiftCode, label: display?.label || shiftCode, startMin, endMin }]
  const summary = summarizeStressSeries(
    stressSlotSeriesDay(flights, dateKey, loadStoredGateStressWeights(store), store, shifts, shiftCode)
  )

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] tabular-nums text-[var(--cw-text-muted)]"
      title={`${store.label}（${store.rangeLabel}）這一班共 ${inShift.length} 班機`}
    >
      <PaperAirplaneIcon className="h-3 w-3" />
      {inShift.length} 班機
      {summary?.maxScore > 0 ? ` · 最忙 ${summary.peak.label}` : ''}
    </span>
  )
}
