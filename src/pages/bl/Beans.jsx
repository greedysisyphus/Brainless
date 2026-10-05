import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Keypad } from '../../components/bl/Keypad'
import { SavedTick, Skel, ToolPage, jumpTo } from '../../components/bl/shared'
import BeanTypesSettingsModal from '../../components/BeanTypesSettingsModal'
import { pressDecimalKey } from '../../components/cashier/cashMath'
import ClubWeightCalculatorModal from '../coffeeBean/ClubWeightCalculatorModal'
import { STORES, checkRowPlausibility, getBoxWeightKey, getPacksFromWeight, getStoreName } from '../coffeeBean/coffeeBeanConstants'
import ExportLogoPicker from '../coffeeBean/ExportLogoPicker'
import { InventoryConflictModal, InventorySyncBanner } from '../coffeeBean/InventorySyncUI'
import { useCoffeeBeanManager } from '../useCoffeeBeanManager'
import '../../styles/bl-beans.css'

// 新版咖啡豆管理。資料、同步、匯出全部用舊版同一份邏輯（useCoffeeBeanManager），這裡只重畫畫面：
// 一張盤點表（一種豆一列）＋本次盤點的總計。點一格，底部長出數字鍵盤和「數／袋／盒」，
// 不叫系統鍵盤（位置會跳、會蓋住正在填的那一列）。接了實體鍵盤也可以直接打。
const LOCS = [
  ['store', '店面'],
  ['breakRoom', '員休室'],
  ['dryStorage', '乾倉'],
]
const MODES = [
  ['quantity', '數', '包'],
  ['weightBag', '袋', '秤重'],
  ['weightBox', '盒', '秤重'],
]
const UNIT = { quantity: '包', weightBag: '克·袋', weightBox: '克·盒' }
const WEEKDAYS = '日一二三四五六'
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const DUR = 460
const keyOf = (c) => (c ? `${c.sec}|${c.bean}|${c.loc}|${c.i}` : '')
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 加一筆、刪一筆時先呼叫 capture() 記下每個東西的位置，
 * 畫面更新後讓它們從舊位置滑到新位置，不是直接跳過去。
 */
function useFlip(rootRef) {
  const snap = useRef(null)
  const capture = () => {
    const root = rootRef.current
    if (!root || reducedMotion()) return
    const items = new Map()
    root.querySelectorAll('[data-flip]').forEach((el) => items.set(el.dataset.flip, el.getBoundingClientRect()))
    snap.current = { items, at: performance.now() }
  }
  useLayoutEffect(() => {
    const before = snap.current
    const root = rootRef.current
    if (!before || !root) return
    snap.current = null
    if (performance.now() - before.at > 400) return // 隔太久（中間可能捲動過），舊位置不能用了
    const rowShift = new Map()
    root.querySelectorAll('[data-flip]').forEach((el) => {
      const a = before.items.get(el.dataset.flip)
      const now = el.getBoundingClientRect()
      if (!a) {
        // 新加的一筆：原地長出來
        if (el.classList.contains('ent')) el.animate([{ opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1 }], { duration: DUR, easing: EASE })
        return
      }
      const dx = a.left - now.left
      let dy = a.top - now.top
      if (el.classList.contains('bean')) rowShift.set(el, dy)
      else {
        const row = el.closest('.bean')
        if (row) dy -= rowShift.get(row) || 0
      }
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: DUR, easing: EASE })
    })
  })
  return capture
}

const Cross = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" fill="none" />
  </svg>
)

