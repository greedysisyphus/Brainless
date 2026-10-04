import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../utils/firebase'
import { getDeviceStamp } from '../../pages/coffeeBean/coffeeBeanInventorySync'

const STORES = [
  ['central', '中央店'],
  ['d7', 'D7 店'],
  ['d13', 'D13 店'],
]
const ACTIONS = { edit: '編輯', reset: '清空', 'switch-store': '切店時補寫', 'keep-local': '衝突：保留本機', merge: '衝突：合併', create: '建立' }
const timeOf = (at) => {
  const d = new Date(Number(at))
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 點豆寫入紀錄：三家店的盤點文件最近被誰、怎麼寫過（文件裡的 _writeLog）。
 * 資料不見時來這裡查是哪一筆。只讀，不寫任何東西。
 */
export default function BeanWriteLog() {
  const [store, setStore] = useState('central')
  const [logs, setLogs] = useState({})
  const me = getDeviceStamp()

  useEffect(() => {
    const stops = STORES.map(([id]) =>
      onSnapshot(
        doc(db, 'settings', `coffeeBeanInventory_${id}`),
        (snap) => setLogs((prev) => ({ ...prev, [id]: Array.isArray(snap.data()?._writeLog) ? snap.data()._writeLog : [] })),
        () => setLogs((prev) => ({ ...prev, [id]: null }))
      )
    )
    return () => stops.forEach((stop) => stop())
  }, [])

  const log = logs[store]
  return (
    <section className="card wlog">
      <div className="hd">
        <h2>點豆寫入紀錄</h2>
        <small>誰、什麼時候、怎麼寫過盤點</small>
      </div>
      <div className="tabs" role="group" aria-label="分店">
        {STORES.map(([id, name]) => (
          <button key={id} type="button" aria-pressed={store === id} onClick={() => setStore(id)}>
            {name}
          </button>
        ))}
      </div>
      {log === undefined ? (
        <p className="quiet">讀取中…</p>
      ) : log === null ? (
        <p className="quiet">讀不到這家店的紀錄，請確認網路。</p>
      ) : log.length === 0 ? (
        <p className="quiet">還沒有紀錄。從 2026/10/4 這版開始記，之後有人盤點就會出現。</p>
      ) : (
        <ol>
          {[...log].reverse().map((e, i) => {
            const older = log[log.length - 2 - i]
            const drop = older && Number(e.cells) < Number(older.cells)
            return (
              <li key={`${e.at}-${i}`}>
                <time>{timeOf(e.at)}</time>
                <b className={e.action === 'reset' ? 'bad' : ''}>
                  {ACTIONS[e.action] || e.action}
                  {e.times > 1 ? ` ×${e.times}` : ''}
                </b>
                <span>
                  {e.device}
                  {e.device === me ? '（這台）' : ''}・{e.page === 'club' ? 'Club 版' : '新版'}
                  {e.auto ? <em className="bad">・其中 {e.auto} 次不是人按的</em> : null}
                </span>
                <i className={drop ? 'bad' : ''}>{e.cells} 格</i>
              </li>
            )
          })}
        </ol>
      )}
      <p className="note">
        「格」是當時有填數字的格數；比上一筆少的會標紅，那一筆就是資料被清掉或蓋掉的時候。每家店最多留 30 筆，同一台連續編輯算一筆（×次數）。標「不是人按的」表示那次修改發生時沒有人在點按或打字，是程式自己改的，看到請截圖給開發者。裝置代號是每個瀏覽器隨機產生的，清掉網站資料會換新的。
      </p>
    </section>
  )
}
