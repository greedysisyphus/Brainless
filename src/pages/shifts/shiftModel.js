/** 班表：日期工具、月份索引與當日出勤／交通車推導（純函式，可單元測試） */

import {
  CAR_SHIFTS,
  NO_PICKUP,
  PICKUP_LOCATIONS,
  SHIFT_ORDER,
  STORE_CODES,
  SUPPORT_SHIFT_CODE,
  UNSET_PICKUP,
  WEEKDAY_LABELS,
  getStoreName,
  canonicalPickup,
} from './shiftConstants.js'
import { monthDocId } from './shiftImport.js'
import { getPositionLabelIn } from './shiftVocab.js'

/* ---------- 日期 ---------- */

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function toDateKey(date) {
  if (!date) return ''
  if (typeof date === 'string') return date.slice(0, 10)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function parseDateKey(dateKey) {
  const [y, m, d] = String(dateKey || '').split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function addDays(dateKey, amount) {
  const date = parseDateKey(dateKey)
  if (!date) return ''
  date.setDate(date.getDate() + amount)
  return toDateKey(date)
}

export function monthKeyOfDate(dateKey) {
  return String(dateKey || '').slice(0, 7)
}

export function weekdayLabelOf(dateKey) {
  const date = parseDateKey(dateKey)
  return date ? WEEKDAY_LABELS[date.getDay()] : ''
}

export function isWeekendDate(dateKey) {
  const date = parseDateKey(dateKey)
  if (!date) return false
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * 顯示時間戳。匯入時間存的是 UTC（`toISOString()`），轉檔時間是轉換器寫的當地時間，
 * 兩種混在同一張卡上，所以帶時區的要換算成當地，不帶的照原樣顯示——
 * 否則台北的使用者會看到自己「八小時前」才同步過，以為新檔沒進去。
 */
export function formatTimestamp(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const naive = raw.slice(0, 16).replace('T', ' ')
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) return naive
  const at = new Date(raw)
  if (Number.isNaN(at.getTime())) return naive
  const pad = (n) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}

export function formatDateShort(dateKey) {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey || ''
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAY_LABELS[date.getDay()]}）`
}

export function dateRange(fromDateKey, toDateKey_) {
  const list = []
  let cursor = fromDateKey
  let guard = 0
  while (cursor && cursor <= toDateKey_ && guard < 400) {
    list.push(cursor)
    cursor = addDays(cursor, 1)
    guard += 1
  }
  return list
}

export function lastDateOfMonth(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number)
  if (!year || !month) return ''
  return `${monthKey}-${pad2(new Date(year, month, 0).getDate())}`
}

/** 把整月的日期切成週（週日起頭），最後一段可能不滿七天。 */
export function chunkIntoWeeks(dateKeys) {
  const list = Array.isArray(dateKeys) ? dateKeys : []
  if (!list.length) return []
  const weeks = []
  let current = []
  list.forEach((dateKey) => {
    const weekday = parseDateKey(dateKey)?.getDay() ?? 0
    if (weekday === 0 && current.length) {
      weeks.push(current)
      current = []
    }
    current.push(dateKey)
  })
  if (current.length) weeks.push(current)
  return weeks
}

/* ---------- 月份索引 ---------- */

/** 畫面上要顯示的名字：優先用暱稱／合併後的正式名。 */
export function personLabel(person) {
  return person?.displayName || person?.name || person?.key || ''
}


/**
 * 把散落的月份文件整理成一本可查詢的班表。
 * @param {object[]} monthDocs
 */
export function buildShiftBook(monthDocs) {
  const months = (Array.isArray(monthDocs) ? monthDocs : []).filter(
    (m) => m && m.monthKey && m.storeCode
  )
  const byId = {}
  const monthKeySet = new Set()
  const peopleByKey = new Map()

  months.forEach((month) => {
    byId[monthDocId(month.monthKey, month.storeCode)] = month
    monthKeySet.add(month.monthKey)
    ;(month.people || []).forEach((person) => {
      // 那個月他在這家店的表上排了幾天班（不含出去支援的），用來決定他「屬於」哪家店
      let workDays = 0
      Object.values(month.entries?.[person.key] || {}).forEach((entry) => {
        if (entry?.kind === 'WORK' && !entry.isSupport) workDays += 1
      })
      const membership = { monthKey: month.monthKey, storeCode: month.storeCode, workDays }

      const existing = peopleByKey.get(person.key)
      if (existing) {
        existing.storeCodes.add(month.storeCode)
        existing.monthKeys.add(month.monthKey)
        existing.memberships.push(membership)
        existing.placeholder = existing.placeholder && person.placeholder
        existing.unnamed = existing.unnamed || !!person.unnamed
        ;(person.mergedFrom || []).forEach((alias) => existing.mergedFrom.add(alias))
        return
      }
      peopleByKey.set(person.key, {
        key: person.key,
        name: personLabel(person),
        sourceName: person.name,
        placeholder: !!person.placeholder,
        unnamed: !!person.unnamed,
        mergedFrom: new Set(person.mergedFrom || []),
        storeCodes: new Set([month.storeCode]),
        monthKeys: new Set([month.monthKey]),
        memberships: [membership],
      })
    })
  })

  const monthKeys = [...monthKeySet].sort()
  const people = [...peopleByKey.values()]
    .map((person) => ({
      ...person,
      storeCodes: [...person.storeCodes].sort(
        (a, b) => STORE_CODES.indexOf(a) - STORE_CODES.indexOf(b)
      ),
      memberships: [...person.memberships].sort(
        (a, b) =>
          a.monthKey.localeCompare(b.monthKey) ||
          STORE_CODES.indexOf(a.storeCode) - STORE_CODES.indexOf(b.storeCode)
      ),
      monthKeys: [...person.monthKeys].sort(),
      mergedFrom: [...person.mergedFrom].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))

  return { months, byId, monthKeys, people }
}

export function getMonth(book, monthKey, storeCode) {
  return book?.byId?.[monthDocId(monthKey, storeCode)] || null
}

export function getMonthsForDate(book, dateKey) {
  const monthKey = monthKeyOfDate(dateKey)
  return (book?.months || []).filter((month) => month.monthKey === monthKey)
}

/** 支援班只寫「T3」／「D7」時，回傳從目的店補出來的實際班別。 */
export function effectiveShift(entry) {
  if (!entry) return null
  if (entry.shift === SUPPORT_SHIFT_CODE) return entry.resolvedShift || SUPPORT_SHIFT_CODE
  return entry.shift || null
}

/**
 * 這個班實際在哪家店上。
 *
 * 支援班一律**不算本店**，即使沒寫去哪家店（班表只寫一個「支」）——
 * 那種格子回傳 null（人在別處，但不知道是哪一家），絕不能退回本店，
 * 否則本店人力會虛胖，跟班表 Total 對不上。判斷依據是 isSupport，不是 atStore 有沒有值。
 */
export function effectiveStore(entry, homeStoreCode) {
  if (entry?.isSupport) return entry.atStore || entry.resolvedAtStore || null
  return homeStoreCode
}

/** 目的店自己的表上已經有這筆班了，這一格只是註記，不能再算一次。 */
export function isShadowEntry(entry) {
  return !!entry?.isShadow
}

/**
 * 依店別把同事分組，用在篩選與下拉選單。
 * 跨店的人會出現在他有上班的每一家店底下（同一個人、多個入口），
 * 因為找人的時候你記得的是「他在 D7」，不是「他跨店」。
 * @param {object[]} people
 * @param {{includePlaceholder?: boolean}} options
 */
/**
 * 這個人在這段範圍裡「屬於」哪家店 —— 取範圍內**最後出現的那個月**他排班的店。
 * 調店的人看的是他現在在哪，不是他歷史上待過哪些店；同一個月出現在兩家店（互換班那種）
 * 就看哪邊班比較多。
 * @param {object} person buildShiftBook 產生的人員
 * @param {string[]} [monthKeys] 限定月份；省略代表全部
 */
export function primaryStoreOf(person, monthKeys) {
  const wanted = monthKeys?.length ? new Set(monthKeys) : null
  const inScope = (person?.memberships || []).filter((m) => !wanted || wanted.has(m.monthKey))
  if (!inScope.length) return (person?.storeCodes || [])[0] || ''
  const latestMonth = inScope[inScope.length - 1].monthKey
  return inScope
    .filter((m) => m.monthKey === latestMonth)
    .sort((a, b) => b.workDays - a.workDays)[0].storeCode
}

/**
 * 依店別把同事分組。**一個人只會出現在一組** —— 跨店的人重複列出來，
 * 下拉選單就會出現兩次同名，選單數量也對不上人數。
 * @param {object[]} people
 * @param {{includePlaceholder?: boolean, monthKeys?: string[]}} options
 */
export function groupPeopleByStore(people, { includePlaceholder = false, monthKeys } = {}) {
  const list = (people || []).filter((person) => includePlaceholder || !person.placeholder)
  const assigned = new Map()
  list.forEach((person) => {
    const code = primaryStoreOf(person, monthKeys)
    if (!assigned.has(code)) assigned.set(code, [])
    assigned.get(code).push(person)
  })

  const groups = STORE_CODES.filter((code) => assigned.get(code)?.length).map((code) => ({
    storeCode: code,
    storeName: getStoreName(code),
    people: assigned.get(code),
  }))
  const orphans = assigned.get('') || []
  if (orphans.length) groups.push({ storeCode: '', storeName: '未歸店', people: orphans })
  return groups
}

/** 這個人有沒有在指定店上過班；storeCode 為 'all' 時一律通過。 */
export function personInStore(person, storeCode, monthKeys) {
  if (!storeCode || storeCode === 'all') return true
  // 跟 groupPeopleByStore 用同一條規則，否則篩選出來的人數會跟分頁上的數字對不起來
  return primaryStoreOf(person, monthKeys) === storeCode
}

/* ---------- 當日出勤 ---------- */

/**
 * 某一天所有店的出勤名單（不含匯出檔裡的「支援」佔位列）。
 * 調店／支援會以 workStore 呈現實際上班的店。
 */
/**
 * 這一天的「列外」——有人不在自己店裡上班。
 *
 * 這些格子刻意不進當日名單：跨店支援算目的店的人力，互換班兩邊各自寫了對方，
 * 直接列會重複計算。但紙本上白紙黑字寫著「Alex → D7」，名單裡完全看不到就等於資訊掉了，
 * 所以另外列出來，標明算不算進人力。
 *
 * @returns {{personKey:string,name:string,fromStore:string,toStore:string|null,
 *   shift:string|null,shiftUnknown:boolean,destinationFrom:string|null,counted:boolean}[]}
 */
export function getCrossStoreMoves(book, dateKey) {
  const moves = []
  getMonthsForDate(book, dateKey).forEach((month) => {
    ;(month.people || []).forEach((person) => {
      if (person.placeholder) return
      const entry = month.entries?.[person.key]?.[dateKey]
      if (!entry || entry.kind !== 'WORK' || !entry.isSupport) return
      const shift = effectiveShift(entry)
      moves.push({
        personKey: person.key,
        name: personLabel(person),
        fromStore: month.storeCode,
        toStore: entry.atStore || entry.resolvedAtStore || null,
        shift: shift === SUPPORT_SHIFT_CODE ? null : shift,
        shiftUnknown: shift === SUPPORT_SHIFT_CODE,
        destinationFrom: entry.destinationFrom || (entry.atStore ? 'sheet' : null),
        // 影子＝目的店自己的表上已經有這個人這天的班，人力由那邊算，這裡只是留個紀錄
        counted: !isShadowEntry(entry),
      })
    })
  })
  return moves.sort((a, b) => a.fromStore.localeCompare(b.fromStore) || a.name.localeCompare(b.name))
}

export function getDayAssignments(book, dateKey) {
  const assignments = []
  getMonthsForDate(book, dateKey).forEach((month) => {
    ;(month.people || []).forEach((person) => {
      if (person.placeholder) return
      const entry = month.entries?.[person.key]?.[dateKey]
      if (!entry || isShadowEntry(entry)) return
      const shift = effectiveShift(entry)
      assignments.push({
        personKey: person.key,
        name: personLabel(person),
        homeStore: month.storeCode,
        workStore: effectiveStore(entry, month.storeCode),
        supportStoreUnknown: !!entry.isSupport && !entry.atStore,
        kind: entry.kind,
        shift,
        shiftUnknown: shift === SUPPORT_SHIFT_CODE,
        isSupport: !!entry.isSupport,
        position: entry.position || entry.resolvedPosition || null,
        positionLabel: getPositionLabelIn(month, entry.position || entry.resolvedPosition),
        leave: entry.leave || null,
        start: entry.start || null,
        end: entry.end || null,
        crossesMidnight: !!entry.crossesMidnight,
        raw: entry.raw || '',
        needsReview: !!entry.needsReview,
        // 支援班的班別是從目的店「支援」列推回來的，不是紙本原本就寫的
        shiftInferred: entry.resolvedFrom === 'inferred',
      })
    })
  })
  return assignments
}

function shiftRank(code) {
  const index = SHIFT_ORDER.indexOf(code)
  return index >= 0 ? index : SHIFT_ORDER.length
}

export function getWorkingAssignments(book, dateKey) {
  return getDayAssignments(book, dateKey)
    .filter((a) => a.kind === 'WORK')
    .sort(
      (a, b) =>
        STORE_CODES.indexOf(a.workStore) - STORE_CODES.indexOf(b.workStore) ||
        shiftRank(a.shift) - shiftRank(b.shift) ||
        a.name.localeCompare(b.name, 'zh-Hant')
    )
}

/**
 * 依上班的店分組，店內再依班別分組。
 * 沒註明去哪家店的支援班另成一組，不併進任何一家店 —— 併進去就是虛報人力。
 */
export function groupWorkingByStore(assignments) {
  const stores = []
  const buckets = [
    ...STORE_CODES.map((code) => ({ code, name: getStoreName(code) })),
    { code: null, name: '支援（未註明去哪家店）' },
  ]
  buckets.forEach(({ code: storeCode, name }) => {
    const inStore = assignments.filter((a) => (a.workStore || null) === storeCode)
    if (!inStore.length) return
    // 班別代碼可能是店長在轉換器新增的，不能只認 SHIFT_ORDER
    const codes = [...new Set(inStore.map((a) => a.shift).filter(Boolean))].sort(
      (a, b) => shiftRank(a) - shiftRank(b) || a.localeCompare(b)
    )
    const shifts = codes.map((shiftCode) => ({
      shift: shiftCode,
      people: inStore.filter((a) => a.shift === shiftCode),
    }))
    const others = inStore.filter((a) => !a.shift)
    if (others.length) shifts.push({ shift: null, people: others })
    stores.push({ storeCode, storeName: name, total: inStore.length, shifts })
  })
  return stores
}

/* ---------- 交通車 ---------- */

export function pickupOf(pickupByPerson, personKey) {
  // 舊站名在這裡也擋一次：漏接的話那個人會被歸成「未設定」，等於當天少一個人上車
  const value = canonicalPickup(pickupByPerson?.[personKey])
  if (!value) return UNSET_PICKUP
  return value
}

function pickupSortIndex(location) {
  const index = PICKUP_LOCATIONS.indexOf(location)
  if (index >= 0) return index
  if (location === UNSET_PICKUP) return PICKUP_LOCATIONS.length
  return PICKUP_LOCATIONS.length + 1
}

/**
 * 某一天的交通車名單。早班車與中班車各自一台，分開算。
 * @returns {{shift: string, label: string, total: number, groups: {location: string, riders: object[]}[]}[]}
 */
export function getCarLists(book, dateKey, pickupByPerson = {}) {
  const working = getWorkingAssignments(book, dateKey)
  return CAR_SHIFTS.map((shiftCode) => {
    const riders = working
      .filter((a) => a.shift === shiftCode)
      .map((a) => ({ ...a, pickup: pickupOf(pickupByPerson, a.personKey) }))
      .filter((a) => a.pickup !== NO_PICKUP)

    const byLocation = new Map()
    riders.forEach((rider) => {
      if (!byLocation.has(rider.pickup)) byLocation.set(rider.pickup, [])
      byLocation.get(rider.pickup).push(rider)
    })

    const groups = [...byLocation.entries()]
      .map(([location, list]) => ({
        location,
        riders: list.sort(
          (a, b) =>
            STORE_CODES.indexOf(a.workStore) - STORE_CODES.indexOf(b.workStore) ||
            a.name.localeCompare(b.name, 'zh-Hant')
        ),
      }))
      .sort((a, b) => pickupSortIndex(a.location) - pickupSortIndex(b.location))

    return {
      shift: shiftCode,
      total: riders.length,
      groups,
      skipped: working.filter(
        (a) => a.shift === shiftCode && pickupOf(pickupByPerson, a.personKey) === NO_PICKUP
      ),
    }
  })
}

/** 統計分析時要排除的人：匯出檔佔位列與手動標記排除者。 */
export function isCountedPerson(person, peopleSettings = {}) {
  if (!person || person.placeholder) return false
  return !peopleSettings?.[person.key]?.excludeFromStats
}
