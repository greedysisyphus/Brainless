import { useEffect, useRef, useState } from 'react'
import MeterCat, { METER_CAT_KEY, METER_CAT_SIZE, meterCatSize } from '../../components/bl/MeterCat'

// 忙碌量尺上那隻小貓的測試頁（/home/cat-meter，沒有放進導覽）。一條量尺，
// 可以拉今天的位置、換忙碌程度，或直接叫牠做某件事。
const EDGE_COLORS = [['#2a211c', '墨色'], ['#4f2d55', '梅紫'], ['#6b5d52', '灰褐'], ['#000000', '黑'], ['#f6f1e7', '紙白']]
const LEVELS = ['輕鬆', '普通', '忙', '爆']
const ACTS = { bat: '跳起來拍數字', sniffTick: '聞刻度', stretch: '伸懶腰', stroll: '散步', pounce: '撲樹', bounce: '跳樹被彈飛', napBeside: '睡在旁邊', napOnTree: '睡在樹上', pace: '來回踱步', sniff: '聞樹下', look: '東張西望' }

export default function CatMeter() {
  const cat = useRef(null)
  const [value, setValue] = useState(55)
  const [level, setLevel] = useState('普通')
  // 大小：拉滑桿就存在這台裝置上（首頁測試版也會用同一組），停手一下才把貓換成新的大小
  const [size, setSize] = useState(meterCatSize)
  const [shown, setShown] = useState(size)
  useEffect(() => {
    try { localStorage.setItem(METER_CAT_KEY, JSON.stringify(size)) } catch { /* 存不了就只有這一頁有效 */ }
    const id = setTimeout(() => setShown(size), 250)
    return () => clearTimeout(id)
  }, [size])
  const row = { display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontSize: 14 }
  const num = { width: '3.2em', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6b5d52' }
  const chip = (on) => ({ minHeight: 44, padding: '0 14px', borderRadius: 22, border: '1px solid #c9c2b4', background: on ? '#4f2d55' : '#fff', color: on ? '#fff' : '#1c1914', fontSize: 14, cursor: 'pointer' })
  return (
    <div style={{ minHeight: '100dvh', background: '#ece5d8', color: '#2a211c', fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", padding: '24px 16px 64px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 2px' }}>量尺上的小貓（試作）</h1>
        <p style={{ margin: 0, color: '#6b5d52', fontSize: 14, lineHeight: 1.6 }}>樹種在今天的位置，貓走過來在樹旁邊做事。點貓牠會嚇得跳一下，也可以把牠抓起來拖走，放手牠會自己走回來。</p>

        <div style={{ position: 'relative', marginTop: 90, borderTop: '1px solid #2a211c', height: 28 }}>
          <MeterCat key={`${shown.cat}-${shown.tree}`} ref={cat} value={value} level={level} size={{ ...size, cat: shown.cat, tree: shown.tree }} />
        </div>
        <div style={{ ...row, flexWrap: 'wrap' }}>
          貓的畫法
          <button type="button" aria-pressed={!size.solid} style={chip(!size.solid)} onClick={() => setSize({ ...size, solid: false })}>水彩</button>
          <button type="button" aria-pressed={size.solid} style={chip(size.solid)} onClick={() => setSize({ ...size, solid: true })}>純色剪影</button>
          {size.solid && [['#4f2d55', '梅紫（重點色）'], ['#2a211c', '墨色（跟字一樣）'], ['#8e3b5c', '紫紅（貓身上的斑）'], ['#b8873a', '土黃（貓的肚子和腳）'], ['#6b5d52', '灰褐（刻度的字）']].map(([hex, name]) => (
            <button key={hex} type="button" aria-label={name} title={name} aria-pressed={size.fill === hex} onClick={() => setSize({ ...size, fill: hex })} style={{ width: 32, height: 32, borderRadius: 16, background: hex, border: '1px solid #c9c2b4', outline: size.fill === hex ? '2px solid #4f2d55' : 'none', outlineOffset: 2, cursor: 'pointer' }} />
          ))}
          {size.solid && <input type="color" aria-label="剪影的顏色" value={size.fill} onChange={(e) => setSize({ ...size, fill: e.target.value })} style={{ width: 44, height: 36, padding: 0, border: 0, background: 'none' }} />}
        </div>
        {size.solid && (
          <div style={{ ...row, flexWrap: 'wrap' }}>
            眼睛
            {[['googly', '活動眼（會晃）'], ['#f2d06b', '黃（貓的眼睛）'], ['#f6f1e7', '紙白'], ['', '沒有']].map(([hex, name]) => (
              <button key={name} type="button" aria-pressed={size.eye === hex} style={chip(size.eye === hex)} onClick={() => setSize({ ...size, eye: hex })}>{name}</button>
            ))}
          </div>
        )}
        <label style={row}>
          貓的大小
          <input type="range" min="20" max="80" value={size.cat} onChange={(e) => setSize({ ...size, cat: Number(e.target.value) })} style={{ flex: 1, accentColor: '#4f2d55' }} />
          <output style={num}>{size.cat}</output>
        </label>
        <label style={row}>
          樹的大小
          <input type="range" min="16" max="80" value={size.tree} onChange={(e) => setSize({ ...size, tree: Number(e.target.value) })} style={{ flex: 1, accentColor: '#4f2d55' }} />
          <output style={num}>{size.tree}</output>
        </label>
        <label style={row}>
          貓的邊框
          <input type="range" min="0" max="3" step="0.25" value={size.edge} onChange={(e) => setSize({ ...size, edge: Number(e.target.value) })} style={{ flex: 1, accentColor: '#4f2d55' }} />
          <output style={num}>{size.edge}</output>
        </label>
        <label style={row}>
          樹的邊框
          <input type="range" min="0" max="3" step="0.25" value={size.treeEdge} onChange={(e) => setSize({ ...size, treeEdge: Number(e.target.value) })} style={{ flex: 1, accentColor: '#4f2d55' }} />
          <output style={num}>{size.treeEdge}</output>
        </label>
        <div style={{ ...row, flexWrap: 'wrap' }}>
          邊框顏色
          {EDGE_COLORS.map(([hex, name]) => (
            <button key={hex} type="button" aria-label={name} aria-pressed={size.color === hex} title={name} onClick={() => setSize({ ...size, color: hex })} style={{ width: 32, height: 32, borderRadius: 16, background: hex, border: '1px solid #c9c2b4', outline: size.color === hex ? '2px solid #4f2d55' : 'none', outlineOffset: 2, cursor: 'pointer' }} />
          ))}
          <input type="color" aria-label="自己選顏色" value={size.color} onChange={(e) => setSize({ ...size, color: e.target.value })} style={{ width: 44, height: 36, padding: 0, border: 0, background: 'none' }} />
          <output style={{ ...num, width: 'auto' }}>{size.color}</output>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b5d52' }}>
          調好的大小會記在這台裝置上，<a href="#/home/cat-home" style={{ color: '#4f2d55' }}>首頁測試版</a>也會照著用。
          <button type="button" onClick={() => setSize(METER_CAT_SIZE)} style={{ marginLeft: 8, minHeight: 32, padding: '0 10px', borderRadius: 16, border: '1px solid #c9c2b4', background: '#fff', fontSize: 13, cursor: 'pointer' }}>還原</button>
        </p>
        <label style={row}>
          今天的位置
          <input type="range" min="8" max="96" value={value} onChange={(e) => setValue(Number(e.target.value))} style={{ flex: 1, accentColor: '#4f2d55' }} />
        </label>
        <p style={{ margin: '10px 0 6px', fontSize: 13, color: '#6b5d52' }}>忙碌程度（決定牠平常做什麼）</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {LEVELS.map((name) => <button key={name} type="button" aria-pressed={level === name} style={chip(level === name)} onClick={() => setLevel(name)}>{name}</button>)}
        </div>
        <p style={{ margin: '14px 0 6px', fontSize: 13, color: '#6b5d52' }}>叫牠現在做</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(ACTS).map(([name, text]) => <button key={name} type="button" style={chip(false)} onClick={() => cat.current.do(name)}>{text}</button>)}
        </div>
      </div>
    </div>
  )
}
