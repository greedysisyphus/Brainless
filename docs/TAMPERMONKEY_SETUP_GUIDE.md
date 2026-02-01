# Tampermonkey 擴展設置指南

使用 Tampermonkey 擴展可以讓分析腳本自動執行，無需每次重新載入頁面後手動操作。這是**最方便且最持久化**的方法。

## 為什麼選擇 Tampermonkey？

### ✅ 優點

1. **完全自動化**
   - 腳本會在頁面載入時自動執行
   - 無需手動操作，設定一次即可

2. **持久化**
   - 腳本保存在擴展中，不會消失
   - 重新載入頁面後自動重新執行

3. **精確控制**
   - 可以設定只在特定網站執行（如 `https://yuann.tw/*`）
   - 不會影響其他網站

4. **專業工具**
   - 廣泛使用的用戶腳本管理器
   - 支援版本控制和更新

### ⚠️ 缺點

1. 需要安裝擴展（但這是唯一需要做的設定）

## 安裝步驟

### 1. 安裝 Tampermonkey 擴展

根據你的瀏覽器選擇：

- **Chrome**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- **Edge**: [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- **Safari**: [Tampermonkey](https://apps.apple.com/app/tampermonkey/id1482490089)

### 2. 創建新腳本

1. **點擊瀏覽器工具列中的 Tampermonkey 圖標**
   - 選擇 "Create a new script..."

2. **或從儀表板創建**
   - 點擊 Tampermonkey 圖標 → "Dashboard"
   - 點擊 "+" 按鈕創建新腳本

### 3. 貼上腳本代碼

1. **打開腳本文件**
   - 打開 `scripts/tampermonkey-wordpress-api-analyzer.user.js`
   - 複製**全部**內容

2. **貼到 Tampermonkey 編輯器**
   - 刪除編輯器中的預設代碼
   - 貼上複製的內容

3. **檢查腳本標頭**
   - 確保腳本標頭包含：
     ```javascript
     // @match        https://yuann.tw/*
     // @match        http://yuann.tw/*
     ```
   - 這確保腳本只在 yuann.tw 網站執行

### 4. 保存腳本

- 按 `Cmd+S` (Mac) / `Ctrl+S` (Windows) 保存
- 或點擊編輯器上方的 "File" → "Save"

### 5. 啟用腳本

- 確保腳本旁邊的開關是**開啟**狀態（綠色）
- 如果關閉，點擊開關啟用

## 使用方法

### 自動執行

1. **訪問目標網站**
   - 打開 `https://yuann.tw/taoyuan-airport-d11-d18-departures/`

2. **腳本自動執行**
   - 腳本會在頁面載入時自動執行
   - 無需任何手動操作

3. **查看結果**
   - **浮動面板**：頁面右上角會自動顯示一個浮動面板，實時顯示分析結果
   - **無需打開 Console**：所有資料會自動顯示在面板中
   - **實時更新**：當有新的請求或資料時，面板會自動更新

### UI 面板功能

腳本會在頁面右上角創建一個浮動面板，包含以下功能：

1. **JSON-LD 航班資料區塊**
   - 自動顯示所有找到的 JSON-LD 格式航班資料
   - 以 JSON 格式展示，方便查看結構

2. **攔截的請求區塊**
   - 顯示所有攔截到的 `admin-ajax.php` 請求
   - 包含請求類型、URL、狀態碼、回應資料
   - 成功請求顯示綠色標籤，錯誤請求顯示紅色標籤

3. **面板操作**
   - **複製資料**：點擊 `📋 Copy` 按鈕可以一鍵複製所有分析資料（JSON-LD 資料和攔截的請求），方便貼給其他人分析
   - **拖曳**：點擊標題列可以拖曳面板到任意位置
   - **摺疊/展開**：點擊 `−` 按鈕可以摺疊或展開面板
   - **關閉**：點擊 `×` 按鈕可以關閉面板

### 查看分析結果（進階）

如果需要更詳細的資料，也可以在 Console 中執行以下函數：

```javascript
// 查看所有攔截的 admin-ajax.php 請求
_viewInterceptedRequests()

// 查看 JSON-LD 航班資料
_viewJsonLdData()
```

### 重新載入頁面

- 按 `F5` 或 `Cmd+R` 重新載入
- 腳本會自動重新執行
- 無需手動操作

## 腳本管理

### 查看已安裝的腳本

1. 點擊 Tampermonkey 圖標 → "Dashboard"
2. 可以看到所有已安裝的腳本
3. 可以啟用/停用、編輯、刪除腳本

### 更新腳本

如果需要更新腳本：

1. 打開 `scripts/tampermonkey-wordpress-api-analyzer.user.js`
2. 複製更新後的內容
3. 在 Tampermonkey Dashboard 中點擊腳本名稱
4. 貼上更新後的內容
5. 保存

### 停用腳本

如果暫時不需要腳本：

1. 打開 Tampermonkey Dashboard
2. 找到腳本
3. 點擊開關關閉（變為灰色）

### 刪除腳本

如果不再需要腳本：

1. 打開 Tampermonkey Dashboard
2. 找到腳本
3. 點擊垃圾桶圖標刪除

## 故障排除

### 腳本沒有執行

1. **檢查腳本是否啟用**
   - 打開 Tampermonkey Dashboard
   - 確認腳本開關是綠色（啟用）

2. **檢查 URL 匹配**
   - 確認當前網址符合 `@match` 規則
   - 應該是 `https://yuann.tw/*` 或 `http://yuann.tw/*`

3. **檢查 Console 錯誤**
   - 打開開發者工具 → Console
   - 查看是否有錯誤訊息

### 沒有看到輸出

1. **確認頁面已完全載入**
   - 等待幾秒後再檢查 Console

2. **檢查 Console 過濾器**
   - 確認 Console 沒有過濾掉訊息
   - 清除過濾器或選擇 "All levels"

3. **手動執行查看函數**
   - 執行 `_viewInterceptedRequests()`
   - 執行 `_viewJsonLdData()`

### jQuery 攔截沒有生效

1. **等待 jQuery 載入**
   - 腳本會自動重試攔截 jQuery
   - 如果頁面載入較慢，可能需要等待

2. **檢查 jQuery 是否存在**
   - 在 Console 中執行 `window.jQuery`
   - 如果返回 `undefined`，表示 jQuery 尚未載入

## 與其他方法比較

| 方法 | 自動執行 | 持久化 | 設定難度 | 推薦度 |
|------|---------|--------|---------|--------|
| **Tampermonkey** | ✅ | ✅ | 簡單 | ⭐⭐⭐⭐⭐ |
| Chrome Snippets | ❌ | ✅ | 簡單 | ⭐⭐⭐⭐ |
| Console 直接執行 | ❌ | ❌ | 最簡單 | ⭐⭐⭐ |
| Bookmarklet | ❌ | ✅ | 簡單 | ⭐⭐ |

## 總結

**對於需要持續分析 API 的情況，Tampermonkey 是最佳選擇**：

- ✅ 完全自動化，無需手動操作
- ✅ 設定一次，永久有效
- ✅ 專業且可靠
- ✅ 不會影響其他網站

只需要安裝一次擴展，之後就可以自動分析 API，非常方便！
