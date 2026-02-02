/**
 * Date and time utility functions for rota generation
 */

/**
 * Get the start of the week (Monday) for a given date
 * @param {Date} date - The input date
 * @returns {Date} - Monday of that week
 */
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
};

/**
 * Get the end of the week (Sunday) for a given date
 * @param {Date} date - The input date
 * @returns {Date} - Sunday of that week
 */
const getWeekEnd = (date) => {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd;
};

/**
 * Get all dates in a week
 * @param {Date} weekStart - Monday of the week
 * @returns {Date[]} - Array of 7 dates (Mon-Sun)
 */
const getWeekDates = (weekStart) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
};

/**
 * Get day of week name from date
 * @param {Date} date - The input date
 * @returns {string} - Day name in lowercase (monday, tuesday, etc.)
 */
const getDayName = (date) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

/**
 * Convert time string to minutes since midnight
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} - Minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string
 * @param {number} minutes - Minutes since midnight
 * @returns {string} - Time in HH:MM format
 */
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Calculate duration between two time strings
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {number} - Duration in hours
 */
const calculateShiftDuration = (startTime, endTime) => {
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  
  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours in minutes
  }
  
  return (endMinutes - startMinutes) / 60; // Convert to hours
};

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date - The input date
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

module.exports = {
  getWeekStart,
  getWeekEnd,
  getWeekDates,
  getDayName,
  timeToMinutes,
  minutesToTime,
  calculateShiftDuration,
  formatDate
};