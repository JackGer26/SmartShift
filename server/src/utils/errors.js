/**
 * SmartShift Restaurant Rota Builder - Custom Error Classes
 * 
 * Custom error classes for better error handling and debugging.
 * Provides structured error information for different scenarios.
 */

/**
 * Base application error class
 * Extends Error to include additional properties for API responses
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'APPLICATION_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Flag to identify expected errors
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Resource not found error (404)
 * Used when requested staff, shift, time-off, etc. doesn't exist
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Validation error (400) 
 * Used for business logic validation (beyond mongoose schema)
 */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Conflict error (409)
 * Used for business logic conflicts (scheduling conflicts, etc.)
 */
class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * Unauthorized error (401)
 * For future authentication implementation
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error (403)
 * For future role-based access control
 */
class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError
};