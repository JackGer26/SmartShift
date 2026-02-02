import { api } from './api';

/**
 * Staff API methods
 * Handles all staff-related API calls
 */
export const staffAPI = {
  /**
   * Get all staff members
   * @returns {Promise<Array>} - Array of staff members
   */
  getAll: () => api.get('/staff'),

  /**
   * Get a specific staff member by ID
   * @param {string} id - Staff member ID
   * @returns {Promise<Object>} - Staff member data
   */
  getById: (id) => api.get(`/staff/${id}`),

  /**
   * Create a new staff member
   * @param {Object} staffData - Staff member data
   * @returns {Promise<Object>} - Created staff member
   */
  create: (staffData) => api.post('/staff', staffData),

  /**
   * Update a staff member
   * @param {string} id - Staff member ID
   * @param {Object} staffData - Updated staff member data
   * @returns {Promise<Object>} - Updated staff member
   */
  update: (id, staffData) => api.put(`/staff/${id}`, staffData),

  /**
   * Delete (deactivate) a staff member
   * @param {string} id - Staff member ID
   * @returns {Promise<Object>} - Success message
   */
  delete: (id) => api.delete(`/staff/${id}`),
};