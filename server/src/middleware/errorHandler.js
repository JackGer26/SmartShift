/**
 * SmartShift Restaurant Rota Builder - Central Error Handler
 * 
 * Comprehensive error handling middleware for the restaurant scheduling system.
 * Provides consistent error responses and proper logging for debugging.
 * 
 * Handles:
 * - Mongoose validation errors (missing/invalid fields)
 * - Database constraint violations (duplicate entries)
 * - Invalid ID formats (malformed ObjectIds)
 * - Custom application errors
 * - Unexpected server errors
 */
const errorHandler = (err, req, res, next) => {
  // Log error details for debugging (in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('🔴 Error Details:');
    console.error('Route:', req.method, req.path);
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('---');
  }

  let error = { ...err };
  error.message = err.message;

  // Mongoose validation error - missing or invalid field values
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    console.error('Validation errors:', errors);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
      code: 'VALIDATION_ERROR'
    });
  }

  // Mongoose duplicate key error - trying to create duplicate unique field
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(400).json({
      success: false,
      error: `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`,
      code: 'DUPLICATE_ENTRY'
    });
  }

  // Mongoose cast error - invalid ObjectId format
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format provided',
      code: 'INVALID_ID'
    });
  }

  // Custom application errors (thrown by controllers)
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message,
      code: err.code || 'APPLICATION_ERROR'
    });
  }

  // JSON parsing errors (malformed request body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON'
    });
  }

  // Default server error - something unexpected happened
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  
  res.status(statusCode).json({
    success: false,
    error: message,
    code: 'SERVER_ERROR'
  });
};

module.exports = errorHandler;