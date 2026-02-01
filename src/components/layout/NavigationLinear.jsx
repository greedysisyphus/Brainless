import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  CalculatorIcon, 
  BanknotesIcon, 
  BeakerIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CalendarIcon,
  Cog6ToothIcon,
  MusicalNoteIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import React from 'react'
import { auth, checkAdminStatus } from '../../utils/firebase'

// 自定義雞尾酒圖示
function CocktailIcon(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      {...props}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
        d="M12 20v-7m0 0l6-6.5H6L12 13zm-4-9h8m-8 0l-2-2m10 2l2-2" 
      />
    </svg>
  );
}

const MENU_ITEMS = [
  { 
    path: '/sandwich', 
    label: '三明治計算器', 
    icon: CalculatorIcon
  },
  { 
    path: '/cashier', 
    label: '收銀管理', 
    icon: BanknotesIcon
  },
  {
    path: '/coffee-beans',
    label: '咖啡豆管理',
    icon: ClipboardDocumentListIcon
  },
  {
    path: '/schedule',
    label: '班表管理',
    icon: CalendarIcon
  },
  {
    path: '/daily-reports',
    label: '報表生成器',
    icon: DocumentTextIcon
  },
  {
    path: '/poursteady', 
    label: '手沖機調整', 
    icon: BeakerIcon
  },
  {
    path: '/alcohol',
    label: '酒精計算',
    icon: CocktailIcon
  },
  {
    path: '/flight-data',
    label: '航班資料',
    icon: PaperAirplaneIcon
  },
  {
    path: '/playground',
    label: 'Playground',
    icon: MusicalNoteIcon
  }
];

/**
 * Linear 風格的 Navigation
 * 極簡水平導航，參考 Linear 官網
 */
function NavigationLinear() {
  const location = useLocation()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeIndicator, setActiveIndicator] = useState({ left: 0, width: 0 })
  const navItemsRef = useRef({})

  // 完整的選單項目
  const allMenuItems = [
    ...MENU_ITEMS,
    ...(isAdmin ? [{
      path: '/admin',
      label: '管理設定',
      icon: Cog6ToothIcon
    }] : [])
  ]

  // 檢查管理員狀態
  useEffect(() => {
    let isMounted = true

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!isMounted) return

      if (user) {
        try {
          const adminStatus = await checkAdminStatus(user.uid)
          if (isMounted) {
            setIsAdmin(adminStatus)
          }
        } catch (error) {
          console.error('檢查管理員狀態失敗:', error)
          if (isMounted) {
            setIsAdmin(false)
          }
        }
      } else {
        if (isMounted) {
          setIsAdmin(false)
        }
      }

      if (isMounted) {
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  // 更新活動指示器位置（基於當前路由）
  useEffect(() => {
    const updateIndicator = () => {
      const activePath = location.pathname
      const activeItem = navItemsRef.current[activePath]

      if (activeItem && activeItem.offsetParent !== null) {
        const container = activeItem.parentElement
        if (container) {
          const containerRect = container.getBoundingClientRect()
          const itemRect = activeItem.getBoundingClientRect()
          
          setActiveIndicator({
            left: itemRect.left - containerRect.left,
            width: itemRect.width
          })
        }
      }
    }

    // 延遲一下確保 DOM 已更新
    const timer = setTimeout(updateIndicator, 100)
    window.addEventListener('resize', updateIndicator)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [location.pathname, allMenuItems.length, isLoading])

  if (isLoading) {
    return (
      <nav className="border-b border-white/[0.06] bg-[#0a0a0a]/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1 h-12">
            {MENU_ITEMS.map(({ path }) => (
              <div key={path} className="h-6 w-20 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </nav>
    )
  }

  const isHomepage = location.pathname === '/'

  return (
    <nav className={`sticky top-16 z-40 border-b border-white/[0.06] bg-[#0a0a0a]/40 backdrop-blur-xl transition-all duration-300 ${isHomepage ? 'hidden' : ''}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative flex items-center gap-1 h-12">
          {/* 活動指示器 */}
          {activeIndicator.width > 0 && (
            <motion.div
              className="absolute bottom-0 h-[2px] bg-white rounded-full"
              initial={false}
              animate={{
                left: activeIndicator.left,
                width: activeIndicator.width,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
            />
          )}

          {/* 導航項目 */}
          {allMenuItems.map(({ path, label, icon: Icon }, index) => (
            <NavLink
              key={path}
              to={path}
              ref={(el) => {
                if (el) navItemsRef.current[path] = el
              }}
              className={({ isActive }) => `
                relative px-4 py-2
                text-sm font-medium
                transition-colors duration-200
                rounded-lg
                ${isActive 
                  ? 'text-white' 
                  : 'text-white/60 hover:text-white/90 hover:bg-white/[0.06]'
                }
              `}
              onMouseEnter={(e) => {
                const container = e.currentTarget.parentElement
                if (container) {
                  const containerRect = container.getBoundingClientRect()
                  const itemRect = e.currentTarget.getBoundingClientRect()
                  
                  setActiveIndicator({
                    left: itemRect.left - containerRect.left,
                    width: itemRect.width
                  })
                }
              }}
              onMouseLeave={() => {
                // 恢復到活動項目位置
                const activePath = location.pathname
                const activeItem = navItemsRef.current[activePath]
                
                if (activeItem && activeItem.offsetParent !== null) {
                  const container = activeItem.parentElement
                  if (container) {
                    const containerRect = container.getBoundingClientRect()
                    const itemRect = activeItem.getBoundingClientRect()
                    
                    setActiveIndicator({
                      left: itemRect.left - containerRect.left,
                      width: itemRect.width
                    })
                  }
                }
              }}
            >
              {({ isActive }) => (
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default NavigationLinear
