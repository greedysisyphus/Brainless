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
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
) 