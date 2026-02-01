# 航班資料提取工具使用指南

## 概述

這個 Tampermonkey 腳本可以自動提取 yuann.tw 網站上的桃園機場 D11-D18 登機門航班資料，支援單頁面提取和批量獲取多個登機門的資料。

## 功能特色

- ✅ **自動提取表格資料**：自動識別並提取出發和抵達航班表格
- ✅ **結構化資料**：將 HTML 表格轉換為結構化的 JSON 格式
- ✅ **多登機門支援**：可以一次性獲取 D11-D18 所有登機門的資料
- ✅ **多格式匯出**：支援 JSON 和 CSV 格式匯出
- ✅ **視覺化 UI**：提供浮動面板，方便操作和查看
- ✅ **Console API**：提供 JavaScript 函數供進階使用

## 安裝步驟

### 1. 安裝 Tampermonkey

- Chrome: [下載連結](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- Firefox: [下載連結](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- Edge: [下載連結](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 2. 安裝腳本

1. 點擊 Tampermonkey 圖標 → "Create a new script"
2. 打開 `scripts/tampermonkey-flight-data-extractor.user.js`
3. 複製全部代碼並貼到編輯器中
4. 按 `Cmd+S` 或 `Ctrl+S` 保存

### 3. 訪問目標網站

打開 `https://yuann.tw/taoyuan-airport-d11-d18-departures/`，腳本會自動執行。

## 使用方式

### 方法一：使用 UI 面板（推薦）

腳本會在頁面左上角顯示一個浮動面板，包含以下功能：

#### 1. 提取當前頁面資料

- 點擊「提取當前頁面資料」按鈕
- 資料會自動提取並顯示在面板中
- 可以點擊「📋 JSON」或「📊 CSV」按鈕複製資料

#### 2. 獲取所有登機門資料

- 點擊「獲取所有登機門 (D11-D18)」按鈕
- 腳本會自動獲取 D11 到 D18 所有登機門的資料
- 獲取完成後可以複製 JSON 或 CSV 格式

#### 3. 面板操作

- **拖曳**：點擊標題列可以拖曳面板
- **摺疊/展開**：點擊 `−` 按鈕
- **關閉**：點擊 `×` 按鈕

### 方法二：使用 Console API（進階）

在瀏覽器 Console 中可以使用以下函數：

#### 提取當前頁面資料

```javascript
// 提取當前頁面的航班資料
const data = _extractFlightData();
console.log(data);

// 資料結構：
// {
//   timestamp: "2026-02-01T...",
//   url: "https://yuann.tw/...",
//   gate: "D11",
//   departure: { type: "departure", headers: [...], rowCount: 58, data: [...] },
//   arrival: { type: "arrival", headers: [...], rowCount: 49, data: [...] },
//   summary: { departureCount: 58, arrivalCount: 49, totalCount: 107 }
// }
```

#### 獲取指定登機門資料

```javascript
// 獲取 D11 登機門的資料
const d11Data = await _fetchGateData('D11');
console.log(d11Data);

// 獲取 D12 登機門的資料
const d12Data = await _fetchGateData('D12');
console.log(d12Data);
```

#### 批量獲取多個登機門

```javascript
// 獲取所有登機門 (D11-D18)
const allData = await _fetchMultipleGates();
console.log(allData);

// 只獲取特定登機門
const specificGates = await _fetchMultipleGates(['D11', 'D12', 'D13']);
console.log(specificGates);
```

#### 存取已提取的資料

```javascript
// 當前頁面的資料
console.log(window._flightData);

// 所有登機門的資料
console.log(window._allGatesData);
```

## 資料結構

### 單個航班資料結構

```javascript
{
  index: 1,
  type: "departure",  // 或 "arrival"
  flightCode: "JX791",
  airline: "星宇",
  fullFlightInfo: "JX791 (星宇)\nQF8738\n...",
  "出發時間/實際出發": "2/1 17:10",
  "航廈-櫃台": "T2-9",
  "登機門": "D11",
  city: "菲律賓克拉克",
  airportCode: "CRK",
  fullDestination: "菲律賓克拉克(CRK)",
  status: "準時ON TIME",
  statusClass: "status-ontime"
}
```

### 完整資料結構

```javascript
{
  timestamp: "2026-02-01T06:42:41.017Z",
  url: "https://yuann.tw/taoyuan-airport-d11-d18-departures/?flight_search=D11",
  gate: "D11",
  departure: {
    type: "departure",
    headers: ["出發時間/實際出發 ▲", "航班代號", "航廈-櫃台", "登機門", "目的地", "狀態"],
    rowCount: 58,
    data: [/* 58 個航班物件 */]
  },
  arrival: {
    type: "arrival",
    headers: ["抵達時間/實際抵達 ▲", "航班代號", "航廈-行李轉盤", "登機門", "出發地", "狀態"],
    rowCount: 49,
    data: [/* 49 個航班物件 */]
  },
  summary: {
    departureCount: 58,
    arrivalCount: 49,
    totalCount: 107
  }
}
```

## 匯出格式

### JSON 格式

點擊「📋 JSON」按鈕會複製完整的 JSON 資料，可以直接用於：

- 資料分析
- 匯入到其他系統
- 備份資料

### CSV 格式

點擊「📊 CSV」按鈕會複製 CSV 格式的資料，可以直接用於：

- Excel / Numbers 開啟
- 資料庫匯入
- 進一步處理

CSV 格式範例：

```csv
類型,時間,航班代號,航空公司,登機門,目的地/出發地,狀態
出發,2/1 17:10,JX791,星宇,D11,菲律賓克拉克(CRK),準時ON TIME
出發,2/1 15:40,JX783,星宇,D11,菲律賓宿霧(CEB),準時ON TIME
...
```

## 使用範例

### 範例 1：提取並分析當前頁面資料

```javascript
// 提取資料
const data = _extractFlightData();

// 分析出發航班
const departures = data.departure.data;
console.log(`共有 ${departures.length} 個出發航班`);

// 找出所有星宇航空的航班
const starLuxFlights = departures.filter(f => f.airline === '星宇');
console.log(`星宇航空航班: ${starLuxFlights.length} 班`);

// 找出所有準時的航班
const onTimeFlights = departures.filter(f => f.status.includes('準時'));
console.log(`準時航班: ${onTimeFlights.length} 班`);
```

### 範例 2：批量獲取並分析所有登機門

```javascript
// 獲取所有登機門資料
const allGates = await _fetchMultipleGates();

// 統計每個登機門的航班數
allGates.forEach(gateData => {
  console.log(`${gateData.gate}: ${gateData.summary.totalCount} 班`);
});

// 找出航班最多的登機門
const busiestGate = allGates.reduce((max, gate) => 
  gate.summary.totalCount > max.summary.totalCount ? gate : max
);
console.log(`最繁忙的登機門: ${busiestGate.gate} (${busiestGate.summary.totalCount} 班)`);
```

### 範例 3：匯出為 JSON 檔案

```javascript
// 獲取資料
const data = await _fetchMultipleGates();

// 轉換為 JSON 字串
const json = JSON.stringify(data, null, 2);

// 建立下載連結
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `flight-data-${new Date().toISOString().split('T')[0]}.json`;
a.click();
```

## 注意事項

1. **請求頻率**：批量獲取時，腳本會在每個請求之間延遲 500ms，避免對伺服器造成負擔
2. **資料時效性**：提取的資料是頁面載入時的資料，不會自動更新
3. **網路連線**：批量獲取需要穩定的網路連線
4. **瀏覽器限制**：某些瀏覽器可能會限制同時發起的請求數量

## 疑難排解

### 問題 1：面板沒有顯示

- 確認 Tampermonkey 已啟用
- 確認腳本已正確安裝
- 重新載入頁面

### 問題 2：無法提取資料

- 確認頁面已完全載入
- 檢查 Console 是否有錯誤訊息
- 確認頁面 URL 符合匹配規則

### 問題 3：批量獲取失敗

- 檢查網路連線
- 確認網站可以正常訪問
- 嘗試減少同時獲取的登機門數量

## 進階功能

### 自訂提取邏輯

如果需要自訂資料提取邏輯，可以修改腳本中的 `extractTableData` 函數。

### 整合到其他系統

提取的 JSON 資料可以直接用於：

- 資料庫儲存
- API 整合
- 資料分析工具
- 自動化系統

## 相關文件

- [API 分析指南](./API_ANALYSIS_GUIDE.md)
- [Tampermonkey 設置指南](./TAMPERMONKEY_SETUP_GUIDE.md)
