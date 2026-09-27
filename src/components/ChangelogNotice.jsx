import { DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useChangelog } from '../contexts/ChangelogContext'
import updateCat from '../assets/update-cat.webp'

export function ChangelogUpdateBar() {
  const { showUpdateBanner, latestVersion, latestTitle, openChangelog, dismissBanner } = useChangelog()

  if (!showUpdateBanner) return null

  return (
    // 細、置中、跟 header 同色系：原本整條粉紅色帶太搶，又看不出能點
    <div className="relative flex h-10 items-center justify-center border-b border-black/[0.06] bg-white/60 px-11" role="status">
      <button
        type="button"
        onClick={openChangelog}
        className="group flex !min-h-0 min-w-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-1 text-[13px] text-[#171717] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
      >
        <img src={updateCat} alt="" aria-hidden className="h-5 w-auto shrink-0" />
        <span className="shrink-0 font-bold text-[#ec5836]">v{latestVersion}</span>
        {latestTitle ? <span className="min-w-0 truncate font-semibold">{latestTitle}</span> : null}
        <span className="shrink-0 font-semibold text-[#ec5836] underline-offset-2 group-hover:underline">
          看更新 →
        </span>
        <img src={updateCat} alt="" aria-hidden className="h-5 w-auto shrink-0 -scale-x-100" />
      </button>
      <button
        type="button"
        onClick={dismissBanner}
        className="absolute right-1 top-1/2 grid h-9 w-9 !min-h-0 -translate-y-1/2 place-items-center rounded-full text-black/40 hover:bg-black/5 hover:text-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cw-focus-ring)]"
        aria-label="關閉更新提示"
      >
        <XMarkIcon className="h-4 w-4" />
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
