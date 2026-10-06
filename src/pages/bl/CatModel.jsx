import { useEffect, useRef, useState } from 'react'
import { catHead } from '../../components/bl/shared'
import catBody from '../../assets/cat-body.webp'
import catMesh from '../../assets/cat-model.bin?url'
import catBase from '../../assets/cat-model.webp'

// 整隻貓的 3D 版試作（/home/cat-model，沒有放進導覽）。可以拖著轉一整圈，連點三下會炸毛。
// 模型和算繪都在 cat3d/model.js（另外一包，進這頁才下載），這裡只負責掛上去和收拾。
// 網址可以帶 ?yaw=90 固定角度；?step 會把控制物件掛到 window.catModel 上（測試用）
export default function CatModel() {
  const box = useRef(null)
  const [note, setNote] = useState('載入中…')
  const [cat, setCat] = useState(null)
  const [round, setRound] = useState(0.25)

  useEffect(() => {
    // 每次都自己建一個 canvas：開發模式下這個 effect 會跑兩次，共用同一個會互相弄丟繪圖環境
    const canvas = document.createElement('canvas')
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', '可以拖著轉的 3D 水彩貓')
    box.current.append(canvas)
    let cat
    let gone = false
    import('../../components/bl/cat3d/model.js')
      .then(({ createModelCat }) =>
        createModelCat(canvas, { mesh: catMesh, base: catBase, head: catHead, body: catBody, onContext: (lost) => setNote(lost ? '瀏覽器把繪圖環境收走了，等它還回來，或重新整理頁面' : '') })
      )
      .then((made) => {
        if (gone) return made.dispose()
        cat = made
        const q = new URLSearchParams(location.hash.split('?')[1])
        if (q.has('yaw')) cat.turn(Number(q.get('yaw')))
        if (q.has('step')) window.catModel = cat // 測試用：分頁在背景時沒有動畫格，讓外面可以手動轉、手動畫
        setNote('')
        setCat(made)
        setRound(made.round())
      })
      .catch((error) => {
        console.error('3D 貓載入失敗', error)
        if (!gone) setNote('載入失敗：' + error.message)
      })
    return () => {
      gone = true
      setCat(null)
      cat?.dispose()
      canvas.remove()
    }
  }, [])

  return (
    <div style={{ minHeight: '100dvh', background: '#f3f0e8', color: '#1c1914', fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", padding: '24px 16px 64px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 2px' }}>3D 水彩貓（試作）</h1>
        <p style={{ margin: 0, color: '#595349', fontSize: 14, lineHeight: 1.6 }}>拖著可以轉一整圈，連點三下會炸毛。正面是原畫投影上去的，側面和背面是模型自己的顏色加上水彩處理。</p>
        <p role="status" style={{ margin: '4px 0 0', color: '#c64022', fontSize: 14, minHeight: '1.6em' }}>{note}</p>
        <div ref={box} className="cat-model-box" />
        {cat && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontSize: 14 }}>
            頭的圓度
            <input type="range" min="0" max="1" step="0.05" value={round} onChange={(e) => setRound(cat.round(Number(e.target.value)))} style={{ flex: 1, accentColor: '#c64022' }} />
            <output style={{ width: '3em', textAlign: 'right', color: '#595349', fontVariantNumeric: 'tabular-nums' }}>{round.toFixed(2)}</output>
          </label>
        )}
        <style>{'.cat-model-box canvas { display: block; width: 100%; aspect-ratio: 1 / 1.15; cursor: grab; } .cat-model-box canvas:active { cursor: grabbing; }'}</style>
      </div>
    </div>
  )
}
