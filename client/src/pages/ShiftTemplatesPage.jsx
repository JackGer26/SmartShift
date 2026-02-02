import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getAllShiftTemplates } from '../api/shiftTemplateAPI';
import ShiftTemplatesList from '../components/shifttemplates/ShiftTemplatesList';
import ShiftTemplateForm from '../components/shifttemplates/ShiftTemplateForm';

/**
 * ShiftTemplatesPage - Manage shift templates and patterns
 * 
 * Features:
 * - View templates in grid or table format
 * - Create new shift templates
 * - Edit existing templates
 * - Delete templates
 * - Toggle active/inactive status
 * - Role requirements configuration
 * - Weekly template overview
 */
const ShiftTemplatesPage = () => {
  const { showError } = useAppContext();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Load templates from API
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templatesData = await getAllShiftTemplates();
      setTemplates(templatesData || []);
    } catch (error) {
      showError('Failed to load shift templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening the form for new template
  const handleAddNew = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  // Handle opening the form for editing
  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  // Handle closing the form
  const handleFormClose = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  // Handle form success (create/update)
  const handleFormSuccess = () => {
    loadTemplates();
  };

  // Calculate statistics
  const getStatistics = () => {
    const total = templates.length;
    const active = templates.filter(t => t.isActive).length;
    const inactive = templates.filter(t => !t.isActive).length;
    
    // Group by day
    const byDay = templates.reduce((acc, template) => {
      const day = template.dayOfWeek.toLowerCase();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
    
    // Group by role
    const byRole = templates.reduce((acc, template) => {
      const role = template.requiredRole;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    
    return { total, active, inactive, byDay, byRole };
  };

  const stats = getStatistics();
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const roles = ['manager', 'chef', 'waiter', 'bartender', 'cleaner'];

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading shift templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Page header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            📋 Shift Templates
          </h1>
          <p className="page-description">
            Create and manage reusable shift patterns for different days and roles.
          </p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              🗓️
            </button>
            <button
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              📋
            </button>
          </div>
          <button 
            className="btn btn-primary"
            onClick={handleAddNew}
          >
            <span className="btn-icon">+</span>
            Create Template
          </button>
        </div>
      </div>

      {/* Statistics overview */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Templates</div>
            </div>
          </div>
          
          <div className="stat-card active">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{stats.active}</div>
              <div className="stat-label">Active</div>
            </div>
          </div>
          
          <div className="stat-card inactive">
            <div className="stat-icon">⏸️</div>
            <div className="stat-content">
              <div className="stat-number">{stats.inactive}</div>
              <div className="stat-label">Inactive</div>
            </div>
          </div>
        </div>

        {/* Quick stats breakdown */}
        <div className="breakdown-section">
          <div className="breakdown-card">
            <h3>By Day of Week</h3>
            <div className="breakdown-list">
              {daysOfWeek.map(day => (
                <div key={day} className="breakdown-item">
                  <span className="breakdown-label">
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </span>
                  <span className="breakdown-count">
                    {stats.byDay[day] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="breakdown-card">
            <h3>By Role</h3>
            <div className="breakdown-list">
              {roles.map(role => (
                <div key={role} className="breakdown-item">
                  <span className="breakdown-label">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                  <span className="breakdown-count">
                    {stats.byRole[role] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main templates list */}
      <div className="main-content">
        <ShiftTemplatesList
          templates={templates}
          onEdit={handleEdit}
          onRefresh={loadTemplates}
          viewMode={viewMode}
        />
      </div>

      {/* Form modal */}
      <ShiftTemplateForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editingTemplate={editingTemplate}
      />

      <style jsx>{`
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 20px;
        }

        .header-content {
          flex: 1;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #2c3e50;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .page-description {
          font-size: 16px;
          color: #6c757d;
          margin: 0;
          line-height: 1.5;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .view-toggle {
          display: flex;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 4px;
          gap: 2px;
        }

        .toggle-btn {
          padding: 8px 12px;
          border: none;
          background: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 16px;
        }

        .toggle-btn:hover {
          background: #e9ecef;
        }

        .toggle-btn.active {
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
        }

        .btn-icon {
          font-size: 16px;
          font-weight: bold;
        }

        .stats-section {
          margin-bottom: 32px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          font-size: 28px;
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8f9fa;
        }

        .stat-card.active .stat-icon {
          background-color: #d1f2eb;
        }

        .stat-card.inactive .stat-icon {
          background-color: #f8d7da;
        }

        .stat-content {
          flex: 1;
        }

        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #6c757d;
          font-weight: 500;
        }

        .breakdown-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .breakdown-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .breakdown-card h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
        }

        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f8f9fa;
        }

        .breakdown-item:last-child {
          border-bottom: none;
        }

        .breakdown-label {
          font-size: 14px;
          color: #495057;
          font-weight: 500;
        }

        .breakdown-count {
          background: #e9ecef;
          color: #495057;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 12px;
          min-width: 24px;
          text-align: center;
        }

        .main-content {
          margin-bottom: 32px;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #6c757d;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .container {
            padding: 15px;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .header-actions {
            justify-content: space-between;
          }

          .page-title {
            font-size: 24px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .breakdown-section {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 20px 16px;
          }

          .stat-icon {
            font-size: 24px;
            width: 48px;
            height: 48px;
          }

          .stat-number {
            font-size: 20px;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .header-actions {
            flex-direction: column;
            gap: 12px;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }

          .view-toggle {
            align-self: stretch;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default ShiftTemplatesPage;