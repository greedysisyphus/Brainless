import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './components/layout/Layout'
import LoadingPage from './pages/LoadingPage'
import ErrorPage from './pages/ErrorPage'
import DataConverter from './pages/DataConverter'
import Schedule from './pages/Schedule'

// 懶加載頁面
const SandwichCalculator = lazy(() => import('./pages/SandwichCalculator'))
const CashierManagement = lazy(() => import('./pages/CashierManagement'))

function App() {
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
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  )
}

export default App 