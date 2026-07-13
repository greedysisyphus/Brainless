import logoCat from '../../assets/logo-cat.png'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import { useChangelog } from '../../contexts/ChangelogContext'
import ThemeSwitcher from '../ThemeSwitcher'
import ClubNav from './ClubNav'

export default function ClubHeader() {
  const { openChangelog } = useChangelog()

  return (
    <header className="club-header">
      <div className="club-brand-bar">
        <button
          type="button"
          className="club-icon-btn"
          onClick={openChangelog}
          title="本次更新"
          aria-label="本次更新"
        >
          <DocumentTextIcon className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-2">
          <div className="flex items-center gap-2.5">
            <img
              src={logoCat}
              alt=""
              className="h-10 w-10 rounded-full border border-[var(--club-border)] object-cover sm:h-11 sm:w-11"
            />
            <div className="min-w-0 text-center sm:text-left">
              <div className="truncate text-base font-bold tracking-tight text-[var(--club-text)] sm:text-lg">
                brainless
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--club-muted)]">
                Operations Club
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <ThemeSwitcher variant="club" />
          <span className="club-pill hidden sm:inline-flex">Workspace</span>
        </div>
      </div>

      <ClubNav />
    </header>
  )
}
