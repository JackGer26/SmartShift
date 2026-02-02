import { api } from './api';

/**
 * Time Off API - Handles all time off related API calls
 * 
 * Features:
 * - Get all time off requests with filtering
 * - Create new time off requests
 * - Update existing requests
 * - Delete time off requests
 * - Get time off by staff member
 */

/**
 * Get all time off requests
 * @param {Object} filters - Filter parameters (status, staffId, dateRange)
 * @returns {Promise<Array>} Array of time off requests
 */
export const getAllTimeOff = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.staffId) queryParams.append('staffId', filters.staffId);
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.type) queryParams.append('type', filters.type);
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/time-off?${queryString}` : '/time-off';
  
  return await api.get(endpoint);
};

/**
 * Get time off request by ID
 * @param {string} id - Time off request ID
 * @returns {Promise<Object>} Time off request data
 */
export const getTimeOffById = async (id) => {
  return await api.get(`/time-off/${id}`);
};

/**
 * Create new time off request
 * @param {Object} timeOffData - Time off request data
 * @returns {Promise<Object>} Created time off request
 */
export const createTimeOff = async (timeOffData) => {
  return await api.post('/time-off', timeOffData);
};

/**
 * Update existing time off request
 * @param {string} id - Time off request ID
 * @param {Object} updates - Updated data
 * @returns {Promise<Object>} Updated time off request
 */
export const updateTimeOff = async (id, updates) => {
  return await api.put(`/time-off/${id}`, updates);
};

/**
 * Delete time off request
 * @param {string} id - Time off request ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteTimeOff = async (id) => {
  return await api.delete(`/time-off/${id}`);
};

/**
 * Get time off requests for specific staff member
 * @param {string} staffId - Staff member ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Staff time off requests
 */
export const getTimeOffByStaff = async (staffId, filters = {}) => {
  return await getAllTimeOff({ ...filters, staffId });
};

/**
 * Approve time off request
 * @param {string} id - Time off request ID
 * @param {string} approvedBy - ID of approver
 * @returns {Promise<Object>} Updated request
 */
export const approveTimeOff = async (id, approvedBy = 'system') => {
  return await updateTimeOff(id, {
    status: 'approved',
    approvedBy,
    approvedAt: new Date().toISOString()
  });
};

/**
 * Deny time off request
 * @param {string} id - Time off request ID
 * @param {string} reason - Reason for denial
 * @param {string} deniedBy - ID of person denying
 * @returns {Promise<Object>} Updated request
 */
export const denyTimeOff = async (id, reason, deniedBy = 'system') => {
  return await updateTimeOff(id, {
    status: 'denied',
    deniedBy,
    deniedAt: new Date().toISOString(),
    denialReason: reason
  });
};