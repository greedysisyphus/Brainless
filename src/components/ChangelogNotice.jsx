import { DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useChangelog } from '../contexts/ChangelogContext'

export function ChangelogUpdateBar() {
  const { showUpdateBanner, latestVersion, latestTitle, openChangelog, dismissBanner } = useChangelog()

  if (!showUpdateBanner) return null

  const label = latestTitle ? `v${latestVersion} 更新 · ${latestTitle}` : `v${latestVersion} 更新`

  return (
    <div
      className="flex min-h-11 items-center gap-2 border-b border-[#c64022]/20 bg-[#fff1ed] px-3 text-[#9f301b] sm:px-5"
      role="status"
    >
      <button
        type="button"
        onClick={openChangelog}
        className="cw-touch-target flex min-w-0 flex-1 items-center text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
      >
        <span className="truncate text-sm font-semibold">{label}</span>
      </button>
      <button
        type="button"
        onClick={dismissBanner}
        className="cw-touch-target grid h-11 w-11 shrink-0 place-items-center rounded-[var(--cw-radius)] text-[#9f301b] hover:bg-[#c64022]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
        aria-label="關閉更新提示"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  )
}

export function ChangelogTrigger() {
  const { openChangelog, hasUnseenUpdate, latestVersion } = useChangelog()
  const unseenLabel = hasUnseenUpdate ? `本次更新，v${latestVersion} 尚未查看` : '本次更新'

  return (
    <button
      type="button"
      onClick={openChangelog}
      className="absolute left-5 grid h-11 w-11 place-items-center rounded-2xl border border-black/10 bg-white text-[#ec5836] shadow-sm sm:left-8 lg:left-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
      aria-label={unseenLabel}
    >
      <DocumentTextIcon className="h-5 w-5" />
      {hasUnseenUpdate ? (
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#c64022] ring-2 ring-white" aria-hidden />
      ) : null}
    </button>
  )
}
