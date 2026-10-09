import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import treeImg from '../../assets/cat-tree.webp'
import sleepImg from '../../assets/cat-sleep.webp'
import sitImg from '../../assets/cat-sit.webp'
import flyImg from '../../assets/cat-butterfly.webp'
import stillImg from '../../assets/cat-still.webp'
import '../../styles/meter-cat.css'

// 忙碌量尺上的水彩貓和水彩樹。樹（公司標誌那三棵樹，畫成水彩）種在今天的位置上，中間那棵的樹幹就是精確的位置；
// 貓從左邊走過來，在樹旁邊做事：撲樹、跳上去被彈飛、睡在樹旁或樹頂、來回踱步。今天多忙，牠做的事也不一樣。
// 貓是 2D 的紙偶（cat3d/paper.js，進到有這個元件的頁面才下載），在一塊小畫布裡原地做動作，這裡管牠人在哪、接下來做什麼；
// 走、跑的時候畫布照牠的步伐移動，腳才不會在地上滑。睡覺是另外一張蜷著睡的圖。

const EASE_OUT = 'cubic-bezier(0.2, 0.7, 0.3, 1)'
const EASE_IN = 'cubic-bezier(0.6, 0, 0.9, 0.5)'
// 今天多忙：怎麼走過來（動作、比原速快幾倍）、在樹旁邊做什麼（越前面的越常做）、每件事中間隔多久（秒）
const MOODS = {
  輕鬆: { gait: ['Walk', 1.2], gap: [0.8, 2], acts: ['sit', 'sit', 'stretch', 'napBeside', 'napBeside', 'napOnTree', 'sniffTick', 'stroll', 'bat', 'butterfly', 'leafHit'] },
  普通: { gait: ['Walk', 1.5], gap: [0.8, 2], acts: ['sit', 'stretch', 'sniffTick', 'stroll', 'bat', 'pounce', 'pounce', 'napBeside', 'bounce', 'napOnTree', 'butterfly', 'leafHit', 'flip'] },
  忙: { gait: ['Walk', 2], gap: [0.5, 1.4], acts: ['pace', 'pace', 'pounce', 'bounce', 'bounce', 'bat', 'stretch', 'zoomies', 'flip'] },
  爆: { gait: ['Gallop', 1], gap: [0.3, 0.9], acts: ['pace', 'pace', 'bounce', 'bounce', 'zoomies', 'zoomies', 'pounce', 'flip'] },
}
// 深夜到清晨（23–5 點）而且不忙的時候，牠多半在睡
const NIGHT = ['napBeside', 'napBeside', 'napBeside', 'napOnTree', 'stretch']
const LEAVES = ['#b5743f', '#3f8f86', '#e0a63a'] // 三棵樹的顏色
// 貓和樹的大小、各自的邊框多粗（px，0 是沒有）、邊框的顏色。測試頁（/home/cat-meter）的滑桿調過的話記在這台裝置上，首頁測試版也會照著用
export const METER_CAT_KEY = 'bl-meter-cat'
export const METER_CAT_SIZE = { cat: 22, tree: 20, edge: 0, treeEdge: 0, color: '#2a211c', solid: true, fill: '#2a211c', eye: '#f2d06b' } // solid：貓畫成純色剪影（fill 是顏色；eye 是眼睛的顏色，'googly' 是活動眼，空字串就沒有眼睛）
export function meterCatSize() {
  try { return { ...METER_CAT_SIZE, ...JSON.parse(localStorage.getItem(METER_CAT_KEY)) } } catch { return METER_CAT_SIZE }
}
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const between = ([lo, hi]) => (lo + Math.random() * (hi - lo)) * 1000

/**
 * value：今天在量尺上的位置（0–100），還沒有資料給 null；level：輕鬆／普通／忙／爆；soon：下一班飛機快到了，牠會警覺起來。
 * 要放在一個 position: relative、上緣就是量尺那條線的容器裡。ref 上有 do(名字) 可以叫牠馬上做某件事（測試頁用）。
 */
const MeterCat = forwardRef(function MeterCat({ value, level, soon = false, size = meterCatSize() }, ref) {
  const rootRef = useRef(null)
  const boxRef = useRef(null)
  const treeRef = useRef(null)
  const shadeRef = useRef(null)
  const sayRef = useRef(null)
  const soonRef = useRef(soon)
  const api = useRef({})
  const want = useRef(null)
  const edge = useRef([size.edge, size.color])
  const look = useRef([size.solid ? size.fill : null, size.eye])
  useImperativeHandle(ref, () => ({ do: (name) => api.current.act?.(name) }), [])

  useEffect(() => {
    const root = rootRef.current
    const box = boxRef.current
    const tree = treeRef.current
    const shade = shadeRef.current // 貓腳下的影子：只跟著左右走，貓離地越高越淡
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const SIZE = box.offsetWidth, TREE_H = tree.offsetHeight // 大小都在 meter-cat.css（--cat、--tree），這裡照量到的算
    const canvas = document.createElement('canvas')
    box.prepend(canvas)
    const say = (text) => window.dispatchEvent(new CustomEvent('bl-meter-cat-status', { detail: text })) // 試作頁會把這句話顯示出來
    say('載入中…')
    let gone = false
    let cat = null
    let run = 0     // 每開始一件新的事就加一：舊的那件事做到一半發現號碼變了就收手
    let timer = 0
    let home = null // 貓平常站的位置（畫布左緣，px）：樹的左邊，臉朝著樹
    let mood = MOODS.普通
    const wait = (ms) => new Promise((ok) => (timer = setTimeout(ok, ms)))
    const where = () => { const [x = 0, y = 0] = getComputedStyle(box).translate.split(' ').map(parseFloat); return [x || 0, y || 0] }
    const face = (right) => cat.face(right ? 90 : -90)
    // 頭上冒一個小字（喵、哼、!），一下就消失
    const speak = (text) => {
      const el = sayRef.current
      el.textContent = text
      el.getAnimations().forEach((a) => a.cancel())
      el.animate([{ opacity: 0, translate: '-50% 3px' }, { opacity: 1, translate: '-50% 0', offset: 0.15 }, { opacity: 1, translate: '-50% 0', offset: 0.75 }, { opacity: 0, translate: '-50% -4px' }], { duration: 1300 })
    }
    // 樹上掉葉子：從樹冠飄到地上（to 有給的話飄到那個位置，[x, y]）
    const leaf = (n = 1, to = null) => {
      let last = null
      for (let i = 0; i < n; i += 1) {
        const el = document.createElement('b')
        el.className = 'mc-leaf'
        el.style.background = pick(LEAVES)
        root.append(el)
        const x = treeX() + (Math.random() - 0.5) * tree.offsetWidth * 0.6
        const [tx, ty] = to ?? [x + (Math.random() - 0.5) * 16, -1]
        last = el.animate([
          { translate: `${x}px ${-TREE_H * 0.75}px`, rotate: '0deg', opacity: 1 },
          { translate: `${(x + tx) / 2 + 3}px ${(-TREE_H * 0.75 + ty) / 2}px`, rotate: '150deg', opacity: 1, offset: 0.55 },
          { translate: `${tx}px ${ty}px`, rotate: '250deg', opacity: to ? 1 : 0 },
        ], { duration: 1000 + Math.random() * 500, delay: i * 130, easing: 'ease-in', fill: 'backwards' })
        last.finished.then(() => el.remove(), () => el.remove())
      }
      return last.finished.catch(() => {})
    }
    // 看不到的時候（捲出畫面、切到別的分頁）不畫，省電；牠的行程照走，看得到了再接著畫
    let seen = true
    const draw = () => cat?.awake(seen && box.dataset.pose === 'up')
    const watch = new IntersectionObserver(([e]) => { seen = e.isIntersecting && !document.hidden; draw() })
    watch.observe(tree)
    const shown = () => { seen = !document.hidden; draw() }
    document.addEventListener('visibilitychange', shown)
    // 頁面在大螢幕上會整個縮小一點（zoom）：畫面上量到的距離要除以這個倍率，才是這裡擺位置用的單位
    const zoom = () => root.getBoundingClientRect().width / root.offsetWidth || 1
    const play = (name, speed = 1, once = false) => { box.dataset.pose = 'up'; draw(); cat.speed(speed); cat.play(name, once) }
    const asleep = () => { box.dataset.pose = 'sleep'; draw() } // 換成蜷著睡的那張圖，紙偶先不畫
    const sat = (away = false) => { box.classList.toggle('away', away); box.dataset.pose = 'sit'; draw() } // 換成坐著的那張圖（away：背對著樹）
    const lift = (y) => String(Math.max(0.25, 1 + parseFloat(y || 0) / 70))
    // 直接把貓放到某個位置（"x y"）
    const place = (t) => {
      const [x, y] = t.split(' ')
      box.style.translate = t
      shade.style.translate = `${x} 0px`
      shade.style.opacity = lift(y)
    }
    // 把貓從現在的位置移過去，到了就把位置定下來。影子跟著走
    const glide = async (frames, options) => {
      const anim = box.animate(frames, { fill: 'forwards', ...options })
      const under = shade.animate(frames.map((f) => {
        const [x, y] = f.translate.split(' ')
        const k = { translate: `${x} 0px`, opacity: lift(y) }
        if (f.easing) k.easing = f.easing
        return k
      }), { fill: 'forwards', ...options })
      await anim.finished
      for (const a of [anim, under]) { a.commitStyles(); a.cancel() }
    }
    const treeX = () => tree.offsetLeft + tree.offsetWidth * 0.484 // 中間那棵的樹幹
    const go = async (to, [gait, hurry] = ['Walk', 1.5]) => {
      const [from] = where()
      if (Math.abs(to - from) < 1.5) return
      face(to >= from)
      play(gait, hurry)
      await glide([{ translate: `${from}px 0px` }, { translate: `${to}px 0px` }], { duration: (Math.abs(to - from) / (cat.pace(gait) * hurry * SIZE)) * 1000 })
    }
    const hop = async (to, top, ms = 440) => { // 跳一個拋物線到 (to, top)
      const [x, y] = where()
      face(to >= x)
      play('Jump_ToIdle', 1.6, true)
      cat.jolt((Math.random() - 0.5) * 4, 5)
      await glide([{ translate: `${x}px ${y}px`, easing: EASE_OUT }, { translate: `${(x + to) / 2}px ${Math.min(y, top) - SIZE * 0.3}px`, easing: EASE_IN }, { translate: `${to}px ${top}px` }], { duration: ms })
    }
    const onTree = () => [treeX() - SIZE / 2, -TREE_H * 0.74]

    const acts = {
      // 低頭聞聞樹下
      async sniff() { play(pick(['Idle_2_HeadLow', 'Eating'])); await wait(cat.length('Eating') * 1000 * 1.6) },
      // 走到量尺的某個刻度旁邊，低頭聞一下那個字，再走回來
      async sniffTick(me) {
        const ticks = [...root.parentElement.querySelectorAll(':scope > i')].map((i) => i.offsetLeft).filter((x) => Math.abs(x - treeX()) > SIZE && Math.abs(x - treeX()) < 170)
        if (!ticks.length) return acts.sniff()
        await go(pick(ticks) - SIZE * 0.85, ['Walk', 1.2])
        if (me !== run) return
        face(true)
        play('Idle_2_HeadLow')
        await wait(2400)
        if (me === run) await go(home, ['Walk', 1.2])
      },
      // 原地跳高，拍一下正上方的數字，數字被拍得跳一下
      async bat(me) {
        // 找最近的那個數字，先走到它正下方，再跳到頭頂剛好碰到數字的高度
        const k = zoom(), frame = root.getBoundingClientRect()
        const spot = (el) => { const r = el.getBoundingClientRect(); return { el, left: (r.left - frame.left) / k, right: (r.right - frame.left) / k, bottom: (r.bottom - frame.top) / k } }
        const mid = where()[0] + SIZE / 2
        const reach = (n) => Math.max(n.left - mid, mid - n.right, 0)
        const hit = [...(root.closest('.today')?.querySelectorAll('.stats b') ?? [])].map(spot).sort((a, b) => reach(a) - reach(b))[0]
        if (hit && reach(hit) > 150) return acts.stretch() // 太遠就算了
        const x = hit ? Math.max(hit.left + 4, Math.min(hit.right - 4, mid)) - SIZE / 2 : where()[0]
        const top = hit ? Math.min(-6, hit.bottom + SIZE * 0.586 - 6) : -SIZE * 1.5 // 站著的時候頭頂在線上方 0.586 個身長；再多跳 6px，頭才真的頂到字（字的框下面有一點空白）
        await go(x, ['Walk', 1.4])
        if (me !== run) return
        face(true)
        play('Jump_ToIdle', 1.6, true)
        cat.jolt(0, 5)
        await wait(160)
        if (me !== run) return
        const ms = 150 + Math.sqrt(-top) * 16
        await glide([{ translate: `${x}px 0px` }, { translate: `${x}px ${top}px` }], { duration: ms, easing: EASE_OUT })
        hit?.el.animate([{ translate: '0 0' }, { translate: '0 -4px', rotate: '-2deg' }, { translate: '0 0' }], { duration: 360, easing: 'ease-out' })
        if (me !== run) return
        await glide([{ translate: `${x}px ${top}px` }, { translate: `${x}px 0px` }], { duration: ms, easing: EASE_IN })
        if (me === run) await go(home, ['Walk', 1.4])
      },
      // 伸懶腰：前腳往前趴、屁股翹起來，整隻拉長，撐一下再站回來（動作資料裡沒有伸懶腰，用低頭的動作加上把整隻壓扁拉長湊的）
      async stretch() {
        play('Idle_2_HeadLow', 0.6)
        const pose = { scale: '1.16 0.86', rotate: '7deg' }
        await box.animate([{ scale: '1 1', rotate: '0deg' }, { ...pose, offset: 0.35 }, { ...pose, offset: 0.75 }, { scale: '1 1', rotate: '0deg' }], { duration: 2200, easing: 'ease-in-out' }).finished.catch(() => {})
      },
      // 坐下來看著樹發呆
      async sit() { sat(); await wait(4000 + Math.random() * 5000) },
      // 沿著線散步一小段再回來
      async stroll(me) {
        await go(home - SIZE * (1 + Math.random() * 1.5), ['Walk', 1.1])
        if (me !== run) return
        play('Idle_2')
        await wait(1200 + Math.random() * 1500)
        if (me === run) await go(home, ['Walk', 1.1])
      },
      // 東張西望
      async look() { play('Idle_2'); await wait(cat.length('Idle_2') * 1000) },
      // 撲樹：往前撲兩下，樹被撞得晃
      async pounce(me) {
        await go(home + SIZE * 0.12)
        if (me !== run) return
        face(true)
        play('Attack')
        tree.classList.add('shake')
        leaf(2)
        await wait(cat.length('Attack') * 2000)
        tree.classList.remove('shake')
        if (me === run) await go(home)
      },
      // 在樹旁邊蜷起來睡
      async napBeside(me) {
        sat() // 先坐下來，再趴下去睡；醒了先坐起來，伸個懶腰才站回去
        await wait(1400)
        if (me !== run) return
        asleep()
        await wait(9000 + Math.random() * 9000)
        if (me !== run) return
        sat()
        await wait(1100)
        if (me === run) await acts.stretch()
      },
      // 跳到樹頂上睡，樹被壓得矮一點
      async napOnTree(me) {
        const [x, top] = onTree()
        await hop(x, top)
        if (me !== run) return
        tree.classList.add('heavy')
        leaf(1)
        asleep()
        await wait(9000 + Math.random() * 9000)
        tree.classList.remove('heavy')
        if (me !== run) return
        await hop(home, 0, 400)
      },
      // 跳上樹頂踩一下，樹被踩扁再彈起來把貓彈飛；貓翻一圈摔在旁邊，愣一下，再走回來
      async bounce(me) {
        const [x, top] = onTree()
        await hop(x, top)
        if (me !== run) return
        tree.animate([{ scale: '1 1' }, { scale: '1.2 0.55', offset: 0.3 }, { scale: '0.92 1.18', offset: 0.6 }, { scale: '1 1' }], { duration: 560, easing: 'ease-out' })
        leaf(3)
        await glide([{ translate: `${x}px ${top}px` }, { translate: `${x}px ${top * 0.55}px` }], { duration: 160, easing: 'ease-in' }) // 跟著樹一起被壓下去
        if (me !== run) return
        const land = home - SIZE * (0.5 + Math.random() * 0.6)
        window.dispatchEvent(new CustomEvent('bl-meter-cat', { detail: 'bounce' })) // 讓首頁那顆大頭知道：牠會看過來
        play('Idle_HitReact2')
        cat.jolt(8, -8)
        box.style.transformOrigin = '50% 50%' // 在空中繞著身體中間翻，不是繞著腳
        await glide([
          { translate: `${x}px ${top * 0.55}px`, rotate: '0deg', easing: EASE_OUT },
          { translate: `${(x + land) / 2}px ${top - SIZE * 0.9}px`, rotate: '-200deg', easing: EASE_IN },
          { translate: `${land}px 0px`, rotate: '-360deg' },
        ], { duration: 820 })
        box.style.rotate = '0deg'
        box.style.transformOrigin = ''
        if (me !== run) return
        play('Idle_HitReact1') // 摔在地上愣一下
        await wait(cat.length('Idle_HitReact1') * 1000)
        if (me === run) await go(home)
      },
      // 下一班飛機快到了：嚇一跳，然後東張西望
      async alert(me) {
        speak('!')
        await hop(where()[0], 0, 320)
        if (me !== run) return
        face(true)
        play('Idle_2')
        await wait(1600)
      },
      // 忙到暴衝：沿著線衝出去再衝回來
      async zoomies(me) {
        await go(Math.max(0, home - 180), ['Gallop', 1.3])
        if (me !== run) return
        await go(home + SIZE * 0.1, ['Gallop', 1.3])
        if (me === run) await go(home)
      },
      // 一片葉子掉在頭上：愣住，抬頭找是誰
      async leafHit(me) {
        await leaf(1, [home + SIZE * 0.78, -SIZE * 0.5])
        if (me !== run) return
        play('Idle_HitReact1')
        cat.jolt(0, 6)
        speak('?')
        await wait(cat.length('Idle_HitReact1') * 1000)
        if (me !== run) return
        play('Idle_2')
        await wait(1400)
      },
      // 一隻蝴蝶飛過來停在頭上方，貓跳起來撲兩次都沒撲到，蝴蝶飛走，貓坐下來看著牠飛遠
      async butterfly(me) {
        const el = document.createElement('b')
        el.className = 'mc-fly'
        el.append(Object.assign(new Image(), { src: flyImg, alt: '' }))
        root.append(el)
        const at = (x, y, opacity = 1) => ({ translate: `${x}px ${y}px`, opacity })
        const fly = (frames, ms) => el.animate(frames, { duration: ms, fill: 'forwards', easing: 'ease-in-out' }).finished.catch(() => {})
        const cx = home + SIZE * 0.85, up = -SIZE * 1.1
        await fly([at(cx + 90, -SIZE * 2.4, 0), at(cx + 34, up - 10), at(cx, up)], 1900)
        for (let i = 0; i < 2 && me === run; i += 1) {
          play('Idle_2')
          await wait(450)
          if (me !== run) break
          fly([at(cx, up), at(cx + (i ? 7 : -7), up - 11), at(cx, up)], 520)
          await hop(where()[0], 0, 420)
        }
        if (me === run) {
          fly([at(cx, up), at(cx - 40, up - 14), at(home - 110, -SIZE * 2.8, 0)], 1900).then(() => el.remove())
          sat(true)
          await wait(2400)
        }
      },
      // 原地後空翻
      async flip(me) {
        const [x] = where()
        play('Jump_ToIdle', 1.6, true)
        box.style.transformOrigin = '50% 50%'
        await glide([
          { translate: `${x}px 0px`, rotate: '0deg', easing: EASE_OUT },
          { translate: `${x}px ${-SIZE * 1.3}px`, rotate: '-180deg', easing: EASE_IN },
          { translate: `${x}px 0px`, rotate: '-360deg' },
        ], { duration: 720 })
        box.style.rotate = '0deg'
        box.style.transformOrigin = ''
        if (me === run) await wait(500)
      },
      // 在樹前面來回踱步
      async pace(me) {
        for (let i = 0; i < 2 && me === run; i += 1) {
          await go(home - SIZE * (0.8 + Math.random() * 0.5), mood.gait)
          if (me !== run) return
          await go(home, mood.gait)
        }
      },
    }
    // 到了之後：站著，隔一陣子做一件事，做完再站回去
    const live = async (me) => {
      while (me === run && !gone) {
        face(true)
        play('Idle')
        await wait(between(mood.gap))
        if (me !== run) return
        const hour = new Date().getHours()
        const sleepy = (hour >= 23 || hour < 5) && (mood === MOODS.輕鬆 || mood === MOODS.普通)
        const name = soonRef.current && Math.random() < 0.35 ? 'alert' : pick(sleepy ? NIGHT : mood.acts)
        await acts[name](me)
      }
    }
    const reset = () => {
      run += 1
      clearTimeout(timer)
      box.getAnimations().forEach((a) => { a.commitStyles(); a.cancel() })
      tree.classList.remove('shake', 'heavy')
      root.querySelectorAll('.mc-fly').forEach((el) => el.remove())
      box.style.rotate = '0deg'
      box.style.scale = '1'
      box.style.transformOrigin = ''
      shade.getAnimations().forEach((a) => a.cancel())
      place(`${where()[0]}px 0px`) // 做到一半被打斷：先落回地上
      return run
    }
    // 樹換位置（或第一次種下去）：貓走到樹的左邊
    api.current.arrive = async (v, lv) => {
      mood = MOODS[lv] ?? MOODS.普通
      root.style.setProperty('--at', `${v}%`)
      root.classList.add('on')
      const spot = () => treeX() - tree.offsetWidth * 0.5 - SIZE * 0.93 + 6
      if (!cat) { // 貓的檔案還沒載好：先放一張靜止的剪影站在樹旁邊，不要只有一棵樹
        home = spot()
        place(`${home}px 0px`)
        box.classList.add('on', 'wait')
        shade.classList.add('on')
        return
      }
      box.classList.remove('wait')
      const first = home == null
      const me = reset()
      home = spot()
      if (first) place(`${Math.max(-SIZE, home - 220)}px 0px`)
      if (calm) { place(`${home}px 0px`); box.classList.add('on'); face(true); play('Idle'); return cat.awake(false) } // 關掉動態：站在樹旁邊不動
      if (first) { // 第一次出場：樹先長出來，貓再從左邊跑進來，一眼就看得出是一隻貓跑到樹旁邊
        await wait(450)
        if (me !== run) return
      }
      box.classList.add('on')
      shade.classList.add('on')
      await go(home, first ? ['Gallop', 1] : mood.gait)
      if (me === run) live(me)
    }
    // 馬上做某件事（測試頁用），做完回到平常的節奏
    api.current.act = async (name) => {
      if (!cat || home == null || !acts[name]) return
      const me = reset()
      await go(home)
      if (me !== run) return
      face(true)
      await acts[name](me)
      if (me === run) live(me)
    }
    // 被點到：喵一聲、原地嚇得跳一下（睡著的話就是被吵醒）。四秒內連點四下就煩了：哼一聲走開，背對著不理人一陣子
    let pokes = []
    let sulkUntil = 0
    const poke = async (tapped = false) => {
      const now = performance.now()
      if (!cat || home == null || calm || now < sulkUntil) return
      pokes = tapped ? [...pokes.filter((t) => now - t < 4000), now] : pokes
      const me = reset()
      if (pokes.length >= 4) {
        pokes = []
        sulkUntil = now + 8000
        speak('哼')
        await go(Math.max(0, home - SIZE * 4), ['Walk', 2.2])
        if (me !== run) return
        sat(true)
        await wait(Math.max(0, sulkUntil - performance.now()))
        if (me !== run) return
        await go(home)
        if (me === run) live(me)
        return
      }
      if (tapped) speak(box.dataset.pose === 'sleep' ? '?' : '喵')
      await hop(where()[0], 0, 380)
      if (me !== run) return
      await go(home)
      if (me === run) live(me)
    }
    // 可以把貓抓起來拖走：被拎著的時候四隻腳亂踢，放手就掉回地上，愣一下再自己走回樹旁邊。沒拖就放開算點一下
    let grab = null
    const down = (e) => {
      if (!cat || home == null || calm) return
      try { box.setPointerCapture(e.pointerId) } catch { /* 抓不到指標也沒關係，只是手指滑出貓外面就跟不上 */ }
      grab = { x: e.clientX, y: e.clientY, from: where(), held: false }
    }
    const moveTo = (e) => {
      if (!grab) return
      const k = zoom(), dx = (e.clientX - grab.x) / k, dy = (e.clientY - grab.y) / k
      if (!grab.held) {
        if (Math.hypot(dx, dy) < 5) return
        grab.held = true
        reset()
        box.classList.add('held')
        play('Gallop', 1.6)
      }
      const x = Math.max(-SIZE * 0.5, Math.min(root.offsetWidth - SIZE * 0.5, grab.from[0] + dx))
      const y = Math.max(-140, Math.min(0, grab.from[1] + dy))
      place(`${x}px ${y}px`)
      cat.jolt(-e.movementX * 0.35, e.movementY * 0.35) // 被拎著甩，眼珠跟著晃
    }
    const up = async (e) => {
      const g = grab
      grab = null
      if (!g) return
      if (!g.held) return e.type === 'pointerup' ? poke(true) : undefined
      box.classList.remove('held')
      const me = ++run
      const [x, y] = where()
      if (y < -1) { // 掉下來：越高掉越久
        play('Jump_ToIdle', 1.6, true)
        await glide([{ translate: `${x}px ${y}px` }, { translate: `${x}px 0px` }], { duration: 90 + Math.sqrt(-y) * 28, easing: 'cubic-bezier(0.5, 0, 1, 0.6)' })
        if (me !== run) return
        if (y < -30) { play('Idle_HitReact1'); await wait(cat.length('Idle_HitReact1') * 1000) } // 摔得比較重，愣一下
      }
      if (me !== run) return
      await go(home, mood.gait)
      if (me === run) live(me)
    }
    const petted = () => { if (box.dataset.pose !== 'sleep' || Math.random() < 0.5) poke() } // 大頭被摸：小貓跟著跳一下（睡著的話有一半機率沒被吵醒）
    window.addEventListener('bl-big-cat', petted)
    box.addEventListener('pointerdown', down)
    box.addEventListener('pointermove', moveTo)
    box.addEventListener('pointerup', up)
    box.addEventListener('pointercancel', up)

    Promise.all([import('./cat3d/paper.js'), import('../../assets/cat-paper-lite.glb?url'), import('../../assets/cat-parts-lite.webp')]) // 精簡版：小小一隻用不到完整的細節，檔案只有四分之一
      .then(([{ createPaperCat }, glb, paint]) => createPaperCat(canvas, { glb: glb.default, paint: paint.default }))
      .then((made) => {
        if (gone) return made.dispose()
        cat = made
        say('已載入')
        cat.play('Idle')
        cat.punch(1.4, 0.88) // 這麼小一隻，水彩的顏色在米色底上太淡：加濃、壓深一點（只有量尺上這隻，大頭不動）
        api.current.edge = (px, color) => cat.outline(px, color)
        api.current.look = (fill, eye) => cat.solid(fill, eye)
        api.current.look(...look.current)
        api.current.edge(...edge.current)
        if (import.meta.env.DEV) window.meterCat = api.current // 開發時在主控台叫牠做事：meterCat.act('bat')
        if (want.current) api.current.arrive(...want.current)
      })
      .catch((error) => {
        // 貓出不來（這台裝置跑不動、或檔案抓不到）：把原本的圓點叫回來，至少看得到今天的位置；原因留給試作頁顯示
        console.error('量尺上的貓載入失敗', error)
        if (gone) return
        root.parentElement?.classList.add('mc-failed')
        say(`失敗：${error?.message || error}`)
      })
    return () => {
      gone = true
      run += 1
      clearTimeout(timer)
      window.removeEventListener('bl-big-cat', petted)
      watch.disconnect()
      document.removeEventListener('visibilitychange', shown)
      box.removeEventListener('pointerdown', down)
      box.removeEventListener('pointermove', moveTo)
      box.removeEventListener('pointerup', up)
      box.removeEventListener('pointercancel', up)
      box.getAnimations().forEach((a) => a.cancel())
      cat?.dispose()
      canvas.remove()
      root.parentElement?.classList.remove('mc-failed')
      api.current = {}
    }
  }, [])

  // 下一班飛機快到了：馬上警覺一下，之後也三不五時張望
  useEffect(() => {
    soonRef.current = soon
    if (soon) api.current.act?.('alert')
  }, [soon])

  useEffect(() => {
    if (value == null) return
    want.current = [value, level]
    api.current.arrive?.(value, level)
  }, [value, level])

  // 貓的邊框是紙偶自己在畫布裡畫的（樹和睡覺的圖用 CSS）
  useEffect(() => {
    edge.current = [size.edge, size.color]
    api.current.edge?.(size.edge, size.color)
  }, [size.edge, size.color])
  useEffect(() => {
    look.current = [size.solid ? size.fill : null, size.eye]
    api.current.look?.(...look.current)
  }, [size.solid, size.fill, size.eye])
  // 把一張圖整張塗成同一個顏色（畫到一張小畫布上，只留有顏料的地方，再存成圖）
  const napRef = useRef(null)
  const stillRef = useRef(null)
  const sitRef = useRef(null)
  useEffect(() => {
    let live = true
    const tint = (el, src, color) => {
      const img = new Image()
      img.onload = () => {
        if (!live) return
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const g = c.getContext('2d')
        g.drawImage(img, 0, 0)
        g.globalCompositeOperation = 'source-in'
        g.fillStyle = color
        g.fillRect(0, 0, c.width, c.height)
        el.src = c.toDataURL()
      }
      img.src = src
    }
    tint(stillRef.current, stillImg, size.fill) // 載入前墊著的那張站姿
    if (size.solid) { tint(napRef.current, sleepImg, size.fill); tint(sitRef.current, sitImg, size.fill) } // 剪影模式：睡覺、坐著那兩張也塗
    else { napRef.current.src = sleepImg; sitRef.current.src = sitImg }
    return () => { live = false }
  }, [size.solid, size.fill])

  return (
    <span className={`mc${size.solid ? ' solid' : ''}`} ref={rootRef} aria-hidden="true" style={{ '--fill': size.fill, '--eye': size.eye === 'googly' ? '#fff' : size.eye || 'transparent', '--cat': `${size.cat}px`, '--tree': `${size.tree}px`, '--edge': `${size.edge}px`, '--tree-edge': `${size.treeEdge}px`, '--edge-color': size.color }}>
      <img className="mc-tree" ref={treeRef} src={treeImg} alt="" />
      <b className="mc-ground" />
      <b className="mc-shade" ref={shadeRef} />
      <span className="mc-cat" ref={boxRef} data-pose="up">
        <b className="mc-say" ref={sayRef} />
        <img className="mc-still" ref={stillRef} alt="" />
        <span className="mc-sit"><img ref={sitRef} src={sitImg} alt="" /><b /></span>
        <span className="mc-nap"><img ref={napRef} src={sleepImg} alt="" /><i>z</i><i>z</i></span>
      </span>
    </span>
  )
})

export default MeterCat
