import { useState, useEffect } from 'react';
import StaffAssignmentDropdown from './StaffAssignmentDropdown';
import './RotaGrid.css';

/**
 * RotaGrid - Main rota display grid (days × shifts)
 * 
 * Features:
 * - Weekly grid layout
 * - Shift templates display
 * - Staff assignments
 * - Role requirements
 * - Visual indicators
 * - Interactive assignments
 */
const RotaGrid = ({ 
  rotaData, 
  onStaffAssign, 
  onStaffRemove, 
  availableStaff,
  loading = false,
  readOnly = false
}) => {
  const [hoveredShift, setHoveredShift] = useState(null);
  const [expandedShift, setExpandedShift] = useState(null);

  // Days of the week
  const daysOfWeek = [
    { key: 'monday', name: 'Monday', short: 'Mon' },
    { key: 'tuesday', name: 'Tuesday', short: 'Tue' },
    { key: 'wednesday', name: 'Wednesday', short: 'Wed' },
    { key: 'thursday', name: 'Thursday', short: 'Thu' },
    { key: 'friday', name: 'Friday', short: 'Fri' },
    { key: 'saturday', name: 'Saturday', short: 'Sat' },
    { key: 'sunday', name: 'Sunday', short: 'Sun' }
  ];

  // Process rota data to organize by day and time
  const processRotaData = () => {
    if (!rotaData || !rotaData.shifts) {
      return daysOfWeek.map(day => ({ ...day, shifts: [] }));
    }

    return daysOfWeek.map(day => ({
      ...day,
      shifts: (rotaData.shifts || [])
        .filter(shift => shift.dayOfWeek.toLowerCase() === day.key)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));
  };

  const dayShifts = processRotaData();

  // Calculate shift duration in hours
  const calculateDuration = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  };

  // Format time display
  const formatTime = (time) => {
    return time.substring(0, 5); // Remove seconds if present
  };

  // Get role color class
  const getRoleClass = (role) => {
    const roleClasses = {
      manager: 'role-manager',
      chef: 'role-chef',
      waiter: 'role-waiter',
      bartender: 'role-bartender',
      cleaner: 'role-cleaner'
    };
    return roleClasses[role?.toLowerCase()] || 'role-default';
  };

  // Check if shift is fully staffed
  const isFullyStaffed = (shift) => {
    return shift.assignedStaff?.length >= shift.requiredStaffCount;
  };

  // Check if shift is overstaffed
  const isOverstaffed = (shift) => {
    return shift.assignedStaff?.length > shift.requiredStaffCount;
  };

  // Handle shift click/expand
  const handleShiftClick = (shiftId) => {
    if (readOnly) return;
    setExpandedShift(expandedShift === shiftId ? null : shiftId);
  };

  // Handle staff assignment
  const handleStaffAssign = (shiftId, staffId) => {
    onStaffAssign?.(shiftId, staffId);
  };

  // Handle staff removal
  const handleStaffRemove = (shiftId, staffId) => {
    onStaffRemove?.(shiftId, staffId);
  };

  if (loading) {
    return (
      <div className="rota-grid loading">
        <div className="loading-spinner"></div>
        <p>Loading rota...</p>
      </div>
    );
  }

  if (!rotaData) {
    return (
      <div className="rota-grid empty">
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Rota Available</h3>
          <p>Generate a draft rota to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rota-grid ${readOnly ? 'read-only' : ''}`}>
      {/* Grid header */}
      <div className="grid-header">
        <div className="week-info">
          <h3>Weekly Rota</h3>
          <div className="rota-status">
            <span className={`status-badge status-${rotaData.status?.toLowerCase()}`}>
              {rotaData.status || 'Draft'}
            </span>
          </div>
        </div>
        
        {/* Legend */}
        <div className="legend">
          <div className="legend-item">
            <div className="legend-color fully-staffed"></div>
            <span>Fully Staffed</span>
          </div>
          <div className="legend-item">
            <div className="legend-color understaffed"></div>
            <span>Needs Staff</span>
          </div>
          <div className="legend-item">
            <div className="legend-color overstaffed"></div>
            <span>Overstaffed</span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid-container">
        <div className="grid-days">
          {dayShifts.map((day) => (
            <div key={day.key} className="day-column">
              {/* Day header */}
              <div className="day-header">
                <h4 className="day-name">{day.short}</h4>
                <div className="day-stats">
                  <span className="shift-count">
                    {day.shifts.length} shifts
                  </span>
                  <span className="staff-count">
                    {day.shifts.reduce((sum, shift) => 
                      sum + (shift.assignedStaff?.length || 0), 0
                    )} staff
                  </span>
                </div>
              </div>

              {/* Day shifts */}
              <div className="day-shifts">
                {day.shifts.length === 0 ? (
                  <div className="no-shifts">
                    <span>No shifts scheduled</span>
                  </div>
                ) : (
                  day.shifts.map((shift) => {
                    const duration = calculateDuration(shift.startTime, shift.endTime);
                    const staffed = isFullyStaffed(shift);
                    const overstaffed = isOverstaffed(shift);
                    const expanded = expandedShift === shift.id;

                    return (
                      <div
                        key={shift.id}
                        className={`shift-card ${
                          staffed ? 'fully-staffed' : 'understaffed'
                        } ${
                          overstaffed ? 'overstaffed' : ''
                        } ${
                          expanded ? 'expanded' : ''
                        }`}
                        onMouseEnter={() => setHoveredShift(shift.id)}
                        onMouseLeave={() => setHoveredShift(null)}
                        onClick={() => handleShiftClick(shift.id)}
                      >
                        {/* Shift header */}
                        <div className="shift-header">
                          <div className="shift-time">
                            <span className="start-time">
                              {formatTime(shift.startTime)}
                            </span>
                            <span className="separator">-</span>
                            <span className="end-time">
                              {formatTime(shift.endTime)}
                            </span>
                            <span className="duration">
                              ({duration}h)
                            </span>
                          </div>
                          
                          <div className="shift-role">
                            <span className={`role-badge ${getRoleClass(shift.requiredRole)}`}>
                              {shift.requiredRole}
                            </span>
                          </div>
                        </div>

                        {/* Shift details */}
                        <div className="shift-details">
                          <div className="shift-name">
                            {shift.templateName || shift.name || 'Shift'}
                          </div>
                          
                          <div className="staffing-info">
                            <span className={`staffing-count ${
                              staffed ? 'complete' : 'incomplete'
                            }`}>
                              {shift.assignedStaff?.length || 0} / {shift.requiredStaffCount}
                            </span>
                            {shift.priority && (
                              <span className={`priority priority-${shift.priority.toLowerCase()}`}>
                                {shift.priority}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Assigned staff */}
                        <div className="assigned-staff">
                          {shift.assignedStaff?.length > 0 ? (
                            <div className="staff-list">
                              {shift.assignedStaff.map((staff) => (
                                <div key={staff.id} className="staff-assignment">
                                  <span className="staff-name">
                                    {staff.firstName} {staff.lastName}
                                  </span>
                                  {!readOnly && (
                                    <button
                                      className="remove-staff"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStaffRemove(shift.id, staff.id);
                                      }}
                                      title="Remove staff member"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="no-staff">
                              <span>No staff assigned</span>
                            </div>
                          )}
                        </div>

                        {/* Staff assignment dropdown (expanded view) */}
                        {expanded && !readOnly && !isOverstaffed(shift) && (
                          <div className="assignment-section">
                            <StaffAssignmentDropdown
                              shiftId={shift.id}
                              requiredRole={shift.requiredRole}
                              assignedStaff={shift.assignedStaff || []}
                              availableStaff={availableStaff}
                              onAssign={handleStaffAssign}
                            />
                          </div>
                        )}

                        {/* Shift description */}
                        {expanded && shift.description && (
                          <div className="shift-description">
                            <p>{shift.description}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid footer with summary */}
      <div className="grid-footer">
        <div className="week-summary">
          <div className="summary-item">
            <span className="label">Total Shifts:</span>
            <span className="value">
              {dayShifts.reduce((sum, day) => sum + day.shifts.length, 0)}
            </span>
          </div>
          <div className="summary-item">
            <span className="label">Total Hours:</span>
            <span className="value">
              {dayShifts.reduce((sum, day) => 
                sum + day.shifts.reduce((daySum, shift) => 
                  daySum + calculateDuration(shift.startTime, shift.endTime) * (shift.assignedStaff?.length || 0), 0
                ), 0
              ).toFixed(1)}h
            </span>
          </div>
          <div className="summary-item">
            <span className="label">Staff Assignments:</span>
            <span className="value">
              {dayShifts.reduce((sum, day) => 
                sum + day.shifts.reduce((daySum, shift) => 
                  daySum + (shift.assignedStaff?.length || 0), 0
                ), 0
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotaGrid;