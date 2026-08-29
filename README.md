# Brainless

咖啡店門市營運工具：厚片計算、收銀、點豆、叫貨、日結報表、電子菜單、航班資料。給現場人員用手機／iPad／電腦快速完成當下工作。

線上：https://greedysisyphus.github.io/Brainless/

## 主要功能

- **厚片計算器**：依分店目標量計算麵包片數
- **收銀管理**：點鈔、外幣、當日對帳
- **咖啡豆盤點**：分店庫存與重量換算
- **貨物叫貨**：對照最低庫存產出可複製的叫貨文字
- **日結報表**：產出各店月報 zip
- **電子菜單**：店內／公開菜單（完整站台另見 `menu-site/`）
- **航班資料**：桃園機場航班，每小時由 GitHub Actions 更新
- **回饋中心**：功能許願、問題回報、操作討論
- **Playground**：班表、酒精計算、音樂等實驗／次要工具

介面為 Club 主題（暖紙底、墨色字、珊瑚強調）。

## 開發

```bash
npm install
npm run dev          # http://localhost:3001
npm test
npm run build        # 輸出到 docs/，供 GitHub Pages
```

航班 JSON 的唯一來源是 `data/`。`npm run dev` 會同步到 `public/data/`；正式建置再複製進 `docs/data/`。日結 zip 只追蹤 `public/reports/`。

## 部署

`main` 推送後由 `.github/workflows/deploy.yml` 建置並部署 GitHub Pages。航班資料由 `.github/workflows/update-flight-data.yml` 每小時寫入 `data/`。

## 相關目錄

- `src/` 主站
- `functions/` Firebase Cloud Functions
- `menu-site/` 客人電子菜單（同步到獨立 Vercel repo）
- `scripts/scraper/` 現行爬蟲（`fetch-from-txt-api.py`）
- `scripts/archive/` 舊實驗腳本，不再用於 CI
