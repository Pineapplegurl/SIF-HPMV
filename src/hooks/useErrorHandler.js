// Hook personnalisé pour la gestion d'erreurs robuste
import { useState, useCallback } from 'react';
import { handleApiError } from '../utils/config';

export const useErrorHandler = (showToast) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeWithErrorHandling = useCallback(async (asyncFunction) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction();
      return result;
    } catch (error) {
      setError(error);
      handleApiError(error, showToast);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    executeWithErrorHandling,
    clearError
  };
};
