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
