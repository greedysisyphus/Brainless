import { useMemo, useEffect, useState } from 'react'
import NowPlayingMarquee from '../NowPlayingMarquee'
import StudioHeader from './StudioHeader'
import StudioSidebar from './StudioSidebar'
import { auth, checkAdminStatus } from '../../utils/firebase'

export default function StudioShell({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        if (mounted) setIsAdmin(false)
        return
      }
      try {
        const ok = await checkAdminStatus(user.uid)
        if (mounted) setIsAdmin(ok)
      } catch {
        if (mounted) setIsAdmin(false)
      }
    })
    return () => {
      mounted = false
      unsub()
    }
  }, [])

  const marquee = useMemo(() => <NowPlayingMarquee visualVariant="studio" />, [])

  return (
    <div className="cw-shell-min-h relative flex flex-col bg-[var(--cw-bg)] text-[var(--cw-text)]">
      {marquee}
      <StudioHeader isAdmin={isAdmin} />
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1">
        <StudioSidebar isAdmin={isAdmin} />
        <main className="min-h-0 flex-1 overflow-y-auto cw-pb-safe">
          <div className="container-custom max-w-7xl px-3 py-5 sm:px-4 md:py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
