import React from 'react';
import { ResponsiveButton, ResponsiveInput, ResponsiveLabel, ResponsiveText, ResponsiveTitle } from '../common/ResponsiveContainer';
import { useFormValidation } from '../../hooks/useFormValidation';

const TemplateForm = ({ 
  template, 
  onSave, 
  onCancel, 
  isSaving = false 
}) => {
  const validationRules = {
    name: {
      required: true,
      minLength: 1,
      maxLength: 50,
      message: '模板名稱不能為空且不能超過50個字符'
    },
    message: {
      required: true,
      minLength: 1,
      maxLength: 500,
      message: '問候語內容不能為空且不能超過500個字符'
    }
  };

  const {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setTouched
  } = useFormValidation(
    {
      name: template?.name || '',
      message: template?.message || '',
      enabled: template?.enabled !== false,
      timeRestriction: template?.timeRestriction || false,
      startTime: template?.startTime || '08:00',
      endTime: template?.endTime || '10:00'
    },
    validationRules
  );

  // 處理表單變更
  const handleChange = (field, value) => {
    setValue(field, value);
    setTouched(field);
  };

  // 保存模板
  const handleSave = () => {
    if (!isValid) return;
    onSave(values);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
      <ResponsiveTitle level={3} className="mb-4">
        {template ? '編輯模板' : '添加新模板'}
      </ResponsiveTitle>
      
      <div className="space-y-4">
        <div>
          <ResponsiveLabel htmlFor="templateName" required>
            模板名稱
          </ResponsiveLabel>
          <ResponsiveInput
            id="templateName"
            value={values.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="例如：早班問候"
            disabled={isSaving}
          />
          {touched.name && errors.name && (
            <ResponsiveText size="sm" color="danger" className="mt-1">
              {errors.name}
            </ResponsiveText>
          )}
        </div>

        <div>
          <ResponsiveLabel htmlFor="templateMessage" required>
            問候語內容
          </ResponsiveLabel>
          <ResponsiveInput
            id="templateMessage"
            value={values.message}
            onChange={(e) => handleChange('message', e.target.value)}
            placeholder="例如：{早班同事}，早安！今天也要加油喔！"
            disabled={isSaving}
          />
          {touched.message && errors.message && (
            <ResponsiveText size="sm" color="danger" className="mt-1">
              {errors.message}
            </ResponsiveText>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="templateEnabled"
            checked={values.enabled}
            onChange={(e) => handleChange('enabled', e.target.checked)}
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
            checked={values.timeRestriction}
            onChange={(e) => handleChange('timeRestriction', e.target.checked)}
            disabled={isSaving}
            className="w-5 h-5 disabled:opacity-50"
          />
          <ResponsiveLabel htmlFor="timeRestriction" className="!mb-0">
            啟用時間限制
          </ResponsiveLabel>
        </div>

        {values.timeRestriction && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ResponsiveLabel htmlFor="startTime" required>
                限制開始時間
              </ResponsiveLabel>
              <ResponsiveInput
                id="startTime"
                type="time"
                value={values.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
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
                value={values.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <ResponsiveButton
            onClick={handleSave}
            variant="primary"
            disabled={isSaving || !isValid}
            loading={isSaving}
          >
            {template ? '更新模板' : '添加模板'}
          </ResponsiveButton>
          <ResponsiveButton
            onClick={onCancel}
            variant="secondary"
            disabled={isSaving}
          >
            取消
          </ResponsiveButton>
        </div>
      </div>
    </div>
  );
};

export default TemplateForm;
