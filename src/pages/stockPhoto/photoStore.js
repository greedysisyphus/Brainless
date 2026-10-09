// 照片原檔放在這台裝置的 IndexedDB：手機切去 LINE 再回來、頁面被重新載入時還找得回來。
// 標籤是小資料，另外放 localStorage。存不了（無痕模式）就當沒這回事，只是重新載入後照片不會回來。
const STORE = 'files'

const open = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open('bl-stock', 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

async function run(mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req?.result)
    tx.onerror = tx.onabort = () => reject(tx.error)
  }).finally(() => db.close())
}

export const putFile = (id, file) => run('readwrite', (s) => s.put(file, id)).catch(() => {})
export const delFile = (id) => run('readwrite', (s) => s.delete(id)).catch(() => {})
export const getFile = (id) => run('readonly', (s) => s.get(id)).catch(() => null)
/** 只留這幾張，其他沒人要的清掉 */
export const pruneFiles = (ids) =>
  run('readwrite', (s) => {
    const req = s.getAllKeys()
    req.onsuccess = () => req.result.forEach((k) => ids.includes(k) || s.delete(k))
  }).catch(() => {})
