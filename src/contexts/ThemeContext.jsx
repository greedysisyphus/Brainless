import { createContext, useContext, useEffect, useMemo } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // 僅保留經典風格；Linear 風格已移除，舊的 localStorage 會自動視為 classic
  const theme = 'classic'

  useEffect(() => {
    const saved = localStorage.getItem('app-theme')
    if (saved === 'linear') localStorage.setItem('app-theme', 'classic')
  }, [])

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => {} // 已移除主題切換，保留 API 避免報錯
  }), [])

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
