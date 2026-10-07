import { useEffect, useState } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../utils/firebase'

// 新版首頁全站共用的設定，放在 Firestore 的 siteSettings/home，在「管理設定」改。
// meter：忙碌量尺上標今天位置的東西，'dot' 是原本的圓點，'cat' 是水彩貓和樹。
// 上次讀到的值記在這台裝置上，下次進來不用等網路就先照著畫，不會先出現圓點再跳成貓。
const KEY = 'bl-home-settings'
const DEFAULTS = { meter: 'dot' }
const ref = () => doc(db, 'siteSettings', 'home')
const cached = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) } } catch { return DEFAULTS }
}

export function useHomeSettings() {
  const [settings, setSettings] = useState(cached)
  useEffect(() => onSnapshot(ref(), (snap) => {
    const next = { ...DEFAULTS, ...snap.data() }
    setSettings({ meter: next.meter })
    try { localStorage.setItem(KEY, JSON.stringify({ meter: next.meter })) } catch { /* 存不了就只是下次要等網路 */ }
  }, () => {}), []) // 讀不到（離線、沒權限）就用手上有的
  return settings
}

export const saveHomeSettings = (patch) => setDoc(ref(), { ...patch, lastUpdated: serverTimestamp(), updatedBy: auth.currentUser?.uid ?? null }, { merge: true })
