import { createContext, useContext, useLayoutEffect, useMemo } from 'react'

export const STORAGE_KEY_APP_THEME = 'app-theme'
const CLUB_THEME = 'club'
const CLUB_THEME_COLOR = '#f3f0e8'

function migrateStoredThemeToClub() {
  try {
    if (typeof localStorage === 'undefined') return
    const saved = localStorage.getItem(STORAGE_KEY_APP_THEME)
    if (saved !== CLUB_THEME) {
      localStorage.setItem(STORAGE_KEY_APP_THEME, CLUB_THEME)
    }
  } catch {
    /* ignore */
  }
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-app-theme', CLUB_THEME)
    migrateStoredThemeToClub()
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', CLUB_THEME_COLOR)
  }, [])

  const value = useMemo(
    () => ({
      theme: CLUB_THEME,
      setTheme: () => {},
      toggleTheme: () => {},
      isStudio: true,
      isClub: true,
      isModern: true,
      isClassic: false,
    }),
    []
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
