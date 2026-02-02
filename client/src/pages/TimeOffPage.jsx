/**
 * TimeOffPage - Manage staff time off requests
 */
const TimeOffPage = () => {
  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">📅 Time Off Management</h1>
        <p className="page-description">
          Manage staff holiday requests, sick leave, and other time off.
        </p>
        <button className="btn">
          + New Time Off Request
        </button>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Pending Requests</h3>
          <p>No pending time off requests.</p>
          <div className="placeholder-content">
            <p>📝 Time off request management features:</p>
            <ul>
              <li>Submit time off requests</li>
              <li>Approve/deny requests</li>
              <li>View staff calendar</li>
              <li>Conflict detection</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <h3>Upcoming Time Off</h3>
          <p>No upcoming approved time off.</p>
          <div className="calendar-placeholder">
            <p>📅 Calendar view coming soon</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Time Off History</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  No time off requests found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimeOffPage;