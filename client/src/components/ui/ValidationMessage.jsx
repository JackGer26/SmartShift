import { useState } from 'react';
import './ValidationMessage.css';

/**
 * ValidationMessage Component
 * 
 * Displays inline validation messages with clear explanations
 * and appropriate styling for different message types.
 */
const ValidationMessage = ({ 
  type = 'error', 
  message, 
  details = [], 
  onDismiss, 
  showIcon = true,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || !message) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  const getIconForType = (type) => {
    const icons = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };
    return icons[type] || icons.info;
  };

  return (
    <div className={`validation-message validation-${type} ${className}`}>
      <div className="validation-content">
        {showIcon && (
          <span className="validation-icon">
            {getIconForType(type)}
          </span>
        )}
        
        <div className="validation-text">
          <p className="validation-main">{message}</p>
          
          {details && details.length > 0 && (
            <ul className="validation-details">
              {details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {onDismiss && (
        <button 
          className="validation-dismiss" 
          onClick={handleDismiss}
          aria-label="Dismiss message"
        >
          ✕
        </button>
      )}
    </div>
  );
};

/**
 * ValidationSummary Component
 * 
 * Shows a summary of all validation issues with expandable details
 */
const ValidationSummary = ({ violations = [], warnings = [], onFixIssue }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const totalIssues = violations.length + warnings.length;
  
  if (totalIssues === 0) return null;

  return (
    <div className="validation-summary">
      <div 
        className="validation-summary-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="summary-info">
          <span className="summary-icon">
            {violations.length > 0 ? '❌' : '⚠️'}
          </span>
          <span className="summary-text">
            {violations.length > 0 
              ? `${violations.length} error${violations.length !== 1 ? 's' : ''}`
              : ''
            }
            {violations.length > 0 && warnings.length > 0 ? ', ' : ''}
            {warnings.length > 0 
              ? `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`
              : ''
            }
          </span>
        </div>
        
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>
      
      {isExpanded && (
        <div className="validation-summary-details">
          {violations.map((violation, index) => (
            <div key={`error-${index}`} className="validation-item error">
              <span className="item-icon">❌</span>
              <div className="item-content">
                <p className="item-message">{violation.message}</p>
                {violation.details && (
                  <div className="item-details">
                    <strong>Details:</strong> {JSON.stringify(violation.details, null, 2)}
                  </div>
                )}
                {onFixIssue && (
                  <button 
                    className="fix-button"
                    onClick={() => onFixIssue(violation)}
                  >
                    Fix Issue
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {warnings.map((warning, index) => (
            <div key={`warning-${index}`} className="validation-item warning">
              <span className="item-icon">⚠️</span>
              <div className="item-content">
                <p className="item-message">{warning.message}</p>
                {warning.details && (
                  <div className="item-details">
                    <strong>Details:</strong> {JSON.stringify(warning.details, null, 2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * InlineValidation Component
 * 
 * Small validation indicator for form fields
 */
const InlineValidation = ({ isValid, message, type = 'error' }) => {
  if (isValid) return null;

  return (
    <div className={`inline-validation inline-${type}`}>
      <span className="inline-icon">
        {type === 'error' ? '⚠️' : 'ℹ️'}
      </span>
      <span className="inline-message">{message}</span>
    </div>
  );
};

export { ValidationMessage, ValidationSummary, InlineValidation };
export default ValidationMessage;