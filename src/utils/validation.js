// 輸入驗證和安全性檢查工具

// XSS 防護：清理危險字符
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除 script 標籤
    .replace(/javascript:/gi, '') // 移除 javascript: 協議
    .replace(/on\w+\s*=/gi, '') // 移除事件處理器
    .replace(/<iframe\b[^>]*>/gi, '') // 移除 iframe 標籤
    .replace(/<object\b[^>]*>/gi, '') // 移除 object 標籤
    .replace(/<embed\b[^>]*>/gi, '') // 移除 embed 標籤
    .replace(/<link\b[^>]*>/gi, '') // 移除 link 標籤
    .replace(/<meta\b[^>]*>/gi, '') // 移除 meta 標籤
    .trim();
};

// 驗證規則名稱
export const validateRuleName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: '規則名稱不能為空' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '規則名稱不能為空' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: '規則名稱不能超過50個字符' };
  }
  
  // 檢查是否包含危險字符
  if (/<script|javascript:|on\w+=/i.test(trimmed)) {
    return { valid: false, error: '規則名稱包含不安全的字符' };
  }
  
  return { valid: true };
};

// 驗證對話內容
export const validateMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: '對話內容不能為空' };
  }
  
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '對話內容不能為空' };
  }
  
  if (trimmed.length > 500) {
    return { valid: false, error: '對話內容不能超過500個字符' };
  }
  
  // 檢查是否包含危險字符
  if (/<script|javascript:|on\w+=/i.test(trimmed)) {
    return { valid: false, error: '對話內容包含不安全的字符' };
  }
  
  return { valid: true };
};

// 驗證時間格式
export const validateTime = (time) => {
  if (!time || typeof time !== 'string') {
    return { valid: false, error: '時間格式不正確' };
  }
  
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return { valid: false, error: '時間格式不正確，請使用 HH:MM 格式' };
  }
  
  return { valid: true };
};

// 驗證日期
export const validateDate = (month, date) => {
  if (!month || !date) {
    return { valid: false, error: '月份和日期不能為空' };
  }
  
  const monthNum = parseInt(month);
  const dateNum = parseInt(date);
  
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return { valid: false, error: '月份必須在1-12之間' };
  }
  
  if (isNaN(dateNum) || dateNum < 1 || dateNum > 31) {
    return { valid: false, error: '日期必須在1-31之間' };
    }
    
  // 檢查日期是否有效
  const testDate = new Date(2024, monthNum - 1, dateNum);
  if (testDate.getMonth() !== monthNum - 1 || testDate.getDate() !== dateNum) {
    return { valid: false, error: '日期無效' };
  }
  
  return { valid: true };
};

