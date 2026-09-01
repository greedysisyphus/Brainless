/** 班表：Firebase 同步（月份文件與同事設定） */

import { collection, doc, getDocs, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../utils/firebase.js'
import {
  SHIFT_MONTHS_COLLECTION,
  SHIFT_PEOPLE_COLLECTION,
  SHIFT_SUPPORT_COLLECTION,
  PICKUP_OPTIONS,
  canonicalPickup,
} from './shiftConstants.js'
import { monthDocId } from './shiftImport.js'
import { normalizeIdentitySettings } from './shiftIdentity.js'

/** Firestore 不接受 undefined，寫入前先清乾淨。 */
export function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined)
  if (value && typeof value === 'object') {
    const next = {}
    Object.entries(value).forEach(([key, item]) => {
      if (item === undefined) return
      next[key] = stripUndefined(item)
    })
    return next
  }
  return value === undefined ? null : value
}

/** 姓名可能含 Firestore 文件 ID 不允許的字元，轉成安全 ID。 */
export function personDocId(personKey) {
  const safe = String(personKey || '')
    .replace(/[/\\]/g, '_')
    .trim()
  if (!safe || safe === '.' || safe === '..') return `person_${encodeURIComponent(personKey || '')}`
  if (/^__.*__$/.test(safe)) return `person_${safe}`
  return safe
}

export async function loadShiftMonths() {
  const snapshot = await getDocs(collection(db, SHIFT_MONTHS_COLLECTION))
  const months = []
  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    if (data?.monthKey && data?.storeCode) months.push({ ...data, docId: docSnap.id })
  })
  return months.sort(
    (a, b) => b.monthKey.localeCompare(a.monthKey) || a.storeCode.localeCompare(b.storeCode)
  )
}

export function subscribeShiftMonths(onChange, onError) {
  return onSnapshot(
    collection(db, SHIFT_MONTHS_COLLECTION),
    (snapshot) => {
      const months = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        if (data?.monthKey && data?.storeCode) months.push({ ...data, docId: docSnap.id })
      })
      onChange(
        months.sort(
          (a, b) => b.monthKey.localeCompare(a.monthKey) || a.storeCode.localeCompare(b.storeCode)
        )
      )
    },
    onError
  )
}

export async function saveShiftMonth(month) {
  if (!month?.monthKey || !month?.storeCode) throw new Error('月份文件缺少 monthKey 或 storeCode')
  const docId = monthDocId(month.monthKey, month.storeCode)
  const payload = stripUndefined({ ...month, docId, importedAt: new Date().toISOString() })
  await setDoc(doc(db, SHIFT_MONTHS_COLLECTION, docId), payload)
  return payload
}

export async function deleteShiftMonth(monthKey, storeCode) {
  await deleteDoc(doc(db, SHIFT_MONTHS_COLLECTION, monthDocId(monthKey, storeCode)))
}

export function normalizePersonSettings(raw) {
  // 存進 Firebase 的可能是舊站名（環西站），讀出來先正規化，不然那些人會變成「未設定」
  const pickup = canonicalPickup(raw?.pickup)
  // 特定日期的例外：那天不搭車，或那天從別站上車
  const pickupOn = {}
  Object.entries(raw?.pickupOn || {}).forEach(([date, location]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const value = canonicalPickup(location)
    if (PICKUP_OPTIONS.includes(value)) pickupOn[date] = value
  })
  return {
    pickupOn,
    pickup: PICKUP_OPTIONS.includes(pickup) ? pickup : '',
    excludeFromStats: !!raw?.excludeFromStats,
    note: String(raw?.note ?? ''),
    ...normalizeIdentitySettings(raw),
  }
}

export async function loadPeopleSettings() {
  const snapshot = await getDocs(collection(db, SHIFT_PEOPLE_COLLECTION))
  const settings = {}
  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    const key = data?.personKey || docSnap.id
    settings[key] = normalizePersonSettings(data)
  })
  return settings
}

export function subscribePeopleSettings(onChange, onError) {
  return onSnapshot(
    collection(db, SHIFT_PEOPLE_COLLECTION),
    (snapshot) => {
      const settings = {}
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        const key = data?.personKey || docSnap.id
        settings[key] = normalizePersonSettings(data)
      })
      onChange(settings)
    },
    onError
  )
}

export async function savePersonSettings(personKey, settings) {
  if (!personKey) throw new Error('缺少同事識別')
  const payload = stripUndefined({
    personKey,
    ...normalizePersonSettings(settings),
    updatedAt: new Date().toISOString(),
  })
  await setDoc(doc(db, SHIFT_PEOPLE_COLLECTION, personDocId(personKey)), payload)
  return payload
}

// pickupMapFrom 已搬到 shiftModel（純函式，伺服器端要共用），這裡轉出去維持相容
export { pickupMapFrom } from './shiftModel.js'


/* ---------- 支援班的手動配對 ---------- */

function normalizeSupportLink(raw) {
  return {
    date: String(raw?.date ?? ''),
    atStore: String(raw?.atStore ?? ''),
    personKey: String(raw?.personKey ?? ''),
    slotId: String(raw?.slotId ?? ''),
  }
}

/** 一個月一份文件；links 用陣列存，免得人名裡的字元撞到 Firestore 欄位名規則。 */
export function subscribeSupportLinks(onChange, onError) {
  return onSnapshot(
    collection(db, SHIFT_SUPPORT_COLLECTION),
    (snapshot) => {
      const links = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        ;(Array.isArray(data?.links) ? data.links : []).forEach((link) => {
          const normalized = normalizeSupportLink(link)
          if (normalized.date && normalized.atStore && normalized.personKey) links.push(normalized)
        })
      })
      onChange(links)
    },
    onError
  )
}

/**
 * 儲存某個月的手動配對。slotId 空字串代表取消指定。
 * @param {string} monthKey
 * @param {object[]} links 這個月的完整配對清單
 */
export async function saveSupportLinks(monthKey, links) {
  if (!monthKey) throw new Error('缺少月份')
  const payload = stripUndefined({
    monthKey,
    links: (Array.isArray(links) ? links : [])
      .map(normalizeSupportLink)
      .filter((link) => link.date && link.atStore && link.personKey && link.slotId),
    updatedAt: new Date().toISOString(),
  })
  await setDoc(doc(db, SHIFT_SUPPORT_COLLECTION, monthKey), payload)
  return payload
}
