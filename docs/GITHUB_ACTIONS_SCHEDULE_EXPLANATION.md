# GitHub Actions 排程執行說明

## 為什麼顯示的時間和設定不一致？

### 可能的原因

1. **資料沒有變化時不會 commit**
   - 如果抓取的資料和上次完全相同，`git diff --staged --quiet` 會返回 true
   - 因此不會執行 commit，GitHub Actions 會顯示為「成功但無變更」
   - 但這不會更新檔案時間戳記

2. **GitHub Actions 排程執行可能有延遲**
   - GitHub Actions 的 scheduled workflow 使用 UTC 時間
   - 執行時間可能會有幾分鐘的延遲
   - 如果系統負載高，可能延遲更久

3. **時區差異**
   - GitHub Actions 使用 UTC 時間
   - 顯示的「1小時前」可能是相對於 UTC 時間
   - 而實際執行時間可能不同

4. **Workflow 執行但沒有變更**
   - Workflow 可能每 15/30 分鐘執行一次
   - 但如果資料沒有變化，不會產生新的 commit
   - 因此檔案時間戳記不會更新

## 解決方案

### 方案 1：強制更新時間戳記（推薦）

修改 workflow，即使沒有資料變更也更新時間戳記：

```yaml
- name: Commit and push changes
  run: |
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git add data/
    # 即使沒有變更，也更新 updated_at 欄位
    git diff --staged --quiet && echo "No changes to commit" || git commit -m "Update flight data [skip workflow]"
    git push
```

### 方案 2：在 JSON 中記錄執行時間

Python 腳本已經會加入 `updated_at` 欄位，即使資料沒變，這個欄位也會更新。

### 方案 3：檢查實際執行記錄

在 GitHub Actions 頁面查看：
1. 前往 Actions 標籤
2. 查看 "Update Flight Data" workflow
3. 檢查實際執行時間和結果

## 當前設定

- **排程頻率**：每 15 分鐘（`*/15 * * * *`）
- **執行時間**：每小時的 00、15、30、45 分（UTC 時間）
- **時區**：UTC（GitHub Actions 使用 UTC）

## 注意事項

- GitHub Actions 的 scheduled workflow 可能因為系統負載而延遲
- 如果資料沒有變化，不會產生新的 commit
- 但 Python 腳本會更新 JSON 中的 `updated_at` 欄位
- 前端會從 HTTP headers 或 JSON 中的 `updated_at` 取得更新時間
