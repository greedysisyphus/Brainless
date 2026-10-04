import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'
import Layout from './components/layout/Layout'
import { ThemeProvider } from './contexts/ThemeContext'
import { FirebaseStatusBanner } from './components/studio/FirebaseStatusBanner'
import LoadingPage from './pages/LoadingPage'
import ErrorPage from './pages/ErrorPage'
import ErrorBoundary from './components/ErrorBoundary'
import { checkFirebaseConnection } from './utils/firebase'
import SandwichCalculator from './pages/SandwichCalculator'
import CoffeeBeanManager from './pages/CoffeeBeanManager'
import GoodsOrderManager from './pages/GoodsOrderManager'
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
const FeedbackCenter = lazy(() => import('./pages/FeedbackCenter'))
const ShiftBoard = lazy(() => import('./pages/ShiftBoard'))
// 新版頁面放同一個 chunk：首頁載好後點工具不會再等載入，轉場才接得起來
const loadBl = () => import('./pages/bl')
const Home = lazy(() => loadBl().then((m) => ({ default: m.Home })))
const BlSandwich = lazy(() => loadBl().then((m) => ({ default: m.Sandwich })))
const BlCashier = lazy(() => loadBl().then((m) => ({ default: m.Cashier })))
const BlShifts = lazy(() => loadBl().then((m) => ({ default: m.Shifts })))
const BlBeans = lazy(() => loadBl().then((m) => ({ default: m.Beans })))
const BlOrder = lazy(() => loadBl().then((m) => ({ default: m.Order })))
const BlFlights = lazy(() => loadBl().then((m) => ({ default: m.Flights })))
const BlPour = lazy(() => loadBl().then((m) => ({ default: m.Pour })))
const BlReports = lazy(() => loadBl().then((m) => ({ default: m.Reports })))
const BlFeedback = lazy(() => loadBl().then((m) => ({ default: m.Feedback })))
const BlChangelog = lazy(() => loadBl().then((m) => ({ default: m.Changelog })))
const BlAdmin = lazy(() => loadBl().then((m) => ({ default: m.Admin })))
const BlMenu = lazy(() => loadBl().then((m) => ({ default: m.Menu })))
const BlPlayground = lazy(() => loadBl().then((m) => ({ default: m.Playground })))

function AppContent() {
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
            <FirebaseStatusBanner errorMessage={firebaseStatus.error || null} />
          )}
          <Suspense fallback={<LoadingPage />}>
            <Routes>
          <Route path="/" element={<Navigate to="/sandwich" replace />} />
              <Route path="/home" element={<Home />} />
              <Route path="/home/sandwich" element={<BlSandwich />} />
              <Route path="/home/cashier" element={<BlCashier />} />
              <Route path="/home/shifts" element={<BlShifts />} />
              <Route path="/home/coffee-beans" element={<BlBeans />} />
              <Route path="/home/goods-order-test" element={<BlOrder />} />
              <Route path="/home/flight-data" element={<BlFlights />} />
              <Route path="/home/poursteady" element={<BlPour />} />
              <Route path="/home/daily-reports" element={<BlReports />} />
              <Route path="/home/feedback" element={<BlFeedback />} />
              <Route path="/home/changelog" element={<BlChangelog />} />
              <Route path="/home/admin" element={<BlAdmin />} />
              <Route path="/home/menu" element={<BlMenu />} />
              <Route path="/home/playground" element={<BlPlayground />} />
              <Route path="/home/*" element={<Navigate to="/home" replace />} />
              <Route path="/sandwich" element={<SandwichCalculator />} />
              <Route path="/cashier" element={<CashierManagement />} />
              <Route path="/alcohol" element={<Navigate to="/playground#alcohol" replace />} />
              <Route path="/coffee-beans" element={<CoffeeBeanManager />} />
              <Route path="/goods-order-test" element={<GoodsOrderManager />} />
              <Route path="/daily-reports" element={<DailyReportGenerator />} />
              <Route path="/menu" element={<PublicMenuPage />} />
              <Route path="/shifts" element={<ShiftBoard />} />
              <Route path="/schedule" element={<Navigate to="/playground#schedule-manager" replace />} />
              <Route path="/data-tester" element={<DataFormatTester />} />
              <Route path="/poursteady" element={<PoursteadyAdjustment />} />
              <Route path="/flight-data" element={<FlightData />} />
              <Route path="/feedback" element={<FeedbackCenter />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/music" element={<Navigate to="/playground#music" replace />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
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
