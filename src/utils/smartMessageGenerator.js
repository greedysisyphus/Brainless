// 智能對話生成器
// 支援精確時間控制、班表同步和固定日期設定

// 常數定義
const CONSTANTS = {
  MAX_CONSECUTIVE_DAYS_CHECK: 30,
  MIN_CONSECUTIVE_DAYS: 4,
  MAX_CONSECUTIVE_DAYS: 6,
  REST_SHIFTS: ['休假', '特休', '月休', '休', '特'],
  TIME_SLOTS: {
    MORNING: { start: 5, end: 12 },
    AFTERNOON: { start: 12, end: 18 },
    EVENING: { start: 18, end: 22 }
  },
  SHIFT_KEYWORDS: {
    MORNING: ['早班', '早', 'Morning', 'K', 'KK'],
    AFTERNOON: ['中班', '中', 'Mid', 'L'],
    EVENING: ['晚班', '晚', 'Evening', 'Y']
  }
};

// 快取機制
const cache = {
  consecutiveDays: new Map(),
  todayWorkers: new Map(),
  todayString: null,
  todayDate: null,
  lastCacheTime: 0
};

// 快取清理函數（每天清理一次，或強制清理）
const clearCacheIfNeeded = (force = false) => {
  const now = Date.now();
  const today = new Date().toDateString();
  
  if (force || cache.lastCacheTime === 0 || new Date(cache.lastCacheTime).toDateString() !== today) {
    cache.consecutiveDays.clear();
    cache.todayWorkers.clear();
    cache.todayString = null;
    cache.todayDate = null;
    cache.lastCacheTime = now;
  }
};

// 強制清理快取（供外部調用）
export const clearSmartMessageCache = () => {
  clearCacheIfNeeded(true);
};

// 工具函數
const getTodayString = () => {
  clearCacheIfNeeded();
  if (!cache.todayString) {
    cache.todayString = new Date().toISOString().split('T')[0];
  }
  return cache.todayString;
};

const getTodayDate = () => {
  clearCacheIfNeeded();
  if (!cache.todayDate) {
    const today = new Date();
    cache.todayDate = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      date: today.getDate(),
      day: today.getDay()
    };
  }
  return cache.todayDate;
};

const isRestShift = (shift) => {
  if (!shift || typeof shift !== 'string') return false;
  return CONSTANTS.REST_SHIFTS.includes(shift.trim());
};

const isValidWorkShift = (shift) => {
  if (!shift || typeof shift !== 'string') return false;
  const trimmedShift = shift.trim();
  return trimmedShift !== '' && !isRestShift(trimmedShift);
};

