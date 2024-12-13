import { NavLink } from 'react-router-dom'
import { 
  CalculatorIcon, 
  BanknotesIcon, 
  CalendarIcon,
  ChartBarIcon 
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
  { 
    path: '/flight-forecast', 
    label: '航班預報', 
    icon: <ChartBarIcon className="w-5 h-5" />
  }
]

function Navigation() {
  return (
    <nav className="bg-surface sticky top-0 z-50 shadow-lg">
      <div className="container-custom py-4">
        <div className="grid grid-cols-4 gap-4">
          {MENU_ITEMS.map(item => (
            <NavLink 
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex flex-col items-center justify-center
                p-4 rounded-xl font-medium
                transition-all duration-300
                hover:bg-white/10
                ${isActive 
                  ? 'bg-primary/10 text-primary ring-1 ring-primary'
                  : 'text-text-secondary hover:text-white'
                }
              `}
            >
              {item.icon}
              <span className="hidden sm:block mt-2">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default Navigation 