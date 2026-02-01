# 測試頁面說明

## 檔案

- `test-flight-data.html` - 航班資料測試頁面

## 使用方式

### 本地測試

1. 確保 `data/` 目錄中有 JSON 檔案
2. 使用本地伺服器開啟（避免 CORS 問題）：

```bash
# 使用 Python
python3 -m http.server 8000

# 或使用 Node.js
npx http-server
```

3. 在瀏覽器中訪問：`http://localhost:8000/playground/test-flight-data.html`

### GitHub Pages 部署

1. 將 `playground/test-flight-data.html` 推送到 GitHub
2. 確保 `data/` 目錄中的 JSON 檔案也在 GitHub 上
3. 在 GitHub Pages 設定中啟用靜態網站
4. 訪問：`https://your-username.github.io/repo-name/playground/test-flight-data.html`

## 功能

- ✅ 選擇日期載入航班資料
- ✅ 顯示統計資訊（總航班數、17:00 前後）
- ✅ 顯示航班列表（時間、登機門、航班代碼、目的地等）
- ✅ 顯示共同航班資訊
- ✅ 響應式設計（支援手機和桌面）

## 資料格式

頁面會讀取 `data/flight-data-YYYY-MM-DD.json` 格式的檔案。

## 注意事項

- 如果資料檔案不存在，會顯示錯誤訊息
- 路徑會根據是否在 `playground` 目錄自動調整
- 需要 CORS 支援（本地測試建議使用 HTTP 伺服器）
