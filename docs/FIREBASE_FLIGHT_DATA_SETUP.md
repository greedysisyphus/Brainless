# Firebase 航班資料存儲設置指南

## 概述

為了保留歷史航班資料供統計分析使用，系統會將每日的航班資料存儲到 Firebase Firestore。這樣即使 GitHub Pages 只保留最近 2 天的資料，統計分析功能仍可以讀取更多歷史資料。

## 設置步驟

### 1. 創建 Firebase 服務帳號

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案：`brainless-schedule`
3. 點擊左側選單的「專案設定」（齒輪圖標）
4. 切換到「服務帳號」標籤
5. 點擊「產生新的私密金鑰」
6. 下載 JSON 檔案（例如：`brainless-schedule-firebase-adminsdk-xxxxx.json`）

### 2. 設置 GitHub Secrets

在 GitHub 倉庫中設置以下 Secrets（Settings → Secrets and variables → Actions）：

1. **FIREBASE_PRIVATE_KEY_ID**
   - 從下載的 JSON 檔案中複製 `private_key_id` 的值

2. **FIREBASE_PRIVATE_KEY**
   - 從下載的 JSON 檔案中複製 `private_key` 的值
   - **重要**：需要保留換行符號，直接複製整個值（包含 `\n`）

3. **FIREBASE_CLIENT_EMAIL**
   - 從下載的 JSON 檔案中複製 `client_email` 的值

4. **FIREBASE_CLIENT_ID**
   - 從下載的 JSON 檔案中複製 `client_id` 的值

5. **FIREBASE_CLIENT_X509_CERT_URL**
   - 從下載的 JSON 檔案中複製 `client_x509_cert_url` 的值

### 3. 驗證設置

設置完成後，GitHub Actions 會在每次更新航班資料時自動將資料存儲到 Firebase。

## 資料結構

資料存儲在 Firestore 的 `flightData` 集合中，每個文檔的 ID 為日期（格式：`YYYY-MM-DD`）。

### 文檔結構

```json
{
  "date": "2026-02-01",
  "flights": [
    {
      "time": "06:50",
      "gate": "D13",
      "flight_code": "JX761",
      "airline_name": "星宇航空",
      "status": "出發DEPARTED",
      "codeshare_flights": []
    }
  ],
  "summary": {
    "total_flights": 45,
    "before_17:00": 30,
    "after_17:00": 15
  },
  "updated_at": "2026-02-01T12:00:00",
  "_stored_at": "2026-02-01T12:05:00"
}
```

## 前端讀取

前端會優先從 Firebase 讀取歷史資料，如果 Firebase 讀取失敗，會自動回退到 GitHub Pages 的 JSON 檔案。

## 注意事項

1. **Firebase 讀取權限**：確保 Firestore 規則允許讀取 `flightData` 集合
2. **存儲失敗處理**：如果 Firebase 存儲失敗，不會影響主要的資料更新流程（使用 `continue-on-error: true`）
3. **資料保留**：Firebase 會保留所有歷史資料，不會自動刪除舊資料

## 故障排除

### Firebase 存儲失敗

如果看到 "Firebase 初始化失敗" 的訊息：

1. 檢查 GitHub Secrets 是否正確設置
2. 確認 `FIREBASE_PRIVATE_KEY` 包含完整的私鑰（包括 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----`）
3. 確認服務帳號有 Firestore 寫入權限

### 前端無法讀取 Firebase 資料

1. 檢查 Firestore 規則是否允許讀取
2. 檢查瀏覽器控制台是否有錯誤訊息
3. 確認 Firebase 配置正確（`src/utils/firebase.js`）
