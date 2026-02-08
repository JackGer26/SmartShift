import { useState, useEffect } from 'react';
import { getStaffHours } from '../../api/rotaBuilderAPI';
import './StaffHoursSummary.css';

/**
 * StaffHoursSummary - Display total hours per staff member
 * 
 * Features:
 * - Weekly hours breakdown
 * - Overtime tracking
 * - Hours distribution
 * - Staff workload analysis
 * - Visual hour indicators
 * - Export capabilities
 */
const StaffHoursSummary = ({ 
  rotaId, 
  staffList = [],
  onStaffClick,
  showDetailed = false,
  maxWeeklyHours = 40 
}) => {
  const [staffHours, setStaffHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('hours'); // 'hours', 'name', 'overtime'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'overtime', 'undertime', 'assigned'

  // Load staff hours when rotaId changes
  useEffect(() => {
    if (rotaId) {
      loadStaffHours();
    }
  }, [rotaId]);

  // Load staff hours from API
  const loadStaffHours = async () => {
    try {
      setLoading(true);
      const hoursData = await getStaffHours(rotaId);
      setStaffHours(hoursData || []);
    } catch (error) {
      console.error('Failed to load staff hours:', error);
      setStaffHours([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate overtime hours
  const calculateOvertime = (totalHours) => {
    return Math.max(0, totalHours - maxWeeklyHours);
  };

  // Get hours status
  const getHoursStatus = (totalHours) => {
    if (totalHours === 0) return 'unassigned';
    if (totalHours > maxWeeklyHours) return 'overtime';
    if (totalHours < maxWeeklyHours * 0.5) return 'undertime';
    return 'normal';
  };

  // Sort staff hours
  const getSortedStaffHours = () => {
    const sorted = [...staffHours].sort((a, b) => {
      switch (sortBy) {
        case 'hours':
          return b.totalHours - a.totalHours;
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`
          );
        case 'overtime':
          return calculateOvertime(b.totalHours) - calculateOvertime(a.totalHours);
        default:
          return 0;
      }
    });

    // Apply filters
    return sorted.filter(staff => {
      switch (filterBy) {
        case 'overtime':
          return staff.totalHours > maxWeeklyHours;
        case 'undertime':
          return staff.totalHours > 0 && staff.totalHours < maxWeeklyHours * 0.5;
        case 'assigned':
          return staff.totalHours > 0;
        case 'all':
        default:
          return true;
      }
    });
  };

  // Get summary statistics
  const getSummaryStats = () => {
    const totalStaff = staffHours.length;
    const assignedStaff = staffHours.filter(s => s.totalHours > 0).length;
    const totalHours = staffHours.reduce((sum, s) => sum + s.totalHours, 0);
    const overtimeStaff = staffHours.filter(s => s.totalHours > maxWeeklyHours).length;
    const avgHours = totalStaff > 0 ? totalHours / totalStaff : 0;
    const totalOvertime = staffHours.reduce(
      (sum, s) => sum + calculateOvertime(s.totalHours),
      0
    );

    return {
      totalStaff,
      assignedStaff,
      totalHours,
      avgHours,
      overtimeStaff,
      totalOvertime
    };
  };

  // Handle staff member click
  const handleStaffClick = (staff) => {
    onStaffClick?.(staff);
  };

  // Format hours display
  const formatHours = (hours) => {
    return hours % 1 === 0 ? hours.toString() : hours.toFixed(1);
  };

  // Get hours bar width percentage
  const getHoursBarWidth = (hours) => {
    const maxDisplayHours = Math.max(maxWeeklyHours * 1.5, 50);
    return Math.min((hours / maxDisplayHours) * 100, 100);
  };

  const sortedStaffHours = getSortedStaffHours();
  const summaryStats = getSummaryStats();

  if (loading) {
    return (
      <div className="staff-hours-summary loading">
        <div className="loading-spinner"></div>
        <p>Loading staff hours...</p>
      </div>
    );
  }

  return (
    <div className="staff-hours-summary">
      {/* Header */}
      <div className="summary-header">
        <div className="header-title">
          <h3>🕰️ Staff Hours Summary</h3>
          <p>Weekly hours breakdown and workload analysis</p>
        </div>
        
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{summaryStats.totalHours}h</span>
            <span className="stat-label">Total Hours</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{summaryStats.assignedStaff}</span>
            <span className="stat-label">Staff Assigned</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{formatHours(summaryStats.avgHours)}h</span>
            <span className="stat-label">Avg per Staff</span>
          </div>
          {summaryStats.totalOvertime > 0 && (
            <div className="stat-item overtime">
              <span className="stat-value">{formatHours(summaryStats.totalOvertime)}h</span>
              <span className="stat-label">Overtime</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="summary-controls">
        <div className="sort-controls">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="control-select"
          >
            <option value="hours">Total Hours</option>
            <option value="name">Name</option>
            <option value="overtime">Overtime</option>
          </select>
        </div>
        
        <div className="filter-controls">
          <label>Filter:</label>
          <select 
            value={filterBy} 
            onChange={(e) => setFilterBy(e.target.value)}
            className="control-select"
          >
            <option value="all">All Staff ({staffHours.length})</option>
            <option value="assigned">Assigned ({summaryStats.assignedStaff})</option>
            <option value="overtime">Overtime ({summaryStats.overtimeStaff})</option>
            <option value="undertime">Part-time ({staffHours.filter(s => s.totalHours > 0 && s.totalHours < maxWeeklyHours * 0.5).length})</option>
          </select>
        </div>
      </div>

      {/* Staff hours list */}
      <div className="hours-list">
        {sortedStaffHours.length === 0 ? (
          <div className="no-staff">
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <h4>No Staff Hours</h4>
              <p>No staff members found for the selected filter</p>
            </div>
          </div>
        ) : (
          sortedStaffHours.map((staff) => {
            const overtime = calculateOvertime(staff.totalHours);
            const hoursStatus = getHoursStatus(staff.totalHours);
            const barWidth = getHoursBarWidth(staff.totalHours);
            
            return (
              <div 
                key={staff.staffId || staff.id || staff.name} 
                className={`staff-hours-item ${hoursStatus} ${
                  onStaffClick ? 'clickable' : ''
                }`}
                onClick={() => handleStaffClick(staff)}
              >
                {/* Staff info */}
                <div className="staff-info">
                  <div className="staff-name">
                    {staff.firstName} {staff.lastName}
                  </div>
                  <div className="staff-details">
                    <div className="staff-roles">
                      {staff.roles?.map(role => (
                        <span key={role} className="role-tag">{role}</span>
                      ))}
                    </div>
                    {staff.shifts && (
                      <div className="shift-count">
                        {staff.shifts.length} shifts
                      </div>
                    )}
                  </div>
                </div>

                {/* Hours visualization */}
                <div className="hours-visualization">
                  <div className="hours-bar-container">
                    <div className="hours-bar-background">
                      {/* Regular hours bar */}
                      <div 
                        className="hours-bar regular"
                        style={{ 
                          width: `${getHoursBarWidth(Math.min(staff.totalHours, maxWeeklyHours))}%` 
                        }}
                      ></div>
                      {/* Overtime bar */}
                      {overtime > 0 && (
                        <div 
                          className="hours-bar overtime"
                          style={{ 
                            width: `${getHoursBarWidth(overtime)}%`,
                            left: `${getHoursBarWidth(maxWeeklyHours)}%`
                          }}
                        ></div>
                      )}
                      {/* Max hours indicator */}
                      <div 
                        className="max-hours-indicator"
                        style={{ left: `${getHoursBarWidth(maxWeeklyHours)}%` }}
                      ></div>
                    </div>
                    
                    {/* Hours labels */}
                    <div className="hours-labels">
                      <span className="label-start">0h</span>
                      <span className="label-max">{maxWeeklyHours}h</span>
                      {staff.totalHours > maxWeeklyHours && (
                        <span className="label-total">{formatHours(staff.totalHours)}h</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hours summary */}
                <div className="hours-summary">
                  <div className="total-hours">
                    <span className="hours-value">{formatHours(staff.totalHours)}</span>
                    <span className="hours-unit">hours</span>
                  </div>
                  
                  {overtime > 0 && (
                    <div className="overtime-hours">
                      <span className="overtime-value">+{formatHours(overtime)}</span>
                      <span className="overtime-label">OT</span>
                    </div>
                  )}
                  
                  <div className="hours-status">
                    <span className={`status-indicator ${hoursStatus}`}>
                      {hoursStatus === 'overtime' && '🔴'}
                      {hoursStatus === 'normal' && '🟢'}
                      {hoursStatus === 'undertime' && '🟡'}
                      {hoursStatus === 'unassigned' && '⚪'}
                    </span>
                  </div>
                </div>

                {/* Detailed breakdown */}
                {showDetailed && staff.shifts && (
                  <div className="shift-breakdown">
                    <h5>Shift Breakdown:</h5>
                    <div className="shift-list">
                      {staff.shifts.map((shift, index) => (
                        <div key={index} className="shift-item">
                          <span className="shift-day">{shift.day}</span>
                          <span className="shift-time">
                            {shift.startTime} - {shift.endTime}
                          </span>
                          <span className="shift-duration">
                            {formatHours(shift.duration)}h
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="hours-legend">
        <div className="legend-item">
          <span className="legend-color regular"></span>
          <span>Regular Hours (0-{maxWeeklyHours}h)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color overtime"></span>
          <span>Overtime ({maxWeeklyHours}h+)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color unassigned"></span>
          <span>Unassigned</span>
        </div>
      </div>
    </div>
  );
};

export default StaffHoursSummary;