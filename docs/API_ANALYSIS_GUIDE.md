# 如何查看 yuann.tw 桃園機場航班 API

## 方法一：使用瀏覽器開發者工具

### 步驟

1. **打開目標網頁**
   - 訪問：https://yuann.tw/taoyuan-airport-d11-d18-departures/

2. **開啟開發者工具**
   - 按 `F12` 或 `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - 或右鍵點擊頁面 → 選擇「檢查」

3. **切換到 Network 標籤**
   - 點擊頂部的 "Network" 標籤
   - 確保 "Preserve log" 已勾選（保留日誌）

4. **重新載入頁面**
   - 按 `F5` 或 `Cmd+R` 重新載入
   - 觀察 Network 標籤中的請求

5. **篩選 API 請求**
   - 在篩選器中輸入：`XHR` 或 `Fetch`
   - 或搜尋關鍵字：`api`、`gate`、`flight`、`departure`、`taoyuan`、`airport`
   - **注意**：忽略以下請求（這些不是航班 API）：
     - `googlesyndication.com` - Google 廣告
     - `google-analytics.com` - Google 分析
     - `gstatic.com` - Google 靜態資源
     - `facebook.com` - Facebook 追蹤
     - `doubleclick.net` - Google 廣告

6. **查看請求詳情**
   - 點擊任何一個請求
   - 查看以下資訊：
     - **Headers**：請求 URL、方法、參數
     - **Payload**：請求資料（如果有）
     - **Response**：回應資料結構
     - **Preview**：格式化的回應預覽

### 常見的 API 端點格式

根據一般機場航班 API 的實作，可能的端點格式：

```
GET /api/flights?gate=D11-D18&date=2026-01-31
GET /api/departures?terminal=3&gates=D11,D12,D13,D14,D15,D16,D17,D18
GET /api/flight-info?gate_range=D11-D18
```

## 方法二：使用 Console 監控腳本（推薦）

> **⚠️ 重要提示**：在 Console 中執行的腳本會在重新載入頁面後消失。請參考 [腳本持久化指南](./SCRIPT_PERSISTENCE_GUIDE.md) 了解如何讓腳本持續有效。

### 使用增強版腳本（最推薦）⭐

**這是功能最完整的版本，可以自動提取 JSON-LD 資料並詳細記錄所有請求！**

詳細說明請參考：[增強版 API 分析指南](./ENHANCED_API_ANALYSIS.md)

快速開始：

1. **打開 DevTools**
   - 按 `F12` 開啟開發者工具

2. **切換到 Sources 標籤**
   - 點擊頂部的 "Sources" 標籤

3. **打開 Snippets**
   - 在左側面板中找到 "Snippets"（如果沒看到，點擊 `>>` 展開）
   - 如果沒有 Snippets，右鍵點擊左側面板 → 選擇 "Snippets"

4. **創建新 Snippet**
   - 右鍵點擊 "Snippets" → 選擇 "New snippet"
   - 命名為 "Enhanced WordPress API Analyzer"

5. **貼上代碼**
   - 打開 `scripts/enhanced-wordpress-api-analyzer.js`
   - 複製全部代碼
   - 貼到 Snippet 編輯器中

6. **執行 Snippet**
   - 右鍵點擊 Snippet → 選擇 "Run"
   - 或使用快捷鍵：`Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

7. **重新載入頁面**
   - 腳本會自動提取 JSON-LD 資料並監控所有請求
   - **每次重新載入後，只需再次執行 Snippet 即可**

8. **查看結果**
   - 在 Console 中執行 `_viewJsonLdData()` 查看 JSON-LD 航班資料
   - 在 Console 中執行 `_viewInterceptedRequests()` 查看所有攔截的請求

### 使用 Chrome DevTools Snippets（基礎版）

如果你只需要基本的監控功能，可以使用基礎版：

1. **打開 DevTools**
   - 按 `F12` 開啟開發者工具

2. **切換到 Sources 標籤**
   - 點擊頂部的 "Sources" 標籤

3. **打開 Snippets**
   - 在左側面板中找到 "Snippets"（如果沒看到，點擊 `>>` 展開）
   - 如果沒有 Snippets，右鍵點擊左側面板 → 選擇 "Snippets"

4. **創建新 Snippet**
   - 右鍵點擊 "Snippets" → 選擇 "New snippet"
   - 命名為 "WordPress API Analyzer"

5. **貼上代碼**
   - 打開 `scripts/find-wordpress-api.js`
   - 複製全部代碼
   - 貼到 Snippet 編輯器中

