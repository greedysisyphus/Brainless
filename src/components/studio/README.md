# Club / Cw UI kit（`components/studio/`）

此資料夾保留 **Cw\*** 元件與 `DualThemePage`，供 **Club** 主題使用。  
**Studio 主題已移除**（2026-07）；**Classic 主題已移除**（2026-08）。請勿再新增 `data-app-theme="studio"`／`classic` 或主題切換器。

- **Club token**：`src/styles/index.css` 於 `html[data-app-theme='club']` 底下的 `--cw-*`。
- **UI Kit**：`ui/` — Club 視圖（程式裡仍常寫 `isStudio`）。
- **頁面 chrome**：`StudioPageChrome`、`DualThemePage`（prop 名 `studio` = Club 頁面主內容）。

## 字級／間距（概要）

- 頁標：`StudioPageChrome` 內 `h1`
- 區塊標：`StudioSectionTitle` 或 `CwCard` 的 `title`
- 表單標：`CwInput` 的 `label`
- 觸控：`CwButton` 與 `cw-touch-target` 至少約 44×44pt

## 日期欄（`CwDateInput`）

Club 下請用 [`ui/CwDateInput.jsx`](ui/CwDateInput.jsx)；`html[data-app-theme='club']` 已設 `color-scheme: light`.
