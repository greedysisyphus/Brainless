/**
 * 深度分析 yuann.tw 網站航班 API 的工具
 * 
 * 使用方法：
 * 1. 打開 https://yuann.tw/taoyuan-airport-d11-d18-departures/
 * 2. 打開開發者工具 (F12)
 * 3. 在 Console 中貼上並執行此腳本
 * 4. 重新載入頁面或進行搜尋操作
 */

console.log('🔍 開始深度分析 yuann.tw 航班 API...\n');

// ============================================
// 1. 監控所有網路請求（包含 admin-ajax.php）
// ============================================
const interceptedRequests = [];

// 攔截 fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const options = args[1] || {};
  
  // 記錄所有請求（不過濾，因為我們要找到真正的 API）
  interceptedRequests.push({
    type: 'fetch',
    url: typeof url === 'string' ? url : url.url || url.toString(),
    method: options.method || 'GET',
    body: options.body,
    headers: options.headers,
    timestamp: new Date().toISOString()
  });
  
  console.log('📡 [FETCH]', {
    url: typeof url === 'string' ? url : url.url || url.toString(),
    method: options.method || 'GET',
    hasBody: !!options.body
  });
  
  return originalFetch.apply(this, args)
    .then(response => {
      const urlStr = typeof url === 'string' ? url : url.url || url.toString();
      
      // 特別關注 admin-ajax.php 和包含 api/flight/gate 的請求
      if (urlStr.includes('admin-ajax') || 
          urlStr.includes('api') || 
          urlStr.includes('flight') || 
          urlStr.includes('gate') ||
          urlStr.includes('departure') ||
          urlStr.includes('taoyuan') ||
          urlStr.includes('airport')) {
        
        response.clone().json().then(data => {
          console.log('📥 [FETCH RESPONSE - JSON]', {
            url: urlStr,
            data: data
          });
        }).catch(() => {
          response.clone().text().then(text => {
            console.log('📥 [FETCH RESPONSE - TEXT]', {
              url: urlStr,
              preview: text.substring(0, 500),
              fullLength: text.length
            });
          });
        });
      }
      return response;
    })
    .catch(error => {
      console.error('❌ [FETCH ERROR]', {
        url: typeof url === 'string' ? url : url.url || url.toString(),
        error: error.message
      });
      throw error;
    });
};

// 攔截 XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  this._interceptedUrl = url;
  this._interceptedMethod = method;
  
  interceptedRequests.push({
    type: 'xhr',
    url: url,
    method: method,
    timestamp: new Date().toISOString()
  });
  
  console.log('📡 [XHR]', {
    method: method,
    url: url
  });
  
  return originalXHROpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(...args) {
  const xhr = this;
  const url = xhr._interceptedUrl;
  const method = xhr._interceptedMethod;
  
  xhr.addEventListener('load', function() {
    // 特別關注 admin-ajax.php 和包含 api/flight/gate 的請求
    if (url.includes('admin-ajax') || 
        url.includes('api') || 
        url.includes('flight') || 
        url.includes('gate') ||
        url.includes('departure') ||
        url.includes('taoyuan') ||
        url.includes('airport')) {
      
      try {
        const response = xhr.responseType === 'json' ? xhr.response : JSON.parse(xhr.responseText);
        console.log('📥 [XHR RESPONSE - JSON]', {
          method: method,
          url: url,
          status: xhr.status,
          data: response
        });
      } catch (e) {
        console.log('📥 [XHR RESPONSE - TEXT]', {
          method: method,
          url: url,
          status: xhr.status,
          preview: xhr.responseText.substring(0, 500),
          fullLength: xhr.responseText.length
        });
      }
    }
  });
  
  xhr.addEventListener('error', function() {
    console.error('❌ [XHR ERROR]', {
      method: method,
      url: url,
      status: xhr.status
    });
  });
  
  return originalXHRSend.apply(this, args);
};

// ============================================
// 2. 搜尋頁面中的 JavaScript 代碼
// ============================================
console.log('\n🔎 搜尋頁面中的 API 相關代碼...\n');

// 搜尋所有 script 標籤
const scripts = document.querySelectorAll('script');
let foundApiEndpoints = [];

