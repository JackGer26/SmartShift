import { useState, useEffect } from 'react';
import { staffAPI } from '../api/staffAPI';
import { Modal, ConfirmDialog, Toast } from '../components/ui/Modal';
import StaffForm from '../components/ui/StaffForm';
import { LoadingSpinner, ErrorMessage } from '../components/ui/UIComponents';

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
  const [selectedStaff, setSelectedStaff] = useState(null);
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
      const data = await staffAPI.getAll();
      setStaff(data);
    } catch (err) {
      setError('Failed to load staff members');
      console.error('Error loading staff:', err);
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
    } catch (err) {
      console.error('Error adding staff:', err);
      showToast('Failed to add staff member', 'error');
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
    } catch (err) {
      console.error('Error updating staff:', err);
      showToast('Failed to update staff member', 'error');
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
              <option value="manager">Manager</option>
              <option value="chef">Chef</option>
              <option value="waiter">Waiter</option>
              <option value="bartender">Bartender</option>
              <option value="cleaner">Cleaner</option>
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
            <button className="action-btn">
              📤 Export Staff List
            </button>
            <button className="action-btn">
              📊 View Reports
            </button>
            <button className="action-btn">
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
                      <div className="staff-info">
                        <div className="staff-name">{member.name}</div>
                        <div className="staff-email">{member.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge role-${member.role}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div>{member.phone}</div>
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
        }
        
        .filter-controls {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .filter-select {
          min-width: 150px;
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
        .role-chef { background-color: #fff3e0; color: #f57c00; }
        .role-waiter { background-color: #f3e5f5; color: #7b1fa2; }
        .role-bartender { background-color: #e8f5e8; color: #388e3c; }
        .role-cleaner { background-color: #fce4ec; color: #c2185b; }
        
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
      `}</style>
    </div>
  );
};

export default StaffPage;