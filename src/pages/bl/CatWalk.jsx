import { useEffect, useRef, useState } from 'react'
import { catHead } from '../../components/bl/shared'
import catGlb from '../../assets/cat-walk.glb?url'
import catBase from '../../assets/cat-walk.webp'
import paintLeft from '../../assets/cat-paint-left.webp'
import paintRight from '../../assets/cat-paint-right.webp'
import paintBack from '../../assets/cat-paint-back.webp'

const CLIPS = { Walk: '走路', Gallop: '跑', Idle: '站著', Idle_2: '東張西望', Idle_2_HeadLow: '低頭', Eating: '吃東西', Jump_ToIdle: '跳', Gallop_Jump: '邊跑邊跳', Attack: '撲', Idle_HitReact1: '嚇一跳', Idle_HitReact2: '嚇一跳 2', Death: '倒下' }

// 會走路的 3D 貓試作（/home/cat-walk，沒有放進導覽）。四隻腳和尾巴照骨架的動作在動，可以拖著轉一整圈。
// 模型和算繪都在 cat3d/walk.js（另外一包，進這頁才下載）。網址帶 ?step 會把控制物件掛到 window.catWalk 上（測試用），帶 ?paper 是 2D 的紙偶
export default function CatWalk() {
  const box = useRef(null)
  const [note, setNote] = useState('載入中…')
  const [cat, setCat] = useState(null)
  const [head, setHead] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [clip, setClip] = useState('Walk')

  useEffect(() => {
    // 每次都自己建一個 canvas：開發模式下這個 effect 會跑兩次，共用同一個會互相弄丟繪圖環境
    const canvas = document.createElement('canvas')
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', '會走路的 3D 水彩貓，可以拖著轉')
    box.current.append(canvas)
    let made
    const query = new URLSearchParams(location.hash.split('?')[1])
    const paper = query.has('paper') // ?paper：2D 的紙偶（一張側面的畫在動），首頁舞台用的那種
    let gone = false
    const load = paper
      ? Promise.all([import('../../components/bl/cat3d/paper.js'), import('../../assets/cat-paper.glb?url'), import('../../assets/cat-parts.webp')]).then(([m, glb, parts]) => m.createPaperCat(canvas, { glb: glb.default, paint: parts.default, ink: query.has('ink') ? ['#4f2d55', '#d9c98f'] : undefined }))
      : import('../../components/bl/cat3d/walk.js').then(({ createWalkCat }) => createWalkCat(canvas, { glb: catGlb, base: catBase, head: catHead, paint: { left: paintLeft, right: paintRight, back: paintBack }, onContext: (lost) => setNote(lost ? '瀏覽器把繪圖環境收走了，等它還回來，或重新整理頁面' : '') }))
    load
      .then((c) => {
        if (gone) return c.dispose()
        made = c
        if (query.has('step')) window.catWalk = c
        setNote('')
        setCat(c)
        setHead(c.head?.() ?? null)
        setSpeed(c.speed())
      })
      .catch((error) => {
        console.error('3D 貓載入失敗', error)
        if (!gone) setNote('載入失敗：' + error.message)
      })
    return () => {
      gone = true
      setCat(null)
      made?.dispose()
      canvas.remove()
    }
  }, [])

  const row = { display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontSize: 14 }
  const num = { width: '3.5em', textAlign: 'right', color: '#595349', fontVariantNumeric: 'tabular-nums' }
  return (
    <div style={{ minHeight: '100dvh', background: '#f3f0e8', color: '#1c1914', fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", padding: '24px 16px 64px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 2px' }}>會走路的 3D 貓（試作）</h1>
        <p style={{ margin: 0, color: '#595349', fontSize: 14, lineHeight: 1.6 }}>貓繞著圈子走，下面可以換動作，拖著可以把整個場景轉一圈。臉是原畫投影上去的，會眨眼，眼睛會跟著游標或手指。</p>
        <p role="status" style={{ margin: '4px 0 0', color: '#c64022', fontSize: 14, minHeight: '1.6em' }}>{note}</p>
        <div ref={box} className="cat-walk-box" />
        {cat && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '4px 0 8px' }}>
              {cat.play().map((name) => (
                <button key={name} type="button" aria-pressed={clip === name} onClick={() => { cat.play(name); setClip(name) }} style={{ minHeight: 44, padding: '0 14px', borderRadius: 22, border: '1px solid #c9c2b4', background: clip === name ? '#c64022' : '#fff', color: clip === name ? '#fff' : '#1c1914', fontSize: 14, cursor: 'pointer' }}>
                  {CLIPS[name] ?? name}
                </button>
              ))}
            </div>
            {head != null && <label style={row}>
              頭的方向
              <input type="range" min="-90" max="90" step="1" value={head} onChange={(e) => setHead(cat.head(Number(e.target.value)))} style={{ flex: 1, accentColor: '#c64022' }} />
              <output style={num}>{head}°</output>
            </label>}
            <label style={row}>
              動作速度
              <input type="range" min="0" max="2" step="0.05" value={speed} onChange={(e) => setSpeed(cat.speed(Number(e.target.value)))} style={{ flex: 1, accentColor: '#c64022' }} />
              <output style={num}>{speed.toFixed(2)}</output>
            </label>
          </>
        )}
        <style>{'.cat-walk-box canvas { display: block; width: 100%; aspect-ratio: 1 / 1; cursor: grab; } .cat-walk-box canvas:active { cursor: grabbing; }'}</style>
      </div>
    </div>
  )
}
