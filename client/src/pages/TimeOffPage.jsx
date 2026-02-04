import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getAllTimeOff, approveTimeOff, denyTimeOff } from '../api/timeOffAPI';
import TimeOffList from '../components/timeoff/TimeOffList';
import TimeOffForm from '../components/timeoff/TimeOffForm';

/**
 * TimeOffPage - Manage staff time off requests
 * 
 * Features:
 * - View all time off requests with filtering
 * - Add new time off requests
 * - Edit existing requests
 * - Delete time off requests
 * - Approve/deny pending requests
 * - Responsive design with modern UI
 */
const TimeOffPage = () => {
  const { showError, showSuccess } = useAppContext();
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Load time off requests on component mount
  useEffect(() => {
    loadTimeOffRequests();
  }, []);

  // Load time off requests from API
  const loadTimeOffRequests = async () => {
    try {
      setLoading(true);
      const requests = await getAllTimeOff();
      setTimeOffRequests(requests || []);
    } catch (error) {
      showError('Failed to load time off requests');
      setTimeOffRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening the form for new request
  const handleAddNew = () => {
    setEditingRequest(null);
    setShowForm(true);
  };

  // Handle opening the form for editing
  const handleEdit = (request) => {
    setEditingRequest(request);
    setShowForm(true);
  };

  // Handle closing the form
  const handleFormClose = () => {
    setShowForm(false);
    setEditingRequest(null);
  };

  // Handle form success (create/update)
  const handleFormSuccess = () => {
    loadTimeOffRequests();
  };

  // Calculate statistics
  const getStatistics = () => {
    const total = timeOffRequests.length;
    const pending = timeOffRequests.filter(r => r.status === 'pending').length;
    const approved = timeOffRequests.filter(r => r.status === 'approved').length;
    const denied = timeOffRequests.filter(r => r.status === 'denied').length;
    
    return { total, pending, approved, denied };
  };

  // Get filtered data for export
  const getFilteredData = () => {
    if (activeTab === 'all') return timeOffRequests;
    return timeOffRequests.filter(request => request.status === activeTab);
  };

  // Export to CSV
  const exportToCSV = () => {
    const data = getFilteredData();
    if (data.length === 0) {
      showError('No data to export');
      return;
    }

    const headers = ['Staff Name', 'Role', 'Type', 'Start Date', 'End Date', 'Duration (Days)', 'Status', 'Reason', 'Notes', 'Created Date'];
    
    const csvContent = [
      headers,
      ...data.map(request => [
        request.staffId?.name || 'Unknown',
        request.staffId?.role || 'Unknown',
        formatReason(request.reason), // Format reason for display
        new Date(request.startDate).toLocaleDateString('en-GB'),
        new Date(request.endDate).toLocaleDateString('en-GB'),
        calculateDuration(request.startDate, request.endDate),
        request.status,
        request.notes || '', // Main description in notes
        '', // No separate notes field in current structure
        new Date(request.createdAt).toLocaleDateString('en-GB')
      ])
    ];

    const csv = csvContent.map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `time-off-requests-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess(`Exported ${data.length} time off requests to CSV`);
    setShowExportModal(false);
  };

  // Export to JSON
  const exportToJSON = () => {
    const data = getFilteredData();
    if (data.length === 0) {
      showError('No data to export');
      return;
    }

    const jsonData = data.map(request => ({
      staffName: request.staffId?.name || 'Unknown',
      staffRole: request.staffId?.role || 'Unknown',
      staffEmail: request.staffId?.email || 'Unknown',
      type: formatReason(request.reason), // Format reason for display
      startDate: request.startDate,
      endDate: request.endDate,
      durationDays: calculateDuration(request.startDate, request.endDate),
      status: request.status,
      notes: request.notes || '', // Main description in notes
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `time-off-requests-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess(`Exported ${data.length} time off requests to JSON`);
    setShowExportModal(false);
  };

  // Calculate duration in days
  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Format reason for display (family_emergency -> Family Emergency)
  const formatReason = (reason) => {
    if (!reason) return '';
    return reason
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get reports data for analytics
  const getReportsData = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Time off by type
    const typeBreakdown = timeOffRequests.reduce((acc, request) => {
      acc[request.reason] = (acc[request.reason] || 0) + 1; // Backend uses reason field
      return acc;
    }, {});

    // Upcoming time off (next 30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingTimeOff = timeOffRequests.filter(request => 
      request.status === 'approved' &&
      new Date(request.startDate) >= now &&
      new Date(request.startDate) <= thirtyDaysFromNow
    );

    // Monthly trends
    const monthlyData = timeOffRequests.reduce((acc, request) => {
      const requestDate = new Date(request.startDate);
      const monthKey = `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {});

    // Staff with most time off
    const staffTimeOff = timeOffRequests.reduce((acc, request) => {
      const staffName = request.staffId?.name || 'Unknown';
      if (!acc[staffName]) {
        acc[staffName] = { total: 0, days: 0 };
      }
      acc[staffName].total += 1;
      acc[staffName].days += calculateDuration(request.startDate, request.endDate);
      return acc;
    }, {});

    const staffStats = Object.entries(staffTimeOff)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);

    // Average approval time for processed requests
    const processedRequests = timeOffRequests.filter(r => 
      r.status !== 'pending' && r.createdAt && r.updatedAt
    );
    
    const avgApprovalTime = processedRequests.length > 0 
      ? processedRequests.reduce((sum, request) => {
          const created = new Date(request.createdAt);
          const updated = new Date(request.updatedAt);
          return sum + (updated - created);
        }, 0) / processedRequests.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    return {
      typeBreakdown,
      upcomingTimeOff,
      monthlyData,
      staffStats,
      avgApprovalTime,
      totalDaysRequested: timeOffRequests.reduce((sum, request) => 
        sum + calculateDuration(request.startDate, request.endDate), 0
      )
    };
  };

  // Get pending requests for bulk actions
  const getPendingRequests = () => {
    return timeOffRequests.filter(request => request.status === 'pending');
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedRequests.length === 0) {
      showError('Please select requests to approve');
      return;
    }

    try {
      const promises = selectedRequests.map(id => approveTimeOff(id));
      await Promise.all(promises);
      
      showSuccess(`Successfully approved ${selectedRequests.length} requests`);
      setSelectedRequests([]);
      setSelectAll(false);
      setShowBulkActionsModal(false);
      loadTimeOffRequests();
    } catch (error) {
      showError('Failed to approve some requests');
    }
  };

  // Handle bulk deny
  const handleBulkDeny = async (reason) => {
    if (selectedRequests.length === 0) {
      showError('Please select requests to deny');
      return;
    }

    if (!reason.trim()) {
      showError('Please provide a reason for denial');
      return;
    }

    try {
      const promises = selectedRequests.map(id => denyTimeOff(id, reason));
      await Promise.all(promises);
      
      showSuccess(`Successfully denied ${selectedRequests.length} requests`);
      setSelectedRequests([]);
      setSelectAll(false);
      setShowBulkActionsModal(false);
      loadTimeOffRequests();
    } catch (error) {
      showError('Failed to deny some requests');
    }
  };

  // Toggle request selection
  const toggleRequestSelection = (requestId) => {
    setSelectedRequests(prev => {
      const newSelection = prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId];
      
      // Update select all state
      const pendingRequests = getPendingRequests();
      setSelectAll(pendingRequests.length > 0 && newSelection.length === pendingRequests.length);
      
      return newSelection;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    const pendingRequests = getPendingRequests();
    if (selectAll) {
      setSelectedRequests([]);
      setSelectAll(false);
    } else {
      setSelectedRequests(pendingRequests.map(req => req._id));
      setSelectAll(true);
    }
  };

  const stats = getStatistics();

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading time off requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Page header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            📅 Time Off Management
          </h1>
          <p className="page-description">
            Manage staff holiday requests, sick leave, and other time off requests.
          </p>
        </div>
        <div className="header-actions">
          {getPendingRequests().length > 0 && (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowBulkActionsModal(true)}
            >
              <span className="btn-icon">⚡</span>
              Bulk Actions
            </button>
          )}
          <button 
            className="btn btn-secondary"
            onClick={() => setShowReportsModal(true)}
          >
            <span className="btn-icon">📈</span>
            Reports
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowExportModal(true)}
          >
            <span className="btn-icon">📊</span>
            Export
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleAddNew}
          >
            <span className="btn-icon">+</span>
            New Request
          </button>
        </div>
      </div>

      {/* Statistics overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Requests</div>
          </div>
        </div>
        
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        
        <div className="stat-card approved">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-number">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        
        <div className="stat-card denied">
          <div className="stat-icon">✗</div>
          <div className="stat-content">
            <div className="stat-number">{stats.denied}</div>
            <div className="stat-label">Denied</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <TimeOffList
          timeOffRequests={timeOffRequests}
          onEdit={handleEdit}
          onRefresh={loadTimeOffRequests}
          selectedTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Form modal */}
      <TimeOffForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editingRequest={editingRequest}
      />

      {/* Export modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal export-modal">
            <div className="modal-header">
              <h3>📊 Export Time Off Data</h3>
              <button 
                className="modal-close"
                onClick={() => setShowExportModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="export-info">
                <p>
                  <strong>Current filter:</strong> {activeTab === 'all' ? 'All Requests' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Requests`}
                </p>
                <p>
                  <strong>Records to export:</strong> {getFilteredData().length} time off requests
                </p>
                <p className="export-note">
                  The export will include staff details, request information, dates, and status.
                </p>
              </div>
              <div className="export-formats">
                <button
                  className="btn export-btn"
                  onClick={exportToCSV}
                >
                  <span className="btn-icon">📄</span>
                  <span>
                    Export as CSV
                    <small>Spreadsheet format for Excel</small>
                  </span>
                </button>
                <button
                  className="btn export-btn"
                  onClick={exportToJSON}
                >
                  <span className="btn-icon">📋</span>
                  <span>
                    Export as JSON
                    <small>Data format for developers</small>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports modal */}
      {showReportsModal && (() => {
        const reportsData = getReportsData();
        return (
          <div className="modal-overlay">
            <div className="modal reports-modal">
              <div className="modal-header">
                <h3>📈 Time Off Reports & Analytics</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowReportsModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body reports-body">
                {/* Summary Cards */}
                <div className="reports-summary">
                  <div className="summary-card">
                    <div className="summary-icon">📅</div>
                    <div className="summary-content">
                      <div className="summary-number">{timeOffRequests.length}</div>
                      <div className="summary-label">Total Requests</div>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-icon">⏳</div>
                    <div className="summary-content">
                      <div className="summary-number">{reportsData.totalDaysRequested}</div>
                      <div className="summary-label">Days Requested</div>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-icon">⚡</div>
                    <div className="summary-content">
                      <div className="summary-number">{Math.round(reportsData.avgApprovalTime)}</div>
                      <div className="summary-label">Avg Processing (days)</div>
                    </div>
                  </div>
                </div>

                {/* Request Types */}
                <div className="reports-section">
                  <h4>📊 Requests by Type</h4>
                  <div className="type-breakdown">
                    {Object.entries(reportsData.typeBreakdown).map(([type, count]) => (
                      <div key={type} className="type-item">
                        <div className="type-info">
                          <span className="type-name">{formatReason(type)}</span>
                          <span className="type-count">{count} requests</span>
                        </div>
                        <div className="type-bar">
                          <div 
                            className="type-fill"
                            style={{
                              width: `${(count / Math.max(...Object.values(reportsData.typeBreakdown))) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Time Off */}
                <div className="reports-section">
                  <h4>🗓️ Upcoming Time Off (Next 30 Days)</h4>
                  {reportsData.upcomingTimeOff.length === 0 ? (
                    <p className="no-data">No upcoming approved time off in the next 30 days.</p>
                  ) : (
                    <div className="upcoming-list">
                      {reportsData.upcomingTimeOff.slice(0, 5).map(request => (
                        <div key={request._id} className="upcoming-item">
                          <div className="upcoming-staff">{request.staffId?.name}</div>
                          <div className="upcoming-dates">
                            {new Date(request.startDate).toLocaleDateString('en-GB')} - {new Date(request.endDate).toLocaleDateString('en-GB')}
                          </div>
                          <div className="upcoming-type">{formatReason(request.reason)}</div>
                        </div>
                      ))}
                      {reportsData.upcomingTimeOff.length > 5 && (
                        <div className="upcoming-more">
                          +{reportsData.upcomingTimeOff.length - 5} more upcoming requests
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Top Staff by Time Off */}
                <div className="reports-section">
                  <h4>👥 Staff Time Off Summary</h4>
                  {reportsData.staffStats.length === 0 ? (
                    <p className="no-data">No time off data available.</p>
                  ) : (
                    <div className="staff-stats">
                      {reportsData.staffStats.map(staff => (
                        <div key={staff.name} className="staff-stat">
                          <div className="staff-name">{staff.name}</div>
                          <div className="staff-numbers">
                            <span>{staff.total} requests</span>
                            <span>{staff.days} days</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bulk Actions modal */}
      {showBulkActionsModal && (
        <div className="modal-overlay">
          <div className="modal bulk-actions-modal">
            <div className="modal-header">
              <h3>⚡ Bulk Actions for Pending Requests</h3>
              <button 
                className="modal-close"
                onClick={() => setShowBulkActionsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body bulk-actions-body">
              {/* Selection controls */}
              <div className="selection-controls">
                <label className="select-all-label">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                  />
                  Select All Pending Requests ({getPendingRequests().length})
                </label>
                <div className="selection-info">
                  {selectedRequests.length} of {getPendingRequests().length} selected
                </div>
              </div>

              {/* Pending requests list */}
              <div className="bulk-requests-list">
                {getPendingRequests().map(request => (
                  <div key={request._id} className="bulk-request-item">
                    <label className="request-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedRequests.includes(request._id)}
                        onChange={() => toggleRequestSelection(request._id)}
                      />
                      <div className="request-details">
                        <div className="request-staff">{request.staffId?.name}</div>
                        <div className="request-info">
                          {formatReason(request.reason)} • {new Date(request.startDate).toLocaleDateString('en-GB')} to {new Date(request.endDate).toLocaleDateString('en-GB')}
                        </div>
                        <div className="request-reason">{request.notes}</div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="bulk-actions-buttons">
                <button
                  className="btn btn-approve bulk-approve-btn"
                  onClick={handleBulkApprove}
                  disabled={selectedRequests.length === 0}
                >
                  <span className="btn-icon">✓</span>
                  <span>
                    Approve Selected ({selectedRequests.length})
                    <small>Approve all selected requests</small>
                  </span>
                </button>
                <button
                  className="btn btn-deny bulk-deny-btn"
                  onClick={() => {
                    const reason = prompt('Please provide a reason for denying these requests:');
                    if (reason) handleBulkDeny(reason);
                  }}
                  disabled={selectedRequests.length === 0}
                >
                  <span className="btn-icon">✗</span>
                  <span>
                    Deny Selected ({selectedRequests.length})
                    <small>Deny all selected requests</small>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
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

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .page-title {
          font-size: 28px;
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

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
        }

        .btn-secondary {
          background: white;
          color: #495057;
          border: 2px solid #dee2e6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .btn-secondary:hover {
          background: #f8f9fa;
          border-color: #adb5bd;
          transform: translateY(-1px);
        }

        .btn-icon {
          font-size: 16px;
          font-weight: bold;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          font-size: 28px;
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8f9fa;
        }

        .stat-card.pending .stat-icon {
          background-color: #fff3cd;
        }

        .stat-card.approved .stat-icon {
          background-color: #d1f2eb;
        }

        .stat-card.denied .stat-icon {
          background-color: #f8d7da;
        }

        .stat-content {
          flex: 1;
        }

        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #6c757d;
          font-weight: 500;
        }

        .main-content {
          margin-bottom: 32px;
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

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          max-width: 90vw;
          max-height: 90vh;
          overflow: hidden;
          animation: modalSlideIn 0.2s ease-out;
        }

        .export-modal {
          width: 500px;
        }

        .reports-modal {
          width: 800px;
          max-height: 85vh;
          overflow-y: auto;
        }

        .bulk-actions-modal {
          width: 700px;
          max-height: 85vh;
          overflow-y: auto;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 24px 0 24px;
          border-bottom: 1px solid #eee;
          margin-bottom: 24px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #2c3e50;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          color: #6c757d;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          background: #f8f9fa;
          color: #495057;
        }

        .modal-body {
          padding: 0 24px 24px 24px;
        }

        .export-info {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          border-left: 4px solid #3498db;
        }

        .export-info p {
          margin: 0 0 8px 0;
          font-size: 14px;
          line-height: 1.4;
        }

        .export-info p:last-child {
          margin-bottom: 0;
        }

        .export-note {
          color: #6c757d;
          font-style: italic;
        }

        .export-formats {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .export-btn {
          justify-content: flex-start;
          padding: 16px;
          text-align: left;
          background: white;
          border: 2px solid #dee2e6;
          transition: all 0.2s ease;
          color: #2c3e50 !important;
        }

        .export-btn:hover {
          border-color: #3498db;
          background: #f8f9fa;
          transform: none;
        }

        .export-btn span:not(.btn-icon) {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .export-btn small {
          color: #6c757d;
          font-size: 12px;
          font-weight: normal;
        }

        /* Reports Modal Styles */
        .reports-body {
          padding: 0 24px 24px 24px;
        }

        .reports-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .summary-icon {
          font-size: 24px;
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .summary-content {
          flex: 1;
        }

        .summary-number {
          font-size: 18px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 2px;
        }

        .summary-label {
          font-size: 12px;
          color: #6c757d;
          font-weight: 500;
        }

        .reports-section {
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }

        .reports-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .reports-section h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
        }

        .type-breakdown {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .type-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .type-info {
          min-width: 120px;
          display: flex;
          flex-direction: column;
        }

        .type-name {
          font-weight: 500;
          color: #2c3e50;
          text-transform: capitalize;
        }

        .type-count {
          font-size: 12px;
          color: #6c757d;
        }

        .type-bar {
          flex: 1;
          height: 20px;
          background: #f1f3f4;
          border-radius: 10px;
          overflow: hidden;
        }

        .type-fill {
          height: 100%;
          background: linear-gradient(135deg, #3498db, #2980b9);
          border-radius: 10px;
          transition: width 0.3s ease;
        }

        .upcoming-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .upcoming-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid #3498db;
        }

        .upcoming-staff {
          font-weight: 500;
          color: #2c3e50;
        }

        .upcoming-dates {
          font-size: 14px;
          color: #6c757d;
        }

        .upcoming-type {
          font-size: 12px;
          background: #e9ecef;
          padding: 4px 8px;
          border-radius: 4px;
          color: #495057;
          text-transform: capitalize;
        }

        .upcoming-more {
          text-align: center;
          padding: 8px;
          color: #6c757d;
          font-style: italic;
          font-size: 14px;
        }

        .staff-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .staff-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .staff-name {
          font-weight: 500;
          color: #2c3e50;
        }

        .staff-numbers {
          display: flex;
          gap: 16px;
          font-size: 14px;
          color: #6c757d;
        }

        .no-data {
          text-align: center;
          color: #6c757d;
          font-style: italic;
          padding: 20px;
          margin: 0;
        }

        /* Bulk Actions Modal Styles */
        .bulk-actions-body {
          padding: 0 24px 24px 24px;
        }

        .selection-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #dee2e6;
        }

        .select-all-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          color: #2c3e50;
          cursor: pointer;
        }

        .select-all-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .selection-info {
          font-size: 14px;
          color: #6c757d;
          font-weight: 500;
        }

        .bulk-requests-list {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .bulk-request-item {
          border-bottom: 1px solid #f1f3f4;
          last-child: {
            border-bottom: none;
          }
        }

        .bulk-request-item:last-child {
          border-bottom: none;
        }

        .request-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .request-checkbox:hover {
          background: #f8f9fa;
        }

        .request-checkbox input[type="checkbox"] {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          cursor: pointer;
        }

        .request-details {
          flex: 1;
        }

        .request-staff {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .request-info {
          font-size: 14px;
          color: #6c757d;
          margin-bottom: 4px;
        }

        .request-reason {
          font-size: 13px;
          color: #8e9aaf;
          font-style: italic;
        }

        .bulk-actions-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .bulk-approve-btn {
          background: linear-gradient(135deg, #27ae60, #229954);
          color: white;
          border: none;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-start;
          transition: all 0.2s ease;
        }

        .bulk-approve-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #229954, #1e8449);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
        }

        .bulk-approve-btn:hover:not(:disabled) small {
          color: white;
        }

        .bulk-deny-btn {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
          border: none;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-start;
          transition: all 0.2s ease;
        }

        .bulk-deny-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #c0392b, #a93226);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }

        .bulk-deny-btn:hover:not(:disabled) small {
          color: white;
        }

        .bulk-approve-btn:disabled,
        .bulk-deny-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .bulk-actions-buttons .btn span:not(.btn-icon) {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
        }

        .bulk-actions-buttons .btn small {
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          font-weight: normal;
        }

        @media (max-width: 768px) {
          .container {
            padding: 15px;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .header-actions {
            flex-direction: column;
            gap: 8px;
          }

          .page-title {
            font-size: 24px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .stat-card {
            padding: 20px 16px;
          }

          .stat-icon {
            font-size: 24px;
            width: 48px;
            height: 48px;
          }

          .stat-number {
            font-size: 20px;
          }

          .export-modal {
            width: 95vw;
            margin: 20px;
          }

          .reports-modal {
            width: 95vw;
            margin: 20px;
          }

          .reports-summary {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .upcoming-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .staff-stat {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .staff-numbers {
            gap: 12px;
          }

          .bulk-actions-modal {
            width: 95vw;
            margin: 20px;
          }

          .bulk-actions-buttons {
            grid-template-columns: 1fr;
          }

          .selection-controls {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .header-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .export-formats {
            gap: 8px;
          }

          .export-btn {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default TimeOffPage;