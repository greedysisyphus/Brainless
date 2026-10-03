import { useEffect, useRef, useState } from 'react'
import { Keypad } from '../../components/bl/Keypad'
import { ToolPage } from '../../components/bl/shared'
import { pressDecimalKey } from '../../components/cashier/cashMath'
import { STANDARD_SEGMENTS, STANDARD_VOLUMES, usePoursteadyModel } from '../PoursteadyAdjustment'
import '../../styles/bl-tools.css'

const SCHEMES = ['150ml', '140ml', '130ml']
const signed = (n) => (n > 0 ? `＋${n}` : n < 0 ? `−${-n}` : '0')

// 新版手沖機調整（/home/poursteady）。算法是舊版那一份：每段要調的量＝標準段水量−實測段水量，
// 沒填的段當作跟標準一樣，而且不列調整量。這裡只換畫面，實測累計水量用頁內鍵盤填。
export default function Pour() {
  const m = usePoursteadyModel()
  const { mode, coldScheme } = m
  const [cur, setCur] = useState(null)
  const fresh = useRef(false)

  const stdVol = mode === 'hot' ? STANDARD_VOLUMES.hot : STANDARD_VOLUMES.cold[coldScheme]
  const stdSeg = mode === 'hot' ? STANDARD_SEGMENTS.hot : STANDARD_SEGMENTS.cold[coldScheme]
  const rows = stdSeg.map((std, i) => {
    const seg = m.getDisplayVolume(i) - (i > 0 ? m.getDisplayVolume(i - 1) : 0)
    const value = m.currentVolumes[mode][i]
    // 還沒量的段不列要調多少：它的差只是前一段的誤差帶過來的
    return { i, std, stdVol: stdVol[i], value, seg, adjust: value === '' ? 0 : Math.round(std - seg) }
  })
  const total = m.getDisplayVolume(5)
  const stdTotal = stdVol[5]
  const diff = Math.round(total - stdTotal)
  const todo = rows.filter((r) => r.adjust !== 0)
  const filled = rows.some((r) => r.value !== '')
  const scale = Math.max(total, stdTotal, 1)

  const select = (i) => {
    fresh.current = true
    setCur(i)
  }
  const press = (key) => {
    if (cur == null) return
    const isFresh = fresh.current
    fresh.current = false
    m.handleDirectInput(cur, pressDecimalKey(m.currentVolumes[mode][cur], key, isFresh))
  }
  const next = () => (cur == null || cur >= 5 ? setCur(null) : select(cur + 1))
  const switchMode = (to) => {
    setCur(null)
    m.setMode(to)
  }

  // 實體鍵盤：直接打數字，Enter 下一段
  const live = useRef({})
  live.current = { press, next, cur }
  useEffect(() => {
    const onKeyDown = (e) => {
      if (live.current.cur == null || e.metaKey || e.ctrlKey || e.altKey) return
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

  return (
    <ToolPage className="bl-x bl-pour" path="/poursteady" section="門市工具" title="手沖機調整">
      <div className="tabs" role="group" aria-label="模式">
        <button type="button" aria-pressed={mode === 'hot'} onClick={() => switchMode('hot')}>
          熱手沖
        </button>
        <button type="button" aria-pressed={mode === 'cold'} onClick={() => switchMode('cold')}>
          冰手沖
        </button>
        {filled ? (
          <button type="button" className="side" onClick={() => (setCur(null), m.handleReset())}>
            全部清掉
          </button>
        ) : null}
      </div>
      {mode === 'cold' ? (
        <div className="pills" role="group" aria-label="冰手沖水量">
          {SCHEMES.map((s) => (
            <button key={s} type="button" aria-pressed={coldScheme === s} onClick={() => (setCur(null), m.handleColdSchemeChange(s))}>
              {s.replace('ml', ' ml')}
            </button>
          ))}
        </div>
      ) : null}

      <div className="split">
        <section className="card ledger">
          <div className="hd">
            <h2>實測水量</h2>
            <small>填每一段結束時的累計 ml</small>
          </div>
          <div className="cols" aria-hidden="true">
            <span>段</span>
            <span>標準</span>
            <span>實測</span>
            <span>要調</span>
          </div>
          {rows.map((r) => (
            <div key={r.i} className={`row${cur === r.i ? ' cur' : ''}`}>
              <b className="no">{r.i + 1}</b>
              <span className="std">
                <b>{r.stdVol}</b>
                <small>這段 {r.std}</small>
              </span>
              <button type="button" className={`ent${r.value === '' ? ' blank' : ''}`} aria-label={`第 ${r.i + 1} 段實測累計水量`} aria-pressed={cur === r.i} onClick={() => select(r.i)}>
                {r.value === '' ? '—' : r.value}
              </button>
              <span className={`adj${r.adjust === 0 ? ' ok' : ''}`}>{r.adjust === 0 ? (r.value === '' ? '' : '剛好') : `${signed(r.adjust)} ml`}</span>
            </div>
          ))}
        </section>

        <section className="card result" aria-live="polite">
          <div className="hd">
            <h2>調整結果</h2>
          </div>
          <p className="big">
            <b>{total}</b>
            <span>
              ml，標準 {stdTotal}
              {diff !== 0 ? <em>（{signed(diff)}）</em> : null}
            </span>
          </p>
          <div className="cmp">
            {[
              ['標準', stdSeg],
              ['實測', rows.map((r) => r.seg)],
            ].map(([label, segs]) => (
              <div key={label}>
                <span>{label}</span>
                <p>
                  {segs.map((v, i) => (
                    <i key={i} className={cur === i ? 'cur' : ''} style={{ width: `${(Math.max(v, 0) / scale) * 100}%` }} />
                  ))}
                </p>
              </div>
            ))}
          </div>
          {todo.length ? (
            <ul className="todo">
              {todo.map((r) => (
                <li key={r.i}>
                  <span>第 {r.i + 1} 段</span>
                  <small>
                    出 {Math.round(r.seg * 10) / 10}，標準 {r.std}
                  </small>
                  <b>{signed(r.adjust)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="none">{filled ? '每一段都跟標準一樣，不用調。' : '填了實測水量，這裡會列出每一段要加或減多少。'}</p>
          )}
        </section>
      </div>

      <div className={`dock${cur != null ? ' on' : ''}`} inert={cur != null ? undefined : ''}>
        <div>
          <div className="head">
            <p className="what">
              {cur != null ? (
                <>
                  <b>第 {cur + 1} 段</b>
                  標準累計 {stdVol[cur]} ml
                </>
              ) : null}
            </p>
            <button type="button" className="down" aria-label="收起鍵盤" onClick={() => setCur(null)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
          <p className="hint">直接打數字，Enter 下一段，Esc 收起</p>
          <Keypad onKey={press}>
            <button type="button" className="next" style={{ gridColumn: 'span 3' }} onClick={next}>
              {cur === 5 ? '完成' : '下一段'}
            </button>
          </Keypad>
        </div>
      </div>
    </ToolPage>
  )
}
