/** 班表統計：班別分布、崗位分布與搭班頻率（純函式，可單元測試） */

import { STORE_CODES, SUPPORT_SHIFT_CODE, getStoreName } from './shiftConstants.js'
import { effectiveShift, effectiveStore, isShadowEntry, personLabel } from './shiftModel.js'
import { collectLeaveCodes, collectShiftCodes, getPositionLabelIn } from './shiftVocab.js'

function timeToMinutes(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || ''))
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/** 跨夜班的下班時間落在隔天，換算成「當日 00:00 起算的分鐘數」才好比。 */
function shiftSpan(entry) {
  const start = timeToMinutes(entry?.start)
  let end = timeToMinutes(entry?.end)
  if (start === null || end === null) return null
  if (entry?.crossesMidnight || end <= start) end += 24 * 60
  return { start, end }
}

export function overlapMinutes(a, b) {
  const spanA = shiftSpan(a)
  const spanB = shiftSpan(b)
  if (!spanA || !spanB) return null
  const start = Math.max(spanA.start, spanB.start)
  const end = Math.min(spanA.end, spanB.end)
  return end > start ? end - start : 0
}

function emptyCounts(keys) {
  return keys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
}

export function selectMonths(book, monthKeys) {
  const months = book?.months || []
  if (!monthKeys || monthKeys.length === 0) return months
  const wanted = new Set(monthKeys)
  return months.filter((month) => wanted.has(month.monthKey))
}

/**
 * 這個範圍實際用到的班別與假別代碼。清單來自匯入檔，不是寫死的，
 * 店長在轉換器新增的班別也會自動長出欄位。
 */
export function getVocabInScope(book, monthKeys) {
  const months = selectMonths(book, monthKeys)
  return {
    shiftCodes: collectShiftCodes(months),
    leaveCodes: collectLeaveCodes(months),
  }
}

/**
 * 把選定月份的所有格子攤平成一筆一筆的班。
 * 支援班以 workStore 記錄實際上班的店，因此調店與 T3 都會算在對的店上。
 */
export function flattenShifts(book, { monthKeys, personKeys } = {}) {
  const wantedPeople = personKeys && personKeys.length ? new Set(personKeys) : null
  const rows = []
  selectMonths(book, monthKeys).forEach((month) => {
    ;(month.people || []).forEach((person) => {
      if (person.placeholder) return
      if (wantedPeople && !wantedPeople.has(person.key)) return
      Object.entries(month.entries?.[person.key] || {}).forEach(([date, entry]) => {
        if (isShadowEntry(entry)) return
        rows.push({
          personKey: person.key,
          name: personLabel(person),
          date,
          monthKey: month.monthKey,
          homeStore: month.storeCode,
          workStore: effectiveStore(entry, month.storeCode),
          supportStoreUnknown: !!entry.isSupport && !entry.atStore,
          kind: entry.kind,
          shift: effectiveShift(entry),
          leave: entry.leave || null,
          position: entry.position || entry.resolvedPosition || null,
          positionLabel: getPositionLabelIn(month, entry.position || entry.resolvedPosition),
          isSupport: !!entry.isSupport,
          start: entry.start || null,
          end: entry.end || null,
          crossesMidnight: !!entry.crossesMidnight,
        })
      })
    })
  })
  return rows
}

/** 每個人的班別／假別／店別／崗位分布。 */
export function computePersonSummaries(book, { monthKeys, excludeKeys = [] } = {}) {
  const excluded = new Set(excludeKeys)
  const { shiftCodes, leaveCodes } = getVocabInScope(book, monthKeys)
  const byPerson = new Map()

  flattenShifts(book, { monthKeys }).forEach((row) => {
    if (excluded.has(row.personKey)) return
    if (!byPerson.has(row.personKey)) {
      byPerson.set(row.personKey, {
        personKey: row.personKey,
        name: row.name,
        workDays: 0,
        leaveDays: 0,
        supportDays: 0,
        unknownShiftDays: 0,
        unknownStoreDays: 0,
        byShift: emptyCounts(shiftCodes),
        byLeave: emptyCounts(leaveCodes),
        byStore: {},
        byPosition: {},
        crossStore: false,
      })
    }
    const summary = byPerson.get(row.personKey)

    if (row.kind === 'WORK') {
      summary.workDays += 1
      // 只寫「T3」／「D7」而推不出班別的支援，不歸進任何一個班別欄
      if (row.shift === SUPPORT_SHIFT_CODE) summary.unknownShiftDays += 1
      else if (row.shift) summary.byShift[row.shift] = (summary.byShift[row.shift] || 0) + 1
      if (row.isSupport) summary.supportDays += 1
      // 沒註明去哪家店的支援班不歸給任何一家店
      if (row.workStore) summary.byStore[row.workStore] = (summary.byStore[row.workStore] || 0) + 1
      else summary.unknownStoreDays += 1
      const positionKey = `${row.workStore}:${row.position || 'NONE'}`
      if (!summary.byPosition[positionKey]) {
        summary.byPosition[positionKey] = {
          storeCode: row.workStore,
          position: row.position || 'NONE',
          label: row.positionLabel || '未指定',
          count: 0,
        }
      }
      summary.byPosition[positionKey].count += 1
    } else if (row.kind === 'LEAVE') {
      summary.leaveDays += 1
      if (row.leave) summary.byLeave[row.leave] = (summary.byLeave[row.leave] || 0) + 1
    }
  })

  return [...byPerson.values()]
    .map((summary) => ({
      ...summary,
      crossStore: Object.keys(summary.byStore).length > 1,
      positions: Object.values(summary.byPosition).sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.workDays - a.workDays || a.name.localeCompare(b.name, 'zh-Hant'))
}

/** 全體班別分布（給圖表用）。 */
export function computeShiftDistribution(book, { monthKeys, storeCode } = {}) {
  const { shiftCodes } = getVocabInScope(book, monthKeys)
  const counts = emptyCounts(shiftCodes)
  let total = 0
  let unknownSupport = 0
  flattenShifts(book, { monthKeys }).forEach((row) => {
    if (row.kind !== 'WORK') return
    if (storeCode && row.workStore !== storeCode) return
    if (!row.shift) return
    if (row.shift === SUPPORT_SHIFT_CODE) {
      unknownSupport += 1
      return
    }
    counts[row.shift] = (counts[row.shift] || 0) + 1
    total += 1
  })
  return { counts, total, unknownSupport, shiftCodes: Object.keys(counts) }
}

/** 各店出勤人次（含支援進來的人次）。 */
export function computeStoreLoad(book, { monthKeys } = {}) {
  const byStore = {}
  flattenShifts(book, { monthKeys }).forEach((row) => {
    if (row.kind !== 'WORK') return
    if (!row.workStore) return // 不知道在哪家店，無法歸戶
    if (!byStore[row.workStore]) {
      byStore[row.workStore] = {
        storeCode: row.workStore,
        storeName: getStoreName(row.workStore),
        shifts: 0,
        supportShifts: 0,
        people: new Set(),
      }
    }
    byStore[row.workStore].shifts += 1
    if (row.isSupport) byStore[row.workStore].supportShifts += 1
    byStore[row.workStore].people.add(row.personKey)
  })
  return STORE_CODES.map((code) => byStore[code])
    .filter(Boolean)
    .map((store) => ({ ...store, headcount: store.people.size, people: undefined }))
}

/**
 * 搭班頻率：同一天、同一家店、兩人都上班就算搭到班。
 * 有時間的班另外累計實際重疊分鐘數；T3 未解析出班別時沒有時間，只計天數。
 */
export function computePartnerFrequency(book, personKey, { monthKeys, excludeKeys = [] } = {}) {
  if (!personKey) return []
  const excluded = new Set(excludeKeys)
  const rows = flattenShifts(book, { monthKeys }).filter((row) => row.kind === 'WORK')

  const mine = rows.filter((row) => row.personKey === personKey)
  if (!mine.length) return []

  const othersByDayStore = new Map()
  rows.forEach((row) => {
    if (row.personKey === personKey || excluded.has(row.personKey)) return
    if (!row.workStore) return // 不知道在哪家店，不能算搭到班
    const slot = `${row.date}|${row.workStore}`
    if (!othersByDayStore.has(slot)) othersByDayStore.set(slot, [])
    othersByDayStore.get(slot).push(row)
  })

  const partners = new Map()
  mine.forEach((row) => {
    if (!row.workStore) return
    const candidates = othersByDayStore.get(`${row.date}|${row.workStore}`) || []
    candidates.forEach((other) => {
      if (!partners.has(other.personKey)) {
        partners.set(other.personKey, {
          personKey: other.personKey,
          name: other.name,
          days: 0,
          daysByMonth: {},
          sameShiftDays: 0,
          overlapMinutes: 0,
          unknownOverlapDays: 0,
          stores: {},
        })
      }
      const partner = partners.get(other.personKey)
      partner.days += 1
      partner.daysByMonth[row.monthKey] = (partner.daysByMonth[row.monthKey] || 0) + 1
      if (row.shift && row.shift === other.shift) partner.sameShiftDays += 1
      const minutes = overlapMinutes(row, other)
      if (minutes === null) partner.unknownOverlapDays += 1
      else partner.overlapMinutes += minutes
      partner.stores[row.workStore] = (partner.stores[row.workStore] || 0) + 1
    })
  })

  const myWorkDays = new Set(mine.map((row) => row.date)).size

  // 我每個月上幾天班，以及每個同事哪幾個月在職 —— 用來把「搭班率」按月份攤平。
  // 直接比天數的話，同期五個月的人一定贏只重疊一個月的人，比的是相處時間不是搭班傾向。
  const myDaysByMonth = {}
  mine.forEach((row) => {
    myDaysByMonth[row.monthKey] = (myDaysByMonth[row.monthKey] || 0) + 1
  })
  const partnerMonths = new Map()
  rows.forEach((row) => {
    if (row.personKey === personKey || excluded.has(row.personKey)) return
    if (!partnerMonths.has(row.personKey)) partnerMonths.set(row.personKey, new Set())
    partnerMonths.get(row.personKey).add(row.monthKey)
  })

  return [...partners.values()]
    .map((partner) => {
      // 只算「兩個人都在」的月份：八月才到職的人不該為了五到七月被扣分
      const shared = Object.keys(myDaysByMonth).filter((monthKey) =>
        partnerMonths.get(partner.personKey)?.has(monthKey)
      )
      const rates = shared.map((monthKey) => (partner.daysByMonth[monthKey] || 0) / myDaysByMonth[monthKey])
      const monthlyRate = rates.length ? rates.reduce((sum, r) => sum + r, 0) / rates.length : 0
      return {
        ...partner,
        overlapHours: Math.round((partner.overlapMinutes / 60) * 10) / 10,
        ratio: myWorkDays ? partner.days / myWorkDays : 0,
        monthlyRate,
        sharedMonths: shared.length,
        storeList: Object.entries(partner.stores)
          .sort((a, b) => b[1] - a[1])
          .map(([code, count]) => ({ storeCode: code, storeName: getStoreName(code), count })),
      }
    })
    .sort(
      (a, b) =>
        b.monthlyRate - a.monthlyRate ||
        b.days - a.days ||
        a.name.localeCompare(b.name, 'zh-Hant')
    )
}

