# iOS Shortcut 使用指南

## 快速開始

### 方法 1：直接使用 JSON URL（最簡單）

1. 打開 iOS Shortcut App
2. 創建新的 Shortcut
3. 新增「取得網頁內容」動作
4. 在 URL 欄位輸入：
   ```
   https://greedysisyphus.github.io/Brainless/data/flight-data-2026-02-01.json
   ```
   （將日期改為您需要的日期，格式：YYYY-MM-DD）
5. 新增「取得 JSON 字典值」動作
6. 輸入：`網頁內容`（從上一步取得）
7. 新增「取得字典值」動作來取得特定資料

### 方法 2：動態取得今天的資料

1. 新增「取得目前日期」動作
2. 新增「格式化日期」動作
   - 日期：目前日期
   - 格式：自訂 → `yyyy-MM-dd`
3. 新增「文字」動作
   - 內容：`https://greedysisyphus.github.io/Brainless/data/flight-data-{格式化日期}.json`
   - 將 `{格式化日期}` 替換為「格式化日期」的變數
4. 新增「取得網頁內容」動作
   - URL：文字結果
5. 新增「取得 JSON 字典值」動作
   - 輸入：網頁內容
6. 使用「取得字典值」來取得需要的資料

## 常用資料路徑

### 取得總航班數
- 字典：JSON 結果
- 鍵：`summary`
- 然後再取得：`total_flights`

### 取得 17:00 前的航班數
- 字典：JSON 結果 → summary
- 鍵：`before_17:00`

### 取得 17:00 後的航班數
- 字典：JSON 結果 → summary
- 鍵：`after_17:00`

### 取得所有航班列表
- 字典：JSON 結果
- 鍵：`flights`

### 取得第一個航班
- 字典：JSON 結果 → flights
- 索引：`0`

### 取得第一個航班的時間
- 字典：JSON 結果 → flights → 0
- 鍵：`time`

### 取得第一個航班的登機門
- 字典：JSON 結果 → flights → 0
- 鍵：`gate`

### 取得第一個航班的航班代碼
- 字典：JSON 結果 → flights → 0
- 鍵：`flight_code`

### 取得第一個航班的狀態
- 字典：JSON 結果 → flights → 0
- 鍵：`status`

## 完整範例 Shortcut

### 範例 1：顯示今天的總航班數

```
1. 取得目前日期
2. 格式化日期（格式：yyyy-MM-dd）
3. 文字：https://greedysisyphus.github.io/Brainless/data/flight-data-{格式化日期}.json
4. 取得網頁內容（URL：文字）
5. 取得 JSON 字典值（輸入：網頁內容）
6. 取得字典值（鍵：summary）
7. 取得字典值（鍵：total_flights）
8. 文字：今天共有 {total_flights} 班航班
9. 顯示通知（內容：文字）
```

### 範例 2：列出所有航班的時間和登機門

```
1. 取得目前日期
2. 格式化日期（格式：yyyy-MM-dd）
3. 文字：https://greedysisyphus.github.io/Brainless/data/flight-data-{格式化日期}.json
4. 取得網頁內容（URL：文字）
5. 取得 JSON 字典值（輸入：網頁內容）
6. 取得字典值（鍵：flights）
7. 重複每個項目（輸入：flights）
   8. 取得字典值（鍵：time）
   9. 取得字典值（鍵：gate）
   10. 取得字典值（鍵：flight_code）
   11. 文字：{time} - {gate} - {flight_code}
   12. 加入變數（名稱：航班列表）
13. 取得變數（名稱：航班列表）
14. 顯示通知（內容：航班列表）
```

### 範例 3：找出特定登機門的航班

```
1. 取得目前日期
2. 格式化日期（格式：yyyy-MM-dd）
3. 文字：https://greedysisyphus.github.io/Brainless/data/flight-data-{格式化日期}.json
4. 取得網頁內容（URL：文字）
5. 取得 JSON 字典值（輸入：網頁內容）
6. 取得字典值（鍵：flights）
7. 過濾列表（輸入：flights，條件：gate 等於 D15）
8. 顯示通知（內容：過濾後的列表）
```

## 進階技巧

### 使用格式化顯示

API 回應中包含 `formatted_display` 陣列，這是已經格式化好的字串，可以直接使用：

```
取得字典值（鍵：formatted_display）
```

這會返回類似這樣的陣列：
```
[
  "06:30 : D16 : BR178 (長榮航空)",
  "06:50 : D11 : JX761 (星宇航空)"
]
```

### 過濾特定時間的航班

使用「過濾列表」動作，條件可以設定為：
- `time` 包含特定時間
- `datetime` 在特定時間範圍內

### 計算統計資料

使用「計算統計資料」動作可以：
- 計算航班總數
- 找出最早/最晚的航班時間
- 計算平均間隔時間

## 錯誤處理

建議在 Shortcut 中加入錯誤處理：

```
1. 如果（條件：網頁內容 包含 "error"）
   2. 顯示通知（內容："無法取得資料"）
   3. 否則
   4. 繼續處理資料
```

## 分享 Shortcut

完成後，您可以：
1. 點擊 Shortcut 右上角的「...」
2. 選擇「分享」
3. 分享給其他使用者

## 注意事項

- 資料每 30 分鐘更新一次
- 如果指定的日期沒有資料，會返回 404 錯誤
- 建議在 Shortcut 中加入日期驗證，確保日期格式正確（YYYY-MM-DD）
