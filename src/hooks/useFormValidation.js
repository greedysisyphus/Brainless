import { useState, useCallback } from 'react';

// 表單驗證 Hook
export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // 驗證單個欄位
  const validateField = useCallback((name, value) => {
    const rule = validationRules[name];
    if (!rule) return '';

    if (rule.required && (!value || value.toString().trim() === '')) {
      return rule.message || `${name} 為必填欄位`;
    }

    if (rule.minLength && value && value.length < rule.minLength) {
      return rule.message || `${name} 至少需要 ${rule.minLength} 個字符`;
    }

    if (rule.maxLength && value && value.length > rule.maxLength) {
      return rule.message || `${name} 不能超過 ${rule.maxLength} 個字符`;
    }

    if (rule.pattern && value && !rule.pattern.test(value)) {
      return rule.message || `${name} 格式不正確`;
    }

    if (rule.custom && typeof rule.custom === 'function') {
      const customError = rule.custom(value, values);
      if (customError) return customError;
    }

    return '';
  }, [validationRules, values]);

  // 驗證所有欄位
  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField, validationRules]);

  // 更新欄位值
  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // 如果欄位已被觸碰過，立即驗證
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  // 觸碰欄位
  const setTouched = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // 觸碰時驗證
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [values, validateField]);

  // 重置表單
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // 檢查表單是否有效
  const isValid = Object.keys(errors).length === 0 && 
    Object.keys(validationRules).every(name => 
      !validationRules[name].required || 
      (values[name] && values[name].toString().trim() !== '')
    );

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setTouched,
    validateAll,
    reset
  };
};
