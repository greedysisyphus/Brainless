import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db, auth, checkAdminStatus } from '../utils/firebase';
import { useNavigate } from 'react-router-dom';
import ResponsiveContainer, { 
  ResponsiveGrid, 
  ResponsiveCard, 
  ResponsiveButton, 
  ResponsiveInput, 
  ResponsiveLabel, 
  ResponsiveTitle, 
  ResponsiveText 
} from '../components/common/ResponsiveContainer';
import CustomRuleManager from '../components/CustomRuleManager';

const AdminPanel = () => {
  const [showBubble, setShowBubble] = useState(false);
  const [speechTexts, setSpeechTexts] = useState([]);
  const [intervalSeconds, setIntervalSeconds] = useState(4);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [smartMode, setSmartMode] = useState(false);
  const [customRules, setCustomRules] = useState([]);
  const [scheduleTemplates, setScheduleTemplates] = useState([]);
  const navigate = useNavigate();

  // 檢查管理員狀態
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const adminStatus = await checkAdminStatus(user.uid);
          setIsAdmin(adminStatus);
          if (!adminStatus) {
            setError('您沒有管理員權限');
            setTimeout(() => navigate('/'), 3000);
          }
        } catch (error) {
          setError('檢查權限時發生錯誤');
          console.error('權限檢查失敗:', error);
        }
      } else {
        setIsAdmin(false);
        setError('請先登入');
        setTimeout(() => navigate('/'), 2000);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [navigate]);

  // 載入班表資料
  useEffect(() => {
    const loadScheduleData = async () => {
      try {
        console.log('AdminPanel: 開始載入班表資料...');
        // 從 schedule 集合讀取資料（ScheduleManager 使用的集合）
        const currentMonthDoc = await getDoc(doc(db, 'schedule', 'currentMonth'));
        const nextMonthDoc = await getDoc(doc(db, 'schedule', 'nextMonth'));
        
        console.log('AdminPanel: currentMonthDoc.exists():', currentMonthDoc.exists());
        console.log('AdminPanel: nextMonthDoc.exists():', nextMonthDoc.exists());
        
        let scheduleData = null;
        
        // 優先使用當月資料，如果沒有則使用下月資料
        if (currentMonthDoc.exists()) {
          scheduleData = currentMonthDoc.data();
        } else if (nextMonthDoc.exists()) {
          scheduleData = nextMonthDoc.data();
        }
        
        setScheduleData(scheduleData);
      } catch (error) {
        // 不顯示錯誤，因為班表資料不是必需的
      }
    };

    if (isAdmin) {
      loadScheduleData();
    }
  }, [isAdmin]);

  // 監聽全域設定
  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = onSnapshot(
      doc(db, 'catSpeech', 'global'), 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setShowBubble(data.enabled || false);
          setSpeechTexts(data.texts || []);
          setIntervalSeconds(data.intervalSeconds || 4);
          setSmartMode(data.smartMode || false);
          setCustomRules(data.customRules || []);
          setScheduleTemplates(data.scheduleTemplates || []);
        }
      },
      (error) => {
        console.error('監聽設定失敗:', error);
        setError('載入設定失敗');
      }
    );

    return unsubscribe;
  }, [isAdmin]);

  // 管理員登出
  const handleAdminLogout = async () => {
    try {
      setIsLoading(true);
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('登出失敗:', error);
      setError('登出失敗');
      setIsLoading(false);
    }
  };

  // 更新全域設定
  const updateGlobalSettings = async (newSettings) => {
    if (!isAdmin) return;

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
  };

  // 處理自定義規則變更
  const handleCustomRulesChange = async (newRules) => {
    setCustomRules(newRules);
    await updateGlobalSettings({ 
      texts: speechTexts, 
      enabled: showBubble, 
      intervalSeconds: intervalSeconds,
      smartMode: smartMode,
      customRules: newRules,
      scheduleTemplates: scheduleTemplates
    });
  };

  // 處理班表問候模板變更
  const handleScheduleTemplatesChange = async (newTemplates) => {
    setScheduleTemplates(newTemplates);
    await updateGlobalSettings({ 
      texts: speechTexts, 
      enabled: showBubble, 
      intervalSeconds: intervalSeconds,
      smartMode: smartMode,
      customRules: customRules,
      scheduleTemplates: newTemplates
    });
  };



  // 載入狀態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <ResponsiveText size="lg" className="mb-2">載入中...</ResponsiveText>
          <ResponsiveText size="sm" color="secondary">正在檢查管理員權限</ResponsiveText>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <ResponsiveTitle level={2} className="mb-4">發生錯誤</ResponsiveTitle>
          <ResponsiveText className="mb-6">{error}</ResponsiveText>
          <div className="space-y-3">
            <ResponsiveButton
              onClick={() => navigate('/')}
              variant="primary"
              size="lg"
              className="w-full"
            >
              返回首頁
            </ResponsiveButton>
            <ResponsiveButton
              onClick={() => window.location.reload()}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              重新載入
            </ResponsiveButton>
          </div>
        </div>
      </div>
    );
  }

  // 非管理員
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <ResponsiveContainer>
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <ResponsiveTitle level={1} gradient className="mb-2">
            管理員設定
          </ResponsiveTitle>
        </div>

        {/* 狀態訊息 */}
        {successMessage && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-green-400">✓</div>
              <ResponsiveText color="success">{successMessage}</ResponsiveText>
            </div>
          </div>
        )}

        {/* 登出按鈕 */}
        <div className="flex justify-end mb-6">
          <ResponsiveButton
            onClick={handleAdminLogout}
            variant="danger"
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? '登出中...' : '登出管理員'}
          </ResponsiveButton>
        </div>



        {/* 智能對話規則管理 */}
        <CustomRuleManager
          customRules={customRules}
          scheduleTemplates={scheduleTemplates}
          onRulesChange={handleCustomRulesChange}
          onTemplatesChange={handleScheduleTemplatesChange}
          isSaving={isSaving}
          // 班表資料相關 props
          scheduleData={scheduleData}
          // 對話管理相關 props
          speechTexts={speechTexts}
          onSpeechTextsChange={(newTexts) => updateGlobalSettings({ 
            texts: newTexts, 
            enabled: showBubble, 
            intervalSeconds: intervalSeconds,
            smartMode: smartMode,
            customRules: customRules,
            scheduleTemplates: scheduleTemplates
          })}
          showBubble={showBubble}
          onShowBubbleChange={(newShowBubble) => updateGlobalSettings({ 
            texts: speechTexts, 
            enabled: newShowBubble, 
            intervalSeconds: intervalSeconds,
            smartMode: smartMode,
            customRules: customRules,
            scheduleTemplates: scheduleTemplates
          })}
          intervalSeconds={intervalSeconds}
          onIntervalSecondsChange={(newInterval) => updateGlobalSettings({ 
            texts: speechTexts, 
            enabled: showBubble, 
            intervalSeconds: newInterval,
            smartMode: smartMode,
            customRules: customRules,
            scheduleTemplates: scheduleTemplates
          })}
          smartMode={smartMode}
          onSmartModeChange={(newSmartMode) => updateGlobalSettings({ 
            texts: speechTexts, 
            enabled: showBubble, 
            intervalSeconds: intervalSeconds,
            smartMode: newSmartMode,
            customRules: customRules,
            scheduleTemplates: scheduleTemplates
          })}
        />


      </ResponsiveContainer>
    </div>
  );
};

export default AdminPanel;
