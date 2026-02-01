# 桃園機場官方文字檔 API 使用指南

## 概述

桃園機場官方網站提供了一個文字檔 API，可以直接獲取所有航班資料，無需爬取 HTML 頁面。

**API URL**: `https://www.taoyuan-airport.com/uploads/flightx/a_flight_v4.txt`

## 資料格式

文字檔為 CSV 格式，每行代表一筆航班資料，欄位以逗號分隔：

```
航廈,類型,航空公司代碼,航空公司名稱,航班號,登機門,預定日期,預定時間,實際日期,實際時間,機場代碼,城市,狀態,機型,...
```

### 欄位說明

- **欄位 1**: 航廈（1 或 2）
- **欄位 2**: 類型（A=抵達, D=出發）
- **欄位 3**: 航空公司代碼（如 JX, CI, BR）
- **欄位 4**: 航空公司名稱
- **欄位 5**: 航班號
- **欄位 6**: 登機門（如 D11, D12, ...）
- **欄位 7**: 預定日期（格式：2026/01/31）
- **欄位 8**: 預定時間（格式：00:05:00）
- **欄位 9**: 實際日期
- **欄位 10**: 實際時間
- **欄位 11**: 機場代碼（如 NRT, LAX, SFO）
- **欄位 12**: 城市名稱
- **欄位 13**: 狀態（如 ARRIVED, ON TIME）
- **欄位 14**: 機型（如 B737-800, A350-900）

## 使用方式

### 方法 1: 使用 Python 腳本（推薦）

已建立 `scripts/scraper/fetch-from-txt-api.py` 腳本，可以直接使用：

```bash
cd scripts/scraper
python3 fetch-from-txt-api.py
```

腳本會：
1. 自動下載文字檔
2. 解析並過濾 D11-D18 登機門的資料
3. 按日期組織資料
4. 儲存為 JSON 檔案到 `data/` 目錄

### 方法 2: 直接下載文字檔

```bash
curl -k "https://www.taoyuan-airport.com/uploads/flightx/a_flight_v4.txt" -o flight-data.txt
```

注意：使用 `-k` 參數是因為某些環境可能有 SSL 證書驗證問題。

## 輸出格式

每個日期一個 JSON 檔案，格式與之前的 `fetch-by-date.py` 相同：

```json
{
  "date": "2026-02-01",
  "flights": [
    {
      "time": "17:10",
      "datetime": "2026-02-01T17:10:00",
      "gate": "D11",
      "flight_code": "JX791",
      "airline_code": "JX",
      "airline_name": "星宇",
      "type": "departure",
      "destination": "東京 (NRT)",
      "status": "ON TIME",
      "aircraft": "A350-900",
      "terminal": "2"
    }
  ],
  "summary": {
    "total_flights": 102,
    "before_17:00": 69,
    "after_17:00": 33
  },
  "formatted_display": [
    "17:10 : D11 : JX791 (星宇)",
    "17:45 : D12 : CI101 (華航)",
    ...
  ]
}
```

## 優點

相比爬取 HTML 頁面：

1. **更快速**：直接下載文字檔，無需解析 HTML
2. **更穩定**：文字檔格式相對固定，不易受網頁結構變更影響
3. **更完整**：包含所有航班資料，無需多次請求
4. **更可靠**：官方提供的資料來源

## 注意事項

### SSL 證書驗證

某些環境可能會遇到 SSL 證書驗證失敗的問題。腳本會自動處理：
- 首先嘗試正常驗證
- 如果失敗，會自動禁用驗證（僅用於獲取資料）

### 編碼問題

文字檔可能使用 Big5 或 UTF-8 編碼。腳本會自動嘗試多種編碼方式：
1. Big5（台灣常用編碼）
2. UTF-8
3. UTF-8 with BOM
4. Latin1（備用）

### 資料更新頻率

文字檔的更新頻率取決於桃園機場官方。建議：
- 每 30 分鐘檢查一次（已設定在 GitHub Actions）
- 或根據實際需求調整更新頻率

## 整合到 GitHub Actions

已更新 `.github/workflows/update-flight-data.yml` 使用新的腳本：

```yaml
- name: Run scraper
  run: |
    cd scripts/scraper
    python3 fetch-from-txt-api.py
```

## 測試

執行測試：

```bash
cd scripts/scraper
python3 fetch-from-txt-api.py
```

檢查輸出：
- ✅ 是否成功下載資料
- ✅ 是否正確解析 D11-D18 的資料
- ✅ JSON 檔案格式是否正確
- ✅ 日期分組是否正確
- ✅ 17:00 前後統計是否正確

## 疑難排解

### 問題：SSL 證書驗證失敗

**解決方法**：腳本會自動處理，無需手動操作。

### 問題：編碼錯誤

**解決方法**：腳本會自動嘗試多種編碼，如果仍有問題，請檢查文字檔的實際編碼。

### 問題：找不到 D11-D18 的資料

**可能原因**：
- 登機門代號格式不同（如 "D 11" 而非 "D11"）
- 資料格式已變更

**解決方法**：
1. 檢查文字檔中實際的登機門格式
2. 更新腳本中的 `target_gates` 列表

## 與其他方案的比較

| 方案 | 優點 | 缺點 |
|------|------|------|
| **文字檔 API** | 快速、穩定、完整 | 需要解析 CSV |
| HTML 爬蟲 | 靈活 | 易受結構變更影響 |
| 第三方 API | 功能豐富 | 可能需要付費或 API Key |

**建議**：優先使用文字檔 API，這是最穩定且可靠的方案。
