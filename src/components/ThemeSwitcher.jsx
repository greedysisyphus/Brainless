import { useEffect, useRef, useState } from 'react'
import { PaintBrushIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../contexts/ThemeContext'

const THEMES = [
  { value: 'classic', label: 'Classic' },
  { value: 'studio', label: 'Studio' },
  { value: 'club', label: 'Club' },
]

export default function ThemeSwitcher({ variant = 'default' }) {
  const { theme, setTheme } = useTheme()
  const club = variant === 'club'
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const shell = club
    ? 'border-[var(--club-border,#dedbd3)] bg-white text-[var(--club-text,#171717)]'
    : 'border-[var(--cw-border,rgba(255,255,255,.2))] bg-[var(--cw-surface,rgba(255,255,255,.1))] text-[var(--cw-text,#fff)] backdrop-blur-sm'
  const activeBtn = club
    ? 'bg-[#171717] text-white shadow-sm'
    : 'bg-[var(--cw-text,#fff)] text-[var(--cw-bg,#171717)] shadow-sm'
  const idleBtn = club
    ? 'text-[#77746d] hover:bg-[#fff1ed] hover:text-[#c84629]'
    : 'text-[var(--cw-text-muted,#d4d4d8)] hover:bg-white/10 hover:text-[var(--cw-text,#fff)]'

  const current = THEMES.find((t) => t.value === theme) || THEMES[0]

  return (
    <div ref={rootRef} className="relative z-20">
      {/* 手機：單一按鈕 + 下拉，避免擋標題 */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`主題：${current.label}`}
          title={`主題：${current.label}`}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm ${shell}`}
        >
          <PaintBrushIcon className="h-4 w-4 opacity-80" aria-hidden />
        </button>
        {open ? (
          <div
            role="listbox"
            aria-label="選擇介面主題"
            className={`absolute right-0 top-[calc(100%+6px)] min-w-[7.5rem] overflow-hidden rounded-xl border p-1 shadow-lg ${shell}`}
          >
            {THEMES.map(({ value, label }) => {
              const active = theme === value
              return (
                <button
                  key={value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setTheme(value)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-colors ${
                    active ? activeBtn : idleBtn
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* 桌面／平板：完整三段切換 */}
      <div
        className={`hidden items-center gap-1 rounded-xl border p-1 shadow-sm sm:inline-flex ${shell}`}
        role="group"
        aria-label="選擇介面主題"
      >
        <PaintBrushIcon className="ml-1 h-4 w-4 opacity-70" aria-hidden />
        {THEMES.map(({ value, label }) => {
          const active = theme === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={active}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                active ? activeBtn : idleBtn
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
