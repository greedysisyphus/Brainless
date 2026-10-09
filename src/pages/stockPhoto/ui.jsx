import { STYLES } from './labelModel'

// 倉庫標籤的小元件：電腦版右側面板和手機版底部工具列共用

export const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

export const I = {
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
  type: 'M5 6V4h14v2M12 4v16M9 20h6',
  palette: 'M12 3a9 9 0 100 18c1.1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-1.5 2-1.5H17a4 4 0 004-4c0-4.4-4-8.5-9-8.5zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
  image: 'M4 5h16v14H4zM4 15l4-4 5 5 3-3 4 4M15.5 9.5h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  dup: 'M8 8h11v11H8zM5 16V5h11',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  smaller: 'M7 12h10',
}

// 透明的日期欄蓋在日期字上：電腦上點了不會自己跳出日曆，要叫 showPicker
export const openPicker = (e) => {
  try {
    e.currentTarget.showPicker?.()
  } catch {
    // 不支援就交給瀏覽器預設行為
  }
}

export function Swatches({ value, onPick }) {
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

/** ‹ 9/14 › 一天一天調；點中間的日期叫出日曆 */
export function DateStepper({ value, onChange, onStep }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="前一天" onClick={() => onStep(-1)}>
        <Icon d={I.left} />
      </button>
      <label className="day">
        <b>{shortDateOf(value)}</b>
        <input type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label="選日期" onClick={openPicker} />
      </label>
      <button type="button" aria-label="後一天" onClick={() => onStep(1)}>
        <Icon d={I.right} />
      </button>
    </div>
  )
}

function shortDateOf(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${Number(m[2])}/${Number(m[3])}` : ''
}

/** 一顆快捷：長得跟貼出去的標籤一樣 */
export function Chip({ preset, style, date, managing, onPick }) {
  return (
    <button
      type="button"
      className={`chip ${preset.kind === 'cross' ? 'strike' : `s-${preset.style || style}`}`}
      onClick={onPick}
      aria-label={managing ? `移除快捷「${preset.text || '日期'}」` : undefined}
    >
      {preset.kind === 'cross' ? <Icon d={I.x} size={16} /> : null}
      {preset.dated && preset.text ? <small>{shortDateOf(date)}</small> : null}
      {preset.text || shortDateOf(date)}
      {managing ? <i aria-hidden="true">×</i> : null}
    </button>
  )
}
