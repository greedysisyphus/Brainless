import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'
import Layout from './components/layout/Layout'
import LoadingPage from './pages/LoadingPage'
import ErrorPage from './pages/ErrorPage'
import { checkFirebaseConnection } from './utils/firebase'
import PoursteadyAdjustment from './pages/PoursteadyAdjustment'
import AlcoholCalculator from './pages/AlcoholCalculator'
import SandwichCalculator from './pages/SandwichCalculator'
import CoffeeBeanManager from './pages/CoffeeBeanManager'
import DailyReportGenerator from './pages/DailyReportGenerator'

// 懶加載頁面
const CashierManagement = lazy(() => import('./pages/CashierManagement'))

function App() {
  const [firebaseStatus, setFirebaseStatus] = useState({
    checked: false,
    connected: false,
    error: null
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkFirebaseConnection();
        setFirebaseStatus({
          checked: true,
          connected: isConnected,
          error: isConnected ? null : '無法連接到 Firebase'
        });
      } catch (error) {
        console.error('檢查 Firebase 連接時出錯:', error);
        setFirebaseStatus({
          checked: true,
          connected: false,
          error: error.message || '無法連接到 Firebase'
        });
      }
    };
    
    checkConnection();
  }, []);

  return (
    <Router>
      <Layout>
        {firebaseStatus.checked && !firebaseStatus.connected && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 m-4">
            <h3 className="text-amber-500 font-bold mb-2">Firebase 連接警告</h3>
            <p className="text-sm text-text-secondary">
              應用程序無法連接到 Firebase 服務。部分功能可能無法正常工作。
              {firebaseStatus.error && <span className="block mt-1">錯誤: {firebaseStatus.error}</span>}
            </p>
            <p className="text-xs text-text-secondary mt-2">
              您仍然可以使用應用程序，但數據將不會同步到雲端。
            </p>
          </div>
        )}
        <Suspense fallback={<LoadingPage />}>
          <Routes>
            <Route path="/" element={<Navigate to="/sandwich" replace />} />
            <Route path="/sandwich" element={<SandwichCalculator />} />
            <Route path="/cashier" element={<CashierManagement />} />
            <Route path="/poursteady" element={<PoursteadyAdjustment />} />
            <Route path="/alcohol" element={<AlcoholCalculator />} />
            <Route path="/coffee-beans" element={<CoffeeBeanManager />} />
            <Route path="/daily-reports" element={<DailyReportGenerator />} />
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  )
}

export default App 