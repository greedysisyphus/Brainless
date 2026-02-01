# 桃園機場 D11-D18 航班資料 API 文檔

## 概述

本 API 提供桃園機場 D11-D18 登機門的離境航班資料，可直接用於 iOS Shortcut、其他應用程式或網頁。

## API 端點

### 直接使用 JSON 檔案（推薦）

**URL 格式：**
```
https://greedysisyphus.github.io/Brainless/data/flight-data-YYYY-MM-DD.json
```

**範例：**
```
https://greedysisyphus.github.io/Brainless/data/flight-data-2026-02-01.json
```

**請求方法：** `GET`

**回應格式：** `application/json`

## 回應資料結構

```json
{
  "date": "2026-02-01",
  "flights": [
    {
      "time": "06:30",
      "datetime": "2026-02-01T06:30:00",
      "gate": "D16",
      "flight_code": "BR178",
      "airline_code": "BR",
      "airline_name": "長榮航空",
      "type": "departure",
      "airport_code": "KIX",
      "city": "Osaka Kansai",
      "status": "出發DEPARTED",
      "aircraft": "B787-10",
      "terminal": "2",
      "destination": "Osaka Kansai (KIX)",
      "codeshare_flights": [
        {
          "flight_code": "NH5834",
          "airline_code": "NH",
          "airline_name": "全日本空輸"
        }
      ]
    }
  ],
  "summary": {
    "total_flights": 50,
    "before_17:00": 30,
    "after_17:00": 20
  },
  "formatted_display": [
    "06:30 : D16 : BR178 (長榮航空)",
    "06:50 : D11 : JX761 (星宇航空)"
  ]
}
```

## 欄位說明

### 主要欄位

- `date`: 日期（格式：YYYY-MM-DD）
- `flights`: 航班陣列
- `summary`: 統計摘要
- `formatted_display`: 格式化顯示字串陣列

### 航班物件欄位

- `time`: 時間（格式：HH:MM）
- `datetime`: ISO 格式日期時間
- `gate`: 登機門（D11-D18 或 D11R-D18R）
- `flight_code`: 航班代碼（例如：BR178）
- `airline_code`: 航空公司代碼（例如：BR）
- `airline_name`: 航空公司名稱
- `status`: 航班狀態（例如：出發DEPARTED、登機中、延誤等）
- `destination`: 目的地（城市和機場代碼）
- `codeshare_flights`: 共同航班陣列（如果有的話）

### 統計摘要欄位

- `total_flights`: 總航班數
- `before_17:00`: 17:00 前的航班數
- `after_17:00`: 17:00 後的航班數

## iOS Shortcut 使用範例

### 方法 1：直接使用 JSON URL

1. 在 Shortcut 中新增「取得網頁內容」動作
2. URL 輸入：`https://greedysisyphus.github.io/Brainless/data/flight-data-2026-02-01.json`
3. 方法選擇：`GET`
4. 新增「取得 JSON 字典值」動作來解析資料
5. 使用「取得字典值」來取得特定欄位

### 方法 2：動態日期

1. 使用「取得目前日期」動作
2. 使用「格式化日期」將日期格式化為 `YYYY-MM-DD`
3. 使用「文字」動作組合 URL：`https://greedysisyphus.github.io/Brainless/data/flight-data-{日期}.json`
4. 使用「取得網頁內容」取得資料
5. 解析 JSON 並使用資料

### 範例 Shortcut 流程

```
1. 取得目前日期
2. 格式化日期 → YYYY-MM-DD
3. 文字 → https://greedysisyphus.github.io/Brainless/data/flight-data-{格式化日期}.json
4. 取得網頁內容（URL：文字結果）
5. 取得 JSON 字典值（輸入：網頁內容）
6. 取得字典值（鍵：summary）
7. 取得字典值（鍵：total_flights）
8. 顯示通知（內容：總航班數）
```

## 錯誤處理

如果指定的日期沒有資料，API 會返回 404 錯誤。

**錯誤回應範例：**
```json
{
  "error": "找不到 2026-02-01 的航班資料"
}
```

## 資料更新頻率

- 資料每 30 分鐘自動更新一次
- 透過 GitHub Actions 自動抓取桃園機場官方資料
- 資料涵蓋未來 1-3 天的航班（視機場排程而定）

## CORS 政策

本 API 支援跨域請求（CORS），可直接從任何網頁或應用程式使用。

## 使用限制

- 無需 API Key
- 無請求頻率限制
- 資料僅供參考，請以機場官方公告為準

## 範例程式碼

### JavaScript (Fetch API)

```javascript
const date = '2026-02-01';
const url = `https://greedysisyphus.github.io/Brainless/data/flight-data-${date}.json`;

fetch(url)
  .then(response => response.json())
  .then(data => {
    console.log('總航班數:', data.summary.total_flights);
    console.log('航班列表:', data.flights);
  })
  .catch(error => {
    console.error('錯誤:', error);
  });
```

### Python

```python
import requests
import json

date = '2026-02-01'
url = f'https://greedysisyphus.github.io/Brainless/data/flight-data-{date}.json'

response = requests.get(url)
data = response.json()

print(f"總航班數: {data['summary']['total_flights']}")
print(f"航班列表: {data['flights']}")
```

### cURL

```bash
curl https://greedysisyphus.github.io/Brainless/data/flight-data-2026-02-01.json
```

## 聯絡與支援

如有問題或建議，請透過 GitHub Issues 回報。
