# 手動檢查航班 API 指南

當自動分析腳本無法找到航班 API 時，請按照以下步驟手動檢查。

## 步驟 1：檢查 Network 標籤

### 1.1 打開開發者工具
- 按 `F12` 或 `Cmd+Option+I` (Mac)
- 切換到 **Network** 標籤

### 1.2 清除並重新載入
- 點擊清除按鈕（🚫）
- 按 `F5` 或 `Cmd+R` 重新載入頁面

### 1.3 搜尋航班相關請求
在 Network 標籤的搜尋框中輸入以下關鍵字（一個一個試）：

```
flight
gate
departure
d11
d12
d13
d14
d15
d16
d17
d18
airport
taoyuan
api
wp-json
admin-ajax
```

### 1.4 檢查請求詳情
如果找到相關請求：
1. 點擊該請求
2. 查看 **Headers** 標籤：
   - Request URL
   - Request Method
   - Request Headers
3. 查看 **Payload** 標籤（如果是 POST 請求）
4. 查看 **Response** 標籤：
   - 回應的資料格式
   - 是否為 JSON

### 1.5 檢查所有請求類型
在 Network 標籤的過濾器中選擇：
- **XHR** - AJAX 請求
- **Fetch** - Fetch API 請求
- **JS** - JavaScript 檔案（可能包含 API 端點）
- **Doc** - 文件請求（可能包含嵌入的資料）

## 步驟 2：檢查頁面源碼

### 2.1 查看頁面源碼
- 右鍵點擊頁面 → 選擇「檢視網頁原始碼」
- 或按 `Cmd+U` (Mac) / `Ctrl+U` (Windows)

### 2.2 搜尋航班關鍵字
在源碼中搜尋（`Cmd+F` / `Ctrl+F`）：
- `flight`
- `gate`
- `departure`
- `d11` 到 `d18`
- `airport`
- `taoyuan`

### 2.3 檢查可能的資料格式
尋找以下模式：

#### JSON 資料
```html
<script>
var flightData = {...};
</script>
```

#### 表格資料
```html
<table>
  <tr>
    <td>航班號</td>
    <td>登機門</td>
  </tr>
</table>
```

#### 資料屬性
```html
<div data-flight="..." data-gate="...">
```

## 步驟 3：檢查 Console 輸出

### 3.1 查看 Console 訊息
- 打開開發者工具 → **Console** 標籤
- 查看是否有錯誤訊息
- 查看是否有 API 相關的日誌

### 3.2 檢查全域變數
在 Console 中執行：

```javascript
// 檢查 window 物件中的航班相關變數
Object.keys(window).filter(key => 
  key.toLowerCase().includes('flight') || 
  key.toLowerCase().includes('gate') ||
  key.toLowerCase().includes('departure')
)

// 檢查是否有航班資料
window.flightData
window.gateData
window.departureData
```

## 步驟 4：檢查 iframe

### 4.1 檢查是否有 iframe
在 Console 中執行：

```javascript
// 檢查所有 iframe
document.querySelectorAll('iframe').forEach((iframe, index) => {
  console.log(`iframe ${index}:`, iframe.src);
});
```

### 4.2 檢查 iframe 內容
如果找到 iframe：
1. 在 Network 標籤中搜尋 iframe 的 URL
2. 檢查該 iframe 載入的資源

## 步驟 5：檢查動態載入

### 5.1 等待頁面完全載入
- 等待 5-10 秒
- 觀察是否有新的請求出現

### 5.2 觸發互動
- 點擊頁面上的按鈕
- 輸入搜尋條件
- 選擇日期或登機門
- 觀察 Network 標籤是否有新請求

## 步驟 6：檢查 WebSocket 或 Server-Sent Events

### 6.1 檢查 WebSocket
在 Network 標籤中：
- 選擇 **WS** (WebSocket) 過濾器
- 查看是否有 WebSocket 連線

### 6.2 檢查 Server-Sent Events
在 Network 標籤中：
- 選擇 **Other** 過濾器
- 查看是否有 EventSource 相關請求

## 步驟 7：檢查頁面中的表格元素

### 7.1 檢查表格
在 Console 中執行：

```javascript
// 檢查所有表格
document.querySelectorAll('table').forEach((table, index) => {
  console.log(`表格 ${index}:`, table);
  console.log('內容:', table.innerHTML.substring(0, 500));
});
```

### 7.2 檢查列表
在 Console 中執行：

```javascript
// 檢查所有列表
document.querySelectorAll('ul, ol').forEach((list, index) => {
  const text = list.textContent;
  if (text.includes('D1') || text.includes('航班') || text.includes('登機門')) {
    console.log(`列表 ${index}:`, list);
  }
});
```

## 步驟 8：使用增強版分析腳本

### 8.1 確保腳本已更新
- 使用最新版本的 `tampermonkey-wordpress-api-analyzer.user.js`
- 腳本會自動檢查更多資料來源

### 8.2 查看腳本輸出
- 打開 Console 標籤
- 查看腳本的詳細輸出
- 查看右上角的浮動面板

## 常見情況

### 情況 1：資料直接嵌入在 HTML 中
- **特徵**：Network 標籤中沒有相關請求
- **解決**：檢查頁面源碼中的表格或列表元素

### 情況 2：使用第三方服務
- **特徵**：請求發送到外部域名
- **解決**：檢查 Network 標籤中的外部請求

### 情況 3：使用 iframe
- **特徵**：頁面中有 iframe 元素
- **解決**：檢查 iframe 的源碼和請求

### 情況 4：需要互動觸發
- **特徵**：初始載入時沒有請求
- **解決**：點擊按鈕或輸入搜尋條件後檢查

## 提供給開發者的資訊

如果找到航班 API，請提供以下資訊：

1. **請求 URL**：完整的 API 端點
2. **請求方法**：GET / POST / PUT 等
3. **請求參數**：Payload 或 Query String
4. **回應格式**：JSON / XML / HTML 等
5. **回應範例**：實際的回應資料
6. **觸發條件**：如何觸發該 API 請求

## 下一步

如果手動檢查後仍無法找到 API，可能需要：
1. 聯繫網站管理員詢問 API 資訊
2. 檢查網站是否有公開的 API 文件
3. 使用瀏覽器擴展（如 Requestly）來攔截所有請求
