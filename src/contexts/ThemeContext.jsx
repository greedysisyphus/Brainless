import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react'

export const STORAGE_KEY_APP_THEME = 'app-theme'

const VALID_THEMES = ['classic', 'studio', 'club']
const DEFAULT_THEME = 'club'

function readInitialTheme() {
  try {
    const saved = typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY_APP_THEME)
      : null
    if (saved === 'classic') return 'classic'
    if (saved === 'studio') return 'studio'
    if (saved === 'club') return 'club'
    if (saved === 'craftwork') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_APP_THEME, 'studio')
      }
      return 'studio'
    }
    if (saved === 'linear') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_APP_THEME, DEFAULT_THEME)
      }
      return DEFAULT_THEME
    }
    return DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme)

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-app-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY_APP_THEME, theme)
    } catch {
      /* ignore */
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === 'studio' ? '#0a0a0a' : theme === 'club' ? '#f7f6f2' : '#8b5cf6')
    }
  }, [theme])

  const setTheme = useCallback((next) => {
    if (VALID_THEMES.includes(next)) {
      setThemeState(next)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'classic' ? 'studio' : prev === 'studio' ? 'club' : 'classic'))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      // Club reuses the responsive page components created for Studio, with its own shell and tokens.
      isStudio: theme === 'studio' || theme === 'club',
      isClub: theme === 'club',
      isModern: theme === 'studio' || theme === 'club',
      isClassic: theme === 'classic',
    }),
    [theme, setTheme, toggleTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
