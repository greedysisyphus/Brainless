# 增強版 API 分析指南

根據你提供的 console 輸出，我已經創建了一個增強版的分析腳本，可以更詳細地提取和分析航班 API 資料。

## 發現的關鍵資訊

從你的 console 輸出中，我發現了以下重要資訊：

1. **Script 11 包含 JSON-LD 格式的航班資料**
   - 格式：`@context: 'https://schema.org'`
   - 結構：`@graph: Array(5)`
   - 這可能是頁面初始載入時嵌入的航班資料

2. **admin-ajax.php 請求返回 500 錯誤**
   - 這可能是動態載入航班資料的 API
   - 需要查看完整的 Payload 和 Response 來了解請求格式

3. **WordPress 環境確認**
   - jQuery 3.7.1
   - window.wp 物件存在
   - 多個腳本包含 admin-ajax.php 呼叫

## 使用增強版腳本

### 方法一：使用 Tampermonkey 擴展（最推薦）⭐

**完全自動化，設定一次即可永久使用！**

詳細說明請參考：[Tampermonkey 設置指南](./TAMPERMONKEY_SETUP_GUIDE.md)

快速開始：

1. **安裝 Tampermonkey 擴展**
   - Chrome: [下載連結](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [下載連結](https://addons.mozilla.org/firefox/addon/tampermonkey/)
   - Edge: [下載連結](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. **創建新腳本**
   - 點擊 Tampermonkey 圖標 → "Create a new script"

3. **貼上代碼**
   - 打開 `scripts/tampermonkey-wordpress-api-analyzer.user.js`
   - 複製全部代碼並貼到編輯器中

4. **保存腳本**
   - 按 `Cmd+S` 或 `Ctrl+S` 保存

5. **訪問目標網站**
   - 打開 `https://yuann.tw/taoyuan-airport-d11-d18-departures/`
   - 腳本會自動執行，無需手動操作！

**優點**：
- ✅ 完全自動化，無需手動操作
- ✅ 重新載入頁面後自動重新執行
- ✅ 設定一次，永久有效

### 方法二：使用 Chrome DevTools Snippets（推薦，持久化）

1. **打開 DevTools**
   - 按 `F12` 或 `Cmd+Option+I`

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
   - 腳本會自動執行並監控所有請求
   - **每次重新載入後，只需再次執行 Snippet 即可**

### 方法二：直接在 Console 中執行

1. 打開目標網頁和開發者工具
2. 切換到 Console 標籤
3. 複製 `scripts/enhanced-wordpress-api-analyzer.js` 的全部代碼
4. 貼上並執行
5. 重新載入頁面

**注意**：重新載入後需要再次執行腳本。

## 腳本功能

增強版腳本提供以下功能：

### 1. 自動提取 JSON-LD 和 HTML 資料

腳本會自動搜尋並提取頁面中所有航班相關資料，包括：
- **JSON-LD 格式資料**：Script 中的 schema.org 格式資料
- **HTML 表格資料**：頁面中所有包含航班關鍵字的表格（新增）
- **結構化容器資料**：div 等容器中的結構化航班資料（新增）
- **其他包含航班關鍵字的 JSON 資料**

### 2. 詳細記錄 admin-ajax.php 請求

腳本會攔截並記錄：
- **請求資訊**：URL、方法、Payload、action 參數
- **回應資訊**：狀態碼、回應資料、回應標頭
- **錯誤資訊**：錯誤訊息、錯誤回應內容

### 3. 浮動 UI 面板（新功能！）

**無需打開 Console，所有結果自動顯示在頁面上！**

腳本會在頁面右上角創建一個浮動面板，自動顯示：
- **JSON-LD 和 HTML 航班資料**：以結構化格式展示所有找到的資料
  - JSON-LD 資料：以 JSON 格式顯示
  - HTML 表格資料：顯示表格資訊、表頭和資料行（新增）
  - 結構化容器資料：顯示容器資訊和內容預覽（新增）
- **攔截的請求**：實時顯示所有 `admin-ajax.php` 請求，包含：
  - 請求類型（jQuery AJAX / FETCH / XHR）
  - 請求 URL
  - 狀態碼和狀態標籤（成功/錯誤）
  - Action 參數（如果有）
  - 回應資料預覽

**面板功能**：
- ✅ **複製資料**：點擊 `📋 Copy` 按鈕可以一鍵複製所有分析資料，格式化後複製到剪貼板，方便貼給其他人分析
- ✅ **拖曳**：點擊標題列可以拖曳面板
- ✅ **摺疊/展開**：點擊 `−` 按鈕
- ✅ **關閉**：點擊 `×` 按鈕
- ✅ **實時更新**：當有新資料時自動更新

**複製的資料格式**：
- 包含完整的 JSON-LD 航班資料（JSON 格式）
- 包含所有攔截的請求詳情（URL、方法、狀態碼、回應資料等）
- 包含時間戳記和網址資訊
- 格式化為易於閱讀的文字格式

### 4. 提供查看函數（進階）

如果需要更詳細的資料，也可以在 Console 中執行以下函數：

```javascript
// 查看所有攔截的請求
_viewInterceptedRequests()

// 查看 JSON-LD 航班資料
_viewJsonLdData()

// 查看 HTML 表格資料（新增）
_viewTableData()

// 查看所有找到的航班資料（包含表格、容器等）（新增）
_viewAllFlightData()
```

**新增功能說明**：
- `_viewTableData()`: 專門用於查看從 HTML 表格中提取的航班資料，會以結構化的方式顯示表格資訊、表頭和資料行
- `_viewAllFlightData()`: 查看所有找到的資料來源，包括 JSON-LD、HTML 表格、結構化容器等，方便全面了解資料結構

## 分析步驟

### 步驟 1：提取 Script 11 的完整內容

執行腳本後，在 Console 中執行：

```javascript
_viewJsonLdData()
```

這會顯示 Script 11 中的完整 JSON-LD 資料結構。

### 步驟 2：查看 admin-ajax.php 的請求詳情

1. **在 Network 標籤中**：
   - 搜尋 `admin-ajax`
   - 點擊找到的請求
   - 查看 **Headers**、**Payload**、**Response** 標籤

2. **在 Console 中**：
   - 執行 `_viewInterceptedRequests()`
   - 查看所有攔截的請求詳情

### 步驟 3：分析資料結構

根據提取的資料，分析：

1. **JSON-LD 資料結構**
   - 資料欄位名稱
   - 資料格式
   - 是否包含完整的航班資訊

2. **admin-ajax.php 請求格式**
   - action 參數值
   - 請求的 Payload 結構
   - 回應的資料格式

## 可能的 API 結構

根據 WordPress 和 JSON-LD 的常見模式，API 可能是：

### 情況 1：頁面初始資料（JSON-LD）

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Flight",
      "departureGate": "D11",
      "departureTime": "2026-01-31T10:00:00",
      ...
    }
  ]
}
```

### 情況 2：動態更新（admin-ajax.php）

```javascript
jQuery.ajax({
  url: '/wp-admin/admin-ajax.php',
  type: 'POST',
  data: {
    action: 'get_flight_data',
    gates: 'D11-D18',
    date: '2026-01-31'
  },
  success: function(response) {
    // 更新頁面資料
  }
});
```

## 下一步

1. **執行增強版腳本**
   - 使用 Snippets 方法（推薦，持久化）

2. **重新載入頁面**
   - 觀察 Console 輸出
   - 特別注意 JSON-LD 資料和 admin-ajax.php 請求

3. **提取關鍵資訊**
   - 執行 `_viewJsonLdData()` 查看 JSON-LD 資料
   - 執行 `_viewInterceptedRequests()` 查看所有請求
   - 在 Network 標籤中查看 admin-ajax.php 的完整請求

4. **提供分析結果**
   - 將 Script 11 的完整內容提供給我
   - 將 admin-ajax.php 的 Payload 和 Response 提供給我
   - 我可以幫你分析 API 結構並提供實作建議

## 常見問題

### Q: 腳本在重新載入後消失了？

A: 這是正常的。使用 **Chrome DevTools Snippets** 可以讓腳本持久化。每次重新載入後，只需再次執行 Snippet 即可。

### Q: 如何查看 Script 11 的完整內容？

A: 執行腳本後，在 Console 中執行 `_viewJsonLdData()`，或直接在 Sources 標籤中找到 Script 11 查看。

### Q: admin-ajax.php 返回 500 錯誤怎麼辦？

A: 500 錯誤可能是：
1. 伺服器端錯誤（需要查看 Response 內容）
2. 請求格式不正確（需要查看 Payload）
3. 認證問題（需要檢查 Headers）

在 Network 標籤中點擊該請求，查看 Response 標籤中的錯誤訊息。
