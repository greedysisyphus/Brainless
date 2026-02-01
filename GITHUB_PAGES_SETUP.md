# GitHub Pages 部署完整指南

這個方案使用 **GitHub Actions** 自動爬取資料並更新 JSON 檔案，前端直接讀取這些檔案顯示。

## 🎯 方案架構

```
GitHub Actions (每 30 分鐘自動執行)
    ↓
Python 爬蟲抓取 yuann.tw 資料
    ↓
更新 data/*.json 檔案
    ↓
GitHub Pages 前端讀取 JSON 顯示
```

## 📋 設定步驟

### 步驟 1: 確認檔案結構

確保以下檔案都在倉庫中：

```
your-repo/
├── .github/
│   └── workflows/
│       └── update-flight-data.yml    ✅ GitHub Actions 設定
├── scripts/
│   ├── scraper/
│   │   ├── flight_scraper.py        ✅ 爬蟲腳本
│   │   ├── requirements.txt         ✅ Python 依賴
│   │   └── quick-test.py           ✅ 測試腳本
│   ├── flight-data-reader.js        ✅ 前端資料讀取器
│   └── flight-display.html          ✅ 範例顯示頁面
└── data/
    └── .gitkeep                     ✅ 資料目錄（自動生成）
```

### 步驟 2: 本地測試（可選）

如果你想在本地先測試：

```bash
# 1. 進入爬蟲目錄
cd scripts/scraper

# 2. 建立虛擬環境（推薦）
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或 venv\Scripts\activate  # Windows

# 3. 安裝依賴
pip install -r requirements.txt

# 4. 執行測試
python3 quick-test.py
```

如果測試成功，會看到：
```
✅ 成功獲取資料！
   - 登機門: D11
   - 出發航班: XX 班
   - 抵達航班: XX 班
```

### 步驟 3: 推送到 GitHub

將所有檔案推送到 GitHub：

```bash
git add .
git commit -m "Add flight data scraper and GitHub Pages setup"
git push
```

### 步驟 4: 啟用 GitHub Actions

1. 前往 GitHub 倉庫
2. 點擊 **Actions** 標籤
3. 如果看到 "Update Flight Data" workflow，點擊啟用
4. 點擊 **Run workflow** 手動觸發第一次執行

### 步驟 5: 啟用 GitHub Pages

1. 前往 GitHub 倉庫的 **Settings**
2. 左側選單選擇 **Pages**
3. 在 **Source** 選擇：
   - Branch: `main` (或你的主要分支)
   - Folder: `/ (root)`
4. 點擊 **Save**

### 步驟 6: 設定前端頁面

有兩種方式：

#### 方式 A: 使用範例頁面

將 `scripts/flight-display.html` 複製到根目錄並重新命名為 `index.html`：

```bash
cp scripts/flight-display.html index.html
git add index.html
git commit -m "Add index page"
git push
```

#### 方式 B: 整合到現有頁面

在你的 HTML 中加入：

```html
<script src="scripts/flight-data-reader.js"></script>
<script>
  const reader = new FlightDataReader('./data');
  
  // 獲取 D11 登機門的資料
  reader.getGateData('D11').then(data => {
    console.log('出發航班:', data.departure.data);
    console.log('抵達航班:', data.arrival.data);
  });
</script>
```

## 🔄 自動更新機制

GitHub Actions 會：

1. **每 30 分鐘**自動執行一次（可在 workflow 檔案中修改）
2. 爬取所有登機門 (D11-D18) 的資料
3. 更新 `data/` 目錄中的 JSON 檔案：
   - `flight-data-all.json` - 所有登機門的資料
   - `flight-data-D11.json` - D11 登機門的資料
   - `flight-data-D12.json` - D12 登機門的資料
   - ... (其他登機門)
   - `flight-data-summary.json` - 摘要資訊

## 📊 資料格式

### 按日期分組的資料 (`flight-data-2026-02-01.json`)

