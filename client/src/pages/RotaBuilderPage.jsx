import { useState } from 'react';

/**
 * RotaBuilderPage - Generate and manage weekly rotas
 */
const RotaBuilderPage = () => {
  const [selectedWeek, setSelectedWeek] = useState('');
  const [generatedRota, setGeneratedRota] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateRota = async () => {
    if (!selectedWeek) {
      alert('Please select a week start date');
      return;
    }

    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setGeneratedRota({
        weekStart: selectedWeek,
        totalHours: 168,
        totalCost: 2520,
        staffCoverage: 95,
        shifts: [
          {
            date: '2026-02-01',
            staff: 'John Doe',
            role: 'chef',
            time: '07:00-15:00',
            hours: 8
          },
          {
            date: '2026-02-01',
            staff: 'Jane Smith',
            role: 'waiter',
            time: '17:00-23:00',
            hours: 6
          }
        ]
      });
      setIsGenerating(false);
    }, 2000);
  };

  const getWeekStartDate = () => {
    const today = new Date();
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    return monday.toISOString().split('T')[0];
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">⚙️ Rota Builder</h1>
        <p className="page-description">
          Generate optimized weekly rotas automatically based on templates and staff availability.
        </p>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Generate New Rota</h3>
          <div className="form-group">
            <label className="form-label">Week Starting (Monday)</label>
            <input
              type="date"
              className="form-input"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              defaultValue={getWeekStartDate()}
            />
          </div>
          
          <div className="generation-options">
            <h4>Generation Options</h4>
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              Consider time off requests
            </label>
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              Respect max hours per staff
            </label>
            <label className="checkbox-label">
              <input type="checkbox" />
              Prioritize senior staff
            </label>
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              Auto-assign based on availability
            </label>
          </div>

          <button 
            className="btn generate-btn" 
            onClick={handleGenerateRota}
            disabled={isGenerating}
          >
            {isGenerating ? '⏳ Generating...' : '🎯 Generate Rota'}
          </button>
        </div>

        <div className="card">
          <h3>Rota Preview</h3>
          {!generatedRota ? (
            <div className="empty-state">
              <p>Select a week and generate a rota to see the preview here.</p>
            </div>
          ) : (
            <div className="rota-preview">
              <div className="rota-stats">
                <div className="stat">
                  <span className="stat-value">{generatedRota.totalHours}h</span>
                  <span className="stat-label">Total Hours</span>
                </div>
                <div className="stat">
                  <span className="stat-value">£{generatedRota.totalCost}</span>
                  <span className="stat-label">Labor Cost</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{generatedRota.staffCoverage}%</span>
                  <span className="stat-label">Coverage</span>
                </div>
              </div>
              
              <div className="shifts-preview">
                <h4>Sample Shifts</h4>
                {generatedRota.shifts.map((shift, index) => (
                  <div key={index} className="shift-item">
                    <span className="shift-date">{shift.date}</span>
                    <span className="shift-staff">{shift.staff}</span>
                    <span className="shift-role">{shift.role}</span>
                    <span className="shift-time">{shift.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Recent Rotas</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Week Starting</th>
                <th>Status</th>
                <th>Total Hours</th>
                <th>Labor Cost</th>
                <th>Staff Count</th>
                <th>Generated Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2026-01-27</td>
                <td><span className="status-badge status-published">Published</span></td>
                <td>156h</td>
                <td>£2,340</td>
                <td>8</td>
                <td>2026-01-25</td>
                <td>
                  <button className="btn btn-sm">View</button>
                  <button className="btn btn-sm btn-secondary">Copy</button>
                </td>
              </tr>
              <tr>
                <td>2026-02-03</td>
                <td><span className="status-badge status-draft">Draft</span></td>
                <td>168h</td>
                <td>£2,520</td>
                <td>8</td>
                <td>2026-01-28</td>
                <td>
                  <button className="btn btn-sm">Edit</button>
                  <button className="btn btn-sm">Publish</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Generation Tips</h3>
          <div className="tips-list">
            <div className="tip-item">
              💡 <strong>Best Results:</strong> Ensure all shift templates are configured before generating
            </div>
            <div className="tip-item">
              ⏰ <strong>Timing:</strong> Generate rotas 1-2 weeks in advance
            </div>
            <div className="tip-item">
              👥 <strong>Coverage:</strong> Aim for 90%+ coverage for optimal scheduling
            </div>
            <div className="tip-item">
              🔄 <strong>Flexibility:</strong> You can manually adjust generated rotas
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Algorithm Settings</h3>
          <p>Fine-tune the rota generation algorithm:</p>
          <div className="settings-list">
            <div className="setting-item">
              <label>Fairness Weight</label>
              <input type="range" min="1" max="5" defaultValue="3" />
            </div>
            <div className="setting-item">
              <label>Cost Optimization</label>
              <input type="range" min="1" max="5" defaultValue="4" />
            </div>
            <div className="setting-item">
              <label>Availability Priority</label>
              <input type="range" min="1" max="5" defaultValue="5" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .generate-btn {
          width: 100%;
          padding: 15px;
          font-size: 16px;
          margin-top: 20px;
        }
        
        .generation-options {
          margin: 20px 0;
        }
        
        .generation-options h4 {
          margin-bottom: 15px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          cursor: pointer;
        }
        
        .checkbox-label input {
          margin-right: 10px;
        }
        
        .rota-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .stat {
          text-align: center;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .stat-label {
          font-size: 12px;
          color: #7f8c8d;
          margin-top: 5px;
        }
        
        .shifts-preview h4 {
          margin-bottom: 15px;
        }
        
        .shift-item {
          display: grid;
          grid-template-columns: 100px 1fr 80px 120px;
          gap: 10px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .shift-date {
          font-weight: 500;
        }
        
        .shift-staff {
          color: #2c3e50;
        }
        
        .shift-role {
          color: #7b1fa2;
          text-transform: capitalize;
        }
        
        .shift-time {
          color: #666;
          font-family: monospace;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-published {
          background-color: #d4edda;
          color: #155724;
        }
        
        .status-draft {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .tips-list, .settings-list {
          space-y: 10px;
        }
        
        .tip-item {
          padding: 12px;
          background: #f8f9fa;
          border-left: 4px solid #007bff;
          margin-bottom: 10px;
          border-radius: 0 6px 6px 0;
        }
        
        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
        }
        
        .setting-item:last-child {
          border-bottom: none;
        }
        
        .setting-item input[type="range"] {
          width: 120px;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #7f8c8d;
        }
        
        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
          margin-right: 5px;
        }
        
        @media (max-width: 768px) {
          .rota-stats {
            grid-template-columns: 1fr;
          }
          
          .shift-item {
            grid-template-columns: 1fr;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default RotaBuilderPage;