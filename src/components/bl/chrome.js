import { createContext } from 'react'

/** 舊版頁面被放進新版外殼（ToolPage）時為 true：頁面自己的標題列交給外殼，不重複畫 */
export const InBlShell = createContext(false)
