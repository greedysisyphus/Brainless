# 貓咪對話功能設定指南

## 功能概述

貓咪對話功能允許管理員在網站 Logo 的貓咪左上方添加一個漫畫式對話框，可以顯示自定義的碎碎唸內容。

## 功能特點

- 🎭 **漫畫式對話框**：經典的圓角矩形 + 小尾巴設計
- 🔐 **管理員權限控制**：只有管理員可以修改對話內容
- 🌐 **全域同步**：所有用戶看到相同的對話內容
- ⌨️ **快捷鍵登入**：Ctrl + Alt + A 快速開啟管理員登入
- ✏️ **雙擊編輯**：管理員可雙擊對話框直接編輯
- 📱 **響應式設計**：適配各種螢幕尺寸

## 設定步驟

### 1. 部署 Firestore 安全規則

```bash
# 部署更新後的安全規則
firebase deploy --only firestore:rules
```

### 2. 初始化貓咪對話設定

```bash
# 執行初始化腳本
node scripts/init-cat-speech.js
```

### 3. 創建管理員帳號

```bash
# 創建管理員帳號（替換為你的信箱和密碼）
node scripts/create-admin.js admin@yourdomain.com yourpassword123
```

## 使用方法

### 管理員登入

1. **快捷鍵登入**：按 `Ctrl + Alt + A` 開啟登入介面
2. **輸入管理員信箱和密碼**
3. **點擊登入**

### 管理對話內容

#### 方法一：管理員面板
- 登入後會自動顯示右下角的管理員面板
- 可以開關對話框顯示
- 可以編輯對話內容
- 可以儲存設定

#### 方法二：雙擊編輯
- 管理員可以直接雙擊對話框進入編輯模式
- 按 `Enter` 儲存，按 `Esc` 取消
- 失焦時自動儲存

### 對話框樣式

- **位置**：貓咪 Logo 左上方
- **背景**：白色圓角矩形
- **邊框**：主色調邊框
- **尾巴**：指向貓咪的小三角形
- **文字**：深灰色，支援換行

## 技術架構

### Firebase 集合結構

```
Firestore Database
├── admins/{adminId}
│   ├── email: string
│   ├── role: "admin"
│   └── permissions: ["catSpeech", "globalSettings"]
├── catSpeech/global
│   ├── enabled: boolean
│   ├── text: string
│   ├── style: object
│   ├── lastUpdated: timestamp
│   └── updatedBy: string
└── adminLogs/{logId}
    ├── adminId: string
    ├── action: string
    ├── details: object
    └── timestamp: timestamp
```

### 安全規則

- **admins 集合**：只有管理員可讀寫
- **catSpeech 集合**：所有人可讀取，只有管理員可寫入
- **adminLogs 集合**：只有管理員可讀寫

### 組件結構

```
src/
├── components/
│   ├── CatSpeechBubble.jsx    # 主要對話框組件
│   └── layout/
│       └── Header.jsx         # 整合對話框的 Header
├── utils/
│   └── firebase.js            # Firebase 配置和管理員功能
└── scripts/
    ├── create-admin.js        # 管理員帳號創建腳本
    └── init-cat-speech.js     # 初始化腳本
```

## 故障排除

### 常見問題

1. **對話框不顯示**
   - 檢查 Firestore 中的 `catSpeech/global` 文檔是否存在
   - 確認 `enabled` 欄位為 `true`

2. **管理員登入失敗**
   - 確認管理員帳號已正確創建
   - 檢查 Firestore 安全規則是否已部署
   - 確認 `admins` 集合中有對應的 UID

3. **無法編輯對話框**
   - 確認已成功登入管理員帳號
   - 檢查瀏覽器控制台是否有錯誤訊息

### 除錯步驟

1. **檢查 Firebase 連接**
   ```javascript
   // 在瀏覽器控制台執行
   import { checkFirebaseConnection } from './src/utils/firebase.js';
   checkFirebaseConnection().then(console.log);
   ```

2. **檢查管理員狀態**
   ```javascript
   // 在瀏覽器控制台執行
   import { auth, checkAdminStatus } from './src/utils/firebase.js';
   if (auth.currentUser) {
     checkAdminStatus(auth.currentUser.uid).then(console.log);
   }
   ```

3. **檢查 Firestore 資料**
   ```javascript
   // 在 Firebase Console 中檢查
   // Firestore > catSpeech > global
   ```

## 進階功能

### 自定義樣式

可以修改 `CatSpeechBubble.jsx` 中的 CSS 類名來自定義對話框樣式：

```css
/* 對話框背景 */
.bg-white.rounded-xl.p-3.shadow-lg.border-2.border-primary

/* 對話框尾巴 */
.border-l-4.border-r-4.border-t-4.border-transparent.border-t-white
```

### 添加動畫效果

可以在 `src/styles/index.css` 中添加自定義動畫：

```css
@keyframes bubbleAppear {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.speech-bubble {
  animation: bubbleAppear 0.3s ease-out;
}
```

### 擴展功能

- **時間相關文字**：根據時間自動顯示不同內容
- **節日祝福**：特殊節日顯示祝福語
- **多語言支援**：支援不同語言的對話內容
- **表情符號支援**：在對話框中顯示表情符號

## 安全注意事項

1. **管理員帳號安全**
   - 使用強密碼
   - 定期更換密碼
   - 不要分享管理員帳號

2. **Firebase 安全**
   - 定期檢查 Firestore 安全規則
   - 監控異常操作
   - 備份重要資料

3. **內容管理**
   - 避免顯示敏感資訊
   - 定期檢查對話內容
   - 設定內容審核機制

## 更新日誌

- **v1.0.0**：初始版本，基本對話框功能
- **v1.1.0**：添加管理員權限控制
- **v1.2.0**：添加雙擊編輯功能
- **v1.3.0**：添加響應式設計和動畫效果
