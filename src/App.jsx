import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'
import Layout from './components/layout/Layout'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { FirebaseStatusBanner } from './components/studio/FirebaseStatusBanner'
import LoadingPage from './pages/LoadingPage'
import ErrorPage from './pages/ErrorPage'
import ErrorBoundary from './components/ErrorBoundary'
import { checkFirebaseConnection } from './utils/firebase'
import SandwichCalculator from './pages/SandwichCalculator'
import CoffeeBeanManager from './pages/CoffeeBeanManager'
import Playground from './pages/Playground'
import { ChangelogProvider } from './contexts/ChangelogContext'

// 懶加載頁面
const CashierManagement = lazy(() => import('./pages/CashierManagement'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const FlightData = lazy(() => import('./pages/FlightData'))
const PoursteadyAdjustment = lazy(() => import('./pages/PoursteadyAdjustment'))
const DailyReportGenerator = lazy(() => import('./pages/DailyReportGenerator'))
const PublicMenuPage = lazy(() => import('./pages/PublicMenuPage'))
const DataFormatTester = lazy(() => import('./pages/DataFormatTester'))

function AppContent() {
  const { isStudio } = useTheme()
  const [firebaseStatus, setFirebaseStatus] = useState({
    checked: false,
    connected: false,
    error: null
  })
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
    <Layout>
          {firebaseStatus.checked && !firebaseStatus.connected && (
            <FirebaseStatusBanner isStudio={isStudio} errorMessage={firebaseStatus.error || null} />
          )}
          <Suspense fallback={<LoadingPage />}>
            <Routes>
          <Route path="/" element={<Navigate to="/sandwich" replace />} />
              <Route path="/sandwich" element={<SandwichCalculator />} />
              <Route path="/cashier" element={<CashierManagement />} />
              <Route path="/alcohol" element={<Navigate to="/playground#alcohol" replace />} />
              <Route path="/coffee-beans" element={<CoffeeBeanManager />} />
              <Route path="/daily-reports" element={<DailyReportGenerator />} />
              <Route path="/menu" element={<PublicMenuPage />} />
              <Route path="/schedule" element={<Navigate to="/playground#schedule-manager" replace />} />
              <Route path="/data-tester" element={<DataFormatTester />} />
              <Route path="/poursteady" element={<PoursteadyAdjustment />} />
              <Route path="/flight-data" element={<FlightData />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/music" element={<Navigate to="/playground#music" replace />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="*" element={<ErrorPage />} />
            </Routes>
          </Suspense>
    </Layout>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ChangelogProvider>
            <AppContent />
          </ChangelogProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App 