import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getAvailableStaff } from '../../api/rotaBuilderAPI';
import './StaffAssignmentDropdown.css';

/**
 * StaffAssignmentDropdown - Dropdown for assigning staff to shifts
 * 
 * Features:
 * - Role-based filtering
 * - Availability checking
 * - Search functionality
 * - Visual indicators
 * - Quick assignment
 */
const StaffAssignmentDropdown = ({ 
  shiftId, 
  requiredRole, 
  assignedStaff = [],
  availableStaff = [],
  onAssign,
  shiftDate,
  shiftTime
}) => {
  const { showError } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState(availableStaff);

  // Load available staff when component mounts or props change
  useEffect(() => {
    if (shiftDate && shiftTime && requiredRole) {
      loadAvailableStaff();
    } else {
      setStaffList(availableStaff);
    }
  }, [shiftDate, shiftTime, requiredRole, availableStaff]);

  // Load available staff from API
  const loadAvailableStaff = async () => {
    try {
      setLoading(true);
      const staff = await getAvailableStaff(shiftDate, shiftTime, requiredRole);
      setStaffList(staff || []);
    } catch (error) {
      showError('Failed to load available staff');
      setStaffList(availableStaff);
    } finally {
      setLoading(false);
    }
  };

  // Filter staff based on search term and assignment status
  const getFilteredStaff = () => {
    const assignedIds = assignedStaff.map(staff => staff.id);
    
    return staffList
      .filter(staff => {
        // Exclude already assigned staff
        if (assignedIds.includes(staff.id)) {
          return false;
        }
        
        // Filter by search term
        if (searchTerm) {
          const fullName = `${staff.firstName} ${staff.lastName}`.toLowerCase();
          return fullName.includes(searchTerm.toLowerCase());
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by role match first, then by name
        const aRoleMatch = a.roles?.includes(requiredRole) ? 0 : 1;
        const bRoleMatch = b.roles?.includes(requiredRole) ? 0 : 1;
        
        if (aRoleMatch !== bRoleMatch) {
          return aRoleMatch - bRoleMatch;
        }
        
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });
  };

  // Handle staff assignment
  const handleAssign = (staff) => {
    onAssign?.(shiftId, staff.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Handle dropdown toggle
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  // Handle search input
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Check if staff member can work this role
  const canWorkRole = (staff) => {
    return staff.roles?.includes(requiredRole);
  };

  // Get staff availability status
  const getAvailabilityStatus = (staff) => {
    if (staff.timeOff) return 'time-off';
    if (staff.hasConflict) return 'conflict';
    if (!canWorkRole(staff)) return 'wrong-role';
    return 'available';
  };

  const filteredStaff = getFilteredStaff();

  return (
    <div className="staff-assignment-dropdown">
      <div className="dropdown-header">
        <label className="dropdown-label">
          Assign {requiredRole}:
        </label>
      </div>

      <div className={`dropdown-container ${isOpen ? 'open' : ''}`}>
        <button
          className="dropdown-trigger"
          onClick={handleToggle}
          disabled={loading}
        >
          <span className="trigger-text">
            {loading ? 'Loading...' : 'Select staff member'}
          </span>
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
            ▼
          </span>
        </button>

        {isOpen && (
          <div className="dropdown-menu">
            {/* Search input */}
            <div className="dropdown-search">
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
                autoFocus
              />
            </div>

            {/* Staff list */}
            <div className="dropdown-list">
              {filteredStaff.length === 0 ? (
                <div className="no-staff">
                  {loading ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <span>Loading staff...</span>
                    </div>
                  ) : searchTerm ? (
                    <div className="no-results">
                      <span>No staff found matching "{searchTerm}"</span>
                    </div>
                  ) : (
                    <div className="no-available">
                      <span>No available staff for this shift</span>
                    </div>
                  )}
                </div>
              ) : (
                filteredStaff.map((staff) => {
                  const availabilityStatus = getAvailabilityStatus(staff);
                  const isRoleMatch = canWorkRole(staff);
                  
                  return (
                    <div
                      key={staff.id}
                      className={`staff-option ${availabilityStatus} ${
                        isRoleMatch ? 'role-match' : 'role-mismatch'
                      }`}
                      onClick={() => handleAssign(staff)}
                    >
                      <div className="staff-info">
                        <div className="staff-name">
                          {staff.firstName} {staff.lastName}
                        </div>
                        <div className="staff-details">
                          <div className="staff-roles">
                            {staff.roles?.map(role => (
                              <span 
                                key={role} 
                                className={`role-tag ${
                                  role === requiredRole ? 'required' : ''
                                }`}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                          {staff.weeklyHours !== undefined && (
                            <div className="weekly-hours">
                              {staff.weeklyHours}h this week
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="availability-indicator">
                        {availabilityStatus === 'available' && (
                          <span className="status-icon available" title="Available">
                            ✓
                          </span>
                        )}
                        {availabilityStatus === 'time-off' && (
                          <span className="status-icon time-off" title="On time off">
                            🏠
                          </span>
                        )}
                        {availabilityStatus === 'conflict' && (
                          <span className="status-icon conflict" title="Schedule conflict">
                            ⚠
                          </span>
                        )}
                        {availabilityStatus === 'wrong-role' && (
                          <span className="status-icon wrong-role" title="Cannot work this role">
                            ❌
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with quick stats */}
            {filteredStaff.length > 0 && (
              <div className="dropdown-footer">
                <div className="staff-stats">
                  <span className="stat">
                    {filteredStaff.filter(s => canWorkRole(s)).length} can work {requiredRole}
                  </span>
                  <span className="stat">
                    {filteredStaff.filter(s => getAvailabilityStatus(s) === 'available').length} available
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffAssignmentDropdown;