import { useEffect, useRef, useState } from 'react'
import { TAIL_NAMES, nextTail, stepDate } from '../stockPhoto/labelModel'
import { Chip, DateStepper, I, Icon, Swatches } from '../stockPhoto/ui'

// 倉庫標籤的手機版工具列：黏在畫面底部，照片佔滿上面，不用上下滑找東西（像 Canva、IG 的編輯畫面）。
// 沒選標籤時：上排橫滑「日期＋全部快捷」，下排是 復原／外觀／打字／照片／存圖。
// 選了標籤時整列換成這個標籤的工具：改字、日期、數量、大小、直排、樣式、再一個、刪掉。
// m 是 Stock 頁的狀態與動作，兩種版面共用同一份。
export default function StockDock({ m }) {
  const { sel } = m
  const [sheet, setSheet] = useState(null) // 'look' | 'type' | 'save'
  const ref = useRef(null)
  useDockSpace(ref)
  useKeyboardLift(ref)
  // 選了標籤就收起額外的那一排
  useEffect(() => {
    if (sel) setSheet(null)
  }, [sel])
  const toggle = (name) => setSheet((s) => (s === name ? null : name))

  return (
    <div className="sdock" ref={ref} role="toolbar" aria-label="標籤工具">
      {m.msg ? (
        <p className={`toast${m.msg.bad ? ' bad' : ''}`} role="status">
          {m.msg.text}
        </p>
      ) : null}
      <div className="inner">{sel ? <LabelTools m={m} /> : <AddTools m={m} sheet={sheet} toggle={toggle} setSheet={setSheet} />}</div>
    </div>
  )
}

function AddTools({ m, sheet, toggle, setSheet }) {
  const [draft, setDraft] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    m.addText(draft)
    setDraft('')
    setSheet(null)
  }
  const save = () => (m.others ? toggle('save') : m.saveCurrent())
  return (
    <>
      {sheet === 'look' ? (
        <div className="extra look">
          <Swatches value={m.prefs.style} onPick={m.setStyle} />
          <Direction value={m.prefs.vertical} onPick={m.setVertical} />
          <button type="button" className="ghost" onClick={m.styleAll} disabled={!m.hasText}>
            全部換成這個樣式
          </button>
        </div>
      ) : null}
      {sheet === 'type' ? (
        <form className="extra type" onSubmit={submit}>
          {/* 打開就直接可以打字，省一下點輸入框 */}
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="例如 9/11 SW*2" enterKeyHint="done" aria-label="自己打標籤" autoFocus />
          <button type="submit" className="pri" disabled={!draft.trim()}>
            貼上去
          </button>
          <label className="keep">
            <input type="checkbox" checked={m.keep} onChange={(e) => m.setKeep(e.target.checked)} />
            存成快捷
          </label>
        </form>
      ) : null}
      {sheet === 'save' ? (
        <div className="extra save">
          <button type="button" className="pri" onClick={m.saveCurrent} disabled={Boolean(m.busy)}>
            這一張
          </button>
          <button type="button" className="pri" onClick={m.saveAll} disabled={Boolean(m.busy)}>
            全部 {m.photoCount} 張
          </button>
        </div>
      ) : null}
      {m.managing ? (
        <div className="extra manage">
          <span>點快捷就會移除</span>
          <button type="button" className="ghost" onClick={m.resetPresets}>
            換回預設
          </button>
          <button type="button" className="pri" onClick={m.toggleManage}>
            好了
          </button>
        </div>
      ) : null}

      {/* 日期固定在左邊；快捷排成兩列往右滑，一眼看得到七八個 */}
      <div className="adds">
        <div className="date">
          <DateStepper value={m.date} onChange={m.setDate} onStep={(n) => m.setDate((d) => stepDate(d, n))} />
        </div>
        <div className="rail grid" aria-label="快捷品項">
          {m.groups.flatMap((g) => g.items).map((p) => (
            <Chip key={`${p.i}-${p.text}`} preset={p} style={m.prefs.style} date={m.date} managing={m.managing} onPick={() => (m.managing ? m.removePreset(p.i) : m.place(p))} />
          ))}
          {!m.managing ? (
            <button type="button" className="tidy" onClick={m.toggleManage}>
              整理
            </button>
          ) : null}
        </div>
      </div>

      <div className="acts">
        <button type="button" className="tb" onClick={m.undo} disabled={!m.canUndo}>
          <Icon d={I.undo} />
          <span>復原</span>
        </button>
        <button type="button" className="tb" aria-pressed={sheet === 'look'} onClick={() => toggle('look')}>
          <Icon d={I.palette} />
          <span>外觀</span>
        </button>
        <button type="button" className="tb" aria-pressed={sheet === 'type'} onClick={() => toggle('type')}>
          <Icon d={I.type} />
          <span>打字</span>
        </button>
        <button type="button" className="tb" onClick={m.pickFile}>
          <Icon d={I.image} />
          <span>加照片</span>
        </button>
        <button type="button" className="go" aria-pressed={sheet === 'save'} onClick={save} disabled={Boolean(m.busy)}>
          <Icon d={m.shareFirst ? I.share : I.down} />
          <span>{m.busy ? '準備中…' : m.shareFirst ? '分享' : '存圖'}</span>
        </button>
      </div>
    </>
  )
}

