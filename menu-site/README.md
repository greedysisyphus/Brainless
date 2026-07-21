# 客人電子菜單站（Phase 1）

獨立 Vite 單頁，讀取 Firebase `publicMenu/current` 顯示菜單圖。**不要**把整包 Brainless deploy 到 Vercel 給客人用。

## 前置

1. Firebase Console 已啟用 Storage（建議 ASIA-EAST1）
2. 已發布 `storage.rules` 與 `firestore.rules`（見 repo 根目錄）
3. 管理員在 Brainless `/admin` 上傳過至少一張菜單

## 本機開發

```bash
cd menu-site
npm install
npm run dev
```

## 部署到新 GitHub repo + Vercel

1. 只複製 `menu-site/` 資料夾內容到新 repo 根目錄（或整個 `menu-site` 當 repo 根）
2. Vercel：Import 該 repo，Framework Preset 選 **Vite**，Build `npm run build`，Output `dist`
3. 部署完成後，QR code 指向 Vercel URL

## Firebase 規則（repo 根目錄，與 Brainless 一起維護）

```bash
# 在 Brainless repo 根目錄
firebase deploy --only storage,firestore:rules
```

或 Console 手動貼上 `storage.rules` / `firestore.rules` 後按 **Publish**。

## 資料流

```
Admin /admin 上傳 → Storage menu/page-* → Firestore publicMenu/current
  · images[]、display.layout (stack | row | tabs)
客人 Vercel 站 → onSnapshot(publicMenu/current) → 依 layout 顯示
```
