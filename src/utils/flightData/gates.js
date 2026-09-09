export function normalizeGateKey(gate) {
  if (gate == null || gate === '') return ''
  return String(gate).trim().toUpperCase()
}

export function flightRowKey(flight) {
  const t = (flight?.time && String(flight.time)) || ''
  const g = normalizeGateKey(flight?.gate)
  const code = (flight?.flight_code || flight?.flight || '').toString().trim()
  return `${t}|${g}|${code}`
}

/** 將登機門正規成門號家族（L／R 併入同號），非 D 區則 null。例：D15R → D15 */
export function gateToFamily(gateRaw) {
  const g = normalizeGateKey(gateRaw)
  const m = g.match(/^D(\d{1,2})(L|R)?$/)
  return m ? `D${Number(m[1])}` : null
}

/** 這個航班是否屬於該店涵蓋範圍 */
export function isGateInStore(gateRaw, store) {
  const fam = gateToFamily(gateRaw)
  return fam != null && store.gateFamilies.includes(fam)
}
