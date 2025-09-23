import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';

// 管理員設定 Hook
export const useAdminSettings = () => {
  const [settings, setSettings] = useState({
    showBubble: false,
    speechTexts: [],
    intervalSeconds: 4,
    smartMode: false,
    customRules: [],
    scheduleTemplates: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 載入設定
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'catSpeech', 'global'), 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSettings({
            showBubble: data.enabled || false,
            speechTexts: data.texts || [],
            intervalSeconds: data.intervalSeconds || 4,
            smartMode: data.smartMode || false,
            customRules: data.customRules || [],
            scheduleTemplates: data.scheduleTemplates || []
          });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('監聽設定失敗:', error);
        setError('載入設定失敗');
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // 更新設定
  const updateSettings = useCallback(async (newSettings) => {
    try {
      setIsSaving(true);
      setError('');
      setSuccessMessage('');
      
      await setDoc(doc(db, 'catSpeech', 'global'), {
        ...newSettings,
        lastUpdated: serverTimestamp(),
        updatedBy: auth.currentUser?.uid
      });
      
      setSuccessMessage('設定已更新');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('更新設定失敗:', error);
      setError('更新設定失敗');
    } finally {
      setIsSaving(false);
    }
  }, []);

  // 清除訊息
  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMessage('');
  }, []);

  return {
    settings,
    isLoading,
    isSaving,
    error,
    successMessage,
    updateSettings,
    clearMessages
  };
};
