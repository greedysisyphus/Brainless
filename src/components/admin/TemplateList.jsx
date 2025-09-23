import React from 'react';
import { ResponsiveButton, ResponsiveLabel, ResponsiveText, ResponsiveTitle } from '../common/ResponsiveContainer';

const TemplateList = ({ 
  templates = [], 
  onEdit, 
  onDelete, 
  onToggle, 
  onLoadDefaults,
  isSaving = false 
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <ResponsiveLabel>
          現有模板 ({templates.length}條)
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
      
      {templates.length === 0 ? (
        <ResponsiveText color="secondary" className="text-center py-8">
          暫無班表問候模板
        </ResponsiveText>
      ) : (
        templates.map((template) => (
          <div key={template.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={template.enabled}
                  onChange={() => onToggle(template.id)}
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
                  onClick={() => onEdit(template)}
                  variant="ghost"
                  size="sm"
                  disabled={isSaving}
                >
                  編輯
                </ResponsiveButton>
                <ResponsiveButton
                  onClick={() => onDelete(template.id)}
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
  );
};

export default TemplateList;
