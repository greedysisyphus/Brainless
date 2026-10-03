import { ADMIN_NAV_META, BASE_NAV_ITEMS } from '../config/navigation.jsx'

// 網站外觀：'new'（新版，/home 底下）或 'club'（原本的 Club 版）。預設新版；選擇記在這台裝置上。
// 新版穩定後要全部切過去時，拿掉 Club 的入口和這個檔案即可。
const KEY = 'brainless_site_theme'

export function getSiteTheme() {
  try {
    return localStorage.getItem(KEY) === 'club' ? 'club' : 'new'
  } catch {
    return 'new'
  }
}

export function setSiteTheme(theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // 存不了（無痕模式等）就只切這一次
  }
}

/** Club 版路徑在新版的對應位置；沒有對應的（/data-tester 等）回 null */
export function newPathFor(pathname) {
  if (pathname === '/') return '/home'
  return [...BASE_NAV_ITEMS, ADMIN_NAV_META].some((it) => it.path === pathname) ? `/home${pathname}` : null
}

/** 新版路徑在 Club 版的對應位置 */
export function clubPathFor(pathname) {
  const rest = pathname.replace(/^\/home/, '')
  return rest && rest !== '/' ? rest : '/sandwich'
}
