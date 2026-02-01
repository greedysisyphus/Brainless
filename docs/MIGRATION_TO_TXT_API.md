# 遷移到桃園機場官方文字檔 API

## 概述

已成功將資料獲取方式從 HTML 爬蟲改為使用桃園機場官方提供的文字檔 API。

## 新的資料來源

**API URL**: `https://www.taoyuan-airport.com/uploads/flightx/a_flight_v4.txt`

這是一個 CSV 格式的文字檔，包含所有航班的完整資料。

## 已完成的更改

### 1. 建立新的爬蟲腳本

**檔案**: `scripts/scraper/fetch-from-txt-api.py`

**功能**:
- 直接下載官方文字檔
- 自動處理 SSL 證書驗證問題
- 自動嘗試多種編碼（Big5, UTF-8 等）
- 解析 CSV 格式資料
- 過濾 D11-D18 登機門
- 按日期組織資料
- 計算 17:00 前後統計
- 輸出與之前相同格式的 JSON

### 2. 更新 GitHub Actions

**檔案**: `.github/workflows/update-flight-data.yml`

已更新為使用新的 `fetch-from-txt-api.py` 腳本。

### 3. 建立使用文件

**檔案**: `docs/TXT_API_GUIDE.md`

包含完整的使用說明和疑難排解指南。

## 優點

相比之前的 HTML 爬蟲方案：

1. ✅ **更快速**：直接下載文字檔，無需解析 HTML
2. ✅ **更穩定**：文字檔格式相對固定，不易受網頁結構變更影響
3. ✅ **更完整**：包含所有航班資料，無需多次請求
4. ✅ **更可靠**：官方提供的資料來源
5. ✅ **更簡單**：無需處理複雜的 HTML 結構

## 資料格式

輸出格式與之前完全相同，確保前端代碼無需修改：

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
      "airline_name": "星宇航空",
      "type": "departure",
      "destination": "東京 (NRT)",
      "status": "準時ON TIME",
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
    "17:10 : D11 : JX791 (星宇航空)",
    "17:45 : D12 : CI101 (中華航空)",
    ...
  ]
}
```

## 測試結果

✅ 成功下載資料（511,641 字元）
✅ 成功解析 180 筆 D11-D18 航班資料
✅ 正確按日期分組（2 個日期檔案）
✅ 正確計算 17:00 前後統計
✅ JSON 格式正確

## 使用方式

### 本地測試

```bash
cd scripts/scraper
python3 fetch-from-txt-api.py
```

### GitHub Actions

已自動設定，每 30 分鐘執行一次。

## 注意事項

### SSL 證書驗證

某些環境可能會遇到 SSL 證書驗證失敗的問題。腳本會自動處理：
- 首先嘗試正常驗證
- 如果失敗，會自動禁用驗證（僅用於獲取資料）

### 編碼問題

文字檔可能使用 Big5 或 UTF-8 編碼。腳本會自動嘗試多種編碼方式。

### 資料更新頻率

文字檔的更新頻率取決於桃園機場官方。目前設定為每 30 分鐘檢查一次。

## 舊檔案

以下檔案已不再使用，但保留作為備份：

- `scripts/scraper/fetch-by-date.py` - 舊的 HTML 爬蟲腳本
- `scripts/scraper/flight_scraper.py` - 基礎爬蟲類別
- `scripts/scraper/taoyuan_airport_official_scraper.py` - 官方網站 HTML 爬蟲

## 下一步

1. ✅ 測試腳本功能
2. ✅ 更新 GitHub Actions
3. ✅ 建立使用文件
4. ⏳ 監控 GitHub Actions 執行情況
5. ⏳ 確認資料更新正常

## 相關文件

- [文字檔 API 使用指南](./TXT_API_GUIDE.md)
- [GitHub Pages 設定指南](./GITHUB_PAGES_SETUP.md)
