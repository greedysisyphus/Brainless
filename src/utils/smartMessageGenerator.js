// 智能對話生成器
// 支援精確時間控制、班表同步和固定日期設定

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
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
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
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const todayDate = today.getDate();

  // 處理 ScheduleManager 的資料結構
  for (const [employeeId, schedule] of Object.entries(scheduleData)) {
    if (employeeId === '_lastUpdated') continue;
    
    if (schedule && typeof schedule === 'object') {
      for (const [dateStr, shift] of Object.entries(schedule)) {
        if (shift && shift.trim() && shift !== '休假' && shift !== '特休' && shift !== '月休' && shift !== '休') {
          const date = parseInt(dateStr);
          
          if (date === todayDate) {
            const convertedItem = {
              id: `${employeeId}_${date}`,
              date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
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
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const filteredWorkers = scheduleData.filter(item => {
      const itemDate = new Date(item.date);
      const itemDateStr = itemDate.toISOString().split('T')[0];
      const isToday = itemDateStr === todayStr;
      const isValidShift = item.shift !== '休假' && item.shift !== '特休' && item.shift !== '月休' && item.shift !== '休';
      return isToday && isValidShift;
    });
    
    return filteredWorkers;
  } else {
    // ScheduleManager 的原始資料結構，需要轉換
    const converted = convertScheduleData(scheduleData);
    return converted;
  }
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
    
    if (shift.includes('早班') || shift.includes('早') || shift.includes('Morning') || shift.includes('K') || shift.includes('KK')) {
      categorized.morning.push(employeeName);
    } else if (shift.includes('中班') || shift.includes('中') || shift.includes('Mid') || shift.includes('L')) {
      categorized.afternoon.push(employeeName);
    } else if (shift.includes('晚班') || shift.includes('晚') || shift.includes('Evening') || shift.includes('Y')) {
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
  if (template.timeRestriction) {
    const isInTimeRange = isTimeInRange(template.startTime, template.endTime);
    if (!isInTimeRange) {
      return null; // 不在時間範圍內，不顯示此模板
    }
  }

  const workers = getTodayWorkers(scheduleData);
  
  if (workers.length === 0) {
    return null;
  }

  const categorized = categorizeWorkersByShift(workers, namesData);
  
  // 替換模板變數
  let result = template.message;
  
  // 替換班次變數
  result = result.replace(/\{早班同事\}/g, categorized.morning.length > 0 ? categorized.morning.join('、') : '');
  result = result.replace(/\{中班同事\}/g, categorized.afternoon.length > 0 ? categorized.afternoon.join('、') : '');
  result = result.replace(/\{晚班同事\}/g, categorized.evening.length > 0 ? categorized.evening.join('、') : '');
  result = result.replace(/\{所有同事\}/g, categorized.all.length > 0 ? categorized.all.join('、') : '');
  
  // 替換人數變數
  result = result.replace(/\{早班人數\}/g, categorized.morning.length.toString());
  result = result.replace(/\{中班人數\}/g, categorized.afternoon.length.toString());
  result = result.replace(/\{晚班人數\}/g, categorized.evening.length.toString());
  result = result.replace(/\{總人數\}/g, categorized.all.length.toString());
  
  // 清理多餘的空格和標點
  result = result.replace(/\s*[，、]\s*$/g, ''); // 移除結尾的逗號和頓號
  result = result.replace(/^\s*[，、]\s*/g, ''); // 移除開頭的逗號和頓號
  result = result.replace(/\s+/g, ' '); // 合併多個空格
  
  return result;
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
    const enabledTemplates = scheduleTemplates.filter(template => template.enabled);
    
    if (enabledTemplates.length > 0) {
      // 處理所有啟用的模板，而不是隨機選擇一個
      for (const template of enabledTemplates) {
        const processedMessage = processScheduleTemplate(template, scheduleData, namesData);
        
        if (processedMessage && typeof processedMessage === 'string' && processedMessage.trim() !== '') {
          const messageObj = {
            type: 'schedule',
            priority: 2,
            message: processedMessage,
            source: `班表模板: ${template.name}`
          };
          allMessages.push(messageObj);
        }
      }
    }
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
