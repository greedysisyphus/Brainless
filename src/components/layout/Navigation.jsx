import { NavLink } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import React from 'react'
import { auth, checkAdminStatus } from '../../utils/firebase'
import anime from 'animejs/lib/anime.es.js'
import { getNavItems } from '../../config/navigation.jsx'

function Navigation() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [navTop, setNavTop] = useState(114)
  const navItemsRef = useRef([])
  const navRef = useRef(null)

  const allMenuItems = getNavItems(isAdmin).map(({ path, label, Icon, section, accentColor }) => ({
      path,
      label,
      section,
      accentColor,
      icon: React.createElement(Icon, { className: 'w-5 h-5' }),
    }))

  useEffect(() => {
    let isMounted = true

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!isMounted) return

      if (user) {
        try {
          const adminStatus = await checkAdminStatus(user.uid)
          if (isMounted) {
            setIsAdmin(adminStatus)
            setError('')
          }
        } catch (err) {
          console.error('檢查管理員狀態失敗:', err)
          if (isMounted) {
            setIsAdmin(false)
            setError('權限檢查失敗')
          }
        }
      } else if (isMounted) {
        setIsAdmin(false)
        setError('')
      }

      if (isMounted) setIsLoading(false)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const lastAppliedPx = { current: null }

    const calculateNavTop = () => {
      const header = document.querySelector('header')
      if (!header) return

      const headerRect = header.getBoundingClientRect()
      const newTop = headerRect.top + headerRect.height + 2
      const rounded = Math.round(newTop)
      if (lastAppliedPx.current === rounded) return
      lastAppliedPx.current = rounded
      setNavTop(rounded)
    }

    calculateNavTop()

    let scrollRaf = null
    const onScroll = () => {
      if (scrollRaf != null) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null
        calculateNavTop()
      })
    }

    let resizeRaf = null
    const onResize = () => {
      if (resizeRaf != null) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null
        calculateNavTop()
      })
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })

    const header = document.querySelector('header')
    let resizeObserver = null
    if (header && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        onResize()
      })
      resizeObserver.observe(header)
    }

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      if (scrollRaf != null) cancelAnimationFrame(scrollRaf)
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf)
      if (resizeObserver && header) {
        resizeObserver.unobserve(header)
      }
    }
  }, [])

  useEffect(() => {
    if (isLoading || navItemsRef.current.length === 0) return

    const timeline = anime.timeline({
      autoplay: true,
      easing: 'easeOutExpo',
    })

    timeline.add({
      targets: navItemsRef.current,
      opacity: [0, 1],
      translateY: [-20, 0],
      scale: [0.9, 1],
      delay: anime.stagger(30),
      duration: 400,
    })
  }, [isLoading, allMenuItems.length])

  if (isLoading) {
    return (
      <nav
        ref={navRef}
        className="bg-surface sticky z-50 shadow-lg border-t border-l border-r border-b border-white/10"
        style={{ top: `${navTop}px` }}
      >
        <div className="container-custom py-2 sm:py-4">
          <div className="flex justify-center gap-2 sm:gap-4 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8">
            {[...getNavItems(false), { path: '__admin__' }].map(({ path }) => (
              <div
                key={path}
                className="flex flex-col items-center w-[5.5rem] sm:w-28 min-h-[4.5rem] sm:min-h-20 p-2 sm:p-3 rounded-lg animate-pulse"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/10 rounded mb-1.5 sm:mb-2"></div>
                <div className="w-12 h-3 bg-white/10 rounded text-xs sm:text-sm"></div>
              </div>
            ))}
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav
      ref={navRef}
      className="bg-surface/60 backdrop-blur-xl sticky z-50 shadow-xl border-t border-l border-r border-b border-white/10 overflow-visible"
      style={{ top: `${navTop}px` }}
    >
      <div className="container-custom py-1 sm:py-2 md:py-4 overflow-visible">
        {error && (
          <div className="mb-3 sm:mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 sm:p-3 animate-slide-in">
            <div className="flex items-center gap-2">
              <div className="text-amber-500 text-sm sm:text-base">⚠️</div>
              <p className="text-amber-400 text-xs sm:text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="flex justify-center xl:justify-start gap-1 sm:gap-2 md:gap-3 lg:gap-2 xl:gap-3 flex-nowrap overflow-x-auto overflow-y-visible scrollbar-hide py-1 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8">
          {allMenuItems.map(({ path, label, icon }, index) => (
            <NavLink
              key={path}
              to={path}
              ref={(el) => {
                if (el) navItemsRef.current[index] = el
              }}
              onMouseEnter={(e) => {
                if (window.innerWidth >= 640) {
                  anime({
                    targets: e.currentTarget,
                    scale: 1.05,
                    rotateZ: [0, -3, 3, 0],
                    duration: 300,
                    easing: 'easeOutElastic(1, .6)',
                  })
                }
              }}
              className={({ isActive }) =>
                `
                group relative
                flex flex-col items-center justify-center
                flex-shrink-0
                w-[3.5rem] sm:w-[4rem] md:w-[4.5rem] lg:w-24 xl:w-28
                min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] lg:min-h-20
                p-1 sm:p-1.5 md:p-2 lg:p-3
                rounded-lg sm:rounded-xl
                transition-all duration-300
                opacity-0
                touch-manipulation
                ${
                  isActive
                    ? 'text-primary bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-lg shadow-primary/20 scale-105'
                    : 'text-text-secondary active:text-text-primary active:bg-white/10'
                }
                active:shadow-xl active:shadow-primary/10
                border border-white/5 active:border-primary/30
              `
              }
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-primary/10 animate-pulse-glow opacity-50" />
                  )}

                  <div
                    className={`mb-0.5 sm:mb-1 md:mb-1.5 lg:mb-2 relative z-10 transition-all duration-300 ${
                      isActive ? 'scale-110' : 'group-hover:scale-110'
                    }`}
                  >
                    {React.cloneElement(icon, {
                      className:
                        'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 transition-transform duration-300',
                    })}
                  </div>
                  <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-center leading-tight font-medium relative z-10 px-0.5">
                    {label}
                  </div>

                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-b-lg sm:rounded-b-xl animate-pulse-glow" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default Navigation
