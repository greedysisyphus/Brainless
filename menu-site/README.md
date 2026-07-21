# 客人電子菜單站（Phase 1）

獨立 Vite 單頁，讀取 Firebase `publicMenu/current` 顯示菜單圖。

**不要**把整包 Brainless deploy 到 Vercel 給客人用。

## 線上環境

| 項目 | 值 |
|------|-----|
| 客人 URL | https://simplekaffa-menu.vercel.app/ |
| Vercel 連的 GitHub | [greedysisyphus/simplekaffa-menu](https://github.com/greedysisyphus/simplekaffa-menu) |
| 本目錄在 Brainless 內 | 開發副本；**更新客人站需 sync 到上述 repo** |

完整部署說明見：[docs/electronic-menu-deployment.md](../docs/electronic-menu-deployment.md)

## 前置

1. Firebase Console 已啟用 Storage（建議 ASIA-EAST1）
2. 已發布 `storage.rules` 與 `firestore.rules`（見 Brainless repo 根目錄）
3. 管理員在 Brainless `#/menu` 上傳過至少一張菜單

## 本機開發

```bash
cd menu-site
npm install
npm run dev
```

## 更新 Vercel（改過 menu-site 程式後）

在 Brainless repo 根目錄：

```bash
./scripts/sync-menu-site-to-vercel-repo.sh
```

換圖、切版面（stack / row / tabs）**不用** redeploy，只要 Firestore 有寫入即可。

## Firebase 規則（在 Brainless repo 根目錄維護）

```bash
firebase deploy --only storage,firestore:rules
```

## 資料流

```
Brainless #/menu 上傳 → Storage menu/page-* → Firestore publicMenu/current
  · images[]
  · display.layout (stack | row | tabs)
客人 Vercel 站 → onSnapshot(publicMenu/current) → 依 layout 顯示
```

## 與後台共用的常數

- 後台：`src/utils/publicMenuDisplay.js`
- 客人站：`src/menuLayout.js`（新增 layout 時兩邊需一致）
