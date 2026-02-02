import { useState } from 'react';
import './StaffForm.css';

/**
 * Staff Form Component for Add/Edit operations
 */
const StaffForm = ({ staff = null, onSubmit, onCancel, isLoading = false }) => {
  const isEditing = !!staff;
  
  const [formData, setFormData] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    role: staff?.role || 'waiter',
    hourlyRate: staff?.hourlyRate || '',
    maxHoursPerWeek: staff?.maxHoursPerWeek || 40,
    availableDays: staff?.availableDays || []
  });

  const [errors, setErrors] = useState({});

  const roles = [
    { value: 'manager', label: 'Manager' },
    { value: 'chef', label: 'Chef' },
    { value: 'waiter', label: 'Waiter' },
    { value: 'bartender', label: 'Bartender' },
    { value: 'cleaner', label: 'Cleaner' }
  ];

  const daysOfWeek = [
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'
  ];

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    // Hourly rate validation
    const hourlyRate = parseFloat(formData.hourlyRate);
    if (!formData.hourlyRate || isNaN(hourlyRate) || hourlyRate <= 0) {
      newErrors.hourlyRate = 'Please enter a valid hourly rate';
    }

    // Max hours validation
    const maxHours = parseInt(formData.maxHoursPerWeek);
    if (isNaN(maxHours) || maxHours < 1 || maxHours > 60) {
      newErrors.maxHoursPerWeek = 'Max hours must be between 1 and 60';
    }

    // Available days validation
    if (formData.availableDays.length === 0) {
      newErrors.availableDays = 'Please select at least one available day';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleDayToggle = (day) => {
    const newDays = formData.availableDays.includes(day)
      ? formData.availableDays.filter(d => d !== day)
      : [...formData.availableDays, day];
    
    handleInputChange('availableDays', newDays);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const submitData = {
        ...formData,
        hourlyRate: parseFloat(formData.hourlyRate),
        maxHoursPerWeek: parseInt(formData.maxHoursPerWeek)
      };
      
      onSubmit(submitData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="staff-form">
      <div className="form-grid">
        {/* Personal Information */}
        <div className="form-section">
          <h3 className="section-title">Personal Information</h3>
          
          <div className="form-group">
            <label className="form-label">
              Full Name *
            </label>
            <input
              type="text"
              className={`form-input ${errors.name ? 'error' : ''}`}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter full name"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Email Address *
            </label>
            <input
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Phone Number *
            </label>
            <input
              type="tel"
              className={`form-input ${errors.phone ? 'error' : ''}`}
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter phone number"
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>
        </div>

        {/* Employment Details */}
        <div className="form-section">
          <h3 className="section-title">Employment Details</h3>
          
          <div className="form-group">
            <label className="form-label">
              Role *
            </label>
            <select
              className="form-input"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Hourly Rate (£) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={`form-input ${errors.hourlyRate ? 'error' : ''}`}
              value={formData.hourlyRate}
              onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
              placeholder="0.00"
            />
            {errors.hourlyRate && <span className="error-message">{errors.hourlyRate}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Maximum Hours per Week
            </label>
            <input
              type="number"
              min="1"
              max="60"
              className={`form-input ${errors.maxHoursPerWeek ? 'error' : ''}`}
              value={formData.maxHoursPerWeek}
              onChange={(e) => handleInputChange('maxHoursPerWeek', e.target.value)}
            />
            {errors.maxHoursPerWeek && <span className="error-message">{errors.maxHoursPerWeek}</span>}
          </div>
        </div>
      </div>

      {/* Available Days */}
      <div className="form-section">
        <h3 className="section-title">Available Days *</h3>
        <div className="days-grid">
          {daysOfWeek.map(day => (
            <label key={day} className="day-checkbox">
              <input
                type="checkbox"
                checked={formData.availableDays.includes(day)}
                onChange={() => handleDayToggle(day)}
              />
              <span className="day-label">
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </span>
            </label>
          ))}
        </div>
        {errors.availableDays && <span className="error-message">{errors.availableDays}</span>}
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner"></span>
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            isEditing ? 'Update Staff Member' : 'Add Staff Member'
          )}
        </button>
      </div>
    </form>
  );
};

export default StaffForm;