import { useEffect, useRef, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { checkRowPlausibility } from './coffeeBeanConstants'

const MODES = [
  { key: 'quantity', label: '數', unit: '包', placeholder: '數量' },
  { key: 'weightBag', label: '袋', unit: '克', placeholder: '總重含袋' },
  { key: 'weightBox', label: '盒', unit: '克', placeholder: '總重含盒' },
]

/**
 * 盤點的一列：數字＋數／袋／盒＋刪除。出杯豆、義式豆、賣豆的每個位置都用這一個。
 *
 * 按鈕放大到 40px 高（原本約 20×16，手機很難點準）；輸入框右邊標單位（包／克），
 * 一眼就看得出這列填的是包數還是重量 —— 之前「克數被當成包數加總」就是因為看不出來。
 */
export default function QuantityRow({
  value,
  mode,
  onChange,
  onModeChange,
  onRemove,
  emptyWeights,
}) {
  const current = MODES.find((m) => m.key === mode) || MODES[0]
  // 數字跟單位對不上（數填了 1250、袋填了 16）就在這列下面提醒，附一鍵改正。
  // 正在打的那一格先不判斷：打 1250 途中的「12」比空袋輕、打到第三位就超過 100，
  // 邊打邊判斷會讓提醒一直閃、畫面跟著跳。離開這一格才判斷。
  const [editing, setEditing] = useState(false)
  // 離開後等一下才判斷：手機上點「數／袋／盒」時數字框可能先失焦，
  // 這 0.25 秒內模式已經換好，判斷用的就是新模式，不會閃一下錯的提醒
  const blurTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(blurTimerRef.current), [])
  const startEditing = () => {
    clearTimeout(blurTimerRef.current)
    setEditing(true)
  }
  const stopEditing = () => {
    clearTimeout(blurTimerRef.current)
    blurTimerRef.current = setTimeout(() => setEditing(false), 250)
  }
  const hint = editing ? null : checkRowPlausibility(value, current.key, emptyWeights)
  // 收合動畫期間還要顯示剛才那句話，不然文字先消失、框才縮，看起來很怪
  const lastHintRef = useRef(null)
  if (hint) lastHintRef.current = hint
  const shownHint = hint || lastHintRef.current
  return (
    <div>
      {/* 數字框至少 6.5rem（放得下 5 位數＋單位）；卡片太窄時，按鈕整組換到下一行，而不是把數字擠到只剩兩格 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative min-w-[6.5rem] flex-[1_1_6.5rem]">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={startEditing}
            onBlur={stopEditing}
            placeholder={current.placeholder}
            // 拿掉桌機瀏覽器的上下箭頭：佔掉快一半寬度，手機本來就沒有
            className={`h-10 w-full min-w-0 rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] py-2 pl-3 pr-8 text-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-[var(--cw-text)] placeholder:text-[var(--cw-text-muted)] transition-colors duration-200 focus:border-[var(--cw-text)] focus:outline-none${
              hint ? ' !border-[var(--cw-warning)]' : ''
            }`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-[var(--cw-text-muted)]">
            {current.unit}
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div
            role="group"
            aria-label="填寫方式"
            className="flex h-10 shrink-0 overflow-hidden rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)]"
          >
            {MODES.map((m) => {
              const active = m.key === current.key
              return (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={active}
                  // 按下去時不要讓數字框失焦：打完 1000 直接點「盒」，
                  // 若先失焦就會用舊的「數」判斷、閃一下「超過 100 包」再消失，畫面跟著跳
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onModeChange(m.key)
                  }}
                  className={`!min-h-0 w-9 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--cw-text)] text-[var(--cw-bg)]'
                      : 'text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)] hover:text-[var(--cw-text)]'
                  }`}
                  style={{
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
          {onRemove ? (
            <button
              type="button"
              aria-label="刪除這列"
              onClick={onRemove}
              className="grid h-10 w-10 !min-h-0 shrink-0 place-items-center rounded-[var(--cw-radius)] text-[var(--cw-text-muted)] hover:bg-[var(--cw-danger-muted)] hover:text-[var(--cw-danger)]"
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          ) : (
            // 只剩一列時不能刪，但留同寬的空位：同一張卡片裡的列才會對齊、要換行也一起換
            <span aria-hidden className="h-10 w-10 shrink-0" />
          )}
        </div>
      </div>
      {/* 展開＋淡入（0.2 秒）：用 grid 的 0fr→1fr 做高度動畫，下面的內容是滑下去，而不是瞬間被推開 */}
      <div
        aria-hidden={!hint}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          hint ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          {shownHint ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-[var(--cw-warning)]">
              <span>{shownHint.message}</span>
              {shownHint.suggest.map((key) => (
                <button
                  key={key}
                  type="button"
                  tabIndex={hint ? 0 : -1}
                  onClick={() => onModeChange(key)}
                  className="!min-h-0 rounded-full border border-[var(--cw-warning)] px-2.5 py-1 font-semibold text-[var(--cw-warning)] hover:bg-[var(--cw-warning-muted)]"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                >
                  改成{MODES.find((m) => m.key === key).label}
                </button>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
