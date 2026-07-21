# 電子菜單部署與架構

> 最後確認：2026-07-21

## 兩個 repo、兩條線

| 項目 | Brainless | 客人菜單站 |
|------|-----------|------------|
| GitHub | [greedysisyphus/Brainless](https://github.com/greedysisyphus/Brainless) | [greedysisyphus/simplekaffa-menu](https://github.com/greedysisyphus/simplekaffa-menu) |
| 用途 | 後台、上傳、版面設定 | 客人掃 QR 看到的頁面 |
| 部署 | GitHub Pages（整包 Brainless） | **Vercel** |
| 線上 URL | （Brainless 主站） | https://simplekaffa-menu.vercel.app/ |
| 原始碼目錄 | `menu-site/`（開發用副本） | repo 根目錄 = `menu-site/` 內容 |

**重要：** 在 Brainless push **不會**更新 Vercel 客人站。Vercel 只連 `simplekaffa-menu` repo。

## 資料流

```
Brainless 後台 #/menu（管理員）
  → Firebase Storage  menu/page-*
  → Firestore         publicMenu/current
       · images[]
       · display.layout  (stack | row | tabs)

客人站 simplekaffa-menu.vercel.app
  → onSnapshot(publicMenu/current)
  → 依 layout 渲染
```

Firebase 專案：`brainless-schedule`（兩邊共用，僅讀 `publicMenu/current`）。

## 什麼時候要 deploy Vercel？

| 操作 | 要 sync + push `simplekaffa-menu`？ |
|------|-------------------------------------|
| 後台換菜單圖 | ❌ 不用 |
| 後台切換上下／左右／分頁 | ❌ 不用（**前提是**客人站已部署支援 layout 的程式） |
| 修改 `menu-site/` 的程式、CSS、HTML | ✅ 要 |

## 更新客人站（sync 腳本）

在 Brainless repo 根目錄：

```bash
./scripts/sync-menu-site-to-vercel-repo.sh
```

或手動：

```bash
git clone https://github.com/greedysisyphus/simplekaffa-menu.git /tmp/simplekaffa-menu-sync
rsync -a --delete \
  --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
  menu-site/ /tmp/simplekaffa-menu-sync/
cd /tmp/simplekaffa-menu-sync
git add -A
git commit -m "Sync menu-site from Brainless"
git push origin main
```

Push 後 Vercel 通常 1～2 分鐘內自動 redeploy。

## Vercel 設定（已存在，僅供查核）

- **Repo：** `greedysisyphus/simplekaffa-menu`
- **Framework：** Vite
- **Build：** `npm run build`
- **Output：** `dist`
- **Branch：** `main`

## 後台入口

- 電子菜單設定：`#/menu`（頂部導覽，管理員）
- 內含「客人頁預覽」iframe → 與 QR 站相同

## 需同步的常數

若新增版面 ID，兩處需一致：

- `src/utils/publicMenuDisplay.js`（Brainless 後台）
- `menu-site/src/menuLayout.js`（客人站；sync 時一併帶過去）

## 驗證 deploy 成功

1. 後台選「分頁切換」
2. 開 https://simplekaffa-menu.vercel.app/
3. 應看到「第 1 頁／第 2 頁」分頁按鈕；若仍只有上下捲動，表示 Vercel 尚未跑完或 push 失敗
