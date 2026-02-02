/**
 * SmartShift Restaurant Rota Builder - Async Handler Utility
 * 
 * Wrapper function to handle async operations and automatically catch errors.
 * Eliminates the need for repetitive try-catch blocks in controllers.
 * 
 * Usage:
 * const asyncHandler = require('../utils/asyncHandler');
 * 
 * exports.getStaff = asyncHandler(async (req, res, next) => {
 *   const staff = await Staff.find();
 *   // No need for try-catch - errors are automatically passed to error handler
 * });
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;