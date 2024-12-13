import { Link } from 'react-router-dom'
import Clock from '../Clock'
import logoCat from '../../assets/logo-cat.png'

function Header() {
  return (
    <header className="bg-surface text-white">
      <div className="container-custom py-4 md:py-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-4">
            <img 
              src={logoCat}
              alt="Cat Logo" 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-primary p-1 logo logo-glow logo-float"
            />
            <div className="flex flex-col items-start gap-1">
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Brainless
              </h1>
              <Clock />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header 