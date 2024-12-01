import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';

function Layout() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 導航欄 */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold">咖啡廳管理系統</span>
              </div>
              
              {/* 導航連結 */}
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                <Link
                  to="/cash"
                  className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-gray-500"
                >
                  收銀管理
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要內容區域 */}
      <main className="py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout; 