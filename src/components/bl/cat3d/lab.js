// 立體水彩貓的測試頁。整頁用原生 DOM 組起來，app 裡的路由和獨立的預覽頁共用這一份。
import { createCat } from './engine.js'
import { buildPanel } from './panel.js'

const CSS = `
  .cat-lab { --canvas: #f3f0e8; --surface: #fffdfa; --ink: #1c1914; --muted: #595349; --coral: #c64022; --line: rgba(28, 25, 20, 0.14); }
  .cat-lab, .cat-lab *, .cat-lab *::before, .cat-lab *::after { box-sizing: border-box; }
  .cat-lab { min-height: 100dvh; background: var(--canvas); color: var(--ink); font-family: 'Noto Sans TC', 'PingFang TC', sans-serif; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .cat-lab .wrap { max-width: 1080px; margin: 0 auto; padding: 24px max(16px, env(safe-area-inset-right)) 64px max(16px, env(safe-area-inset-left)); }
  .cat-lab h1 { font-size: 22px; margin: 0 0 2px; }
  .cat-lab h2 { font-size: 14px; margin: 0; grid-column: 1 / -1; }
  .cat-lab p { margin: 0; color: var(--muted); font-size: 14px; }
  .cat-lab .stage { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
  .cat-lab figure { margin: 0; }
  .cat-lab figcaption { font-size: 13px; color: var(--muted); text-align: center; }
  .cat-lab #cat, .cat-lab .stage img { display: block; width: 100%; aspect-ratio: 900 / 863; }
  .cat-lab .stage { align-items: start; }
  .cat-lab #cat { touch-action: pan-y; cursor: grab; }
  .cat-lab #cat:active { cursor: grabbing; }
  .cat-lab .bar, .cat-lab #panel { padding: 12px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; font-size: 14px; }
  .cat-lab .bar { display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: center; }
  .cat-lab .bar label { display: flex; align-items: center; gap: 8px; min-height: 44px; }
  .cat-lab #panel[hidden] { display: none; }
  .cat-lab .bar [hidden], .cat-lab .bar[hidden] { display: none; }
  .cat-lab #fit { margin-top: 12px; }
  .cat-lab #fitNow { font-variant-numeric: tabular-nums; color: var(--muted); }
  .cat-lab #panel { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 4px 24px; margin-top: 12px; }
  .cat-lab #panel label { display: grid; grid-template-columns: 6.5em 1fr 3em; align-items: center; gap: 8px; min-height: 44px; }
  .cat-lab #panel output { text-align: right; font-variant-numeric: tabular-nums; color: var(--muted); }
  .cat-lab #panel div { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
  .cat-lab button { min-height: 44px; min-width: 52px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: inherit; font: inherit; cursor: pointer; }
  .cat-lab button:hover { border-color: var(--ink); }
  .cat-lab :focus-visible { outline: 2px solid var(--coral); outline-offset: 2px; }
  .cat-lab input[type='range'] { width: 100%; min-width: 0; accent-color: var(--coral); }
  .cat-lab .bar input[type='range'] { width: 140px; }
  .cat-lab input[type='checkbox'] { width: 20px; height: 20px; accent-color: var(--coral); }
  .cat-lab ul { margin: 20px 0 0; padding-left: 20px; color: var(--muted); font-size: 14px; }
  .cat-lab #err { color: var(--coral); font-size: 14px; }
  @media (max-width: 640px) { .cat-lab .stage { grid-template-columns: 1fr; } }
`

const HTML = `
<div class="wrap">
  <h1>立體水彩貓</h1>
  <p>貓的瞳孔會先瞄向游標或你手指碰的地方，頭再慢慢跟上。拖曳可以轉一整圈，放開會停在那個角度；按「跟隨游標」回到看著你的狀態。</p>
  <p>摸牠：點一下會瞇眼蹭過來，點鼻子會縮一下，點耳朵會抖耳朵，連點三下會甩頭（馬上再連點三下會生氣炸毛），按住不放會瞇著眼呼嚕。</p>
  <p id="err" role="alert"></p>

  <div class="stage">
    <figure><canvas id="cat" aria-label="可拖曳旋轉的立體水彩貓"></canvas><figcaption>立體版 · <span id="info"></span></figcaption></figure>
    <figure><img id="orig" alt="原始水彩貓頭" /><figcaption>原圖</figcaption></figure>
  </div>

  <div class="bar">
    <span>角度</span>
    <button data-yaw="-35">-35°</button><button data-yaw="0">正面</button><button data-yaw="20">20°</button><button data-yaw="35">35°</button><button data-yaw="90">側面</button><button data-yaw="180">背面</button><button data-yaw="">跟隨游標</button>
    <button id="tilt" hidden>用手機傾斜來轉</button>
    <label><input type="checkbox" id="sway" /> 自動旋轉</label>
    <label><input type="checkbox" id="idle" /> 待機動作</label>
    <label><input type="checkbox" id="only" /> 只看筆觸</label>
    <label>拆開 <input type="range" id="spread" min="0" max="1" step="0.01" value="0" /></label>
    <button id="gear" aria-expanded="false" aria-controls="panel">調整</button>
  </div>

  <div class="bar" id="fit" hidden>
    <span>身體的位置</span>
    <label>左右 <input type="range" data-fit="x" min="-0.6" max="0.6" step="0.01" /></label>
    <label>上下 <input type="range" data-fit="y" min="-1.7" max="-0.5" step="0.01" /></label>
    <label>大小 <input type="range" data-fit="s" min="0.8" max="2" step="0.01" /></label>
    <label>深度 <input type="range" data-fit="z" min="-2.5" max="-0.3" step="0.01" /></label>
    <output id="fitNow"></output>
  </div>

  <div id="panel" class="cat-panel" hidden>
    <h2>調整</h2>
  </div>

  <ul>
    <li>身體是試作：原畫只有頭。身體是另外畫的一張毛球（沒有脖子，頭陷在裡面），整張貼在一個鼓起來的面上，不拆筆觸；轉頭時身體跟著轉一半不到。有身體時頭最多左右轉 32 度。網址加 nobody 可以只看頭、轉一整圈。</li>
    <li>每一筆是一片獨立的小網格，貼在頭的表面上、筆尖翹起來，大小與疏密在整顆頭上一致；重疊的地方由比較上層的那一筆說了算，所以看得出一筆壓著一筆。</li>
    <li>每個像素的顏料濃度，依當下看得到的筆觸分攤。正面時每筆取的都是原圖同一點，所以跟原圖一樣；轉到側面時每筆改用自己展開的那一小塊，不會被曲面拉長。</li>
    <li>待機時會眨眼、呼吸、抖耳朵、鬍鬚輕晃，沒人理牠時偶爾自己瞄別處。背光的那一側疊了一層偏冷的淡彩當陰影。跑不順時會自動調降畫質。</li>
    <li>眼睛拆成眼眶、虹膜、瞳孔、反光、眼皮。眼皮的顏色取自眼睛上方的毛；反光是補畫的白點，固定不跟著瞳孔動。瞳孔是獨立的一片，會在眼眶裡移動，超出眼眶的部分被蓋住；虹膜上原本畫著瞳孔的地方，用四周的黃色補起來（這塊是補畫的）。</li>
    <li>耳朵是獨立的兩片，根部在頭頂的毛後面，往前傾、中間凹；頭和耳朵的筆觸各自只畫自己的範圍。</li>
    <li>後腦、耳背是補的：原圖沒有畫。形狀是把輪廓往後鼓起來，顏色是從正面的紫色毛裡搬過來的小塊：正面是毛的位置就原地延續過去，是臉的位置就把四周的毛往中間收。</li>
    <li>鼻子和嘴巴拆成四層：赭黃色的底、粉色鼻頭、鼻子的深色線、人中與嘴巴的線。鼻頭浮在最前面，待機時會嗅一下：鼻頭撐大、兩塊鬍鬚墊鼓起來、鬍鬚往前張開。嘴巴不會張開，原圖沒有畫口腔。</li>
    <li>推測的部分：頭的隆起、口鼻與耳朵的深度、每一筆的形狀與走向都是重新安排的，不是原作的筆觸。側臉的輪廓（口鼻凸出多少）完全是猜的。</li>
  </ul>
</div>
`

