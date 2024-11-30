import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import SandwichCalculator from './pages/SandwichCalculator'
import CashierManagement from './pages/CashierManagement'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/sandwich" replace />} />
          <Route path="/sandwich" element={<SandwichCalculator />} />
          <Route path="/cashier" element={<CashierManagement />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App 