import { useState, useEffect } from 'react';
import { staffAPI } from '../api/staffAPI';
import { Modal, ConfirmDialog, Toast } from '../components/ui/Modal';
import StaffForm from '../components/ui/StaffForm';
import { LoadingSpinner, ErrorMessage } from '../components/ui/UIComponents';
import { formatRoleForDisplay } from '../utils/roleUtils';
import { formatPhoneForDisplay } from '../utils/phoneUtils';
import { STAFF_ROLES } from '../utils/constants';

/**
 * StaffPage - Comprehensive staff management with CRUD operations
 */
const StaffPage = () => {
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    // Filter staff based on search term and role filter
    let filtered = staff;

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone.includes(searchTerm)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    setFilteredStaff(filtered);
  }, [staff, searchTerm, roleFilter]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Attempting to load staff from API...');
      const data = await staffAPI.getAll();
      console.log('Staff data loaded successfully:', data);
      setStaff(data);
    } catch (err) {
      console.error('Error loading staff - Full error:', err);
      console.error('Error message:', err.message);
      console.error('Error status:', err.status);
      setError(`Failed to load staff members: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleAddStaff = async (staffData) => {
    try {
      setFormLoading(true);
      const newStaff = await staffAPI.create(staffData);
      setStaff(prev => [...prev, newStaff]);
      setShowAddModal(false);
      showToast('Staff member added successfully!');
      return { success: true };
    } catch (err) {
      console.error('Error adding staff:', err);
      
      // Handle specific validation errors
      if (err.message.includes('already exists') || err.message.includes('Email')) {
        showToast('Email address already in use by another staff member', 'error');
        return { 
          success: false, 
          errors: { email: 'This email address is already in use by another staff member' },
          validationSummary: ['Email address is already registered to another staff member']
        };
      }
      
      // Handle other validation errors
      if (err.status === 400) {
        showToast('Please check the form for validation errors', 'error');
        return { 
          success: false, 
          errors: { general: err.message },
          validationSummary: [err.message || 'Please check all fields and try again']
        };
      }
      
      showToast('Failed to add staff member. Please try again.', 'error');
      return { success: false };
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditStaff = async (staffData) => {
    try {
      setFormLoading(true);
      const updatedStaff = await staffAPI.update(selectedStaff._id, staffData);
      setStaff(prev => prev.map(member => 
        member._id === selectedStaff._id ? updatedStaff : member
      ));
      setShowEditModal(false);
      setSelectedStaff(null);
      showToast('Staff member updated successfully!');
      return { success: true };
    } catch (err) {
      console.error('Error updating staff:', err);
      
      // Handle specific validation errors
      if (err.message.includes('already exists') || err.message.includes('Email')) {
        showToast('Email address already in use by another staff member', 'error');
        return { 
          success: false, 
          errors: { email: 'This email address is already in use by another staff member' },
          validationSummary: ['Email address is already registered to another staff member']
        };
      }
      
      // Handle other validation errors
      if (err.status === 400) {
        showToast('Please check the form for validation errors', 'error');
        return { 
          success: false, 
          errors: { general: err.message },
          validationSummary: [err.message || 'Please check all fields and try again']
        };
      }
      
      showToast('Failed to update staff member. Please try again.', 'error');
      return { success: false };
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    try {
      await staffAPI.delete(selectedStaff._id);
      setStaff(prev => prev.filter(member => member._id !== selectedStaff._id));
      setShowDeleteDialog(false);
      setSelectedStaff(null);
      showToast('Staff member removed successfully!');
    } catch (err) {
      console.error('Error deleting staff:', err);
      showToast('Failed to remove staff member', 'error');
    }
  };

  const openEditModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowEditModal(true);
  };

  const openDeleteDialog = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowDeleteDialog(true);
  };

  // Export functionality
  const exportStaffToCSV = () => {
    const csvContent = generateCSV(filteredStaff);
    downloadFile(csvContent, 'staff-list.csv', 'text/csv');
    showToast('Staff list exported to CSV successfully!');
  };

  const exportStaffToJSON = () => {
    const jsonContent = generateJSON(filteredStaff);
    downloadFile(jsonContent, 'staff-list.json', 'application/json');
    showToast('Staff list exported to JSON successfully!');
  };

  const generateCSV = (staffList) => {
    const headers = [
      'Name',
      'Email', 
      'Phone',
      'Role',
      'Hourly Rate (£)',
      'Max Hours/Week',
      'Available Days',
      'Status',
      'Created Date'
    ];

    const rows = staffList.map(member => [
      `"${member.name}"`,
      `"${member.email}"`,
      `"${formatPhoneForDisplay(member.phone)}"`,
      `"${formatRoleForDisplay(member.role)}"`,
      member.hourlyRate.toFixed(2),
      member.maxHoursPerWeek,
      `"${member.availableDays.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')}"`,
      member.isActive ? 'Active' : 'Inactive',
      new Date(member.createdAt).toLocaleDateString('en-GB') // DD/MM/YYYY format
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  };

  const generateJSON = (staffList) => {
    const exportData = staffList.map(member => ({
      id: member._id,
      name: member.name,
      email: member.email,
      phone: formatPhoneForDisplay(member.phone),
      role: member.role,
      roleDisplay: formatRoleForDisplay(member.role),
      hourlyRate: member.hourlyRate,
      maxHoursPerWeek: member.maxHoursPerWeek,
      availableDays: member.availableDays,
      isActive: member.isActive,
      createdAt: member.createdAt,
      weeklyCost: (member.hourlyRate * member.maxHoursPerWeek).toFixed(2)
    }));

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalStaff: exportData.length,
      activeStaff: exportData.filter(s => s.isActive).length,
      data: exportData
    }, null, 2);
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getRoleStats = () => {
    return {
      total: staff.length,
      manager: staff.filter(s => s.role === 'manager').length,
      chef: staff.filter(s => s.role === 'chef').length,
      waiter: staff.filter(s => s.role === 'waiter').length,
      bartender: staff.filter(s => s.role === 'bartender').length,
      cleaner: staff.filter(s => s.role === 'cleaner').length,
    };
  };

  // Reports data calculations
  const getReportsData = () => {
    const activeStaff = staff.filter(s => s.isActive);
    
    // Role distribution
    const roleBreakdown = {};
    STAFF_ROLES.forEach(role => {
      roleBreakdown[role] = activeStaff.filter(s => s.role === role).length;
    });

    // Cost analysis
    const totalWeeklyCost = activeStaff.reduce((sum, s) => sum + (s.hourlyRate * s.maxHoursPerWeek), 0);
    const avgHourlyRate = activeStaff.length ? activeStaff.reduce((sum, s) => sum + s.hourlyRate, 0) / activeStaff.length : 0;

    // Availability by day
    const availabilityByDay = {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
      friday: 0, saturday: 0, sunday: 0
    };
    activeStaff.forEach(member => {
      member.availableDays.forEach(day => {
        if (availabilityByDay[day] !== undefined) {
          availabilityByDay[day]++;
        }
      });
    });

    // Compliance checks
    const lowPaidStaff = activeStaff.filter(s => s.hourlyRate < 10.50).length;
    const overworkedStaff = activeStaff.filter(s => s.maxHoursPerWeek > 48).length;

    return {
      roleBreakdown,
      totalWeeklyCost,
      avgHourlyRate,
      availabilityByDay,
      lowPaidStaff,
      overworkedStaff,
      totalActive: activeStaff.length,
      totalInactive: staff.filter(s => !s.isActive).length
    };
  };

  // Bulk actions functionality
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStaffIds(filteredStaff.map(member => member._id));
    } else {
      setSelectedStaffIds([]);
    }
  };

  const handleSelectStaff = (staffId, checked) => {
    if (checked) {
      setSelectedStaffIds(prev => [...prev, staffId]);
    } else {
      setSelectedStaffIds(prev => prev.filter(id => id !== staffId));
    }
  };

  const bulkDeactivateStaff = async () => {
    try {
      setFormLoading(true);
      const promises = selectedStaffIds.map(id => staffAPI.delete(id));
      await Promise.all(promises);
      
      setStaff(prev => prev.filter(member => !selectedStaffIds.includes(member._id)));
      setSelectedStaffIds([]);
      setShowBulkActionsModal(false);
      showToast(`${selectedStaffIds.length} staff members deactivated successfully!`);
    } catch (err) {
      console.error('Error deactivating staff:', err);
      showToast('Failed to deactivate some staff members', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const bulkExportSelected = () => {
    const selectedStaff = filteredStaff.filter(member => selectedStaffIds.includes(member._id));
    const csvContent = generateCSV(selectedStaff);
    downloadFile(csvContent, `selected-staff-${selectedStaff.length}.csv`, 'text/csv');
    showToast(`${selectedStaff.length} staff members exported successfully!`);
    setShowBulkActionsModal(false);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">👥 Staff Management</h1>
        </div>
        <LoadingSpinner size="large" message="Loading staff members..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">👥 Staff Management</h1>
        </div>
        <ErrorMessage message={error} onRetry={loadStaff} />
      </div>
    );
  }

  const stats = getRoleStats();

  return (
    <div className="container">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={() => setToast({ show: false, message: '', type: 'success' })}
      />

      <div className="page-header">
        <h1 className="page-title">👥 Staff Management</h1>
        <p className="page-description">
          Manage your restaurant staff members, their roles, and availability.
        </p>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Add New Staff Member
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="card">
        <div className="search-filters">
          <div className="search-bar">
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search staff by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-controls">
            <select
              className="form-input filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              {STAFF_ROLES.map(role => (
                <option key={role} value={role}>
                  {formatRoleForDisplay(role)}
                </option>
              ))}
            </select>
            <span className="results-count">
              {filteredStaff.length} of {staff.length} staff members
            </span>
          </div>
        </div>
      </div>

      {/* Staff Statistics */}
      <div className="grid">
        <div className="card">
          <h3>Staff Overview</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Staff</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.manager}</div>
              <div className="stat-label">Managers</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.chef}</div>
              <div className="stat-label">Chefs</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.waiter}</div>
              <div className="stat-label">Waiters</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.bartender}</div>
              <div className="stat-label">Bartenders</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.cleaner}</div>
              <div className="stat-label">Cleaners</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button 
              className="action-btn"
              onClick={() => setShowAddModal(true)}
            >
              👤 Add Staff Member
            </button>
            <button 
              className="action-btn"
              onClick={() => setShowExportModal(true)}
            >
              📤 Export Staff List
            </button>
            <button 
              className="action-btn"
              onClick={() => setShowReportsModal(true)}
            >
              📊 View Reports
            </button>
            <button 
              className="action-btn"
              onClick={() => setShowBulkActionsModal(true)}
            >
              ⚙️ Bulk Actions
            </button>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="card">
        <div className="table-header">
          <h2>Staff Members ({filteredStaff.length})</h2>
        </div>
        
        {filteredStaff.length === 0 ? (
          <div className="empty-state">
            {staff.length === 0 ? (
              <>
                <div className="empty-icon">👥</div>
                <h3>No staff members yet</h3>
                <p>Start by adding your first team member to get started with scheduling.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAddModal(true)}
                >
                  Add First Staff Member
                </button>
              </>
            ) : (
              <>
                <div className="empty-icon">🔍</div>
                <h3>No staff found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.length === filteredStaff.length && filteredStaff.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="bulk-checkbox"
                    />
                  </th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Rate</th>
                  <th>Max Hours</th>
                  <th>Available Days</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.includes(member._id)}
                        onChange={(e) => handleSelectStaff(member._id, e.target.checked)}
                        className="bulk-checkbox"
                      />
                    </td>
                    <td>
                      <div className="staff-info">
                        <div className="staff-name">{member.name}</div>
                        <div className="staff-email">{member.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge role-${member.role}`}>
                        {formatRoleForDisplay(member.role)}
                      </span>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div>{formatPhoneForDisplay(member.phone)}</div>
                      </div>
                    </td>
                    <td>
                      <span className="hourly-rate">£{member.hourlyRate}/hr</span>
                    </td>
                    <td>
                      <span className="max-hours">{member.maxHoursPerWeek}h</span>
                    </td>
                    <td>
                      <div className="available-days">
                        {member.availableDays.length} day{member.availableDays.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => openEditModal(member)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => openDeleteDialog(member)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Staff Member"
        size="large"
      >
        <StaffForm
          onSubmit={handleAddStaff}
          onCancel={() => setShowAddModal(false)}
          isLoading={formLoading}
        />
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Staff Member"
        size="large"
      >
        {selectedStaff && (
          <StaffForm
            staff={selectedStaff}
            onSubmit={handleEditStaff}
            onCancel={() => setShowEditModal(false)}
            isLoading={formLoading}
          />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteStaff}
        title="Remove Staff Member"
        message={`Are you sure you want to remove ${selectedStaff?.name}? This action cannot be undone.`}
        confirmText="Remove"
        type="danger"
      />

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Staff List"
        size="medium"
      >
        <div className="export-modal">
          <div className="export-info">
            <h4>Export Current View</h4>
            <p>Export {filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''} currently shown in the table.</p>
            
            {searchTerm && (
              <p className="filter-info">
                <strong>Search:</strong> "{searchTerm}"
              </p>
            )}
            {roleFilter !== 'all' && (
              <p className="filter-info">
                <strong>Role Filter:</strong> {formatRoleForDisplay(roleFilter)}
              </p>
            )}
          </div>

          <div className="export-options">
            <div className="export-format">
              <button 
                className="btn btn-outline export-btn"
                onClick={() => {
                  exportStaffToCSV();
                  setShowExportModal(false);
                }}
              >
                📊 Export as CSV
                <small>For spreadsheet applications (Excel, Google Sheets)</small>
              </button>

              <button 
                className="btn btn-outline export-btn"
                onClick={() => {
                  exportStaffToJSON();
                  setShowExportModal(false);
                }}
              >
                🗂️ Export as JSON
                <small>For data import/backup purposes</small>
              </button>
            </div>
          </div>

          <div className="export-actions">
            <button 
              className="btn btn-outline"
              onClick={() => setShowExportModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Reports Modal */}
      <Modal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        title="Staff Reports & Analytics"
        size="large"
      >
        <div className="reports-modal">
          {(() => {
            const reports = getReportsData();
            const stats = getRoleStats();
            
            return (
              <>
                {/* Quick Stats */}
                <div className="reports-section">
                  <h4>📊 Quick Statistics</h4>
                  <div className="quick-stats-grid">
                    <div className="stat-card">
                      <div className="stat-number">{reports.totalActive}</div>
                      <div className="stat-label">Active Staff</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">£{reports.totalWeeklyCost.toFixed(0)}</div>
                      <div className="stat-label">Weekly Cost</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">£{reports.avgHourlyRate.toFixed(2)}</div>
                      <div className="stat-label">Avg Hourly Rate</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{Math.max(...Object.values(reports.availabilityByDay))}</div>
                      <div className="stat-label">Peak Day Coverage</div>
                    </div>
                  </div>
                </div>

                {/* Role Breakdown */}
                <div className="reports-section">
                  <h4>👥 Staff by Role</h4>
                  <div className="role-breakdown">
                    {Object.entries(reports.roleBreakdown)
                      .filter(([role, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([role, count]) => (
                        <div key={role} className="role-bar">
                          <div className="role-info">
                            <span className="role-name">{formatRoleForDisplay(role)}</span>
                            <span className="role-count">{count} staff</span>
                          </div>
                          <div className="role-visual">
                            <div 
                              className="role-fill" 
                              style={{ width: `${(count / reports.totalActive) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Availability Heatmap */}
                <div className="reports-section">
                  <h4>📅 Availability by Day</h4>
                  <div className="availability-grid">
                    {Object.entries(reports.availabilityByDay).map(([day, count]) => (
                      <div key={day} className="day-availability">
                        <div className="day-name">{day.charAt(0).toUpperCase() + day.slice(1).slice(0, 3)}</div>
                        <div className="day-count">{count}</div>
                        <div className="day-bar">
                          <div 
                            className="day-fill"
                            style={{ height: `${(count / Math.max(...Object.values(reports.availabilityByDay))) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance Alerts */}
                {(reports.lowPaidStaff > 0 || reports.overworkedStaff > 0) && (
                  <div className="reports-section">
                    <h4>⚠️ Compliance Alerts</h4>
                    <div className="compliance-alerts">
                      {reports.lowPaidStaff > 0 && (
                        <div className="alert alert-warning">
                          <strong>{reports.lowPaidStaff}</strong> staff member{reports.lowPaidStaff !== 1 ? 's' : ''} below minimum wage (£10.50/hr)
                        </div>
                      )}
                      {reports.overworkedStaff > 0 && (
                        <div className="alert alert-info">
                          <strong>{reports.overworkedStaff}</strong> staff member{reports.overworkedStaff !== 1 ? 's' : ''} working over 48 hours/week
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
          
          <div className="reports-actions">
            <button 
              className="btn btn-outline"
              onClick={() => setShowReportsModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Actions Modal */}
      <Modal
        isOpen={showBulkActionsModal}
        onClose={() => setShowBulkActionsModal(false)}
        title="Bulk Actions"
        size="medium"
      >
        <div className="bulk-actions-modal">
          <div className="bulk-info">
            <h4>Selected Staff Members</h4>
            <p>{selectedStaffIds.length} staff member{selectedStaffIds.length !== 1 ? 's' : ''} selected</p>
            
            {selectedStaffIds.length === 0 && (
              <div className="no-selection">
                <p>ℹ️ No staff members selected. Use the checkboxes in the staff table to select members for bulk actions.</p>
              </div>
            )}
          </div>

          {selectedStaffIds.length > 0 && (
            <div className="bulk-options">
              <div className="bulk-actions-grid">
                <button 
                  className="bulk-action-btn export-btn"
                  onClick={bulkExportSelected}
                >
                  📤 Export Selected
                  <small>Export {selectedStaffIds.length} selected staff to CSV</small>
                </button>

                <button 
                  className="bulk-action-btn deactivate-btn"
                  onClick={bulkDeactivateStaff}
                  disabled={formLoading}
                >
                  🚫 Deactivate Selected
                  <small>Remove {selectedStaffIds.length} staff member{selectedStaffIds.length !== 1 ? 's' : ''} from active roster</small>
                </button>
              </div>
              
              <div className="bulk-warning">
                <p><strong>⚠️ Warning:</strong> Deactivating staff members will remove them from the active roster. This action can be reversed by editing individual staff members later.</p>
              </div>
            </div>
          )}

          <div className="bulk-actions-footer">
            <button 
              className="btn btn-outline"
              onClick={() => setShowBulkActionsModal(false)}
            >
              Close
            </button>
            {selectedStaffIds.length > 0 && (
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedStaffIds([]);
                  showToast('Selection cleared');
                }}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
      </Modal>

      <style jsx>{`
        .search-filters {
          display: flex;
          gap: 20px;
          align-items: center;
          margin-bottom: 0;
        }
        
        .search-bar {
          flex: 1;
        }
        
        .search-input {
          min-width: 300px;
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.4;
          height: auto;
          background-color: #ffffff;
          color: #374151;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
        }
        
        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .search-input::placeholder {
          color: #9ca3af;
          font-size: 14px;
        }
        
        .filter-controls {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-shrink: 0;
        }
        
        .filter-select {
          min-width: 150px;
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.4;
          height: auto;
          background-color: #ffffff;
          color: #374151;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          padding-right: 44px;
        }
        
        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .filter-select option {
          color: #374151;
          background-color: #ffffff;
          padding: 8px;
        }
        
        .results-count {
          font-size: 14px;
          color: #666;
          white-space: nowrap;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        
        .stat-item {
          text-align: center;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .stat-value {
          font-size: 2rem;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 5px;
        }
        
        .stat-label {
          font-size: 12px;
          color: #7f8c8d;
        }
        
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        
        .action-btn {
          padding: 15px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
          font-size: 14px;
          text-align: center;
        }
        
        .action-btn:hover {
          background-color: #f8f9fa;
        }
        
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .staff-info {
          display: flex;
          flex-direction: column;
        }
        
        .staff-name {
          font-weight: 500;
          margin-bottom: 2px;
        }
        
        .staff-email {
          font-size: 12px;
          color: #666;
        }
        
        .contact-info {
          font-size: 14px;
        }
        
        .role-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .role-manager { background-color: #e3f2fd; color: #1976d2; }
        .role-assistant_manager { background-color: #e8eaf6; color: #3f51b5; }
        .role-head_chef { background-color: #fff8e1; color: #f57f17; }
        .role-chef { background-color: #fff3e0; color: #f57c00; }
        .role-kitchen_assistant { background-color: #fef7ff; color: #8e24aa; }
        .role-head_waiter { background-color: #f3e5f5; color: #7b1fa2; }
        .role-waiter { background-color: #f8bbd9; color: #ad1457; }
        .role-head_bartender { background-color: #e8f5e8; color: #2e7d32; }
        .role-bartender { background-color: #f1f8e9; color: #558b2f; }
        .role-hostess { background-color: #fce4ec; color: #c2185b; }
        .role-delivery_driver { background-color: #e3f2fd; color: #1565c0; }
        .role-trainee { background-color: #fff3e0; color: #ef6c00; }
        .role-cleaner { background-color: #f3e5f5; color: #7b1fa2; }
        
        .hourly-rate {
          font-weight: 500;
          color: #28a745;
        }
        
        .max-hours {
          font-weight: 500;
        }
        
        .available-days {
          font-size: 13px;
          color: #666;
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        
        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }
        
        .btn-danger {
          background-color: #dc3545;
          color: white;
          border-color: #dc3545;
        }
        
        .btn-danger:hover {
          background-color: #c82333;
          border-color: #c82333;
        }
        
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
        
        .empty-state h3 {
          margin-bottom: 10px;
          color: #333;
        }
        
        .empty-state p {
          margin-bottom: 20px;
          line-height: 1.6;
        }
        
        @media (max-width: 768px) {
          .search-filters {
            flex-direction: column;
            align-items: stretch;
          }
          
          .filter-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .quick-actions {
            grid-template-columns: 1fr;
          }
          
          .table-container {
            overflow-x: auto;
          }
          
          .action-buttons {
            flex-direction: column;
          }
        }

        /* Export Modal Styles */
        .export-modal {
          padding: 20px;
        }

        .export-info {
          margin-bottom: 24px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .export-info h4 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 16px;
        }

        .export-info p {
          margin: 4px 0;
          color: #6b7280;
          font-size: 14px;
        }

        .filter-info {
          font-size: 13px !important;
          color: #374151 !important;
          background: #e5e7eb;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
          margin: 2px 4px 2px 0;
        }

        .export-options {
          margin-bottom: 24px;
        }

        .export-format {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .export-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 16px 20px;
          text-align: left;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .export-btn small {
          font-size: 12px;
          color: white;
          margin-top: 4px;
          font-weight: normal;
          opacity: 0.8;
        }

        .export-btn:hover small {
          opacity: 1;
        }

        .export-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .export-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        /* Reports Modal Styles */
        .reports-modal {
          padding: 20px;
          max-height: 600px;
          overflow-y: auto;
        }

        .reports-section {
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #f3f4f6;
        }

        .reports-section:last-of-type {
          border-bottom: none;
        }

        .reports-section h4 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 16px;
          font-weight: 600;
        }

        .quick-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
        }

        .stat-card {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .role-breakdown {
          space: 12px;
        }

        .role-bar {
          margin-bottom: 12px;
        }

        .role-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .role-name {
          font-weight: 500;
          color: #374151;
        }

        .role-count {
          color: #6b7280;
          font-size: 13px;
        }

        .role-visual {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .role-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          transition: width 0.3s ease;
        }

        .availability-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
        }

        .day-availability {
          text-align: center;
        }

        .day-name {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }

        .day-count {
          font-size: 18px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 8px;
        }

        .day-bar {
          height: 40px;
          background: #f3f4f6;
          border-radius: 4px;
          display: flex;
          align-items: end;
          overflow: hidden;
        }

        .day-fill {
          width: 100%;
          background: linear-gradient(180deg, #3b82f6, #1d4ed8);
          border-radius: 2px;
          transition: height 0.3s ease;
        }

        .compliance-alerts {
          space: 12px;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .alert-warning {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          color: #92400e;
        }

        .alert-info {
          background: #dbeafe;
          border: 1px solid #3b82f6;
          color: #1e40af;
        }

        .reports-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          margin-top: 24px;
        }

        /* Bulk Actions Styles */
        .bulk-checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .bulk-actions-modal {
          padding: 20px;
        }

        .bulk-info {
          margin-bottom: 24px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .bulk-info h4 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 16px;
        }

        .bulk-info p {
          margin: 4px 0;
          color: #6b7280;
          font-size: 14px;
        }

        .no-selection {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 12px;
          margin-top: 12px;
        }

        .no-selection p {
          color: #92400e !important;
          margin: 0 !important;
          font-size: 13px;
        }

        .bulk-options {
          margin-bottom: 24px;
        }

        .bulk-actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .bulk-action-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 16px 20px;
          text-align: left;
          border-radius: 8px;
          border: 2px solid;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .bulk-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .bulk-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .bulk-action-btn small {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
          font-weight: normal;
        }

        .export-btn {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .export-btn:hover {
          background: #3b82f6;
          color: white;
        }

        .export-btn:hover small {
          color: white;
        }

        .deactivate-btn {
          border-color: #ef4444;
          color: #ef4444;
        }

        .deactivate-btn:hover {
          background: #ef4444;
          color: white;
        }

        .deactivate-btn:hover small {
          color: white;
        }

        .bulk-warning {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 12px;
        }

        .bulk-warning p {
          margin: 0;
          font-size: 13px;
          color: #dc2626;
        }

        .bulk-actions-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        @media (max-width: 768px) {
          .bulk-actions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default StaffPage;