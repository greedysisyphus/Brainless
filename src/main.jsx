import React from 'react'
import ReactDOM from 'react-dom/client'

// 開發版 React 會提示安裝 DevTools（可能走 info 或 log），易造成控制台干擾
if (import.meta.env.DEV) {
  const noisy = /Download the React DevTools/i
  const origInfo = console.info.bind(console)
  const origLog = console.log.bind(console)
  console.info = (...args) => {
    if (typeof args[0] === 'string' && noisy.test(args[0])) return
    origInfo(...args)
  }
  console.log = (...args) => {
    if (typeof args[0] === 'string' && noisy.test(args[0])) return
    origLog(...args)
  }
}
import App from './App'

// iOS「加入主畫面」只記得網址的 ? 部分，會丟掉 # 後面的路徑，所以從哪一頁加都會開到首頁。
// 做法：瀏覽時把目前的工具同步寫進 ?p=（見 AppLayoutSwitcher），這裡在啟動時把它還原成路徑。
// 要在 React 掛上去之前做，路由一開始讀到的就是對的頁面。
{
  const start = new URLSearchParams(window.location.search).get('p')
  const atRoot = !window.location.hash || window.location.hash === '#/' || window.location.hash === '#/home'
  if (start && atRoot && /^[a-z0-9-]+$/.test(start)) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/home/${start}`)
  }
}
import './styles/index.css'
import './styles/club.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
