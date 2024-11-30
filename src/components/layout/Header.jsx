import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="bg-surface text-white">
      <div className="container-custom py-4">
        <div className="flex items-center justify-center gap-4">
          <img 
            src="https://i.meee.com.tw/VBmG1of.jpeg" 
            alt="Logo" 
            className="w-20 h-20 rounded-full border-2 border-primary p-1"
          />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Brainless
          </h1>
        </div>
      </div>
    </header>
  )
}

export default Header 