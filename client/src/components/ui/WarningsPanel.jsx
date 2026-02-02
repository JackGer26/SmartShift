import { useState, useEffect } from 'react';
import { ValidationSummary, ValidationMessage } from './ValidationMessage';
import { validateEntireRota, getRotaWarnings } from '../../api/rotaBuilderAPI';
import './WarningsPanel.css';

/**
 * Enhanced WarningsPanel - Display rota validation warnings with UX polish
 * 
 * Features:
 * - Hard constraint validation
 * - Soft constraint warnings
 * - Clear explanations and recommendations
 * - Auto-refresh capability
 * - Enhanced UX with proper empty states
 */
const WarningsPanel = ({ rotaId, onRefresh, autoRefresh = true }) => {
  const [validationData, setValidationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load validation data on component mount and when rotaId changes
  useEffect(() => {
    if (rotaId) {
      loadValidation();
    } else {
      setValidationData(null);
    }
  }, [rotaId]);

  // Auto-refresh validation every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh || !rotaId) return;

    const interval = setInterval(loadValidation, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, rotaId]);

  // Load validation data from API
  const loadValidation = async () => {
    if (!rotaId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const validation = await validateEntireRota(rotaId);
      setValidationData(validation);
      
      // Auto-expand if there are violations or warnings
      if (validation?.violations?.length > 0 || validation?.warnings?.length > 0) {
        setIsExpanded(true);
      }
      
    } catch (error) {
      console.error('Failed to load validation:', error);
      setError(error.message || 'Failed to validate rota');
      setValidationData(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    loadValidation();
    onRefresh?.();
  };

  // Handle fixing an issue
  const handleFixIssue = (issue) => {
    console.log('Fix issue:', issue);
    // Could implement automatic fixes or navigation to problem area
  };

  // Don't render if no rotaId
  if (!rotaId) {
    return null;
  }

  // Loading state
  if (loading && !validationData) {
    return (
      <div className="warnings-panel loading">
        <div className="panel-header">
          <div className="loading-content">
            <span className="loading-spinner"></span>
            <span>Validating rota...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ValidationMessage 
        type="error"
        message="Failed to validate rota"
        details={[error]}
        onDismiss={() => setError(null)}
      />
    );
  }

  // No validation data available
  if (!validationData) {
    return (
      <div className="warnings-panel no-data">
        <ValidationMessage 
          type="info"
          message="Validation data not available"
          details={['Generate a rota to see validation results']}
        />
      </div>
    );
  }

  const { violations = [], warnings = [] } = validationData;
  const totalIssues = violations.length + warnings.length;

  // Success state - no issues found
  if (totalIssues === 0) {
    return (
      <div className="warnings-panel success-state">
        <div className="success-card">
          <div className="success-icon">✅</div>
          <div className="success-content">
            <h4>All Clear!</h4>
            <p>No conflicts or validation issues detected. Your rota looks good!</p>
          </div>
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            title="Refresh validation"
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`warnings-panel ${violations.length > 0 ? 'has-violations' : 'has-warnings'}`}>
      {/* Panel header */}
      <div 
        className="panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="header-content">
          <div className="validation-summary-header">
            <span className="summary-icon">
              {violations.length > 0 ? '❌' : '⚠️'}
            </span>
            <div className="summary-text">
              <h3>
                {violations.length > 0 ? 'Validation Issues' : 'Warnings'}
              </h3>
              <div className="issue-counts">
                {violations.length > 0 && (
                  <span className="count violations">
                    {violations.length} error{violations.length !== 1 ? 's' : ''}
                  </span>
                )}
                {warnings.length > 0 && (
                  <span className="count warnings">
                    {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            title="Refresh validation"
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'}
          </button>
          <button className="expand-btn" title={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Panel content */}
      {isExpanded && (
        <div className="panel-content">
          <ValidationSummary 
            violations={violations}
            warnings={warnings}
            onFixIssue={handleFixIssue}
          />
          
          {/* Additional guidance */}
          <div className="validation-guidance">
            <h4>Understanding Validation Results:</h4>
            <ul>
              <li><strong>Errors:</strong> Must be fixed before publishing the rota</li>
              <li><strong>Warnings:</strong> Issues that should be reviewed but don't prevent publishing</li>
              <li><strong>Auto-refresh:</strong> Validation updates automatically every 30 seconds</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarningsPanel;