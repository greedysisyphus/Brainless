import React from 'react';
import { ResponsiveCard, ResponsiveButton, ResponsiveInput, ResponsiveLabel, ResponsiveText, ResponsiveTitle } from '../common/ResponsiveContainer';
import { useFormValidation } from '../../hooks/useFormValidation';

const RuleForm = ({ 
  rule, 
  onSave, 
  onCancel, 
  isSaving = false 
}) => {
  const validationRules = {
    name: {
      required: true,
      minLength: 1,
      maxLength: 50,
      message: '規則名稱不能為空且不能超過50個字符'
    },
    messages: {
      required: true,
      custom: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return '至少需要一個對話內容';
        }
        const validMessages = value.filter(msg => msg && msg.trim() !== '');
        if (validMessages.length === 0) {
          return '至少需要一個有效的對話內容';
        }
        return '';
      }
    }
  };

  const {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setTouched,
    reset
  } = useFormValidation(
    {
      name: rule?.name || '',
      type: rule?.type || 'timeRange',
      startTime: rule?.startTime || '08:00',
      endTime: rule?.endTime || '10:00',
      day: rule?.day || '一',
      month: rule?.month || 1,
      date: rule?.date || 1,
      allDay: rule?.allDay || false,
      messages: rule?.messages || [''],
      enabled: rule?.enabled !== false
    },
    validationRules
  );

  // 處理表單變更
  const handleChange = (field, value) => {
    setValue(field, value);
    setTouched(field);
  };

  // 處理對話訊息變更
  const handleMessageChange = (index, value) => {
    const newMessages = [...values.messages];
    newMessages[index] = value;
    setValue('messages', newMessages);
    setTouched('messages');
  };

  // 添加新對話
  const addNewMessage = () => {
    setValue('messages', [...values.messages, '']);
  };

  // 刪除對話
  const removeMessage = (index) => {
    if (values.messages.length > 1) {
      const newMessages = values.messages.filter((_, i) => i !== index);
      setValue('messages', newMessages);
      setTouched('messages');
    }
  };

  // 保存規則
  const handleSave = () => {
    if (!isValid) return;
    
    const validMessages = values.messages.filter(msg => msg && msg.trim() !== '');
    const ruleData = {
      ...values,
      messages: validMessages
    };
    
    onSave(ruleData);
  };

  // 渲染類型特定欄位
  const renderTypeSpecificFields = () => {
    switch (values.type) {
      case 'timeRange':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allDay"
                checked={values.allDay}
                onChange={(e) => handleChange('allDay', e.target.checked)}
                disabled={isSaving}
                className="w-5 h-5 disabled:opacity-50"
              />
              <ResponsiveLabel htmlFor="allDay" className="!mb-0">
                全天（24小時）
              </ResponsiveLabel>
            </div>
            
            {!values.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ResponsiveLabel htmlFor="startTime" required>
                    開始時間
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
                    結束時間
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
                value={values.day}
                onChange={(e) => handleChange('day', e.target.value)}
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
                checked={values.allDay}
                onChange={(e) => handleChange('allDay', e.target.checked)}
                disabled={isSaving}
                className="w-5 h-5 disabled:opacity-50"
              />
              <ResponsiveLabel htmlFor="allDay" className="!mb-0">
                全天（24小時）
              </ResponsiveLabel>
            </div>
            
            {!values.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ResponsiveLabel htmlFor="startTime" required>
                    開始時間
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
                    結束時間
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
                value={values.month || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 1 : parseInt(value);
                  handleChange('month', isNaN(numValue) ? 1 : numValue);
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
                value={values.date || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 1 : parseInt(value);
                  handleChange('date', isNaN(numValue) ? 1 : numValue);
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
                    onClick={() => handleChange('date', day)}
                    disabled={isSaving}
                    className={`p-2 text-sm rounded transition-colors ${
                      values.date === day
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
                checked={values.allDay}
                onChange={(e) => handleChange('allDay', e.target.checked)}
                disabled={isSaving}
                className="w-5 h-5 disabled:opacity-50"
              />
              <ResponsiveLabel htmlFor="allDay" className="!mb-0">
                全天（24小時）
              </ResponsiveLabel>
            </div>
            
            {!values.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ResponsiveLabel htmlFor="startTime" required>
                    開始時間
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
                    結束時間
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
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
      <ResponsiveTitle level={3} className="mb-4">
        {rule ? '編輯規則' : '添加新規則'}
      </ResponsiveTitle>
      
      <div className="space-y-4">
        <div>
          <ResponsiveLabel htmlFor="ruleName" required>
            規則名稱
          </ResponsiveLabel>
          <ResponsiveInput
            id="ruleName"
            value={values.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="例如：早上問候"
            disabled={isSaving}
          />
          {touched.name && errors.name && (
            <ResponsiveText size="sm" color="danger" className="mt-1">
              {errors.name}
            </ResponsiveText>
          )}
        </div>

        <div>
          <ResponsiveLabel htmlFor="ruleType" required>
            規則類型
          </ResponsiveLabel>
          <select
            id="ruleType"
            value={values.type}
            onChange={(e) => handleChange('type', e.target.value)}
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
            對話內容 ({values.messages.length}條)
          </ResponsiveLabel>
          <div className="space-y-2">
            {values.messages.map((message, index) => (
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
                  disabled={isSaving || values.messages.length <= 1}
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
          {touched.messages && errors.messages && (
            <ResponsiveText size="sm" color="danger" className="mt-1">
              {errors.messages}
            </ResponsiveText>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="ruleEnabled"
            checked={values.enabled}
            onChange={(e) => handleChange('enabled', e.target.checked)}
            disabled={isSaving}
            className="w-5 h-5 disabled:opacity-50"
          />
          <ResponsiveLabel htmlFor="ruleEnabled" className="!mb-0">
            啟用此規則
          </ResponsiveLabel>
        </div>

        <div className="flex gap-2">
          <ResponsiveButton
            onClick={handleSave}
            variant="primary"
            disabled={isSaving || !isValid}
            loading={isSaving}
          >
            {rule ? '更新規則' : '添加規則'}
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

export default RuleForm;
