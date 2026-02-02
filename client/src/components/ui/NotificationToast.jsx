import { useAppContext } from '../../context/AppContext';
import './NotificationToast.css';

/**
 * NotificationToast - Toast notification component
 * Displays notifications from the global app context
 * 
 * Features:
 * - Different notification types (success, error, warning, info)
 * - Auto-dismiss functionality
 * - Manual close button
 * - Stacked notifications
 * - Accessible design
 */
const NotificationToast = () => {
  const { notifications, removeNotification } = useAppContext();

  if (notifications.length === 0) {
    return null;
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="notification-container" role="region" aria-label="Notifications">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification-toast notification-${notification.type}`}
          role="alert"
          aria-live="polite"
        >
          <div className="notification-content">
            <div className="notification-icon">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="notification-text">
              {notification.title && (
                <div className="notification-title">{notification.title}</div>
              )}
              <div className="notification-message">{notification.message}</div>
            </div>
            <button
              className="notification-close"
              onClick={() => removeNotification(notification.id)}
              aria-label="Close notification"
              type="button"
            >
              ×
            </button>
          </div>
          
          {/* Progress bar for auto-dismiss */}
          {notification.duration > 0 && (
            <div 
              className="notification-progress"
              style={{
                animationDuration: `${notification.duration}ms`
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;