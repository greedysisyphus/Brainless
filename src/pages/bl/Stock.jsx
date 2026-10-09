import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToolPage } from '../../components/bl/shared'
import {
  DEFAULT_PRESETS,
  DEFAULT_SIZE,
  STYLES,
  SIZE_MAX,
  SIZE_MIN,
  clamp01,
  clampSize,
  isoOf,
  labelLines,
  labelText,
  makeLabel,
  newId,
  nextSpot,
  shortDate,
  stepDate,
} from '../stockPhoto/labelModel'
import { renderPhoto } from '../stockPhoto/renderPhoto'
import '../../styles/bl-tools.css'
import '../../styles/bl-stock.css'

// 新版倉庫標籤（/home/stock-photo）。拿完貨拍的貨架照片，在上面貼品項標籤再存成圖。
// 照片只在這台裝置上處理，不上傳。換到別的工具再回來，照片和標籤還在（重新整理才會清掉）。
const memory = { photos: [], cur: null, date: null }

const PRESETS_KEY = 'bl-stock-presets'
const PREFS_KEY = 'bl-stock-prefs'
function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 存不了（無痕模式）就只用這一次
  }
}

const GROUP_ORDER = ['日期', '杯蓋', '其他', '我的', '標記']
const canShareFiles = () => {
  try {
    return Boolean(navigator.canShare?.({ files: [new File([''], 'x.jpg', { type: 'image/jpeg' })] }))
  } catch {
    return false
  }
}
// 透明的日期欄蓋在日期字上：電腦上點了不會自己跳出日曆，要叫 showPicker
const openPicker = (e) => {
  try {
    e.currentTarget.showPicker?.()
  } catch {
    // 不支援就交給瀏覽器預設行為
  }
}
const isTouch = () => window.matchMedia('(pointer: coarse)').matches
/** 倉庫_1009.jpg；一次存好幾張時後面帶第幾張 */
const fileNameOf = (index, count) => {
  const d = new Date()
  const stamp = `${d.getMonth() + 1}${String(d.getDate()).padStart(2, '0')}`
  return `倉庫_${stamp}${count > 1 ? `_${index + 1}` : ''}.jpg`
}

const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)
const I = {
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  x: 'M6 6l12 12M18 6L6 18',
  share: 'M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
  down: 'M12 3v12M8 11l4 4 4-4M5 21h14',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z',
}

