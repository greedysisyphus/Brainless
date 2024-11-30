import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/layout/Layout'

// 懶加載頁面組件
const SandwichCalculator = lazy(() => import('./pages/SandwichCalculator'))
const CashierManagement = lazy(() => import('./pages/CashierManagement'))

function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Navigate to="/sandwich" replace />} />
            <Route path="/sandwich" element={<SandwichCalculator />} />
            <Route path="/cashier" element={<CashierManagement />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  )
}

export default App 