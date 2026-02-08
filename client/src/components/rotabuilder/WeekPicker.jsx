import { useState, useEffect } from 'react';
import { getWeekStart, formatWeekDisplay, getISODateString } from '../../api/rotaBuilderAPI';
import './WeekPicker.css';

/**
 * WeekPicker - Week selection component for rota building
 * 
 * Features:
 * - Navigate between weeks
 * - Jump to current week
 * - Display week range
 * - Keyboard navigation support
 */
const WeekPicker = ({ selectedWeek, onWeekChange, disabled = false }) => {
  const [currentWeek, setCurrentWeek] = useState(selectedWeek || getWeekStart(new Date()));

  // Update internal state when prop changes
  useEffect(() => {
    if (selectedWeek) {
      setCurrentWeek(new Date(selectedWeek));
    }
  }, [selectedWeek]);

  // Navigate to previous week
  const goToPreviousWeek = () => {
    if (disabled) return;
    
    const current = new Date(currentWeek);
    const prevWeek = new Date(current);
    prevWeek.setDate(current.getDate() - 7);
    updateWeek(prevWeek);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    if (disabled) return;
    
    const current = new Date(currentWeek);
    const nextWeek = new Date(current);
    nextWeek.setDate(current.getDate() + 7);
    updateWeek(nextWeek);
  };

  // Jump to current week
  const goToCurrentWeek = () => {
    if (disabled) return;
    
    const now = getWeekStart(new Date());
    updateWeek(now);
  };

  // Update selected week
  const updateWeek = (newWeek) => {
    const weekStart = getWeekStart(newWeek);
    setCurrentWeek(weekStart);
    onWeekChange?.(getISODateString(weekStart));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        goToPreviousWeek();
        break;
      case 'ArrowRight':
        e.preventDefault();
        goToNextWeek();
        break;
      case 'Home':
        e.preventDefault();
        goToCurrentWeek();
        break;
      default:
        break;
    }
  };

  // Check if current week is selected
  const isCurrentWeek = () => {
    const now = getWeekStart(new Date());
    const current = new Date(currentWeek);
    // Compare dates without time component
    now.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    return current.getTime() === now.getTime();
  };

  // Format individual days for display
  const getWeekDays = () => {
    const days = [];
    const weekStart = new Date(currentWeek);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const weekDays = getWeekDays();
  const weekDisplay = formatWeekDisplay(currentWeek);
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className={`week-picker ${disabled ? 'disabled' : ''}`}>
      <div className="week-navigation">
        <button
          className="nav-btn prev-btn"
          onClick={goToPreviousWeek}
          disabled={disabled}
          title="Previous week (←)"
          aria-label="Go to previous week"
        >
          ‹
        </button>

        <div 
          className="week-display"
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label={`Selected week: ${weekDisplay}`}
        >
          <div className="week-range">
            <span className="week-text">{weekDisplay}</span>
            {isCurrentWeek() ? (
              <span className="week-badge current-week">
                This Week
              </span>
            ) : (
              <span className="week-badge future-week">
                Future Week
              </span>
            )}
          </div>
          
          <div className="week-year">
            {new Date(currentWeek).getFullYear()}
          </div>
        </div>

        <button
          className="nav-btn next-btn"
          onClick={goToNextWeek}
          disabled={disabled}
          title="Next week (→)"
          aria-label="Go to next week"
        >
          ›
        </button>
      </div>

      {/* Days preview */}
      <div className="days-preview">
        {weekDays.map((day, index) => {
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          return (
            <div 
              key={index} 
              className={`day-preview ${isToday(day) ? 'today' : ''}`}
            >
              <div className="day-name">{dayNames[index]}</div>
              <div className="day-date">{day.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Keyboard shortcuts help */}
      <div className="shortcuts-hint">
        <span title="Use arrow keys to navigate weeks, Home to jump to current week">
          ⌨️ Use ← → to navigate, Home for current week
        </span>
      </div>
    </div>
  );
};

export default WeekPicker;