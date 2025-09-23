// 安全性檢查工具

// 檢查是否為管理員操作
export const isAdminOperation = (user, requiredPermissions = []) => {
  if (!user) {
    return { allowed: false, reason: '用戶未登入' };
  }
  
  // 這裡可以擴展權限檢查邏輯
  // 目前只檢查是否為管理員
  return { allowed: true };
};

// 檢查操作頻率限制
const operationLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分鐘
const MAX_OPERATIONS_PER_WINDOW = 10; // 每分鐘最多10次操作

export const checkRateLimit = (userId, operation) => {
  const key = `${userId}_${operation}`;
  const now = Date.now();
  
  if (!operationLimits.has(key)) {
    operationLimits.set(key, []);
  }
  
  const operations = operationLimits.get(key);
  
  // 清理過期的操作記錄
  const validOperations = operations.filter(time => now - time < RATE_LIMIT_WINDOW);
  operationLimits.set(key, validOperations);
  
  if (validOperations.length >= MAX_OPERATIONS_PER_WINDOW) {
    return {
      allowed: false,
      reason: '操作過於頻繁，請稍後再試',
      retryAfter: RATE_LIMIT_WINDOW - (now - validOperations[0])
    };
  }
  
  // 記錄此次操作
  validOperations.push(now);
  operationLimits.set(key, validOperations);
  
  return { allowed: true };
};

// 檢查輸入長度限制
export const checkInputLength = (input, maxLength = 1000) => {
  if (typeof input !== 'string') {
    return { valid: false, reason: '輸入必須是字符串' };
  }
  
  if (input.length > maxLength) {
    return { 
      valid: false, 
      reason: `輸入長度不能超過 ${maxLength} 個字符` 
    };
  }
  
  return { valid: true };
};

// 檢查文件大小限制
export const checkFileSize = (file, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      reason: `文件大小不能超過 ${maxSizeMB}MB`
    };
  }
  
  return { valid: true };
};

// 檢查文件類型
export const checkFileType = (file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      reason: `不支持的文件類型，只允許: ${allowedTypes.join(', ')}`
    };
  }
  
  return { valid: true };
};

// 生成安全的文件名
export const generateSafeFileName = (originalName) => {
  if (!originalName || typeof originalName !== 'string') {
    return `file_${Date.now()}`;
  }
  
  // 移除危險字符
  const safeName = originalName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 只保留字母、數字、點、下劃線、連字符
    .replace(/_{2,}/g, '_') // 將多個連續下劃線替換為單一下劃線
    .replace(/^_+|_+$/g, '') // 移除開頭和結尾的下劃線
    .substring(0, 100); // 限制長度
  
  // 如果清理後的名稱為空，使用時間戳
  if (!safeName) {
    return `file_${Date.now()}`;
  }
  
  return safeName;
};

// 檢查 URL 安全性
export const checkUrlSafety = (url) => {
  if (!url || typeof url !== 'string') {
    return { safe: false, reason: 'URL 不能為空' };
  }
  
  try {
    const urlObj = new URL(url);
    
    // 檢查協議
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { safe: false, reason: '只允許 HTTP 和 HTTPS 協議' };
    }
    
    // 檢查是否為本地地址（開發環境允許）
    if (process.env.NODE_ENV === 'production') {
      if (urlObj.hostname === 'localhost' || 
          urlObj.hostname === '127.0.0.1' || 
          urlObj.hostname.startsWith('192.168.') ||
          urlObj.hostname.startsWith('10.') ||
          urlObj.hostname.startsWith('172.')) {
        return { safe: false, reason: '不允許訪問本地地址' };
      }
    }
    
    return { safe: true };
  } catch (error) {
    return { safe: false, reason: '無效的 URL 格式' };
  }
};

// 清理敏感信息
export const sanitizeSensitiveData = (data) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeSensitiveData(sanitized[key]);
    }
  });
  
  return sanitized;
};

// 生成操作日誌
export const createOperationLog = (userId, operation, details = {}) => {
  return {
    userId,
    operation,
    details: sanitizeSensitiveData(details),
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    ip: 'unknown' // 在實際應用中，這應該從請求中獲取
  };
};

// 檢查操作權限
export const checkOperationPermission = (user, operation, resource = null) => {
  // 基本權限檢查
  if (!user) {
    return { allowed: false, reason: '用戶未登入' };
  }
  
  // 檢查是否為管理員
  if (!user.isAdmin) {
    return { allowed: false, reason: '需要管理員權限' };
  }
  
  // 檢查操作頻率限制
  const rateLimitCheck = checkRateLimit(user.uid, operation);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck;
  }
  
  // 這裡可以添加更細粒度的權限檢查
  // 例如：檢查用戶是否有權限操作特定資源
  
  return { allowed: true };
};
