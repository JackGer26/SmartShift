import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import StaffPage from './pages/StaffPage';
import TimeOffPage from './pages/TimeOffPage';
import ShiftTemplatesPage from './pages/ShiftTemplatesPage';
import RotaBuilderPage from './pages/RotaBuilderPage';
import HomePage from './pages/HomePage';
import './App.css';

/**
 * Main App Component - Restaurant Rota Builder MVP
 * 
 * Handles client-side routing for the restaurant scheduling application.
 * Uses React Router for navigation between different management pages.
 * 
 * Pages:
 * - HomePage: Landing page with overview
 * - StaffPage: Staff management (CRUD operations)
 * - TimeOffPage: Time off request management 
 * - ShiftTemplatesPage: Shift template configuration
 * - RotaBuilderPage: Automated rota generation
 */
function App() {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/time-off" element={<TimeOffPage />} />
          <Route path="/shift-templates" element={<ShiftTemplatesPage />} />
          <Route path="/rota-builder" element={<RotaBuilderPage />} />
        </Routes>
      </AppShell>
    </Router>
  );
}

export default App;