/**
 * 班表匯入：把 Brainless-SimpleKaffa-Shifts-Convertor 的匯出 JSON
 * 正規化成本站要存進 Firebase 的月份文件。
 */

import {
  SHIFT_SCHEMA_VERSION,
  STORE_CODES,
  getDefaultShiftTimes,
  getStore,
  LEAVE_META,
  PLACEHOLDER_PERSON_PATTERN,
  POSITION_FALLBACK_LABELS,
  SUPPORT_SHIFT_CODE,
  SUPPORTED_EXPORT_SCHEMA_MAJOR,
  canonicalPositionCode,
  getStoreShortName,
} from './shiftConstants.js'

/** 同一個人在不同店、不同月的匯出檔裡編號會變，只有姓名穩定，因此以姓名當人員鍵。 */
export function personKeyFromName(name) {
  return String(name ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isPlaceholderPerson(name) {
  return PLACEHOLDER_PERSON_PATTERN.test(personKeyFromName(name))
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function monthKeyOf(year, month) {
  return `${year}-${pad2(month)}`
}

export function monthDocId(monthKey, storeCode) {
  return `${monthKey}_${storeCode}`
}

function normalizeStoreCode(raw) {
  const code = String(raw ?? '').trim()
  if (!code) return ''
  const hit = STORE_CODES.find((c) => c.toLowerCase() === code.toLowerCase())
  return hit || code
}

/** 從 ISO 8601 拆出日期與 HH:MM。跨夜班的 end 日期會是隔天，用它判定跨夜。 */
export function parseIsoDateTime(value) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(String(value ?? ''))
  return match ? { date: match[1], time: `${match[2]}:${match[3]}` } : null
}

function normalizeTime(value) {
  const text = String(value ?? '').trim()
  return /^\d{1,2}:\d{2}$/.test(text) ? text.padStart(5, '0') : ''
}

/**
 * 班別表。店長可以在轉換器介面新增班別，所以清單一律以匯入檔為準，
 * 本站的預設值只在匯入檔沒帶時間時補上。
 */
/**
 * 這個月的班別表。**清單以匯入檔為準**，內建預設只拿來補時間，不拿來補代碼——
 * 檔案沒列的班別就是這家店沒有（D13 沒有中班），硬塞回去會長出一個永遠 0 個班的幽靈欄位。
 */
function buildShiftTypes(raw, storeCode) {
  const defaults = getDefaultShiftTimes(storeCode)
  const types = {}
  const list = Array.isArray(raw?.shift_types) ? raw.shift_types : []
  list.forEach((type) => {
    const code = String(type?.code ?? '').trim()
    if (!code) return
    const fallback = defaults[code] || {}
    types[code] = {
      code,
      label: String(type.label ?? ''),
      marker: String(type.marker ?? ''),
      start: normalizeTime(type.start) || fallback.start || null,
      end: normalizeTime(type.end) || fallback.end || null,
      crossesMidnight: !!type.crosses_midnight,
    }
  })
  // 格子用到、但 shift_types 沒列的代碼仍要有時間可查
  ;(Array.isArray(raw?.entries) ? raw.entries : []).forEach((entry) => {
    const code = String(entry?.shift ?? '').trim()
    if (!code || types[code]) return
    const fallback = defaults[code] || {}
    types[code] = {
      code,
      label: '',
      marker: '',
      start: fallback.start || null,
      end: fallback.end || null,
      crossesMidnight: false,
    }
  })
  return types
}

function buildPositions(raw) {
  const positions = {}
  const list = Array.isArray(raw?.positions) ? raw.positions : []
  list.forEach((position) => {
    const code = canonicalPositionCode(String(position?.code ?? '').trim())
    if (!code) return
    positions[code] = {
      code,
      label: String(position.label ?? POSITION_FALLBACK_LABELS[code] ?? code),
      color: String(position.color ?? ''),
    }
  })
  Object.entries(POSITION_FALLBACK_LABELS).forEach(([code, label]) => {
    if (!positions[code]) return
    if (!positions[code].label) positions[code].label = label
  })
  return positions
}

function buildLeaveTypes(raw) {
  const leaveTypes = {}
  const list = Array.isArray(raw?.leave_types) ? raw.leave_types : []
  list.forEach((leave) => {
    const code = String(leave?.code ?? '').trim()
    if (!code) return
    leaveTypes[code] = {
      code,
      label: String(leave.label ?? LEAVE_META[code]?.label ?? code),
      marker: String(leave.marker ?? LEAVE_META[code]?.marker ?? ''),
    }
  })
  return leaveTypes
}

function buildDays(raw, monthKey) {
  const days = {}
  const list = Array.isArray(raw?.days) ? raw.days : []
  list.forEach((day) => {
    const date = String(day?.date ?? '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    days[date] = {
      day: Number(day.day) || Number(date.slice(8, 10)),
      weekday: Number(day.weekday) || null,
      isWeekend: !!day.is_weekend,
      note: day.note ? String(day.note) : '',
      // 班表 Total 列寫的當日本店人力。可以拿來對我們自己算出來的數字，
      // 對不上就代表那一天一定有格子判錯。
      total: Number.isFinite(Number(day.total)) ? Number(day.total) : null,
      // auto＝Total 列與儲存格互相印證；cells＝Total 列讀不清、以儲存格為準；confirmed＝人工確認過
      totalSource: day.total_source ? String(day.total_source) : '',
      totalConfidence: Number.isFinite(Number(day.total_confidence))
        ? Number(day.total_confidence)
        : null,
    }
  })
  if (!Object.keys(days).length && /^\d{4}-\d{2}$/.test(monthKey)) {
    const [year, month] = monthKey.split('-').map(Number)
    const total = new Date(year, month, 0).getDate()
    for (let d = 1; d <= total; d += 1) {
      const date = `${monthKey}-${pad2(d)}`
      const weekday = new Date(year, month - 1, d).getDay()
      days[date] = {
        day: d,
        weekday: weekday === 0 ? 7 : weekday,
        isWeekend: weekday === 0 || weekday === 6,
        note: '',
        total: null,
        totalSource: '',
        totalConfidence: null,
      }
    }
  }
  return days
}

function buildHolidays(days) {
  const holidays = {}
  Object.entries(days).forEach(([date, day]) => {
    if (day.note) holidays[date] = day.note
  })
  return holidays
}

/**
 * 支援班有兩種寫法：
 * 「T3」／「D7」只寫了要去哪家店、沒寫班別；「3晚」／「7早」則連班別一起寫了。
 * 前者的班別由 shiftSupport.js 事後與目的店的「支援」列配對後補上；
 * 兩者的上下班時間都要用目的店的班別時間（例如 D13 晚班是 13:00–21:30）。
 */
function normalizeEntry(rawEntry, shiftTypes) {
  const kind = String(rawEntry?.kind ?? '').trim().toUpperCase() || 'EMPTY'
  const isSupport = !!rawEntry?.is_support
  const atStore = normalizeStoreCode(rawEntry?.at_store)
  let shift = rawEntry?.shift ? String(rawEntry.shift).trim() : ''
  if (!shift && isSupport) shift = SUPPORT_SHIFT_CODE

  const entry = {
    kind,
    shift: shift || null,
    position: rawEntry?.position ? canonicalPositionCode(String(rawEntry.position).trim()) : null,
    leave: rawEntry?.leave ? String(rawEntry.leave).trim() : null,
    atStore: atStore || null,
    isSupport,
    raw: String(rawEntry?.raw_text ?? ''),
    // 目的店「支援」列會寫是誰從別店過來（從班表頁尾備註解析）。
    // visitor 是備註原文（不改寫）；resolved 是轉換器比對名單後確定的人；
    // 對不上單一人時給 candidates，由我們用「當天實際去那家店的人」取交集收斂。
    visitor: rawEntry?.visitor ? personKeyFromName(rawEntry.visitor) : null,
    visitorResolved: rawEntry?.visitor_resolved
      ? personKeyFromName(rawEntry.visitor_resolved)
      : rawEntry?.visitorResolved
        ? personKeyFromName(rawEntry.visitorResolved)
        : null,
    visitorMatch: String(rawEntry?.visitor_match ?? rawEntry?.visitorMatch ?? '') || null,
    // 轉換器 --link 後處理的結果：目的地怎麼來的，以及互換班指向對方店的哪一筆
    atStoreSource: String(rawEntry?.at_store_source ?? rawEntry?.atStoreSource ?? '') || null,
    duplicateOf: (() => {
      const dup = rawEntry?.duplicate_of ?? rawEntry?.duplicateOf
      if (!dup?.store) return null
      return { store: String(dup.store), employeeId: String(dup.employee_id ?? dup.employeeId ?? '') }
    })(),
    visitorCandidates: (
      rawEntry?.visitor_candidates ??
      rawEntry?.visitorCandidates ??
      []
    )
      .map(personKeyFromName)
      .filter(Boolean),
    confidence: Number.isFinite(Number(rawEntry?.confidence)) ? Number(rawEntry.confidence) : null,
    needsReview: !!rawEntry?.needs_review,
  }

  // 格子自己帶的 ISO 時間最準（班別表只是那個月的通則）；沒有才退回班別表
  const startIso = parseIsoDateTime(rawEntry?.start)
  const endIso = parseIsoDateTime(rawEntry?.end)
  const type = entry.shift && entry.shift !== SUPPORT_SHIFT_CODE ? shiftTypes[entry.shift] : null

  if (startIso && endIso) {
    entry.start = startIso.time
    entry.end = endIso.time
    entry.crossesMidnight = endIso.date > startIso.date
  } else {
    entry.start = type?.start || null
    entry.end = type?.end || null
    entry.crossesMidnight = !!type?.crossesMidnight
  }
  return entry
}

/**
 * @param {object} raw 匯出檔 JSON
 * @returns {{ok: boolean, error?: string, warnings: string[], month?: object}}
 */
export function normalizeShiftExport(raw, { fileName = '' } = {}) {
  if (Array.isArray(raw)) {
    if (isFlatRows(raw)) return normalizeFlatExport(raw, { fileName })
    return { ok: false, error: '不是有效的 JSON 物件', warnings: [] }
  }
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: '不是有效的 JSON 物件', warnings: [] }
  }

  const storeCode = normalizeStoreCode(raw.store?.code)
  if (!storeCode) {
    return { ok: false, error: '匯出檔缺少 store.code，無法判斷是哪一家店', warnings: [] }
  }

  const year = Number(raw.period?.year)
  const month = Number(raw.period?.month)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: '匯出檔缺少有效的 period.year／period.month', warnings: [] }
  }

  if (!Array.isArray(raw.entries) || raw.entries.length === 0) {
    return { ok: false, error: '匯出檔沒有 entries 班表資料', warnings: [] }
  }

  const schemaVersion = String(raw.schema_version ?? '').trim()
  // 注意 Number('') === 0：沒有版本號不能當成主版本 0
  const schemaMajor = schemaVersion ? Number(schemaVersion.split('.')[0]) : NaN
  if (Number.isInteger(schemaMajor) && schemaMajor !== SUPPORTED_EXPORT_SCHEMA_MAJOR) {
    return {
      ok: false,
      error: `匯出檔的 schema 版本是 ${schemaVersion}，本站目前支援 ${SUPPORTED_EXPORT_SCHEMA_MAJOR}.x。主版本不同代表格式可能變了，請更新本站或用相同版本的轉換器重新轉檔。`,
      warnings: [],
    }
  }

  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map(String) : []
  if (!schemaVersion) {
    warnings.push('匯出檔沒有 schema_version，無法確認格式版本，請確認轉換器版本。')
  }
  if (!STORE_CODES.includes(storeCode)) {
    warnings.push(`店別代碼「${storeCode}」不在已知的三家店內，仍會匯入但需確認。`)
  }

  const monthKey = monthKeyOf(year, month)
  const shiftTypes = buildShiftTypes(raw, storeCode)
  const days = buildDays(raw, monthKey)

  const peopleBySourceId = new Map()
  const people = []
  const seenKeys = new Set()
  ;(Array.isArray(raw.employees) ? raw.employees : []).forEach((employee, index) => {
    const sourceId = String(employee?.id ?? '').trim()
    const name = personKeyFromName(employee?.name)
    if (!name) {
      warnings.push(`第 ${index + 1} 位同事沒有姓名，已略過。`)
      return
    }
    // 轉換器判讀不出姓名時會給「未命名N」，那個 N 是這份檔案裡的位置編號，
    // 不是身分——別家店的「未命名5」是另一個人，所以鍵要綁店，不能只用姓名。
    const unnamed =
      String(employee?.name_source ?? '') === 'fallback' || /^未命名\d*$/.test(name)
    let key = unnamed ? `${name}（${getStoreShortName(storeCode)}）` : name
    if (seenKeys.has(key)) {
      key = `${name}（${storeCode}#${index + 1}）`
      warnings.push(`同一份匯出檔出現重複姓名「${name}」，第二筆已改記為「${key}」。`)
    }
    seenKeys.add(key)
    if (unnamed) {
      warnings.push(`「${name}」的姓名沒有判讀出來，統計與上車地點請先在原圖確認後手動更名。`)
    }
    const person = {
      key,
      name,
      sourceId,
      order: Number(employee?.row) || index + 1,
      group: Number(employee?.group) || null,
      placeholder: isPlaceholderPerson(name),
      unnamed,
      nameConfidence: Number.isFinite(Number(employee?.name_confidence))
        ? Number(employee.name_confidence)
        : null,
    }
    people.push(person)
    if (sourceId) peopleBySourceId.set(sourceId, person)
  })

  const entries = {}
  let unmatched = 0
  raw.entries.forEach((rawEntry) => {
    const person = peopleBySourceId.get(String(rawEntry?.employee_id ?? '').trim())
    const date = String(rawEntry?.date ?? '').trim()
    if (!person || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      unmatched += 1
      return
    }
    if (!entries[person.key]) entries[person.key] = {}
    entries[person.key][date] = normalizeEntry(rawEntry, shiftTypes)
  })
  if (unmatched > 0) {
    warnings.push(`有 ${unmatched} 筆班別對不到同事或日期，已略過。`)
  }

  const month_ = {
    schemaVersion: SHIFT_SCHEMA_VERSION,
    monthKey,
    year,
    month,
    storeCode,
    storeName: String(raw.store?.name ?? getStore(storeCode)?.fullName ?? storeCode),
    daysInMonth: Number(raw.period?.days_in_month) || Object.keys(days).length,
    businessHours: {
      open: normalizeTime(raw.business_hours?.open) || '',
      close: normalizeTime(raw.business_hours?.close) || '',
    },
    shiftTypes,
    positions: buildPositions(raw),
    leaveTypes: buildLeaveTypes(raw),
    days,
    holidays: buildHolidays(days),
    people: people.sort((a, b) => a.order - b.order),
    entries,
    warnings,
    source: {
      file: String(raw.source?.file ?? ''),
      sha: String(raw.source?.sha256_16 ?? ''),
      parserVersion: String(raw.source?.parser_version ?? ''),
      exportSchemaVersion: String(raw.schema_version ?? ''),
      exportedAt: String(raw.updated_at ?? ''),
      autoRate: Number.isFinite(Number(raw.stats?.auto_rate)) ? Number(raw.stats.auto_rate) : null,
      needsReview: Number(raw.stats?.needs_review) || 0,
    },
    notes: String(raw.notes?.raw ?? ''),
  }

  return { ok: true, month: month_, warnings }
}

/* ---------- flat 格式 ---------- */

/** flat 的 employeeId 是「店代碼_姓名」，店代碼從這裡取回來。 */
function storeCodeFromEmployeeId(employeeId) {
  const index = String(employeeId ?? '').indexOf('_')
  return index > 0 ? String(employeeId).slice(0, index) : ''
}

function isFlatRows(raw) {
  return (
    Array.isArray(raw) &&
    raw.some((row) => row && typeof row === 'object' && 'employeeId' in row && 'date' in row)
  )
}

/**
 * 把 flat 陣列還原成本站的月份文件。
 *
 * flat 少了三樣東西：店別／月份的表頭、班別與崗位的代碼表、以及沒排班的日子（EMPTY）。
 * 前兩樣可以從資料本身推回來，第三樣本來就畫成空白，所以只有國定假日與轉檔警告真的拿不到。
 */
export function normalizeFlatExport(rows, { fileName = '' } = {}) {
  const list = rows.filter((row) => row && typeof row === 'object' && row.employeeId && row.date)
  if (!list.length) return { ok: false, error: 'flat 檔裡沒有可用的班別資料', warnings: [] }

  const warnings = [
    'flat 格式沒有國定假日與轉檔警告；有完整的 .json 時建議改用它，資訊比較齊。',
  ]

  const storeCounts = {}
  list.forEach((row) => {
    const code = normalizeStoreCode(storeCodeFromEmployeeId(row.employeeId))
    if (code) storeCounts[code] = (storeCounts[code] || 0) + 1
  })
  const storeCode = Object.entries(storeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  if (!storeCode) {
    return {
      ok: false,
      error: 'flat 檔的 employeeId 沒有店代碼前綴（應為「D7_小柔」這種格式），判斷不出是哪一家店',
      warnings: [],
    }
  }
  if (Object.keys(storeCounts).length > 1) {
    warnings.push(
      `這份 flat 檔混了多家店的資料（${Object.keys(storeCounts).join('、')}），已全部歸給 ${storeCode}。`
    )
  }

  const dates = list.map((row) => String(row.date)).sort()
  const monthKey = dates[0].slice(0, 7)
  const [year, month] = monthKey.split('-').map(Number)
  if (dates[dates.length - 1].slice(0, 7) !== monthKey) {
    warnings.push('這份 flat 檔跨了不只一個月，只會保留第一個月的資料。')
  }

  // 代碼表從資料本身長出來
  // flat 沒有 shift_types，代碼完全從資料長出來；預設只在缺時間時補上
  const shiftDefaults = getDefaultShiftTimes(storeCode)
  const shiftTypes = {}
  const positions = {}
  const leaveTypes = {}
  list.forEach((row) => {
    const shiftCode = row.shiftCode ? String(row.shiftCode) : ''
    if (shiftCode) {
      const startIso = parseIsoDateTime(row.start)
      const endIso = parseIsoDateTime(row.end)
      const existing = shiftTypes[shiftCode] || {}
      shiftTypes[shiftCode] = {
        code: shiftCode,
        label: String(row.shiftLabel ?? existing.label ?? ''),
        marker: existing.marker ?? '',
        start: startIso?.time || existing.start || shiftDefaults[shiftCode]?.start || null,
        end: endIso?.time || existing.end || shiftDefaults[shiftCode]?.end || null,
        crossesMidnight:
          startIso && endIso ? endIso.date > startIso.date : !!existing.crossesMidnight,
      }
    }
    const positionCode = row.positionCode ? canonicalPositionCode(String(row.positionCode)) : ''
    if (positionCode && !positions[positionCode]) {
      positions[positionCode] = {
        code: positionCode,
        label: String(row.positionLabel ?? POSITION_FALLBACK_LABELS[positionCode] ?? positionCode),
        color: '',
      }
    }
    const leaveCode = row.leaveCode ? String(row.leaveCode) : ''
    if (leaveCode && !leaveTypes[leaveCode]) {
      leaveTypes[leaveCode] = {
        code: leaveCode,
        label: String(row.leaveLabel ?? LEAVE_META[leaveCode]?.label ?? leaveCode),
        marker: LEAVE_META[leaveCode]?.marker ?? '',
      }
    }
  })

  const people = []
  const seen = new Map()
  const entries = {}
  list.forEach((row) => {
    if (String(row.date).slice(0, 7) !== monthKey) return
    const name = personKeyFromName(row.employeeName)
    if (!name) return
    if (!seen.has(name)) {
      const unnamed = /^未命名\d*$/.test(name)
      if (unnamed) {
        warnings.push(`「${name}」的姓名沒有判讀出來，統計與上車地點請先在原圖確認後手動更名。`)
      }
      const person = {
        key: unnamed ? `${name}（${getStoreShortName(storeCode)}）` : name,
        name,
        sourceId: String(row.employeeId),
        order: seen.size + 1,
        group: null,
        placeholder: isPlaceholderPerson(name),
        unnamed,
        nameConfidence: null,
      }
      seen.set(name, person)
      people.push(person)
    }
    const personKey = seen.get(name).key
    if (!entries[personKey]) entries[personKey] = {}
    entries[personKey][String(row.date)] = normalizeEntry(
      {
        kind: row.kind,
        shift: row.shiftCode,
        position: row.positionCode,
        leave: row.leaveCode,
        at_store: row.atStore,
        is_support: row.isSupport,
        start: row.start,
        end: row.end,
        raw_text: row.displayLabel,
        at_store_source: row.atStoreSource,
        duplicate_of: row.duplicateOf,
        visitor: row.visitor,
        visitor_resolved: row.visitorResolved,
        visitor_match: row.visitorMatch,
        visitor_candidates: row.visitorCandidates,
        needs_review: row.needsReview,
      },
      shiftTypes
    )
  })

  return {
    ok: true,
    warnings,
    month: {
      schemaVersion: SHIFT_SCHEMA_VERSION,
      monthKey,
      year,
      month,
      storeCode,
      storeName: getStore(storeCode)?.fullName || storeCode,
      daysInMonth: new Date(year, month, 0).getDate(),
      businessHours: { open: '', close: '' },
      shiftTypes,
      positions,
      leaveTypes,
      days: buildDays({}, monthKey),
      holidays: {},
      people,
      entries,
      warnings,
      source: {
        file: String(fileName || ''),
        sha: '',
        parserVersion: '',
        exportSchemaVersion: '',
        exportedAt: '',
        autoRate: null,
        needsReview: list.filter((row) => row.needsReview).length,
        format: 'flat',
      },
      notes: '',
    },
  }
}
