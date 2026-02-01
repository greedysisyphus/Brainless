/**
 * 分析 yuann.tw 桃園機場航班 API 的工具
 * 
 * 使用方法：
 * 1. 在瀏覽器中打開 https://yuann.tw/taoyuan-airport-d11-d18-departures/
 * 2. 打開開發者工具 (F12)
 * 3. 在 Console 中執行以下代碼來監控 API 請求
 */

// 監控所有 fetch 請求
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('🔍 Fetch Request:', {
    url: args[0],
    options: args[1],
    timestamp: new Date().toISOString()
  });
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('✅ Fetch Response:', {
    url: args[0],
    status: response.status,
    headers: Object.fromEntries(response.headers.entries())
  });
      return response;
    });
};

// 監控所有 XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  this._url = url;
  this._method = method;
  console.log('🔍 XHR Request:', {
    method,
    url,
    timestamp: new Date().toISOString()
  });
  return originalXHROpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(...args) {
  this.addEventListener('load', function() {
    console.log('✅ XHR Response:', {
      method: this._method,
      url: this._url,
      status: this.status,
      responseType: this.responseType,
      response: this.responseType === 'json' ? this.response : 'See Response tab'
    });
  });
  return originalXHRSend.apply(this, args);
};

console.log('📊 API 監控已啟動！請在頁面上進行操作，所有 API 請求都會顯示在這裡。');
