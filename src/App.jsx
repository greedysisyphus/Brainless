import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import Layout from './components/layout/Layout'
import LoadingPage from './pages/LoadingPage'
import ErrorPage from './pages/ErrorPage'
import DataConverter from './pages/DataConverter'
import Schedule from './pages/Schedule'
import FlightForecast from './pages/FlightForecast'
import { checkFirebaseConnection } from './utils/firebase'

// 懶加載頁面
const SandwichCalculator = lazy(() => import('./pages/SandwichCalculator'))
const CashierManagement = lazy(() => import('./pages/CashierManagement'))
const SandwichHistory = lazy(() => import('./pages/SandwichHistory'))

function App() {
  useEffect(() => {
    checkFirebaseConnection();
  }, []);

  return (
    <Router>
      <Layout>
        <Suspense fallback={<LoadingPage />}>
          <Routes>
            <Route path="/" element={<Navigate to="/sandwich" replace />} />
            <Route path="/sandwich" element={<SandwichCalculator />} />
            <Route path="/cashier" element={<CashierManagement />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/data-converter" element={<DataConverter />} />
            <Route path="/flight-forecast" element={<FlightForecast />} />
            <Route path="/sandwich-history" element={<SandwichHistory />} />
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  )
}

export default App 