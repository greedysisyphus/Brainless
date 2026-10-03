import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ToolPage } from '../../components/bl/shared'
import BeanTypesSettingsModal from '../../components/BeanTypesSettingsModal'
import ClubWeightCalculatorModal from '../coffeeBean/ClubWeightCalculatorModal'
import { STORES, checkRowPlausibility, getBoxWeightKey, getPacksFromWeight, getStoreName } from '../coffeeBean/coffeeBeanConstants'
import ExportLogoPicker from '../coffeeBean/ExportLogoPicker'
import { InventoryConflictModal, InventorySyncBanner } from '../coffeeBean/InventorySyncUI'
import { useCoffeeBeanManager } from '../useCoffeeBeanManager'
import '../../styles/bl-beans.css'

// 新版咖啡豆管理。資料、同步、匯出全部用舊版同一份邏輯（useCoffeeBeanManager），這裡只重畫畫面：
// 一張盤點表（一種豆一列）＋本次盤點的總計；正在填的那一格展開「數／袋／盒」。
const LOCS = [
  ['store', '店面'],
  ['breakRoom', '員休室'],
  ['dryStorage', '乾倉'],
]
const MODES = [
  ['quantity', '數'],
  ['weightBag', '袋'],
  ['weightBox', '盒'],
]
const UNIT = { quantity: '包', weightBag: '克·袋', weightBox: '克·盒' }
const WEEKDAYS = '日一二三四五六'
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const DUR = 460
const keyOf = (c) => (c ? `${c.sec}|${c.bean}|${c.loc}|${c.i}` : '')
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 版面會變的動作（展開、收起、加一筆、刪一筆）先呼叫 capture() 記下每個東西的位置，
 * 畫面更新後讓它們從舊位置滑到新位置，不是直接跳過去。
 */
function useFlip(rootRef) {
  const snap = useRef(null)
  const capture = () => {
    const root = rootRef.current
    if (!root || reducedMotion()) return
    const items = new Map()
    root.querySelectorAll('[data-flip]').forEach((el) => {
      let ghost = null
      if (el.classList.contains('cur')) {
        ghost = el.cloneNode(true)
        ghost.querySelector('input').value = el.querySelector('input').value
      }
      items.set(el.dataset.flip, { r: el.getBoundingClientRect(), ghost })
    })
    snap.current = { items, at: performance.now() }
  }
  useLayoutEffect(() => {
    const before = snap.current
    const root = rootRef.current
    if (!before || !root) return
    snap.current = null
    if (performance.now() - before.at > 400) return // 隔太久（中間可能捲動過），舊位置不能用了
    const rootRect = root.getBoundingClientRect()
    const rowShift = new Map()
    root.querySelectorAll('[data-flip]').forEach((el) => {
      const was = before.items.get(el.dataset.flip)
      const now = el.getBoundingClientRect()
      if (!was) {
        // 新加的一筆：原地長出來
        if (el.classList.contains('ent')) el.animate([{ opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1 }], { duration: DUR, easing: EASE })
        return
      }
      const a = was.r
      const dx = a.left - now.left
      let dy = a.top - now.top
      if (el.classList.contains('bean')) rowShift.set(el, dy)
      else {
        const row = el.closest('.bean')
        if (row) dy -= rowShift.get(row) || 0
      }
      const grow = now.width - a.width
      const isEnt = el.classList.contains('ent')
      if (isEnt && grow < -1 && was.ghost) {
        // 收起：留一個舊樣子的影子往左收，真的那格最後才浮出來
        const ghost = was.ghost
        ghost.removeAttribute('data-flip')
        ghost.className = 'ent cur ghost'
        Object.assign(ghost.style, { left: `${a.left - rootRect.left}px`, top: `${a.top - rootRect.top}px`, width: `${a.width}px` })
        root.append(ghost)
        const closed = `inset(-3px ${-grow}px -3px -3px round 9px)`
        ghost.animate(
          [
            { clipPath: 'inset(-3px -3px -3px -3px round 9px)', translate: '0 0', opacity: 1 },
            { clipPath: closed, translate: `${-dx}px ${-dy}px`, opacity: 1, offset: 0.8 },
            { clipPath: closed, translate: `${-dx}px ${-dy}px`, opacity: 0 },
          ],
          { duration: DUR, easing: EASE }
        ).onfinish = () => ghost.remove()
        el.animate([{ opacity: 0 }, { opacity: 0, offset: 0.75 }, { opacity: 1 }], { duration: DUR })
        return
      }
      const frames = [{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }]
      const opens = isEnt && grow > 1 // 展開：從原本的寬度往右拉開
      if (opens) {
        frames[0].clipPath = `inset(-3px ${grow}px -3px -3px round 9px)`
        frames[1].clipPath = 'inset(-3px -3px -3px -3px round 9px)'
      }
      if (opens || Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) el.animate(frames, { duration: DUR, easing: EASE })
    })
  })
  return capture
}

const Cross = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" fill="none" />
  </svg>
)

/** 重量換算小面板：不是彈窗，開著也能繼續填盤點表 */
function Scale({ weights, boxType, onSettings }) {
  const [open, setOpen] = useState(false)
  const [cont, setCont] = useState('box')
  const [grams, setGrams] = useState('')
  const inputRef = useRef(null)
  const boxWeight = boxType === 'muji' ? weights?.mujiBoxWeight ?? weights?.ikeaBoxWeight : weights?.ikeaBoxWeight
  const packs = getPacksFromWeight(grams, weights, cont === 'bag' ? 'bag' : boxType)
  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <>
      <button className="fab" type="button" aria-expanded={open} aria-controls="bl-scale" onClick={() => setOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M3 6.5h12l-1.2 8.5H4.2zM6 6.5a3 3 0 0 1 6 0M9 9.2v2.4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        重量換算
      </button>
      <section className="scale" id="bl-scale" aria-label="重量換算" data-open={open} inert={open ? undefined : ''}>
        <h2>重量換算</h2>
        <button type="button" className="x" aria-label="關閉重量換算" onClick={() => setOpen(false)}>
          <Cross />
        </button>
        <div className="cont" role="group" aria-label="容器">
          {[
            ['bag', '袋', weights?.bagWeight],
            ['box', '盒', boxWeight],
          ].map(([id, label, w]) => (
            <button key={id} type="button" aria-pressed={cont === id} onPointerDown={(e) => e.preventDefault()} onClick={() => setCont(id)}>
              {label}
              <small>{w ?? '—'} 克</small>
            </button>
          ))}
        </div>
        <label>
          <span>秤上總重（克）</span>
          {/* 開頭多打的 0 拿掉（02500 → 2500） */}
          <input ref={inputRef} type="number" inputMode="decimal" min="0" placeholder="克" value={grams} onChange={(e) => setGrams(e.target.value.replace(/^0+(?=\d)/, ''))} />
        </label>
        <output>
          {packs > 0 ? packs.toFixed(1) : 0}
          <i>包</i>
        </output>
        <p>
          一包 {weights?.beanWeightPerPack ?? '—'} 克 ·{' '}
          <button type="button" onClick={onSettings}>
            改換算設定
          </button>
        </p>
      </section>
    </>
  )
}

