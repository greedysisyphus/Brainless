# GitHub Pages 部署指南

這個方案使用 **GitHub Actions** 定期執行爬蟲，將資料儲存為 JSON 檔案，然後前端直接讀取這些檔案。

## 架構說明

```
GitHub Actions (每 30 分鐘)
    ↓
執行 Python 爬蟲
    ↓
更新 data/*.json 檔案
    ↓
GitHub Pages 前端讀取 JSON
```

## 設定步驟

### 1. 測試爬蟲功能

首先在本地測試爬蟲是否正常運作：

```bash
cd scripts/scraper

# 安裝依賴（如果還沒安裝）
pip3 install requests beautifulsoup4 lxml

# 執行測試
python3 -c "
import sys
sys.path.insert(0, '.')
from flight_scraper import TaoyuanAirportFlightScraper

scraper = TaoyuanAirportFlightScraper()
data = scraper.get_flight_data('D11')
print('✅ 測試成功！')
print(f'   出發航班: {data[\"summary\"][\"departure_count\"]} 班')
print(f'   抵達航班: {data[\"summary\"][\"arrival_count\"]} 班')
"
```

### 2. 設定 GitHub Actions

1. 將 `.github/workflows/update-flight-data.yml` 加入倉庫
2. 確保 `scripts/scraper/` 目錄和檔案都在倉庫中
3. GitHub Actions 會自動執行（每 30 分鐘一次）

### 3. 設定 GitHub Pages

1. 前往 GitHub 倉庫設定
2. 進入 Settings → Pages
3. 選擇 Source: `Deploy from a branch`
4. 選擇 Branch: `main` (或你的主要分支)
5. 選擇 Folder: `/ (root)`

### 4. 部署前端頁面

將以下檔案加入倉庫根目錄或適當位置：

- `scripts/flight-data-reader.js` - 資料讀取器
- `scripts/flight-display.html` - 顯示頁面（可重新命名為 `index.html`）

### 5. 手動觸發第一次更新

1. 前往 GitHub 倉庫的 Actions 標籤
2. 選擇 "Update Flight Data" workflow
3. 點擊 "Run workflow" 手動觸發

## 檔案結構

```
your-repo/
├── .github/
│   └── workflows/
│       └── update-flight-data.yml    # GitHub Actions 設定
├── scripts/
│   ├── scraper/
│   │   ├── flight-scraper.py         # 爬蟲腳本
│   │   ├── requirements.txt          # Python 依賴
│   │   └── test-scraper.py          # 測試腳本
│   ├── flight-data-reader.js         # 前端資料讀取器
│   └── flight-display.html          # 前端顯示頁面
├── data/                              # 資料目錄（自動生成）
│   ├── flight-data-all.json          # 所有登機門的資料
│   ├── flight-data-D11.json          # D11 登機門的資料
│   ├── flight-data-D12.json          # D12 登機門的資料
│   ├── ...                           # 其他登機門
│   └── flight-data-summary.json      # 摘要資訊
└── index.html                         # 你的主頁面（可選）
```

## 使用方式

### 前端讀取資料

在你的 HTML 頁面中：

```html
<!DOCTYPE html>
<html>
<head>
  <script src="scripts/flight-data-reader.js"></script>
</head>
<body>
  <script>
    const reader = new FlightDataReader('./data');
    
    // 獲取 D11 登機門的資料
    reader.getGateData('D11').then(data => {
      console.log('出發航班:', data.departure.data);
      console.log('抵達航班:', data.arrival.data);
    });
    
    // 獲取所有登機門的資料
    reader.getAllGatesData().then(allData => {
      console.log('所有登機門資料:', allData);
    });
  </script>
</body>
</html>
```

### 直接使用範例頁面

將 `scripts/flight-display.html` 複製到根目錄並重新命名為 `index.html`，即可直接使用。

## 自訂更新頻率

編輯 `.github/workflows/update-flight-data.yml`，修改 cron 設定：

```yaml
schedule:
  - cron: '*/30 * * * *'  # 每 30 分鐘
  # 其他選項：
  # '*/15 * * * *'  # 每 15 分鐘
  # '0 * * * *'     # 每小時
  # '0 */6 * * *'   # 每 6 小時
```

## 注意事項

1. **首次執行**: 需要手動觸發一次 GitHub Actions 來生成初始資料
2. **資料更新**: GitHub Actions 會自動更新 `data/` 目錄中的 JSON 檔案
3. **CORS**: GitHub Pages 上的 JSON 檔案可以直接被前端讀取，無需擔心 CORS 問題
4. **快取**: 瀏覽器可能會快取 JSON 檔案，可以考慮在檔名中加入版本號或時間戳

## 疑難排解

### GitHub Actions 執行失敗

1. 檢查 Actions 標籤中的錯誤訊息
2. 確認 `scripts/scraper/` 目錄和檔案都存在
3. 確認 `requirements.txt` 中的依賴都正確

### 前端無法讀取資料

1. 確認 `data/` 目錄中有 JSON 檔案
2. 檢查瀏覽器 Console 的錯誤訊息
3. 確認路徑是否正確（GitHub Pages 的基礎路徑）

### 資料沒有更新

1. 檢查 GitHub Actions 是否正常執行
2. 確認 workflow 檔案中的 cron 設定是否正確
3. 可以手動觸發 workflow 來測試

## 進階設定

### 使用自訂域名

如果使用自訂域名，需要調整 `FlightDataReader` 的 `basePath`：

```javascript
const reader = new FlightDataReader('https://your-domain.com/data');
```

### 加入快取控制

在 HTML 中加入 meta 標籤來控制快取：

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
```

## 測試清單

- [ ] 本地測試爬蟲功能正常
- [ ] GitHub Actions workflow 檔案已加入
- [ ] GitHub Pages 已啟用
- [ ] 手動觸發一次 workflow 成功
- [ ] `data/` 目錄中有 JSON 檔案生成
- [ ] 前端頁面可以正常讀取資料
- [ ] 自動排程正常執行
