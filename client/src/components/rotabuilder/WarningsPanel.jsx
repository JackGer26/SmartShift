import { useState, useEffect } from 'react';
import { getRotaWarnings } from '../../api/rotaBuilderAPI';
import './WarningsPanel.css';

/**
 * WarningsPanel - Display rota validation warnings and conflicts
 * 
 * Features:
 * - Conflict detection
 * - Understaffing alerts
 * - Overstaffing warnings
 * - Time off conflicts
 * - Role mismatch warnings
 * - Auto-refresh capability
 */
const WarningsPanel = ({ rotaId, onRefresh, autoRefresh = true }) => {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterLevel, setFilterLevel] = useState('all'); // 'all', 'error', 'warning', 'info'

  // Load warnings on component mount and when rotaId changes
  useEffect(() => {
    if (rotaId) {
      loadWarnings();
    }
  }, [rotaId]);

  // Auto-refresh warnings every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh || !rotaId) return;

    const interval = setInterval(loadWarnings, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, rotaId]);

  // Load warnings from API
  const loadWarnings = async () => {
    try {
      setLoading(true);
      const warningsData = await getRotaWarnings(rotaId);
      setWarnings(warningsData || []);
      
      // Auto-expand if there are errors or warnings
      if (warningsData?.length > 0) {
        const hasErrors = warningsData.some(w => w.level === 'error');
        const hasWarnings = warningsData.some(w => w.level === 'warning');
        if (hasErrors || hasWarnings) {
          setIsExpanded(true);
        }
      }
    } catch (error) {
      console.error('Failed to load warnings:', error);
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    loadWarnings();
    onRefresh?.();
  };

  // Filter warnings by level
  const getFilteredWarnings = () => {
    if (filterLevel === 'all') return warnings;
    return warnings.filter(warning => warning.level === filterLevel);
  };

  // Group warnings by type
  const groupWarningsByType = (warningList) => {
    return warningList.reduce((groups, warning) => {
      const type = warning.type || 'general';
      if (!groups[type]) groups[type] = [];
      groups[type].push(warning);
      return groups;
    }, {});
  };

  // Get warning icon
  const getWarningIcon = (level) => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  // Get warning level counts
  const getWarningCounts = () => {
    return warnings.reduce((counts, warning) => {
      counts[warning.level] = (counts[warning.level] || 0) + 1;
      return counts;
    }, { error: 0, warning: 0, info: 0 });
  };

  const filteredWarnings = getFilteredWarnings();
  const groupedWarnings = groupWarningsByType(filteredWarnings);
  const warningCounts = getWarningCounts();
  const totalWarnings = warnings.length;
  const hasErrors = warningCounts.error > 0;
  const hasWarnings = warningCounts.warning > 0;

  // Don't render if no warnings and not loading
  if (totalWarnings === 0 && !loading) {
    return (
      <div className="warnings-panel no-warnings">
        <div className="panel-header success">
          <div className="header-content">
            <span className="success-icon">✓</span>
            <h3>All Good!</h3>
            <p>No conflicts or warnings detected</p>
          </div>
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            title="Refresh validation"
            disabled={loading}
          >
            🔄
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`warnings-panel ${
      hasErrors ? 'has-errors' : hasWarnings ? 'has-warnings' : 'has-info'
    }`}>
      {/* Panel header */}
      <div 
        className="panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="header-content">
          <div className="warning-summary">
            <span className="warning-icon">
              {hasErrors ? '❌' : hasWarnings ? '⚠️' : 'ℹ️'}
            </span>
            <div className="summary-text">
              <h3>
                {hasErrors ? 'Errors Found' : hasWarnings ? 'Warnings' : 'Information'}
              </h3>
              <div className="warning-counts">
                {warningCounts.error > 0 && (
                  <span className="count error">{warningCounts.error} errors</span>
                )}
                {warningCounts.warning > 0 && (
                  <span className="count warning">{warningCounts.warning} warnings</span>
                )}
                {warningCounts.info > 0 && (
                  <span className="count info">{warningCounts.info} info</span>
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
          {/* Filter controls */}
          <div className="warning-filters">
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filterLevel === 'all' ? 'active' : ''}`}
                onClick={() => setFilterLevel('all')}
              >
                All ({totalWarnings})
              </button>
              {warningCounts.error > 0 && (
                <button
                  className={`filter-btn error ${filterLevel === 'error' ? 'active' : ''}`}
                  onClick={() => setFilterLevel('error')}
                >
                  Errors ({warningCounts.error})
                </button>
              )}
              {warningCounts.warning > 0 && (
                <button
                  className={`filter-btn warning ${filterLevel === 'warning' ? 'active' : ''}`}
                  onClick={() => setFilterLevel('warning')}
                >
                  Warnings ({warningCounts.warning})
                </button>
              )}
              {warningCounts.info > 0 && (
                <button
                  className={`filter-btn info ${filterLevel === 'info' ? 'active' : ''}`}
                  onClick={() => setFilterLevel('info')}
                >
                  Info ({warningCounts.info})
                </button>
              )}
            </div>
          </div>

          {/* Warnings list */}
          <div className="warnings-list">
            {Object.keys(groupedWarnings).length === 0 ? (
              <div className="no-filtered-warnings">
                No {filterLevel !== 'all' ? filterLevel + ' level' : ''} warnings found
              </div>
            ) : (
              Object.entries(groupedWarnings).map(([type, typeWarnings]) => (
                <div key={type} className="warning-group">
                  <h4 className="group-title">
                    {type.charAt(0).toUpperCase() + type.slice(1)} Issues
                    <span className="group-count">({typeWarnings.length})</span>
                  </h4>
                  
                  <div className="group-warnings">
                    {typeWarnings.map((warning, index) => (
                      <div 
                        key={`${type}-${index}`} 
                        className={`warning-item level-${warning.level}`}
                      >
                        <div className="warning-header">
                          <span className="warning-icon">
                            {getWarningIcon(warning.level)}
                          </span>
                          <div className="warning-content">
                            <div className="warning-message">
                              {warning.message}
                            </div>
                            {warning.details && (
                              <div className="warning-details">
                                {warning.details}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {warning.affectedShifts && warning.affectedShifts.length > 0 && (
                          <div className="affected-shifts">
                            <span className="affected-label">Affected shifts:</span>
                            {warning.affectedShifts.map((shift, idx) => (
                              <span key={idx} className="shift-tag">
                                {shift.day} {shift.time}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {warning.recommendation && (
                          <div className="warning-recommendation">
                            <strong>Recommendation:</strong> {warning.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarningsPanel;