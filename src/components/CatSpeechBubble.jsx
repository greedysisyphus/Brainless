import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { generateSmartMessage, generateAllSmartMessages, clearSmartMessageCache, setGlobalAllSchedules } from '../utils/smartMessageGenerator';

const CatSpeechBubble = () => {
  const [showBubble, setShowBubble] = useState(false);
  const [speechTexts, setSpeechTexts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(4);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [smartMode, setSmartMode] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [customRules, setCustomRules] = useState([]);
  const [scheduleTemplates, setScheduleTemplates] = useState([]);
  const [smartMessages, setSmartMessages] = useState([]); // 新增：存儲所有智能對話
  const [namesData, setNamesData] = useState({}); // 新增：存儲姓名資料
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now()); // 新增：最後刷新時間
  const [sortedDialogues, setSortedDialogues] = useState([]); // 新增：存儲排序後的對話列表

  // 監聽全域設定
  useEffect(() => {
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
          setError('');
        } else {
          // 如果文檔不存在，設定預設值
          setShowBubble(false);
          setSpeechTexts([]);
          setIntervalSeconds(4);
          setSmartMode(false);
          setCustomRules([]);
          setScheduleTemplates([]);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('監聽設定失敗:', error);
        setError('載入對話設定失敗');
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // 載入排序後的對話列表
  useEffect(() => {
    const loadSortedDialogues = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const dialogueOrderDoc = await getDoc(doc(db, 'catSpeech', 'dialogueOrder'));
        
        if (dialogueOrderDoc.exists()) {
          const data = dialogueOrderDoc.data();
          if (data.dialogues && Array.isArray(data.dialogues)) {
            setSortedDialogues(data.dialogues);
            console.log('載入排序後的對話列表:', data.dialogues.length, '個對話');
          }
        }
      } catch (error) {
        console.error('載入排序對話列表失敗:', error);
      }
    };

    loadSortedDialogues();
  }, []);

  // 載入姓名資料（僅在智能模式開啟時）
  useEffect(() => {
    if (!smartMode) return;

    const loadNamesData = async () => {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const namesSnapshot = await getDocs(collection(db, 'names'));
        const names = {};
        
        namesSnapshot.forEach((doc) => {
          const data = doc.data();
          names[doc.id] = data.name;
        });
        
        setNamesData(names);
      } catch (error) {
        console.error('載入姓名資料失敗:', error);
      }
    };

    loadNamesData();
  }, [smartMode]);

  // 載入班表資料（僅在智能模式開啟時）
  useEffect(() => {
    if (!smartMode) return;

    const loadScheduleData = async () => {
      try {
        console.log('開始載入班表資料...');
        // 從 schedule 集合讀取所有資料（ScheduleManager 使用的集合）
        const { collection, getDocs } = await import('firebase/firestore');
        const scheduleDocs = await getDocs(collection(db, 'schedule'));
        
        const allSchedules = {};
        let currentScheduleData = null;
        
        scheduleDocs.forEach(doc => {
          const data = doc.data();
          allSchedules[doc.id] = data;
          
          // 優先使用當月資料，如果沒有則使用下月資料
          if (doc.id === 'currentMonth' && !currentScheduleData) {
            currentScheduleData = data;
          } else if (doc.id === 'nextMonth' && !currentScheduleData) {
            currentScheduleData = data;
          }
        });
        
        console.log('載入的班表資料:', Object.keys(allSchedules));
        
        // 設定全域班表資料（用於跨月份連續上班計算）
        setGlobalAllSchedules(allSchedules);
        
        setScheduleData(currentScheduleData);
      } catch (error) {
        console.error('載入班表資料失敗:', error);
        // 不顯示錯誤，因為班表資料不是必需的
      }
    };

    loadScheduleData();
  }, [smartMode]);

  // 智能模式：生成所有優先級的對話
  useEffect(() => {
    console.log('=== 智能對話生成檢查 ===');
    console.log('智能模式:', smartMode);
    console.log('顯示氣泡:', showBubble);
    console.log('班表資料:', scheduleData ? '已載入' : '未載入');
    console.log('班表模板:', scheduleTemplates.length, '個');
    console.log('自定義規則:', customRules.length, '個');
    console.log('姓名資料:', Object.keys(namesData).length, '個');
    
    if (!smartMode || !showBubble) {
      console.log('智能模式或顯示氣泡未開啟，跳過智能對話生成');
      return;
    }

    // 立即檢查一次（載入時）
    const generateSmartMessages = () => {
      console.log('=== 開始生成智能對話 ===');
      // 清理快取，確保獲得最新的計算結果
      clearSmartMessageCache();
      
      const allMessages = generateAllSmartMessages(scheduleData, customRules, scheduleTemplates, namesData);
      console.log('生成的智能對話數量:', allMessages.length);
      console.log('智能對話詳情:', allMessages.map(msg => ({ 
        id: msg.id, 
        type: msg.type, 
        message: msg.message?.substring(0, 30),
        source: msg.source 
      })));
      
      if (allMessages.length > 0) {
        console.log('=== 簡化邏輯：直接使用智能對話 ===');
        
        // 直接使用智能對話，不進行複雜的排序匹配
        const smartTexts = allMessages.map(msg => msg.message).filter(text => text && text.trim() !== '');
        
        console.log('智能對話訊息:', smartTexts);
        
        // 獲取原始普通對話（從全域設定中）
        const originalTexts = speechTexts.filter(text => 
          text && typeof text === 'string' && text.trim() !== '' && !smartTexts.includes(text)
        );
        
        const combinedTexts = [...smartTexts, ...originalTexts];
        
        console.log('原始普通對話:', originalTexts);
        console.log('合併後的對話:', combinedTexts);
        
        if (combinedTexts.length > 0) {
          console.log('設置合併後的對話:', combinedTexts.length, '個');
          console.log('最終對話內容:', combinedTexts);
          setSmartMessages(allMessages);
          setSpeechTexts(combinedTexts);
        } else {
          // 如果合併後沒有有效對話，保持原來的對話
          const originalTexts = speechTexts.filter(text => text && typeof text === 'string' && text.trim() !== '');
          console.log('沒有有效對話，使用原始對話:', originalTexts);
          setSpeechTexts(originalTexts);
        }
      } else {
        // 如果沒有智能對話，只顯示普通對話
        const originalTexts = speechTexts.filter(text => text && typeof text === 'string' && text.trim() !== '');
        console.log('沒有智能對話，使用原始對話:', originalTexts);
        setSpeechTexts(originalTexts);
      }
    };

    // 立即生成一次
    generateSmartMessages();

    // 每30秒重新生成一次（縮短間隔，確保及時更新）
    const updateInterval = setInterval(generateSmartMessages, 30 * 1000);

    return () => clearInterval(updateInterval);
  }, [smartMode, showBubble, scheduleData, customRules, scheduleTemplates, namesData, lastRefreshTime, sortedDialogues]);

  // 當對話列表改變時，確保當前索引有效
  useEffect(() => {
    if (speechTexts.length > 0) {
      // 如果當前索引超出範圍，重置為0
      if (currentIndex >= speechTexts.length) {
        setCurrentIndex(0);
      }
      // 如果當前索引指向空對話，找到第一個非空對話
      else if (!speechTexts[currentIndex] || typeof speechTexts[currentIndex] !== 'string' || speechTexts[currentIndex].trim() === '') {
        const firstValidIndex = speechTexts.findIndex(text => 
          text && typeof text === 'string' && text.trim() !== ''
        );
        if (firstValidIndex !== -1) {
          setCurrentIndex(firstValidIndex);
        } else {
          setCurrentIndex(0);
        }
      }
    }
  }, [speechTexts, currentIndex]);

  // 自動輪播效果
  useEffect(() => {
    if (!showBubble || speechTexts.length === 0) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => {
          // 確保索引不會超出範圍
          if (prevIndex >= speechTexts.length) {
            return 0;
          }
          return prevIndex === speechTexts.length - 1 ? 0 : prevIndex + 1;
        });
        setIsTransitioning(false);
      }, 300); // 等待淡出動畫完成
    }, intervalSeconds * 1000); // 使用設定的間隔時間

    return () => clearInterval(interval);
  }, [showBubble, speechTexts.length, intervalSeconds]);

  // 手動刷新智能對話
  const handleManualRefresh = () => {
    setLastRefreshTime(Date.now());
  };

  // 快捷鍵監聽
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl + Alt + A 觸發管理員登入
      if (e.ctrlKey && e.altKey && e.key === 'A') {
        setShowLogin(true);
      }
      
      // Ctrl+R: 刷新智能對話（僅在智能模式時）
      if (e.ctrlKey && e.key === 'R' && smartMode) {
        e.preventDefault();
        handleManualRefresh();
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [smartMode]);

  // 管理員登入
  const handleAdminLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('請輸入信箱和密碼');
      return;
    }

    try {
      setIsLoggingIn(true);
      setLoginError('');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setShowLogin(false);
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      console.error('登入失敗:', error);
      let errorMessage = '登入失敗';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = '找不到此帳號';
          break;
        case 'auth/wrong-password':
          errorMessage = '密碼錯誤';
          break;
        case 'auth/invalid-email':
          errorMessage = '信箱格式錯誤';
          break;
        case 'auth/too-many-requests':
          errorMessage = '登入次數過多，請稍後再試';
          break;
        default:
          errorMessage = '登入失敗：' + error.message;
      }
      
      setLoginError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 載入狀態
  if (isLoading) {
    return (
      <>
      <button
        onClick={() => setShowLogin(true)}
          className="fixed top-4 right-4 z-[100] w-8 h-8 bg-primary/20 hover:bg-primary/30 rounded-full border border-primary/30 hover:border-primary/50 transition-all duration-200 opacity-50 hover:opacity-100 touch-manipulation"
        title="管理員登入 (Ctrl+Alt+A)"
          style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <svg className="w-4 h-4 mx-auto text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </button>
        {showLogin && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLogin(false);
              }
            }}
          >
            <div 
              className="bg-surface rounded-xl p-6 w-96 border border-primary/20 shadow-2xl max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4 text-white">管理員登入</h2>
              <input
                type="email"
                placeholder="管理員信箱"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={isLoggingIn}
                className="w-full mb-3 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                onKeyPress={(e) => e.key === 'Enter' && !isLoggingIn && handleAdminLogin()}
                autoFocus
              />
              <input
                type="password"
                placeholder="密碼"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoggingIn}
                className="w-full mb-4 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                onKeyPress={(e) => e.key === 'Enter' && !isLoggingIn && handleAdminLogin()}
              />
              {loginError && (
                <div className="text-red-400 text-sm mb-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                  {loginError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAdminLogin}
                  disabled={isLoggingIn}
                  className="flex-1 bg-primary text-white p-3 rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {isLoggingIn ? '登入中...' : '登入'}
                </button>
                <button
                  onClick={() => setShowLogin(false)}
                  disabled={isLoggingIn}
                  className="flex-1 bg-white/10 text-white p-3 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 如果有錯誤，顯示錯誤提示
  if (error) {
    return (
      <>
        {/* 隱藏的登入按鈕 - 在頁面右上角 */}
        <button
          onClick={() => setShowLogin(true)}
          className="fixed top-4 right-4 z-[100] w-8 h-8 bg-primary/20 hover:bg-primary/30 rounded-full border border-primary/30 hover:border-primary/50 transition-all duration-200 opacity-50 hover:opacity-100 touch-manipulation"
          title="管理員登入 (Ctrl+Alt+A)"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <svg className="w-4 h-4 mx-auto text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </button>

        <div className="mt-2 mb-0 animate-fadeIn">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-2">
            <div className="text-red-400 text-center text-sm">
              {error}
            </div>
          </div>
        </div>
        
        {/* 登入對話框 */}
        {showLogin && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLogin(false);
              }
            }}
          >
            <div 
              className="bg-surface rounded-xl p-6 w-96 border border-primary/20 shadow-2xl max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4 text-white">管理員登入</h2>
              <input
                type="email"
                placeholder="管理員信箱"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={isLoggingIn}
                className="w-full mb-3 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                onKeyPress={(e) => e.key === 'Enter' && !isLoggingIn && handleAdminLogin()}
                autoFocus
              />
              <input
                type="password"
                placeholder="密碼"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoggingIn}
                className="w-full mb-4 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                onKeyPress={(e) => e.key === 'Enter' && !isLoggingIn && handleAdminLogin()}
              />
              {loginError && (
                <div className="text-red-400 text-sm mb-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                  {loginError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAdminLogin}
                  disabled={isLoggingIn}
                  className="flex-1 bg-primary text-white p-3 rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {isLoggingIn ? '登入中...' : '登入'}
                </button>
                <button
                  onClick={() => setShowLogin(false)}
                  disabled={isLoggingIn}
                  className="flex-1 bg-white/10 text-white p-3 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 如果沒有啟用或沒有對話內容，只顯示登入按鈕
  if (!showBubble || speechTexts.length === 0) {
    return (
      <>
      <button
        onClick={() => setShowLogin(true)}
          className="fixed top-4 right-4 z-[100] w-8 h-8 bg-primary/20 hover:bg-primary/30 rounded-full border border-primary/30 hover:border-primary/50 transition-all duration-200 opacity-50 hover:opacity-100 touch-manipulation"
        title="管理員登入 (Ctrl+Alt+A)"
          style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <svg className="w-4 h-4 mx-auto text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </button>
        {/* 登入對話框 - 確保在所有情況下都能顯示 */}
        {showLogin && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLogin(false);
              }
            }}
          >
            <div 
              className="bg-surface rounded-xl p-6 w-96 border border-primary/20 shadow-2xl max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4 text-white">管理員登入</h2>
              <input
                type="email"
                placeholder="管理員信箱"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={isLoggingIn}
                className="w-full mb-3 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                onKeyPress={(e) => e.key === 'Enter' && !isLoggingIn && handleAdminLogin()}
                autoFocus
              />
              <input
                type="password"
                placeholder="密碼"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoggingIn}
                className="w-full mb-4 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                onKeyPress={(e) => e.key === 'Enter' && !isLoggingIn && handleAdminLogin()}
              />
              {loginError && (
                <div className="text-red-400 text-sm mb-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                  {loginError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAdminLogin}
                  disabled={isLoggingIn}
                  className="flex-1 bg-primary text-white p-3 rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {isLoggingIn ? '登入中...' : '登入'}
                </button>
                <button
                  onClick={() => setShowLogin(false)}
                  disabled={isLoggingIn}
                  className="flex-1 bg-white/10 text-white p-3 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* 隱藏的登入按鈕 - 在頁面右上角 */}
      <button
        onClick={() => setShowLogin(true)}
        className="fixed top-4 right-4 z-[100] w-8 h-8 bg-primary/20 hover:bg-primary/30 rounded-full border border-primary/30 hover:border-primary/50 transition-all duration-200 opacity-50 hover:opacity-100 touch-manipulation"
        title="管理員登入 (Ctrl+Alt+A)"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <svg className="w-4 h-4 mx-auto text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </button>

      {/* 橫向對話輪播 */}
      <div className="mt-2 mb-0 animate-fadeIn">
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-2 border border-primary/20 backdrop-blur-sm shadow-lg relative">
          {/* 手動刷新按鈕（僅在智能模式時顯示） */}
          {smartMode && (
            <button
              onClick={handleManualRefresh}
              className="absolute top-1 right-1 w-6 h-6 bg-primary/20 hover:bg-primary/30 rounded-full border border-primary/30 hover:border-primary/50 transition-all duration-200 opacity-50 hover:opacity-100 z-10"
              title="刷新智能對話 (Ctrl+R)"
            >
              <svg className="w-3 h-3 mx-auto text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          {/* 對話內容區域 */}
          <div className="relative">
            <div
              className={`text-white text-center text-lg leading-relaxed min-h-[1.2rem] flex items-center justify-center transition-all duration-300 ${
                isTransitioning ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'
              }`}
            >
              {(() => {
                const currentText = speechTexts[currentIndex];
                if (currentText && typeof currentText === 'string' && currentText.trim() !== '') {
                  return currentText;
                } else if (speechTexts.length === 0) {
                  return '喵～';
                } else {
                  // 如果當前對話為空，嘗試找到下一個非空對話
                  const nextValidIndex = speechTexts.findIndex((text, index) => 
                    index > currentIndex && text && typeof text === 'string' && text.trim() !== ''
                  );
                  if (nextValidIndex !== -1) {
                    return speechTexts[nextValidIndex];
                  } else {
                    // 如果後面沒有有效對話，從頭開始找
                    const firstValidIndex = speechTexts.findIndex(text => 
                      text && typeof text === 'string' && text.trim() !== ''
                    );
                    return firstValidIndex !== -1 ? speechTexts[firstValidIndex] : '喵～';
                  }
                }
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* 管理員登入介面 */}
      {showLogin && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={(e) => {
            // 點擊背景關閉對話框
            if (e.target === e.currentTarget) {
              setShowLogin(false);
            }
          }}
        >
          <div 
            className="bg-surface rounded-xl p-6 w-96 border border-primary/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-white">管理員登入</h2>
            <input
              type="email"
              placeholder="管理員信箱"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              disabled={isLoggingIn}
              className="w-full mb-3 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              onKeyPress={(e) => e.key === 'Enter' && !isLoggingIn && handleAdminLogin()}
            />
            <input
              type="password"
              placeholder="密碼"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              disabled={isLoggingIn}
              className="w-full mb-4 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              onKeyPress={(e) => e.key === 'Enter' && !isLoggingIn && handleAdminLogin()}
            />
            {loginError && (
              <div className="text-red-400 text-sm mb-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                {loginError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAdminLogin}
                disabled={isLoggingIn}
                className="flex-1 bg-primary text-white p-3 rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? '登入中...' : '登入'}
              </button>
              <button
                onClick={() => setShowLogin(false)}
                disabled={isLoggingIn}
                className="flex-1 bg-white/10 text-white p-3 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CatSpeechBubble;
