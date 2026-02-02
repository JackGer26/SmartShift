/**
 * ShiftTemplatesPage - Manage shift templates and patterns
 */
const ShiftTemplatesPage = () => {
  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
    'Friday', 'Saturday', 'Sunday'
  ];

  const sampleTemplates = [
    {
      id: 1,
      name: 'Morning Kitchen',
      dayOfWeek: 'Monday',
      startTime: '07:00',
      endTime: '15:00',
      requiredRole: 'chef',
      staffCount: 2
    },
    {
      id: 2,
      name: 'Evening Service',
      dayOfWeek: 'Friday',
      startTime: '17:00',
      endTime: '23:00',
      requiredRole: 'waiter',
      staffCount: 3
    }
  ];

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">📋 Shift Templates</h1>
        <p className="page-description">
          Create and manage shift patterns for different days and roles.
        </p>
        <button className="btn">
          + Create New Template
        </button>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Weekly Template Overview</h3>
          <div className="week-grid">
            {daysOfWeek.map(day => (
              <div key={day} className="day-column">
                <h4>{day}</h4>
                <div className="shifts-for-day">
                  {sampleTemplates
                    .filter(t => t.dayOfWeek.toLowerCase() === day.toLowerCase())
                    .map(template => (
                      <div key={template.id} className="shift-template-card">
                        <div className="template-name">{template.name}</div>
                        <div className="template-time">
                          {template.startTime} - {template.endTime}
                        </div>
                        <div className="template-role">{template.requiredRole}</div>
                        <div className="template-count">{template.staffCount} staff</div>
                      </div>
                    ))}
                  <button className="add-shift-btn">+ Add Shift</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>All Shift Templates</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Day</th>
                <th>Time</th>
                <th>Role Required</th>
                <th>Staff Count</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sampleTemplates.map(template => (
                <tr key={template.id}>
                  <td>{template.name}</td>
                  <td>{template.dayOfWeek}</td>
                  <td>{template.startTime} - {template.endTime}</td>
                  <td>
                    <span className={`role-badge role-${template.requiredRole}`}>
                      {template.requiredRole}
                    </span>
                  </td>
                  <td>{template.staffCount}</td>
                  <td>⭐⭐⭐⭐⭐</td>
                  <td>
                    <button className="btn btn-sm">Edit</button>
                    <button className="btn btn-sm btn-secondary">Copy</button>
                    <button className="btn btn-sm btn-danger">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Template Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{sampleTemplates.length}</div>
              <div className="stat-label">Total Templates</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">7</div>
              <div className="stat-label">Days Covered</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {sampleTemplates.reduce((sum, t) => sum + t.staffCount, 0)}
              </div>
              <div className="stat-label">Weekly Staff Slots</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button className="action-btn">
              📋 Import Templates
            </button>
            <button className="action-btn">
              📤 Export Templates
            </button>
            <button className="action-btn">
              🔄 Duplicate Week
            </button>
            <button className="action-btn">
              ⚙️ Batch Edit
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .week-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
          margin-top: 20px;
        }
        
        .day-column {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px;
          min-height: 200px;
        }
        
        .day-column h4 {
          text-align: center;
          margin: 0 0 10px 0;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        
        .shift-template-card {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 8px;
          font-size: 12px;
        }
        
        .template-name {
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .template-time {
          color: #666;
          margin-bottom: 2px;
        }
        
        .template-role {
          color: #007bff;
          margin-bottom: 2px;
        }
        
        .template-count {
          color: #28a745;
          font-size: 11px;
        }
        
        .add-shift-btn {
          width: 100%;
          padding: 6px;
          border: 2px dashed #ccc;
          background: none;
          border-radius: 4px;
          color: #666;
          font-size: 12px;
          cursor: pointer;
        }
        
        .add-shift-btn:hover {
          border-color: #007bff;
          color: #007bff;
        }
        
        .role-badge {
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .role-chef { background-color: #fff3e0; color: #f57c00; }
        .role-waiter { background-color: #f3e5f5; color: #7b1fa2; }
        .role-manager { background-color: #e3f2fd; color: #1976d2; }
        .role-bartender { background-color: #e8f5e8; color: #388e3c; }
        .role-cleaner { background-color: #fce4ec; color: #c2185b; }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        
        .stat-item {
          text-align: center;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .stat-value {
          font-size: 2rem;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 5px;
        }
        
        .stat-label {
          font-size: 12px;
          color: #7f8c8d;
        }
        
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        
        .action-btn {
          padding: 15px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
          font-size: 14px;
        }
        
        .action-btn:hover {
          background-color: #f8f9fa;
        }
        
        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
          margin-right: 5px;
        }
        
        .btn-danger {
          background-color: #dc3545;
          color: white;
        }
        
        @media (max-width: 768px) {
          .week-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ShiftTemplatesPage;