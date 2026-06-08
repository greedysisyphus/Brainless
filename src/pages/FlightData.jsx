import { Suspense, lazy } from 'react'
import LoadingPage from './LoadingPage'
import { DualThemePage } from '../components/studio/DualThemePage'

const FlightDataContent = lazy(() => import('../components/playground/FlightDataContent'))

const FL_BC = [
  { label: 'Brainless', href: '#/sandwich' },
  { label: '人事與航班', href: '#/' },
  { label: '航班資料', href: '#/flight-data' },
]

function FlightData() {
  const flightBody = (
    <Suspense fallback={<LoadingPage />}>
      <FlightDataContent />
    </Suspense>
  )
  const classicChrome = (
    <div className="container-custom py-8">
      <div className="mx-auto max-w-6xl">{flightBody}</div>
    </div>
  )

  const studioChrome = <div className="mx-auto max-w-6xl">{flightBody}</div>

  return (
    <DualThemePage
      breadcrumbs={FL_BC}
      title="航班資料"
      description="班表門市區間航班與統計視覺化。"
      classic={classicChrome}
      studio={studioChrome}
    />
  )
}

export default FlightData
