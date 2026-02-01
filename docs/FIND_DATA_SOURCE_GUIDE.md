# 找出航班資料來源指南

## 目標

找出 yuann.tw 網站是從哪裡獲取桃園機場航班資料的，以便在自己的網頁上使用相同的資料來源。

## 分析結果

根據之前的分析，yuann.tw 網站的航班資料是：

### ✅ 已確認的事實

1. **Server-side Rendered（伺服器端渲染）**
   - 資料直接嵌入在 HTML 中，不是透過前端 JavaScript 動態載入
   - 這意味著資料是在 WordPress 後端處理的

2. **沒有公開的 API 端點**
   - 沒有找到動態的 AJAX/Fetch 請求來獲取航班資料
   - 只有 Jetpack 的統計請求（與航班資料無關）

3. **URL 參數篩選**
   - 透過 `?flight_search=D11` 等參數來篩選特定登機門
   - 這表示資料是在伺服器端根據參數查詢後渲染的

## 可能的資料來源

### 1. 桃園機場官方 API（最可能）

桃園機場可能有提供官方 API，但需要確認：

- **官方網站**: https://www.taoyuan-airport.com
- **民航局**: https://www.caa.gov.tw
- **航站管理**: https://www.anws.gov.tw

**檢查方法**：
1. 訪問官方網站，查看是否有 API 文件
2. 檢查是否有公開的資料服務
3. 查看網站的開發者文件

### 2. 第三方航班資料服務

可能的服務提供商：

- **FlightRadar24 API**: https://www.flightradar24.com
- **FlightAware API**: https://www.flightaware.com
- **Aviation Edge**: https://aviation-edge.com
- **OpenSky Network**: https://opensky-network.org

**檢查方法**：
1. 查看這些服務的 API 文件
2. 檢查是否需要 API Key
3. 查看定價方案

### 3. 網頁爬蟲（Web Scraping）

yuann.tw 可能使用後端爬蟲來抓取其他網站的資料：

- 桃園機場官方網站
- 航空公司網站
- 其他航班資訊網站

**檢查方法**：
1. 查看頁面源碼中是否有資料來源的註解
2. 檢查 WordPress 外掛或自定義代碼
3. 查看伺服器日誌（如果有權限）

### 4. WordPress 自定義功能

可能是透過 WordPress 外掛或自定義功能來獲取資料：

- 自定義 Post Type
- 自定義欄位
- 第三方外掛
- 自定義 API 整合

**檢查方法**：
1. 查看頁面源碼中的 WordPress 結構
2. 檢查是否有自定義的資料結構
3. 查看是否有外掛相關的標記

## 使用分析腳本

我已經建立了一個專門的分析腳本來找出資料來源：

### 安裝和使用

1. **打開目標網站**
   ```
   https://yuann.tw/taoyuan-airport-d11-d18-departures/
   ```

2. **打開開發者工具**
   - 按 `F12` 或 `Cmd+Option+I`

3. **執行分析腳本**
   - 打開 `scripts/find-flight-data-source.js`
   - 複製全部代碼
   - 貼到 Console 並執行

4. **查看結果**
   - 腳本會自動檢查多個可能的資料來源
   - 結果會顯示在 Console 中
   - 完整結果保存在 `window._flightDataSourceAnalysis`

### 腳本檢查項目

1. ✅ WordPress REST API 端點
2. ✅ 頁面中的 Script 標籤和內嵌代碼
3. ✅ Network 請求攔截（fetch/XHR）
4. ✅ 可能的資料來源網站
5. ✅ 頁面註解和隱藏資訊
6. ✅ WordPress 自定義欄位
7. ✅ 伺服器回應標頭
8. ✅ 頁面源碼中的資料結構

### 進階使用

```javascript
// 重新執行分析
_analyzeFlightDataSource()

// 查看完整結果
console.log(window._flightDataSourceAnalysis)

// 觸發頁面操作後再次分析（例如搜尋）
// 1. 在頁面上執行搜尋操作
// 2. 執行 _analyzeFlightDataSource() 來捕獲動態請求
```

## 手動檢查步驟

### 步驟 1: 檢查頁面源碼

1. 右鍵點擊頁面 → "檢視網頁原始碼"
2. 搜尋以下關鍵字：
   - `api`
   - `flight`
   - `airport`
   - `source`
   - `data-source`
   - `endpoint`

### 步驟 2: 檢查 Network 標籤

1. 打開開發者工具 → Network 標籤
2. 清除現有請求
3. 重新載入頁面
4. 搜尋以下關鍵字：
   - `api`
   - `flight`
   - `airport`
   - `wp-json`
   - `admin-ajax`

### 步驟 3: 檢查 WordPress REST API

在 Console 中執行：

```javascript
// 檢查 WordPress REST API 路由
fetch('/wp-json/')
  .then(r => r.json())
  .then(data => console.log('WordPress API 路由:', data))

// 檢查可能的自定義端點
const endpoints = ['flight', 'flights', 'airport', 'departure', 'gate'];
endpoints.forEach(endpoint => {
  fetch(`/wp-json/wp/v2/${endpoint}`)
    .then(r => r.ok ? r.json().then(d => console.log(`✅ ${endpoint}:`, d)) : null)
    .catch(() => {});
});
```

### 步驟 4: 檢查可能的資料來源網站

訪問以下網站，查看是否有公開 API：

1. **桃園機場官方網站**
   - https://www.taoyuan-airport.com
   - 查看是否有開發者文件或 API 文件

2. **民航局**
   - https://www.caa.gov.tw
   - 查看是否有資料服務

3. **第三方服務**
   - FlightRadar24
   - FlightAware
   - Aviation Edge

## 如果找不到 API

如果無法找到公開的 API，可以考慮以下替代方案：

### 方案 1: 使用網頁爬蟲

在自己的伺服器上建立爬蟲來抓取資料：

```python
# Python 範例
import requests
from bs4 import BeautifulSoup

url = 'https://yuann.tw/taoyuan-airport-d11-d18-departures/?flight_search=D11'
response = requests.get(url)
soup = BeautifulSoup(response.text, 'html.parser')

# 提取表格資料
tables = soup.find_all('table', class_='flight-table')
# 處理資料...
```

**注意事項**：
- 需要遵守網站的 robots.txt
- 需要適當的請求頻率
- 可能需要處理反爬蟲機制

### 方案 2: 使用現有的航班資料 API

使用第三方航班資料服務：

1. **FlightRadar24 API**
   - 提供即時航班追蹤資料
   - 需要 API Key
   - 有免費和付費方案

2. **Aviation Edge**
   - 提供航班、機場、航空公司資料
   - 需要 API Key
   - 有免費試用

3. **OpenSky Network**
   - 開源的航班追蹤資料
   - 免費使用
   - 主要針對歐洲和美國

### 方案 3: 聯繫網站管理員

如果 yuann.tw 網站有提供 API 或資料服務，可以：

1. 查看網站是否有聯絡方式
2. 詢問是否可以提供 API 存取
3. 詢問資料來源

## 下一步

1. **執行分析腳本**：使用 `find-flight-data-source.js` 進行全面分析
2. **檢查結果**：查看找到的所有線索
3. **手動驗證**：根據線索手動檢查可能的資料來源
4. **選擇方案**：根據結果選擇最適合的實作方式

## 相關文件

- [API 分析指南](./API_ANALYSIS_GUIDE.md)
- [航班資料提取工具指南](./FLIGHT_DATA_EXTRACTOR_GUIDE.md)
- [Tampermonkey 設置指南](./TAMPERMONKEY_SETUP_GUIDE.md)
