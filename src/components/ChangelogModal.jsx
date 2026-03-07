import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon, SparklesIcon, CheckCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

/**
 * 更新內容彈窗：可切換「只看最新」、舊版收合／展開
 * @param {{ visible: boolean, onClose: () => void, entries: Array<{ version: string, date: string, title?: string, items: string[] }> }} props
 */
export default function ChangelogModal({ visible, onClose, entries }) {
  const [showOnlyLatest, setShowOnlyLatest] = useState(true)
  const [expandedVersions, setExpandedVersions] = useState(() =>
    new Set(entries.length ? [entries[0].version] : [])
  )

  const latestVersion = entries[0]?.version

  // 當 entries 變更時，預設展開最新一版
  useEffect(() => {
    if (entries.length) {
      setExpandedVersions((prev) => new Set([...prev, entries[0].version]))
    }
  }, [latestVersion])

  const toggleVersion = useCallback((version) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev)
      if (next.has(version)) next.delete(version)
      else next.add(version)
      return next
    })
  }, [])

  const handleKeyDown = useCallback(
    (e) => {
      if (!visible) return
      if (e.key === 'Escape') onClose()
    },
    [visible, onClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!visible) return null

  const list = showOnlyLatest && entries.length ? [entries[0]] : entries

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-white/15 rounded-2xl shadow-2xl max-w-lg w-full max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <SparklesIcon className="w-6 h-6 text-primary shrink-0" aria-hidden />
              <h2 className="text-lg font-bold text-primary tracking-tight">更新內容</h2>
            </div>
            <p className="text-xs text-text-secondary">可捲動查看過往版本紀錄</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-text-secondary hover:text-primary transition-colors shrink-0"
            aria-label="關閉"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {entries.length > 1 && (
          <div className="px-6 py-2 border-b border-white/10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOnlyLatest((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-primary border border-white/10 transition-colors"
            >
              {showOnlyLatest ? '查看全部版本' : '只看最新'}
            </button>
          </div>
        )}

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
          {list.map((entry) => {
            const isExpanded = expandedVersions.has(entry.version)
            const isCollapsible = !showOnlyLatest && entries.length > 1
            return (
              <section
                key={entry.version}
                className="border-b border-white/10 last:border-0 pb-4 last:pb-0"
              >
                <button
                  type="button"
                  className={`w-full flex items-center gap-2 flex-wrap mb-2 text-left ${isCollapsible ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                  onClick={isCollapsible ? () => toggleVersion(entry.version) : undefined}
                >
                  {isCollapsible && (
                    <span className="text-primary/70 shrink-0">
                      {isExpanded ? (
                        <ChevronDownIcon className="w-4 h-4" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" />
                      )}
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                    v{entry.version}
                  </span>
                  <span className="text-xs text-text-secondary">{entry.date}</span>
                  {entry.title && (
                    <span className="text-xs text-text-secondary">· {entry.title}</span>
                  )}
                </button>
                {(!isCollapsible || isExpanded) && (
                  <ul className="space-y-2">
                    {entry.items.map((item, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <CheckCircleIcon className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" aria-hidden />
                        <span className="text-sm text-primary leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-primary/25 border border-primary/40 text-primary font-medium hover:bg-primary/35 active:scale-[0.98] transition-all"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}