export default function Stock() {
  const [photos, setPhotos] = useState(memory.photos)
  const [curId, setCurId] = useState(memory.cur)
  const [selId, setSelId] = useState(null)
  const [spot, setSpot] = useState(null) // 點照片空白處＝下一個標籤放這裡
  const [date, setDate] = useState(() => memory.date || isoOf(new Date()))
  const [prefs, setPrefs] = useState(() => ({ style: 'white', size: DEFAULT_SIZE, vertical: false, ...readJson(PREFS_KEY, {}) }))
  const [presets, setPresets] = useState(() => readJson(PRESETS_KEY, DEFAULT_PRESETS))
  const [managing, setManaging] = useState(false)
  const [draft, setDraft] = useState('')
  const [keep, setKeep] = useState(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const photo = photos.find((p) => p.id === curId) || photos[0] || null
  const labels = photo?.labels || []
  const sel = labels.find((l) => l.id === selId) || null
  const aspect = photo ? photo.w / photo.h : 1

  useEffect(() => {
    memory.photos = photos
    memory.cur = photo?.id || null
    memory.date = date
  }, [photos, photo, date])
  useEffect(() => writeJson(PREFS_KEY, prefs), [prefs])
  useEffect(() => writeJson(PRESETS_KEY, presets), [presets])
  useEffect(() => {
    if (!msg) return undefined
    const t = setTimeout(() => setMsg(null), 3200)
    return () => clearTimeout(t)
  }, [msg])

  // ── 復原：每張照片各自一疊。打字、拖曳這種連續動作只記一次 ──
  const history = useRef(new Map())
  const lastEdit = useRef({ key: null, t: 0 })
  const photoRef = useRef(photo)
  photoRef.current = photo
  const setLabels = useCallback((id, fn) => setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, labels: fn(p.labels) } : p))), [])
  const remember = useCallback((key) => {
    const p = photoRef.current
    if (!p) return
    const now = Date.now()
    const last = lastEdit.current
    lastEdit.current = { key, t: now }
    if (key && last.key === key && now - last.t < 1500) return
    const stack = history.current.get(p.id) || []
    stack.push(p.labels)
    if (stack.length > 80) stack.shift()
    history.current.set(p.id, stack)
  }, [])
  const commit = useCallback(
    (fn, key) => {
      const p = photoRef.current
      if (!p) return
      remember(key)
      setLabels(p.id, fn)
    },
    [remember, setLabels]
  )
  const undo = useCallback(() => {
    const p = photoRef.current
    const stack = p && history.current.get(p.id)
    if (!stack?.length) return
    const prev = stack.pop()
    lastEdit.current = { key: null, t: 0 }
    setLabels(p.id, () => prev)
  }, [setLabels])
  const canUndo = Boolean(photo && history.current.get(photo.id)?.length)

  const patchSel = (patch, key) => commit((ls) => ls.map((l) => (l.id === selId ? { ...l, ...patch } : l)), key && `${selId}:${key}`)
  const removeSel = () => {
    commit((ls) => ls.filter((l) => l.id !== selId))
    setSelId(null)
  }
  const duplicateSel = () => {
    if (!sel) return
    const pos = nextSpot(sel, aspect)
    const copy = { ...sel, id: newId(), ...pos }
    commit((ls) => [...ls, copy])
    setSelId(copy.id)
  }

  // ── 加照片 ──
  const addFiles = async (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (!files.length) return
    const added = []
    for (const file of files) {
      const url = URL.createObjectURL(file)
      try {
        const size = await new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
          img.onerror = reject
          img.src = url
        })
        added.push({ id: newId(), name: file.name, url, ...size, labels: [] })
      } catch {
        URL.revokeObjectURL(url)
        setMsg({ bad: true, text: `「${file.name}」打不開，換一張試試` })
      }
    }
    if (!added.length) return
    setPhotos((ps) => [...ps, ...added])
    setCurId(added[0].id)
    setSelId(null)
    setSpot(null)
  }
  const removePhoto = (p) => {
    if (p.labels.length && !window.confirm(`這張照片有 ${p.labels.length} 個標籤，確定拿掉？`)) return
    URL.revokeObjectURL(p.url)
    history.current.delete(p.id)
    rendered.current.delete(p.id)
    const rest = photos.filter((x) => x.id !== p.id)
    if (p.id === photo?.id) setCurId(rest[Math.max(0, photos.indexOf(p) - 1)]?.id || null)
    setPhotos(rest)
    setSelId(null)
    setSpot(null)
  }
  const pick = (p) => {
    setCurId(p.id)
    setSelId(null)
    setSpot(null)
  }

  // 貼上（電腦上截圖直接 ⌘V）
  useEffect(() => {
    const onPaste = (e) => {
      if (e.target.closest?.('input, textarea')) return
      const files = [...(e.clipboardData?.files || [])]
      if (files.length) {
        e.preventDefault()
        addFiles(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  // ── 加標籤 ──
  const place = (preset) => {
    if (!photo) return
    const last = labels[labels.length - 1]
    const at = spot || (last ? nextSpot(last, aspect) : { x: 0.5, y: 0.5 })
    const label = makeLabel(preset, { ...at, date, style: prefs.style, size: prefs.size, vertical: prefs.vertical })
    commit((ls) => [...ls, label])
    setSelId(label.id)
    // 下一個接在這個下面，一疊籃子可以一路點下去
    setSpot(nextSpot(label, aspect))
  }
  const addDraft = () => {
    const text = draft.trim()
    if (!text) return
    if (keep && !presets.some((p) => p.text === text && !p.dated)) setPresets((ps) => [...ps, { text, group: '我的' }])
    place({ text })
    setDraft('')
  }
  const groups = useMemo(() => {
    const map = new Map()
    presets.forEach((p, i) => {
      const g = p.group && GROUP_ORDER.includes(p.group) ? p.group : '我的'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push({ ...p, i })
    })
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ name: g, items: map.get(g) }))
  }, [presets])
  const removePreset = (i) => setPresets((ps) => ps.filter((_, k) => k !== i))
  const resetPresets = () => {
    if (window.confirm('快捷標籤換回預設的那一組？自己加的會不見。')) setPresets(DEFAULT_PRESETS)
  }

  const setStyle = (style) => {
    setPrefs((p) => ({ ...p, style }))
    if (sel && sel.kind === 'text') patchSel({ style })
  }
  const setVertical = (vertical) => {
    setPrefs((p) => ({ ...p, vertical }))
    if (sel && sel.kind === 'text') patchSel({ vertical })
  }
  const setSize = (size, key = 'size') => {
    const s = clampSize(size)
    if (sel) patchSel({ size: s }, key)
    if (!sel || sel.kind === 'text') setPrefs((p) => ({ ...p, size: s }))
  }

  // ── 鍵盤 ──
  const keys = useRef({})
  keys.current = { sel, undo, removeSel, patchSel }
  useEffect(() => {
    const onKey = (e) => {
      const k = keys.current
      if (e.target.closest?.('input, textarea, select')) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        k.undo()
        return
      }
      if (!k.sel) return
      const step = e.shiftKey ? 0.02 : 0.004
      const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
      if (move) {
        e.preventDefault()
        k.patchSel({ x: clamp01(k.sel.x + move[0]), y: clamp01(k.sel.y + move[1]) }, 'nudge')
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        k.removeSel()
      } else if (e.key === 'Escape') setSelId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── 存圖：標籤停下來一會兒就先在背景畫好，按分享時不用等（iPhone 等太久會不讓分享） ──
  const rendered = useRef(new Map())
  const blobOf = useCallback(async (p) => {
    const sig = JSON.stringify(p.labels)
    const hit = rendered.current.get(p.id)
    if (hit?.sig === sig) return hit.blob
    const blob = await renderPhoto(p)
    rendered.current.set(p.id, { sig, blob })
    return blob
  }, [])
  useEffect(() => {
    if (!photo || !photo.labels.length) return undefined
    const t = setTimeout(() => blobOf(photo).catch(() => {}), 900)
    return () => clearTimeout(t)
  }, [photo, blobOf])

  const exportPhotos = async (list, how) => {
    if (!list.length || busy) return
    setBusy(how)
    try {
      if (how === 'copy') {
        // Safari 只認按下去當下就呼叫的 clipboard.write，圖用 Promise 交給它慢慢等
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderPhoto(list[0], 'image/png') })])
        setMsg({ text: '複製好了，可以直接貼到 LINE' })
        return
      }
      const blobs = await Promise.all(list.map(blobOf))
      const files = blobs.map((b, i) => new File([b], fileNameOf(photos.indexOf(list[i]), list.length), { type: 'image/jpeg' }))
      if (how === 'share') {
        try {
          await navigator.share({ files })
          setMsg({ text: list.length > 1 ? `${list.length} 張分享出去了` : '分享出去了' })
        } catch (err) {
          if (err?.name === 'AbortError') return
          // 圖畫太久，瀏覽器覺得已經不是「剛按下去」了：圖已經準備好，再按一次就會跳出來
          if (err?.name === 'NotAllowedError') setMsg({ text: '圖準備好了，再按一次分享' })
          else throw err
        }
        return
      }
      files.forEach((file, i) => {
        setTimeout(() => {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(file)
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          a.remove()
          setTimeout(() => URL.revokeObjectURL(a.href), 60000)
        }, i * 350)
      })
      setMsg({ text: list.length > 1 ? `下載 ${list.length} 張` : '下載好了' })
    } catch (err) {
      setMsg({ bad: true, text: how === 'copy' ? '這個瀏覽器不能複製圖片，改用下載' : err?.message || '存圖失敗，再試一次' })
    } finally {
      setBusy('')
    }
  }
  const [share, setShare] = useState(false)
  const [touch, setTouch] = useState(false)
  useEffect(() => {
    setShare(canShareFiles())
    setTouch(isTouch())
  }, [])
  const canCopy = typeof ClipboardItem !== 'undefined' && Boolean(navigator.clipboard?.write) && !touch
  const shareFirst = share && touch

  const pickFile = () => fileRef.current?.click()
  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      multiple
      hidden
      onChange={(e) => {
        addFiles(e.target.files)
        e.target.value = ''
      }}
    />
  )
  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer?.files)
  }
  const dropProps = {
    onDragOver: (e) => {
      e.preventDefault()
      setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop,
  }

  if (!photo) {
    return (
      <ToolPage className="bl-x bl-stock" path="/stock-photo" section="庫存與報表" title="倉庫標籤">
        {fileInput}
        <button type="button" className={`blank${dragOver ? ' over' : ''}`} onClick={pickFile} {...dropProps}>
          <b>拍照或選照片</b>
          <span>拿完貨拍的貨架照片，在上面點一下就能貼品項標籤，再存成圖傳出去。</span>
          <em>
            <Icon d={I.camera} />
            選照片
          </em>
          <small>照片只在這台裝置上處理，不會上傳。可以一次選好幾張；電腦上也可以直接拖進來或貼上。</small>
        </button>
      </ToolPage>
    )
  }

  const others = photos.length > 1
  return (
    <ToolPage
      className="bl-x bl-stock"
      path="/stock-photo"
      section="庫存與報表"
      title="倉庫標籤"
      titleExtra={<p className="count">{photos.length} 張照片 · {labels.length} 個標籤</p>}
    >
      {fileInput}
      <div className="work">
        <div className="left">
          <div className="strip" role="group" aria-label="照片">
            {photos.map((p, i) => (
              <div key={p.id} className="thumb" aria-current={p.id === photo.id ? 'true' : undefined}>
                <button type="button" onClick={() => pick(p)} aria-label={`第 ${i + 1} 張照片，${p.labels.length} 個標籤`}>
                  <img src={p.url} alt="" />
                  {p.labels.length ? <i>{p.labels.length}</i> : null}
                </button>
                <button type="button" className="rm" aria-label={`拿掉第 ${i + 1} 張`} onClick={() => removePhoto(p)}>
                  <Icon d={I.x} size={14} />
                </button>
              </div>
            ))}
            <button type="button" className="more" onClick={pickFile} aria-label="再加照片">
              <Icon d={I.plus} size={22} />
            </button>
          </div>

          <Stage
            photo={photo}
            selId={selId}
            spot={spot}
            dragOver={dragOver}
            dropProps={dropProps}
            onSelect={(id) => {
              setSelId(id)
              setSpot(null)
            }}
            onSpot={(p) => {
              setSelId(null)
              setSpot(p)
            }}
            onMoveStart={() => remember(null)}
            onMove={(id, patch) => setLabels(photo.id, (ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))}
          />

          <div className="bar">
            <button type="button" className="ic" onClick={undo} disabled={!canUndo} aria-label="復原">
              <Icon d={I.undo} />
              <span>復原</span>
            </button>
            <p className="hint" role="status">
              {msg ? <span className={msg.bad ? 'bad' : 'ok'}>{msg.text}</span> : spot ? '下一個標籤會放在閃的地方' : sel ? '拖曳移動，拉右下角圓點改大小' : '點照片選位置，再點下面的品項'}
            </p>
            <div className="save">
              {shareFirst ? (
                <button type="button" className="go" onClick={() => exportPhotos([photo], 'share')} disabled={Boolean(busy)}>
                  <Icon d={I.share} />
                  {busy === 'share' ? '準備中…' : '分享／存到相簿'}
                </button>
              ) : (
                <>
                  {canCopy ? (
                    <button type="button" className="ghost" onClick={() => exportPhotos([photo], 'copy')} disabled={Boolean(busy)}>
                      <Icon d={I.copy} />
                      {busy === 'copy' ? '複製中…' : '複製'}
                    </button>
                  ) : null}
                  <button type="button" className="go" onClick={() => exportPhotos([photo], 'download')} disabled={Boolean(busy)}>
                    <Icon d={I.down} />
                    {busy === 'download' ? '準備中…' : '下載圖片'}
                  </button>
                </>
              )}
            </div>
          </div>
          {others ? (
            <div className="all">
              <span>一次存全部 {photos.length} 張</span>
              {share ? (
                <button type="button" className="link" onClick={() => exportPhotos(photos, 'share')} disabled={Boolean(busy)}>
                  分享
                </button>
              ) : null}
              <button type="button" className="link" onClick={() => exportPhotos(photos, 'download')} disabled={Boolean(busy)}>
                下載
              </button>
            </div>
          ) : null}
        </div>

        <aside className="panel">
          {sel ? (
            <Editor
              key={sel.id}
              label={sel}
              onPatch={patchSel}
              onSize={setSize}
              onDuplicate={duplicateSel}
              onRemove={removeSel}
              onDone={() => setSelId(null)}
            />
          ) : null}

          <section className="card look">
            <div className="hd">
              <h2>外觀</h2>
              <small>{sel?.kind === 'text' ? '改的是選中的這個標籤' : '接下來貼的標籤都用這個'}</small>
            </div>
            <div className="row">
              <span>樣式</span>
              <Swatches value={sel?.kind === 'text' ? sel.style : prefs.style} onPick={setStyle} />
            </div>
            <div className="row">
              <span>方向</span>
              <div className="dir" role="group" aria-label="文字方向">
                {[
                  [false, '橫排'],
                  [true, '直排'],
                ].map(([v, name]) => (
                  <button key={name} type="button" aria-pressed={(sel?.kind === 'text' ? sel.vertical : prefs.vertical) === v} onClick={() => setVertical(v)}>
                    <i className={v ? 'v' : undefined} aria-hidden="true">
                      {v ? '大\n蓋' : '大蓋'}
                    </i>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card quick">
            <div className="hd">
              <h2>貼標籤</h2>
              <button type="button" className="side" aria-pressed={managing} onClick={() => setManaging((v) => !v)}>
                {managing ? '好了' : '整理快捷'}
              </button>
            </div>

            <div className="row date">
              <span>日期</span>
              <div className="stepper">
                <button type="button" aria-label="前一天" onClick={() => setDate((d) => stepDate(d, -1))}>
                  <Icon d={I.left} />
                </button>
                <label className="day">
                  <b>{shortDate(date)}</b>
                  <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="選日期" onClick={openPicker} />
                </label>
                <button type="button" aria-label="後一天" onClick={() => setDate((d) => stepDate(d, 1))}>
                  <Icon d={I.right} />
                </button>
              </div>
              {date !== isoOf(new Date()) ? (
                <button type="button" className="link" onClick={() => setDate(isoOf(new Date()))}>
                  今天
                </button>
              ) : (
                <small>今天</small>
              )}
            </div>

            {groups.map((g) => (
              <div className="group" key={g.name}>
                <span>{g.name}</span>
                <div className="chips">
                  {g.items.map((p) => (
                    <span className="chip-wrap" key={`${p.i}-${p.text}`}>
                      <button
                        type="button"
                        className={`chip ${p.kind === 'cross' ? 'strike' : `s-${p.style || prefs.style}`}`}
                        onClick={() => (managing ? removePreset(p.i) : place(p))}
                        aria-label={managing ? `移除快捷「${p.text}」` : undefined}
                      >
                        {p.kind === 'cross' ? <Icon d={I.x} size={16} /> : null}
                        {p.dated ? <small>{shortDate(date)}</small> : null}
                        {p.text}
                        {managing ? <i aria-hidden="true">×</i> : null}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {managing ? (
              <button type="button" className="link reset" onClick={resetPresets}>
                換回預設的快捷
              </button>
            ) : null}

            <form
              className="own"
              onSubmit={(e) => {
                e.preventDefault()
                addDraft()
              }}
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="自己打，例如 9/11 SW*2" enterKeyHint="done" aria-label="自己打標籤" />
              <button type="submit" className="add" disabled={!draft.trim()}>
                貼上去
              </button>
              <label className="keep">
                <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
                存成快捷
              </label>
            </form>
          </section>
        </aside>
      </div>
    </ToolPage>
  )
}

function Swatches({ value, onPick }) {
  return (
    <div className="swatches" role="group" aria-label="標籤樣式">
      {STYLES.map((s) => (
        <button key={s.id} type="button" className={`sw ${s.id}`} aria-pressed={value === s.id} onClick={() => onPick(s.id)} title={s.name} aria-label={s.name}>
          <span>標</span>
          <small>{s.name}</small>
        </button>
      ))}
    </div>
  )
}

function Editor({ label, onPatch, onSize, onDuplicate, onRemove, onDone }) {
  const isText = label.kind === 'text'
  const rows = Math.min(4, Math.max(1, ((label.text || '').match(/\n/g) || []).length + 1))
  return (
    <section className="card editor" aria-label="編輯標籤">
      <div className="hd">
        <h2>{isText ? labelText(label) || '（沒有字）' : '劃掉'}</h2>
        <button type="button" className="side" onClick={onDone}>
          完成
        </button>
      </div>
      {isText ? (
        <>
          <textarea rows={rows} value={label.text} onChange={(e) => onPatch({ text: e.target.value }, 'text')} aria-label="標籤文字" />
          <div className="row">
            <span>日期</span>
            {label.date ? (
              <>
                <div className="stepper">
                  <button type="button" aria-label="前一天" onClick={() => onPatch({ date: stepDate(label.date, -1) }, 'date')}>
                    <Icon d={I.left} />
                  </button>
                  <label className="day">
                    <b>{shortDate(label.date)}</b>
                    <input type="date" value={label.date} onChange={(e) => e.target.value && onPatch({ date: e.target.value })} aria-label="選日期" onClick={openPicker} />
                  </label>
                  <button type="button" aria-label="後一天" onClick={() => onPatch({ date: stepDate(label.date, 1) }, 'date')}>
                    <Icon d={I.right} />
                  </button>
                </div>
                <button type="button" className="link" onClick={() => onPatch({ date: null })}>
                  不要日期
                </button>
              </>
            ) : (
              <button type="button" className="link" onClick={() => onPatch({ date: isoOf(new Date()) })}>
                加日期
              </button>
            )}
          </div>
          <div className="row">
            <span>數量</span>
            <div className="stepper">
              <button type="button" aria-label="少一個" disabled={label.qty <= 1} onClick={() => onPatch({ qty: label.qty - 1 }, 'qty')}>
                <Icon d={I.minus} />
              </button>
              <b className="num">{label.qty > 1 ? `×${label.qty}` : '—'}</b>
              <button type="button" aria-label="多一個" onClick={() => onPatch({ qty: label.qty + 1 }, 'qty')}>
                <Icon d={I.plus} />
              </button>
            </div>
          </div>
        </>
      ) : null}
      <div className="row">
        <span>大小</span>
        <input
          type="range"
          className="size"
          min={SIZE_MIN}
          max={SIZE_MAX}
          step="0.001"
          value={label.size}
          onChange={(e) => onSize(Number(e.target.value))}
          aria-label="標籤大小"
        />
      </div>
      <div className="acts">
        <button type="button" className="ghost" onClick={onDuplicate}>
          再一個
        </button>
        <button type="button" className="ghost bad" onClick={onRemove}>
          刪掉
        </button>
      </div>
    </section>
  )
}

/** 照片與標籤。標籤是疊在照片上的 HTML，大小跟著照片顯示寬度走（--w），比例和存出來的圖一樣 */
function Stage({ photo, selId, spot, dragOver, dropProps, onSelect, onSpot, onMoveStart, onMove }) {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const drag = useRef(null)

  const toRatio = (e) => {
    const r = ref.current.getBoundingClientRect()
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height), r }
  }
  const onDown = (e, label, mode) => {
    e.stopPropagation()
    e.preventDefault()
    onSelect(label.id)
    const { x, y, r } = toRatio(e)
    const cx = r.left + label.x * r.width
    const cy = r.top + label.y * r.height
    drag.current = { id: label.id, mode, dx: label.x - x, dy: label.y - y, size: label.size, dist: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, cx, cy, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMovePtr = (e) => {
    const d = drag.current
    if (!d) return
    if (!d.moved) {
      d.moved = true
      onMoveStart()
    }
    if (d.mode === 'resize') {
      const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy)
      onMove(d.id, { size: clampSize((d.size * dist) / d.dist) })
    } else {
      const { x, y } = toRatio(e)
      onMove(d.id, { x: clamp01(x + d.dx), y: clamp01(y + d.dy) })
    }
  }
  const onUp = () => {
    drag.current = null
  }

  return (
    <div className="stage-wrap">
      <div
        ref={ref}
        className={`stage${dragOver ? ' over' : ''}`}
        style={{ aspectRatio: `${photo.w} / ${photo.h}`, '--w': `${w}px`, width: `min(100%, calc(var(--stage-h) * ${photo.w / photo.h}))` }}
        // 用 click 不用 pointerdown：手機上手指放在照片上捲動頁面時不會被當成選位置
        onClick={(e) => {
          const { x, y } = toRatio(e)
          onSpot({ x, y })
        }}
        {...dropProps}
      >
        <img src={photo.url} alt="倉庫照片" draggable="false" />
        {photo.labels.map((l) =>
          l.kind === 'cross' ? (
            <div
              key={l.id}
              className="cross"
              aria-selected={l.id === selId}
              style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, '--s': l.size }}
              onPointerDown={(e) => onDown(e, l, 'move')}
              onPointerMove={onMovePtr}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onClick={stop}
            >
              {l.id === selId ? <Handle onDown={(e) => onDown(e, l, 'resize')} /> : null}
            </div>
          ) : (
            <div
              key={l.id}
              className={`tag ${l.style}${l.vertical ? ' vert' : ''}`}
              aria-selected={l.id === selId}
              style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, '--s': l.size }}
              onPointerDown={(e) => onDown(e, l, 'move')}
              onPointerMove={onMovePtr}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onClick={stop}
            >
              <span className={l.vertical ? 'v' : undefined}>{labelLines(l).join('\n')}</span>
              {l.id === selId ? <Handle onDown={(e) => onDown(e, l, 'resize')} /> : null}
            </div>
          )
        )}
        {spot ? <i className="spot" style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }} aria-hidden="true" /> : null}
      </div>
    </div>
  )
}

const stop = (e) => e.stopPropagation()

// 拉大小的圓點。抓住之後的移動事件會冒泡到標籤本身，由標籤那邊算
function Handle({ onDown }) {
  return <b className="handle" aria-hidden="true" onPointerDown={onDown} />
}
