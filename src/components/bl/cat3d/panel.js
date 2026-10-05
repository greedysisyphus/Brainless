// 調整面板：依參數表長出滑桿，加一顆「恢復原廠設定」。原生 DOM，測試頁和首頁共用。
// 這個檔案不能 import 引擎：首頁會直接載入它，引擎（含 Three.js）要留在另外一包。參數表從 cat.params 拿。

// keys：要顯示哪些參數（預設全部）。storageKey：調過的值存在 localStorage 的哪個名字底下
export function buildPanel(cat, el, { keys = cat.params.map((p) => p[0]), storageKey } = {}) {
  const store = () => { try { localStorage.setItem(storageKey, JSON.stringify(cat.changed())) } catch {} } // 存不了就算了，只是下次要重調
  const rows = []
  for (const [k, label, min, max, step] of cat.params.filter((p) => keys.includes(p[0]))) {
    const row = document.createElement('label'), input = Object.assign(document.createElement('input'), { type: 'range', min, max, step }), out = document.createElement('output')
    const show = () => { input.value = cat.val(k); out.textContent = input.value }
    input.addEventListener('input', () => { cat.set(k, input.value); out.textContent = input.value; store() })
    row.append(Object.assign(document.createElement('span'), { textContent: label }), input, out)
    el.append(row)
    rows.push(show)
    show()
  }
  const reset = Object.assign(document.createElement('button'), { type: 'button', textContent: '恢復原廠設定' })
  reset.addEventListener('click', () => { cat.reset(); rows.forEach((show) => show()); store() })
  el.append(Object.assign(document.createElement('div'), {}))
  el.lastChild.append(reset)
}
