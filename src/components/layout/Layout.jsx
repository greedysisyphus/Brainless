import Header from './Header'
import Navigation from './Navigation'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <main className="py-8">
        {children}
      </main>
    </div>
  )
}

export default Layout 