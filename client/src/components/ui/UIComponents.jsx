/**
 * Loading Spinner Component
 */
export const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="loading-container">
      <div className={`loading-spinner ${sizeClasses[size]}`}></div>
      {message && <p className="loading-message">{message}</p>}
      
      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .loading-spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .loading-message {
          margin-top: 10px;
          color: #666;
          font-size: 14px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

/**
 * Error Message Component
 */
export const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <p className="error-message">{message}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Try Again
        </button>
      )}
      
      <style jsx>{`
        .error-container {
          text-align: center;
          padding: 30px;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .error-icon {
          font-size: 2rem;
          margin-bottom: 15px;
        }
        
        .error-message {
          color: #c33;
          margin-bottom: 15px;
        }
        
        .retry-btn {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .retry-btn:hover {
          background-color: #c82333;
        }
      `}</style>
    </div>
  );
};

/**
 * Empty State Component
 */
export const EmptyState = ({ icon = '📝', title, description, action }) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">{description}</p>
      {action && <div className="empty-action">{action}</div>}
      
      <style jsx>{`
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #666;
        }
        
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 20px;
          opacity: 0.5;
        }
        
        .empty-title {
          margin-bottom: 10px;
          color: #333;
        }
        
        .empty-description {
          margin-bottom: 20px;
          line-height: 1.6;
        }
        
        .empty-action {
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
};