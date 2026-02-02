const { body, param, validationResult } = require('express-validator');

/**
 * Middleware to handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

/**
 * Staff validation rules
 */
const validateStaff = [
  body('name').notEmpty().withMessage('Name is required').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone number is required').trim(),
  body('role').isIn(['manager', 'chef', 'waiter', 'bartender', 'cleaner']).withMessage('Invalid role'),
  body('hourlyRate').isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  body('maxHoursPerWeek').optional().isInt({ min: 0, max: 60 }).withMessage('Max hours must be between 0 and 60'),
  body('availableDays').optional().isArray().withMessage('Available days must be an array'),
  body('availableDays.*').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  handleValidationErrors
];

/**
 * Time off validation rules
 */
const validateTimeOff = [
  body('staffId').isMongoId().withMessage('Valid staff ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('reason').optional().isIn(['holiday', 'sick', 'personal', 'other']).withMessage('Invalid reason'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes too long'),
  handleValidationErrors
];

/**
 * Shift template validation rules
 */
const validateShiftTemplate = [
  body('name').notEmpty().withMessage('Shift name is required').trim().isLength({ min: 2, max: 100 }),
  body('dayOfWeek').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).withMessage('Invalid day of week'),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('requiredRole').isIn(['manager', 'chef', 'waiter', 'bartender', 'cleaner']).withMessage('Invalid required role'),
  body('staffCount').isInt({ min: 1, max: 10 }).withMessage('Staff count must be between 1 and 10'),
  body('priority').optional().isInt({ min: 1, max: 5 }).withMessage('Priority must be between 1 and 5'),
  handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  handleValidationErrors
];

/**
 * Date validation for rota week
 */
const validateWeekDate = [
  param('date').isISO8601().withMessage('Date must be in YYYY-MM-DD format'),
  handleValidationErrors
];

module.exports = {
  validateStaff,
  validateTimeOff,
  validateShiftTemplate,
  validateObjectId,
  validateWeekDate,
  handleValidationErrors
};