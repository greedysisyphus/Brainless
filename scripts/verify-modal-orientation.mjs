/**
 * 驗證 CwModalFrame 版面在 iPad 直向 / 橫向時，footer「儲存設定」皆在視窗內可見。
 * 使用與元件相同的 class 結構（含長內容）做量測。
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const artifactDir = '/opt/cursor/artifacts/modal-orientation'
await mkdir(artifactDir, { recursive: true })

const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --cw-radius-lg: 1rem;
      --cw-border-strong: rgba(23, 23, 23, 0.16);
      --cw-mega-surface: #ffffff;
      --cw-text: #171717;
      --cw-text-muted: #525252;
      --cw-brand: #ec5836;
    }
    body { margin: 0; background: #f7f6f2; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div class="fixed inset-0" style="z-index: 10001">
    <button type="button" class="absolute inset-0 bg-black/70" aria-label="關閉對話框"></button>
    <div class="pointer-events-none fixed inset-0 flex items-center justify-center overflow-y-auto px-4 py-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] sm:py-[max(2.5rem,env(safe-area-inset-top,0px))] sm:pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
      <div
        id="dialog"
        role="dialog"
        aria-modal="true"
        class="pointer-events-auto relative flex max-h-[min(100%,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--cw-radius-lg)] border border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] shadow-2xl"
      >
        <div class="flex shrink-0 gap-4 border-b border-[var(--cw-border-strong)] p-6">
          <div class="min-w-0 flex-1">
            <h2 class="mb-1 text-2xl font-bold text-[var(--cw-text)]">品項設定</h2>
            <p class="text-sm text-[var(--cw-text-muted)]">管理咖啡豆品項和分類（測試店）</p>
          </div>
        </div>
        <div id="body" class="min-h-0 flex-1 overflow-y-auto p-6 [-webkit-overflow-scrolling:touch]">
          ${Array.from({ length: 40 }, (_, i) => `<div class="mb-3 rounded border border-black/10 p-4">品項列 ${i + 1} — 長內容用來模擬多品項捲動</div>`).join('')}
        </div>
        <div id="footer" class="shrink-0 border-t border-[var(--cw-border-strong)] bg-[var(--cw-mega-surface)] p-6">
          <div class="flex flex-wrap items-center justify-end gap-3">
            <button type="button" class="rounded-lg border px-4 py-2">取消</button>
            <button id="save" type="button" class="rounded-lg bg-[var(--cw-brand)] px-4 py-2 text-white">儲存設定</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

const viewports = [
  { name: 'ipad-mini-portrait', width: 744, height: 1133 },
  { name: 'ipad-mini-landscape', width: 1133, height: 744 },
  { name: 'ipad-air-portrait', width: 820, height: 1180 },
  { name: 'ipad-air-landscape', width: 1180, height: 820 },
  // Safari 工具列佔高後的較矮橫向
  { name: 'ipad-landscape-chrome-short', width: 1133, height: 680 },
  { name: 'ipad-portrait-chrome-short', width: 744, height: 980 },
]

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const results = []
let failed = false

for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  await page.setContent(html, { waitUntil: 'networkidle' })
  // Tailwind CDN 編譯完再量測
  await page.waitForTimeout(800)

  const metrics = await page.evaluate(() => {
    const dialog = document.getElementById('dialog')
    const footer = document.getElementById('footer')
    const save = document.getElementById('save')
    const body = document.getElementById('body')
    const d = dialog.getBoundingClientRect()
    const f = footer.getBoundingClientRect()
    const s = save.getBoundingClientRect()
    const b = body.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    const footerFullyVisible = f.top >= 0 && f.bottom <= vh + 0.5 && f.left >= 0 && f.right <= vw + 0.5
    const saveFullyVisible = s.top >= 0 && s.bottom <= vh + 0.5 && s.width > 0 && s.height > 0
    const dialogWithinViewport = d.top >= -0.5 && d.bottom <= vh + 0.5
    const bodyCanScroll = body.scrollHeight > body.clientHeight + 1
    return {
      viewport: { w: vw, h: vh },
      dialog: { top: d.top, bottom: d.bottom, height: d.height },
      footer: { top: f.top, bottom: f.bottom, height: f.height },
      save: { top: s.top, bottom: s.bottom, height: s.height },
      body: { height: b.height, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight },
      footerFullyVisible,
      saveFullyVisible,
      dialogWithinViewport,
      bodyCanScroll,
    }
  })

  const ok = metrics.saveFullyVisible && metrics.footerFullyVisible && metrics.dialogWithinViewport
  if (!ok) failed = true

  const shotPath = path.join(artifactDir, `${vp.name}.png`)
  await page.screenshot({ path: shotPath, fullPage: false })

  results.push({ name: vp.name, ok, ...metrics, screenshot: shotPath })
  await page.close()
}

await browser.close()

console.log(JSON.stringify(results, null, 2))
if (failed) {
  console.error('\nFAIL: 有視窗方向看不到儲存鍵')
  process.exit(1)
}
console.log('\nPASS: 直向與橫向皆可看到儲存設定')
