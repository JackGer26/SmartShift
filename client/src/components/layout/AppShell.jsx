import { useState, useEffect } from 'react';
import TopNav from './TopNav';
import { LoadingSpinner, ErrorMessage } from '../ui/UIComponents';
import { useAppContext } from '../../context/AppContext';
import './AppShell.css';

/**
 * AppShell - Main layout wrapper component
 * Provides consistent layout structure with navigation, loading states, and error handling
 * 
 * Features:
 * - Global navigation via TopNav
 * - Integration with global AppContext
 * - Loading state management
 * - Error boundary handling
 * - Responsive layout
 * - Online/offline detection
 * - Consistent footer
 */
const AppShell = ({ children }) => {
  const { isLoading, error, clearError } = useAppContext();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="app-shell">
      <TopNav />
      
      {/* Offline notification */}
      {!isOnline && (
        <div className="offline-banner">
          <span className="offline-icon">📶</span>
          <span>You're currently offline. Some features may be unavailable.</span>
        </div>
      )}

      {/* Global loading overlay */}
      {isLoading && (
        <div className="global-loading-overlay">
          <LoadingSpinner size="large" message="Loading..." />
        </div>
      )}

      {/* Global error display */}
      {error && (
        <div className="global-error">
          <ErrorMessage 
            message={error} 
            onRetry={clearError}
          />
        </div>
      )}

      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
      
      <footer className="app-footer">
        <div className="footer-content">
          <p>&copy; 2026 SmartShift - Restaurant Rota Builder</p>
          <div className="footer-status">
            <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></span>
            <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;