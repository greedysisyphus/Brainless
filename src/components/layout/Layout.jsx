import Header from './Header'
import Navigation from './Navigation'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      {/* 頁首 - 最高層次 */}
      <Header />
      
      {/* 導航 - 第二層次 */}
      <Navigation />
      
      {/* 主要內容 - 第三層次 */}
      <main className="py-6">
        <div className="container-custom">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout 