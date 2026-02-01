# 如何讓分析腳本在重新載入後仍然有效

當你在瀏覽器 Console 中執行腳本後，重新載入頁面時腳本會消失。這是正常的瀏覽器行為。以下是幾種讓腳本持續有效的方法：

## 方法一：使用 Chrome DevTools Snippets（推薦）

這是 Chrome 內建的功能，最方便且不需要安裝任何擴展。

### 步驟：

1. **打開 DevTools**
   - 按 `F12` 或 `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

2. **切換到 Sources 標籤**
   - 點擊頂部的 "Sources" 標籤

3. **打開 Snippets**
   - 在左側面板中找到 "Snippets"（如果沒看到，點擊 `>>` 展開更多選項）
   - 如果沒有 Snippets，右鍵點擊左側面板 → 選擇 "Snippets"

4. **創建新 Snippet**
   - 右鍵點擊 "Snippets" → 選擇 "New snippet"
   - 命名為 "WordPress API Analyzer" 或任何你喜歡的名稱

5. **貼上代碼**
   - 打開 `scripts/find-wordpress-api.js`
   - 複製全部代碼
   - 貼到 Snippet 編輯器中

6. **執行 Snippet**
   - 右鍵點擊 Snippet → 選擇 "Run"
   - 或使用快捷鍵：`Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

7. **重新載入頁面**
   - 腳本會持續監控，即使重新載入頁面也會繼續工作

### 優點：
- ✅ 不需要安裝擴展
- ✅ 腳本會保存在瀏覽器中
- ✅ 可以隨時編輯和執行
- ✅ 支援快捷鍵

---

## 方法二：使用 Bookmarklet（書籤小工具）

創建一個書籤，點擊即可執行腳本。

### 步驟：

1. **創建新書籤**
   - 在瀏覽器中創建新書籤（或編輯現有書籤）

2. **設置書籤名稱**
   - 例如：「分析 WordPress API」

3. **設置書籤 URL**
   - 複製以下代碼（這是壓縮後的版本，用於 Bookmarklet）：

```javascript
javascript:(function(){if(window._wpApiAnalyzerRunning){console.log('⚠️ 腳本已在運行中');return;}window._wpApiAnalyzerRunning=true;console.log('🔍 開始分析...');const originalFetch=window.fetch;window.fetch=function(...args){const url=args[0];const urlStr=typeof url==='string'?url:url.url||url.toString();if(urlStr.includes('admin-ajax')||urlStr.includes('api')||urlStr.includes('flight')||urlStr.includes('gate')||urlStr.includes('departure')||urlStr.includes('taoyuan')||urlStr.includes('airport')){console.log('📡 [FETCH]',{url:urlStr,method:args[1]?.method||'GET'});}return originalFetch.apply(this,args).then(response=>{if(urlStr.includes('admin-ajax')||urlStr.includes('api')||urlStr.includes('flight')||urlStr.includes('gate')||urlStr.includes('departure')||urlStr.includes('taoyuan')||urlStr.includes('airport')){response.clone().json().then(data=>{console.log('📥 [FETCH RESPONSE]',{url:urlStr,data:data});}).catch(()=>{response.clone().text().then(text=>{if(text.length<1000){console.log('📥 [FETCH RESPONSE - TEXT]',{url:urlStr,preview:text.substring(0,500)});}});});}return response;});};if(window.jQuery){const originalAjax=window.jQuery.ajax;window.jQuery.ajax=function(options){const url=options.url||'';if(url.includes('admin-ajax')||url.includes('api')||url.includes('flight')||url.includes('gate')||url.includes('departure')||url.includes('taoyuan')||url.includes('airport')){console.log('📡 [jQuery AJAX]',{url:url,method:options.type||'GET',data:options.data,action:options.data?.action||'N/A'});const originalSuccess=options.success;options.success=function(data,textStatus,jqXHR){console.log('📥 [jQuery AJAX RESPONSE]',{url:url,status:jqXHR.status,data:data,dataType:typeof data});if(originalSuccess){originalSuccess.apply(this,arguments);}};const originalError=options.error;options.error=function(jqXHR,textStatus,errorThrown){console.error('❌ [jQuery AJAX ERROR]',{url:url,status:jqXHR.status,error:errorThrown});if(originalError){originalError.apply(this,arguments);}};}return originalAjax.apply(this,arguments);};}console.log('✅ 監控已啟動！');})();
```

4. **使用書籤**
   - 在任何頁面上點擊書籤即可執行腳本
   - 每次重新載入頁面後，需要再次點擊書籤

### 優點：
- ✅ 不需要打開 DevTools
- ✅ 可以跨瀏覽器使用
- ✅ 方便分享給其他人

### 缺點：
- ⚠️ 每次重新載入後需要再次點擊
- ⚠️ URL 長度有限制

---

## 方法三：使用瀏覽器擴展（Tampermonkey / Violentmonkey）⭐ 最推薦

使用用戶腳本管理器，可以讓腳本自動在特定網站上執行。

**詳細說明請參考：[Tampermonkey 設置指南](./TAMPERMONKEY_SETUP_GUIDE.md)**

### 快速開始：

1. **安裝擴展**
   - Chrome: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)
   - Edge: [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. **創建新腳本**
   - 點擊擴展圖標 → "Create a new script"

3. **貼上代碼**
   - 打開 `scripts/tampermonkey-wordpress-api-analyzer.user.js`
   - 複製全部代碼並貼到編輯器中

4. **保存腳本**
   - 按 `Cmd+S` (Mac) / `Ctrl+S` (Windows) 保存

5. **自動執行**
   - 腳本會在符合 `@match` 規則的網站上自動執行
   - 每次重新載入頁面都會自動執行
   - **完全自動化，無需手動操作！**

### 優點：
- ✅ 完全自動化，無需手動操作
- ✅ 可以設定只在特定網站執行
- ✅ 功能強大，支援更多 API
- ✅ 設定一次，永久有效

---

## 方法四：使用 Network 標籤的過濾器（最簡單）

如果只是想查看 API 請求，不需要腳本，直接使用 Network 標籤的過濾功能。

### 步驟：

1. **打開 DevTools**
   - 按 `F12`

2. **切換到 Network 標籤**

3. **使用過濾器**
   - 在過濾框中輸入：`admin-ajax` 或 `api` 或 `flight`
   - 或選擇 "XHR" / "Fetch" 類型

4. **重新載入頁面**
   - 所有符合條件的請求都會顯示

5. **查看請求詳情**
   - 點擊任何請求查看 Headers、Payload、Response

### 優點：
- ✅ 最簡單，不需要任何代碼
- ✅ 內建功能，不需要額外工具

---

## 推薦方案

**對於需要持續分析 API 的情況，我強烈推薦使用方法三（Tampermonkey）**：

1. ✅ 完全自動化，無需手動操作
2. ✅ 重新載入頁面後自動重新執行
3. ✅ 設定一次，永久有效
4. ✅ 專業且可靠

**如果你不想安裝擴展，可以使用方法一（Chrome DevTools Snippets）**：

1. 腳本會保存在瀏覽器中
2. 可以隨時編輯和執行
3. 不需要安裝擴展
4. 重新載入頁面後，只需再次執行 Snippet 即可
