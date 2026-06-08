# Studio theme

- **Classic** 視覺由各頁既有的 class／Layout 決定，不在此資料夾內調整預設樣式。
- **Studio token**：`src/styles/index.css` 於 `html[data-app-theme='studio']` 底下的 `--cw-*`。
- **UI Kit**：`ui/` — 僅用在 `isStudio` 視圖，避免改用全域 `.card` 覆寫。
- **字級／間距規範**（概要）：
  - 頁標：`StudioPageChrome` 內 `h1`（約 `text-3xl`–`4xl`）
  - 區塊標：`StudioSectionTitle` 或 `CwCard` 的 `title`
  - 表單標：`CwInput` 的 `label`（小寫 + tracking）
  - 間距：建議以 Tailwind `gap-4` / `gap-5` / `p-5` 等 4 的倍數對齊 8px 網格
  - 觸控：`CwButton` 與 `cw-touch-target` 至少約 44×44pt

## 日期欄（`CwDateInput`）

- Studio 下請用 [`ui/CwDateInput.jsx`](ui/CwDateInput.jsx)，勿裸用 `<input type="date">`：整欄可點、右側日曆鈕會呼叫 `showPicker()`，避免深色主題原生圖示難點。
- 全域樣式：[`src/styles/index.css`](../../styles/index.css) 於 `html[data-app-theme='studio']` 設定 `color-scheme: dark`；`.cw-date-input` 與 `::-webkit-calendar-picker-indicator` 反色。
- 匯出：`tryOpenDatePicker` 可供外部 `label` 的 `htmlFor` 點擊時開啟選擇器（見航班資料「選擇日期」）。
- 內部 token 前綴 `--cw-*` / `Cw*` 為 Studio UI kit 縮寫，與主題對外名稱 Studio 並列使用。