const formatDateString = (year, month, date) => {
  return `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
};

// 輔助函數：處理時間限制檢查
const checkTimeRestriction = (template) => {
  if (!template.timeRestriction) return true;
  return isTimeInRange(template.startTime, template.endTime);
};

// 輔助函數：處理班次變數替換
const replaceShiftVariables = (result, categorized) => {
  result = result.replace(/\{早班同事\}/g, categorized.morning.length > 0 ? categorized.morning.join('、') : '');
  result = result.replace(/\{中班同事\}/g, categorized.afternoon.length > 0 ? categorized.afternoon.join('、') : '');
  result = result.replace(/\{晚班同事\}/g, categorized.evening.length > 0 ? categorized.evening.join('、') : '');
  result = result.replace(/\{所有同事\}/g, categorized.all.length > 0 ? categorized.all.join('、') : '');
  return result;
};

// 輔助函數：處理人數變數替換
const replaceCountVariables = (result, categorized) => {
  result = result.replace(/\{早班人數\}/g, categorized.morning.length.toString());
  result = result.replace(/\{中班人數\}/g, categorized.afternoon.length.toString());
  result = result.replace(/\{晚班人數\}/g, categorized.evening.length.toString());
  result = result.replace(/\{總人數\}/g, categorized.all.length.toString());
  return result;
};

// 輔助函數：處理連續上班天數變數替換
const replaceConsecutiveDaysVariables = (result, scheduleData, namesData) => {
  // 處理 {同事名字}連續上班{天數} 的格式
  result = result.replace(/\{([^}]+)\}連續上班\{(\d+)\}/g, (match, employeeName, days) => {
    const employeeId = Object.keys(namesData).find(id => namesData[id] === employeeName);
    if (employeeId) {
      const consecutiveDays = calculateConsecutiveWorkDays(scheduleData, employeeId, namesData);
      return `${employeeName}連續上班${consecutiveDays}天`;
    }
    return match;
  });
  
  // 處理 {同事名字}連續上班天數 的格式
  result = result.replace(/\{([^}]+)\}連續上班天數/g, (match, employeeName) => {
    const employeeId = Object.keys(namesData).find(id => namesData[id] === employeeName);
    if (employeeId) {
      const consecutiveDays = calculateConsecutiveWorkDays(scheduleData, employeeId, namesData);
      return `${employeeName}連續上班${consecutiveDays}天`;
    }
    return match;
  });
  
  return result;
};

// 輔助函數：處理連續上班問候變數替換
const replaceConsecutiveWorkVariables = (result, scheduleData, namesData) => {
  // 處理 {連續上班同事} 的格式
  result = result.replace(/\{連續上班同事\}/g, () => {
    const consecutiveEmployees = findConsecutiveWorkEmployees(scheduleData, namesData, CONSTANTS.MIN_CONSECUTIVE_DAYS, CONSTANTS.MAX_CONSECUTIVE_DAYS);
    if (consecutiveEmployees.length > 0) {
      // 按連續天數分組
      const groupedByDays = {};
      consecutiveEmployees.forEach(emp => {
        if (!groupedByDays[emp.consecutiveDays]) {
          groupedByDays[emp.consecutiveDays] = [];
        }
        groupedByDays[emp.consecutiveDays].push(emp.name);
      });
      
      // 格式化輸出：相同天數的同事放在一起
      const formattedGroups = Object.entries(groupedByDays).map(([days, names]) => {
        if (names.length === 1) {
          return `${names[0]}連續上班${days}天`;
        } else {
          return `${names.join('、')}連續上班${days}天`;
        }
      });
      
      return formattedGroups.join('、');
    }
    return '';
  });
  
  // 處理 {連續上班同事數量} 的格式
  result = result.replace(/\{連續上班同事數量\}/g, () => {
    const consecutiveEmployees = findConsecutiveWorkEmployees(scheduleData, namesData, CONSTANTS.MIN_CONSECUTIVE_DAYS, CONSTANTS.MAX_CONSECUTIVE_DAYS);
    return consecutiveEmployees.length.toString();
  });
  
  return result;
};

// 輔助函數：處理指定天數的連續上班同事變數替換
const replaceSpecificDaysVariables = (result, scheduleData, namesData) => {
  // 處理 {連續上班X天同事} 的格式
  result = result.replace(/\{連續上班(\d+)天同事\}/g, (match, days) => {
    const specifiedDays = parseInt(days);
    const consecutiveEmployees = findConsecutiveWorkEmployees(scheduleData, namesData, specifiedDays, specifiedDays);
    
    if (consecutiveEmployees.length > 0) {
      const names = consecutiveEmployees.map(emp => emp.name);
      if (names.length === 1) {
        return names[0];
      } else {
        return names.join('、');
      }
    }
    return '';
  });
  
  // 處理 {連續上班X天同事數量} 的格式
  result = result.replace(/\{連續上班(\d+)天同事數量\}/g, (match, days) => {
    const specifiedDays = parseInt(days);
    const consecutiveEmployees = findConsecutiveWorkEmployees(scheduleData, namesData, specifiedDays, specifiedDays);
    return consecutiveEmployees.length.toString();
  });
  
  return result;
};

// 輔助函數：清理結果字串
const cleanResultString = (result) => {
  result = result.replace(/\s*[，、]\s*$/g, ''); // 移除結尾的逗號和頓號
  result = result.replace(/^\s*[，、]\s*/g, ''); // 移除開頭的逗號和頓號
  result = result.replace(/\s+/g, ' '); // 合併多個空格
  return result;
};

// 輔助函數：檢查模板是否應該顯示
const shouldDisplayTemplate = (template, scheduleData, namesData) => {
  // 檢查連續上班問候變數
  if (template.message.includes('{連續上班同事}') || template.message.includes('{連續上班同事數量}')) {
    const consecutiveEmployees = findConsecutiveWorkEmployees(scheduleData, namesData, CONSTANTS.MIN_CONSECUTIVE_DAYS, CONSTANTS.MAX_CONSECUTIVE_DAYS);
    if (consecutiveEmployees.length === 0) {
      return false;
    }
  }
  
  // 檢查指定天數的連續上班同事變數
  const specificDaysMatch = template.message.match(/\{連續上班(\d+)天同事\}/g);
  if (specificDaysMatch) {
    for (const match of specificDaysMatch) {
      const daysMatch = match.match(/\{連續上班(\d+)天同事\}/);
      if (daysMatch) {
        const specifiedDays = parseInt(daysMatch[1]);
        const consecutiveEmployees = findConsecutiveWorkEmployees(scheduleData, namesData, specifiedDays, specifiedDays);
        if (consecutiveEmployees.length === 0) {
          return false;
        }
      }
    }
  }
  
  return true;
};

// 批次處理多個模板的優化函數
const processMultipleTemplates = (templates, scheduleData, namesData) => {
  if (!templates || !Array.isArray(templates) || templates.length === 0) {
    return [];
  }

  // 預先計算一次今天的工作人員和分類，避免重複計算
  const workers = getTodayWorkers(scheduleData);
  const categorized = workers.length > 0 ? categorizeWorkersByShift(workers, namesData) : null;

  return templates
    .filter(template => template.enabled)
    .map(template => {
      const processedMessage = processScheduleTemplate(template, scheduleData, namesData);
      if (processedMessage && typeof processedMessage === 'string' && processedMessage.trim() !== '') {
        return {
          type: 'schedule',
          priority: 2,
          message: processedMessage,
          source: `班表模板: ${template.name}`
        };
      }
      return null;
    })
    .filter(Boolean); // 移除 null 值
};

// 時間範圍檢查
const isTimeInRange = (startTime, endTime) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startTimeMinutes = startHour * 60 + startMin;
  const endTimeMinutes = endHour * 60 + endMin;
  
  // 處理跨日的情況
  if (endTimeMinutes < startTimeMinutes) {
    return currentTime >= startTimeMinutes || currentTime <= endTimeMinutes;
  }
  
  return currentTime >= startTimeMinutes && currentTime <= endTimeMinutes;
};

// 獲取當前時間段
const getCurrentTimeSlot = () => {
  const hour = new Date().getHours();
  if (hour >= CONSTANTS.TIME_SLOTS.MORNING.start && hour < CONSTANTS.TIME_SLOTS.MORNING.end) return 'morning';
  if (hour >= CONSTANTS.TIME_SLOTS.AFTERNOON.start && hour < CONSTANTS.TIME_SLOTS.AFTERNOON.end) return 'afternoon';
  if (hour >= CONSTANTS.TIME_SLOTS.EVENING.start && hour < CONSTANTS.TIME_SLOTS.EVENING.end) return 'evening';
  return 'night';
};

// 檢查是否為週末
const isWeekend = () => {
  const day = new Date().getDay();
  return day === 0 || day === 6;
};

// 獲取星期幾
const getDayOfWeek = () => {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return days[new Date().getDay()];
};

// 檢查是否為特定日期
const isSpecificDate = (month, date) => {
  const today = new Date();
  return today.getMonth() + 1 === month && today.getDate() === date;
};

// 轉換 ScheduleManager 的資料結構為智能對話系統格式
const convertScheduleData = (scheduleData) => {
  if (!scheduleData || typeof scheduleData !== 'object') {
    return [];
  }

  const converted = [];
  const today = getTodayDate();

  // 處理 ScheduleManager 的資料結構
  for (const [employeeId, schedule] of Object.entries(scheduleData)) {
    if (employeeId === '_lastUpdated') continue;
    
    if (schedule && typeof schedule === 'object') {
      for (const [dateStr, shift] of Object.entries(schedule)) {
        if (isValidWorkShift(shift)) {
          const date = parseInt(dateStr);
          
          if (date === today.date) {
            const convertedItem = {
              id: `${employeeId}_${date}`,
              date: formatDateString(today.year, today.month, date),
              shift: shift,
              employee: employeeId
            };
            converted.push(convertedItem);
          }
        }
      }
    }
  }

  return converted;
};

// 根據班表資料獲取今天上班的同事
const getTodayWorkers = (scheduleData) => {
  if (!scheduleData) {
    return [];
  }

  // 如果是 ScheduleManager 的資料結構，先轉換
  if (Array.isArray(scheduleData)) {
    // 已經是轉換後的格式
    const todayStr = getTodayString();
    
    const filteredWorkers = scheduleData.filter(item => {
      const itemDate = new Date(item.date);
      const itemDateStr = itemDate.toISOString().split('T')[0];
      const isToday = itemDateStr === todayStr;
      const isValidShift = isValidWorkShift(item.shift);
      return isToday && isValidShift;
    });
    
    return filteredWorkers;
  } else {
    // ScheduleManager 的原始資料結構，需要轉換
    const converted = convertScheduleData(scheduleData);
    return converted;
  }
};

// 計算連續上班天數
const calculateConsecutiveWorkDays = (scheduleData, employeeId, namesData = {}) => {
  if (!scheduleData || !employeeId) {
    return 0;
  }

  clearCacheIfNeeded();
  
  // 檢查快取
  const cacheKey = `${employeeId}_${JSON.stringify(scheduleData)}`;
  if (cache.consecutiveDays.has(cacheKey)) {
    return cache.consecutiveDays.get(cacheKey);
  }

  const employeeName = namesData[employeeId] || employeeId;

  // 如果是 ScheduleManager 的資料結構，需要轉換
  if (Array.isArray(scheduleData)) {
    // 已經是轉換後的格式，計算連續上班天數
    const todayStr = getTodayString();
    
    // 找到該員工今天的班次
    const todayShift = scheduleData.find(item => 
      item.employee === employeeId && 
      new Date(item.date).toISOString().split('T')[0] === todayStr
    );
    
    if (!todayShift) {
      return 0; // 今天沒有上班
    }
    
    // 計算連續上班天數
    let consecutiveDays = 0;
    let currentDate = new Date();
    
    // 向前檢查連續上班天數
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const shift = scheduleData.find(item => 
        item.employee === employeeId && 
        new Date(item.date).toISOString().split('T')[0] === dateStr
      );
      
      if (shift && isValidWorkShift(shift.shift)) {
        consecutiveDays++;
        currentDate.setDate(currentDate.getDate() - 1); // 前一天
      } else {
        break;
      }
    }
    
    // 儲存到快取
    cache.consecutiveDays.set(cacheKey, consecutiveDays);
    return consecutiveDays;
  } else {
    // ScheduleManager 的原始資料結構
    const today = getTodayDate();
    
    // 檢查今天是否有上班
    const todayShift = scheduleData[employeeId]?.[today.date];
    
    if (!isValidWorkShift(todayShift)) {
      return 0; // 今天沒有上班
    }
    
    // 計算連續上班天數
    let consecutiveDays = 0;
    let currentDay = today.date;
    
    // 向前檢查連續上班天數
    while (currentDay >= 1) {
      const shift = scheduleData[employeeId]?.[currentDay];
      
      if (isValidWorkShift(shift)) {
        consecutiveDays++;
        currentDay--;
      } else {
        break;
      }
    }
    
    // 檢查上個月的最後幾天（跨月連續上班）
    if (currentDay < 1) {
      // 這裡可以進一步實現跨月檢查，但為了簡化，暫時不處理
      // 如果需要跨月檢查，需要載入上個月的班表資料
    }
    
    // 儲存到快取
    cache.consecutiveDays.set(cacheKey, consecutiveDays);
    return consecutiveDays;
  }
};

// 找出連續上班4-6天的同事
const findConsecutiveWorkEmployees = (scheduleData, namesData = {}, minDays = CONSTANTS.MIN_CONSECUTIVE_DAYS, maxDays = CONSTANTS.MAX_CONSECUTIVE_DAYS) => {
  if (!scheduleData) {
    return [];
  }



  const consecutiveEmployees = [];

  // 如果是 ScheduleManager 的資料結構
  if (Array.isArray(scheduleData)) {
    // 獲取所有員工ID
    const employeeIds = [...new Set(scheduleData.map(item => item.employee))];
    
    employeeIds.forEach(employeeId => {
      const consecutiveDays = calculateConsecutiveWorkDays(scheduleData, employeeId, namesData);
      if (consecutiveDays >= minDays && consecutiveDays <= maxDays) {
        const employeeName = namesData[employeeId] || employeeId;
        consecutiveEmployees.push({
          id: employeeId,
          name: employeeName,
          consecutiveDays: consecutiveDays
        });
      }
    });
  } else {
    // ScheduleManager 的原始資料結構
    const employeeIds = Object.keys(scheduleData).filter(id => id !== '_lastUpdated');
    
    employeeIds.forEach(employeeId => {
      const consecutiveDays = calculateConsecutiveWorkDays(scheduleData, employeeId, namesData);
      if (consecutiveDays >= minDays && consecutiveDays <= maxDays) {
        const employeeName = namesData[employeeId] || employeeId;
        consecutiveEmployees.push({
          id: employeeId,
          name: employeeName,
          consecutiveDays: consecutiveDays
        });
      }
    });
  }

  return consecutiveEmployees;
};

// 根據班次分類同事
export const categorizeWorkersByShift = (workers, namesData = {}) => {
  const categorized = {
    morning: [], // 早班
    afternoon: [], // 中班
    evening: [], // 晚班
    all: [] // 所有同事
  };

  workers.forEach(worker => {
    const shift = worker.shift || '';
    const employeeId = worker.employee || '未知';
    
    // 嘗試從姓名資料中獲取實際姓名，如果沒有則使用職員編號
    const employeeName = namesData[employeeId] || employeeId;
    
    categorized.all.push(employeeName);
    
    if (CONSTANTS.SHIFT_KEYWORDS.MORNING.some(keyword => shift.includes(keyword))) {
      categorized.morning.push(employeeName);
    } else if (CONSTANTS.SHIFT_KEYWORDS.AFTERNOON.some(keyword => shift.includes(keyword))) {
      categorized.afternoon.push(employeeName);
    } else if (CONSTANTS.SHIFT_KEYWORDS.EVENING.some(keyword => shift.includes(keyword))) {
      categorized.evening.push(employeeName);
    } else {
      // 如果無法識別班次，加入所有同事
      categorized.all.push(employeeName);
    }
  });

  return categorized;
};

// 處理班表問候模板
export const processScheduleTemplate = (template, scheduleData, namesData = {}) => {
  if (!template || !scheduleData) {
    return null;
  }

  // 檢查時間限制
  if (!checkTimeRestriction(template)) {
    return null; // 不在時間範圍內，不顯示此模板
  }

  const workers = getTodayWorkers(scheduleData);
  
  if (workers.length === 0) {
    return null;
  }

  const categorized = categorizeWorkersByShift(workers, namesData);
  
  // 替換模板變數
  let result = template.message;
  
  // 替換班次變數
  result = replaceShiftVariables(result, categorized);
  
  // 替換人數變數
  result = replaceCountVariables(result, categorized);
  
  // 替換連續上班天數變數
  result = replaceConsecutiveDaysVariables(result, scheduleData, namesData);
  
  // 替換連續上班問候變數
  result = replaceConsecutiveWorkVariables(result, scheduleData, namesData);
  
  // 替換指定天數的連續上班同事變數
  result = replaceSpecificDaysVariables(result, scheduleData, namesData);
  
  // 清理多餘的空格和標點
  result = cleanResultString(result);
  
  // 如果模板包含連續上班問候變數，但沒有找到符合條件的同事，則不顯示此模板
  if (shouldDisplayTemplate(template, scheduleData, namesData)) {
    return result;
  } else {
    return null; // 不顯示此模板
  }
};

// 隨機選擇訊息
const getRandomMessage = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }
  const validMessages = messages.filter(msg => 
    msg && 
    typeof msg === 'string' && 
    msg.trim() !== ''
  );
  if (validMessages.length === 0) {
    return '';
  }
  return validMessages[Math.floor(Math.random() * validMessages.length)];
};

// 生成所有優先級的智能對話
export const generateAllSmartMessages = (scheduleData = null, customRules = [], scheduleTemplates = [], namesData = {}) => {
  const now = new Date();
  const dayOfWeek = getDayOfWeek();
  const allMessages = [];
  

  
  // 1. 自定義規則對話
  if (customRules && Array.isArray(customRules)) {
    const triggeredRules = [];
    
    for (const rule of customRules) {
      if (!rule.enabled) continue;
      
      let shouldTrigger = false;
      
      if (rule.type === 'timeRange') {
        shouldTrigger = isTimeInRange(rule.startTime, rule.endTime);
      } else if (rule.type === 'dayOfWeek') {
        shouldTrigger = rule.day === dayOfWeek && isTimeInRange(rule.startTime, rule.endTime);
      } else if (rule.type === 'specificDate') {
        shouldTrigger = isSpecificDate(rule.month, rule.date);
      }
      
      if (shouldTrigger && rule.messages && Array.isArray(rule.messages) && rule.messages.length > 0 && 
          rule.messages.some(msg => msg && typeof msg === 'string' && msg.trim() !== '')) {
        triggeredRules.push(rule);
      }
    }
    
    if (triggeredRules.length > 0) {
      const randomRule = triggeredRules[Math.floor(Math.random() * triggeredRules.length)];
      const message = getRandomMessage(randomRule.messages);
      if (message && message.trim() !== '') {
        allMessages.push({
          type: 'custom',
          priority: 1,
          message: message,
          source: `自定義規則: ${randomRule.name}`
        });
      }
    }
  }
  
  // 2. 班表問候模板對話
  if (scheduleData && scheduleTemplates && Array.isArray(scheduleTemplates)) {
    const scheduleMessages = processMultipleTemplates(scheduleTemplates, scheduleData, namesData);
    allMessages.push(...scheduleMessages);
  }
  
  // 3. 普通對話（由管理員設定的固定對話）
  // 注意：普通對話不在這裡生成，而是在 CatSpeechBubble 中與智能對話合併
  
  return allMessages;
};

// 主要生成函數（保持向後兼容）
export const generateSmartMessage = (scheduleData = null, customRules = [], scheduleTemplates = [], namesData = {}) => {
  const allMessages = generateAllSmartMessages(scheduleData, customRules, scheduleTemplates, namesData);
  
  // 按優先級排序，返回最高優先級的對話
  allMessages.sort((a, b) => a.priority - b.priority);
  
  if (allMessages.length > 0) {
    return allMessages[0].message;
  }
  
  return '';
};

// 生成多個智能訊息
export const generateSmartMessages = (scheduleData = null, customRules = [], scheduleTemplates = [], namesData = {}, count = 5) => {
  const messages = [];
  
  for (let i = 0; i < count; i++) {
    const message = generateSmartMessage(scheduleData, customRules, scheduleTemplates, namesData);
    if (!messages.includes(message)) {
      messages.push(message);
    }
  }
  
  // 確保至少有預設訊息
  if (messages.length === 0) {
    messages.push('');
  }
  
  return messages;
};

// 驗證時間格式
export const validateTimeFormat = (time) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// 驗證自定義規則
export const validateCustomRule = (rule) => {
  if (!rule.type || !rule.messages || !Array.isArray(rule.messages) || rule.messages.length === 0) {
    return false;
  }
  
  switch (rule.type) {
    case 'timeRange':
      return validateTimeFormat(rule.startTime) && validateTimeFormat(rule.endTime);
    case 'dayOfWeek':
      return ['日', '一', '二', '三', '四', '五', '六'].includes(rule.day) && 
             validateTimeFormat(rule.startTime) && validateTimeFormat(rule.endTime);
    case 'specificDate':
      return rule.month >= 1 && rule.month <= 12 && 
             rule.date >= 1 && rule.date <= 31;
    default:
      return false;
  }
};

// 驗證班表問候模板
export const validateScheduleTemplate = (template) => {
  return template && template.message && template.message.trim() !== '';
};

// 預設自定義規則模板
export const getDefaultCustomRules = () => [
  {
    id: '1',
    name: '早上問候',
    type: 'timeRange',
    startTime: '08:00',
    endTime: '10:00',
    messages: [
      '早安！新的一天開始了～',
      '早上好！今天也要加油喔！',
      '喵～早安！準備好迎接新的一天了嗎？'
    ],
    enabled: false
  },
  {
    id: '2',
    name: '午休提醒',
    type: 'timeRange',
    startTime: '12:00',
    endTime: '13:00',
    messages: [
      '午休時間到了，記得休息一下喔～',
      '喵～該吃午餐了！',
      '午休愉快！'
    ],
    enabled: false
  },
  {
    id: '3',
    name: '週三進貨提醒',
    type: 'dayOfWeek',
    day: '三',
    startTime: '14:00',
    endTime: '16:00',
    messages: [
      '週三下午進貨時間到了，加油！',
      '喵～進貨時間！',
      '週三進貨，辛苦了！'
    ],
    enabled: false
  },
  {
    id: '4',
    name: '週末問候',
    type: 'dayOfWeek',
    day: '六',
    startTime: '09:00',
    endTime: '11:00',
    messages: [
      '週末愉快！好好休息喔～',
      '喵～週末快樂！',
      '週末愉快！享受美好時光～'
    ],
    enabled: false
  }
];

// 預設班表問候模板
export const getDefaultScheduleTemplates = () => [
  {
    id: '1',
    name: '早班問候',
    message: '{早班同事}，早安！今天也要加油喔！',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '2',
    name: '晚班問候',
    message: '{晚班同事}，晚安！今天辛苦了！',
    enabled: false,
    timeRestriction: false,
    startTime: '18:00',
    endTime: '20:00'
  },
  {
    id: '3',
    name: '全體問候',
    message: '{所有同事}，工作辛苦了！',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '4',
    name: '人數統計',
    message: '今天有{總人數}位同事上班，加油！',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '5',
    name: '連續上班關心',
    message: '{連續上班同事}，辛苦了！記得適時休息喔～',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '6',
    name: '連續上班鼓勵',
    message: '{連續上班同事}，真是勤奮！繼續保持！',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '7',
    name: '連續上班提醒',
    message: '提醒：{連續上班同事}，請注意工作時數安排',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '8',
    name: '連續上班統計',
    message: '今天有{連續上班同事數量}位同事連續上班4天以上，大家辛苦了！',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '9',
    name: '連續上班6天提醒',
    message: '{連續上班6天同事}，已經連續上班6天，請務必安排休息！',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '10',
    name: '連續上班5天關心',
    message: '{連續上班5天同事}，連續上班5天辛苦了，記得適時休息喔～',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '11',
    name: '連續上班4天鼓勵',
    message: '{連續上班4天同事}，連續上班4天，工作態度值得肯定！',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '12',
    name: '連續上班6天簡潔提醒',
    message: '{連續上班6天同事}，請務必安排休息！',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  },
  {
    id: '13',
    name: '連續上班5天簡潔關心',
    message: '{連續上班5天同事}，辛苦了，記得適時休息喔～',
    enabled: false,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  }
];

// 根據特定條件生成訊息
export const generateConditionalMessage = (condition, scheduleData = null, customRules = [], scheduleTemplates = [], namesData = {}) => {
  switch (condition) {
    case 'morning':
      return generateSmartMessage(scheduleData, customRules, scheduleTemplates, namesData);
    case 'afternoon':
      return generateSmartMessage(scheduleData, customRules, scheduleTemplates, namesData);
    case 'evening':
      return generateSmartMessage(scheduleData, customRules, scheduleTemplates, namesData);
    case 'night':
      return generateSmartMessage(scheduleData, customRules, scheduleTemplates, namesData);
    case 'weekend':
      return generateSmartMessage(scheduleData, customRules, scheduleTemplates, namesData);
    case 'busy':
      return generateSmartMessage(scheduleData, customRules, scheduleTemplates, namesData);
    case 'quiet':
      return generateSmartMessage(scheduleData, customRules, scheduleTemplates, namesData);
    case 'nightShift':
      return generateSmartMessage(scheduleData, customRules, scheduleTemplates, namesData);
    default:
      return generateSmartMessage(scheduleData, customRules, scheduleTemplates, namesData);
  }
};
