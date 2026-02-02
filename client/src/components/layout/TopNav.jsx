import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './TopNav.css';

/**
 * TopNav - Main navigation component
 * Provides navigation links to all main pages with enhanced features
 * 
 * Features:
 * - Active page highlighting
 * - Breadcrumb navigation
 * - Mobile-responsive design
 * - Keyboard navigation support
 */
const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠', description: 'Dashboard overview' },
    { path: '/staff', label: 'Staff', icon: '👥', description: 'Manage staff members' },
    { path: '/time-off', label: 'Time Off', icon: '📅', description: 'Time off requests' },
    { path: '/shift-templates', label: 'Shift Templates', icon: '📋', description: 'Configure shift templates' },
    { path: '/rota-builder', label: 'Rota Builder', icon: '⚙️', description: 'Generate weekly rotas' }
  ];

  // Get current page info for breadcrumbs
  const currentPage = navItems.find(item => item.path === location.pathname);
  const pageTitle = currentPage ? currentPage.label : 'Page';

  // Handle keyboard navigation
  const handleKeyPress = (event, path) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(path);
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="top-nav" role="navigation" aria-label="Main navigation">
      <div className="nav-container">
        {/* Brand logo and name */}
        <Link to="/" className="nav-brand" aria-label="SmartShift home">
          <span className="brand-icon" role="img" aria-label="Restaurant icon">🍽️</span>
          <span className="brand-text">SmartShift</span>
        </Link>
        
        {/* Current page breadcrumb for mobile */}
        <div className="nav-breadcrumb">
          <span className="breadcrumb-icon">{currentPage?.icon}</span>
          <span className="breadcrumb-text">{pageTitle}</span>
        </div>

        {/* Mobile menu button */}
        <button 
          className="mobile-menu-button"
          onClick={toggleMobileMenu}
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-icon">
            {isMobileMenuOpen ? '✕' : '☰'}
          </span>
        </button>
        
        {/* Navigation menu */}
        <div className={`nav-menu ${isMobileMenuOpen ? 'nav-menu-open' : ''}`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
              onKeyDown={(e) => handleKeyPress(e, item.path)}
              title={item.description}
              aria-label={`${item.label} - ${item.description}`}
            >
              <span className="nav-icon" role="img" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default TopNav;