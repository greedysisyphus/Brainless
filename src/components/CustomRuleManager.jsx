import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveCard, ResponsiveButton, ResponsiveInput, ResponsiveLabel, ResponsiveText, ResponsiveTitle } from './common/ResponsiveContainer';
import { validateCustomRule, getDefaultCustomRules, validateScheduleTemplate, getDefaultScheduleTemplates, generateAllSmartMessages, processScheduleTemplate, categorizeWorkersByShift, findConsecutiveWorkEmployees } from '../utils/smartMessageGenerator';
import { doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 可拖拽的對話項目組件
const SortableDialogueItem = ({ msg, index, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: msg.id || index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-3 cursor-move hover:bg-white/10 transition-all ${
        msg.isCurrentlyTriggered 
          ? 'bg-green-500/10 border-green-400/30' 
          : 'bg-white/5 border-white/10'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded -full flex items-center justify-center text-xs text-white ${
            msg.isCurrentlyTriggered ? 'bg-green-600' : 'bg-gray-600'
          }`}>
            {index + 1}
          </div>
          <ResponsiveText size="sm" className={`font-bold ${
            msg.isCurrentlyTriggered ? 'text-green-400' : 'text-gray-400'
          }`}>
            {msg.source}
            {msg.isCurrentlyTriggered && <span className="ml-1 text-xs">(當前觸發)</span>}
          </ResponsiveText>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs ${
            msg.type === 'custom' ? 'bg-purple-500/20 text-purple-400' :
            msg.type === 'schedule' ? 'bg-blue-500/20 text-blue-400' :
            msg.type === 'normal' ? 'bg-orange-500/20 text-orange-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {msg.type === 'custom' ? '自定義規則' :
             msg.type === 'schedule' ? '班表模板' :
             msg.type === 'normal' ? '普通對話' : '其他'}
          </span>
          {onDelete && (
            <ResponsiveButton
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(index, msg.id);
              }}
              variant="ghost"
              size="sm"
              className="p-1 text-red-400 hover:text-red-300"
              title="刪除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </ResponsiveButton>
          )}
        </div>
      </div>
      <ResponsiveText className={`${
        msg.isCurrentlyTriggered ? 'text-green-200' : 'text-white'
      }`}>
        {msg.message}
      </ResponsiveText>
    </div>
  );
};

const CustomRuleManager = ({
  customRules = [],
  scheduleTemplates = [],
  onRulesChange,
  onTemplatesChange,
  isSaving = false,
  // 班表資料相關 props
  scheduleData: propScheduleData = null,
  // 新增對話管理相關 props
  speechTexts = [],
  onSpeechTextsChange,
  showBubble = false,
  onShowBubbleChange,
  intervalSeconds = 4,
  onIntervalSecondsChange,
  smartMode = false,
  onSmartModeChange
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [activeTab, setActiveTab] = useState('custom'); // 'custom' 或 'schedule'
  const [showVariableHelp, setShowVariableHelp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'timeRange',
    startTime: '08:00',
    endTime: '10:00',
    day: '一',
    month: 1,
    date: 1,
    allDay: false,
    messages: [''],
    enabled: true
  });
  const [scheduleData, setScheduleData] = useState(null);
  const [namesData, setNamesData] = useState({});
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [excludedDialogueIds, setExcludedDialogueIds] = useState(new Set());

  // 使用 props 中的班表資料或載入自己的班表資料
  useEffect(() => {
    if (propScheduleData) {
      // 優先使用從 props 傳來的班表資料
      setScheduleData(propScheduleData);
    } else {
      // 如果沒有 props 資料，則載入自己的班表資料
      const loadScheduleData = async () => {
        try {
          setIsLoadingSchedule(true);
          const currentMonthDoc = await getDoc(doc(db, 'schedule', 'currentMonth'));
          const nextMonthDoc = await getDoc(doc(db, 'schedule', 'nextMonth'));
          
          let data = null;
          if (currentMonthDoc.exists()) {
            data = currentMonthDoc.data();
          } else if (nextMonthDoc.exists()) {
            data = nextMonthDoc.data();
          }
          
          setScheduleData(data);
        } catch (error) {
          console.error('載入班表資料失敗:', error);
        } finally {
          setIsLoadingSchedule(false);
        }
      };

      loadScheduleData();
    }
  }, [propScheduleData]);

  // 載入同事姓名資料
  useEffect(() => {
    const loadNamesData = async () => {
      try {
        setIsLoadingNames(true);
        const namesSnapshot = await getDocs(collection(db, 'names'));
        const names = {};
        namesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name) {
            names[doc.id] = data.name;
          }
        });
        setNamesData(names);
      } catch (error) {
        console.error('載入同事姓名資料失敗:', error);
      } finally {
        setIsLoadingNames(false);
      }
    };

    loadNamesData();
  }, []);

  // 載入已保存的對話排序（優先從雲端載入）
  useEffect(() => {
    const loadDialogueOrder = async () => {
      try {
        // 優先從 Firebase 雲端載入
        const dialogueOrderDoc = await getDoc(doc(db, 'catSpeech', 'dialogueOrder'));
        
        if (dialogueOrderDoc.exists()) {
          const data = dialogueOrderDoc.data();
          if (data.dialogues && Array.isArray(data.dialogues)) {
            setSortedDialogues(data.dialogues);
            setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : '未知');
            return;
          }
        }
        
        // 如果雲端沒有數據，嘗試從 localStorage 載入
        const savedOrder = localStorage.getItem('dialogueOrder');
        if (savedOrder) {
          const parsedOrder = JSON.parse(savedOrder);
          setSortedDialogues(parsedOrder);
        }
      } catch (error) {
        console.error('載入對話排序失敗:', error);
        
        // 如果雲端載入失敗，嘗試從 localStorage 載入
        try {
          const savedOrder = localStorage.getItem('dialogueOrder');
          if (savedOrder) {
            const parsedOrder = JSON.parse(savedOrder);
            setSortedDialogues(parsedOrder);
          }
        } catch (localError) {
          console.error('本地備份載入也失敗:', localError);
        }
      }
    };

    loadDialogueOrder();
  }, []);

  // 生成當前激活的對話列表（使用 useMemo 優化）
  const uniqueDialogues = useMemo(() => {
    // 生成當前觸發的智能對話
    const allMessages = generateAllSmartMessages(scheduleData, customRules, scheduleTemplates, namesData);
    
    const allDialogues = [];

    // 只添加當前觸發的智能對話
    allMessages.forEach((msg, index) => {
      allDialogues.push({
        ...msg,
        id: msg.id || `${msg.type}-${msg.message.substring(0, 10)}`, // 使用與 CatSpeechBubble 一致的 ID 格式
        priority: 3,
        isCurrentlyTriggered: true
      });
    });

    // 添加普通對話
    const filteredNormalTexts = speechTexts.filter(text => text.trim() !== '');
    
    filteredNormalTexts.forEach((text, index) => {
      allDialogues.push({
        id: `normal-${text}`,
        type: 'normal',
        priority: 999,
        message: text,
        source: '普通對話',
        isNormal: true,
        isCurrentlyTriggered: false
      });
    });

    // 去重並過濾被排除的對話
    const uniqueDialogues = [];
    const seenIds = new Set();

    allDialogues.forEach(msg => {
      if (!seenIds.has(msg.id) && !excludedDialogueIds.has(msg.id)) {
        seenIds.add(msg.id);
        uniqueDialogues.push(msg);
      }
    });

    return uniqueDialogues;
  }, [customRules, scheduleTemplates, scheduleData, namesData, speechTexts, excludedDialogueIds]);

  // 當 uniqueDialogues 變化時，智能更新 sortedDialogues
  useEffect(() => {
    if (uniqueDialogues.length > 0) {
      setSortedDialogues(prev => {
        // 如果 prev 為空或是初始化狀態，直接使用 uniqueDialogues
        if (prev.length === 0) {
          return uniqueDialogues;
        }
        
        // 否則，合併邏輯：保留現有順序，添加新的對話，移除已不存在的對話（但保留被排除的）
        const prevIds = new Set(prev.map(item => item.id));
        const newIds = new Set(uniqueDialogues.map(item => item.id));
        
        // 過濾掉已經被排除的對話，以及不再存在於 uniqueDialogues 中的對話
        const filtered = prev.filter(item => 
          !excludedDialogueIds.has(item.id) && newIds.has(item.id)
        );
        
        // 添加新的對話
        const newItems = uniqueDialogues.filter(item => !prevIds.has(item.id));
        
        // 保持現有順序，添加新項目在末尾
        return [...filtered, ...newItems];
      });
    }
  }, [uniqueDialogues, excludedDialogueIds]);



  // 轉換班表資料為智能對話系統格式
  const convertScheduleDataForPreview = (scheduleData) => {
    if (!scheduleData || typeof scheduleData !== 'object') {
      return [];
    }

    const converted = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const todayDate = today.getDate();

    for (const [employeeId, schedule] of Object.entries(scheduleData)) {
      if (employeeId === '_lastUpdated') continue;
      
      if (schedule && typeof schedule === 'object') {
        for (const [dateStr, shift] of Object.entries(schedule)) {
          if (shift && shift.trim() && shift !== '休假' && shift !== '特休' && shift !== '月休') {
            const date = parseInt(dateStr);
            if (date === todayDate) {
              converted.push({
                id: `${employeeId}_${date}`,
                date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
                shift: shift,
                employee: employeeId
              });
            }
          }
        }
      }
    }

    return converted;
  };



  // 班表問候模板相關函數
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    message: '',
    enabled: true,
    timeRestriction: false,
    startTime: '08:00',
    endTime: '10:00'
  });
  const [editingTemplate, setEditingTemplate] = useState(null);

  // 對話管理相關狀態
  const [newMessage, setNewMessage] = useState('');
  const [sortedDialogues, setSortedDialogues] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  
  // 拖拽傳感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 添加新對話（對話管理用）
  const addNewDialogue = async () => {
    if (newMessage.trim() && onSpeechTextsChange) {
      const updatedTexts = [...speechTexts, newMessage.trim()];
      try {
        await onSpeechTextsChange(updatedTexts);
        setNewMessage('');
      } catch (error) {
        console.error('添加對話失敗:', error);
      }
    }
  };

  // 刪除對話（對話管理用）
  const deleteDialogue = async (index) => {
    if (onSpeechTextsChange) {
      const updatedTexts = speechTexts.filter((_, i) => i !== index);
      try {
        await onSpeechTextsChange(updatedTexts);
      } catch (error) {
        console.error('刪除對話失敗:', error);
      }
    }
  };

  // 拖拽結束處理函數
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSortedDialogues((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // 刪除排序後的對話
  const deleteSortedDialogue = (index, dialogueId) => {
    if (!dialogueId && sortedDialogues[index]) {
      dialogueId = sortedDialogues[index].id;
    }
    
    if (dialogueId) {
      // 將對話ID添加到排除列表
      setExcludedDialogueIds(prev => new Set([...prev, dialogueId]));
      // 同時從排序列表中移除
    setSortedDialogues(prev => prev.filter((_, i) => i !== index));
    }
  };

  // 保存排序設置到雲端
  const saveDialogueOrder = async () => {
    try {
      setSaveStatus('保存中...');
      
      // 準備要保存的數據
      const dialogueOrderData = {
        dialogues: sortedDialogues,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      
      // 保存到 Firebase 雲端
      await setDoc(doc(db, 'catSpeech', 'dialogueOrder'), dialogueOrderData);
      
      // 同時保存到 localStorage 作為備份
      localStorage.setItem('dialogueOrder', JSON.stringify(sortedDialogues));
      
      setSaveStatus('保存成功！');
      setLastUpdated(new Date().toLocaleString());
      
      
      // 3秒後清除狀態
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } catch (error) {
      setSaveStatus('保存失敗');
      console.error('保存對話排序失敗:', error);
      
      // 3秒後清除錯誤狀態
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    }
  };

  // 重置排序
  const resetDialogueOrder = () => {
    // 清除排除列表
    setExcludedDialogueIds(new Set());
    
    const allMessages = generateAllSmartMessages(scheduleData, customRules, scheduleTemplates, namesData);
    const smartTextsContent = allMessages.map(msg => msg.message).filter(text => text && typeof text === 'string' && text.trim() !== '');
    const filteredNormalTexts = speechTexts.filter(text => 
      text && typeof text === 'string' && text.trim() !== '' && !smartTextsContent.includes(text)
    );
    
    const allDialogues = [
      ...allMessages.map(msg => ({
        ...msg,
        id: `smart-${msg.source}-${msg.message.substring(0, 10)}`,
        isNormal: false
      })),
      ...filteredNormalTexts.map(text => ({
        id: `normal-${text.substring(0, 10)}`,
        type: 'normal',
        priority: 999,
        message: text,
        source: '普通對話',
        isNormal: true
      }))
    ];
    
    const uniqueDialogues = [];
    const seenMessages = new Set();
    for (const msg of allDialogues) {
      if (!seenMessages.has(msg.message)) {
        uniqueDialogues.push(msg);
        seenMessages.add(msg.message);
      }
    }
    
    setSortedDialogues(uniqueDialogues);
  };

  // 重置模板表單
  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      message: '',
      enabled: true,
      timeRestriction: false,
      startTime: '08:00',
      endTime: '10:00'
    });
    setEditingTemplate(null);
    setShowAddForm(false);
  };

  // 處理模板表單變更
  const handleTemplateFormChange = (field, value) => {
    setTemplateFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 檢查時間是否在限制範圍內
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





  // 重置表單
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'timeRange',
      startTime: '08:00',
      endTime: '10:00',
      day: '一',
      month: 1,
      date: 1,
      allDay: false,
      messages: [''],
      enabled: true
    });
    setEditingRule(null);
    setShowAddForm(false);
  };

  // 處理表單變更
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 處理對話訊息變更
  const handleMessageChange = (index, value) => {
    const newMessages = [...formData.messages];
    newMessages[index] = value;
    setFormData(prev => ({
      ...prev,
      messages: newMessages
    }));
  };

  // 添加新對話
  const addNewMessage = () => {
    setFormData(prev => ({
      ...prev,
      messages: [...prev.messages, '']
    }));
  };

  // 刪除對話
  const removeMessage = (index) => {
    if (formData.messages.length > 1) {
      const newMessages = formData.messages.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        messages: newMessages
      }));
    }
  };

  // 添加或更新規則
  const handleSaveRule = () => {
    if (!formData.name.trim()) {
      alert('請填寫規則名稱');
      return;
    }

    const validMessages = formData.messages.filter(msg => msg && typeof msg === 'string' && msg.trim() !== '');
    if (validMessages.length === 0) {
      alert('請至少添加一個對話內容');
      return;
    }

    const newRule = {
      id: editingRule ? editingRule.id : Date.now().toString(),
      ...formData,
      messages: validMessages
    };

    if (!validateCustomRule(newRule)) {
      alert('規則設定有誤，請檢查時間格式');
      return;
    }

    let updatedRules;
    if (editingRule) {
      updatedRules = customRules.map(rule =>
        rule.id === editingRule.id ? newRule : rule
      );
    } else {
      updatedRules = [...customRules, newRule];
    }

    onRulesChange(updatedRules);
    resetForm();
  };

  // 刪除規則
  const handleDeleteRule = (ruleId) => {
    if (window.confirm('確定要刪除這個規則嗎？')) {
      const updatedRules = customRules.filter(rule => rule.id !== ruleId);
      onRulesChange(updatedRules);
    }
  };

  // 切換規則啟用狀態
  const handleToggleRule = (ruleId) => {
    const updatedRules = customRules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );
    onRulesChange(updatedRules);
  };

  // 編輯規則
  const handleEditRule = (rule) => {
    setFormData({
      name: rule.name,
      type: rule.type,
      startTime: rule.startTime || '08:00',
      endTime: rule.endTime || '10:00',
      day: rule.day || '一',
      month: rule.month || 1,
      date: rule.date || 1,
      allDay: rule.allDay || false,
      messages: rule.messages || [''],
      enabled: rule.enabled
    });
    setEditingRule(rule);
    setShowAddForm(true);
  };

  // 載入預設規則
  const handleLoadDefaults = () => {
    if (window.confirm('確定要載入預設規則嗎？這會覆蓋現有的自定義規則。')) {
      onRulesChange(getDefaultCustomRules());
    }
  };

  // 添加或更新模板
  const handleSaveTemplate = () => {
    if (!templateFormData.name.trim()) {
      alert('請填寫模板名稱');
      return;
    }

    if (!templateFormData.message.trim()) {
      alert('請填寫問候語內容');
      return;
    }

    const newTemplate = {
      id: editingTemplate ? editingTemplate.id : Date.now().toString(),
      ...templateFormData
    };

    if (!validateScheduleTemplate(newTemplate)) {
      alert('模板設定有誤，請檢查內容');
      return;
    }

    let updatedTemplates;
    if (editingTemplate) {
      updatedTemplates = scheduleTemplates.map(template => 
        template.id === editingTemplate.id ? newTemplate : template
      );
    } else {
      updatedTemplates = [...scheduleTemplates, newTemplate];
    }

    onTemplatesChange(updatedTemplates);
    resetTemplateForm();
  };

  // 刪除模板
  const handleDeleteTemplate = (templateId) => {
    if (window.confirm('確定要刪除這個模板嗎？')) {
      const updatedTemplates = scheduleTemplates.filter(template => template.id !== templateId);
      onTemplatesChange(updatedTemplates);
    }
  };

  // 切換模板啟用狀態
  const handleToggleTemplate = (templateId) => {
    const updatedTemplates = scheduleTemplates.map(template => 
      template.id === templateId ? { ...template, enabled: !template.enabled } : template
    );
    onTemplatesChange(updatedTemplates);
  };

  // 編輯模板
  const handleEditTemplate = (template) => {
    setTemplateFormData({
      name: template.name,
      message: template.message,
      enabled: template.enabled,
      timeRestriction: template.timeRestriction || false,
      startTime: template.startTime || '08:00',
      endTime: template.endTime || '10:00'
    });
    setEditingTemplate(template);
    setShowAddForm(true);
  };

  // 載入預設模板
  const handleLoadDefaultTemplates = () => {
    const defaultTemplates = getDefaultScheduleTemplates();
    onTemplatesChange(defaultTemplates);
  };



  // 預覽所有智能對話
  const previewAllSmartMessages = () => {
    if (isLoadingSchedule) {
      alert('請稍候，正在載入班表資料...');
      return;
    }
    if (isLoadingNames) {
      alert('請稍候，正在載入姓名資料...');
      return;
    }
    if (!scheduleData) {
      alert('無班表資料，無法預覽所有智能對話。');
      return;
    }
    if (Object.keys(namesData).length === 0) {
      alert('無姓名資料，將顯示職員編號。');
    }

    const allMessages = generateAllSmartMessages(scheduleData, customRules, scheduleTemplates, namesData);
    const messageList = allMessages.map((msg, index) => 
      `${index + 1}. [${msg.source}] ${msg.message}`
    ).join('\n\n');
    
    if (allMessages.length === 0) {
      alert('目前沒有觸發的智能對話。\n\n只會播放您設定的普通對話。');
    } else {
      alert(`智能對話預覽 (共${allMessages.length}條)：\n\n${messageList}\n\n注意：這些對話會與您設定的普通對話一起輪流播放。`);
    }
  };

  // 渲染類型特定欄位
  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'timeRange':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) => handleFormChange('allDay', e.target.checked)}
                disabled={isSaving}
                className="w-5 h-5 disabled:opacity-50"
              />
              <ResponsiveLabel htmlFor="allDay" className="!mb-0">
                全天（24小時）
              </ResponsiveLabel>
            </div>
            
            {!formData.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ResponsiveLabel htmlFor="startTime" required>
                    開始時間
                  </ResponsiveLabel>
                  <ResponsiveInput
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <ResponsiveLabel htmlFor="endTime" required>
                    結束時間
                  </ResponsiveLabel>
                  <ResponsiveInput
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleFormChange('endTime', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            )}
          </div>
        );
      case 'dayOfWeek':
        return (
          <div className="space-y-4">
            <div>
              <ResponsiveLabel htmlFor="daySelect" required>
                星期幾
              </ResponsiveLabel>
              <select
                id="daySelect"
                value={formData.day}
                onChange={(e) => handleFormChange('day', e.target.value)}
                disabled={isSaving}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                <option value="一">星期一</option>
                <option value="二">星期二</option>
                <option value="三">星期三</option>
                <option value="四">星期四</option>
                <option value="五">星期五</option>
                <option value="六">星期六</option>
                <option value="日">星期日</option>
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) => handleFormChange('allDay', e.target.checked)}
                disabled={isSaving}
                className="w-5 h-5 disabled:opacity-50"
              />
              <ResponsiveLabel htmlFor="allDay" className="!mb-0">
                全天（24小時）
              </ResponsiveLabel>
            </div>
            
            {!formData.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ResponsiveLabel htmlFor="startTime" required>
                    開始時間
                  </ResponsiveLabel>
                  <ResponsiveInput
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <ResponsiveLabel htmlFor="endTime" required>
                    結束時間
                  </ResponsiveLabel>
                  <ResponsiveInput
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleFormChange('endTime', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            )}
          </div>
        );
      case 'specificDate':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ResponsiveLabel htmlFor="month" required>
                月份
              </ResponsiveLabel>
              <ResponsiveInput
                id="month"
                type="number"
                min="1"
                max="12"
                value={formData.month || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 1 : parseInt(value);
                  handleFormChange('month', isNaN(numValue) ? 1 : numValue);
                }}
                disabled={isSaving}
              />
            </div>
            <div>
              <ResponsiveLabel htmlFor="date" required>
                日期
              </ResponsiveLabel>
              <ResponsiveInput
                id="date"
                type="number"
                min="1"
                max="31"
                value={formData.date || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 1 : parseInt(value);
                  handleFormChange('date', isNaN(numValue) ? 1 : numValue);
                }}
                disabled={isSaving}
              />
            </div>
          </div>
        );
      case 'monthlyDate':
        return (
          <div className="space-y-4">
            <div>
              <ResponsiveLabel htmlFor="monthlyDate" required>
                每月幾號
              </ResponsiveLabel>
              <div className="grid grid-cols-7 gap-1 bg-white/5 rounded-lg p-3 border border-white/10">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleFormChange('date', day)}
                    disabled={isSaving}
                    className={`p-2 text-sm rounded transition-colors ${
                      formData.date === day
                        ? 'bg-primary text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    } disabled:opacity-50`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) => handleFormChange('allDay', e.target.checked)}
                disabled={isSaving}
                className="w-5 h-5 disabled:opacity-50"
              />
              <ResponsiveLabel htmlFor="allDay" className="!mb-0">
                全天（24小時）
              </ResponsiveLabel>
            </div>
            
            {!formData.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ResponsiveLabel htmlFor="startTime" required>
                    開始時間
                  </ResponsiveLabel>
                  <ResponsiveInput
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <ResponsiveLabel htmlFor="endTime" required>
                    結束時間
                  </ResponsiveLabel>
                  <ResponsiveInput
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleFormChange('endTime', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ResponsiveCard>
      <div className="flex items-center justify-between mb-6">
        <ResponsiveTitle level={2} gradient>
          智能對話規則管理
        </ResponsiveTitle>
        <div className="flex gap-2">
          <ResponsiveButton
            onClick={previewAllSmartMessages}
            variant="secondary"
            size="sm"
            disabled={isSaving || isLoadingSchedule || isLoadingNames}
          >
            預覽所有對話
          </ResponsiveButton>
          <ResponsiveButton
            onClick={() => setShowAddForm(true)}
            variant="primary"
            size="sm"
            disabled={isSaving}
          >
            添加規則
          </ResponsiveButton>
        </div>
      </div>

      {/* 基本設定 */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
        <ResponsiveTitle level={3} className="text-orange-400 mb-4">
          基本設定
        </ResponsiveTitle>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="bubbleToggle"
              checked={showBubble}
              disabled={isSaving}
              onChange={(e) => onShowBubbleChange && onShowBubbleChange(e.target.checked)}
              className="w-5 h-5 disabled:opacity-50"
            />
            <ResponsiveLabel htmlFor="bubbleToggle" className="!mb-0">
              顯示對話輪播
            </ResponsiveLabel>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="smartModeToggle"
              checked={smartMode}
              disabled={isSaving}
              onChange={() => onSmartModeChange && onSmartModeChange(!smartMode)}
              className="w-5 h-5 disabled:opacity-50"
            />
            <ResponsiveLabel htmlFor="smartModeToggle" className="!mb-0">
              智能模式（根據自定義規則和班表問候自動顯示對話）
            </ResponsiveLabel>
          </div>
          
          <div>
            <ResponsiveLabel htmlFor="intervalSlider">
              輪播間隔 ({intervalSeconds}秒)
            </ResponsiveLabel>
            <div className="flex items-center gap-3">
              <input
                type="range"
                id="intervalSlider"
                min="1"
                max="10"
                value={intervalSeconds}
                disabled={isSaving}
                onChange={(e) => onIntervalSecondsChange && onIntervalSecondsChange(parseInt(e.target.value))}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50"
              />
              <span className="text-white min-w-[3rem] text-center">
                {intervalSeconds}s
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1秒</span>
              <span>10秒</span>
            </div>
          </div>
        </div>
      </div>

      {/* 資料載入狀態 */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
        <ResponsiveTitle level={3} className="text-blue-400 mb-2">
          資料載入狀態
        </ResponsiveTitle>
        <ResponsiveText size="sm" className="text-blue-300">
          {isLoadingSchedule ? '載入班表中...' : 
           scheduleData ? 
             `班表資料：${Object.keys(scheduleData).filter(key => key !== '_lastUpdated').length} 位同事` :
             '班表資料：未載入'
          }
        </ResponsiveText>
        {scheduleData && scheduleData._lastUpdated && (
          <ResponsiveText size="sm" className="text-blue-300 mt-1">
            最後更新：{new Date(scheduleData._lastUpdated).toLocaleString()}
          </ResponsiveText>
        )}
        <ResponsiveText size="sm" className="text-blue-300 mt-1">
          {isLoadingNames ? '載入姓名中...' : 
           Object.keys(namesData).length > 0 ? 
             `姓名對應：${Object.keys(namesData).length} 位同事` :
             '姓名對應：未載入'
          }
        </ResponsiveText>
      </div>

      {/* 標籤頁切換 */}
      <div className="flex border-b border-white/10 mb-6">
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'custom'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          自定義規則 ({customRules.length})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'schedule'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          班表問候模板 ({scheduleTemplates.length})
        </button>
        <button
          onClick={() => setActiveTab('dialogue')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'dialogue'
              ? 'text-primary border-b-2 border-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          對話管理 ({speechTexts.length})
        </button>
      </div>

      {/* 自定義規則標籤頁 */}
      {activeTab === 'custom' && (
        <>
          {/* 變數說明 */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
            <ResponsiveTitle level={3} className="text-purple-400 mb-2">
              自定義規則說明
            </ResponsiveTitle>
            <ResponsiveText size="sm" className="text-purple-300">
              可以設定特定時間範圍、星期幾或特定日期的對話規則，系統會根據條件自動顯示對話。
            </ResponsiveText>
          </div>

          {/* 添加/編輯表單 */}
          {showAddForm && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
              <ResponsiveTitle level={3} className="mb-4">
                {editingRule ? '編輯規則' : '添加新規則'}
              </ResponsiveTitle>
              
              <div className="space-y-4">
                <div>
                  <ResponsiveLabel htmlFor="ruleName" required>
                    規則名稱
                  </ResponsiveLabel>
                  <ResponsiveInput
                    id="ruleName"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="例如：早上問候"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <ResponsiveLabel htmlFor="ruleType" required>
                    規則類型
                  </ResponsiveLabel>
                  <select
                    id="ruleType"
                    value={formData.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    disabled={isSaving}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  >
                    <option value="timeRange">時間範圍</option>
                    <option value="dayOfWeek">星期幾</option>
                    <option value="specificDate">特定日期</option>
                    <option value="monthlyDate">每月幾號</option>
                  </select>
                </div>

                {renderTypeSpecificFields()}

                {/* 多對話輸入區域 */}
                <div>
                  <ResponsiveLabel required>
                    對話內容 ({formData.messages.length}條)
                  </ResponsiveLabel>
                  <div className="space-y-2">
                    {formData.messages.map((message, index) => (
                      <div key={index} className="flex gap-2">
                        <ResponsiveInput
                          value={message}
                          onChange={(e) => handleMessageChange(index, e.target.value)}
                          placeholder={`對話 ${index + 1}...`}
                          disabled={isSaving}
                        />
                        <ResponsiveButton
                          onClick={() => removeMessage(index)}
                          variant="danger"
                          size="sm"
                          disabled={isSaving || formData.messages.length <= 1}
                          className="px-3"
                        >
                          刪除
                        </ResponsiveButton>
                      </div>
                    ))}
                    <ResponsiveButton
                      onClick={addNewMessage}
                      variant="secondary"
                      size="sm"
                      disabled={isSaving}
                      className="w-full"
                    >
                      添加對話
                    </ResponsiveButton>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ruleEnabled"
                    checked={formData.enabled}
                    onChange={(e) => handleFormChange('enabled', e.target.checked)}
                    disabled={isSaving}
                    className="w-5 h-5 disabled:opacity-50"
                  />
                  <ResponsiveLabel htmlFor="ruleEnabled" className="!mb-0">
                    啟用此規則
                  </ResponsiveLabel>
                </div>

                <div className="flex gap-2">
                  <ResponsiveButton
                    onClick={handleSaveRule}
                    variant="primary"
                    disabled={isSaving}
                    loading={isSaving}
                  >
                    {editingRule ? '更新規則' : '添加規則'}
                  </ResponsiveButton>
                  <ResponsiveButton
                    onClick={resetForm}
                    variant="secondary"
                    disabled={isSaving}
                  >
                    取消
                  </ResponsiveButton>
                </div>
              </div>
            </div>
          )}

          {/* 規則列表 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <ResponsiveLabel>
                現有規則 ({customRules.length}條)
              </ResponsiveLabel>
              <ResponsiveButton
                onClick={handleLoadDefaults}
                variant="secondary"
                size="sm"
                disabled={isSaving}
              >
                載入預設
              </ResponsiveButton>
            </div>
            
            {customRules.length === 0 ? (
              <ResponsiveText color="secondary" className="text-center py-8">
                暫無自定義規則
              </ResponsiveText>
            ) : (
              customRules.map((rule) => (
                <div key={rule.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule.id)}
                        disabled={isSaving}
                        className="w-4 h-4 disabled:opacity-50"
                      />
                      <ResponsiveTitle level={4} className="!mb-0">
                        {rule.name}
                      </ResponsiveTitle>
                      <span className={`px-2 py-1 rounded text-xs ${
                        rule.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {rule.enabled ? '啟用' : '停用'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <ResponsiveButton
                        onClick={() => handleEditRule(rule)}
                        variant="ghost"
                        size="sm"
                        disabled={isSaving}
                      >
                        編輯
                      </ResponsiveButton>
                      <ResponsiveButton
                        onClick={() => handleDeleteRule(rule.id)}
                        variant="danger"
                        size="sm"
                        disabled={isSaving}
                      >
                        刪除
                      </ResponsiveButton>
                    </div>
                  </div>
                  
                  <ResponsiveText size="sm" color="secondary" className="mb-2">
                    類型：{rule.type === 'timeRange' ? '時間範圍' :
                           rule.type === 'dayOfWeek' ? '星期幾' :
                           rule.type === 'specificDate' ? '特定日期' :
                           rule.type === 'monthlyDate' ? '每月幾號' : '未知類型'}
                  </ResponsiveText>

                  {rule.type === 'timeRange' && (
                    <ResponsiveText size="sm" color="secondary" className="mb-2">
                      時間：{rule.allDay ? '全天' : `${rule.startTime} - ${rule.endTime}`}
                    </ResponsiveText>
                  )}

                  {rule.type === 'dayOfWeek' && (
                    <ResponsiveText size="sm" color="secondary" className="mb-2">
                      星期{rule.day} {rule.allDay ? '全天' : `${rule.startTime} - ${rule.endTime}`}
                    </ResponsiveText>
                  )}

                  {rule.type === 'specificDate' && (
                    <ResponsiveText size="sm" color="secondary" className="mb-2">
                      {rule.month}月{rule.date}日
                    </ResponsiveText>
                  )}

                  {rule.type === 'monthlyDate' && (
                    <ResponsiveText size="sm" color="secondary" className="mb-2">
                      每月{rule.date}日 {rule.allDay ? '全天' : `${rule.startTime} - ${rule.endTime}`}
                    </ResponsiveText>
                  )}

                  <ResponsiveText size="sm" color="secondary" className="mb-2">
                    對話數量：{rule.messages?.length || 0} 條
                  </ResponsiveText>

                  {/* 顯示對話預覽 */}
                  <div className="space-y-1">
                    {rule.messages?.map((message, index) => (
                      <ResponsiveText key={index} className="bg-white/5 rounded p-2 text-sm">
                        {message}
                      </ResponsiveText>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* 班表問候模板標籤頁 */}
      {activeTab === 'schedule' && (
        <>
          {/* 變數說明 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <ResponsiveTitle level={3} className="text-blue-400">
                可用變數說明
              </ResponsiveTitle>
              <ResponsiveButton
                onClick={() => setShowVariableHelp(!showVariableHelp)}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                {showVariableHelp ? '隱藏說明' : '顯示說明'}
                <span className="text-xs">
                  {showVariableHelp ? '▼' : '▶'}
                </span>
              </ResponsiveButton>
            </div>
            
            {showVariableHelp && (
              <div className="space-y-6">
            
            {/* 班次和人數變數 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 班次變數 */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <ResponsiveText size="sm" className="text-blue-300 font-bold mb-3 text-center">
                  📋 班次變數
                </ResponsiveText>
                <div className="space-y-2">
                  <ResponsiveText size="sm" className="text-blue-300">• {'{早班同事}'} - 早班同事名字</ResponsiveText>
                  <ResponsiveText size="sm" className="text-blue-300">• {'{中班同事}'} - 中班同事名字</ResponsiveText>
                  <ResponsiveText size="sm" className="text-blue-300">• {'{晚班同事}'} - 晚班同事名字</ResponsiveText>
                  <ResponsiveText size="sm" className="text-blue-300">• {'{所有同事}'} - 所有上班同事名字</ResponsiveText>
                </div>
                
                <div className="mt-4 pt-3 border-t border-white/10">
                  <ResponsiveText size="sm" className="text-blue-300 font-semibold mb-2">💡 使用範例：</ResponsiveText>
                  <ResponsiveText size="sm" className="text-blue-300">• {'{早班同事}，早安！'} → 小明、小華，早安！</ResponsiveText>
                  <ResponsiveText size="sm" className="text-blue-300">• {'{所有同事}，工作辛苦了！'} → 小明、小華、小美，工作辛苦了！</ResponsiveText>
                </div>
              </div>
              
              {/* 人數變數 */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <ResponsiveText size="sm" className="text-blue-300 font-bold mb-3 text-center">
                  👥 人數變數
                </ResponsiveText>
                <div className="space-y-2">
                  <ResponsiveText size="sm" className="text-blue-300">• {'{早班人數}'} - 早班人數</ResponsiveText>
                  <ResponsiveText size="sm" className="text-blue-300">• {'{中班人數}'} - 中班人數</ResponsiveText>
                  <ResponsiveText size="sm" className="text-blue-300">• {'{晚班人數}'} - 晚班人數</ResponsiveText>
                  <ResponsiveText size="sm" className="text-blue-300">• {'{總人數}'} - 總上班人數</ResponsiveText>
                </div>
                
                <div className="mt-4 pt-3 border-t border-white/10">
                  <ResponsiveText size="sm" className="text-blue-300 font-semibold mb-2">💡 使用範例：</ResponsiveText>
                  <ResponsiveText size="sm" className="text-blue-300">• {'今天有{總人數}位同事上班'} → 今天有5位同事上班</ResponsiveText>
                  <ResponsiveText size="sm" className="text-blue-300">• {'早班{早班人數}人，晚班{晚班人數}人'} → 早班2人，晚班3人</ResponsiveText>
                </div>
              </div>
            </div>
            
            {/* 連續上班變數 */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <ResponsiveText size="sm" className="text-blue-300 font-bold mb-4 text-center">
                ⏰ 連續上班變數
              </ResponsiveText>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 基本變數 */}
                <div>
                  <ResponsiveText size="sm" className="text-blue-300 font-semibold mb-2">
                    🔧 基本變數
                  </ResponsiveText>
                  <div className="space-y-2">
                    <ResponsiveText size="sm" className="text-blue-300">• {'{連續上班同事}'} - 連續上班4-6天的同事（顯示名字+天數）</ResponsiveText>
                    <ResponsiveText size="sm" className="text-blue-300">• {'{連續上班同事數量}'} - 連續上班4-6天的同事數量</ResponsiveText>
                  </div>
                </div>
                
                {/* 指定天數變數 */}
                <div>
                  <ResponsiveText size="sm" className="text-blue-300 font-semibold mb-2">
                    🎯 指定天數變數
                  </ResponsiveText>
                  <div className="space-y-2">
                    <ResponsiveText size="sm" className="text-blue-300">• {'{連續上班X天同事}'} - 指定天數的同事名字（X為數字，只顯示名字）</ResponsiveText>
                    <ResponsiveText size="sm" className="text-blue-300">• {'{連續上班X天同事數量}'} - 指定天數的同事數量</ResponsiveText>
                  </div>
                </div>
              </div>
              
              {/* 使用範例 */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <ResponsiveText size="sm" className="text-blue-300 font-semibold mb-2">
                  💡 使用範例
                </ResponsiveText>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <ResponsiveText size="sm" className="text-blue-300">• {'{連續上班同事}，辛苦了！'}</ResponsiveText>
                    <ResponsiveText size="sm" className="text-gray-400 text-xs">→ 小明連續上班5天、小華連續上班4天，辛苦了！</ResponsiveText>
                  </div>
                  <div className="space-y-1">
                    <ResponsiveText size="sm" className="text-blue-300">• {'{連續上班6天同事}，請務必休息'}</ResponsiveText>
                    <ResponsiveText size="sm" className="text-gray-400 text-xs">→ 紅葉，請務必休息</ResponsiveText>
                  </div>
                  <div className="space-y-1">
                    <ResponsiveText size="sm" className="text-blue-300">• {'今天有{連續上班同事數量}位同事需要關心'}</ResponsiveText>
                    <ResponsiveText size="sm" className="text-gray-400 text-xs">→ 今天有2位同事需要關心</ResponsiveText>
                  </div>
                </div>
              </div>
              
              {/* 功能說明 */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <ResponsiveText size="sm" className="text-blue-300 font-semibold mb-2">
                  ⚙️ 功能說明
                </ResponsiveText>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <ResponsiveText size="sm" className="text-blue-300">• 自動計算：從今天開始往前計算，遇到休假為止</ResponsiveText>
                    <ResponsiveText size="sm" className="text-blue-300">• 智能顯示：沒有符合條件的同事時，模板不會顯示</ResponsiveText>
                  </div>
                  <div className="space-y-1">
                    <ResponsiveText size="sm" className="text-blue-300">• 適用場景：關心同事、提醒休息、表揚勤奮</ResponsiveText>
                    <ResponsiveText size="sm" className="text-blue-300">• 注意事項：需要先在姓名管理中設定同事姓名對應</ResponsiveText>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 添加規則按鈕 */}
            <div className="flex justify-center">
              <ResponsiveButton
                onClick={() => setShowAddForm(true)}
                variant="primary"
                size="sm"
                disabled={isSaving}
              >
                添加規則
              </ResponsiveButton>
            </div>
              </div>
            )}
          </div>

          {/* 添加/編輯表單 */}
          {showAddForm && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
              <ResponsiveTitle level={3} className="mb-4">
                {editingTemplate ? '編輯模板' : '添加新模板'}
              </ResponsiveTitle>
              
              <div className="space-y-4">
                <div>
                  <ResponsiveLabel htmlFor="templateName" required>
                    模板名稱
                  </ResponsiveLabel>
                  <ResponsiveInput
                    id="templateName"
                    value={templateFormData.name}
                    onChange={(e) => handleTemplateFormChange('name', e.target.value)}
                    placeholder="例如：早班問候"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <ResponsiveLabel htmlFor="templateMessage" required>
                    問候語內容
                  </ResponsiveLabel>
                  <ResponsiveInput
                    id="templateMessage"
                    value={templateFormData.message}
                    onChange={(e) => handleTemplateFormChange('message', e.target.value)}
                    placeholder="例如：{早班同事}，早安！今天也要加油喔！"
                    disabled={isSaving}
                  />
                </div>



                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="templateEnabled"
                    checked={templateFormData.enabled}
                    onChange={(e) => handleTemplateFormChange('enabled', e.target.checked)}
                    disabled={isSaving}
                    className="w-5 h-5 disabled:opacity-50"
                  />
                  <ResponsiveLabel htmlFor="templateEnabled" className="!mb-0">
                    啟用此模板
                  </ResponsiveLabel>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="timeRestriction"
                    checked={templateFormData.timeRestriction}
                    onChange={(e) => handleTemplateFormChange('timeRestriction', e.target.checked)}
                    disabled={isSaving}
                    className="w-5 h-5 disabled:opacity-50"
                  />
                  <ResponsiveLabel htmlFor="timeRestriction" className="!mb-0">
                    啟用時間限制
                  </ResponsiveLabel>
                </div>

                {templateFormData.timeRestriction && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <ResponsiveLabel htmlFor="startTime" required>
                        限制開始時間
                      </ResponsiveLabel>
                      <ResponsiveInput
                        id="startTime"
                        type="time"
                        value={templateFormData.startTime}
                        onChange={(e) => handleTemplateFormChange('startTime', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <ResponsiveLabel htmlFor="endTime" required>
                        限制結束時間
                      </ResponsiveLabel>
                      <ResponsiveInput
                        id="endTime"
                        type="time"
                        value={templateFormData.endTime}
                        onChange={(e) => handleTemplateFormChange('endTime', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <ResponsiveButton
                    onClick={handleSaveTemplate}
                    variant="primary"
                    disabled={isSaving}
                    loading={isSaving}
                  >
                    {editingTemplate ? '更新模板' : '添加模板'}
                  </ResponsiveButton>
                  <ResponsiveButton
                    onClick={resetTemplateForm}
                    variant="secondary"
                    disabled={isSaving}
                  >
                    取消
                  </ResponsiveButton>
                </div>
              </div>
            </div>
          )}

          {/* 模板列表 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <ResponsiveLabel>
                現有模板 ({scheduleTemplates.length}條)
              </ResponsiveLabel>
              <ResponsiveButton
                onClick={handleLoadDefaultTemplates}
                variant="secondary"
                size="sm"
                disabled={isSaving}
              >
                載入預設
              </ResponsiveButton>
            </div>
            
            {scheduleTemplates.length === 0 ? (
              <ResponsiveText color="secondary" className="text-center py-8">
                暫無班表問候模板
              </ResponsiveText>
            ) : (
              scheduleTemplates.map((template) => (
                <div key={template.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={template.enabled}
                        onChange={() => handleToggleTemplate(template.id)}
                        disabled={isSaving}
                        className="w-4 h-4 disabled:opacity-50"
                      />
                      <ResponsiveTitle level={4} className="!mb-0">
                        {template.name}
                      </ResponsiveTitle>
                      <span className={`px-2 py-1 rounded text-xs ${
                        template.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {template.enabled ? '啟用' : '停用'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <ResponsiveButton
                        onClick={() => handleEditTemplate(template)}
                        variant="ghost"
                        size="sm"
                        disabled={isSaving}
                      >
                        編輯
                      </ResponsiveButton>
                      <ResponsiveButton
                        onClick={() => handleDeleteTemplate(template.id)}
                        variant="danger"
                        size="sm"
                        disabled={isSaving}
                      >
                        刪除
                      </ResponsiveButton>
                    </div>
                  </div>
                  
                  <ResponsiveText size="sm" color="secondary" className="mb-2">
                    原始模板：{template.message}
                  </ResponsiveText>
                  
                  {template.timeRestriction && (
                    <ResponsiveText size="sm" color="secondary" className="mb-2">
                      時間限制：{template.startTime} - {template.endTime}
                    </ResponsiveText>
                  )}
                  

                </div>
              ))
            )}
          </div>

        </>
      )}

      {/* 對話管理標籤頁 */}
      {activeTab === 'dialogue' && (
        <>
          {/* 添加新對話 */}
          <div className="space-y-4 mb-6">
            <ResponsiveLabel htmlFor="newMessage">
              添加新對話
            </ResponsiveLabel>
            <div className="flex gap-2">
              <ResponsiveInput
                id="newMessage"
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isSaving}
                placeholder="輸入新對話內容..."
                onKeyPress={(e) => e.key === 'Enter' && !isSaving && addNewDialogue()}
              />
              <ResponsiveButton
                onClick={() => addNewDialogue()}
                disabled={isSaving || !newMessage.trim()}
                loading={isSaving}
              >
                {isSaving ? '添加中...' : '添加'}
              </ResponsiveButton>
            </div>
          </div>
            
          {/* 對話列表 */}
          <div className="space-y-3">
            <ResponsiveLabel>
              對話列表 ({speechTexts.length}條)
            </ResponsiveLabel>
            <div className="max-h-64 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-3">
              {speechTexts.length === 0 ? (
                <ResponsiveText color="secondary" className="text-center py-4">
                  暫無對話內容
                </ResponsiveText>
              ) : (
                speechTexts.map((text, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <ResponsiveText className="flex-1">{text}</ResponsiveText>
                    <ResponsiveButton
                      onClick={() => deleteDialogue(index)}
                      variant="ghost"
                      size="sm"
                      disabled={isSaving}
                      className="p-1 text-red-400 hover:text-red-300"
                      title="刪除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </ResponsiveButton>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* 所有對話列表 */}
      <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <ResponsiveTitle level={3} className="text-purple-400">
            當前激活對話列表
          </ResponsiveTitle>
          <div className="flex gap-2">
            <ResponsiveButton
              onClick={saveDialogueOrder}
              variant="ghost"
              size="sm"
              disabled={saveStatus === '保存中...'}
              className="px-3 py-1 text-green-400 hover:text-green-300 border border-green-400/30 hover:border-green-400/50"
            >
              {saveStatus === '保存中...' ? '保存中...' : '保存排序'}
            </ResponsiveButton>
            <ResponsiveButton
              onClick={resetDialogueOrder}
              variant="ghost"
              size="sm"
              className="px-3 py-1 text-blue-400 hover:text-blue-300 border border-blue-400/30 hover:border-blue-400/50"
            >
              重置排序
            </ResponsiveButton>
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg">
          <ResponsiveText size="sm" className="text-blue-300 text-center">
            💡 拖拽對話項目可以調整顯示順序
          </ResponsiveText>
          {lastUpdated && (
            <ResponsiveText size="sm" className="text-gray-400 text-center mt-1">
              最後更新：{lastUpdated}
            </ResponsiveText>
          )}
        </div>
        
        {/* 保存狀態顯示 */}
        {saveStatus && (
          <div className={`mb-4 p-3 rounded-lg border ${
            saveStatus === '保存成功！' 
              ? 'bg-green-500/10 border-green-400/20' 
              : saveStatus === '保存失敗' 
                ? 'bg-red-500/10 border-red-400/20'
                : 'bg-yellow-500/10 border-yellow-400/20'
          }`}>
            <ResponsiveText size="sm" className={`text-center ${
              saveStatus === '保存成功！' 
                ? 'text-green-300' 
                : saveStatus === '保存失敗' 
                  ? 'text-red-300'
                  : 'text-yellow-300'
            }`}>
              {saveStatus}
            </ResponsiveText>
          </div>
        )}
        
        <div className="space-y-3">
          
          {(() => {
            // 檢查是否有對話數據
            if (uniqueDialogues.length === 0) {
              return (
                <ResponsiveText size="sm" className="text-gray-400 text-center py-4">
                  目前沒有任何對話
                </ResponsiveText>
              );
            }
            
            // 只使用當前激活的對話，不進行合併
            let finalDialogues = uniqueDialogues;
            
            // 使用拖拽上下文包裝對話列表
            
            return (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={finalDialogues.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {finalDialogues.map((msg, index) => (
                      <SortableDialogueItem
                        key={msg.id}
                        msg={msg}
                        index={index}
                        onDelete={deleteSortedDialogue}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            );
          })()}
        </div>

        {/* 詳細調試資訊 */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <ResponsiveText size="sm" className="text-blue-300 font-bold mb-2">
            詳細調試資訊：
          </ResponsiveText>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
            <div className="space-y-1">
              <div>班表資料：{scheduleData ? '已載入' : '未載入'}</div>
              <div>姓名資料：{Object.keys(namesData).length > 0 ? `已載入 ${Object.keys(namesData).length} 個` : '未載入'}</div>
              <div>今天上班同事：{scheduleData ? convertScheduleDataForPreview(scheduleData).length : 0} 人</div>
              <div>自定義規則：{customRules.filter(r => r.enabled).length} 個啟用</div>
              <div>班表模板：{scheduleTemplates.filter(t => t.enabled).length} 個啟用</div>
            </div>
            <div className="space-y-1">
              <div>智能對話：{(() => {
                const allMessages = generateAllSmartMessages(scheduleData, customRules, scheduleTemplates, namesData);
                return allMessages.length;
              })()} 條</div>
              <div>普通對話：{speechTexts.length} 條</div>
              <div>總對話數：{(() => {
                const allMessages = generateAllSmartMessages(scheduleData, customRules, scheduleTemplates, namesData);
                return allMessages.length + speechTexts.length;
              })()} 條</div>
              <div>當前時間：{new Date().toLocaleString()}</div>
              <div>星期：{new Date().toLocaleDateString('zh-TW', { weekday: 'long' })}</div>
            </div>
          </div>
          
          {/* 連續上班天數資訊 */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <ResponsiveText size="sm" className="text-blue-300 font-bold mb-2">
              連續上班天數：
            </ResponsiveText>
            <div className="space-y-1 text-xs text-gray-400">
              {(() => {
                const consecutiveEmployees = findConsecutiveWorkEmployees(scheduleData, namesData, 1, 30);
                if (consecutiveEmployees.length === 0) {
                  return <div className="text-gray-500">無連續上班同事</div>;
                }
                
                // 按連續天數分組
                const groupedByDays = {};
                consecutiveEmployees.forEach(emp => {
                  if (!groupedByDays[emp.consecutiveDays]) {
                    groupedByDays[emp.consecutiveDays] = [];
                  }
                  groupedByDays[emp.consecutiveDays].push(emp.name);
                });
                
                // 按天數降序排列，並添加顏色標識
                return Object.entries(groupedByDays)
                  .sort(([a], [b]) => parseInt(b) - parseInt(a))
                  .map(([days, names]) => {
                    const dayNum = parseInt(days);
                    let colorClass = 'text-gray-300'; // 1-3天：灰色
                    if (dayNum >= 6) {
                      colorClass = 'text-red-400'; // 6天以上：紅色（高風險）
                    } else if (dayNum >= 4) {
                      colorClass = 'text-yellow-400'; // 4-5天：黃色（注意）
                    }
                    
                    return (
                      <div key={days} className="bg-white/5 rounded p-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`font-semibold ${colorClass}`}>{days}天：</span>
                          <span className="text-gray-300 ml-1">{names.join('、')}</span>
                        </div>
                        {dayNum >= 4 && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            dayNum >= 6 ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {dayNum >= 6 ? '高風險' : '注意'}
                          </span>
                        )}
                      </div>
                    );
                  });
              })()}
            </div>
          </div>

          {/* 班表模板調試資訊 */}
          {scheduleTemplates.filter(t => t.enabled).length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <ResponsiveText size="sm" className="text-blue-300 font-bold mb-2">
                班表模板調試：
              </ResponsiveText>
              <div className="space-y-1 text-xs text-gray-400">
                {scheduleTemplates.filter(t => t.enabled).map((template, index) => {
                  const workers = convertScheduleDataForPreview(scheduleData);
                  const categorized = categorizeWorkersByShift(workers, namesData);
                  const isInTimeRange = template.timeRestriction ? 
                    isTimeInRange(template.startTime, template.endTime) : true;
                  
                  // 測試模板處理
                  const testMessage = processScheduleTemplate(template, scheduleData, namesData);
                  const willShow = testMessage && typeof testMessage === 'string' && testMessage.trim() !== '';
                  
                  return (
                    <div key={index} className="bg-white/5 rounded p-2">
                      <div>模板：{template.name}</div>
                      <div>時間限制：{template.timeRestriction ? `${template.startTime}-${template.endTime}` : '無'}</div>
                      <div>時間檢查：{isInTimeRange ? '通過' : '不通過'}</div>
                      <div>會顯示：{willShow ? '是' : '否'}</div>
                      {willShow && <div>處理後：{testMessage}</div>}
                      <div>早班同事：{categorized.morning.join('、') || '無'}</div>
                      <div>中班同事：{categorized.afternoon.join('、') || '無'}</div>
                      <div>晚班同事：{categorized.evening.join('、') || '無'}</div>
                      

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>


      </div>
    </ResponsiveCard>
  );
};

export default CustomRuleManager;
