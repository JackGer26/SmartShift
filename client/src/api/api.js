/**
 * Base API configuration and utilities
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Generic API request helper with error handling
 * @param {string} endpoint - API endpoint (e.g., '/staff')
 * @param {Object} options - Fetch options
 * @returns {Promise} - API response data
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    console.log('Making API request to:', url);
    const response = await fetch(url, config);
    console.log('Response received:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    console.log('API Response data:', data);
    
    // Return the data array if it's a successful response with data property
    return data.success ? data.data : data;
  } catch (error) {
    console.error('API Request failed for URL:', url);
    console.error('Error details:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      error.message = 'Unable to connect to the server. Please check if the backend is running on port 5000.';
    }
    throw error;
  }
};

/**
 * Standard API methods
 */
export const api = {
  // GET request
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  
  // POST request
  post: (endpoint, data) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // PUT request
  put: (endpoint, data) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // DELETE request
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};