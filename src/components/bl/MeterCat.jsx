import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import treeImg from '../../assets/cat-tree.webp'
import sleepImg from '../../assets/cat-sleep.webp'
import '../../styles/meter-cat.css'

// 忙碌量尺上的水彩貓和水彩樹。樹（公司標誌那三棵樹，畫成水彩）種在今天的位置上，中間那棵的樹幹就是精確的位置；
// 貓從左邊走過來，在樹旁邊做事：撲樹、跳上去被彈飛、睡在樹旁或樹頂、來回踱步。今天多忙，牠做的事也不一樣。
// 貓是 2D 的紙偶（cat3d/paper.js，進到有這個元件的頁面才下載），在一塊小畫布裡原地做動作，這裡管牠人在哪、接下來做什麼；
// 走、跑的時候畫布照牠的步伐移動，腳才不會在地上滑。睡覺是另外一張蜷著睡的圖。

const EASE_OUT = 'cubic-bezier(0.2, 0.7, 0.3, 1)'
const EASE_IN = 'cubic-bezier(0.6, 0, 0.9, 0.5)'
// 今天多忙：怎麼走過來（動作、比原速快幾倍）、在樹旁邊做什麼（越前面的越常做）、每件事中間隔多久（秒）
const MOODS = {
  輕鬆: { gait: ['Walk', 1.2], gap: [0.8, 2], acts: ['stretch', 'stretch', 'napBeside', 'napBeside', 'napOnTree', 'sniff', 'look', 'stroll'] },
  普通: { gait: ['Walk', 1.5], gap: [0.8, 2], acts: ['stretch', 'sniff', 'look', 'stroll', 'pounce', 'pounce', 'napBeside', 'bounce', 'napOnTree'] },
  忙: { gait: ['Walk', 2], gap: [0.5, 1.4], acts: ['pace', 'pace', 'pounce', 'bounce', 'bounce', 'look', 'stretch'] },
  爆: { gait: ['Gallop', 1], gap: [0.3, 0.9], acts: ['pace', 'pace', 'bounce', 'bounce', 'bounce', 'pounce'] },
}
// 貓和樹的大小、各自的邊框多粗（px，0 是沒有）、邊框的顏色。測試頁（/home/cat-meter）的滑桿調過的話記在這台裝置上，首頁測試版也會照著用
export const METER_CAT_KEY = 'bl-meter-cat'
export const METER_CAT_SIZE = { cat: 25, tree: 20, edge: 0, treeEdge: 0, color: '#4f2d55' }
export function meterCatSize() {
  try { return { ...METER_CAT_SIZE, ...JSON.parse(localStorage.getItem(METER_CAT_KEY)) } } catch { return METER_CAT_SIZE }
}
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const between = ([lo, hi]) => (lo + Math.random() * (hi - lo)) * 1000

/**
 * value：今天在量尺上的位置（0–100），還沒有資料給 null；level：輕鬆／普通／忙／爆。
 * 要放在一個 position: relative、上緣就是量尺那條線的容器裡。ref 上有 do(名字) 可以叫牠馬上做某件事（測試頁用）。
 */
const MeterCat = forwardRef(function MeterCat({ value, level, size = meterCatSize() }, ref) {
  const rootRef = useRef(null)
  const boxRef = useRef(null)
  const treeRef = useRef(null)
  const api = useRef({})
  const want = useRef(null)
  const edge = useRef([size.edge, size.color])
  useImperativeHandle(ref, () => ({ do: (name) => api.current.act?.(name) }), [])

  useEffect(() => {
    const root = rootRef.current
    const box = boxRef.current
    const tree = treeRef.current
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const SIZE = box.offsetWidth, TREE_H = tree.offsetHeight // 大小都在 meter-cat.css（--cat、--tree），這裡照量到的算
    const canvas = document.createElement('canvas')
    box.prepend(canvas)
    let gone = false
    let cat = null
    let run = 0     // 每開始一件新的事就加一：舊的那件事做到一半發現號碼變了就收手
    let timer = 0
    let home = null // 貓平常站的位置（畫布左緣，px）：樹的左邊，臉朝著樹
    let mood = MOODS.普通
    const wait = (ms) => new Promise((ok) => (timer = setTimeout(ok, ms)))
    const where = () => { const [x = 0, y = 0] = getComputedStyle(box).translate.split(' ').map(parseFloat); return [x || 0, y || 0] }
    const face = (right) => cat.face(right ? 90 : -90)
    const play = (name, speed = 1, once = false) => { box.dataset.pose = 'up'; cat.awake(true); cat.speed(speed); cat.play(name, once) }
    const asleep = () => { box.dataset.pose = 'sleep'; cat.awake(false) } // 換成蜷著睡的那張圖，紙偶先不畫
    // 把貓從現在的位置移過去，到了就把位置定下來
    const glide = async (frames, options) => {
      const anim = box.animate(frames, { fill: 'forwards', ...options })
      await anim.finished
      anim.commitStyles()
      anim.cancel()
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
      await glide([{ translate: `${x}px ${y}px`, easing: EASE_OUT }, { translate: `${(x + to) / 2}px ${Math.min(y, top) - SIZE * 0.3}px`, easing: EASE_IN }, { translate: `${to}px ${top}px` }], { duration: ms })
    }
    const onTree = () => [treeX() - SIZE / 2, -TREE_H * 0.74]

    const acts = {
      // 低頭聞聞樹下
      async sniff() { play(pick(['Idle_2_HeadLow', 'Eating'])); await wait(cat.length('Eating') * 1000 * 1.6) },
      // 伸懶腰：前腳往前趴、屁股翹起來，整隻拉長，撐一下再站回來（動作資料裡沒有伸懶腰，用低頭的動作加上把整隻壓扁拉長湊的）
      async stretch() {
        play('Idle_2_HeadLow', 0.6)
        const pose = { scale: '1.16 0.86', rotate: '7deg' }
        await box.animate([{ scale: '1 1', rotate: '0deg' }, { ...pose, offset: 0.35 }, { ...pose, offset: 0.75 }, { scale: '1 1', rotate: '0deg' }], { duration: 2200, easing: 'ease-in-out' }).finished.catch(() => {})
      },
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
        await wait(cat.length('Attack') * 2000)
        tree.classList.remove('shake')
        if (me === run) await go(home)
      },
      // 在樹旁邊蜷起來睡
      async napBeside(me) {
        play('Idle_2_HeadLow')
        await wait(1200)
        if (me !== run) return
        asleep()
        await wait(9000 + Math.random() * 9000)
      },
      // 跳到樹頂上睡，樹被壓得矮一點
      async napOnTree(me) {
        const [x, top] = onTree()
        await hop(x, top)
        if (me !== run) return
        tree.classList.add('heavy')
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
        await glide([{ translate: `${x}px ${top}px` }, { translate: `${x}px ${top * 0.55}px` }], { duration: 160, easing: 'ease-in' }) // 跟著樹一起被壓下去
        if (me !== run) return
        const land = home - SIZE * (0.5 + Math.random() * 0.6)
        play('Idle_HitReact2')
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
        await acts[pick(mood.acts)](me)
      }
    }
    const reset = () => {
      run += 1
      clearTimeout(timer)
      box.getAnimations().forEach((a) => { a.commitStyles(); a.cancel() })
      tree.classList.remove('shake', 'heavy')
      box.style.rotate = '0deg'
      box.style.scale = '1'
      box.style.transformOrigin = ''
      box.style.translate = `${where()[0]}px 0px` // 做到一半被打斷：先落回地上
      return run
    }
    // 樹換位置（或第一次種下去）：貓走到樹的左邊
    api.current.arrive = async (v, lv) => {
      mood = MOODS[lv] ?? MOODS.普通
      root.style.setProperty('--at', `${v}%`)
      root.classList.add('on')
      if (!cat) return
      const first = home == null
      const me = reset()
      home = treeX() - tree.offsetWidth * 0.5 - SIZE * 0.93 + 6
      if (first) box.style.translate = `${Math.max(-SIZE, home - 150)}px 0px` // 第一次：從左邊不遠的地方走進來
      box.classList.add('on')
      if (calm) { box.style.translate = `${home}px 0px`; face(true); play('Idle'); return cat.awake(false) } // 關掉動態：站在樹旁邊不動
      await go(home, mood.gait)
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
    // 被點到：原地嚇得跳一下（睡著的話就是被吵醒）
    const poke = async () => {
      if (!cat || home == null || calm) return
      const me = reset()
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
      const dx = e.clientX - grab.x, dy = e.clientY - grab.y
      if (!grab.held) {
        if (Math.hypot(dx, dy) < 5) return
        grab.held = true
        reset()
        box.classList.add('held')
        play('Gallop', 1.6)
      }
      const x = Math.max(-SIZE * 0.5, Math.min(root.offsetWidth - SIZE * 0.5, grab.from[0] + dx))
      const y = Math.max(-140, Math.min(0, grab.from[1] + dy))
      box.style.translate = `${x}px ${y}px`
    }
    const up = async (e) => {
      const g = grab
      grab = null
      if (!g) return
      if (!g.held) return e.type === 'pointerup' ? poke() : undefined
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
    box.addEventListener('pointerdown', down)
    box.addEventListener('pointermove', moveTo)
    box.addEventListener('pointerup', up)
    box.addEventListener('pointercancel', up)

    Promise.all([import('./cat3d/paper.js'), import('../../assets/cat-paper.glb?url'), import('../../assets/cat-parts.webp')])
      .then(([{ createPaperCat }, glb, paint]) => createPaperCat(canvas, { glb: glb.default, paint: paint.default }))
      .then((made) => {
        if (gone) return made.dispose()
        cat = made
        cat.play('Idle')
        api.current.edge = (px, color) => cat.outline(px, color)
        api.current.edge(...edge.current)
        if (want.current) api.current.arrive(...want.current)
      })
      .catch((error) => console.error('量尺上的貓載入失敗', error))
    return () => {
      gone = true
      run += 1
      clearTimeout(timer)
      box.removeEventListener('pointerdown', down)
      box.removeEventListener('pointermove', moveTo)
      box.removeEventListener('pointerup', up)
      box.removeEventListener('pointercancel', up)
      box.getAnimations().forEach((a) => a.cancel())
      cat?.dispose()
      canvas.remove()
      api.current = {}
    }
  }, [])

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

  return (
    <span className="mc" ref={rootRef} aria-hidden="true" style={{ '--cat': `${size.cat}px`, '--tree': `${size.tree}px`, '--edge': `${size.edge}px`, '--tree-edge': `${size.treeEdge}px`, '--edge-color': size.color }}>
      <img className="mc-tree" ref={treeRef} src={treeImg} alt="" />
      <b className="mc-pin" />
      <span className="mc-cat" ref={boxRef} data-pose="up">
        <span className="mc-nap"><img src={sleepImg} alt="" /><i>z</i><i>z</i></span>
      </span>
    </span>
  )
})

export default MeterCat
