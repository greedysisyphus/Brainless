// 倉庫標籤的自動保存：照片和標籤存在這台裝置的瀏覽器（IndexedDB），不上傳。
// 切去 LINE 分享時 iPhone 常在背景把 Safari 重新載入，沒存的話回來就全不見了。
// 照片檔只在加進來時寫一次（files）；標籤常常在改，另外存一份小的（photos）。
// 存不了（無痕模式、空間滿了）就當作沒有這個功能，不影響使用。

const DB = 'bl-stock'
const KEEP_MS = 2 * 24 * 60 * 60 * 1000 // 兩天前的就清掉

let opening = null
function db() {
  if (opening) return opening
  opening = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'))
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('files', { keyPath: 'id' })
      req.result.createObjectStore('photos', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  opening.catch(() => {
    opening = null
  })
  return opening
}

function run(stores, mode, fn) {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const tx = d.transaction(stores, mode)
        const out = fn(tx)
        tx.oncomplete = () => resolve(out?.result ?? out)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
  )
}

/** 新加的照片：存檔案本身 */
export function saveFile(id, blob) {
  return run(['files'], 'readwrite', (tx) => tx.objectStore('files').put({ id, blob })).catch(() => {})
}

/** 目前的照片清單（順序、尺寸、標籤）；不在清單裡的一併刪掉 */
export function saveList(photos) {
  const now = Date.now()
  return run(['files', 'photos'], 'readwrite', (tx) => {
    const list = tx.objectStore('photos')
    const files = tx.objectStore('files')
    const keep = new Set(photos.map((p) => p.id))
    photos.forEach((p, order) => list.put({ id: p.id, name: p.name, w: p.w, h: p.h, labels: p.labels, order, savedAt: now }))
    list.getAllKeys().onsuccess = (e) => {
      e.target.result.forEach((id) => {
        if (!keep.has(id)) {
          list.delete(id)
          files.delete(id)
        }
      })
    }
  }).catch(() => {})
}

/** 讀回上次的照片；過期的順手清掉。回傳 [{ id, name, w, h, labels, blob }] */
export async function loadSaved() {
  try {
    const [rows, files] = await run(['files', 'photos'], 'readonly', (tx) => {
      const a = tx.objectStore('photos').getAll()
      const b = tx.objectStore('files').getAll()
      return {
        get result() {
          return [a.result, b.result]
        },
      }
    })
    const blobs = new Map(files.map((f) => [f.id, f.blob]))
    const fresh = rows.filter((r) => Date.now() - r.savedAt < KEEP_MS && blobs.get(r.id))
    const stale = rows.filter((r) => !fresh.includes(r)).map((r) => r.id)
    if (stale.length) {
      run(['files', 'photos'], 'readwrite', (tx) => {
        stale.forEach((id) => {
          tx.objectStore('photos').delete(id)
          tx.objectStore('files').delete(id)
        })
      }).catch(() => {})
    }
    return fresh.sort((a, b) => a.order - b.order).map((r) => ({ id: r.id, name: r.name, w: r.w, h: r.h, labels: r.labels || [], blob: blobs.get(r.id) }))
  } catch {
    return []
  }
}

export function clearSaved() {
  return run(['files', 'photos'], 'readwrite', (tx) => {
    tx.objectStore('files').clear()
    tx.objectStore('photos').clear()
  }).catch(() => {})
}
