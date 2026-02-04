import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { approveTimeOff, denyTimeOff, deleteTimeOff } from '../../api/timeOffAPI';
import './TimeOffList.css';

/**
 * TimeOffList - Display and manage time off requests
 * 
 * Features:
 * - Tabbed view (All, Pending, Approved, Denied)
 * - Filter by status, staff, date range
 * - Approve/deny requests
 * - Edit and delete functionality
 * - Responsive table design
 */
const TimeOffList = ({ 
  timeOffRequests = [], 
  onEdit, 
  onRefresh,
  selectedTab = 'all',
  onTabChange
}) => {
  const { showSuccess, showError, makeApiRequest } = useAppContext();
  const [filterStatus, setFilterStatus] = useState(selectedTab);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyingRequestId, setDenyingRequestId] = useState(null);
  const [denyReason, setDenyReason] = useState('');

  // Filter requests based on selected tab
  const filteredRequests = timeOffRequests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate duration in days
  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Handle approval
  const handleApprove = async (id) => {
    await makeApiRequest(
      () => approveTimeOff(id),
      {
        successMessage: 'Time off request approved successfully',
        onSuccess: () => onRefresh()
      }
    );
  };

  // Handle denial - show modal
  const handleDenyClick = (id) => {
    setDenyingRequestId(id);
    setShowDenyModal(true);
    setDenyReason('');
  };

  // Handle denial confirmation
  const handleDenyConfirm = async () => {
    if (!denyReason.trim()) {
      showError('Please provide a reason for denial');
      return;
    }

    await makeApiRequest(
      () => denyTimeOff(denyingRequestId, denyReason),
      {
        successMessage: 'Time off request denied',
        onSuccess: () => {
          onRefresh();
          setShowDenyModal(false);
          setDenyingRequestId(null);
          setDenyReason('');
        }
      }
    );
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this time off request?')) {
      return;
    }

    await makeApiRequest(
      () => deleteTimeOff(id),
      {
        successMessage: 'Time off request deleted successfully',
        onSuccess: () => onRefresh()
      }
    );
  };

  // Get status badge class
  const getStatusBadge = (status) => {
    const badges = {
      pending: 'status-badge status-pending',
      approved: 'status-badge status-approved',
      denied: 'status-badge status-denied'
    };
    return badges[status] || 'status-badge';
  };

  // Get type icon
  const getTypeIcon = (type) => {
    const icons = {
      holiday: '🏖️',
      sick: '🤒',
      personal: '👤',
      emergency: '🚨',
      family_emergency: '🚨',
      other: '📋'
    };
    return icons[type] || '📋';
  };

  // Format reason for display (family_emergency -> Family Emergency)
  const formatReason = (reason) => {
    if (!reason) return '';
    return reason
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="time-off-list">
      {/* Filter tabs */}
      <div className="filter-tabs">
        {[
          { key: 'all', label: 'All Requests', count: timeOffRequests.length },
          { key: 'pending', label: 'Pending', count: timeOffRequests.filter(r => r.status === 'pending').length },
          { key: 'approved', label: 'Approved', count: timeOffRequests.filter(r => r.status === 'approved').length },
          { key: 'denied', label: 'Denied', count: timeOffRequests.filter(r => r.status === 'denied').length }
        ].map(tab => (
          <button
            key={tab.key}
            className={`filter-tab ${filterStatus === tab.key ? 'active' : ''}`}
            onClick={() => {
              setFilterStatus(tab.key);
              if (onTabChange) onTabChange(tab.key);
            }}
          >
            {tab.label} 
            <span className="tab-count">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Time off table */}
      <div className="table-container">
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No time off requests found</h3>
            <p>No requests match the current filter criteria.</p>
          </div>
        ) : (
          <table className="time-off-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(request => (
                <tr key={request._id}>
                  <td>
                    <div className="staff-info">
                      <span className="staff-name">{request.staffId?.name || 'Unknown Staff'}</span>
                      <span className="staff-role">{request.staffId?.role}</span>
                    </div>
                  </td>
                  <td>
                    <div className="type-cell">
                      <span className="type-icon">{getTypeIcon(request.reason)}</span>
                      <span className="type-text">{formatReason(request.reason)}</span>
                    </div>
                  </td>
                  <td>{formatDate(request.startDate)}</td>
                  <td>{formatDate(request.endDate)}</td>
                  <td>
                    <span className="duration">
                      {calculateDuration(request.startDate, request.endDate)} day{calculateDuration(request.startDate, request.endDate) !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <span className={getStatusBadge(request.status)}>
                      {request.status}
                    </span>
                  </td>
                  <td>
                    <div className="reason-cell">
                      {request.notes || 'No reason provided'}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {request.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-approve"
                            onClick={() => handleApprove(request._id)}
                            title="Approve request"
                          >
                            ✓
                          </button>
                          <button
                            className="btn btn-deny"
                            onClick={() => handleDenyClick(request._id)}
                            title="Deny request"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-edit"
                        onClick={() => onEdit(request)}
                        title="Edit request"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-delete"
                        onClick={() => handleDelete(request._id)}
                        title="Delete request"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Deny modal */}
      {showDenyModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Deny Time Off Request</h3>
              <button 
                className="modal-close"
                onClick={() => setShowDenyModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Please provide a reason for denying this request:</p>
              <textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="Enter reason for denial..."
                rows={4}
                className="modal-textarea"
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDenyModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDenyConfirm}
              >
                Deny Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeOffList;