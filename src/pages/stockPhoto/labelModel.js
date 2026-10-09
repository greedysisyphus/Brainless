// 倉庫標籤：拍完貨架後在照片上貼品項標籤。這裡只放純資料與換算（畫面與匯出共用，可單獨測試）。
// 位置 x、y 是照片寬高的比例（0–1，標籤中心）；size 是字高占照片寬度的比例，換照片尺寸也不會跑掉。

export const STYLES = [
  { id: 'white', name: '白底', fill: '#ffffff', text: '#1c1914', shadow: true },
  { id: 'black', name: '黑底', fill: '#141210', text: '#ffffff', shadow: true },
  { id: 'veil', name: '半透明', fill: 'rgba(24, 18, 14, 0.74)', text: '#ffffff' },
  { id: 'plum', name: '紫', fill: '#4f2d55', text: '#ffffff', shadow: true },
  // 有意思的顏色：黃＝注意、紅＝缺貨／不要動
  { id: 'yellow', name: '黃', fill: '#ffd84a', text: '#1c1914', shadow: true },
  { id: 'red', name: '紅', fill: '#d6303f', text: '#ffffff', shadow: true },
]
export const styleOf = (id) => STYLES.find((s) => s.id === id) || STYLES[0]

export const SIZE_MIN = 0.008
export const SIZE_MAX = 0.2
export const DEFAULT_SIZE = 0.042
export const CROSS_COLOR = '#ec3b5a'

/**
 * 標籤框的比例（單位：字高 em）。畫面上的 CSS 與匯出的 canvas 用同一組數字，看到的就是存下來的。
 * 直排是照片裡「小蓋」「大蓋」那種直立的膠囊：左右窄、上下留多一點、兩頭全圓。
 */
export const METRICS = { padX: 0.62, padY: 0.3, line: 1.28, radius: 0.55, vpadX: 0.46, vpadY: 0.62, vline: 1.1 }
export const padOf = (label) => (label.vertical ? { x: METRICS.vpadX, y: METRICS.vpadY } : { x: METRICS.padX, y: METRICS.padY })
/** 劃掉（✕）的邊長是 size 的幾倍、線寬是邊長的幾分之一 */
export const CROSS_SPAN = 4
export const CROSS_STROKE = 0.085

/**
 * 箭頭：標籤邊上凸出去的小三角，指著是哪一格。label.tail＝朝哪邊（沒有就不畫）。
 * half＝底邊的一半、len＝凸出去多長、lap＝往框裡多伸多少（em）；畫面的 CSS 用同一組數字。
 * lap 是為了不露縫：直排膠囊的頭是圓的，三角貼著圓弧會缺兩個角，伸進去一點才填得滿。
 */
export const TAIL = { half: 0.42, len: 0.55, lap: 0.2 }
const TAIL_DIRS = { down: [0, 1], left: [-1, 0], up: [0, -1], right: [1, 0] }
export const TAIL_NAMES = { down: '↓ 朝下', left: '← 朝左', up: '↑ 朝上', right: '→ 朝右' }
/** 按一下換一個方向：沒有 → 下 → 左 → 上 → 右 → 沒有 */
export function nextTail(tail) {
  const order = Object.keys(TAIL_DIRS)
  return order[order.indexOf(tail) + 1] || null
}
/**
 * 箭頭的五個點：框裡的兩個底角、框邊上的兩個角、尖端。繞的方向跟標籤框一樣（順時針），兩塊疊在一起填色才不會挖洞。
 * 框的中心 cx, cy、寬高 w, h、字高 em，單位隨呼叫的人。
 */
export function tailPoints(tail, cx, cy, w, h, em) {
  const [dx, dy] = TAIL_DIRS[tail]
  const ex = cx + (dx * w) / 2
  const ey = cy + (dy * h) / 2
  const half = TAIL.half * em
  const len = TAIL.len * em
  const lap = TAIL.lap * em
  const side = (k) => [
    [ex + k * dy * half - dx * lap, ey - k * dx * half - dy * lap],
    [ex + k * dy * half, ey - k * dx * half],
  ]
  const [aIn, a] = side(1)
  const [cIn, c] = side(-1)
  return [aIn, a, [ex + dx * len, ey + dy * len], c, cIn]
}
export const FONT_STACK = '"PingFang TC", "Noto Sans TC", "Heiti TC", "Microsoft JhengHei", sans-serif'

/**
 * 快捷標籤。dated＝前面自動帶上目前選的日期（咖啡豆、三明治跟著出貨日走）。
 * 預設清單取自店裡實際標過的照片；自己加的另外存在這台裝置上。
 */
export const DEFAULT_PRESETS = [
  { text: 'ESP', dated: true, group: '日期' },
  { text: 'SW', dated: true, group: '日期' },
  { text: '', dated: true, group: '日期' },
  { text: '大熱杯', group: '杯蓋' },
  { text: '大杯', group: '杯蓋' },
  { text: '小杯', group: '杯蓋' },
  { text: '大蓋', group: '杯蓋' },
  { text: '小蓋', group: '杯蓋' },
  { text: '牛紙 手乳', group: '其他' },
  { text: '客砂', group: '其他' },
  { text: '下週還推車', group: '其他', vertical: true },
  { text: '空', group: '標記', style: 'veil', size: 0.13 },
  { kind: 'cross', text: '劃掉', group: '標記' },
]

/** 記使用次數用的名字：同樣的字，帶日期和不帶日期算兩顆 */
export const presetKey = (p) => (p.kind === 'cross' ? 'cross' : `${p.dated ? 'd:' : ''}${p.text}`)
/** 常用的排前面；次數一樣的維持原本順序 */
export const sortByUse = (items, uses) => [...items].sort((a, b) => (uses[presetKey(b)] || 0) - (uses[presetKey(a)] || 0))

const pad2 = (n) => String(n).padStart(2, '0')
export const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/** 'YYYY-MM-DD' → '9/14'（照片上的寫法，不補零） */
export function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${Number(m[2])}/${Number(m[3])}` : ''
}

/** 往前或往後幾天；跨月、跨年照日曆走 */
export function stepDate(iso, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days)
  return isoOf(d)
}

/** 照片上實際印出來的字：日期 + 品名 + ×數量 */
export function labelText(label) {
  if (label.kind === 'cross') return ''
  const date = label.date ? shortDate(label.date) : ''
  const name = (label.text || '').trim()
  const qty = label.qty > 1 ? `*${label.qty}` : ''
  return [date, `${name}${qty}`].filter(Boolean).join(' ')
}

/**
 * 要畫的每一行。直排就是一個字一行（照片裡「下週還推車」那種）。
 * 橫排有設寬度（wrap，單位 em）時自動換行：中文一個字可以斷，英數字（ESP、9/14、*2）盡量整組不拆。
 * measure(text) → 寬度（em）；畫面和存圖都用 canvas 量，兩邊斷在同一個地方。
 */
export function labelLines(label, measure = roughWidth) {
  const text = labelText(label)
  if (label.vertical) return [...text.replace(/\s+/g, '')]
  const lines = text.split('\n')
  if (!label.wrap) return lines
  return lines.flatMap((line) => wrapLine(line, label.wrap, measure))
}

export function wrapLine(line, maxEm, measure = roughWidth) {
  const tokens = line.match(/[A-Za-z0-9/*.#:+\-]+|\s+|./gu) || ['']
  const out = []
  let cur = ''
  const push = () => {
    out.push(cur.trim())
    cur = ''
  }
  for (const token of tokens) {
    if (measure(cur + token) <= maxEm + 0.001) {
      cur += token
      continue
    }
    if (/^\s+$/.test(token)) {
      push()
      continue
    }
    if (cur.trim()) push()
    // 一組英數字比整行還寬：只好一個字一個字拆
    if (measure(token) > maxEm) {
      for (const ch of token) {
        if (cur && measure(cur + ch) > maxEm + 0.001) push()
        cur += ch
      }
    } else cur = token
  }
  if (cur.trim() || !out.length) push()
  return out
}

export const clamp01 = (v) => Math.min(1, Math.max(0, v))
export const clampSize = (v) => Math.min(SIZE_MAX, Math.max(SIZE_MIN, v))

let seq = 0
export const newId = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`

/** 從快捷標籤或自己打的字做出一個新標籤 */
export function makeLabel(preset, { x = 0.5, y = 0.5, date, style, size, vertical = false } = {}) {
  if (preset.kind === 'cross') {
    return { id: newId(), kind: 'cross', x, y, size: preset.size || 0.045 }
  }
  return {
    id: newId(),
    kind: 'text',
    text: preset.text,
    date: preset.dated ? date || null : null,
    qty: 1,
    style: preset.style || style || 'white',
    size: preset.size || size || DEFAULT_SIZE,
    vertical: Boolean(preset.vertical ?? vertical),
    x,
    y,
  }
}

/**
 * 標籤框的大小（照片寬度的比例）。寬度要量字，所以由呼叫的人給 measure(line) → 該行寬度（em）。
 * 量不到時一個字算 1em、英數算 0.6em，夠用來排下一個標籤的位置。
 */
export function boxOf(label, aspect, measure = roughWidth) {
  if (label.kind === 'cross') {
    const span = label.size * CROSS_SPAN
    return { w: span, h: span * aspect }
  }
  const lines = labelLines(label, measure)
  const lh = label.vertical ? METRICS.vline : METRICS.line
  const pad = padOf(label)
  const wEm = textWidthEm(label, lines, measure) + pad.x * 2
  const hEm = lines.length * lh + pad.y * 2
  return { w: wEm * label.size, h: hEm * label.size * aspect }
}

/** 文字區的寬度（em）。拉過寬度的標籤固定那個寬（跟 Canva 的文字框一樣），沒拉過就跟著字走 */
export function textWidthEm(label, lines, measure = roughWidth) {
  if (label.wrap && !label.vertical) return label.wrap
  return Math.max(1, ...lines.map((l) => measure(l)))
}
export const WRAP_MIN = 1

export function roughWidth(line) {
  let w = 0
  for (const ch of line) w += /[\x20-\x7e]/.test(ch) ? 0.6 : 1
  return w
}

/**
 * 連續加標籤時，下一個放在上一個正下方（照片裡一疊籃子一格一格往下標的樣子）。
 * 超出照片底部就往右挪一欄從上面開始。aspect＝照片寬 / 高。
 */
export function nextSpot(prev, aspect) {
  if (!prev) return { x: 0.5, y: 0.5 }
  const { w, h } = boxOf(prev, aspect)
  const gap = prev.size * 0.35 * aspect
  const y = prev.y + h + gap
  if (y + h / 2 <= 0.98) return { x: prev.x, y }
  return { x: clamp01(prev.x + w + gap / aspect), y: clamp01(0.08 + h / 2) }
}
