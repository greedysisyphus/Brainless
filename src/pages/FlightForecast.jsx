import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'

function FlightForecast() {
  return (
    <div className="container-custom py-8">
      <div className="card">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-primary/10 mb-6">
            <WrenchScrewdriverIcon className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary 
                         bg-clip-text text-transparent">
            系統維護中
          </h2>
        </div>
      </div>
    </div>
  )
}

export default FlightForecast 