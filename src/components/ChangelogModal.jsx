import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { CwButton } from './studio/ui/CwButton'
import { CwModalFrame } from './studio/ui/CwModalFrame'

export default function ChangelogModal({ visible, onClose, entries }) {
  const [showOnlyLatest, setShowOnlyLatest] = useState(true)
  const [expandedVersions, setExpandedVersions] = useState(() =>
    new Set(entries.length ? [entries[0].version] : [])
  )

  const latestVersion = entries[0]?.version

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

  const changelogList = (
    <>
      {entries.length > 1 && (
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--cw-border)] pb-2">
          <button
            type="button"
            onClick={() => setShowOnlyLatest((v) => !v)}
            className="rounded-[var(--cw-radius-sm)] border border-[var(--cw-border)] px-3 py-1.5 text-xs text-[var(--cw-text-muted)] hover:bg-[var(--cw-mega-surface)]"
          >
            {showOnlyLatest ? '查看全部版本' : '只看最新'}
          </button>
        </div>
      )}
      <div className="space-y-6">
        {list.map((entry) => {
          const isExpanded = expandedVersions.has(entry.version)
          const isCollapsible = !showOnlyLatest && entries.length > 1
          return (
            <section
              key={entry.version}
              className="border-b border-[var(--cw-border)] pb-4 last:border-0 last:pb-0"
            >
              <button
                type="button"
                className={`mb-2 flex w-full flex-wrap items-center gap-2 text-left ${isCollapsible ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                onClick={isCollapsible ? () => toggleVersion(entry.version) : undefined}
              >
                {isCollapsible && (
                  <span className="text-[var(--cw-text-muted)]">
                    {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  </span>
                )}
                <span className="inline-flex items-center rounded-[var(--cw-radius-sm)] border border-[var(--cw-border-strong)] px-2.5 py-0.5 text-xs font-medium text-[var(--cw-text)]">
                  v{entry.version}
                </span>
                <span className="cw-label">{entry.date}</span>
                {entry.title ? <span className="cw-label">· {entry.title}</span> : null}
              </button>
              {(!isCollapsible || isExpanded) && (
                <ul className="space-y-2">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cw-text-muted)]" aria-hidden />
                      <span className="text-sm leading-relaxed text-[var(--cw-text)]">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </>
  )

  return createPortal(
    <CwModalFrame
      open={visible}
      onClose={onClose}
      title="更新內容"
      description="可捲動查看過往版本紀錄"
      maxWidthClass="max-w-lg"
      contentMaxHeightClass="max-h-[60vh]"
      footer={
        <CwButton type="button" className="w-full" onClick={onClose}>
          知道了
        </CwButton>
      }
    >
      {changelogList}
    </CwModalFrame>,
    document.body
  )
}
