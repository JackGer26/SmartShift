import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { createShiftTemplate, updateShiftTemplate } from '../../api/shiftTemplateAPI';
import './ShiftTemplateForm.css';

/**
 * ShiftTemplateForm - Create and edit shift templates
 * 
 * Features:
 * - Add new templates
 * - Edit existing templates
 * - Role requirements configuration
 * - Time validation
 * - Priority settings
 * - Duration calculation
 */
const ShiftTemplateForm = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingTemplate = null 
}) => {
  const { makeApiRequest, showError } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    dayOfWeek: 'monday',
    startTime: '09:00',
    endTime: '17:00',
    roleRequirements: [{ role: 'waiter', count: 1 }],
    priority: 3,
    description: '',
    isActive: true
  });
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});

  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  const roles = [
    { value: 'manager', label: '👔 Manager', color: '#1976d2' },
    { value: 'assistant_manager', label: '👔 Assistant Manager', color: '#3f51b5' },
    { value: 'head_chef', label: '👨‍🍳 Head Chef', color: '#ad1457' },
    { value: 'chef', label: '👨‍🍳 Chef', color: '#c62828' },
    { value: 'kitchen_assistant', label: '🥄 Kitchen Assistant', color: '#f57c00' },
    { value: 'head_waiter', label: '🍽️ Head Waiter', color: '#00695c' },
    { value: 'waiter', label: '🍽️ Waiter', color: '#1565c0' },
    { value: 'head_bartender', label: '🍺 Head Bartender', color: '#7b1fa2' },
    { value: 'bartender', label: '🍺 Bartender', color: '#ef6c00' },
    { value: 'hostess', label: '👋 Hostess', color: '#c2185b' },
    { value: 'delivery_driver', label: '🚗 Delivery Driver', color: '#2e7d32' },
    { value: 'trainee', label: '🎓 Trainee', color: '#e65100' },
    { value: 'cleaner', label: '🧹 Cleaner', color: '#33691e' }
  ];

  const priorityLevels = [
    { value: 1, label: '1 - Low', description: 'Optional shift' },
    { value: 2, label: '2 - Below Average', description: 'Helpful but not critical' },
    { value: 3, label: '3 - Average', description: 'Standard importance' },
    { value: 4, label: '4 - High', description: 'Important for operations' },
    { value: 5, label: '5 - Critical', description: 'Must be filled' }
  ];

  // Set form data when editing
  useEffect(() => {
    if (editingTemplate) {
      let roleRequirements = [];
      
      // Handle new format
      if (editingTemplate.roleRequirements && editingTemplate.roleRequirements.length > 0) {
        roleRequirements = editingTemplate.roleRequirements;
      }
      // Handle old format - multiple roles
      else if (editingTemplate.requiredRoles && editingTemplate.requiredRoles.length > 0) {
        roleRequirements = editingTemplate.requiredRoles.map(role => ({ role, count: 1 }));
      }
      // Handle old format - single role
      else if (editingTemplate.requiredRole) {
        roleRequirements = [{ role: editingTemplate.requiredRole, count: editingTemplate.staffCount || 1 }];
      }
      // Default fallback
      else {
        roleRequirements = [{ role: 'waiter', count: 1 }];
      }
      
      setFormData({
        name: editingTemplate.name,
        dayOfWeek: editingTemplate.dayOfWeek.toLowerCase(),
        startTime: editingTemplate.startTime,
        endTime: editingTemplate.endTime,
        roleRequirements,
        priority: editingTemplate.priority,
        description: editingTemplate.description || '',
        isActive: editingTemplate.isActive !== undefined ? editingTemplate.isActive : true
      });
    } else {
      resetForm();
    }
    setErrors({});
  }, [editingTemplate, isOpen]);

  // Update warnings in real-time when role requirements change
  useEffect(() => {
    const totalStaff = formData.roleRequirements.reduce((sum, req) => sum + (req.count || 0), 0);
    const newWarnings = {};
    
    if (totalStaff > 0 && totalStaff <= 8) {
      newWarnings.roleRequirements = `Warning: Only ${totalStaff} staff scheduled. Consider adding more staff for better coverage.`;
    }
    
    setWarnings(newWarnings);
  }, [formData.roleRequirements]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      dayOfWeek: 'monday',
      startTime: '09:00',
      endTime: '17:00',
      roleRequirements: [{ role: 'waiter', count: 1 }],
      priority: 3,
      description: '',
      isActive: true
    });
    setErrors({});
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle role selection changes
  const handleRoleChange = (roleValue, isChecked) => {
    setFormData(prev => {
      let updatedRequirements;
      
      if (isChecked) {
        // Add new role with count 1
        updatedRequirements = [...prev.roleRequirements, { role: roleValue, count: 1 }];
      } else {
        // Remove role
        updatedRequirements = prev.roleRequirements.filter(req => req.role !== roleValue);
      }
      
      return {
        ...prev,
        roleRequirements: updatedRequirements
      };
    });
    
    // Clear error for role field
    if (errors.roleRequirements) {
      setErrors(prev => ({ ...prev, roleRequirements: '' }));
    }
  };

  // Handle role count changes
  const handleRoleCountChange = (roleValue, count) => {
    const numCount = Math.max(1, Math.min(50, parseInt(count) || 1));
    
    setFormData(prev => ({
      ...prev,
      roleRequirements: prev.roleRequirements.map(req =>
        req.role === roleValue ? { ...req, count: numCount } : req
      )
    }));
  };

  // Get total staff count
  const getTotalStaffCount = () => {
    return formData.roleRequirements.reduce((sum, req) => sum + (req.count || 0), 0);
  };

  // Check if role is selected
  const isRoleSelected = (roleValue) => {
    return formData.roleRequirements.some(req => req.role === roleValue);
  };

  // Get count for specific role
  const getRoleCount = (roleValue) => {
    const requirement = formData.roleRequirements.find(req => req.role === roleValue);
    return requirement ? requirement.count : 1;
  };

  // Calculate duration
  const calculateDuration = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    
    const start = new Date(`2000-01-01T${formData.startTime}`);
    const end = new Date(`2000-01-01T${formData.endTime}`);
    
    // Handle overnight shifts
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const hours = (end - start) / (1000 * 60 * 60);
    return hours;
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    const newWarnings = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name cannot exceed 100 characters';
    }

    if (!formData.roleRequirements || formData.roleRequirements.length === 0) {
      newErrors.roleRequirements = 'At least one role must be selected';
    } else {
      const totalStaff = getTotalStaffCount();
      if (totalStaff === 0) {
        newErrors.roleRequirements = 'Total staff count must be greater than 0';
      } else if (totalStaff <= 8) {
        newWarnings.roleRequirements = `Warning: Only ${totalStaff} staff scheduled. Consider adding more staff for better coverage.`;
      }
      
      if (totalStaff > 50) {
        newErrors.roleRequirements = 'Total staff count cannot exceed 50';
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime) {
      const duration = calculateDuration();
      if (duration <= 0) {
        newErrors.endTime = 'End time must be after start time';
      } else if (duration > 24) {
        newErrors.endTime = 'Shift cannot exceed 24 hours';
      }
    }

    if (formData.priority < 1 || formData.priority > 5) {
      newErrors.priority = 'Priority must be between 1 and 5';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description cannot exceed 200 characters';
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Only send the new format fields, not the old backward compatibility fields
    const templateData = {
      name: formData.name.trim(),
      dayOfWeek: formData.dayOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
      roleRequirements: formData.roleRequirements,
      priority: formData.priority,
      description: formData.description.trim(),
      isActive: formData.isActive
    };

    console.log('Submitting template data:', templateData);

    try {
      if (editingTemplate) {
        await makeApiRequest(
          () => updateShiftTemplate(editingTemplate._id, templateData),
          {
            successMessage: 'Shift template updated successfully',
            onSuccess: () => {
              onSuccess();
              onClose();
            }
          }
        );
      } else {
        await makeApiRequest(
          () => createShiftTemplate(templateData),
          {
            successMessage: 'Shift template created successfully',
            onSuccess: () => {
              onSuccess();
              onClose();
            }
          }
        );
      }
    } catch (error) {
      // Error handled by makeApiRequest
    }
  };

  // Get role color
  const getRoleColor = (roleValue) => {
    const role = roles.find(r => r.value === roleValue);
    return role ? role.color : '#6c757d';
  };

  if (!isOpen) return null;

  const duration = calculateDuration();
  const totalStaff = getTotalStaffCount();
  const estimatedCost = duration * totalStaff * 15; // £15/hour average

  return (
    <div className="modal-overlay">
      <div className="modal shift-template-form-modal">
        <div className="modal-header">
          <h2>
            {editingTemplate ? 'Edit Shift Template' : 'Create New Shift Template'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="shift-template-form">
          <div className="modal-body">
            {/* Basic Information */}
            <div className="form-section">
              <h3 className="section-title">📋 Basic Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="e.g., Morning Kitchen Shift"
                    maxLength={100}
                    required
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="dayOfWeek" className="form-label">
                    Day of Week *
                  </label>
                  <select
                    id="dayOfWeek"
                    name="dayOfWeek"
                    value={formData.dayOfWeek}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    {daysOfWeek.map(day => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description" className="form-label">
                    Description <span className="char-count">({formData.description.length}/200)</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className={`form-textarea ${errors.description ? 'error' : ''}`}
                    placeholder="Optional description of the shift template..."
                    maxLength={200}
                    rows={2}
                  />
                  {errors.description && <span className="error-message">{errors.description}</span>}
                </div>
              </div>
            </div>

            {/* Time Settings */}
            <div className="form-section">
              <h3 className="section-title">⏰ Time Settings</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="startTime" className="form-label">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className={`form-input ${errors.startTime ? 'error' : ''}`}
                    required
                  />
                  {errors.startTime && <span className="error-message">{errors.startTime}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="endTime" className="form-label">
                    End Time *
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className={`form-input ${errors.endTime ? 'error' : ''}`}
                    required
                  />
                  {errors.endTime && <span className="error-message">{errors.endTime}</span>}
                </div>
              </div>
              
              {duration > 0 && (
                <div className="duration-display">
                  <div className="duration-item">
                    <span className="duration-label">Duration:</span>
                    <span className="duration-value">{duration}h</span>
                  </div>
                  <div className="duration-item">
                    <span className="duration-label">Total Staff:</span>
                    <span className="duration-value">{totalStaff}</span>
                  </div>
                  <div className="duration-item">
                    <span className="duration-label">Est. Cost:</span>
                    <span className="duration-value">£{estimatedCost.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Role Requirements */}
            <div className="form-section">
              <h3 className="section-title">👥 Role Requirements</h3>
              <div className="form-group full-width">
                <label className="form-label">
                  Required Roles * 
                  <span className="role-count">({formData.roleRequirements.length} role{formData.roleRequirements.length !== 1 ? 's' : ''} | {totalStaff} total staff)</span>
                </label>
                <div className={`role-requirements-grid ${errors.roleRequirements ? 'error' : ''}`}>
                  {roles.map(role => {
                    const isSelected = isRoleSelected(role.value);
                    const count = getRoleCount(role.value);
                    
                    return (
                      <div key={role.value} className={`role-requirement-item ${isSelected ? 'selected' : ''}`}>
                        <label className="role-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleRoleChange(role.value, e.target.checked)}
                          />
                          <span 
                            className="role-name"
                            style={{ borderLeftColor: role.color }}
                          >
                            {role.label}
                          </span>
                        </label>
                        {isSelected && (
                          <div className="role-count-input">
                            <button
                              type="button"
                              className="count-btn"
                              onClick={() => handleRoleCountChange(role.value, count - 1)}
                              disabled={count <= 1}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={count}
                              onChange={(e) => handleRoleCountChange(role.value, e.target.value)}
                              className="count-input"
                              min={1}
                              max={50}
                            />
                            <button
                              type="button"
                              className="count-btn"
                              onClick={() => handleRoleCountChange(role.value, count + 1)}
                              disabled={count >= 50}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {errors.roleRequirements && <span className="error-message">{errors.roleRequirements}</span>}
                {!errors.roleRequirements && warnings.roleRequirements && (
                  <span className="warning-message">⚠️ {warnings.roleRequirements}</span>
                )}
              </div>
            </div>

            {/* Priority & Status */}
            <div className="form-section">
              <h3 className="section-title">⚙️ Priority & Status</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="priority" className="form-label">
                    Priority Level *
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    {priorityLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label} - {level.description}
                      </option>
                    ))}
                  </select>
                  {errors.priority && <span className="error-message">{errors.priority}</span>}
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                    Template is active
                  </label>
                  <span className="help-text">
                    Only active templates are used in rota generation
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftTemplateForm;