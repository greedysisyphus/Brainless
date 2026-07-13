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

  return (
    <div className={`inline-flex items-center gap-1 rounded-xl border p-1 shadow-sm ${club ? 'border-[var(--club-border,#dedbd3)] bg-white text-[var(--club-text,#171717)]' : 'border-[var(--cw-border,rgba(255,255,255,.2))] bg-[var(--cw-surface,rgba(255,255,255,.1))] text-[var(--cw-text,#fff)] backdrop-blur-sm'}`} role="group" aria-label="選擇介面主題">
      <PaintBrushIcon className="ml-1 h-4 w-4 opacity-70" aria-hidden />
      {THEMES.map(({ value, label }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-all sm:px-2.5 ${active ? (club ? 'bg-[#171717] text-white shadow-sm' : 'bg-[var(--cw-text,#fff)] text-[var(--cw-bg,#171717)] shadow-sm') : (club ? 'text-[#77746d] hover:bg-[#fff1ed] hover:text-[#c84629]' : 'text-[var(--cw-text-muted,#d4d4d8)] hover:bg-white/10 hover:text-[var(--cw-text,#fff)]')}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
