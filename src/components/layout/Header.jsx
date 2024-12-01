import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="bg-surface text-white">
      <div className="container-custom py-2 md:py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <img 
            src="https://i.meee.com.tw/VBmG1of.jpeg" 
            alt="Logo" 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-primary p-1 logo logo-glow logo-float"
          />
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Brainless
          </h1>
        </div>
      </div>
    </header>
  )
}

export default Header 