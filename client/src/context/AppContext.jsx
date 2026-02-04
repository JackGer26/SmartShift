import { createContext, useContext, useState, useCallback } from 'react';

/**
 * AppContext - Global application state management
 * Provides centralized loading states, error handling, and notifications
 * 
 * Features:
 * - Global loading state management
 * - Centralized error handling
 * - Toast notifications
 * - API request state tracking
 */

const AppContext = createContext();

// Custom hook to use the app context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// App Provider Component
export const AppProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [apiRequestsInProgress, setApiRequestsInProgress] = useState(0);

  // Loading state management
  const startLoading = useCallback((message = 'Loading...') => {
    setIsLoading(true);
    setError(null); // Clear any existing errors
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Error management
  const setGlobalError = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
    console.error('Global Error:', errorMessage);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // API request tracking
  const incrementApiRequests = useCallback(() => {
    setApiRequestsInProgress(prev => prev + 1);
  }, []);

  const decrementApiRequests = useCallback(() => {
    setApiRequestsInProgress(prev => Math.max(0, prev - 1));
  }, []);

  // Notification management
  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      ...notification
    };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  // Success notification helper
  const showSuccess = useCallback((message) => {
    addNotification({
      type: 'success',
      message,
      title: 'Success'
    });
  }, [addNotification]);

  // Error notification helper
  const showError = useCallback((message) => {
    addNotification({
      type: 'error',
      message,
      title: 'Error',
      duration: 8000 // Keep error messages longer
    });
  }, [addNotification]);

  // Warning notification helper
  const showWarning = useCallback((message) => {
    addNotification({
      type: 'warning',
      message,
      title: 'Warning',
      duration: 6000
    });
  }, [addNotification]);

  // API request wrapper with automatic loading/error handling
  const makeApiRequest = useCallback(async (apiCall, options = {}) => {
    const { 
      showLoader = true, 
      onSuccess, 
      onError,
      successMessage,
      errorMessage = 'An error occurred'
    } = options;

    try {
      if (showLoader) {
        startLoading();
      }
      incrementApiRequests();

      const result = await apiCall();

      if (onSuccess) {
        onSuccess(result);
      }
      
      if (successMessage) {
        showSuccess(successMessage);
      }

      return result;
    } catch (error) {
      console.error('AppContext caught error:', error);
      console.error('Error details:', error.details);
      const message = error.response?.data?.message || error.message || errorMessage;
      
      // If there are validation details, show them
      if (error.details && Array.isArray(error.details)) {
        const detailedMessage = `${message}\n${error.details.map(d => `- ${d.field}: ${d.message}`).join('\n')}`;
        console.error('Detailed error message:', detailedMessage);
      }
      
      if (onError) {
        onError(error);
      } else {
        showError(message);
      }
      
      throw error;
    } finally {
      decrementApiRequests();
      if (showLoader) {
        stopLoading();
      }
    }
  }, [startLoading, stopLoading, incrementApiRequests, decrementApiRequests, showSuccess, showError]);

  const contextValue = {
    // Loading state
    isLoading,
    startLoading,
    stopLoading,
    
    // Error state
    error,
    setGlobalError,
    clearError,
    
    // API requests tracking
    apiRequestsInProgress,
    hasActiveRequests: apiRequestsInProgress > 0,
    
    // Notifications
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    
    // API helper
    makeApiRequest
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;