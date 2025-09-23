import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { generateAllSmartMessages, clearSmartMessageCache } from '../utils/smartMessageGenerator';

// 智能對話生成 Hook（帶性能優化）
export const useSmartMessageGeneration = ({
  scheduleData,
  customRules = [],
  scheduleTemplates = [],
  namesData = {},
  smartMode = false,
  enabled = false
}) => {
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  
  // 使用 ref 來避免不必要的重新生成
  const lastParamsRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // 檢查參數是否改變
  const paramsChanged = useCallback((newParams) => {
    const lastParams = lastParamsRef.current;
    if (!lastParams) return true;

    return (
      newParams.scheduleData !== lastParams.scheduleData ||
      JSON.stringify(newParams.customRules) !== JSON.stringify(lastParams.customRules) ||
      JSON.stringify(newParams.scheduleTemplates) !== JSON.stringify(lastParams.scheduleTemplates) ||
      JSON.stringify(newParams.namesData) !== JSON.stringify(lastParams.namesData) ||
      newParams.smartMode !== lastParams.smartMode ||
      newParams.enabled !== lastParams.enabled
    );
  }, []);

  // 生成智能對話（帶防抖）
  const generateMessages = useCallback(async () => {
    if (!smartMode || !enabled) {
      setMessages([]);
      return;
    }

    const currentParams = {
      scheduleData,
      customRules,
      scheduleTemplates,
      namesData,
      smartMode,
      enabled
    };

    // 如果參數沒有改變，不重新生成
    if (!paramsChanged(currentParams)) {
      return;
    }

    // 清除之前的防抖計時器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 設置防抖計時器
    debounceTimerRef.current = setTimeout(async () => {
      try {
        setIsGenerating(true);
        
        // 清理快取
        clearSmartMessageCache();
        
        const newMessages = generateAllSmartMessages(
          scheduleData,
          customRules,
          scheduleTemplates,
          namesData
        );
        
        setMessages(newMessages);
        setLastGenerated(Date.now());
        lastParamsRef.current = currentParams;
      } catch (error) {
        console.error('生成智能對話失敗:', error);
        setMessages([]);
      } finally {
        setIsGenerating(false);
      }
    }, 300); // 300ms 防抖
  }, [
    scheduleData,
    customRules,
    scheduleTemplates,
    namesData,
    smartMode,
    enabled,
    paramsChanged
  ]);

  // 當參數改變時重新生成
  useEffect(() => {
    generateMessages();
  }, [generateMessages]);

  // 清理防抖計時器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 手動刷新
  const refresh = useCallback(() => {
    lastParamsRef.current = null;
    generateMessages();
  }, [generateMessages]);

  // 統計信息
  const stats = useMemo(() => {
    const enabledRules = customRules.filter(rule => rule.enabled).length;
    const enabledTemplates = scheduleTemplates.filter(template => template.enabled).length;
    const totalMessages = messages.length;
    
    return {
      enabledRules,
      enabledTemplates,
      totalMessages,
      lastGenerated: lastGenerated ? new Date(lastGenerated).toLocaleString() : null
    };
  }, [customRules, scheduleTemplates, messages, lastGenerated]);

  return {
    messages,
    isGenerating,
    stats,
    refresh
  };
};
