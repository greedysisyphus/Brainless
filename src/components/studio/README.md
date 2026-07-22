# Club / Cw UI kit（`components/studio/`）

此資料夾保留 **Cw\*** 元件與 `DualThemePage`，供 **Club** 主題使用。  
**Studio 主題已移除**（2026-07）；請勿再新增 `data-app-theme="studio"` 或 Studio 殼層。

- **Classic** 視覺由各頁既有 class／Layout 決定。
- **Club token**：`src/styles/index.css` 於 `html[data-app-theme='club']` 底下的 `--cw-*`。
- **UI Kit**：`ui/` — 用在 `isStudio`（= Club）視圖，避免覆寫全域 Classic class。
- **頁面 chrome**：`StudioPageChrome`、`DualThemePage`（prop 名 `studio` = Club 現代視圖內容）。

## 字級／間距（概要）

- 頁標：`StudioPageChrome` 內 `h1`
- 區塊標：`StudioSectionTitle` 或 `CwCard` 的 `title`
- 表單標：`CwInput` 的 `label`
- 觸控：`CwButton` 與 `cw-touch-target` 至少約 44×44pt

## 日期欄（`CwDateInput`）

Club 下請用 [`ui/CwDateInput.jsx`](ui/CwDateInput.jsx)；`html[data-app-theme='club']` 已設 `color-scheme: light`.
