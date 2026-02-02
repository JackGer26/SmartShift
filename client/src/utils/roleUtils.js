/**
 * Role display utility functions
 */

/**
 * Formats a role string for display by replacing underscores with spaces
 * and capitalizing each word
 * @param {string} role - The role string (e.g., 'head_bartender')
 * @returns {string} - The formatted role string (e.g., 'Head Bartender')
 */
export const formatRoleForDisplay = (role) => {
  if (!role) return '';
  
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Gets the display label for a role
 * @param {string} role - The role value
 * @returns {string} - The formatted display label
 */
export const getRoleDisplayLabel = (role) => {
  return formatRoleForDisplay(role);
};