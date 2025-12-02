import Header from './Header'
import Navigation from './Navigation'
import AnimatedBackground from '../AnimatedBackground'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 動態背景 */}
      <AnimatedBackground />
      
      {/* 漸變遮罩層 */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-indigo-900/20 pointer-events-none z-0" />
      
      {/* 內容層 */}
      <div className="relative z-10">
      {/* 頁首 - 最高層次 */}
      <Header />
      
      {/* 導航 - 第二層次 */}
      <Navigation />
      
      {/* 主要內容 - 第三層次 */}
      <main className="py-4 sm:py-5 md:py-6">
        <div className="container-custom">
          {children}
        </div>
      </main>
      </div>
    </div>
  )
}

export default Layout 