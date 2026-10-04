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

/**
 * 2026-09-09 以前爬蟲只抓 D11–D18，那些日子的檔案裡沒有其他登機門。
 * 對範圍超出 D11–D18 的店（D7 店是 D5–D18）來說那是「沒有資料」而不是「沒有航班」，
 * 算平均時要排除，不然整段統計會被拉低。
 * 判斷方式看檔案內容本身，不寫死日期：店有 D11–D18 以外的門，而這天一班都沒有落在那些門。
 */
const LEGACY_SCRAPE_FAMILIES = ['D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18']
export function isDayCompleteForStore(flights, store) {
  const outside = (store?.gateFamilies || []).filter((f) => !LEGACY_SCRAPE_FAMILIES.includes(f))
  if (!outside.length) return true
  return (flights || []).some((f) => outside.includes(gateToFamily(f.gate)))
}