export default function Beans() {
  const m = useCoffeeBeanManager()
  const { selectedStore, inventory, beanTypes } = m
  const rootRef = useRef(null)
  const capture = useFlip(rootRef)
  const [cur, setCur] = useState(null)
  const pendingFocus = useRef(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const boxType = selectedStore === 'd13' ? 'muji' : 'ikea'
  const weights = m.weightSettingsForInventory
  const emptyWeights = { bag: weights?.bagWeight, box: weights?.[getBoxWeightKey(selectedStore)] }

  const sections = useMemo(
    () => [
      { id: 'pourOver', title: '手沖豆', note: '出杯 · 手沖咖啡專用', cat: 'brewing', sub: 'pourOver', beans: beanTypes?.brewing?.pourOver || [], data: inventory?.brewing?.pourOver || {} },
      { id: 'espresso', title: '義式豆', note: '出杯 · 義式咖啡專用', cat: 'brewing', sub: 'espresso', beans: beanTypes?.brewing?.espresso || [], data: inventory?.brewing?.espresso || {} },
      { id: 'retail', title: '賣豆', note: '用於販售的咖啡豆', cat: 'retail', sub: null, beans: beanTypes?.retail || [], data: inventory?.retail || {} },
    ],
    [beanTypes, inventory]
  )
  const secOf = (id) => sections.find((s) => s.id === id)

  // 每種豆：顯示哪些位置、每個位置的每一筆、總包數、有沒有盤過
  const rows = sections.map((sec) => ({
    sec,
    beans: sec.beans.map((bean) => {
      const where = m.getBeanLocation(bean, sec.cat, sec.sub)
      const data = sec.data[bean]
      const locs = LOCS.filter(([loc]) => loc === 'store' || where[loc]).map(([loc, label]) => ({ loc, label, values: data?.[loc]?.length ? data[loc] : [''] }))
      return {
        bean,
        locs,
        total: Math.floor(m.calculateBeanTypeTotal(data, bean, sec.cat, sec.sub) + 1e-9),
        done: locs.some((l) => l.values.some((v) => v !== '' && v != null)),
      }
    }),
  }))
  const allBeans = rows.flatMap((r) => r.beans)
  const doneCount = allBeans.filter((b) => b.done).length

  const modeOf = (c) => m.getCellInputMode(c.bean, secOf(c.sec).cat, secOf(c.sec).sub, c.loc, c.i)
  const valueOf = (c) => secOf(c.sec).data[c.bean]?.[c.loc]?.[c.i] ?? ''
  const update = (c, value) => {
    const s = secOf(c.sec)
    if (s.cat === 'retail') m.updateRetailQuantity(c.bean, c.loc, c.i, value)
    else m.updateQuantity(s.cat, s.sub, c.bean, c.loc, c.i, value)
  }
  const select = (c) => {
    if (keyOf(c) === keyOf(cur)) return
    capture()
    setCur(c)
  }
  // 新的一筆沿用同位置上一筆的填寫方式：同一種豆通常都用同一種容器
  const add = (c) => {
    const s = secOf(c.sec)
    const count = s.data[c.bean]?.[c.loc]?.length || 1
    const lastMode = m.getCellInputMode(c.bean, s.cat, s.sub, c.loc, count - 1)
    capture()
    if (s.cat === 'retail') m.addRetailQuantityField(c.bean, c.loc)
    else m.addQuantityField(s.cat, s.sub, c.bean, c.loc)
    if (lastMode !== 'quantity') {
      // 前面每一筆都補上明確的方式再設新的一筆，存進雲端的陣列才不會有空洞
      for (let j = 0; j < count; j += 1) m.setCellInputMode(c.bean, s.cat, s.sub, c.loc, j, m.getCellInputMode(c.bean, s.cat, s.sub, c.loc, j))
      m.setCellInputMode(c.bean, s.cat, s.sub, c.loc, count, lastMode)
    }
    const next = { ...c, i: count }
    pendingFocus.current = keyOf(next)
    setCur(next)
  }
  const remove = (c) => {
    const s = secOf(c.sec)
    capture()
    if ((s.data[c.bean]?.[c.loc]?.length || 1) > 1) m.removeRowWithUndo(s.cat, s.sub, c.bean, c.loc, c.i)
    else update(c, '')
    setCur(null)
    document.activeElement?.blur?.()
  }
  const next = () => {
    if (!cur) return
    if (valueOf(cur) === '') document.activeElement?.blur?.()
    else add(cur)
  }

  // 新加的一筆畫出來之後才把游標放進去
  useEffect(() => {
    if (!pendingFocus.current) return
    const el = rootRef.current?.querySelector(`[data-flip="${CSS.escape(`ent|${pendingFocus.current}`)}"] input`)
    if (el) {
      pendingFocus.current = null
      el.focus()
    }
  })
  // 正在填的那一格如果被底部的編輯列、換算列或鍵盤擋住，捲到看得到的地方
  const curKey = keyOf(cur)
  useEffect(() => {
    if (!curKey) return undefined
    const timer = setTimeout(() => {
      const el = rootRef.current?.querySelector('.ent.cur')
      if (!el) return
      const r = el.getBoundingClientRect()
      const visible = window.visualViewport?.height ?? window.innerHeight
      if (r.bottom > visible - 150 || r.top < 60) el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
    }, 350) // 等鍵盤和編輯列出來
    return () => clearTimeout(timer)
  }, [curKey])

  // 換店：正在填的那一格不存在了
  useEffect(() => setCur(null), [selectedStore])
  // 重量設定（袋重、盒重、一包幾克）只會從雲端讀「換算設定選到的那家店」。跟著盤點的店一起換，
  // 不然切到 D7／D13 時用的是這台裝置上存的舊值，別人改過設定也不會知道。
  const { setSelectedWeightStore } = m
  useEffect(() => setSelectedWeightStore(selectedStore), [selectedStore, setSelectedWeightStore])
  // iOS 鍵盤跳出時，把底部的編輯列和換算面板墊到鍵盤上面
  useEffect(() => {
    const vv = window.visualViewport
    const root = rootRef.current
    if (!vv || !root) return undefined
    const lift = () => root.style.setProperty('--kb', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`)
    vv.addEventListener('resize', lift)
    vv.addEventListener('scroll', lift)
    return () => {
      vv.removeEventListener('resize', lift)
      vv.removeEventListener('scroll', lift)
    }
  }, [])

  const curMode = cur ? modeOf(cur) : null
  const curValue = cur ? valueOf(cur) : ''
  const curNum = parseFloat(curValue)
  const curHint = cur ? checkRowPlausibility(curValue, curMode, emptyWeights) : null
  const curEmpty = curMode === 'weightBag' ? weights?.bagWeight : weights?.[getBoxWeightKey(selectedStore)]
  const curPacks = cur && curMode !== 'quantity' ? getPacksFromWeight(curValue, weights, curMode === 'weightBag' ? 'bag' : boxType) : 0

  return (
    <ToolPage className="bl-beans" path="/coffee-beans" section="庫存與報表" title="咖啡豆管理">
      <div className="beans" ref={rootRef}>
        <div className="stores" role="group" aria-label="分店">
          {STORES.map((s) => (
            <button key={s.id} type="button" aria-pressed={selectedStore === s.id} onClick={() => m.setSelectedStore(s.id)}>
              {s.name}
            </button>
          ))}
          <button type="button" className="setup" onClick={() => m.setShowBeanTypesSettings(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M2 4h7M12 4h2M2 8h2M7 8h7M2 12h8M13 12h1" />
              <circle cx="10.5" cy="4" r="1.6" />
              <circle cx="5.5" cy="8" r="1.6" />
              <circle cx="11.5" cy="12" r="1.6" />
            </svg>
            品項設定
          </button>
        </div>

        <div className="legacy notice">
          <InventorySyncBanner
            status={m.inventorySyncStatus}
            isStudio
            onRetry={() => {
              m.setInventorySyncStatus('syncing')
              const dirty = STORES.filter((s) => m.getInventorySyncMeta(s.id).isDirty)
              Promise.all((dirty.length ? dirty : [{ id: selectedStore }]).map((s) => m.flushInventorySync(s.id))).catch(() => m.setInventorySyncStatus('error'))
            }}
          />
        </div>

        <p className="prog">
          <b>{doneCount}</b>
          <span>／ {allBeans.length} 種已盤</span>
          <a href="#bl-beans-sum">總計與匯出 ↓</a>
        </p>
        <div className="bar" aria-hidden="true">
          <i style={{ width: `${allBeans.length ? (doneCount / allBeans.length) * 100 : 0}%` }} />
        </div>

        <div className="split">
          <aside className="sum" id="bl-beans-sum" aria-label="本次盤點" data-flip="sum">
            <p className="day">
              <span className="label">本次盤點</span>
              <span>
                {now.getMonth() + 1} 月 {now.getDate()} 日 星期{WEEKDAYS[now.getDay()]}
              </span>
            </p>
            <p className="done">
              <b>{doneCount}</b>
              <span>／ {allBeans.length} 種已盤</span>
            </p>
            <div className="bar" aria-hidden="true">
              <i style={{ width: `${allBeans.length ? (doneCount / allBeans.length) * 100 : 0}%` }} />
            </div>
            <ul className="totals">
              {rows.map(({ sec, beans }) => (
                <li key={sec.id}>
                  <a href={`#bl-beans-${sec.id}`}>
                    <span>{sec.title}</span>
                    <small>{beans.length} 種</small>
                    <b>
                      {beans.reduce((a, b) => a + b.total, 0).toLocaleString('en-US')}
                      <i>包</i>
                    </b>
                  </a>
                </li>
              ))}
            </ul>
            <div className="out">
              <button className="export" type="button" onClick={m.exportInventoryAsImage}>
                匯出盤點表
              </button>
              <div className="legacy logo">
                <ExportLogoPicker
                  isStudio
                  exportMode={m.exportMode}
                  setExportMode={m.setExportMode}
                  customLogoBase64={m.customLogoBase64}
                  onLogoUpload={m.handleLogoUpload}
                  onRemoveCustomLogo={m.removeCustomLogo}
                  storeName={getStoreName(selectedStore)}
                />
              </div>
            </div>
            <div className="tools">
              <button type="button" className="danger" onClick={m.resetAllData} title={`只重置「${getStoreName(selectedStore)}」盤點，不影響其他分店`}>
                重置此店
              </button>
            </div>
            <p className="rule">
              換算：袋 {weights?.bagWeight ?? '—'} 克、盒 {weights?.[getBoxWeightKey(selectedStore)] ?? '—'} 克、一包 {weights?.beanWeightPerPack ?? '—'} 克
              <button type="button" onClick={m.openWeightCalculator}>
                改設定
              </button>
            </p>
          </aside>

          <div className="ledger">
            {/* 各品項放哪些位置要等雲端設定回來才知道；先畫的話，位置會多出來又消失 */}
            {!m.beanLocationsLoaded ? <p className="loading">讀取中…</p> : null}
            {(m.beanLocationsLoaded ? rows : []).map(({ sec, beans }) => (
              <section className="sec" id={`bl-beans-${sec.id}`} key={sec.id}>
                <h2 data-flip={`h|${sec.id}`}>
                  {sec.title}
                  <small>{sec.note}</small>
                </h2>
                {beans.length === 0 ? <p className="none">這一類還沒有品項，到「品項設定」新增。</p> : null}
                {beans.map(({ bean, locs, total, done }, b) => {
                  const active = cur && cur.sec === sec.id && cur.bean === bean
                  return (
                    <div className={`bean${active ? ' on' : ''}`} key={bean} data-flip={`bean|${sec.id}|${bean}`} style={{ '--k': b }}>
                      <h3>{bean}</h3>
                      <div className="locs">
                        {locs.map(({ loc, label, values }) => (
                          <div className="loc" key={loc}>
                            <span>{label}</span>
                            <div className="ents">
                              {values.map((value, i) => {
                                const c = { sec: sec.id, bean, loc, i }
                                const mode = modeOf(c)
                                const isCur = keyOf(c) === keyOf(cur)
                                const warn = !isCur && checkRowPlausibility(value, mode, emptyWeights)
                                return (
                                  <label className={`ent${isCur ? ' cur' : ''}${warn ? ' warn' : ''}`} key={i} data-flip={`ent|${keyOf(c)}`} title={warn ? warn.message : undefined}>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      min="0"
                                      placeholder="0"
                                      value={value ?? ''}
                                      data-ent
                                      aria-label={`${bean} ${label} 第 ${i + 1} 筆`}
                                      aria-invalid={warn ? true : undefined}
                                      onChange={(e) => update(c, e.target.value)}
                                      onFocus={() => select(c)}
                                      onBlur={() => setTimeout(() => !document.activeElement?.hasAttribute?.('data-ent') && select(null), 0)}
                                      onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return
                                        e.preventDefault()
                                        next()
                                      }}
                                      onWheel={(e) => e.currentTarget.blur()}
                                    />
                                    <span className="unit">{UNIT[mode]}</span>
                                    {/* 按這排不能讓數字框失去焦點（不然鍵盤會收起來、這一格也會跟著收合） */}
                                    <span className="pick" role="group" aria-label="填寫方式" style={{ '--i': MODES.findIndex(([id]) => id === mode) }} onPointerDown={(e) => e.preventDefault()}>
                                      {MODES.map(([id, text]) => (
                                        <button key={id} type="button" tabIndex={-1} aria-pressed={id === mode} onClick={() => m.setCellInputMode(bean, sec.cat, sec.sub, loc, i, id)}>
                                          {text}
                                        </button>
                                      ))}
                                    </span>
                                  </label>
                                )
                              })}
                              <button className="add" type="button" data-flip={`add|${sec.id}|${bean}|${loc}`} aria-label={`${bean} ${label} 再加一筆`} onClick={() => add({ sec: sec.id, bean, loc, i: values.length - 1 })}>
                                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.4" fill="none" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className={`tot${done ? '' : ' none'}`}>
                        {done ? (
                          <>
                            {total}
                            <i>包</i>
                          </>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        </div>

        {/* 編輯列：點到哪一筆，下面就出現它的換算結果、刪除、下一筆 */}
        <div className={`dock${cur ? ' on' : ''}`} aria-live="polite" onPointerDown={(e) => e.preventDefault()}>
          <div>
            <p className="what">
              <b>{cur?.bean}</b>
              {cur ? `${secOf(cur.sec).title} · ${LOCS.find(([l]) => l === cur.loc)[1]} 第 ${cur.i + 1} 筆` : ''}
            </p>
            <p className={`calc${curHint ? ' warn' : ''}`}>
              {!cur ? null : curHint ? (
                curHint.message
              ) : !(curNum > 0) ? (
                '還沒填'
              ) : curMode === 'quantity' ? (
                <>
                  <b>{curNum}</b> 包
                </>
              ) : (
                <>
                  <span className="how">
                    {curNum} − {curMode === 'weightBag' ? '袋' : '盒'} {curEmpty} ÷ {weights?.beanWeightPerPack} ＝
                  </span>
                  <b>{curPacks.toFixed(1)}</b> 包
                </>
              )}
            </p>
            <div className="acts">
              <button type="button" aria-label="刪除這一筆" onClick={() => cur && remove(cur)}>
                <Cross />
              </button>
              <button type="button" className="next" onClick={next}>
                下一筆 ↵
              </button>
            </div>
          </div>
        </div>

        {m.removedRow ? (
          <p className="undo" role="status" key={m.removedRow.at}>
            已刪除 {m.removedRow.beanType} 的一筆
            <button type="button" onClick={m.restoreRemovedRow}>
              復原
            </button>
          </p>
        ) : null}

        <Scale weights={weights} boxType={boxType} onSettings={m.openWeightCalculator} />

        {/* 沿用舊版的彈窗：品項設定、換算設定、同步衝突 */}
        <div className="legacy modals">
          <InventoryConflictModal
            open={Boolean(m.inventoryConflict)}
            isStudio
            storeName={m.inventoryConflict?.storeName ?? getStoreName(selectedStore)}
            onKeepLocal={m.handleInventoryConflictKeepLocal}
            onUseRemote={m.handleInventoryConflictUseRemote}
            onMerge={m.handleInventoryConflictMerge}
          />
          {m.showWeightCalculator ? (
            <ClubWeightCalculatorModal
              selectedWeightStore={m.selectedWeightStore}
              setSelectedWeightStore={m.setSelectedWeightStore}
              weightMode={m.weightMode}
              setWeightMode={m.setWeightMode}
              weightSettings={m.weightSettings}
              tempInputValues={m.tempInputValues}
              updateWeightSetting={m.updateWeightSetting}
              resetWeightSettings={m.resetWeightSettings}
              calculations={m.calculations}
              updateCalculation={m.updateCalculation}
              addCalculation={m.addCalculation}
              removeCalculation={m.removeCalculation}
              resetCalculations={m.resetCalculations}
              onClose={() => m.setShowWeightCalculator(false)}
            />
          ) : null}
          <BeanTypesSettingsModal isOpen={m.showBeanTypesSettings} onClose={() => m.setShowBeanTypesSettings(false)} selectedStore={selectedStore} onRenameBeans={m.renameBeansInInventory} />
        </div>
      </div>
    </ToolPage>
  )
}
