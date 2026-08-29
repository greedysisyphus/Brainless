# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Brainless 的主要使用者是咖啡店門市人員與管理者。門市人員會在營運現場使用手機、iPad 或電腦完成計算、盤點、報表與資訊查詢；管理者維護共同設定並追蹤改善事項。

## Product Purpose

Brainless 集中咖啡店日常營運工具，減少人工換算、重複整理與跨店溝通成本。成功代表門市人員可以快速完成當下工作，並能讓問題與改善建議被看見、追蹤與回應。

## Positioning

產品把厚片製作、收銀、咖啡豆盤點、叫貨、報表、電子菜單與航班資訊等特定門市流程整合在同一套共用工具中。

## Operating Context

使用情境包含門市工作中的快速查詢與輸入、跨分店共享資料，以及管理者在後台維護設定。網路品質與裝置尺寸可能不穩定，因此重要操作需提供清楚的載入、成功與失敗回饋。

## Capabilities and Constraints

- React 18、Vite、Tailwind CSS、Firebase Authentication 與 Firestore。
- 介面為單一 Club 主題（暖紙、墨、珊瑚）。
- 回饋中心的內容與留言對所有使用者公開可見，所有人都能以暱稱與分店留言、投票及建立回饋。
- 管理員可更新回饋狀態並代表團隊正式回覆。
- 回饋類型為功能許願、問題回報與操作討論；處理狀態為待確認、已排程、處理中、已完成與暫不處理。
- 一般使用者目前沒有個別登入帳號；匿名身分以本機識別碼搭配暱稱與分店表示。

## Brand Commitments

沿用 Brainless 名稱、貓咪標誌、繁體中文介面與 Club 主題，不因新增回饋中心改變既有產品識別。

## Evidence on Hand

- 現有功能與技術說明：[README.md](README.md)
- 現有導覽與頁面架構：`src/config/navigation.jsx`、`src/App.jsx`
- 現有更新紀錄：`src/contexts/ChangelogContext.jsx`

## Product Principles

- 讓門市人員用最少步驟完成當下工作。
- 共同資料的狀態與更新來源必須清楚可見。
- 回饋不能成為黑洞；回報後要能看到討論與處理進度。
- 保持手機、iPad 與桌面操作一致且可讀。
