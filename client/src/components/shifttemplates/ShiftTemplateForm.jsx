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
    requiredRole: 'waiter',
    staffCount: 1,
    priority: 3,
    description: '',
    isActive: true
  });
  const [errors, setErrors] = useState({});

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
    { value: 'manager', label: '👔 Manager', color: '#8e44ad' },
    { value: 'chef', label: '👨‍🍳 Chef', color: '#e74c3c' },
    { value: 'waiter', label: '🍽️ Waiter', color: '#3498db' },
    { value: 'bartender', label: '🍺 Bartender', color: '#f39c12' },
    { value: 'cleaner', label: '🧹 Cleaner', color: '#27ae60' }
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
      setFormData({
        name: editingTemplate.name,
        dayOfWeek: editingTemplate.dayOfWeek.toLowerCase(),
        startTime: editingTemplate.startTime,
        endTime: editingTemplate.endTime,
        requiredRole: editingTemplate.requiredRole,
        staffCount: editingTemplate.staffCount,
        priority: editingTemplate.priority,
        description: editingTemplate.description || '',
        isActive: editingTemplate.isActive !== undefined ? editingTemplate.isActive : true
      });
    } else {
      resetForm();
    }
    setErrors({});
  }, [editingTemplate, isOpen]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      dayOfWeek: 'monday',
      startTime: '09:00',
      endTime: '17:00',
      requiredRole: 'waiter',
      staffCount: 1,
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

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name cannot exceed 100 characters';
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

    if (formData.staffCount < 1) {
      newErrors.staffCount = 'At least 1 staff member is required';
    } else if (formData.staffCount > 50) {
      newErrors.staffCount = 'Cannot exceed 50 staff members';
    }

    if (formData.priority < 1 || formData.priority > 5) {
      newErrors.priority = 'Priority must be between 1 and 5';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description cannot exceed 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const templateData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim()
    };

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
  const estimatedCost = duration * formData.staffCount * 15; // £15/hour average

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
                    <span className="duration-label">Est. Cost:</span>
                    <span className="duration-value">£{estimatedCost.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Role Requirements */}
            <div className="form-section">
              <h3 className="section-title">👥 Role Requirements</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="requiredRole" className="form-label">
                    Required Role *
                  </label>
                  <div className="role-selector">
                    {roles.map(role => (
                      <label key={role.value} className="role-option">
                        <input
                          type="radio"
                          name="requiredRole"
                          value={role.value}
                          checked={formData.requiredRole === role.value}
                          onChange={handleInputChange}
                        />
                        <div 
                          className="role-card"
                          style={{ borderColor: role.color }}
                        >
                          <span className="role-label">{role.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="staffCount" className="form-label">
                    Staff Count *
                  </label>
                  <input
                    type="number"
                    id="staffCount"
                    name="staffCount"
                    value={formData.staffCount}
                    onChange={handleInputChange}
                    className={`form-input ${errors.staffCount ? 'error' : ''}`}
                    min={1}
                    max={50}
                    required
                  />
                  {errors.staffCount && <span className="error-message">{errors.staffCount}</span>}
                </div>
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
                    <span className="checkmark"></span>
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