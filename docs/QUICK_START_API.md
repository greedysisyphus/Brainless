# 快速開始：使用航班資料 API

## 最簡單的方式（推薦）

**直接使用 GitHub Pages JSON 檔案，無需部署！**

### URL 格式

```
https://greedysisyphus.github.io/Brainless/data/flight-data-YYYY-MM-DD.json
```

### 範例

```
https://greedysisyphus.github.io/Brainless/data/flight-data-2026-02-01.json
```

### iOS Shortcut 使用

1. 新增「取得網頁內容」動作
2. URL 輸入：
   ```
   https://greedysisyphus.github.io/Brainless/data/flight-data-2026-02-01.json
   ```
   （將日期改為您需要的日期）
3. 方法選擇：`GET`
4. 新增「取得 JSON 字典值」動作
5. 使用「取得字典值」來取得需要的資料

### 動態日期（取得今天的資料）

```
1. 取得目前日期
2. 格式化日期（格式：yyyy-MM-dd）
3. 文字：https://greedysisyphus.github.io/Brainless/data/flight-data-{格式化日期}.json
4. 取得網頁內容（URL：文字）
5. 取得 JSON 字典值（輸入：網頁內容）
6. 取得字典值（鍵：summary）
7. 取得字典值（鍵：total_flights）
8. 顯示通知（內容：今天共有 {total_flights} 班航班）
```

## 資料結構

```json
{
  "date": "2026-02-01",
  "summary": {
    "total_flights": 50,
    "before_17:00": 30,
    "after_17:00": 20
  },
  "flights": [
    {
      "time": "06:30",
      "gate": "D16",
      "flight_code": "BR178",
      "status": "出發DEPARTED",
      ...
    }
  ]
}
```

## 常用資料路徑

- `summary.total_flights` - 總航班數
- `summary.before_17:00` - 17:00 前的航班數
- `summary.after_17:00` - 17:00 後的航班數
- `flights[]` - 所有航班列表
- `flights[0].time` - 第一個航班的時間
- `flights[0].gate` - 第一個航班的登機門
- `flights[0].flight_code` - 第一個航班的航班代碼

## 使用 Firebase Functions API（進階）

如果您想要使用 Firebase Functions API（需要部署），請參考：
- [Firebase API 指南](./FIREBASE_API_GUIDE.md)
- [部署指南](./DEPLOY_FIREBASE_API.md)

## 注意事項

- 資料每 30 分鐘自動更新一次
- 如果指定的日期沒有資料，會返回 404 錯誤
- 日期格式必須是 `YYYY-MM-DD`
