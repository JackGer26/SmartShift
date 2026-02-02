import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getAllTimeOff } from '../api/timeOffAPI';
import TimeOffList from '../components/timeoff/TimeOffList';
import TimeOffForm from '../components/timeoff/TimeOffForm';

/**
 * TimeOffPage - Manage staff time off requests
 * 
 * Features:
 * - View all time off requests with filtering
 * - Add new time off requests
 * - Edit existing requests
 * - Delete time off requests
 * - Approve/deny pending requests
 * - Responsive design with modern UI
 */
const TimeOffPage = () => {
  const { showError } = useAppContext();
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Load time off requests on component mount
  useEffect(() => {
    loadTimeOffRequests();
  }, []);

  // Load time off requests from API
  const loadTimeOffRequests = async () => {
    try {
      setLoading(true);
      const requests = await getAllTimeOff();
      setTimeOffRequests(requests || []);
    } catch (error) {
      showError('Failed to load time off requests');
      setTimeOffRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening the form for new request
  const handleAddNew = () => {
    setEditingRequest(null);
    setShowForm(true);
  };

  // Handle opening the form for editing
  const handleEdit = (request) => {
    setEditingRequest(request);
    setShowForm(true);
  };

  // Handle closing the form
  const handleFormClose = () => {
    setShowForm(false);
    setEditingRequest(null);
  };

  // Handle form success (create/update)
  const handleFormSuccess = () => {
    loadTimeOffRequests();
  };

  // Calculate statistics
  const getStatistics = () => {
    const total = timeOffRequests.length;
    const pending = timeOffRequests.filter(r => r.status === 'pending').length;
    const approved = timeOffRequests.filter(r => r.status === 'approved').length;
    const denied = timeOffRequests.filter(r => r.status === 'denied').length;
    
    return { total, pending, approved, denied };
  };

  const stats = getStatistics();

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading time off requests...</p>
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
            📅 Time Off Management
          </h1>
          <p className="page-description">
            Manage staff holiday requests, sick leave, and other time off requests.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleAddNew}
        >
          <span className="btn-icon">+</span>
          New Time Off Request
        </button>
      </div>

      {/* Statistics overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Requests</div>
          </div>
        </div>
        
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        
        <div className="stat-card approved">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-number">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        
        <div className="stat-card denied">
          <div className="stat-icon">✗</div>
          <div className="stat-content">
            <div className="stat-number">{stats.denied}</div>
            <div className="stat-label">Denied</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <TimeOffList
          timeOffRequests={timeOffRequests}
          onEdit={handleEdit}
          onRefresh={loadTimeOffRequests}
          selectedTab={activeTab}
        />
      </div>

      {/* Form modal */}
      <TimeOffForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editingRequest={editingRequest}
      />

      <style jsx>{`
        .container {
          max-width: 1200px;
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
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

        .stat-card.pending .stat-icon {
          background-color: #fff3cd;
        }

        .stat-card.approved .stat-icon {
          background-color: #d1f2eb;
        }

        .stat-card.denied .stat-icon {
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

          .page-title {
            font-size: 24px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
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

          .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default TimeOffPage;