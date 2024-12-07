import { NavLink } from 'react-router-dom'
import { 
  CalculatorIcon, 
  BanknotesIcon, 
  CalendarIcon,
  ClockIcon 
} from '@heroicons/react/24/outline'

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
    path: '/schedule', 
    label: '班表', 
    icon: <CalendarIcon className="w-5 h-5" />
  },
]

function Navigation() {
  return (
    <nav className="bg-surface sticky top-0 z-50 shadow-lg">
      <div className="container-custom py-4">
        <div className="flex justify-center gap-4">
          {MENU_ITEMS.map(item => (
            <NavLink 
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                px-6 py-3 rounded-lg font-semibold transition-all duration-300
                flex items-center gap-2
                focus:ring-2 focus:ring-primary focus:outline-none
                ${isActive 
                  ? 'bg-primary text-white' 
                  : 'bg-white/10 text-white hover:bg-white/20'
                }
              `}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default Navigation 