# 桃園機場官方網站資料獲取指南

## 概述

本指南說明如何直接從桃園機場官方網站（https://www.taoyuan-airport.com）獲取航班資料，而不需要從 yuann.tw 爬取。

## 官方網站結構

### URL 格式

- **出發航班**: `https://www.taoyuan-airport.com/flight_depart?k=&time=14:00-15:59`
- **抵達航班**: `https://www.taoyuan-airport.com/flight_arrive?k=&time=14:00-15:59`

### 查詢參數

- `k`: 關鍵字搜尋（可用於搜尋登機門，如 `D11`）
- `time`: 時間範圍（格式：`HH:MM-HH:MM`）

## 使用方式

### 方法 1: 使用 Python 爬蟲腳本（推薦）

已建立 `scripts/scraper/taoyuan_airport_official_scraper.py` 腳本，可以直接從官方網站獲取資料。

#### 安裝依賴

```bash
cd scripts/scraper
pip3 install requests beautifulsoup4 lxml
```

#### 執行腳本

```bash
python3 taoyuan_airport_official_scraper.py
```

腳本會：
1. 自動檢查是否有公開的 API 端點
2. 獲取 D11-D18 所有登機門的資料
3. 按日期組織資料
4. 儲存為 JSON 檔案到 `data/` 目錄

### 方法 2: 使用瀏覽器分析腳本

已建立 `scripts/analyze-taoyuan-airport-api.js` 腳本，可以在瀏覽器 Console 中執行來分析官方網站的 API 結構。

#### 使用步驟

1. 打開桃園機場官方網站：https://www.taoyuan-airport.com/flight_depart
2. 打開開發者工具（F12）
3. 切換到 Console 標籤
4. 複製並執行 `scripts/analyze-taoyuan-airport-api.js` 的內容
5. 觀察 Console 輸出，查看是否有 API 請求

## API 端點檢查

腳本會自動檢查以下可能的 API 端點：

- `/api/flight`
- `/api/flights`
- `/api/depart`
- `/api/departure`
- `/api/arrive`
- `/api/arrival`
- `/api/gate`
- `/flight/api`
- `/api/v1/flight`
- `/rest/flight`

如果找到公開的 API 端點，腳本會顯示出來。

## 資料格式

### 輸出格式

每個日期一個 JSON 檔案，格式如下：

```json
{
  "date": "2026-02-01",
  "flights": [
    {
      "time": "17:10",
      "datetime": "2026-02-01T17:10:00",
      "gate": "D11",
      "flight_code": "JX791",
      "airline": "星宇",
      "type": "departure",
      "destination": "東京 (NRT)",
      "status": "準時"
    }
  ],
  "summary": {
    "total_flights": 150,
    "before_17:00": 80,
    "after_17:00": 70
  },
  "formatted_display": [
    "17:10 : D11 : JX791 (星宇)",
    "17:45 : D12 : CI101 (華航)",
    ...
  ]
}
```

## 與 yuann.tw 方案的比較

### 優點

1. **直接從官方來源獲取**：資料來源更可靠
2. **不需要爬取第三方網站**：減少法律風險
3. **官方網站更新頻率可能更高**：資料更即時

### 注意事項

1. **網站結構可能變更**：官方網站可能會更新 HTML 結構，需要定期維護腳本
2. **可能需要處理反爬蟲機制**：官方網站可能有反爬蟲保護
3. **資料格式可能不同**：需要調整解析邏輯

## 整合到 GitHub Pages

使用方式與之前的 `fetch-by-date.py` 相同：

1. 更新 `.github/workflows/update-flight-data.yml` 使用新的腳本
2. 或直接替換 `fetch-by-date.py` 為 `taoyuan_airport_official_scraper.py`

## 測試

執行測試腳本：

```bash
python3 scripts/scraper/taoyuan_airport_official_scraper.py
```

檢查輸出：
- 是否成功獲取資料
- JSON 檔案格式是否正確
- 日期分組是否正確
- 17:00 前後統計是否正確

## 疑難排解

### 問題：無法獲取資料

**可能原因**：
- 網站結構已變更
- 需要登入或驗證
- 反爬蟲機制阻擋

**解決方法**：
1. 檢查網站 HTML 結構是否變更
2. 更新 `_extract_table_data` 方法
3. 調整 User-Agent 和請求頭

### 問題：資料格式不正確

**可能原因**：
- 表格欄位名稱不同
- 資料結構變更

**解決方法**：
1. 檢查實際的 HTML 結構
2. 更新 `_normalize_flight_data` 方法
3. 調整欄位對應邏輯

## 其他資料來源選項

如果官方網站無法使用，可以考慮：

1. **台中國際機場 API**：提供 JSON 格式的即時航班資料
2. **民航局官方資料**：提供定期航線班機時刻表
3. **第三方航班資料服務**：FlightRadar24、FlightAware 等

詳細資訊請參考其他文件。
