import TopNav from './TopNav';
import './AppShell.css';

/**
 * AppShell - Main layout wrapper component
 * Provides consistent layout structure with navigation
 */
const AppShell = ({ children }) => {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="main-content">
        {children}
      </main>
      <footer className="app-footer">
        <p>&copy; 2026 SmartShift - Restaurant Rota Builder</p>
      </footer>
    </div>
  );
};

export default AppShell;