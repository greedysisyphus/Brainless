import { useEffect, useMemo, useState } from 'react'

import { buildShiftBook } from './shiftModel.js'
import { resolveSupportShifts } from './shiftSupport.js'
import { applyIdentity, buildIdentity } from './shiftIdentity.js'
import {
  subscribePeopleSettings,
  subscribeShiftMonths,
  subscribeSupportLinks,
} from './shiftFirestore.js'

/**
 * 訂閱班表三份資料並組成畫面用的 book。
 *
 * 班表頁與航班頁都要這一份，而且組法必須完全一樣 ——
 * 支援班要先對回目的店的實際班別，再套暱稱合併，少一步兩頁的人數就會對不上。
 */
export function useShiftBook() {
  const [months, setMonths] = useState([])
  const [peopleSettings, setPeopleSettings] = useState({})
  const [supportLinks, setSupportLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let settled = false
    const unsubscribeMonths = subscribeShiftMonths(
      (next) => {
        setMonths(next)
        if (!settled) {
          settled = true
          setLoading(false)
        }
      },
      (error) => {
        setLoadError(error?.message || '讀取班表失敗')
        setLoading(false)
      }
    )
    const unsubscribePeople = subscribePeopleSettings(setPeopleSettings, (error) => {
      setLoadError(error?.message || '讀取同事設定失敗')
    })
    const unsubscribeSupport = subscribeSupportLinks(setSupportLinks, (error) => {
      setLoadError(error?.message || '讀取支援班配對失敗')
    })
    return () => {
      unsubscribeMonths()
      unsubscribePeople()
      unsubscribeSupport()
    }
  }, [])

  const resolvedMonths = useMemo(
    () => resolveSupportShifts(months, supportLinks),
    [months, supportLinks]
  )
  const identity = useMemo(() => buildIdentity(peopleSettings), [peopleSettings])
  const rawBook = useMemo(() => buildShiftBook(resolvedMonths), [resolvedMonths])
  const book = useMemo(
    () => buildShiftBook(applyIdentity(resolvedMonths, identity)),
    [resolvedMonths, identity]
  )

  return {
    book,
    rawBook,
    months,
    resolvedMonths,
    peopleSettings,
    setPeopleSettings,
    supportLinks,
    /** 樂觀更新用：寫進 Firestore 前先動畫面，onSnapshot 回來會覆蓋 */
    setSupportLinks,
    identity,
    loading,
    loadError,
    setLoadError,
  }
}
