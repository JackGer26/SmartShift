import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  generateDraftRota,
  getRotaByWeek,
  assignStaffToShift,
  removeStaffFromShift,
  publishRota,
  exportRotaCSV,
  getWeekStart,
  getISODateString
} from '../api/rotaBuilderAPI';
import { getAllStaff } from '../api/staffAPI';
import WeekPicker from '../components/ui/WeekPicker';
import RotaGrid from '../components/ui/RotaGrid';
import WarningsPanel from '../components/ui/WarningsPanel';
import StaffHoursSummary from '../components/ui/StaffHoursSummary';

/**
 * RotaBuilderPage - THE CORE ROTA BUILDING INTERFACE
 * 
 * Features:
 * ✅ Week picker with navigation
 * ✅ Generate draft button
 * ✅ Rota grid (days × shifts)
 * ✅ Display role slots per shift
 * ✅ Manual assignment (dropdown-based)
 * ✅ Remove assignment
 * ✅ Per-staff hour totals
 * ✅ Warnings panel
 * ✅ Publish button
 * ✅ Export CSV button
 */
const RotaBuilderPage = () => {
  const { showSuccess, showError, setLoading } = useAppContext();
  
  // State management
  const [selectedWeek, setSelectedWeek] = useState(getISODateString(getWeekStart(new Date())));
  const [rotaData, setRotaData] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [rotaLoading, setRotaLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showStaffHours, setShowStaffHours] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load rota when week changes
  useEffect(() => {
    if (selectedWeek) {
      loadRotaForWeek(selectedWeek);
    }
  }, [selectedWeek]);

  // Auto-save timer
  useEffect(() => {
    if (!autoSave || !rotaData) return;

    const autoSaveTimer = setTimeout(() => {
      // Auto-save logic would go here
      console.log('Auto-saving rota...');
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [rotaData, autoSave]);

  // Load initial data (staff list, etc.)
  const loadInitialData = async () => {
    try {
      setPageLoading(true);
      const staff = await getAllStaff();
      setStaffList(staff || []);
    } catch (error) {
      showError('Failed to load initial data');
    } finally {
      setPageLoading(false);
    }
  };

  // Load rota for specific week
  const loadRotaForWeek = async (weekStart) => {
    try {
      setRotaLoading(true);
      const rota = await getRotaByWeek(weekStart);
      setRotaData(rota);
    } catch (error) {
      console.error('Failed to load rota:', error);
      setRotaData(null);
    } finally {
      setRotaLoading(false);
    }
  };

  // Generate draft rota
  const handleGenerateDraft = async () => {
    try {
      setIsGenerating(true);
      setLoading(true);
      
      const draftRota = await generateDraftRota(selectedWeek);
      setRotaData(draftRota);
      
      showSuccess('Draft rota generated successfully!');
    } catch (error) {
      showError('Failed to generate draft rota');
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  // Handle staff assignment to shift
  const handleStaffAssign = async (shiftId, staffId) => {
    if (!rotaData) return;
    
    try {
      await assignStaffToShift(rotaData.id, shiftId, staffId);
      
      // Update local state
      const updatedRota = { ...rotaData };
      const shift = updatedRota.shifts.find(s => s.id === shiftId);
      if (shift) {
        const staff = staffList.find(s => s.id === staffId);
        if (staff) {
          shift.assignedStaff = shift.assignedStaff || [];
          shift.assignedStaff.push(staff);
        }
      }
      setRotaData(updatedRota);
      
      showSuccess(`Staff member assigned to shift`);
    } catch (error) {
      showError('Failed to assign staff member');
    }
  };

  // Handle staff removal from shift
  const handleStaffRemove = async (shiftId, staffId) => {
    if (!rotaData) return;
    
    try {
      await removeStaffFromShift(rotaData.id, shiftId, staffId);
      
      // Update local state
      const updatedRota = { ...rotaData };
      const shift = updatedRota.shifts.find(s => s.id === shiftId);
      if (shift && shift.assignedStaff) {
        shift.assignedStaff = shift.assignedStaff.filter(s => s.id !== staffId);
      }
      setRotaData(updatedRota);
      
      showSuccess(`Staff member removed from shift`);
    } catch (error) {
      showError('Failed to remove staff member');
    }
  };

  // Handle rota publishing
  const handlePublish = async () => {
    if (!rotaData) return;
    
    try {
      setIsPublishing(true);
      setLoading(true);
      
      const publishedRota = await publishRota(rotaData.id);
      setRotaData({ ...rotaData, status: 'published', ...publishedRota });
      
      showSuccess('Rota published successfully! Staff have been notified.');
    } catch (error) {
      showError('Failed to publish rota');
    } finally {
      setIsPublishing(false);
      setLoading(false);
    }
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    if (!rotaData) return;
    
    try {
      setIsExporting(true);
      const result = await exportRotaCSV(rotaData.id);
      showSuccess(`Rota exported as ${result.filename}`);
    } catch (error) {
      showError('Failed to export rota to CSV');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle week change
  const handleWeekChange = (newWeek) => {
    setSelectedWeek(newWeek);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadRotaForWeek(selectedWeek);
  };

  // Check if rota can be published
  const canPublish = () => {
    return rotaData && 
           rotaData.status !== 'published' && 
           rotaData.shifts && 
           rotaData.shifts.length > 0;
  };

  // Get week display info
  const getWeekInfo = () => {
    const start = new Date(selectedWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // Loading state
  if (pageLoading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading rota builder...</p>
        </div>
      </div>
    );
  }

  // Empty state - no staff
  if (!staffList || staffList.length === 0) {
    return (
      <div className="container rota-builder">
        <div className="empty-state-card">
          <div className="empty-state-icon">👥</div>
          <h2>No Staff Members Found</h2>
          <p>You need to add staff members before you can build rotas.</p>
          <div className="empty-state-actions">
            <button 
              className="btn btn-primary"
              onClick={() => window.location.href = '/staff'}
            >
              <span className="btn-icon">➕</span>
              Add Staff Members
            </button>
            <button 
              className="btn btn-outline"
              onClick={handleRefresh}
            >
              <span className="btn-icon">🔄</span>
              Refresh
            </button>
          </div>
          <div className="empty-state-help">
            <h4>Getting Started:</h4>
            <ul>
              <li>Add staff members with their roles and availability</li>
              <li>Create shift templates for your restaurant</li>
              <li>Generate your first rota automatically</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container rota-builder">
      {/* Page header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            📅 Rota Builder
          </h1>
          <p className="page-description">
            Create and manage staff schedules for {getWeekInfo()}
          </p>
        </div>
        
        <div className="header-actions">
          {/* Generate draft button */}
          <button
            className="btn btn-secondary"
            onClick={handleGenerateDraft}
            disabled={isGenerating || rotaLoading || staffList.length === 0}
            title={staffList.length === 0 ? 'Add staff members first' : 'Generate new rota from templates'}
          >
            {isGenerating ? (
              <>
                <span className="btn-spinner"></span>
                Generating...
              </>
            ) : (
              <>
                <span className="btn-icon">⚙️</span>
                Generate Draft
              </>
            )}
          </button>

          {/* Export CSV button */}
          <button
            className="btn btn-outline"
            onClick={handleExportCSV}
            disabled={!rotaData || isExporting || !rotaData.shifts || rotaData.shifts.length === 0}
            title={!rotaData ? 'Generate a rota first' : rotaData.shifts?.length === 0 ? 'No shifts to export' : 'Export rota to CSV'}
          >
            {isExporting ? (
              <>
                <span className="btn-spinner"></span>
                Exporting...
              </>
            ) : (
              <>
                <span className="btn-icon">📄</span>
                Export CSV
              </>
            )}
          </button>

          {/* Publish button */}
          <button
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={!canPublish() || isPublishing}
            title={!rotaData ? 'Generate a rota first' : 
                   rotaData.status === 'published' ? 'Rota already published' :
                   !rotaData.shifts || rotaData.shifts.length === 0 ? 'No shifts to publish' :
                   'Publish rota to make it visible to staff'}
          >
            {isPublishing ? (
              <>
                <span className="btn-spinner"></span>
                Publishing...
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                {rotaData?.status === 'published' ? 'Published' : 'Publish Rota'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Week picker */}
      <WeekPicker
        selectedWeek={selectedWeek}
        onWeekChange={handleWeekChange}
        disabled={rotaLoading}
      />

      {/* Status and validation messages */}
      <div className="status-messages">
        {/* No rota for week message */}
        {!rotaData && !rotaLoading && (
          <div className="status-card status-info">
            <div className="status-icon">ℹ️</div>
            <div className="status-content">
              <h4>No Rota Found</h4>
              <p>No rota exists for the week of {getWeekInfo()}. Generate a draft to get started.</p>
              <button 
                className="status-action btn btn-primary"
                onClick={handleGenerateDraft}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Draft Rota'}
              </button>
            </div>
          </div>
        )}

        {/* Rota status indicators */}
        {rotaData && (
          <div className="rota-status-bar">
            <div className="status-badge-group">
              <span className={`status-badge status-${rotaData.status}`}>
                {rotaData.status === 'draft' && '📝'}
                {rotaData.status === 'published' && '🚀'}
                {rotaData.status === 'archived' && '📦'}
                {rotaData.status.charAt(0).toUpperCase() + rotaData.status.slice(1)}
              </span>
              {rotaData.totalStaffHours && (
                <span className="info-badge">
                  📊 {rotaData.totalStaffHours}h total
                </span>
              )}
              {rotaData.totalLaborCost && (
                <span className="info-badge">
                  💰 £{rotaData.totalLaborCost.toFixed(2)}
                </span>
              )}
            </div>
            {rotaData.status === 'published' && (
              <div className="published-notice">
                <span className="notice-icon">🔒</span>
                <span>This rota is published and visible to staff. Changes require republishing.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status and validation messages */}
      <div className="status-messages">
        {/* No rota for week message */}
        {!rotaData && !rotaLoading && (
          <div className="status-card status-info">
            <div className="status-icon">ℹ️</div>
            <div className="status-content">
              <h4>No Rota Found</h4>
              <p>No rota exists for the week of {getWeekInfo()}. Generate a draft to get started.</p>
              <button 
                className="status-action btn btn-primary"
                onClick={handleGenerateDraft}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Draft Rota'}
              </button>
            </div>
          </div>
        )}

        {/* Rota status indicators */}
        {rotaData && (
          <div className="rota-status-bar">
            <div className="status-badge-group">
              <span className={`status-badge status-${rotaData.status}`}>
                {rotaData.status === 'draft' && '📝'}
                {rotaData.status === 'published' && '🚀'}
                {rotaData.status === 'archived' && '📦'}
                {rotaData.status.charAt(0).toUpperCase() + rotaData.status.slice(1)}
              </span>
              {rotaData.totalStaffHours && (
                <span className="info-badge">
                  📊 {rotaData.totalStaffHours}h total
                </span>
              )}
              {rotaData.totalLaborCost && (
                <span className="info-badge">
                  💰 £{rotaData.totalLaborCost.toFixed(2)}
                </span>
              )}
            </div>
            {rotaData.status === 'published' && (
              <div className="published-notice">
                <span className="notice-icon">🔒</span>
                <span>This rota is published and visible to staff. Changes require republishing.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Warnings panel */}
      {rotaData && (
        <WarningsPanel
          rotaId={rotaData.id}
          onRefresh={handleRefresh}
          autoRefresh={true}
        />
      )}

      {/* Main rota grid */}
      <RotaGrid
        rotaData={rotaData}
        onStaffAssign={handleStaffAssign}
        onStaffRemove={handleStaffRemove}
        availableStaff={staffList}
        loading={rotaLoading}
        readOnly={rotaData?.status === 'published'}
      />

      {/* Staff hours summary */}
      {showStaffHours && rotaData && (
        <StaffHoursSummary
          rotaId={rotaData.id}
          staffList={staffList}
          showDetailed={false}
          maxWeeklyHours={40}
        />
      )}

      {/* Quick actions panel */}
      <div className="quick-actions-panel">
        <div className="panel-header">
          <h3>Quick Actions</h3>
          <div className="panel-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showStaffHours}
                onChange={(e) => setShowStaffHours(e.target.checked)}
              />
              <span className="checkmark"></span>
              Show Staff Hours
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
              <span className="checkmark"></span>
              Auto-save
            </label>
          </div>
        </div>
        
        <div className="quick-actions">
          <button 
            className="action-btn"
            onClick={handleRefresh}
            disabled={rotaLoading}
          >
            <span className="action-icon">🔄</span>
            <span>Refresh</span>
          </button>
          
          <button 
            className="action-btn"
            onClick={() => console.log('Copy from previous week')}
            disabled={!rotaData}
          >
            <span className="action-icon">📋</span>
            <span>Copy Previous Week</span>
          </button>
          
          <button 
            className="action-btn"
            onClick={() => console.log('Clear all assignments')}
            disabled={!rotaData || rotaData.status === 'published'}
          >
            <span className="action-icon">🗑️</span>
            <span>Clear Assignments</span>
          </button>
          
          <button 
            className="action-btn"
            onClick={() => console.log('Auto-assign staff')}
            disabled={!rotaData}
          >
            <span className="action-icon">✨</span>
            <span>Auto-assign</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .container.rota-builder {
          max-width: 1600px;
          margin: 0 auto;
          padding: 20px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 20px;
        }

        .header-content {
          flex: 1;
        }

        .page-title {
          font-size: 32px;
          font-weight: 700;
          color: #2c3e50;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .page-description {
          font-size: 16px;
          color: #6c757d;
          margin: 0;
          line-height: 1.5;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          white-space: nowrap;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
        }

        .btn-secondary {
          background: linear-gradient(135deg, #6c757d, #495057);
          color: white;
          box-shadow: 0 2px 8px rgba(108, 117, 125, 0.3);
        }

        .btn-secondary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
        }

        .btn-outline {
          background: white;
          border: 2px solid #3498db;
          color: #3498db;
        }

        .btn-outline:hover:not(:disabled) {
          background: #3498db;
          color: white;
          transform: translateY(-2px);
        }

        .btn-icon {
          font-size: 16px;
        }

        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #6c757d;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        .empty-state-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 60px 40px;
          text-align: center;
          max-width: 600px;
          margin: 40px auto;
        }

        .empty-state-icon {
          font-size: 64px;
          margin-bottom: 24px;
          opacity: 0.7;
        }

        .empty-state-card h2 {
          font-size: 24px;
          color: #2c3e50;
          margin: 0 0 12px 0;
        }

        .empty-state-card p {
          font-size: 16px;
          color: #6c757d;
          margin: 0 0 32px 0;
          line-height: 1.5;
        }

        .empty-state-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 32px;
        }

        .empty-state-help {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          text-align: left;
        }

        .empty-state-help h4 {
          margin: 0 0 12px 0;
          color: #495057;
          font-size: 14px;
          font-weight: 600;
        }

        .empty-state-help ul {
          margin: 0;
          padding-left: 20px;
          color: #6c757d;
          font-size: 14px;
          line-height: 1.6;
        }

        .empty-state-help li {
          margin-bottom: 8px;
        }

        .status-messages {
          margin: 24px 0;
        }

        .status-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .status-info {
          border-left: 4px solid #17a2b8;
          background: linear-gradient(135deg, #ffffff, #f8fdff);
        }

        .status-warning {
          border-left: 4px solid #ffc107;
          background: linear-gradient(135deg, #ffffff, #fffbf0);
        }

        .status-error {
          border-left: 4px solid #dc3545;
          background: linear-gradient(135deg, #ffffff, #fff5f5);
        }

        .status-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .status-content h4 {
          margin: 0 0 8px 0;
          color: #2c3e50;
          font-size: 16px;
        }

        .status-content p {
          margin: 0 0 16px 0;
          color: #6c757d;
          line-height: 1.5;
        }

        .status-action {
          margin: 0;
        }

        .rota-status-bar {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .status-badge-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .status-draft {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }

        .status-published {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .status-archived {
          background: #e9ecef;
          color: #495057;
          border: 1px solid #dee2e6;
        }

        .info-badge {
          padding: 4px 10px;
          background: #e7f3ff;
          color: #0066cc;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .published-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #495057;
          font-size: 14px;
        }

        .notice-icon {
          font-size: 16px;
        }

        .btn[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .btn[disabled]:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        .empty-state-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 60px 40px;
          text-align: center;
          max-width: 600px;
          margin: 40px auto;
        }

        .empty-state-icon {
          font-size: 64px;
          margin-bottom: 24px;
          opacity: 0.7;
        }

        .empty-state-card h2 {
          font-size: 24px;
          color: #2c3e50;
          margin: 0 0 12px 0;
        }

        .empty-state-card p {
          font-size: 16px;
          color: #6c757d;
          margin: 0 0 32px 0;
          line-height: 1.5;
        }

        .empty-state-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 32px;
        }

        .empty-state-help {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          text-align: left;
        }

        .empty-state-help h4 {
          margin: 0 0 12px 0;
          color: #495057;
          font-size: 14px;
          font-weight: 600;
        }

        .empty-state-help ul {
          margin: 0;
          padding-left: 20px;
          color: #6c757d;
          font-size: 14px;
          line-height: 1.6;
        }

        .empty-state-help li {
          margin-bottom: 8px;
        }

        .status-messages {
          margin: 24px 0;
        }

        .status-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .status-info {
          border-left: 4px solid #17a2b8;
          background: linear-gradient(135deg, #ffffff, #f8fdff);
        }

        .status-warning {
          border-left: 4px solid #ffc107;
          background: linear-gradient(135deg, #ffffff, #fffbf0);
        }

        .status-error {
          border-left: 4px solid #dc3545;
          background: linear-gradient(135deg, #ffffff, #fff5f5);
        }

        .status-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .status-content h4 {
          margin: 0 0 8px 0;
          color: #2c3e50;
          font-size: 16px;
        }

        .status-content p {
          margin: 0 0 16px 0;
          color: #6c757d;
          line-height: 1.5;
        }

        .status-action {
          margin: 0;
        }

        .rota-status-bar {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .status-badge-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .status-draft {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }

        .status-published {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .status-archived {
          background: #e9ecef;
          color: #495057;
          border: 1px solid #dee2e6;
        }

        .info-badge {
          padding: 4px 10px;
          background: #e7f3ff;
          color: #0066cc;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .published-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #495057;
          font-size: 14px;
        }

        .notice-icon {
          font-size: 16px;
        }

        .btn[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .btn[disabled]:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        .quick-actions-panel {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 20px;
        }

        .panel-header {
          background: #f8f9fa;
          padding: 16px 20px;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 16px;
          color: #2c3e50;
          font-weight: 600;
        }

        .panel-controls {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #495057;
          position: relative;
          padding-left: 24px;
        }

        .checkbox-label input[type="checkbox"] {
          position: absolute;
          left: 0;
          opacity: 0;
          cursor: pointer;
        }

        .checkmark {
          position: absolute;
          left: 0;
          top: 2px;
          height: 16px;
          width: 16px;
          background-color: white;
          border: 2px solid #dee2e6;
          border-radius: 3px;
          transition: all 0.2s ease;
        }

        .checkbox-label input:checked ~ .checkmark {
          background-color: #3498db;
          border-color: #3498db;
        }

        .checkmark:after {
          content: "";
          position: absolute;
          display: none;
          left: 4px;
          top: 1px;
          width: 3px;
          height: 6px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .checkbox-label input:checked ~ .checkmark:after {
          display: block;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          padding: 20px;
        }

        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 16px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .action-btn:hover:not(:disabled) {
          border-color: #3498db;
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.1);
          transform: translateY(-2px);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-icon {
          font-size: 24px;
        }

        .action-btn span:last-child {
          font-size: 12px;
          font-weight: 500;
          color: #495057;
        }

        @media (max-width: 768px) {
          .container.rota-builder {
            padding: 15px;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .header-actions {
            justify-content: stretch;
            flex-direction: column;
          }

          .btn {
            justify-content: center;
            padding: 14px 20px;
          }

          .page-title {
            font-size: 28px;
          }

          .panel-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .panel-controls {
            justify-content: center;
          }

          .quick-actions {
            grid-template-columns: repeat(2, 1fr);
            padding: 16px;
          }

          .empty-state-card {
            margin: 20px auto;
            padding: 40px 20px;
          }

          .empty-state-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .empty-state-icon {
            font-size: 48px;
          }

          .status-card {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }

          .status-icon {
            align-self: center;
          }

          .rota-status-bar {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .status-badge-group {
            flex-wrap: wrap;
            justify-content: center;
          }

          .published-notice {
            justify-content: center;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .quick-actions {
            grid-template-columns: 1fr;
          }

          .header-actions {
            gap: 8px;
          }

          .btn {
            padding: 12px 16px;
          }

          .empty-state-card {
            padding: 30px 15px;
          }

          .empty-state-card h2 {
            font-size: 20px;
          }

          .status-badge-group {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default RotaBuilderPage;