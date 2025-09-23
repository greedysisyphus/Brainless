import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useAdminSettings } from '../hooks/useAdminSettings';
import ResponsiveContainer, { 
  ResponsiveButton, 
  ResponsiveTitle, 
  ResponsiveText 
} from '../components/common/ResponsiveContainer';
import AdminErrorBoundary from '../components/admin/ErrorBoundary';
import { LoadingSpinner, ErrorState, SaveStatus } from '../components/admin/LoadingStates';
import RuleForm from '../components/admin/RuleForm';
import RuleList from '../components/admin/RuleList';
import TemplateForm from '../components/admin/TemplateForm';
import TemplateList from '../components/admin/TemplateList';
import DialogueManager from '../components/admin/DialogueManager';

const AdminPanelOptimized = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('custom');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

  // 使用自定義 Hook
  const { isAdmin, isLoading: authLoading, error: authError, checkAuth } = useAdminAuth();
  const { 
    settings, 
    isLoading: settingsLoading, 
    isSaving, 
    error: settingsError, 
    successMessage, 
    updateSettings, 
    clearMessages 
  } = useAdminSettings();

  // 檢查管理員狀態
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      await checkAuth(user);
    });

    return unsubscribe;
  }, [checkAuth]);

  // 處理規則操作
  const handleSaveRule = async (ruleData) => {
    try {
      const newRule = {
        id: editingRule ? editingRule.id : Date.now().toString(),
        ...ruleData
      };

      let updatedRules;
      if (editingRule) {
        updatedRules = settings.customRules.map(rule =>
          rule.id === editingRule.id ? newRule : rule
        );
      } else {
        updatedRules = [...settings.customRules, newRule];
      }

      await updateSettings({ 
        ...settings,
        customRules: updatedRules
      });

      setShowRuleForm(false);
      setEditingRule(null);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('保存規則失敗:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('確定要刪除這個規則嗎？')) {
      try {
        const updatedRules = settings.customRules.filter(rule => rule.id !== ruleId);
        await updateSettings({ 
          ...settings,
          customRules: updatedRules
        });
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(''), 3000);
      } catch (error) {
        console.error('刪除規則失敗:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }
  };

  const handleToggleRule = async (ruleId) => {
    try {
      const updatedRules = settings.customRules.map(rule =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      );
      await updateSettings({ 
        ...settings,
        customRules: updatedRules
      });
    } catch (error) {
      console.error('切換規則狀態失敗:', error);
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setShowRuleForm(true);
  };

  const handleLoadDefaultRules = () => {
    if (window.confirm('確定要載入預設規則嗎？這會覆蓋現有的自定義規則。')) {
      // 這裡需要導入預設規則
      // updateSettings({ ...settings, customRules: getDefaultCustomRules() });
    }
  };

  // 處理模板操作
  const handleSaveTemplate = async (templateData) => {
    try {
      const newTemplate = {
        id: editingTemplate ? editingTemplate.id : Date.now().toString(),
        ...templateData
      };

      let updatedTemplates;
      if (editingTemplate) {
        updatedTemplates = settings.scheduleTemplates.map(template => 
          template.id === editingTemplate.id ? newTemplate : template
        );
      } else {
        updatedTemplates = [...settings.scheduleTemplates, newTemplate];
      }

      await updateSettings({ 
        ...settings,
        scheduleTemplates: updatedTemplates
      });

      setShowTemplateForm(false);
      setEditingTemplate(null);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('保存模板失敗:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('確定要刪除這個模板嗎？')) {
      try {
        const updatedTemplates = settings.scheduleTemplates.filter(template => template.id !== templateId);
        await updateSettings({ 
          ...settings,
          scheduleTemplates: updatedTemplates
        });
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(''), 3000);
      } catch (error) {
        console.error('刪除模板失敗:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }
  };

  const handleToggleTemplate = async (templateId) => {
    try {
      const updatedTemplates = settings.scheduleTemplates.map(template => 
        template.id === templateId ? { ...template, enabled: !template.enabled } : template
      );
      await updateSettings({ 
        ...settings,
        scheduleTemplates: updatedTemplates
      });
    } catch (error) {
      console.error('切換模板狀態失敗:', error);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleLoadDefaultTemplates = () => {
    // 這裡需要導入預設模板
    // updateSettings({ ...settings, scheduleTemplates: getDefaultScheduleTemplates() });
  };

  // 處理對話操作
  const handleAddDialogue = async (message) => {
    try {
      const updatedTexts = [...settings.speechTexts, message];
      await updateSettings({ 
        ...settings,
        speechTexts: updatedTexts
      });
    } catch (error) {
      console.error('添加對話失敗:', error);
    }
  };

  const handleDeleteDialogue = async (index) => {
    try {
      const updatedTexts = settings.speechTexts.filter((_, i) => i !== index);
      await updateSettings({ 
        ...settings,
        speechTexts: updatedTexts
      });
    } catch (error) {
      console.error('刪除對話失敗:', error);
    }
  };

  // 處理基本設定變更
  const handleBasicSettingChange = async (key, value) => {
    try {
      await updateSettings({ 
        ...settings,
        [key]: value
      });
    } catch (error) {
      console.error('更新設定失敗:', error);
    }
  };

  // 管理員登出
  const handleAdminLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };

  // 載入狀態
  if (authLoading || settingsLoading) {
    return <LoadingSpinner message="載入管理設定中..." />;
  }

  // 錯誤狀態
  if (authError) {
    return (
      <ErrorState
        title="權限錯誤"
        message={authError}
        onRetry={() => window.location.reload()}
        onGoHome={() => navigate('/')}
      />
    );
  }

  if (settingsError) {
    return (
      <ErrorState
        title="設定載入錯誤"
        message={settingsError}
        onRetry={() => window.location.reload()}
        onGoHome={() => navigate('/')}
      />
    );
  }

  // 非管理員
  if (!isAdmin) {
    return null;
  }

  return (
    <AdminErrorBoundary>
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

          {/* 保存狀態 */}
          <SaveStatus 
            status={saveStatus} 
            message={
              saveStatus === 'success' ? '操作成功' :
              saveStatus === 'error' ? '操作失敗' : ''
            } 
          />

          {/* 登出按鈕 */}
          <div className="flex justify-end mb-6">
            <ResponsiveButton
              onClick={handleAdminLogout}
              variant="danger"
              disabled={isSaving}
              loading={isSaving}
            >
              {isSaving ? '登出中...' : '登出管理員'}
            </ResponsiveButton>
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
                  checked={settings.showBubble}
                  disabled={isSaving}
                  onChange={(e) => handleBasicSettingChange('showBubble', e.target.checked)}
                  className="w-5 h-5 disabled:opacity-50"
                />
                <label htmlFor="bubbleToggle" className="text-white">
                  顯示對話輪播
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="smartModeToggle"
                  checked={settings.smartMode}
                  disabled={isSaving}
                  onChange={(e) => handleBasicSettingChange('smartMode', e.target.checked)}
                  className="w-5 h-5 disabled:opacity-50"
                />
                <label htmlFor="smartModeToggle" className="text-white">
                  智能模式（根據自定義規則和班表問候自動顯示對話）
                </label>
              </div>
              
              <div>
                <label htmlFor="intervalSlider" className="text-white">
                  輪播間隔 ({settings.intervalSeconds}秒)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    id="intervalSlider"
                    min="1"
                    max="10"
                    value={settings.intervalSeconds}
                    disabled={isSaving}
                    onChange={(e) => handleBasicSettingChange('intervalSeconds', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50"
                  />
                  <span className="text-white min-w-[3rem] text-center">
                    {settings.intervalSeconds}s
                  </span>
                </div>
              </div>
            </div>
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
              自定義規則 ({settings.customRules.length})
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              班表問候模板 ({settings.scheduleTemplates.length})
            </button>
            <button
              onClick={() => setActiveTab('dialogue')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'dialogue'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              對話管理 ({settings.speechTexts.length})
            </button>
          </div>

          {/* 自定義規則標籤頁 */}
          {activeTab === 'custom' && (
            <>
              {showRuleForm && (
                <RuleForm
                  rule={editingRule}
                  onSave={handleSaveRule}
                  onCancel={() => {
                    setShowRuleForm(false);
                    setEditingRule(null);
                  }}
                  isSaving={isSaving}
                />
              )}

              {!showRuleForm && (
                <div className="flex justify-end mb-6">
                  <ResponsiveButton
                    onClick={() => setShowRuleForm(true)}
                    variant="primary"
                    size="sm"
                    disabled={isSaving}
                  >
                    添加規則
                  </ResponsiveButton>
                </div>
              )}

              <RuleList
                rules={settings.customRules}
                onEdit={handleEditRule}
                onDelete={handleDeleteRule}
                onToggle={handleToggleRule}
                onLoadDefaults={handleLoadDefaultRules}
                isSaving={isSaving}
              />
            </>
          )}

          {/* 班表問候模板標籤頁 */}
          {activeTab === 'schedule' && (
            <>
              {showTemplateForm && (
                <TemplateForm
                  template={editingTemplate}
                  onSave={handleSaveTemplate}
                  onCancel={() => {
                    setShowTemplateForm(false);
                    setEditingTemplate(null);
                  }}
                  isSaving={isSaving}
                />
              )}

              {!showTemplateForm && (
                <div className="flex justify-end mb-6">
                  <ResponsiveButton
                    onClick={() => setShowTemplateForm(true)}
                    variant="primary"
                    size="sm"
                    disabled={isSaving}
                  >
                    添加模板
                  </ResponsiveButton>
                </div>
              )}

              <TemplateList
                templates={settings.scheduleTemplates}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onToggle={handleToggleTemplate}
                onLoadDefaults={handleLoadDefaultTemplates}
                isSaving={isSaving}
              />
            </>
          )}

          {/* 對話管理標籤頁 */}
          {activeTab === 'dialogue' && (
            <DialogueManager
              dialogues={settings.speechTexts}
              onAdd={handleAddDialogue}
              onDelete={handleDeleteDialogue}
              isSaving={isSaving}
            />
          )}
        </ResponsiveContainer>
      </div>
    </AdminErrorBoundary>
  );
};

export default AdminPanelOptimized;