function LabelTools({ m }) {
  const { sel } = m
  const isText = sel.kind === 'text'
  const bump = (k) => m.setSize(sel.size * k, 'size')
  return (
    <>
      <div className="head">
        {isText ? (
          <input
            value={sel.text}
            onChange={(e) => m.patchSel({ text: e.target.value }, 'text')}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            enterKeyHint="done"
            aria-label="標籤文字"
          />
        ) : (
          <b>劃掉</b>
        )}
        <button type="button" className="pri done" onClick={m.deselect}>
          <Icon d={I.check} />
          完成
        </button>
      </div>
      <div className="tools">
        {isText ? (
          <div className="tool">
            <span>日期</span>
            {sel.date ? (
              <>
                <DateStepper value={sel.date} onChange={(v) => m.patchSel({ date: v })} onStep={(n) => m.patchSel({ date: stepDate(sel.date, n) }, 'date')} />
                <button type="button" className="mini" onClick={() => m.patchSel({ date: null })} aria-label="不要日期">
                  <Icon d={I.x} size={16} />
                </button>
              </>
            ) : (
              <button type="button" className="mini wide" onClick={() => m.patchSel({ date: m.date })}>
                ＋ 加日期
              </button>
            )}
          </div>
        ) : null}
        {isText ? (
          <div className="tool">
            <span className="cap">數量</span>
            <div className="stepper">
              <button type="button" aria-label="少一個" disabled={sel.qty <= 1} onClick={() => m.patchSel({ qty: sel.qty - 1 }, 'qty')}>
                <Icon d={I.minus} />
              </button>
              <b className="num">{sel.qty > 1 ? `×${sel.qty}` : '—'}</b>
              <button type="button" aria-label="多一個" onClick={() => m.patchSel({ qty: sel.qty + 1 }, 'qty')}>
                <Icon d={I.plus} />
              </button>
            </div>
          </div>
        ) : null}
        <div className="tool">
          <span className="cap">大小</span>
          <div className="stepper">
            <button type="button" aria-label="小一點" onClick={() => bump(1 / 1.15)}>
              <Icon d={I.minus} />
            </button>
            <b className="num">{Math.round(sel.size * 1000) / 10}</b>
            <button type="button" aria-label="大一點" onClick={() => bump(1.15)}>
              <Icon d={I.plus} />
            </button>
          </div>
        </div>
        {isText ? (
          <div className="tool">
            <span>方向</span>
            <button type="button" className="mini wide" aria-pressed={Boolean(sel.vertical)} onClick={() => m.setVertical(!sel.vertical)}>
              <i className="vmark" aria-hidden="true">
                直
              </i>
              直排
            </button>
          </div>
        ) : null}
        {isText ? (
          <div className="tool">
            <span>箭頭</span>
            <button type="button" className="mini wide" aria-pressed={Boolean(sel.tail)} aria-label={`箭頭：${sel.tail ? TAIL_NAMES[sel.tail] : '沒有'}，按一下換方向`} onClick={() => m.patchSel({ tail: nextTail(sel.tail) })}>
              {sel.tail ? TAIL_NAMES[sel.tail] : '箭頭'}
            </button>
          </div>
        ) : null}
        {isText && sel.wrap && !sel.vertical ? (
          <div className="tool">
            <span>寬度</span>
            <button type="button" className="mini wide" onClick={() => m.patchSel({ wrap: null })}>
              改回自動
            </button>
          </div>
        ) : null}
        {isText ? (
          <div className="tool">
            <span>樣式</span>
            <Swatches value={sel.style} onPick={m.setStyle} />
          </div>
        ) : null}
        <div className="tool">
          <span>　</span>
          <button type="button" className="mini wide" onClick={m.duplicateSel}>
            <Icon d={I.dup} size={16} />
            再一個
          </button>
          <button type="button" className="mini wide bad" onClick={m.removeSel}>
            <Icon d={I.trash} size={16} />
            刪掉
          </button>
        </div>
      </div>
    </>
  )
}

function Direction({ value, onPick }) {
  return (
    <div className="dir" role="group" aria-label="文字方向">
      {[
        [false, '橫排'],
        [true, '直排'],
      ].map(([v, name]) => (
        <button key={name} type="button" aria-pressed={Boolean(value) === v} onClick={() => onPick(v)}>
          <i className={v ? 'v' : undefined} aria-hidden="true">
            {v ? '大\n蓋' : '大蓋'}
          </i>
          {name}
        </button>
      ))}
    </div>
  )
}

/** 工具列多高，頁面底下就留多少空間，照片才不會被蓋住 */
function useDockSpace(ref) {
  useEffect(() => {
    const el = ref.current
    const root = el?.closest('.bl')
    if (!el || !root || typeof ResizeObserver === 'undefined') return undefined
    const set = () => root.style.setProperty('--dock-h', `${el.offsetHeight}px`)
    const ro = new ResizeObserver(set)
    ro.observe(el)
    set()
    return () => {
      ro.disconnect()
      root.style.removeProperty('--dock-h')
    }
  }, [ref])
}

/** iPhone 打字時鍵盤會蓋住固定在底部的東西：跟著可見區域往上抬 */
function useKeyboardLift(ref) {
  useEffect(() => {
    const vv = window.visualViewport
    const el = ref.current
    if (!vv || !el) return undefined
    const lift = () => {
      const hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      el.style.transform = hidden > 40 ? `translateY(${-hidden}px)` : ''
    }
    vv.addEventListener('resize', lift)
    vv.addEventListener('scroll', lift)
    return () => {
      vv.removeEventListener('resize', lift)
      vv.removeEventListener('scroll', lift)
    }
  }, [ref])
}
