import { Suspense, lazy } from 'react'
import LoadingPage from './LoadingPage'

const FlightDataContent = lazy(() => import('../components/playground/FlightDataContent'))

function FlightData() {
  return (
    <div className="container-custom py-8">
      <div className="max-w-6xl mx-auto">
        <Suspense fallback={<LoadingPage />}>
          <FlightDataContent />
        </Suspense>
      </div>
    </div>
  )
}

export default FlightData
