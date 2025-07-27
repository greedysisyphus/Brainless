import { NavLink } from 'react-router-dom'
import { 
  CalculatorIcon, 
  BanknotesIcon, 
  CloudIcon,
  BeakerIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'
import React from 'react'

function WaterDropIcon(props) {
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
        d="M12 21.5c4.5 0 7.5-3 7.5-7.5C19.5 8.5 12 2.5 12 2.5S4.5 8.5 4.5 14c0 4.5 3 7.5 7.5 7.5z" 
      />
    </svg>
  );
}

// 添加自定義雞尾酒圖示
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
    icon: <CalculatorIcon className="w-5 h-5" />
  },
  { 
    path: '/cashier', 
    label: '收銀管理', 
    icon: <BanknotesIcon className="w-5 h-5" />
  },
  {
    path: '/coffee-beans',
    label: '咖啡豆管理',
    icon: <ClipboardDocumentListIcon className="w-5 h-5" />
  },
  { 
    path: '/poursteady', 
    label: '手沖機調整', 
    icon: <WaterDropIcon className="w-5 h-5" />
  },
  {
    path: '/alcohol',
    label: '酒精計算',
    icon: <CocktailIcon className="w-5 h-5" />
  }
]

function Navigation() {
  return (
    <nav className="bg-surface sticky top-0 z-50 shadow-lg">
      <div className="container-custom py-2 sm:py-4">
        <div className="flex justify-center gap-2 sm:gap-4">
          {MENU_ITEMS.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `
                flex flex-col items-center
                w-[5.5rem] sm:w-28  /* 手機 88px，平板/桌面 112px */
                min-h-[4.5rem] sm:min-h-20  /* 手機 72px，平板/桌面 80px */
                p-2 sm:p-3
                rounded-lg
                transition-colors duration-200
                ${isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }
              `}
            >
              <div className="mb-1.5 sm:mb-2">
                {/* 放大圖示 */}
                {React.cloneElement(icon, { 
                  className: "w-6 h-6 sm:w-7 sm:h-7" 
                })}
              </div>
              <div className="text-xs sm:text-sm text-center leading-tight">
                {label}
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default Navigation 