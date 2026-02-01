# GitHub Actions 設定說明

## 概述

已設定 GitHub Actions 自動從桃園機場官方文字檔 API 獲取航班資料，並自動更新到 GitHub Pages。

## Workflow 檔案

**位置**: `.github/workflows/update-flight-data.yml`

## 觸發條件

### 1. 定時執行（每 30 分鐘）
```yaml
schedule:
  - cron: '*/30 * * * *'
```

### 2. 手動觸發
在 GitHub 的 Actions 頁面可以手動觸發執行。

### 3. 當 workflow 檔案變更時
當 `.github/workflows/update-flight-data.yml` 被修改並推送到 main 分支時會自動執行。

## 執行步驟

1. **Checkout repository** - 檢出程式碼
2. **Set up Python** - 設定 Python 3.11 環境
3. **Install dependencies** - 安裝 Python 依賴套件
4. **Run scraper** - 執行 `fetch-from-txt-api.py` 腳本
5. **Commit and push changes** - 自動提交並推送更新的資料檔案

## 需要的權限

為了讓 GitHub Actions 能夠自動提交和推送，需要：

### 方法 1: 使用 Personal Access Token (PAT)

1. 建立 Personal Access Token：
   - 前往 GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 建立新 token，勾選 `repo` 權限

2. 在 Repository Settings 中設定 Secret：
   - 前往 Settings → Secrets and variables → Actions
   - 新增 Secret，名稱：`GITHUB_TOKEN`，值：你的 PAT

3. 更新 workflow 檔案使用這個 token：
   ```yaml
   - name: Commit and push changes
     env:
       GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
     run: |
       git config --local user.email "action@github.com"
       git config --local user.name "GitHub Action"
       git add data/
       git diff --staged --quiet || git commit -m "Update flight data [skip ci]"
       git push https://${{ secrets.GITHUB_TOKEN }}@github.com/${{ github.repository }}.git
   ```

### 方法 2: 使用 GITHUB_TOKEN（推薦）

GitHub Actions 預設提供 `GITHUB_TOKEN`，但需要設定寫入權限：

1. 前往 Repository Settings → Actions → General
2. 在 "Workflow permissions" 區塊：
   - 選擇 "Read and write permissions"
   - 勾選 "Allow GitHub Actions to create and approve pull requests"

3. 更新 workflow 檔案：
   ```yaml
   - name: Commit and push changes
     run: |
       git config --local user.email "action@github.com"
       git config --local user.name "GitHub Action"
       git add data/
       git diff --staged --quiet || git commit -m "Update flight data [skip ci]"
       git push
     env:
       GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

## 檢查執行狀態

1. 前往 GitHub Repository
2. 點擊 "Actions" 標籤
3. 查看 "Update Flight Data" workflow 的執行記錄

## 手動觸發

1. 前往 GitHub Repository → Actions
2. 選擇 "Update Flight Data" workflow
3. 點擊 "Run workflow" 按鈕
4. 選擇分支（通常是 `main`）
5. 點擊 "Run workflow"

## 疑難排解

### 問題：無法自動提交和推送

**可能原因**：
- 沒有設定寫入權限
- GITHUB_TOKEN 權限不足

**解決方法**：
- 檢查 Repository Settings → Actions → General → Workflow permissions
- 確保選擇 "Read and write permissions"

### 問題：腳本執行失敗

**可能原因**：
- 依賴套件未安裝
- 網路連線問題
- 資料格式變更

**解決方法**：
- 檢查 Actions 執行日誌
- 確認 `requirements.txt` 包含所有必要套件
- 測試腳本是否能在本地正常執行

### 問題：定時執行沒有觸發

**可能原因**：
- Repository 需要至少有一次 commit 才會啟用定時任務
- GitHub Actions 的定時任務可能有延遲

**解決方法**：
- 確保 repository 有至少一次 commit
- 手動觸發一次 workflow 確認設定正確

## 更新頻率

目前設定為每 30 分鐘執行一次。如果需要調整：

```yaml
schedule:
  - cron: '*/30 * * * *'  # 每 30 分鐘
  # 或
  - cron: '0 * * * *'      # 每小時
  # 或
  - cron: '0 */6 * * *'    # 每 6 小時
```

## 相關檔案

- `.github/workflows/update-flight-data.yml` - Workflow 設定
- `scripts/scraper/fetch-from-txt-api.py` - 資料獲取腳本
- `scripts/scraper/requirements.txt` - Python 依賴套件
