import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { deleteShiftTemplate, toggleTemplateStatus, duplicateTemplate } from '../../api/shiftTemplateAPI';
import { formatRoleForDisplay } from '../../utils/roleUtils';
import { STAFF_ROLES } from '../../utils/constants';
import './ShiftTemplatesList.css';

/**
 * ShiftTemplatesList - Display and manage shift templates
 * 
 * Features:
 * - Weekly grid view and table view
 * - Filter by day, role, active status
 * - Edit, delete, duplicate templates
 * - Toggle active status
 * - Role-based color coding
 */
const ShiftTemplatesList = ({ 
  templates = [], 
  onEdit, 
  onRefresh,
  viewMode = 'grid' // 'grid' or 'table'
}) => {
  const { showSuccess, makeApiRequest } = useAppContext();
  const [filterDay, setFilterDay] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const roles = STAFF_ROLES;

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (!showInactive && !template.isActive) return false;
    if (filterDay !== 'all' && template.dayOfWeek.toLowerCase() !== filterDay) return false;
    
    // Handle role filtering with new and old formats
    if (filterRole !== 'all') {
      const roleReqs = getTemplateRoles(template);
      const hasRole = roleReqs.some(req => req.role === filterRole);
      if (!hasRole) return false;
    }
    
    return true;
  });

  // Group templates by day for grid view
  const templatesByDay = daysOfWeek.reduce((acc, day) => {
    acc[day] = filteredTemplates.filter(t => t.dayOfWeek.toLowerCase() === day);
    return acc;
  }, {});

  // Format time for display
  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Calculate duration
  const calculateDuration = (startTime, endTime) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const hours = (end - start) / (1000 * 60 * 60);
    return hours;
  };

  // Handle delete
  const handleDelete = async (id, templateName) => {
    if (!confirm(`Are you sure you want to delete the "${templateName}" template?`)) {
      return;
    }

    await makeApiRequest(
      () => deleteShiftTemplate(id),
      {
        successMessage: 'Template deleted successfully',
        onSuccess: () => onRefresh()
      }
    );
  };

  // Handle toggle active status
  const handleToggleStatus = async (id, currentStatus) => {
    await makeApiRequest(
      () => toggleTemplateStatus(id, !currentStatus),
      {
        successMessage: `Template ${currentStatus ? 'deactivated' : 'activated'} successfully`,
        onSuccess: () => onRefresh()
      }
    );
  };

  // Handle duplicate
  const handleDuplicate = async (id) => {
    await makeApiRequest(
      () => duplicateTemplate(id),
      {
        successMessage: 'Template duplicated successfully',
        onSuccess: () => onRefresh()
      }
    );
  };

  // Get role badge class
  const getRoleBadge = (role) => {
    const badges = {
      manager: 'role-badge role-manager',
      assistant_manager: 'role-badge role-assistant_manager',
      head_chef: 'role-badge role-head_chef',
      chef: 'role-badge role-chef',
      kitchen_assistant: 'role-badge role-kitchen_assistant',
      head_waiter: 'role-badge role-head_waiter',
      waiter: 'role-badge role-waiter',
      head_bartender: 'role-badge role-head_bartender',
      bartender: 'role-badge role-bartender',
      hostess: 'role-badge role-hostess',
      delivery_driver: 'role-badge role-delivery_driver',
      trainee: 'role-badge role-trainee',
      cleaner: 'role-badge role-cleaner'
    };
    return badges[role] || 'role-badge';
  };

  // Get priority stars
  const getPriorityStars = (priority) => {
    return '⭐'.repeat(Math.max(1, Math.min(5, priority)));
  };

  // Get template roles as array (for backward compatibility)
  const getTemplateRoles = (template) => {
    // New format with role requirements
    if (template.roleRequirements && template.roleRequirements.length > 0) {
      return template.roleRequirements;
    }
    // Old format with multiple roles
    if (template.requiredRoles && template.requiredRoles.length > 0) {
      return template.requiredRoles.map(role => ({ role, count: 1 }));
    }
    // Old format with single role
    if (template.requiredRole) {
      return [{ role: template.requiredRole, count: template.staffCount || 1 }];
    }
    return [];
  };

  // Format role requirements for display
  const formatRoleRequirements = (template) => {
    const roleReqs = getTemplateRoles(template);
    return roleReqs.map(req => `${req.count} ${formatRoleForDisplay(req.role)}${req.count > 1 ? 's' : ''}`).join(', ');
  };

  return (
    <div className="shift-templates-list">
      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Day:</label>
          <select 
            value={filterDay} 
            onChange={(e) => setFilterDay(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Days</option>
            {daysOfWeek.map(day => (
              <option key={day} value={day}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Role:</label>
          <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>
                {formatRoleForDisplay(role)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive templates
          </label>
        </div>

        <div className="templates-count">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="week-grid">
          {daysOfWeek.map(day => (
            <div key={day} className="day-column">
              <h3 className="day-header">
                {day.charAt(0).toUpperCase() + day.slice(1)}
                <span className="day-count">({templatesByDay[day].length})</span>
              </h3>
              
              <div className="day-templates">
                {templatesByDay[day].map(template => (
                  <div 
                    key={template._id} 
                    className={`template-card ${!template.isActive ? 'inactive' : ''}`}
                  >
                    <div className="template-header">
                      <div className="template-name">{template.name}</div>
                      <div className="template-actions">
                        <button
                          className="action-btn edit"
                          onClick={() => onEdit(template)}
                          title="Edit template"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn duplicate"
                          onClick={() => handleDuplicate(template._id)}
                          title="Duplicate template"
                        >
                          📋
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(template._id, template.name)}
                          title="Delete template"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="template-time">
                      {formatTime(template.startTime)} - {formatTime(template.endTime)}
                      <span className="duration">({calculateDuration(template.startTime, template.endTime)}h)</span>
                    </div>
                    
                    <div className="template-details">
                      <div className="template-roles">
                        {getTemplateRoles(template).map((req, index) => (
                          <span key={req.role} className={getRoleBadge(req.role)}>
                            {req.count > 1 && <span className="role-count-badge">{req.count}× </span>}
                            {formatRoleForDisplay(req.role)}
                          </span>
                        ))}
                      </div>
                      <span className="staff-count">{template.staffCount} total</span>
                    </div>
                    
                    <div className="template-priority">
                      {getPriorityStars(template.priority)}
                    </div>
                    
                    {template.description && (
                      <div className="template-description">
                        {template.description}
                      </div>
                    )}
                    
                    <div className="template-status">
                      <button
                        className={`status-toggle ${template.isActive ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(template._id, template.isActive)}
                      >
                        {template.isActive ? '● Active' : '○ Inactive'}
                      </button>
                    </div>
                  </div>
                ))}
                
                {templatesByDay[day].length === 0 && (
                  <div className="empty-day">
                    <p>No templates for {day}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="table-container">
          {filteredTemplates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No shift templates found</h3>
              <p>No templates match the current filter criteria.</p>
            </div>
          ) : (
            <table className="templates-table">
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Duration</th>
                  <th>Role</th>
                  <th>Staff Count</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map(template => (
                  <tr key={template._id} className={!template.isActive ? 'inactive-row' : ''}>
                    <td>
                      <div className="template-name-cell">
                        <span className="name">{template.name}</span>
                        {template.description && (
                          <span className="description">{template.description}</span>
                        )}
                      </div>
                    </td>
                    <td>{template.dayOfWeek.charAt(0).toUpperCase() + template.dayOfWeek.slice(1)}</td>
                    <td>{formatTime(template.startTime)} - {formatTime(template.endTime)}</td>
                    <td>{calculateDuration(template.startTime, template.endTime)}h</td>
                    <td>
                      <div className="template-roles">
                        {getTemplateRoles(template).map((req, index) => (
                          <span key={req.role} className={getRoleBadge(req.role)}>
                            {req.count > 1 && <span className="role-count-badge">{req.count}× </span>}
                            {formatRoleForDisplay(req.role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{template.staffCount}</td>
                    <td>{getPriorityStars(template.priority)}</td>
                    <td>
                      <span className={`status-badge ${template.isActive ? 'active' : 'inactive'}`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-edit"
                          onClick={() => onEdit(template)}
                          title="Edit template"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-duplicate"
                          onClick={() => handleDuplicate(template._id)}
                          title="Duplicate template"
                        >
                          📋
                        </button>
                        <button
                          className="btn btn-toggle"
                          onClick={() => handleToggleStatus(template._id, template.isActive)}
                          title={template.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {template.isActive ? '🔽' : '🔼'}
                        </button>
                        <button
                          className="btn btn-delete"
                          onClick={() => handleDelete(template._id, template.name)}
                          title="Delete template"
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
      )}
    </div>
  );
};

export default ShiftTemplatesList;