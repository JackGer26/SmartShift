import { useState } from 'react';
import { formatPhoneInput, formatPhoneForDisplay, cleanPhoneForStorage, isValidUKPhone } from '../../utils/phoneUtils';
import './StaffForm.css';

/**
 * Staff Form Component for Add/Edit operations
 */
const StaffForm = ({ staff = null, onSubmit, onCancel, isLoading = false }) => {
  const isEditing = !!staff;
  
  const [formData, setFormData] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    phone: staff?.phone ? formatPhoneForDisplay(staff.phone) : '',
    role: staff?.role || 'waiter',
    hourlyRate: staff?.hourlyRate || '',
    maxHoursPerWeek: staff?.maxHoursPerWeek || 40,
    availableDays: staff?.availableDays || []
  });

  const [errors, setErrors] = useState({});
  const [validationSummary, setValidationSummary] = useState([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  const roles = [
    { value: 'manager', label: 'Manager' },
    { value: 'assistant_manager', label: 'Assistant Manager' },
    { value: 'head_chef', label: 'Head Chef' },
    { value: 'chef', label: 'Chef' },
    { value: 'kitchen_assistant', label: 'Kitchen Assistant' },
    { value: 'head_waiter', label: 'Head Waiter' },
    { value: 'waiter', label: 'Waiter' },
    { value: 'head_bartender', label: 'Head Bartender' },
    { value: 'bartender', label: 'Bartender' },
    { value: 'hostess', label: 'Hostess' },
    { value: 'delivery_driver', label: 'Delivery Driver' },
    { value: 'trainee', label: 'Trainee' },
    { value: 'cleaner', label: 'Cleaner' }
  ];

  const daysOfWeek = [
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'
  ];

  const validateForm = () => {
    const newErrors = {};
    const validationIssues = [];

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      validationIssues.push('Staff name is required');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      validationIssues.push('Name must be at least 2 characters long');
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters';
      validationIssues.push('Name is too long (maximum 50 characters)');
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name can only contain letters, spaces, apostrophes, and hyphens';
      validationIssues.push('Name contains invalid characters');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      validationIssues.push('Email address is required');
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      validationIssues.push('Email address format is invalid');
    } else if (formData.email.length > 100) {
      newErrors.email = 'Email address is too long';
      validationIssues.push('Email address exceeds maximum length');
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      validationIssues.push('Phone number is required');
    } else if (!isValidUKPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid UK phone number (mobile or landline)';
      validationIssues.push('Phone number format is invalid for UK');
    }

    // Hourly rate validation
    const hourlyRate = parseFloat(formData.hourlyRate);
    if (!formData.hourlyRate || formData.hourlyRate === '') {
      newErrors.hourlyRate = 'Hourly rate is required';
      validationIssues.push('Hourly rate is required');
    } else if (isNaN(hourlyRate) || hourlyRate <= 0) {
      newErrors.hourlyRate = 'Hourly rate must be a positive number';
      validationIssues.push('Hourly rate must be greater than £0');
    } else if (hourlyRate < 10.50) {
      newErrors.hourlyRate = 'Hourly rate cannot be below UK minimum wage (£10.50)';
      validationIssues.push('Hourly rate is below minimum wage');
    } else if (hourlyRate > 50.00) {
      newErrors.hourlyRate = 'Hourly rate seems too high (maximum £50.00)';
      validationIssues.push('Hourly rate exceeds reasonable maximum');
    }

    // Max hours validation
    const maxHours = parseInt(formData.maxHoursPerWeek);
    if (!formData.maxHoursPerWeek || formData.maxHoursPerWeek === '') {
      newErrors.maxHoursPerWeek = 'Maximum hours per week is required';
      validationIssues.push('Maximum weekly hours is required');
    } else if (isNaN(maxHours) || maxHours < 1) {
      newErrors.maxHoursPerWeek = 'Maximum hours must be at least 1 hour per week';
      validationIssues.push('Maximum hours must be at least 1');
    } else if (maxHours > 60) {
      newErrors.maxHoursPerWeek = 'Maximum hours cannot exceed 60 per week (legal limit)';
      validationIssues.push('Maximum hours exceeds legal working time limit');
    }

    // Available days validation
    if (formData.availableDays.length === 0) {
      newErrors.availableDays = 'Please select at least one available day';
      validationIssues.push('At least one available day must be selected');
    }

    // Role validation (just to be safe)
    if (!formData.role) {
      newErrors.role = 'Please select a role';
      validationIssues.push('Staff role must be selected');
    }

    setErrors(newErrors);
    setValidationSummary(validationIssues);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    // Special handling for phone number formatting
    if (field === 'phone') {
      const formattedPhone = formatPhoneInput(value);
      setFormData(prev => ({
        ...prev,
        [field]: formattedPhone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear both client and server errors when user starts typing
    if (errors[field] || serverErrors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
      setServerErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
      
      // Clear validation summary if all errors are resolved
      if (field === 'email' && validationSummary.some(msg => msg.includes('email'))) {
        setValidationSummary(prev => prev.filter(msg => !msg.toLowerCase().includes('email')));
      }
    }
  };

  const handleDayToggle = (day) => {
    const newDays = formData.availableDays.includes(day)
      ? formData.availableDays.filter(d => d !== day)
      : [...formData.availableDays, day];
    
    handleInputChange('availableDays', newDays);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setServerErrors({}); // Clear previous server errors
    
    if (validateForm()) {
      const submitData = {
        ...formData,
        phone: cleanPhoneForStorage(formData.phone), // Clean phone for storage
        hourlyRate: parseFloat(formData.hourlyRate),
        maxHoursPerWeek: parseInt(formData.maxHoursPerWeek)
      };
      
      const result = await onSubmit(submitData);
      
      // Handle server-side validation errors
      if (result && !result.success) {
        if (result.errors) {
          setServerErrors(result.errors);
          setErrors(prev => ({ ...prev, ...result.errors }));
        }
        if (result.validationSummary) {
          setValidationSummary(prev => [...prev, ...result.validationSummary]);
        }
        
        // Scroll to first error
        setTimeout(() => {
          const firstErrorElement = document.querySelector('.error, .validation-summary');
          if (firstErrorElement) {
            firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    } else {
      // Scroll to first error or validation summary
      const firstErrorElement = document.querySelector('.error');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="staff-form">
      {/* Validation Summary */}
      {submitAttempted && validationSummary.length > 0 && (
        <div className="validation-summary error-summary">
          <div className="validation-header">
            <span className="error-icon">⚠️</span>
            <h4>Please fix the following issues:</h4>
          </div>
          <ul className="validation-list">
            {validationSummary.map((issue, index) => (
              <li key={index} className="validation-item">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-grid">
        {/* Personal Information */}
        <div className="form-section">
          <h3 className="section-title">Personal Information</h3>
          
          <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
            <label className="form-label">
              Full Name
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

          <div className={`form-group ${errors.email || serverErrors.email ? 'has-error' : ''}`}>
            <label className="form-label">
              Email Address
            </label>
            <input
              type="email"
              className={`form-input ${errors.email || serverErrors.email ? 'error' : ''}`}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
            />
            {(errors.email || serverErrors.email) && (
              <span className="error-message">{errors.email || serverErrors.email}</span>
            )}
          </div>

          <div className={`form-group ${errors.phone ? 'has-error' : ''}`}>
            <label className="form-label">
              Phone Number
            </label>
            <input
              type="tel"
              className={`form-input ${errors.phone ? 'error' : ''}`}
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+44 7xxx xxx xxx or 07xxx xxx xxx"
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>
        </div>

        {/* Employment Details */}
        <div className="form-section">
          <h3 className="section-title">Employment Details</h3>
          
          <div className={`form-group ${errors.role ? 'has-error' : ''}`}>
            <label className="form-label">
              Role
            </label>
            <select
              className={`form-input ${errors.role ? 'error' : ''}`}
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {errors.role && <span className="error-message">{errors.role}</span>}
          </div>

          <div className={`form-group ${errors.hourlyRate ? 'has-error' : ''}`}>
            <label className="form-label">
              Hourly Rate (£)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={`form-input ${errors.hourlyRate ? 'error' : ''}`}
              value={formData.hourlyRate}
              onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
              placeholder="10.50 minimum"
            />
            {errors.hourlyRate && <span className="error-message">{errors.hourlyRate}</span>}
          </div>

          <div className={`form-group ${errors.maxHoursPerWeek ? 'has-error' : ''}`}>
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
      <div className={`form-section ${errors.availableDays ? 'has-error' : ''}`}>
        <h3 className="section-title">Available Days</h3>
        <p className="section-description">Select the days this staff member is available to work</p>
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