import { doc, getDoc } from 'firebase/firestore'

import { db } from '../firebase'
import { loadPrimaryThenFallback } from './dataSource.js'

const FLIGHT_DATA_BASE_PATH = import.meta.env.PROD ? '/Brainless/data/' : '/data/'

/**
 * 某一天的航班檔：Firestore 優先，讀不到才退回站上的靜態 JSON。
 * 航班頁與班表頁共用，兩邊看到的資料必須是同一份。
 */
export async function loadFlightDataRecord(date, signal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  return loadPrimaryThenFallback(
    async () => {
      const snapshot = await getDoc(doc(db, 'flightData', date))
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (snapshot.exists()) {
        const data = snapshot.data()
        if (Array.isArray(data?.flights)) {
          return { data, lastModified: data._stored_at || data.updated_at || null }
        }
      }
      return null
    },
    async () => {
      const response = await fetch(`${FLIGHT_DATA_BASE_PATH}flight-data-${date}.json`, {
        signal,
        cache: 'no-cache'
      })
      if (!response.ok) return null
      const text = await response.text()
      if (text.trimStart().startsWith('<')) return null
      try {
        return { data: JSON.parse(text), lastModified: response.headers.get('last-modified') }
      } catch {
        return null
      }
    }
  )
}

/** 每日 T2 預報總數（忙碌指數用），爬蟲以 merge 累積在 flightData/_pax_t2_daily。讀不到回 null。 */
export async function loadPaxDaily() {
  const result = await loadPrimaryThenFallback(
    async () => {
      const snapshot = await getDoc(doc(db, 'flightData', '_pax_t2_daily'))
      return snapshot.exists() ? snapshot.data()?.days || null : null
    },
    async () => {
      const response = await fetch(`${FLIGHT_DATA_BASE_PATH}pax-t2-daily.json`, { cache: 'no-cache' }).catch(() => null)
      if (!response?.ok) return null
      return (await response.json().catch(() => null))?.days || null
    }
  )
  return result || null
}