// 把測試頁裝進 root。回傳一個收拾用的函式，離開頁面時要叫
export async function mountLab(root, { src, body, query = '' } = {}) {
  root.className = 'cat-lab'
  root.innerHTML = `<style>${CSS}</style>${HTML}`
  const $ = (id) => root.querySelector('#' + id)
  $('orig').src = src
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem('cat-lab') || '{}') } catch {} // 讀不到（無痕模式等）就當沒存過
  const canvas = $('cat')
  const withBody = body && !new URLSearchParams(query).has('nobody') // 網址加 nobody 就只看頭
  if (withBody) {
    root.querySelectorAll('[data-yaw="90"], [data-yaw="180"], #sway').forEach((el) => ((el.closest('label') || el).hidden = true)) // 有身體時頭轉不到那裡
  }
  let cat
  try {
    cat = await createCat(canvas, {
      src, saved, query, stay: true,
      body: withBody ? body : undefined, turn: withBody ? 32 : Infinity,
      onInfo: (text) => root.contains(canvas) && ($('info').textContent = text),
      onContext: (lost) => root.contains(canvas) && ($('err').textContent = lost ? '瀏覽器把繪圖環境收走了，等它還回來，或重新整理頁面' : ''),
    })
  } catch (e) {
    if (root.contains(canvas)) $('err').textContent = '載入失敗：' + e.message
    console.error(e)
    return () => {}
  }
  // 等引擎準備好的這段時間，同一個 root 可能已經被重新掛過一次（React 開發模式會這樣）。那這一份就作廢
  if (!root.contains(canvas)) { cat.dispose(); return () => {} }

  const sway = $('sway'), idle = $('idle'), only = $('only'), spread = $('spread'), tilt = $('tilt'), gear = $('gear'), panel = $('panel')
  idle.checked = cat.ui.idle
  only.checked = cat.ui.only
  spread.value = cat.ui.spread
  root.querySelectorAll('[data-yaw]').forEach((b) => b.addEventListener('click', () => { sway.checked = false; cat.pin(b.dataset.yaw === '' ? null : Number(b.dataset.yaw)) }))
  sway.addEventListener('input', () => cat.setUi({ sway: sway.checked }))
  idle.addEventListener('input', () => cat.setUi({ idle: idle.checked }))
  only.addEventListener('input', () => cat.setUi({ only: only.checked }))
  spread.addEventListener('input', () => cat.setUi({ spread: Number(spread.value) }))
  $('cat').addEventListener('pointerdown', () => (sway.checked = false)) // 一拖就停止自動旋轉，開關要跟著
  tilt.hidden = !cat.canTilt
  tilt.addEventListener('click', async () => { if (await cat.tilt()) tilt.hidden = true })
  gear.addEventListener('click', () => { panel.hidden = !panel.hidden; gear.setAttribute('aria-expanded', String(!panel.hidden)) })
  buildPanel(cat, panel, { storageKey: 'cat-lab' })
  if (cat.body) { // 身體接在哪裡：拉到順眼為止，把下面那行數字告訴我就能寫成預設值
    const show = (v) => ($('fitNow').textContent = `左右 ${v.x.toFixed(2)}　上下 ${v.y.toFixed(2)}　大小 ${v.s.toFixed(2)}　深度 ${v.z.toFixed(2)}`)
    const now = cat.body({})
    $('fit').hidden = false
    root.querySelectorAll('[data-fit]').forEach((el) => {
      el.value = now[el.dataset.fit]
      el.addEventListener('input', () => show(cat.body({ [el.dataset.fit]: Number(el.value) })))
    })
    show(now)
  }

  if (new URLSearchParams(query).has('step')) { window.catStep = cat.step; window.catState = cat.state } // 測試用
  return () => cat.dispose()
}
