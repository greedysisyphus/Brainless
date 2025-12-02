import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 第一次訪問時優先使用經典風格
    // 從 localStorage 讀取主題偏好（如果存在）
    const savedTheme = localStorage.getItem('app-theme')
    
    // 如果沒有保存的主題，默認使用 'classic'
    if (!savedTheme) {
      return 'classic'
    }
    
    // 如果保存的主題有效，使用保存的主題
    if (savedTheme === 'classic' || savedTheme === 'linear') {
      return savedTheme
    }
    
    // 如果保存的主題無效，也使用 'classic'
    return 'classic'
  })

  useEffect(() => {
    // 保存主題偏好到 localStorage（用戶選擇後會自動保存）
    localStorage.setItem('app-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'classic' ? 'linear' : 'classic')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