每個日期的 JSON 檔案包含：

```json
{
  "date": "2026-02-01",
  "last_updated": "2026-02-01T12:00:00",
  "flights": [
    {
      "time": "17:10",
      "datetime": "2026-02-01T17:10:00",
      "gate": "D11",
      "flight_code": "JX791",
      "airline": "星宇",
      "type": "departure",
      "destination": "菲律賓克拉克 (CRK)",
      "status": "準時ON TIME"
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

**輸出格式說明**：
1. **時間：Gate : 航班**（以時間排序）
   - 所有航班按時間順序排列
   - 格式：`17:10 : D11 : JX791 (星宇)`
2. **17:00 pm 前的班次總數量**
   - 統計該日期所有 17:00 前的航班數
3. **17:00 pm 後的班機總數量**
   - 統計該日期所有 17:00 後的航班數

### 舊格式（已廢棄）：單個登機門資料 (`flight-data-D11.json`)

```json
{
  "timestamp": "2026-02-01T12:00:00",
  "gate": "D11",
  "departure": {
    "type": "departure",
    "headers": ["出發時間/實際出發", "航班代號", ...],
    "data": [
      {
        "time": "2/1 17:10",
        "flight_code": "JX791",
        "airline": "星宇",
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

### 所有登機門資料 (`flight-data-all.json`)

```json
[
  { "gate": "D11", "departure": {...}, "arrival": {...} },
  { "gate": "D12", "departure": {...}, "arrival": {...} },
  ...
]
```

## 🛠️ 自訂設定

### 修改更新頻率

編輯 `.github/workflows/update-flight-data.yml`：

```yaml
schedule:
  - cron: '*/30 * * * *'  # 每 30 分鐘
  # 其他選項：
  # '*/15 * * * *'  # 每 15 分鐘
  # '0 * * * *'     # 每小時
```

### 修改資料路徑

如果資料儲存在其他位置，修改 `FlightDataReader`：

```javascript
const reader = new FlightDataReader('/your/custom/path/data');
```

## ✅ 驗證清單

部署完成後，確認：

- [ ] GitHub Actions workflow 已啟用
- [ ] 手動觸發一次 workflow 成功執行
- [ ] `data/` 目錄中有 JSON 檔案生成
- [ ] GitHub Pages 已啟用並可以訪問
- [ ] 前端頁面可以正常讀取資料
- [ ] 資料會自動更新（等待 30 分鐘後檢查）

## 🐛 疑難排解

### GitHub Actions 執行失敗

1. 檢查 Actions 標籤中的錯誤訊息
2. 確認 `scripts/scraper/flight_scraper.py` 檔案存在
3. 確認 `requirements.txt` 中的依賴都正確

### 前端無法讀取資料

1. 確認 `data/` 目錄中有 JSON 檔案
2. 檢查瀏覽器 Console 的錯誤訊息
3. 確認路徑是否正確（GitHub Pages 的基礎路徑）

### 資料沒有自動更新

1. 檢查 GitHub Actions 是否正常執行
2. 確認 workflow 檔案中的 cron 設定是否正確
3. 可以手動觸發 workflow 來測試

## 📝 注意事項

1. **首次執行**: 需要手動觸發一次 GitHub Actions 來生成初始資料
2. **資料更新**: GitHub Actions 會自動更新 `data/` 目錄中的 JSON 檔案
3. **CORS**: GitHub Pages 上的 JSON 檔案可以直接被前端讀取，無需擔心 CORS 問題
4. **快取**: 瀏覽器可能會快取 JSON 檔案，可以考慮在檔名中加入版本號

## 🎉 完成！

設定完成後，你的 GitHub Pages 網站會：
- ✅ 自動每 30 分鐘更新一次航班資料
- ✅ 前端可以直接讀取最新的資料
- ✅ 無需手動維護，完全自動化

訪問你的 GitHub Pages URL 即可看到最新的航班資訊！
