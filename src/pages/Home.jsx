import { Link } from 'react-router-dom'
import { ChartBarIcon } from '@heroicons/react/24/outline'

function Home() {
  return (
    <Link 
      to="/flight-forecast" 
      className="card hover:scale-[1.02] transition-transform"
    >
      <div className="flex items-center gap-4">
        <ChartBarIcon className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-xl font-bold">航班預報</h2>
          <p className="text-sm text-text-secondary">
            分析機場人流預測
          </p>
        </div>
      </div>
    </Link>
  )
}

export default Home 