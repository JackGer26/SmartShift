import { api } from './api';

/**
 * Shift Template API - Handles all shift template related API calls
 * 
 * Features:
 * - Get all shift templates with filtering
 * - Create new templates
 * - Update existing templates
 * - Delete templates
 * - Get templates by day/role
 */

/**
 * Get all shift templates
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Array>} Array of shift templates
 */
export const getAllShiftTemplates = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.dayOfWeek) queryParams.append('dayOfWeek', filters.dayOfWeek);
  if (filters.requiredRole) queryParams.append('requiredRole', filters.requiredRole);
  if (filters.isActive !== undefined) queryParams.append('isActive', filters.isActive);
  if (filters.priority) queryParams.append('priority', filters.priority);
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/shift-templates?${queryString}` : '/shift-templates';
  
  return await api.get(endpoint);
};

/**
 * Get shift template by ID
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Shift template data
 */
export const getShiftTemplateById = async (id) => {
  return await api.get(`/shift-templates/${id}`);
};

/**
 * Create new shift template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
export const createShiftTemplate = async (templateData) => {
  return await api.post('/shift-templates', templateData);
};

/**
 * Update existing shift template
 * @param {string} id - Template ID
 * @param {Object} updates - Updated data
 * @returns {Promise<Object>} Updated template
 */
export const updateShiftTemplate = async (id, updates) => {
  return await api.put(`/shift-templates/${id}`, updates);
};

/**
 * Delete shift template
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteShiftTemplate = async (id) => {
  return await api.delete(`/shift-templates/${id}`);
};

/**
 * Get templates for specific day
 * @param {string} dayOfWeek - Day of week
 * @returns {Promise<Array>} Templates for that day
 */
export const getTemplatesForDay = async (dayOfWeek) => {
  return await getAllShiftTemplates({ dayOfWeek });
};

/**
 * Get templates for specific role
 * @param {string} role - Staff role
 * @returns {Promise<Array>} Templates for that role
 */
export const getTemplatesForRole = async (role) => {
  return await getAllShiftTemplates({ requiredRole: role });
};

/**
 * Toggle template active status
 * @param {string} id - Template ID
 * @param {boolean} isActive - New active status
 * @returns {Promise<Object>} Updated template
 */
export const toggleTemplateStatus = async (id, isActive) => {
  return await updateShiftTemplate(id, { isActive });
};

/**
 * Duplicate existing template
 * @param {string} id - Template ID to duplicate
 * @param {Object} changes - Changes to apply to duplicate
 * @returns {Promise<Object>} New template
 */
export const duplicateTemplate = async (id, changes = {}) => {
  const template = await getShiftTemplateById(id);
  const { _id, __v, createdAt, updatedAt, ...templateData } = template;
  
  const newTemplate = {
    ...templateData,
    name: `${templateData.name} (Copy)`,
    ...changes
  };
  
  return await createShiftTemplate(newTemplate);
};