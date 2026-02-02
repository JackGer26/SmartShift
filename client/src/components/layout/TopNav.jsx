import { Link, useLocation } from 'react-router-dom';
import './TopNav.css';

/**
 * TopNav - Main navigation component
 * Provides navigation links to all main pages
 */
const TopNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/staff', label: 'Staff', icon: '👥' },
    { path: '/time-off', label: 'Time Off', icon: '📅' },
    { path: '/shift-templates', label: 'Shift Templates', icon: '📋' },
    { path: '/rota-builder', label: 'Rota Builder', icon: '⚙️' }
  ];

  return (
    <nav className="top-nav">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <span className="brand-icon">🍽️</span>
          <span className="brand-text">SmartShift</span>
        </Link>
        
        <div className="nav-menu">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default TopNav;