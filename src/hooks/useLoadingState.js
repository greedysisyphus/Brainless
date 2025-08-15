import { useState, useCallback } from 'react';

const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const setErrorState = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const setSuccessState = useCallback((message, autoClear = true) => {
    setSuccessMessage(message);
    setIsLoading(false);
    if (autoClear) {
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMessage('');
  }, []);

  const withLoading = useCallback(async (asyncFunction) => {
    try {
      startLoading();
      const result = await asyncFunction();
      return result;
    } catch (error) {
      setErrorState(error.message || '操作失敗');
      throw error;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, setErrorState]);

  return {
    isLoading,
    error,
    successMessage,
    startLoading,
    stopLoading,
    setError: setErrorState,
    setSuccess: setSuccessState,
    clearMessages,
    withLoading
  };
};

export default useLoadingState;
