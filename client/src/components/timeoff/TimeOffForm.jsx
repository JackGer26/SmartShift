import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getAllStaff } from '../../api/staffAPI';
import { createTimeOff, updateTimeOff } from '../../api/timeOffAPI';
import './TimeOffForm.css';

/**
 * TimeOffForm - Create and edit time off requests
 * 
 * Features:
 * - Add new time off requests
 * - Edit existing requests
 * - Staff selection dropdown
 * - Date validation
 * - Type selection (holiday, sick, personal, etc.)
 * - Reason input with character count
 */
const TimeOffForm = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingRequest = null 
}) => {
  const { makeApiRequest, showError } = useAppContext();
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState({
    staffId: '',
    type: 'holiday',
    startDate: '',
    endDate: '',
    reason: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  // Load staff list on component mount
  useEffect(() => {
    if (isOpen) {
      loadStaffList();
    }
  }, [isOpen]);

  // Set form data when editing
  useEffect(() => {
    if (editingRequest) {
      setFormData({
        staffId: editingRequest.staffId._id || editingRequest.staffId,
        type: editingRequest.type,
        startDate: formatDateForInput(editingRequest.startDate),
        endDate: formatDateForInput(editingRequest.endDate),
        reason: editingRequest.reason || '',
        notes: editingRequest.notes || ''
      });
    } else {
      resetForm();
    }
  }, [editingRequest, isOpen]);

  // Load staff list
  const loadStaffList = async () => {
    try {
      const staff = await getAllStaff();
      setStaffList(staff.filter(s => s.isActive));
    } catch (error) {
      showError('Failed to load staff list');
    }
  };

  // Format date for input field
  const formatDateForInput = (dateString) => {
    return new Date(dateString).toISOString().split('T')[0];
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      staffId: '',
      type: 'holiday',
      startDate: '',
      endDate: '',
      reason: '',
      notes: ''
    });
    setErrors({});
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.staffId) {
      newErrors.staffId = 'Please select a staff member';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for the time off';
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

    const requestData = {
      ...formData,
      status: editingRequest ? editingRequest.status : 'pending'
    };

    try {
      if (editingRequest) {
        await makeApiRequest(
          () => updateTimeOff(editingRequest._id, requestData),
          {
            successMessage: 'Time off request updated successfully',
            onSuccess: () => {
              onSuccess();
              onClose();
            }
          }
        );
      } else {
        await makeApiRequest(
          () => createTimeOff(requestData),
          {
            successMessage: 'Time off request created successfully',
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

  // Calculate duration
  const calculateDuration = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal time-off-form-modal">
        <div className="modal-header">
          <h2>{editingRequest ? 'Edit Time Off Request' : 'New Time Off Request'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="time-off-form">
          <div className="modal-body">
            <div className="form-grid">
              {/* Staff selection */}
              <div className="form-group">
                <label htmlFor="staffId" className="form-label">
                  Staff Member *
                </label>
                <select
                  id="staffId"
                  name="staffId"
                  value={formData.staffId}
                  onChange={handleInputChange}
                  className={`form-select ${errors.staffId ? 'error' : ''}`}
                  required
                >
                  <option value="">Select staff member...</option>
                  {staffList.map(staff => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name} - {staff.role}
                    </option>
                  ))}
                </select>
                {errors.staffId && <span className="error-message">{errors.staffId}</span>}
              </div>

              {/* Type selection */}
              <div className="form-group">
                <label htmlFor="type" className="form-label">
                  Type *
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="holiday">🏖️ Holiday</option>
                  <option value="sick">🤒 Sick Leave</option>
                  <option value="personal">👤 Personal</option>
                  <option value="emergency">🚨 Emergency</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>

              {/* Start date */}
              <div className="form-group">
                <label htmlFor="startDate" className="form-label">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className={`form-input ${errors.startDate ? 'error' : ''}`}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                {errors.startDate && <span className="error-message">{errors.startDate}</span>}
              </div>

              {/* End date */}
              <div className="form-group">
                <label htmlFor="endDate" className="form-label">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={`form-input ${errors.endDate ? 'error' : ''}`}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  required
                />
                {errors.endDate && <span className="error-message">{errors.endDate}</span>}
              </div>
            </div>

            {/* Duration display */}
            {formData.startDate && formData.endDate && (
              <div className="duration-display">
                <span className="duration-label">Duration:</span>
                <span className="duration-value">
                  {calculateDuration()} day{calculateDuration() !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Reason */}
            <div className="form-group">
              <label htmlFor="reason" className="form-label">
                Reason * <span className="char-count">({formData.reason.length}/500)</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className={`form-textarea ${errors.reason ? 'error' : ''}`}
                rows={3}
                maxLength={500}
                placeholder="Please provide a reason for the time off request..."
                required
              />
              {errors.reason && <span className="error-message">{errors.reason}</span>}
            </div>

            {/* Notes */}
            <div className="form-group">
              <label htmlFor="notes" className="form-label">
                Additional Notes <span className="char-count">({formData.notes.length}/1000)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="form-textarea"
                rows={2}
                maxLength={1000}
                placeholder="Any additional information or notes..."
              />
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
              {editingRequest ? 'Update Request' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimeOffForm;