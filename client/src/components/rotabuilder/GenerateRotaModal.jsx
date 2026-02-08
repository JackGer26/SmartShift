import { useState, useEffect } from 'react';
import { getAllShiftTemplates } from '../../api/shiftTemplateAPI';
import './GenerateRotaModal.css';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
];

const GenerateRotaModal = ({ isOpen, onClose, onGenerate, weekStartDate }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [selectedDays, setSelectedDays] = useState(DAYS_OF_WEEK.map(d => d.value));
  const [autoAssignStaff, setAutoAssignStaff] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllShiftTemplates();
      setTemplates(data || []);
      
      // Pre-select all active templates
      setSelectedTemplates(data?.map(t => t._id) || []);
    } catch (err) {
      setError('Failed to load shift templates');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateToggle = (templateId) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleDayToggle = (day) => {
    setSelectedDays(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSelectAllDays = () => {
    setSelectedDays(DAYS_OF_WEEK.map(d => d.value));
  };

  const handleDeselectAllDays = () => {
    setSelectedDays([]);
  };

  const handleSelectAllTemplates = () => {
    setSelectedTemplates(templates.map(t => t._id));
  };

  const handleDeselectAllTemplates = () => {
    setSelectedTemplates([]);
  };

  const handleSubmit = () => {
    if (selectedTemplates.length === 0) {
      setError('Please select at least one shift template');
      return;
    }
    
    if (selectedDays.length === 0) {
      setError('Please select at least one day');
      return;
    }

    onGenerate({
      weekStartDate,
      templateIds: selectedTemplates,
      days: selectedDays,
      autoAssignStaff,
      useTemplates: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content generate-rota-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎯 Generate Draft Rota</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading templates...</p>
            </div>
          ) : (
            <>
              {/* Shift Templates Section */}
              <div className="config-section">
                <div className="section-header">
                  <h3>📋 Select Shift Templates</h3>
                  <div className="section-actions">
                    <button 
                      className="btn-link" 
                      onClick={handleSelectAllTemplates}
                      disabled={templates.length === 0}
                    >
                      Select All
                    </button>
                    <button 
                      className="btn-link" 
                      onClick={handleDeselectAllTemplates}
                      disabled={templates.length === 0}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                
                {templates.length === 0 ? (
                  <div className="empty-state">
                    <p>⚠️ No shift templates found. Please create templates first.</p>
                  </div>
                ) : (
                  <div className="templates-grid">
                    {templates.map(template => (
                      <div 
                        key={template._id}
                        className={`template-card ${selectedTemplates.includes(template._id) ? 'selected' : ''}`}
                        onClick={() => handleTemplateToggle(template._id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTemplates.includes(template._id)}
                          onChange={() => handleTemplateToggle(template._id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="template-info">
                          <h4>{template.name}</h4>
                          <div className="template-details">
                            <span className="badge">{template.dayOfWeek}</span>
                            <span className="time">{template.startTime} - {template.endTime}</span>
                          </div>
                          <div className="template-roles">
                            {template.roleRequirements?.map((req, idx) => (
                              <span key={idx} className="role-badge">
                                {req.count}× {req.role.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Days Selection Section */}
              <div className="config-section">
                <div className="section-header">
                  <h3>📅 Select Days to Generate</h3>
                  <div className="section-actions">
                    <button className="btn-link" onClick={handleSelectAllDays}>
                      Select All
                    </button>
                    <button className="btn-link" onClick={handleDeselectAllDays}>
                      Deselect All
                    </button>
                  </div>
                </div>
                
                <div className="days-grid">
                  {DAYS_OF_WEEK.map(day => (
                    <div 
                      key={day.value}
                      className={`day-card ${selectedDays.includes(day.value) ? 'selected' : ''}`}
                      onClick={() => handleDayToggle(day.value)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(day.value)}
                        onChange={() => handleDayToggle(day.value)}
                        onClick={e => e.stopPropagation()}
                      />
                      <span>{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options Section */}
              <div className="config-section">
                <div className="section-header">
                  <h3>⚙️ Generation Options</h3>
                </div>
                
                <div className="options-list">
                  <label className="option-item">
                    <input
                      type="checkbox"
                      checked={autoAssignStaff}
                      onChange={(e) => setAutoAssignStaff(e.target.checked)}
                    />
                    <div className="option-info">
                      <strong>Automatically Assign Staff</strong>
                      <small>Use the smart algorithm to assign staff to shifts based on availability, preferences, and fair distribution</small>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={loading || templates.length === 0 || selectedTemplates.length === 0 || selectedDays.length === 0}
          >
            <span className="btn-icon">✨</span>
            Generate Rota
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateRotaModal;
