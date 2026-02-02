import { Link } from 'react-router-dom';
import './HomePage.css';

/**
 * HomePage - Landing page with navigation to main features
 */
const HomePage = () => {
  const features = [
    {
      title: 'Staff Management',
      description: 'Manage your restaurant staff, roles, and availability',
      icon: '👥',
      path: '/staff',
      color: '#3498db'
    },
    {
      title: 'Time Off Requests',
      description: 'Handle staff holiday and time off requests',
      icon: '📅',
      path: '/time-off',
      color: '#e74c3c'
    },
    {
      title: 'Shift Templates',
      description: 'Create and manage shift patterns for your restaurant',
      icon: '📋',
      path: '/shift-templates',
      color: '#f39c12'
    },
    {
      title: 'Rota Builder',
      description: 'Generate and manage weekly staff rotas automatically',
      icon: '⚙️',
      path: '/rota-builder',
      color: '#27ae60'
    }
  ];

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1 className="hero-title">
          <span className="hero-icon">🍽️</span>
          SmartShift
        </h1>
        <p className="hero-subtitle">Restaurant Rota Builder MVP</p>
        <p className="hero-description">
          Streamline your restaurant scheduling with automated rota generation,
          staff management, and shift planning tools.
        </p>
      </div>

      <div className="features-grid">
        {features.map((feature) => (
          <Link
            key={feature.path}
            to={feature.path}
            className="feature-card"
            style={{ '--accent-color': feature.color }}
          >
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
            <span className="feature-arrow">→</span>
          </Link>
        ))}
      </div>

      <div className="getting-started">
        <h2>Getting Started</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h4>Add Your Staff</h4>
            <p>Start by adding your restaurant staff members with their roles and availability.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h4>Create Shift Templates</h4>
            <p>Define the shift patterns for different days and roles in your restaurant.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h4>Generate Rotas</h4>
            <p>Use the automated rota builder to create optimized weekly schedules.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;