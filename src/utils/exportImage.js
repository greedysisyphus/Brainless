/**
 * 把 canvas 存成 PNG。
 *
 * iPad Safari 不能可靠下載大型 data: URL（`canvas.toDataURL()` 產生的那種）——
 * 點了沒反應，也沒有錯誤。改用 Blob，並在 iOS 上開一個預覽頁讓人用「儲存影像」。
 *
 * `previewWindow` 必須在使用者點擊的當下同步開好再傳進來，等 await 之後才 open
 * 會被 Safari 當成彈出視窗擋掉。
 */

export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 使用者點下去到圖片產生好之間的空白頁，不然會看到一個全白的分頁。 */
export function openImageExportWindow(title) {
  if (!isIOS() || typeof window === 'undefined') return null
  const previewWindow = window.open('', '_blank')
  if (!previewWindow) return null
  previewWindow.document.write(
    `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8" />` +
      `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
      `<title>${escapeHtml(title)}</title></head>` +
      `<body style="margin:0;padding:48px 16px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;` +
      `text-align:center;color:#515154;background:#f5f5f7">產生圖片中…</body></html>`
  )
  previewWindow.document.close()
  return previewWindow
}

export async function saveCanvasAsPng(canvas, fileName, { title = fileName, previewWindow } = {}) {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result)
      else reject(new Error('PNG 圖片轉檔失敗'))
    }, 'image/png')
  })
  const imageUrl = URL.createObjectURL(blob)
  const safeFileName = fileName.replace(/[<>:"/\\|?*]/g, '_')

  if (previewWindow && !previewWindow.closed) {
    const html =
      `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8" />` +
      `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
      `<title>${escapeHtml(safeFileName)}</title><style>` +
      `:root{color-scheme:light}body{margin:0;padding:24px 16px 40px;background:#f5f5f7;color:#1d1d1f;` +
      `font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center}` +
      `main{max-width:960px;margin:0 auto}h1{margin:0 0 8px;font-size:20px}` +
      `p{margin:0 0 18px;color:#515154;line-height:1.5}` +
      `a{display:inline-block;margin:0 0 20px;padding:12px 18px;border-radius:10px;background:#007aff;` +
      `color:#fff;font-weight:600;text-decoration:none}` +
      `img{display:block;width:100%;height:auto;background:#fff;border-radius:12px;` +
      `box-shadow:0 4px 20px rgba(0,0,0,.12)}</style></head><body><main>` +
      `<h1>${escapeHtml(title)}已產生</h1>` +
      `<p>點「下載 PNG」；若 Safari 沒有下載，請點瀏覽器的分享按鈕，再選「儲存影像」。</p>` +
      `<a href="${imageUrl}" download="${escapeHtml(safeFileName)}">下載 PNG</a>` +
      `<img src="${imageUrl}" alt="${escapeHtml(title)}" /></main></body></html>`
    const previewUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    previewWindow.location.replace(previewUrl)
    window.setTimeout(() => {
      URL.revokeObjectURL(previewUrl)
      URL.revokeObjectURL(imageUrl)
    }, 5 * 60 * 1000)
    return
  }

  const link = document.createElement('a')
  link.download = safeFileName
  link.href = imageUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(imageUrl), 60 * 1000)
}
