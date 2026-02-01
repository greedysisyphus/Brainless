# 桃園機場 D11-D18 登機門航班資料爬蟲

這個專案提供兩種方式來抓取桃園機場 D11-D18 登機門的航班資料：
1. Python 爬蟲腳本
2. Node.js API 服務

## 方法一：Python 爬蟲腳本

### 安裝依賴

```bash
pip install -r requirements.txt
```

### 使用方法

#### 1. 獲取單個登機門的資料

```python
from flight_scraper import TaoyuanAirportFlightScraper

scraper = TaoyuanAirportFlightScraper()

# 獲取 D11 登機門的資料
data = scraper.get_flight_data('D11')
print(data)

# 儲存為 JSON
scraper.save_to_json(data)
```

#### 2. 獲取所有登機門的資料

```python
# 獲取 D11-D18 所有登機門的資料
all_data = scraper.get_all_gates()

# 儲存為 JSON
scraper.save_all_to_json(all_data)
```

#### 3. 直接執行腳本

```bash
python flight-scraper.py
```

### 資料結構

```json
{
  "timestamp": "2026-02-01T12:00:00",
  "gate": "D11",
  "url": "https://yuann.tw/...",
  "departure": {
    "type": "departure",
    "headers": ["出發時間/實際出發", "航班代號", ...],
    "data": [
      {
        "type": "departure",
        "time": "2/1 17:10",
        "flight_code": "JX791",
        "airline": "星宇",
        "terminal": "T2-9",
        "gate": "D11",
        "city": "菲律賓克拉克",
        "airport_code": "CRK",
        "status": "準時ON TIME"
      }
    ]
  },
  "arrival": { ... },
  "summary": {
    "departure_count": 58,
    "arrival_count": 49,
    "total_count": 107
  }
}
```

## 方法二：Node.js API 服務

### 安裝依賴

```bash
npm install
```

### 啟動服務

```bash
npm start
```

或使用開發模式（自動重啟）：

```bash
npm run dev
```

### API 端點

#### 1. 獲取指定登機門的資料

```bash
# 方法 1: 使用 Query Parameter
curl http://localhost:3000/api/flights?gate=D11

# 方法 2: 使用 Path Parameter
curl http://localhost:3000/api/flights/D11
```

#### 2. 獲取所有登機門的資料

```bash
# 獲取所有登機門 (D11-D18)
curl http://localhost:3000/api/flights/all

# 獲取預設頁面（今天和昨天的所有登機門）
curl http://localhost:3000/api/flights
```

#### 3. 健康檢查

```bash
curl http://localhost:3000/api/health
```

### 前端使用範例

#### JavaScript (Fetch API)

```javascript
// 獲取 D11 登機門的資料
fetch('http://localhost:3000/api/flights/D11')
  .then(response => response.json())
  .then(data => {
    console.log('出發航班:', data.departure.data);
    console.log('抵達航班:', data.arrival.data);
  });

// 獲取所有登機門的資料
fetch('http://localhost:3000/api/flights/all')
  .then(response => response.json())
  .then(data => {
    console.log('總航班數:', data.summary.totalDepartures + data.summary.totalArrivals);
    data.gates.forEach(gateData => {
      console.log(`${gateData.gate}: ${gateData.summary.totalCount} 班`);
    });
  });
```

#### React 範例

```jsx
import { useState, useEffect } from 'react';

function FlightData({ gate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:3000/api/flights/${gate}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [gate]);

  if (loading) return <div>載入中...</div>;
  if (!data) return <div>無法載入資料</div>;

  return (
    <div>
      <h2>登機門 {data.gate}</h2>
      <p>出發航班: {data.summary.departureCount} 班</p>
      <p>抵達航班: {data.summary.arrivalCount} 班</p>
      
      <h3>出發航班</h3>
      <table>
        <thead>
          <tr>
            {data.departure.headers.map(h => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.departure.data.map((flight, i) => (
            <tr key={i}>
              <td>{flight.time}</td>
              <td>{flight.flight_code}</td>
              <td>{flight.airline}</td>
              <td>{flight.gate}</td>
              <td>{flight.city} ({flight.airport_code})</td>
              <td>{flight.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## 注意事項

1. **請求頻率**: 腳本已經內建延遲機制（預設 0.5 秒），避免對目標網站造成負擔
2. **錯誤處理**: 如果請求失敗，會返回包含錯誤訊息的物件
3. **資料格式**: 所有時間戳記使用 ISO 8601 格式
4. **快取**: Node.js API 服務有內建快取機制（15 分鐘），減少不必要的請求

## 環境變數

Node.js API 服務支援以下環境變數：

- `PORT`: 服務端口（預設: 3000）

```bash
PORT=8080 npm start
```

## 授權

MIT License

## 免責聲明

此工具僅供學習和研究使用。請遵守目標網站的服務條款和 robots.txt 規則。
