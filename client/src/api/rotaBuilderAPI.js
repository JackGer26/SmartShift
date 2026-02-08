/**
 * Rota Builder API - Core rota generation and management
 * 
 * Handles:
 * - Draft rota generation from templates
 * - Staff assignments and scheduling
 * - Rota validation and conflict detection
 * - Publishing and CSV export
 */

import { api } from './api';

const API_BASE = '/rota';

/**
 * Generate a draft rota for a specific week
 * Uses shift templates to create the initial structure
 * @param {string} weekStartDate - ISO date string for Monday of the week
 * @param {Object} options - Generation options
 * @param {Array} options.templateIds - Array of template IDs to use (optional)
 * @param {Array} options.days - Array of day names to generate (optional)
 * @param {Boolean} options.autoAssignStaff - Whether to auto-assign staff (default: true)
 * @param {Boolean} options.useTemplates - Whether to use templates (default: true)
 */
export const generateDraftRota = async (weekStartDate, options = {}) => {
  try {
    const requestBody = {
      weekStartDate,
      useTemplates: options.useTemplates !== undefined ? options.useTemplates : true,
      autoAssignStaff: options.autoAssignStaff !== undefined ? options.autoAssignStaff : true,
      templateIds: options.templateIds || null,
      days: options.days || null
    };

    const response = await api.post(`${API_BASE}/generate`, requestBody);

    // Backend returns { success, data, analysis, performance, message }
    // Extract the rota data
    return response.data || response;
  } catch (error) {
    console.error('Error generating draft rota:', error);
    throw new Error('Failed to generate draft rota');
  }
};

/**
 * Get existing rota for a specific week
 */
export const getRotaByWeek = async (weekStartDate) => {
  try {
    const response = await api.get(`${API_BASE}/week/${weekStartDate}`);
    return response;
  } catch (error) {
    // Return null if no rota exists for this week
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null;
    }
    console.error('Error fetching rota:', error);
    throw new Error('Failed to fetch rota');
  }
};

/**
 * Assign a staff member to a specific shift
 */
export const assignStaffToShift = async (rotaId, shiftId, staffId) => {
  try {
    const response = await api.post(`${API_BASE}/${rotaId}/shifts/${shiftId}/assign`, { staffId });

    return response;
  } catch (error) {
    console.error('Error assigning staff:', error);
    throw new Error('Failed to assign staff member');
  }
};

/**
 * Remove a staff member from a specific shift
 */
export const removeStaffFromShift = async (rotaId, shiftId, staffId) => {
  try {
    const response = await api.post(`${API_BASE}/${rotaId}/shifts/${shiftId}/remove`, { staffId });

    return response;
  } catch (error) {
    console.error('Error removing staff:', error);
    throw new Error('Failed to remove staff member');
  }
};

/**
 * Get staff members available for a specific shift
 * Considers role requirements, time off, and existing assignments
 */
export const getAvailableStaff = async (shiftDate, shiftTime, requiredRole) => {
  try {
    const params = new URLSearchParams({
      date: shiftDate,
      time: shiftTime,
      role: requiredRole
    });

    const response = await api.get(`${API_BASE}/available-staff?${params}`);
    return response;
  } catch (error) {
    console.error('Error fetching available staff:', error);
    throw new Error('Failed to fetch available staff');
  }
};

/**
 * Validate the entire rota for conflicts and issues
 */
export const validateRota = async (rotaId) => {
  try {
    const response = await api.get(`${API_BASE}/${rotaId}/validate`);
    return response;
  } catch (error) {
    console.error('Error validating rota:', error);
    throw new Error('Failed to validate rota');
  }
};

/**
 * Get rota statistics and warnings
 */
export const getRotaWarnings = async (rotaId) => {
  try {
    const response = await api.get(`${API_BASE}/${rotaId}/warnings`);
    return response;
  } catch (error) {
    console.error('Error fetching rota warnings:', error);
    throw new Error('Failed to fetch rota warnings');
  }
};

/**
 * Calculate total hours for each staff member in the rota
 */
export const getStaffHours = async (rotaId) => {
  try {
    const response = await api.get(`${API_BASE}/${rotaId}/staff-hours`);
    return response;
  } catch (error) {
    console.error('Error fetching staff hours:', error);
    throw new Error('Failed to fetch staff hours');
  }
};

/**
 * Publish the rota (make it final and notify staff)
 */
export const publishRota = async (rotaId) => {
  try {
    const response = await api.post(`${API_BASE}/${rotaId}/publish`, {});

    return response;
  } catch (error) {
    console.error('Error publishing rota:', error);
    throw new Error('Failed to publish rota');
  }
};

/**
 * Export rota to CSV format
 */
