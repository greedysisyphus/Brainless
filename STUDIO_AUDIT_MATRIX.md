# Studio / Classic 路由盤點矩陣

> 全站 Studio 升級計畫階段 0 產出。Classic 在目前產品中仍保留，`isStudio` 來自 ThemeContext（`localStorage` `app-theme`: `studio` | `classic`；舊值 `craftwork` 會自動遷移為 `studio`）。

## 路由對照（`src/App.jsx`）

| 路徑 | 頁面元件 | 包裝方式 | Studio 完成度（約） | 痛點 / 備註 |
|------|----------|----------|-------------------|-------------|
| `/` → `/sandwich` | `SandwichCalculator` | `DualThemePage`；Classic 仍是整頁動效；Studio 為 `SandwichStudioPanel` | 高 | 動畫與設定 modal 分支仍靠 `isStudio` |
| `/cashier` | `CashierManagement`（lazy） | `DualThemePage`；FAB／modal 分支仍靠 `isStudio` | 中高 | `components/cashier/*` 多子元件 |
| `/coffee-beans` | `CoffeeBeanManager` | `DualThemePage`；表格與對話框內頁分支仍靠 `isStudio` | 高 | 主檔極長；`coffeeBeanStudioStyles` |
| `/daily-reports` | `DailyReportGenerator`（lazy） | `DualThemePage`；Classic / Studio UI 已分離 | 中高 | Studio 為 `CwCard`/`CwStack` |
| `/schedule` | `ScheduleManager` | `DualThemePage` | 中 | **單檔極大**；Studio/Classic 雙樹 |
| `/data-tester` | `DataFormatTester` | `DualThemePage` | 中 | 表單為主 |
| `/poursteady` | `PoursteadyAdjustment` | `DualThemePage` | 中 | |
| `/alcohol` | redirect → `/playground#alcohol` | — | — | 內容在 `AlcoholContent` |
| `/flight-data` | `FlightData`（lazy） | `DualThemePage`（Studio 外殼不重複 `container-custom`） | 中高 | 列表 Tab 已 Studio 化；**統計 Tab 工具列／高峰說明已 Studio 化（Phase 1）**；**歷史趨勢對比區塊仍 Classic 樣式（Phase 1.5）** |
| `/playground` | `Playground` | `DualThemePage` | 中 | Hash 子頁（`#studio-ui`）、`MusicContent` / `EchartsDemo` lazy |
| `/music` | `Navigate` → `#music` | — | — | **`Music.jsx` 未掛載，孤兒** |
| `/admin` | `AdminPanel`（lazy） | `DualThemePage` | 中 | 多視圖 |
| `*` | `ErrorPage` | `DualThemePage` | 高 | |
| Suspense fallback | `LoadingPage` | `DualThemePage` | 高 | |

## Suspense / 全域

| 區塊 | 檔案 | 備註 |
|------|------|------|
| Firebase 離線警示 | `FirebaseStatusBanner.jsx`（`App.jsx` 組裝） | Classic / Studio 由元件內分流 |

## 孤兒或未掛路由頁面

| 檔案 | 狀態 | 建議 |
|------|------|------|
| `src/pages/Music.jsx` | 未被 `Route` 使用；`/music` redirect Playground | 刪除或改 export 給 Playground 再匯（目前重複已由 `MusicContent` 承接） |
| `src/pages/Home.jsx` | 未於 `App.jsx` import | 刪除或改為將來 Hub |
| `src/pages/DataConverter.jsx` | 未掛路由；Playground 未引用 | internal 保留或移除 |
| `src/pages/EchartsDemo.jsx` | 僅 Playground lazy 引用 | 維持 |
| `src/components/studio/StudioMobileDrawer.jsx` | 未 import | Phase 2+ 刪除或接回窄螢幕導覽 |
| `src/components/SandwichInput.jsx` | 未引用 | 孤兒；日期欄若啟用請用 `CwDateInput` |

## 包裝方式術語

- **DualThemePage**：Classic 為整頁 `classic` prop；Studio 為 `StudioPageChrome` 包 `studio` prop。
- **手動**：元件內 `useTheme` + 條件渲染，並自行包 `StudioPageChrome`（若需要標題區）。

## 下一阶段（對應計畫）

1. 統一走 `DualThemePage` + 共用 `studioSurfaceClasses`。
2. 大頁：`ScheduleManager` 拆檔後 Studio 區塊化優先。
3. 航班統計 Tab「歷史趨勢對比」Studio 化（Phase 1.5）。
4. 共用 `CwModalFrame`（backdrop + panel）、`FirebaseStatusBanner`。
