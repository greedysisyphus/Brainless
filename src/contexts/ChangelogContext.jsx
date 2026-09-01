import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import ChangelogModal from '../components/ChangelogModal'

// 更新內容（新版請加在陣列最上方；修改內容請編輯此處）
export const APP_CHANGELOG = [
  {
    version: '1.8.0',
    date: '2026-08-30',
    title: '班表',
    items: [
      '新增「班表」分頁：匯入班表轉換器的 JSON，一次看桃機一店、D7、D13 三家店的完整班表。',
      '今天誰上班、今天誰坐交通車（早班車與中班車分開算），可設定每人的上車地點並匯出名單給司機。',
      '上班統計：班別分布、各店出勤、每個人的班與搭班頻率。',
      '可篩選單一同事看整月行事曆，並匯出到手機。',
      '支援班已經對上的部分預設收起來，只留下還要處理的；同事設定也改成預設收合。',
      '交通車改標實際發車時間（早班車 03:45、中班車 04:45），每一站也各自標自己的上車時間。',
      '司機版文字加上日期範圍、星期與當日總人數；沒人搭的那天明寫「停開」。',
      '手機版修正：分頁列改成換行（原本最後兩個分頁被擠出畫面，看起來像不存在），卡片右上的篩選與切換也不會再超出螢幕。',
      '搭班時數 0 小時改顯示「交班」——那是一個下班另一個才上班，不是沒算到。',
      '班表資料改成只有管理員能寫入（同事仍可正常瀏覽與設定上車地點）；其他功能的權限完全不變。',
      '新增交通車名單 API，可用 iOS 捷徑查今天／明天／一週的上車名單（需金鑰）；含姓名的版本每一站也標自己的上車時間。',
    ],
  },
  {
    version: '1.7.4',
    date: '2026-08-11',
    title: '手機數量輸入修正',
    items: [
      '叫貨量清空後會保持空白，可直接重新輸入，不再立刻跳回預設 1。',
      '盤點量、叫貨量、最低庫存與預設叫貨欄位點入時會全選原數字，方便手機直接覆蓋。',
    ],
  },
  {
    version: '1.7.3',
    date: '2026-08-11',
    title: '同步衝突重複彈出修正',
    items: [
      '同一店別的盤點與品項設定改為依序送出，避免兩個同步請求互相製造衝突。',
      '選擇使用雲端後會停止舊的待處理請求，不再重複跳出相同衝突。',
      '同步比較不再因資料欄位順序不同而誤判為內容衝突。',
    ],
  },
  {
    version: '1.7.2',
    date: '2026-08-11',
    title: '多人同步可靠性修正',
    items: [
      '待同步盤點與品項草稿會立即保留在本機，重新整理或離線後可繼續同步。',
      '同一品項同時修改與清除全部改用交易檢查，避免靜默覆蓋其他人的資料。',
      '品項衝突確認會重新合併最新雲端版本，並修正第一個舊版本無法還原的問題。',
    ],
  },
  {
    version: '1.7.1',
    date: '2026-08-11',
    title: '多人盤點與品項版本保護',
    items: [
      '盤點改為逐品項同步，兩位使用者分工不同品項時不再互相覆蓋整份資料。',
      '品項設定支援多人自動合併；相同欄位同時修改時會提示確認。',
      '品項設定新增最後更新時間、裝置名稱、版本紀錄與安全還原。',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-08-10',
    title: '點貨與回饋功能',
    items: [
      '新增「點貨功能」：依分店輸入現有庫存，自動判斷需要叫貨的品項與數量。',
      '點貨資料支援跨裝置同步、品項設定、未完成提醒，以及叫貨內容預覽與複製。（正常來說）',
      '新增「回饋」：方便提出問題、功能需求或討論，可留言等功能。',
    ],
  },
  {
    version: '1.6.15',
    date: '2026-08-01',
    title: '移除 Studio 主題與航班 Club 樣式',
    items: [
      '移除 Studio 主題；保留 Classic 與 Club，舊 Studio 設定自動遷移至 Club。',
      'Club 航班列表：晚班支援／留店提示改用暖色系，提升可讀性。',
      'Club 航班詳細資料彈窗：卡片與文字對齊 Club 配色（珊瑚橘、暖棕、杏色底）。',
    ],
  },
  {
    version: '1.6.14',
    date: '2026-07-26',
    title: '重量換算切換重算',
    items: [
      '修正先輸入總重再切換銀袋／盒子時，估算包數不會更新的問題。',
    ],
  },
  {
    version: '1.6.13',
    date: '2026-07-26',
    title: 'Club 重量換算關閉修正',
    items: [
      '修正手機版重量換算右上角關閉鈕被頂欄擋住、按不到的問題。',
    ],
  },
  {
    version: '1.6.12',
    date: '2026-07-26',
    title: 'Club 容器類型外層切換',
    items: [
      'Club 重量換算：銀袋／盒子改在外層計算區直接點選切換；設定只負責各店袋重／盒重／每包克數。',
    ],
  },
  {
    version: '1.6.11',
    date: '2026-07-26',
    title: 'Club 重量換算捷徑',
    items: [
      'Club：盤點表右下角補回重量換算圖示捷徑（手機／iPad／電腦尺寸不同；開啟彈窗時隱藏）。',
      'Club：重量換算改為計算優先，設定收進摘要列；容器類型用點選芯片。',
      '打開重量換算時會對齊目前盤點分店。',
    ],
  },
  {
    version: '1.6.10',
    date: '2026-07-26',
    title: '點豆分店獨立重置',
    items: [
      '「重置此店」改為只清空目前選中的分店盤點與重量設定，不會動到其他分店。',
    ],
  },
  {
    version: '1.6.9',
    date: '2026-07-26',
    title: '點豆重置修正',
    items: [
      '修正「重置數據」只清本機、雲端舊盤點會自動回灌的問題。',
    ],
  },
  {
    version: '1.6.8',
    date: '2026-07-19',
    title: '點豆報表修正',
    items: [
      '點豆匯出圖片優化：iPad 產生後會開啟預覽頁，修正部分裝置無法下載圖片的問題。',
      '盤點表匯出改為新的排版',
    ],
  },
  {
    version: '1.6.5',
    date: '2026-07-13',
    title: '厚片計算器',
    items: [
      '厚片計算器已穢土轉生',
      '一條吐司預設 10 片（可在設定調整），各店雲端同步',
      '製作量可選多做／少做（例如需求 44 片 → 50 或 40）',
      '多出片數分配：平均 → 優先招牌 → 深焙 → 淺焙',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-07-11',
    title: '咖啡豆盤點同步優化',
    items: [
      '咖啡豆管理：解決爛網絡／填寫中回逆問題',
      'Firebase較新時可選擇保留本機、使用雲端或合併',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-06-08',
    title: 'Studio 主題測試 與電子菜單',
    items: [
      '新增 Studio Beta 雙主題：Classic 與 Studio 可一鍵切換',
      '管理員設定改為分頁：跑馬燈｜電子菜單（Classic／Studio 共用）',
      '電子菜單 Phase 1：後台可上傳 1～2 張菜單圖（第 2 張選填），自動更新到供客人使用的 https://simplekaffa-menu.vercel.app/',
    ],
  },
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
const FALLBACK_VERSION = APP_CHANGELOG[0]?.version ?? '1.6.5'
const CHANGELOG_STORAGE_KEY = 'appChangelogLastSeenVersion'
const BANNER_DISMISS_KEY = 'appChangelogBannerDismissedVersion'

const ChangelogContext = createContext(null)

function readAppVersion() {
  const injected = typeof window !== 'undefined' ? window.__APP_VERSION__ : ''
  if (injected && injected !== '{{APP_VERSION}}') return injected
  return FALLBACK_VERSION
}

function readHasUnseenUpdate() {
  try {
    return localStorage.getItem(CHANGELOG_STORAGE_KEY) !== readAppVersion()
  } catch {
    return false
  }
}

function readBannerDismissed() {
  try {
    return localStorage.getItem(BANNER_DISMISS_KEY) === readAppVersion()
  } catch {
    return false
  }
}

const EMPTY_CHANGELOG = {
  openChangelog: () => {},
  hasUnseenUpdate: false,
  showUpdateBanner: false,
  latestVersion: FALLBACK_VERSION,
  latestTitle: APP_CHANGELOG[0]?.title ?? '',
  dismissBanner: () => {},
}

export function ChangelogProvider({ children }) {
  const [showChangelog, setShowChangelog] = useState(false)
  const [hasUnseenUpdate, setHasUnseenUpdate] = useState(readHasUnseenUpdate)
  const [bannerDismissed, setBannerDismissed] = useState(readBannerDismissed)

  const latest = APP_CHANGELOG[0]
  const latestVersion = latest?.version ?? FALLBACK_VERSION
  const latestTitle = latest?.title ?? ''

  const markChangelogSeen = useCallback(() => {
    try {
      const version = readAppVersion()
      localStorage.setItem(CHANGELOG_STORAGE_KEY, version)
      localStorage.setItem(BANNER_DISMISS_KEY, version)
    } catch {
      // ignore
    }
    setHasUnseenUpdate(false)
    setBannerDismissed(true)
  }, [])

  const closeChangelog = useCallback(() => {
    markChangelogSeen()
    setShowChangelog(false)
  }, [markChangelogSeen])

  const openChangelog = useCallback(() => setShowChangelog(true), [])

  const dismissBanner = useCallback(() => {
    try {
      localStorage.setItem(BANNER_DISMISS_KEY, readAppVersion())
    } catch {
      // ignore
    }
    setBannerDismissed(true)
  }, [])

  const contextValue = useMemo(
    () => ({
      openChangelog,
      hasUnseenUpdate,
      showUpdateBanner: hasUnseenUpdate && !bannerDismissed,
      latestVersion,
      latestTitle,
      dismissBanner,
    }),
    [openChangelog, hasUnseenUpdate, bannerDismissed, latestVersion, latestTitle, dismissBanner]
  )

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
  if (!ctx) return EMPTY_CHANGELOG
  return ctx
}