export const exportRotaCSV = async (rotaId) => {
  try {
    const response = await fetch(`/api/rota/${rotaId}/export/csv`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the CSV data as blob
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    // Get the filename from response headers or create default
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'rota.csv';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting rota CSV:', error);
    throw new Error('Failed to export rota to CSV');
  }
};

/**
 * Save draft rota (auto-save functionality)
 */
export const saveDraftRota = async (rotaData) => {
  try {
    const response = await api.post(`${API_BASE}/save-draft`, rotaData);

    return response;
  } catch (error) {
    console.error('Error saving draft rota:', error);
    throw new Error('Failed to save draft rota');
  }
};

/**
 * Delete a rota (only if not published)
 */
export const deleteRota = async (rotaId) => {
  try {
    const response = await api.delete(`${API_BASE}/${rotaId}`);

    return response;
  } catch (error) {
    console.error('Error deleting rota:', error);
    throw new Error('Failed to delete rota');
  }
};

/**
 * Copy rota from another week
 */
export const copyRotaFromWeek = async (sourceWeekStart, targetWeekStart) => {
  try {
    const response = await api.post(`${API_BASE}/copy`, {
      sourceWeekStart,
      targetWeekStart
    });

    return response;
  } catch (error) {
    console.error('Error copying rota:', error);
    throw new Error('Failed to copy rota from another week');
  }
};

/**
 * Get rota summary statistics
 */
export const getRotaSummary = async (rotaId) => {
  try {
    const response = await api.get(`${API_BASE}/${rotaId}/summary`);
    return response;
  } catch (error) {
    console.error('Error fetching rota summary:', error);
    throw new Error('Failed to fetch rota summary');
  }
};

/**
 * Get all rotas for a date range
 */
export const getRotasByDateRange = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams({
      startDate,
      endDate
    });

    const response = await api.get(`${API_BASE}/range?${params}`);
    return response;
  } catch (error) {
    console.error('Error fetching rotas by date range:', error);
    throw new Error('Failed to fetch rotas');
  }
};

/**
 * Bulk assign staff to multiple shifts
 */
export const bulkAssignStaff = async (rotaId, assignments) => {
  try {
    const response = await api.post(`${API_BASE}/${rotaId}/bulk-assign`, { assignments });

    return response;
  } catch (error) {
    console.error('Error bulk assigning staff:', error);
    throw new Error('Failed to bulk assign staff');
  }
};

// Utility functions for date handling
export const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
};

export const formatWeekDisplay = (weekStart) => {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
  };
  
  return `${formatDate(start)} - ${formatDate(end)}`;
};

export const getISODateString = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * VALIDATION FUNCTIONS
 * Hard constraint validation for staff assignments
 */

/**
 * Validate staff assignment against hard constraints
 * @param {Object} assignment - Assignment details
 * @returns {Promise<Object>} - Validation result
 */
export const validateStaffAssignment = async (assignment) => {
  try {
    const response = await api.post(`${API_BASE}/validate-assignment`, assignment);
    
    return response;
  } catch (error) {
    console.error('Assignment validation failed:', error);
    throw error;
  }
};

/**
 * Validate entire rota against hard constraints
 * @param {string} rotaId - Rota ID
 * @returns {Promise<Object>} - Validation result
 */
export const validateEntireRota = async (rotaId) => {
  try {
    const response = await api.post(`${API_BASE}/${rotaId}/validate`, {});
    
    return response;
  } catch (error) {
    console.error('Rota validation failed:', error);
    throw error;
  }
};

/**
 * Get soft constraint scoring analytics for staff assignment
 * @param {Object} assignmentDetails - Assignment scoring parameters
 * @returns {Promise<Object>} - Scoring analytics and recommendations
 */
export const getAssignmentScoring = async (assignmentDetails) => {
  try {
    const response = await api.post(`${API_BASE}/score-assignment`, assignmentDetails);
    
    return response;
  } catch (error) {
    console.error('Assignment scoring failed:', error);
    throw error;
  }
};

/**
 * Get optimal staff recommendations for a shift slot
 * @param {Object} slotDetails - Shift slot details
 * @returns {Promise<Array>} - Ranked staff recommendations
 */
export const getStaffRecommendations = async (slotDetails) => {
  try {
    const scoring = await getAssignmentScoring(slotDetails);
    
    // Return top 3 recommendations with explanations
    return scoring.scoredStaff.slice(0, 3).map(scored => ({
      staff: scored.staff,
      totalScore: scored.totalScore,
      percentage: ((scored.totalScore / scored.maxPossibleScore) * 100).toFixed(1),
      topStrengths: Object.entries(scored.scores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category, score]) => ({ category, score: score.toFixed(1) })),
      recommendation: scored.totalScore > 200 ? 'excellent' :
                    scored.totalScore > 150 ? 'good' :
                    scored.totalScore > 100 ? 'adequate' : 'poor',
      debugInfo: scored.debugInfo
    }));
  } catch (error) {
    console.error('Failed to get staff recommendations:', error);
    throw error;
  }
};

/**
 * Get constraint configuration
 * @returns {Object} - Current constraint settings
 */
export const getConstraintConfig = () => {
  return {
    timeOffEnforcement: true,
    roleQualificationEnforcement: true,
    availabilityEnforcement: true,
    maxHoursEnforcement: true,
    ageRestrictionsEnabled: false, // MVP+ feature
    minimumShiftDuration: 2,
    maximumShiftDuration: 12,
    legalMaxWeeklyHours: 60,
    under18WorkingHours: { 
      earliest: '06:00', 
      latest: '22:00', 
      maxDailyHours: 8 
    }
  };
};