// 驗證自定義規則
export const validateCustomRule = (rule) => {
  const errors = [];
  
  // 驗證規則名稱
  const nameValidation = validateRuleName(rule.name);
  if (!nameValidation.valid) {
    errors.push(nameValidation.error);
  }
  
  // 驗證對話內容
  if (!rule.messages || !Array.isArray(rule.messages)) {
    errors.push('對話內容必須是陣列');
  } else {
    const validMessages = rule.messages.filter(msg => msg && msg.trim() !== '');
    if (validMessages.length === 0) {
      errors.push('至少需要一個有效的對話內容');
    } else {
      validMessages.forEach((message, index) => {
        const messageValidation = validateMessage(message);
        if (!messageValidation.valid) {
          errors.push(`對話 ${index + 1}: ${messageValidation.error}`);
        }
      });
    }
  }
  
  // 驗證時間設定
  if (rule.type === 'timeRange' || rule.type === 'dayOfWeek' || rule.type === 'monthlyDate') {
    if (!rule.allDay) {
      const startTimeValidation = validateTime(rule.startTime);
      if (!startTimeValidation.valid) {
        errors.push(`開始時間: ${startTimeValidation.error}`);
      }
      
      const endTimeValidation = validateTime(rule.endTime);
      if (!endTimeValidation.valid) {
        errors.push(`結束時間: ${endTimeValidation.error}`);
      }
    }
  }
  
  // 驗證特定日期
  if (rule.type === 'specificDate') {
    const dateValidation = validateDate(rule.month, rule.date);
    if (!dateValidation.valid) {
      errors.push(dateValidation.error);
    }
  }
  
  // 驗證每月日期
  if (rule.type === 'monthlyDate') {
    if (!rule.date || rule.date < 1 || rule.date > 31) {
      errors.push('每月日期必須在1-31之間');
      }
    }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// 驗證班表模板
export const validateScheduleTemplate = (template) => {
  const errors = [];
  
  // 驗證模板名稱
  const nameValidation = validateRuleName(template.name);
  if (!nameValidation.valid) {
    errors.push(nameValidation.error);
  }
  
  // 驗證問候語內容
  const messageValidation = validateMessage(template.message);
  if (!messageValidation.valid) {
    errors.push(messageValidation.error);
  }
  
  // 驗證時間限制
  if (template.timeRestriction) {
    const startTimeValidation = validateTime(template.startTime);
    if (!startTimeValidation.valid) {
      errors.push(`開始時間: ${startTimeValidation.error}`);
    }
    
    const endTimeValidation = validateTime(template.endTime);
    if (!endTimeValidation.valid) {
      errors.push(`結束時間: ${endTimeValidation.error}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// 批量驗證
export const validateBatch = (items, validator) => {
  const results = items.map((item, index) => {
    const validation = validator(item);
    return {
      index,
      item,
      ...validation
    };
  });
  
  const validItems = results.filter(result => result.valid);
  const invalidItems = results.filter(result => !result.valid);
  
  return {
    valid: invalidItems.length === 0,
    validItems,
    invalidItems,
    totalErrors: invalidItems.reduce((sum, item) => sum + item.errors.length, 0)
  };
};

// 班表資料驗證
export const validateScheduleData = (scheduleData) => {
  if (!scheduleData || typeof scheduleData !== 'object') {
    return { valid: false, error: '班表資料格式不正確' };
  }
  
  // 檢查是否有有效的班表資料
  const hasValidData = Object.keys(scheduleData).some(key => {
    if (key === '_lastUpdated') return false;
    const employeeSchedule = scheduleData[key];
    return employeeSchedule && typeof employeeSchedule === 'object';
  });
  
  if (!hasValidData) {
    return { valid: false, error: '沒有有效的班表資料' };
  }
  
  return { valid: true };
};

// 姓名對應驗證
export const validateNamesMapping = (namesData) => {
  if (!namesData || typeof namesData !== 'object') {
    return { valid: false, error: '姓名對應資料格式不正確' };
  }
  
  const validNames = Object.values(namesData).filter(name => 
    name && typeof name === 'string' && name.trim() !== ''
  );
  
  if (validNames.length === 0) {
    return { valid: false, error: '沒有有效的姓名對應資料' };
  }
  
  return { valid: true };
};

// 統計輸入驗證
export const validateStatisticsInput = (input) => {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: '統計輸入格式不正確' };
  }
  
  // 檢查必要的欄位
  const requiredFields = ['startDate', 'endDate'];
  for (const field of requiredFields) {
    if (!input[field]) {
      return { valid: false, error: `缺少必要欄位: ${field}` };
  }
}

  // 檢查日期格式
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { valid: false, error: '日期格式不正確' };
  }
  
  if (startDate > endDate) {
    return { valid: false, error: '開始日期不能晚於結束日期' };
  }
  
  return { valid: true };
};

// 安全獲取物件屬性
export const safeGet = (obj, path, defaultValue = null) => {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
};

// 安全陣列映射
export const safeArrayMap = (array, mapper, defaultValue = []) => {
  if (!Array.isArray(array)) {
    return defaultValue;
  }
  
  try {
    return array.map(mapper);
  } catch (error) {
    console.error('陣列映射失敗:', error);
    return defaultValue;
  }
};