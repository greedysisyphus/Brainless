/**
 * 在 yuann.tw 網站上尋找航班 API 的工具
 * 
 * 使用方法：
 * 1. 打開 https://yuann.tw/taoyuan-airport-d11-d18-departures/
 * 2. 打開開發者工具 (F12)
 * 3. 在 Console 中執行此腳本
 */

console.log('🔍 開始搜尋航班 API...\n');

// 1. 監控所有網路請求（過濾掉廣告和追蹤）
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  // 過濾掉廣告和追蹤請求
  if (!url.includes('googlesyndication') && 
      !url.includes('google-analytics') && 
      !url.includes('doubleclick') &&
      !url.includes('facebook') &&
      !url.includes('gstatic')) {
    console.log('📡 Fetch Request:', {
      url: url,
      method: args[1]?.method || 'GET',
      body: args[1]?.body,
      timestamp: new Date().toISOString()
    });
  }
  return originalFetch.apply(this, args)
    .then(response => {
      const url = args[0];
      if (!url.includes('googlesyndication') && 
          !url.includes('google-analytics') && 
          !url.includes('doubleclick') &&
          !url.includes('facebook') &&
          !url.includes('gstatic')) {
        response.clone().json().then(data => {
          console.log('📥 Fetch Response:', {
            url: url,
            data: data
          });
        }).catch(() => {
          response.clone().text().then(text => {
            if (text.length < 500) { // 只顯示較短的文字回應
              console.log('📥 Fetch Response (Text):', {
                url: url,
                preview: text.substring(0, 200)
              });
            }
          });
        });
      }
      return response;
    });
};

// 2. 監控 XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  this._url = url;
  this._method = method;
  // 過濾掉廣告和追蹤請求
  if (!url.includes('googlesyndication') && 
      !url.includes('google-analytics') && 
      !url.includes('doubleclick') &&
      !url.includes('facebook') &&
      !url.includes('gstatic')) {
    console.log('📡 XHR Request:', {
      method: method,
      url: url,
      timestamp: new Date().toISOString()
    });
  }
  return originalXHROpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(...args) {
  const xhr = this;
  xhr.addEventListener('load', function() {
    const url = xhr._url;
    if (!url.includes('googlesyndication') && 
        !url.includes('google-analytics') && 
        !url.includes('doubleclick') &&
        !url.includes('facebook') &&
        !url.includes('gstatic')) {
      try {
        const response = xhr.responseType === 'json' ? xhr.response : JSON.parse(xhr.responseText);
        console.log('📥 XHR Response:', {
          method: xhr._method,
          url: url,
          status: xhr.status,
          data: response
        });
      } catch (e) {
        if (xhr.responseText && xhr.responseText.length < 1000) {
          console.log('📥 XHR Response (Text):', {
            method: xhr._method,
            url: url,
            status: xhr.status,
            preview: xhr.responseText.substring(0, 200)
          });
        }
      }
    }
  });
  return originalXHRSend.apply(this, args);
};

// 3. 搜尋頁面中的 API 相關代碼
console.log('🔎 搜尋頁面中的 API 相關變數和函數...\n');

// 搜尋 window 物件
const apiKeys = Object.keys(window).filter(key => {
  const lowerKey = key.toLowerCase();
  return lowerKey.includes('api') || 
         lowerKey.includes('flight') || 
         lowerKey.includes('gate') ||
         lowerKey.includes('airport') ||
         lowerKey.includes('departure');
});

if (apiKeys.length > 0) {
  console.log('📋 找到可能的 API 相關變數:');
  apiKeys.forEach(key => {
    console.log(`  - ${key}:`, typeof window[key]);
  });
} else {
  console.log('  (未找到明顯的 API 相關變數)');
}

// 4. 搜尋所有 script 標籤中的 API 端點
console.log('\n🔎 搜尋 script 標籤中的 API 端點...\n');
const scripts = document.querySelectorAll('script');
scripts.forEach((script, index) => {
  if (script.src) {
    console.log(`Script ${index + 1}: ${script.src}`);
  } else if (script.textContent) {
    const content = script.textContent;
    // 搜尋可能的 API URL
    const apiMatches = content.match(/https?:\/\/[^\s"']+api[^\s"']*/gi) || 
                      content.match(/https?:\/\/[^\s"']+flight[^\s"']*/gi) ||
                      content.match(/https?:\/\/[^\s"']+gate[^\s"']*/gi);
    if (apiMatches) {
      console.log(`  Found in inline script:`, apiMatches);
    }
  }
});

console.log('\n✅ API 監控已啟動！');
console.log('💡 提示：請重新載入頁面或進行搜尋操作，所有相關的 API 請求都會顯示在這裡。');
console.log('💡 注意：已自動過濾掉 Google 廣告、分析等無關請求。\n');
