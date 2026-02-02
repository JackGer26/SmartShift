import { api } from './api';

/**
 * Rota API methods
 * Handles all rota-related API calls
 */
export const rotaAPI = {
  /**
   * Get all rota weeks
   * @returns {Promise<Array>} - Array of rota weeks
   */
  getAll: () => api.get('/rota'),

  /**
   * Get a specific rota week by ID
   * @param {string} id - Rota week ID
   * @returns {Promise<Object>} - Rota week data
   */
  getById: (id) => api.get(`/rota/${id}`),

  /**
   * Get rota for a specific week by date
   * @param {string} date - Week start date (YYYY-MM-DD)
   * @returns {Promise<Object>} - Rota week data
   */
  getByDate: (date) => api.get(`/rota/week/${date}`),

  /**
   * Generate a new rota week
   * @param {Object} rotaData - Rota generation data
   * @returns {Promise<Object>} - Generated rota week
   */
  generate: (rotaData) => api.post('/rota/generate', rotaData),

  /**
   * Update a rota week
   * @param {string} id - Rota week ID
   * @param {Object} rotaData - Updated rota data
   * @returns {Promise<Object>} - Updated rota week
   */
  update: (id, rotaData) => api.put(`/rota/${id}`, rotaData),

  /**
   * Publish a rota week
   * @param {string} id - Rota week ID
   * @returns {Promise<Object>} - Published rota week
   */
  publish: (id) => api.put(`/rota/${id}/publish`),

  /**
   * Delete a rota week
   * @param {string} id - Rota week ID
   * @returns {Promise<Object>} - Success message
   */
  delete: (id) => api.delete(`/rota/${id}`),
};