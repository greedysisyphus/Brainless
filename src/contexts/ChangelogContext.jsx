import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import ChangelogModal from '../components/ChangelogModal'

// 更新內容（新版請加在陣列最上方；修改內容請編輯此處）
export const APP_CHANGELOG = [
  {
    version: '1.4.5',
    date: '2026-04-30',
    title: '報表生成器雙模式',
    items: [
      '報表生成器：新增「自訂 Template」模式（本機即時生成下載，不更新 Repo）',
      '自訂 Template：支援預設樣板/上傳 .numbers、單月/全年打包與輸出檔名預覽'
    ]
  },
  {
    version: '1.4.2',
    date: '2026-04-26',
    title: '晚班支援規則與航班介面優化',
    items: [
      '新增晚班支援與收班時間邏輯',
      '晚班留店時間加入最低門檻',
      '航班列表新增「晚班支援/留店」欄位',
      '離峰時段清單新增支援期間標註'
    ]
  },
  {
    version: '1.4.1',
    date: '2026-04-19',
    title: '高峰／離峰（奶酥）時段',
    items: [
      '航班資料與統計分析：新增「高峰／離峰（奶酥）時段」（起飛前壓力窗、登機門權重；當天版與多日平均）',
      '用語「低峰」統一改為「離峰」（介面、說明彈窗與本版更新條目）',
      '統計分析「快速載入」：新增最近 120 天、最近 150 天；自訂區間上限同步為 150 天',
      '登機門壓力權重：標題「說明」右側齒輪開啟調整，Firestore（settings/flight_gate_stress_weights）即時同步多機，並保留本機快取'
    ]
  },
  {
    version: '1.4.0',
    date: '2026-02-05',
    title: '點豆更新',
    items: [
      '移除 Linear 風格',
      '版號改為與 package.json／GitHub 同步',
      'Header 新增「本次更新內容」按鈕，可隨時查看更新紀錄',
      '點豆（咖啡豆管理）：智慧換算豆子數量，每列可切換數量／銀袋／盒子，總包數無條件捨去'
    ]
  },
  {
    version: '1.3.0',
    date: '2026-02～03',
    title: '優化更新',
    items: [
      'fix(flight): handleChartClick TDZ 修復與 iOS 日期解析修正',
      '統計分析：歷史趨勢對比優化、卡片樣式、Bar Race／面積圖／多天趨勢',
      'Heatmap 行動版優化、Charts Testing、熱力圖與多日每小時趨勢',
      '航班資料：明天按鈕、尚未更新空狀態、寫檔檢查與排程',
      'iPad nav 置中、咖啡豆標題置中與浮動指示器、航班 fetch 加 cache: no-cache',
      '航班統計：平日／週末／假期平均航班量（日型可重疊）、台灣 2026 假日',
      '統計分析：90 天選項、匯出按鈕位置、PNG 匯出修復、部署觸發機制修復',
      'Navigation／跑馬燈層級修正、iOS Safari 強制刷新、workflow_run 觸發部署'
    ]
  },
  {
    version: '1.2.0',
    date: '2026-02 上旬',
    title: '航班與統計強化',
    items: [
      '統計分析優化：熱力圖、動畫、資料驗證、資料差異提示、PWA 支援',
      '統計分析改為從 GitHub data/ 讀取歷史資料，移除 Firebase 依賴',
      '部署與緩存修復：skip 檢查邏輯、手動觸發、資料文件複製與驗證',
      '簡潔模式點擊表格行可彈出 Modal 顯示航班詳細資訊',
      '修復匯出 PNG（奇偶行判斷）、新增隱藏已過期航班開關',
      '日期選擇器與時區修復：本地日期計算、載入當日資料邏輯',
      'Firebase 存儲航班資料供統計、iOS/iPad 圖表與觸控優化',
      '航班資料頁面：統計分析 Tab、匯出圖片文字置中、圖表順序調整',
      'GitHub Actions 部署流程、構建產物與 index.html 修復'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-01～02 初',
    title: '航班資料與跑馬燈',
    items: [
      '新增班次時間軸功能；跑馬燈天氣系統與個人表格生成器',
      '修復 iOS Safari 跑馬燈問題並優化天氣頁面',
      '航班資料 scraper 與 GitHub Actions 自動更新流程',
      'Playground 新增航班資料組件、航班資料複製至 build 輸出',
      '手動觸發部署、部署不隨純資料更新觸發、構建配置修復',
      '咖啡豆管理：匯出 logo、彈窗滾動、浮動指示器拖動',
      '自訂 Logo 上傳、匯出圖片分店名稱、重量換算計算器總計與重置',
      'YouTube 影片彈窗、D13 店 MUJI 盒子、報表模板與 ZIP 生成'
    ]
  }
]

// 版號單一來源：之後發版只需改 APP_CHANGELOG 最上方一筆
const FALLBACK_VERSION = APP_CHANGELOG[0]?.version ?? '1.4.5'
const CHANGELOG_STORAGE_KEY = 'appChangelogLastSeenVersion'

const ChangelogContext = createContext(null)

export function ChangelogProvider({ children }) {
  const [showChangelog, setShowChangelog] = useState(false)

  const closeChangelog = useCallback(() => {
    try {
      const currentVersion = (typeof window !== 'undefined' && window.__APP_VERSION__) ? window.__APP_VERSION__ : FALLBACK_VERSION
      if (currentVersion !== '{{APP_VERSION}}') {
        localStorage.setItem(CHANGELOG_STORAGE_KEY, currentVersion)
      }
    } catch (e) {
      // ignore
    }
    setShowChangelog(false)
  }, [])

  const openChangelog = useCallback(() => setShowChangelog(true), [])

  // 進入時若版本與上次關閉時不同，自動顯示更新跳窗
  useEffect(() => {
    try {
      const currentVersion = (typeof window !== 'undefined' && window.__APP_VERSION__) ? window.__APP_VERSION__ : FALLBACK_VERSION
      const lastSeen = localStorage.getItem(CHANGELOG_STORAGE_KEY)
      if (currentVersion !== '{{APP_VERSION}}' && lastSeen !== currentVersion) {
        setShowChangelog(true)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  const contextValue = useMemo(() => ({ openChangelog }), [])

  return (
    <ChangelogContext.Provider value={contextValue}>
      {children}
      <ChangelogModal
        visible={showChangelog}
        onClose={closeChangelog}
        entries={APP_CHANGELOG}
      />
    </ChangelogContext.Provider>
  )
}

export function useChangelog() {
  const ctx = useContext(ChangelogContext)
  if (!ctx) return { openChangelog: () => {} }
  return ctx
}
