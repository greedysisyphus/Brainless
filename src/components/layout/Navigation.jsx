import { NavLink } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { 
  CalculatorIcon, 
  BanknotesIcon, 
  CloudIcon,
  BeakerIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  FunnelIcon,
  CalendarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import React from 'react'
import { auth, checkAdminStatus } from '../../utils/firebase'
import anime from 'animejs/lib/anime.es.js'

function WaterDropIcon(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      {...props}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
        d="M12 21.5c4.5 0 7.5-3 7.5-7.5C19.5 8.5 12 2.5 12 2.5S4.5 8.5 4.5 14c0 4.5 3 7.5 7.5 7.5z" 
      />
    </svg>
  );
}

// 添加自定義雞尾酒圖示
function CocktailIcon(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      {...props}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
        d="M12 20v-7m0 0l6-6.5H6L12 13zm-4-9h8m-8 0l-2-2m10 2l2-2" 
      />
    </svg>
  );
}

const MENU_ITEMS = [
  { 
    path: '/sandwich', 
    label: '三明治計算器', 
    icon: <CalculatorIcon className="w-5 h-5" />
  },
  { 
    path: '/cashier', 
    label: '收銀管理', 
    icon: <BanknotesIcon className="w-5 h-5" />
  },
  {
    path: '/coffee-beans',
    label: '咖啡豆管理',
    icon: <ClipboardDocumentListIcon className="w-5 h-5" />
  },
  {
    path: '/schedule',
    label: '班表管理',
    icon: <CalendarIcon className="w-5 h-5" />
  },
  {
    path: '/daily-reports',
    label: '報表生成器',
    icon: <DocumentTextIcon className="w-5 h-5" />
  },
  {
    path: '/poursteady', 
    label: '手沖機調整', 
    icon: <BeakerIcon className="w-5 h-5" />
  },
  {
    path: '/alcohol',
    label: '酒精計算',
    icon: <CocktailIcon className="w-5 h-5" />
  }
];

function Navigation() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navItemsRef = useRef([]);

  // 完整的選單項目（包含管理員選項）- 必須在 hooks 之前定義
  const allMenuItems = [
    ...MENU_ITEMS,
    // 只有管理員才能看到管理選項
    ...(isAdmin ? [{
      path: '/admin',
      label: '管理設定',
      icon: <Cog6ToothIcon className="w-5 h-5" />
    }] : [])
  ];

  // 檢查管理員狀態
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!isMounted) return;

      if (user) {
        try {
          const adminStatus = await checkAdminStatus(user.uid);
          if (isMounted) {
            setIsAdmin(adminStatus);
            setError('');
          }
        } catch (error) {
          console.error('檢查管理員狀態失敗:', error);
          if (isMounted) {
            setIsAdmin(false);
            setError('權限檢查失敗');
          }
        }
      } else {
        if (isMounted) {
          setIsAdmin(false);
          setError('');
        }
      }
      
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 導航項目進入動畫 - 使用 Anime.js Timeline 和 Stagger（優化速度）
  useEffect(() => {
    if (isLoading || navItemsRef.current.length === 0) return

    // 使用 Timeline 創建有序動畫 - 更快的動畫速度
    const timeline = anime.timeline({
      autoplay: true,
      easing: 'easeOutExpo' // 改用更快的 easing
    })

    // 導航項目依次出現 - 縮短時間和延遲
    timeline.add({
      targets: navItemsRef.current,
      opacity: [0, 1],
      translateY: [-20, 0], // 減少移動距離
      scale: [0.9, 1], // 減少縮放變化
      delay: anime.stagger(30), // 減少延遲時間（從50ms改為30ms）
      duration: 400 // 縮短動畫時間（從600ms改為400ms）
    })
  }, [isLoading, allMenuItems.length])

  // 如果還在載入，顯示骨架屏
  if (isLoading) {
    return (
      <nav className="bg-surface sticky top-0 z-50 shadow-lg">
        <div className="container-custom py-2 sm:py-4">
          <div className="flex justify-center gap-2 sm:gap-4">
            {MENU_ITEMS.map(({ path, label, icon }) => (
              <div
                key={path}
                className="flex flex-col items-center w-[5.5rem] sm:w-28 min-h-[4.5rem] sm:min-h-20 p-2 sm:p-3 rounded-lg animate-pulse"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/10 rounded mb-1.5 sm:mb-2"></div>
                <div className="w-12 h-3 bg-white/10 rounded text-xs sm:text-sm"></div>
              </div>
            ))}
            {/* 管理員選項的骨架屏 */}
            <div className="flex flex-col items-center w-[5.5rem] sm:w-28 min-h-[4.5rem] sm:min-h-20 p-2 sm:p-3 rounded-lg animate-pulse">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/10 rounded mb-1.5 sm:mb-2"></div>
              <div className="w-12 h-3 bg-white/10 rounded text-xs sm:text-sm"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-surface/60 backdrop-blur-xl sticky top-0 z-50 shadow-xl border-b border-white/10">
      <div className="container-custom py-2 sm:py-4">
        {/* 錯誤提示 */}
        {error && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 animate-slide-in">
            <div className="flex items-center gap-2">
              <div className="text-amber-500">⚠️</div>
              <p className="text-amber-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-2 sm:gap-4 flex-wrap">
          {allMenuItems.map(({ path, label, icon }, index) => (
            <NavLink
              key={path}
              to={path}
              ref={(el) => {
                if (el) navItemsRef.current[index] = el
              }}
              onMouseEnter={(e) => {
                // 懸停時的微動畫
                anime({
                  targets: e.currentTarget,
                  scale: 1.05,
                  rotateZ: [0, -3, 3, 0],
                  duration: 300,
                  easing: 'easeOutElastic(1, .6)'
                })
              }}
              className={({ isActive }) => `
                group relative
                flex flex-col items-center
                w-[5.5rem] sm:w-28
                min-h-[4.5rem] sm:min-h-20
                p-2 sm:p-3
                rounded-xl
                transition-all duration-300
                opacity-0
                ${isActive 
                  ? 'text-primary bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-lg shadow-primary/20 scale-105' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                }
                hover:shadow-xl hover:shadow-primary/10
                border border-white/5 hover:border-primary/30
              `}
            >
              {({ isActive }) => (
                <>
                  {/* 發光效果 */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-primary/10 animate-pulse-glow opacity-50" />
                  )}
                  
                  <div className={`mb-1.5 sm:mb-2 relative z-10 transition-all duration-300 ${
                    isActive ? 'scale-110' : 'group-hover:scale-110'
                  }`}>
                    {React.cloneElement(icon, { 
                      className: "w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300" 
                    })}
                  </div>
                  <div className="text-xs sm:text-sm text-center leading-tight font-medium relative z-10">
                    {label}
                  </div>
                  
                  {/* 底部指示條 */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-primary to-purple-500 rounded-full animate-pulse-glow" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default Navigation 