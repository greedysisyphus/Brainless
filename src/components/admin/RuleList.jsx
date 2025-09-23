import React from 'react';
import { ResponsiveButton, ResponsiveLabel, ResponsiveText, ResponsiveTitle } from '../common/ResponsiveContainer';

const RuleList = ({ 
  rules = [], 
  onEdit, 
  onDelete, 
  onToggle, 
  onLoadDefaults,
  isSaving = false 
}) => {
  const getRuleTypeText = (type) => {
    const typeMap = {
      'timeRange': '時間範圍',
      'dayOfWeek': '星期幾',
      'specificDate': '特定日期',
      'monthlyDate': '每月幾號'
    };
    return typeMap[type] || '未知類型';
  };

  const formatRuleDescription = (rule) => {
    switch (rule.type) {
      case 'timeRange':
        return rule.allDay ? '全天' : `${rule.startTime} - ${rule.endTime}`;
      case 'dayOfWeek':
        return `星期${rule.day} ${rule.allDay ? '全天' : `${rule.startTime} - ${rule.endTime}`}`;
      case 'specificDate':
        return `${rule.month}月${rule.date}日`;
      case 'monthlyDate':
        return `每月${rule.date}日 ${rule.allDay ? '全天' : `${rule.startTime} - ${rule.endTime}`}`;
      default:
        return '未知設定';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <ResponsiveLabel>
          現有規則 ({rules.length}條)
        </ResponsiveLabel>
        <ResponsiveButton
          onClick={onLoadDefaults}
          variant="secondary"
          size="sm"
          disabled={isSaving}
        >
          載入預設
        </ResponsiveButton>
      </div>
      
      {rules.length === 0 ? (
        <ResponsiveText color="secondary" className="text-center py-8">
          暫無自定義規則
        </ResponsiveText>
      ) : (
        rules.map((rule) => (
          <div key={rule.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => onToggle(rule.id)}
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
                  onClick={() => onEdit(rule)}
                  variant="ghost"
                  size="sm"
                  disabled={isSaving}
                >
                  編輯
                </ResponsiveButton>
                <ResponsiveButton
                  onClick={() => onDelete(rule.id)}
                  variant="danger"
                  size="sm"
                  disabled={isSaving}
                >
                  刪除
                </ResponsiveButton>
              </div>
            </div>
            
            <ResponsiveText size="sm" color="secondary" className="mb-2">
              類型：{getRuleTypeText(rule.type)}
            </ResponsiveText>

            <ResponsiveText size="sm" color="secondary" className="mb-2">
              設定：{formatRuleDescription(rule)}
            </ResponsiveText>

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
  );
};

export default RuleList;
