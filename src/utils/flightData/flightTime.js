export function formatMinAsHHMM(totalMin) {
  const h = Math.floor(totalMin / 60) % 24
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function parseHHMMToMinutes(raw) {
  if (!raw) return null
  const parts = String(raw).split(':')
  const hh = parseInt(parts[0], 10)
  const mm = parseInt(parts[1] || '0', 10)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null
  return hh * 60 + mm
}