export default function Beans() {
  const m = useCoffeeBeanManager()
  const { selectedStore, inventory, beanTypes } = m
  const rootRef = useRef(null)
  const dockRef = useRef(null)
  const capture = useFlip(rootRef)
  const [cur, setCur] = useState(null)
  const fresh = useRef(false) // 剛選到這一格：第一個數字直接取代原本的值（等於全選後重打）
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
  const valueOf = (c) => String(secOf(c.sec).data[c.bean]?.[c.loc]?.[c.i] ?? '')
  const update = (c, value) => {
    const s = secOf(c.sec)
    if (s.cat === 'retail') m.updateRetailQuantity(c.bean, c.loc, c.i, value)
    else m.updateQuantity(s.cat, s.sub, c.bean, c.loc, c.i, value)
  }
  const select = (c) => {
    fresh.current = true
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
    select({ ...c, i: count })
  }
  const remove = (c) => {
    const s = secOf(c.sec)
    capture()
    if ((s.data[c.bean]?.[c.loc]?.length || 1) > 1) m.removeRowWithUndo(s.cat, s.sub, c.bean, c.loc, c.i)
    else update(c, '')
    setCur(null)
  }
  // 下一筆：這一格有填就在同位置再開一筆；還空著就當作填完了
  const next = () => {
    if (!cur) return
    if (valueOf(cur) === '') setCur(null)
    else add(cur)
  }
  const press = (key) => {
    if (!cur) return
    const isFresh = fresh.current
    fresh.current = false
    update(cur, pressDecimalKey(valueOf(cur), key, isFresh))
  }

  // 實體鍵盤（桌機、接了鍵盤的 iPad）：直接打數字。正在別的輸入框（彈窗裡）打字時不攔。
  const live = useRef({})
  live.current = { press, next, cur }
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!live.current.cur || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable], .modals')) return
      if (/^[0-9.]$/.test(e.key)) live.current.press(e.key)
      else if (e.key === 'Backspace') live.current.press('back')
      else if (e.key === 'Enter') live.current.next()
      else if (e.key === 'Escape') setCur(null)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // 正在填的那一格如果被底部鍵盤擋住，捲到鍵盤上方看得到的地方
  const curKey = keyOf(cur)
  useEffect(() => {
    if (!curKey) return undefined
    const timer = setTimeout(() => {
      const el = rootRef.current?.querySelector('.ent.cur')
      const dockTop = dockRef.current?.getBoundingClientRect().top ?? window.innerHeight
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.bottom > dockTop - 16 || r.top < 120) window.scrollBy({ top: r.top + r.height / 2 - (120 + dockTop) / 2, behavior: reducedMotion() ? 'auto' : 'smooth' })
    }, 320) // 等鍵盤長出來才知道它多高
    return () => clearTimeout(timer)
  }, [curKey])

  // 換店：正在填的那一格不存在了
  useEffect(() => setCur(null), [selectedStore])
  // 重量設定（袋重、盒重、一包幾克）只會從雲端讀「換算設定選到的那家店」。跟著盤點的店一起換，
  // 不然切到 D7／D13 時用的是這台裝置上存的舊值，別人改過設定也不會知道。
  const { setSelectedWeightStore } = m
  useEffect(() => setSelectedWeightStore(selectedStore), [selectedStore, setSelectedWeightStore])

  const curMode = cur ? modeOf(cur) : null
  const curValue = cur ? valueOf(cur) : ''
  const curNum = parseFloat(curValue)
  const curHint = cur ? checkRowPlausibility(curValue, curMode, emptyWeights) : null
  const boxWeight = weights?.[getBoxWeightKey(selectedStore)]
  const curPacks = cur && curMode !== 'quantity' ? getPacksFromWeight(curValue, weights, curMode === 'weightBag' ? 'bag' : boxType) : 0
  const setMode = (id) => {
    const s = secOf(cur.sec)
    m.setCellInputMode(cur.bean, s.cat, s.sub, cur.loc, cur.i, id)
  }

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
            status={m.inventoryLocked ? 'loading' : m.inventorySyncStatus}
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
          <SavedTick status={m.inventorySyncStatus} />
          <a href="#bl-beans-sum" onClick={jumpTo('bl-beans-sum')}>總計與匯出 ↓</a>
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
              <SavedTick status={m.inventorySyncStatus} />
            </p>
            <div className="bar" aria-hidden="true">
              <i style={{ width: `${allBeans.length ? (doneCount / allBeans.length) * 100 : 0}%` }} />
            </div>
            <ul className="totals">
              {rows.map(({ sec, beans }) => (
                <li key={sec.id}>
                  <a href={`#bl-beans-${sec.id}`} onClick={jumpTo(`bl-beans-${sec.id}`)}>
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

          <div className={`ledger${m.inventoryLocked ? ' locked' : ''}`} inert={m.inventoryLocked ? '' : undefined}>
            {/* 各品項放哪些位置要等雲端設定回來才知道；先畫的話，位置會多出來又消失 */}
            {!m.beanLocationsLoaded ? <Skel lines={6} label="盤點表讀取中" /> : null}
            {(m.beanLocationsLoaded ? rows : []).map(({ sec, beans }) => (
              <section className="sec" id={`bl-beans-${sec.id}`} key={sec.id}>
                <h2 data-flip={`h|${sec.id}`}>
                  {sec.title}
                  <small>{sec.note}</small>
                </h2>
                {beans.length === 0 ? <p className="none">這一類還沒有品項，到「品項設定」新增。</p> : null}
                {beans.map(({ bean, locs, total, done }) => {
                  const active = cur && cur.sec === sec.id && cur.bean === bean
                  return (
                    <div className={`bean${active ? ' on' : ''}`} key={bean} data-flip={`bean|${sec.id}|${bean}`}>
                      <h3>{bean}</h3>
                      <div className="locs">
                        {locs.map(({ loc, label, values }) => (
                          <div className="loc" key={loc}>
                            <span>{label}</span>
                            <div className="ents">
                              {values.map((value, i) => {
                                const c = { sec: sec.id, bean, loc, i }
                                const mode = modeOf(c)
                                const isCur = keyOf(c) === curKey
                                const warn = !isCur && checkRowPlausibility(value, mode, emptyWeights)
                                const text = String(value ?? '')
                                return (
                                  <button
                                    type="button"
                                    className={`ent${isCur ? ' cur' : ''}${warn ? ' warn' : ''}`}
                                    key={i}
                                    data-flip={`ent|${keyOf(c)}`}
                                    aria-pressed={isCur}
                                    aria-label={`${bean} ${label} 第 ${i + 1} 筆：${text || '還沒填'} ${UNIT[mode]}${warn ? `，${warn.message}` : ''}`}
                                    title={warn ? warn.message : undefined}
                                    onClick={() => select(c)}
                                  >
                                    <b className={text ? '' : 'empty'}>{text || '0'}</b>
                                    <span className="unit">{UNIT[mode]}</span>
                                  </button>
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

        {/* 底部鍵盤：點一格才長出來。上面是這一格的換算結果和填寫方式，下面是數字鍵 */}
        <div className={`dock${cur ? ' on' : ''}`} ref={dockRef} inert={cur ? undefined : ''}>
          <div>
            <div className="head">
              <p className="what">
                {cur ? (
                  <>
                    <b>{cur.bean}</b>
                    {secOf(cur.sec).title} · {LOCS.find(([l]) => l === cur.loc)[1]} 第 {cur.i + 1} 筆
                  </>
                ) : null}
              </p>
              <p className={`calc${curHint ? ' warn' : ''}`} aria-live="polite">
                {!cur ? null : curHint ? (
                  curHint.message
                ) : !(curNum > 0) ? (
                  '還沒填'
                ) : curMode === 'quantity' ? (
                  <>
                    <b>{curValue}</b> 包
                  </>
                ) : (
                  <>
                    <span className="how">
                      {curValue} 克 − {curMode === 'weightBag' ? '袋' : '盒'} {curMode === 'weightBag' ? weights?.bagWeight : boxWeight} ÷ {weights?.beanWeightPerPack} ＝
                    </span>
                    <b>{curPacks.toFixed(1)}</b> 包
                  </>
                )}
              </p>
              <button type="button" className="down" aria-label="收起鍵盤" onClick={() => setCur(null)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
            <div className="modes" role="group" aria-label="填寫方式" style={{ '--i': Math.max(0, MODES.findIndex(([id]) => id === curMode)) }}>
              {MODES.map(([id, text, sub]) => (
                <button key={id} type="button" aria-pressed={id === curMode} onClick={() => cur && setMode(id)}>
                  {text}
                  <small>{sub}</small>
                </button>
              ))}
            </div>
            <p className="hint">直接用鍵盤輸入數字，Enter 下一筆，Esc 收起</p>
            <Keypad onKey={press}>
              <button type="button" aria-label="刪除這一筆" onClick={() => cur && remove(cur)}>
                <Cross />
              </button>
              <button type="button" className="next wide" onClick={next}>
                下一筆
              </button>
            </Keypad>
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
