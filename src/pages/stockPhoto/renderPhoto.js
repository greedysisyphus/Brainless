import { CROSS_COLOR, CROSS_SPAN, CROSS_STROKE, FONT_STACK, METRICS, labelLines, styleOf } from './labelModel'

// 把照片和標籤畫成一張圖。全部在這台裝置上做，照片不會上傳。
// 長邊壓到 MAX_EDGE：iPhone 原圖 4032px 傳到 LINE 也會被壓，太大只是存得慢、傳得慢。
const MAX_EDGE = 2560

export const fontOf = (px) => `700 ${px}px ${FONT_STACK}`

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export function drawLabel(ctx, label, W, H) {
  const cx = label.x * W
  const cy = label.y * H
  if (label.kind === 'cross') {
    const half = (label.size * CROSS_SPAN * W) / 2
    ctx.save()
    ctx.strokeStyle = CROSS_COLOR
    ctx.lineWidth = half * 2 * CROSS_STROKE
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - half, cy - half)
    ctx.lineTo(cx + half, cy + half)
    ctx.moveTo(cx + half, cy - half)
    ctx.lineTo(cx - half, cy + half)
    ctx.stroke()
    ctx.restore()
    return
  }
  const em = label.size * W
  const lines = labelLines(label)
  const lh = (label.vertical ? METRICS.vline : METRICS.line) * em
  ctx.save()
  ctx.font = fontOf(em)
  const textW = Math.max(em, ...lines.map((l) => ctx.measureText(l).width))
  const w = textW + METRICS.padX * 2 * em
  const h = lines.length * lh + METRICS.padY * 2 * em
  const x = cx - w / 2
  const y = cy - h / 2
  const style = styleOf(label.style)
  if (style.shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)'
    ctx.shadowBlur = em * 0.35
    ctx.shadowOffsetY = em * 0.06
  }
  ctx.fillStyle = style.fill
  roundRect(ctx, x, y, w, h, METRICS.radius * em)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = style.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => {
    // 中文字的視覺中心比 middle 基線略高一點，往下補一點才會置中
    ctx.fillText(line, cx, y + METRICS.padY * em + lh * (i + 0.5) + em * 0.04)
  })
  ctx.restore()
}

/** 照片 + 標籤 → 圖檔 Blob。存檔、分享用 JPEG；複製到剪貼簿只能用 PNG */
export async function renderPhoto(photo, type = 'image/jpeg') {
  if (document.fonts?.ready) await document.fonts.ready
  const img = await loadImage(photo.url)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const W = Math.round(img.naturalWidth * scale)
  const H = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, W, H)
  photo.labels.forEach((label) => drawLabel(ctx, label, W, H))
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('圖片轉檔失敗'))), type, 0.9)
  })
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('讀不到這張照片'))
    img.src = url
  })
}