6. **執行 Snippet**
   - 右鍵點擊 Snippet → 選擇 "Run"
   - 或使用快捷鍵：`Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

7. **重新載入頁面**
   - 腳本會持續監控，即使重新載入頁面也會繼續工作
   - **每次重新載入後，只需再次執行 Snippet 即可**

### 使用深度分析腳本（最完整）

1. **打開目標網頁和開發者工具**
   - 訪問：https://yuann.tw/taoyuan-airport-d11-d18-departures/
   - 按 `F12` 開啟開發者工具

2. **切換到 Console 標籤**

3. **執行深度分析腳本**
   - 複製 `scripts/deep-analyze-yuann-api.js` 中的**全部代碼**
   - 貼到 Console 中執行
   - 腳本會自動：
     - 攔截所有 fetch 和 XHR 請求
     - 搜尋頁面中的 API 端點
     - 檢查 WordPress 相關設定（如 admin-ajax.php）
     - 搜尋 window 物件中的 API 變數
     - 檢查頁面中的資料屬性

4. **重新載入頁面**
   - 按 `F5` 或 `Cmd+R` 重新載入
   - **注意**：重新載入後需要再次執行腳本
   - 觀察 Console 中顯示的所有請求
   - 特別注意標記為 `[FETCH RESPONSE]` 或 `[XHR RESPONSE]` 的內容

5. **查看攔截的請求**
   - 在 Console 中執行：`window._viewInterceptedRequests()`
   - 會以表格形式顯示所有攔截的請求

### 使用 WordPress 專用腳本（如果檢測到 WordPress）

如果網站是 WordPress，可以使用專門的腳本：

1. **複製 `scripts/find-wordpress-api.js` 中的代碼**
2. **貼到 Console 中執行**
3. **重新載入頁面並觀察輸出**
4. **特別注意 `admin-ajax.php` 的請求**

### 使用簡易監控腳本

如果深度分析腳本輸出太多，可以使用簡化版本：

1. **複製 `scripts/analyze-flight-api.js` 中的代碼**
2. **貼到 Console 中執行**
3. **重新載入頁面並觀察輸出**

## 方法三：查看網頁原始碼和 JavaScript

1. **查看頁面原始碼**
   - 右鍵點擊頁面 → 選擇「查看網頁原始碼」
   - 或按 `Cmd+U` (Mac) / `Ctrl+U` (Windows)

2. **搜尋關鍵字**
   - 在原始碼中搜尋：`fetch`、`axios`、`api`、`gate`、`D11`、`D18`、`taoyuan`、`airport`

3. **查看 JavaScript 檔案**
   - 在 Network 標籤中查看載入的 `.js` 檔案
   - 點擊查看內容，搜尋 API 相關代碼
   - 特別注意包含以下關鍵字的檔案：
     - `flight`
     - `departure`
     - `gate`
     - `airport`

4. **在 Console 中搜尋**
   - 打開 Console 標籤
   - 執行以下代碼來搜尋所有可能的 API 端點：
   ```javascript
   // 搜尋所有包含 API 相關關鍵字的變數和函數
   console.log('搜尋 API 相關代碼...');
   // 查看 window 物件中是否有相關的 API 函數
   Object.keys(window).filter(key => 
     key.toLowerCase().includes('api') || 
     key.toLowerCase().includes('flight') ||
     key.toLowerCase().includes('gate')
   ).forEach(key => console.log(key, window[key]));
   ```

## 特別注意：WordPress 網站

如果該網站是 WordPress 網站（常見於個人部落格），API 呼叫可能通過：

1. **admin-ajax.php**
   - URL 格式：`/wp-admin/admin-ajax.php`
   - 參數：`action`（指定要執行的動作）
   - 查看方式：在 Network 標籤中搜尋 `admin-ajax`

2. **REST API**
   - URL 格式：`/wp-json/wp/v2/...`
   - 查看方式：在 Network 標籤中搜尋 `wp-json`

3. **自訂端點**
   - 可能透過 WordPress 外掛或主題自訂
   - 查看方式：檢查頁面原始碼中的 JavaScript

## 可能的資料來源

1. **桃園機場官方 API**
   - 可能有公開的航班資訊 API
   - 需要查看官方文件
   - 可能來源：https://www.taoyuan-airport.com/

2. **第三方航班 API**
   - FlightAware
   - AviationStack
   - OpenSky Network
   - FlightRadar24

3. **網頁爬蟲**
   - 直接爬取機場官網
   - 使用無頭瀏覽器（如 Puppeteer）
   - 定期更新資料並儲存在資料庫

4. **後端 API 服務**
   - 網站自己的後端服務
   - 可能使用 Node.js、PHP、Python 等
   - 透過 `/api/` 路徑提供服務

## 分析重點

查看 API 時，注意以下資訊：

- **端點 URL**：完整的 API 路徑
- **請求方法**：GET、POST 等
- **請求參數**：
  - 登機門範圍（D11-D18）
  - 日期範圍
  - 航班類型（出發/抵達）
- **回應格式**：JSON 結構
- **認證方式**：是否需要 API Key 或 Token
- **更新頻率**：多久更新一次

## 實作建議

如果找到 API，可以：

1. **建立 API 封裝函數**
   ```javascript
   // src/utils/flightApi.js
   export async function getGateFlights(gates, date) {
     // API 呼叫邏輯
   }
   ```

2. **建立 React 組件**
   ```javascript
   // src/components/FlightGateInfo.jsx
   function FlightGateInfo({ gates }) {
     // 顯示登機門航班資訊
   }
   ```

3. **加入 Playground**
   - 可以作為 Playground 的新功能
