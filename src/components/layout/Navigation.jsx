import { NavLink } from 'react-router-dom'

function Navigation() {
  return (
    <nav className="bg-surface sticky top-0 z-50 shadow-lg">
      <div className="container-custom py-4">
        <div className="flex justify-center gap-4">
          <NavLink 
            to="/sandwich"
            className={({ isActive }) => 
              `px-6 py-3 rounded-lg font-semibold transition-all duration-300
              ${isActive 
                ? 'bg-primary text-white' 
                : 'bg-white/10 text-white hover:bg-white/20'
              }`
            }
          >
            三明治計算器
          </NavLink>
          <NavLink 
            to="/cashier"
            className={({ isActive }) => 
              `px-6 py-3 rounded-lg font-semibold transition-all duration-300
              ${isActive 
                ? 'bg-primary text-white' 
                : 'bg-white/10 text-white hover:bg-white/20'
              }`
            }
          >
            收銀管理
          </NavLink>
        </div>
      </div>
    </nav>
  )
}

export default Navigation 