scripts.forEach((script, index) => {
  if (script.src) {
    // 外部腳本
    if (script.src.includes('api') || 
        script.src.includes('flight') || 
        script.src.includes('gate')) {
      console.log(`📜 External Script ${index + 1}: ${script.src}`);
      foundApiEndpoints.push({ type: 'external_script', url: script.src });
    }
  } else if (script.textContent) {
    // 內聯腳本
    const content = script.textContent;
    
    // 搜尋 URL 模式
    const urlPatterns = [
      /https?:\/\/[^\s"'`]+api[^\s"'`]*/gi,
      /https?:\/\/[^\s"'`]+flight[^\s"'`]*/gi,
      /https?:\/\/[^\s"'`]+gate[^\s"'`]*/gi,
      /https?:\/\/[^\s"'`]+departure[^\s"'`]*/gi,
      /https?:\/\/[^\s"'`]+taoyuan[^\s"'`]*/gi,
      /https?:\/\/[^\s"'`]+airport[^\s"'`]*/gi,
      /\/wp-admin\/admin-ajax\.php[^\s"'`]*/gi,
      /admin-ajax\.php[^\s"'`]*/gi
    ];
    
    urlPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          console.log(`📜 Inline Script ${index + 1} 找到 URL:`, match);
          foundApiEndpoints.push({ type: 'inline_script', url: match });
        });
      }
    });
    
    // 搜尋函數定義
    const functionPatterns = [
      /function\s+[\w]*fetch[\w]*\s*\([^)]*\)\s*\{[^}]*}/gi,
      /function\s+[\w]*api[\w]*\s*\([^)]*\)\s*\{[^}]*}/gi,
      /function\s+[\w]*flight[\w]*\s*\([^)]*\)\s*\{[^}]*}/gi,
      /const\s+[\w]*fetch[\w]*\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*}/gi,
      /const\s+[\w]*api[\w]*\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*}/gi
    ];
    
    functionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`📜 Inline Script ${index + 1} 找到函數:`, matches[0].substring(0, 200));
      }
    });
  }
});

// ============================================
// 3. 搜尋 window 物件中的 API 相關變數
// ============================================
console.log('\n🔎 搜尋 window 物件中的 API 相關變數...\n');

const apiKeys = Object.keys(window).filter(key => {
  const lowerKey = key.toLowerCase();
  return lowerKey.includes('api') || 
         lowerKey.includes('flight') || 
         lowerKey.includes('gate') ||
         lowerKey.includes('airport') ||
         lowerKey.includes('departure') ||
         lowerKey.includes('ajax');
});

if (apiKeys.length > 0) {
  console.log('📋 找到可能的 API 相關變數:');
  apiKeys.forEach(key => {
    try {
      const value = window[key];
      const type = typeof value;
      console.log(`  - ${key}: ${type}`, 
        type === 'function' ? '(function)' : 
        type === 'object' ? `(${Object.keys(value || {}).length} keys)` : 
        value);
    } catch (e) {
      console.log(`  - ${key}: (無法讀取)`);
    }
  });
} else {
  console.log('  (未找到明顯的 API 相關變數)');
}

// ============================================
// 4. 檢查 WordPress 相關
// ============================================
console.log('\n🔎 檢查是否為 WordPress 網站...\n');

const isWordPress = document.querySelector('link[href*="wp-content"]') || 
                   document.querySelector('script[src*="wp-content"]') ||
                   document.querySelector('script[src*="wp-includes"]') ||
                   window.wp || 
                   window.ajaxurl;

if (isWordPress) {
  console.log('✅ 檢測到 WordPress 網站');
  if (window.ajaxurl) {
    console.log('📌 ajaxurl:', window.ajaxurl);
  }
  if (window.wp) {
    console.log('📌 wp 物件:', Object.keys(window.wp || {}));
  }
} else {
  console.log('  (未檢測到 WordPress)');
}

// ============================================
// 5. 檢查頁面中的資料屬性
// ============================================
console.log('\n🔎 檢查頁面中的資料屬性...\n');

const dataElements = document.querySelectorAll('[data-api], [data-endpoint], [data-url], [data-flight], [data-gate]');
if (dataElements.length > 0) {
  console.log(`📋 找到 ${dataElements.length} 個包含資料屬性的元素:`);
  dataElements.forEach((el, index) => {
    if (index < 10) { // 只顯示前 10 個
      const attrs = Array.from(el.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => `${attr.name}="${attr.value}"`)
        .join(', ');
      console.log(`  - ${el.tagName}: ${attrs}`);
    }
  });
} else {
  console.log('  (未找到相關的資料屬性)');
}

// ============================================
// 6. 總結
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📊 分析總結');
console.log('='.repeat(60));
console.log(`總共攔截到 ${interceptedRequests.length} 個請求`);
console.log(`找到 ${foundApiEndpoints.length} 個可能的 API 端點`);
console.log(`找到 ${apiKeys.length} 個 API 相關變數`);

console.log('\n💡 下一步：');
console.log('1. 重新載入頁面，觀察 Console 中的請求');
console.log('2. 在 Network 標籤中搜尋：admin-ajax, api, flight, gate');
console.log('3. 查看上述找到的 URL 和變數');
console.log('4. 如果看到 admin-ajax.php，檢查其 action 參數');

console.log('\n✅ 監控已啟動！請重新載入頁面或進行搜尋操作。\n');

// 提供一個函數來查看所有攔截的請求
window._viewInterceptedRequests = function() {
  console.table(interceptedRequests);
  return interceptedRequests;
};

console.log('💡 提示：執行 window._viewInterceptedRequests() 可查看所有攔截的請求');
