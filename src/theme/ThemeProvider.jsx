import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true)

  const toggleTheme = () => setIsDark(!isDark)

  const theme = {
    isDark,
    colors: isDark ? {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      background: '#13131a',
      surface: '#1e1e2e',
    } : {
      primary: '#4f46e5',
      secondary: '#7c3aed',
      background: '#f8fafc',
      surface: '#ffffff',
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
} 