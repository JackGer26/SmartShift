const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { STAFF_ROLES, CONSTRAINTS, TIME_OFF_TYPES } = require('../models/constants');

/**
 * Restaurant API Validation Middleware
 * 
 * Provides comprehensive input validation for restaurant scheduling operations.
 * Includes business logic validation and proper error formatting.
 */

// Helper constants for validation
const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * Custom validation result handler with restaurant-specific error formatting
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      })),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

/**
 * Staff validation rules
 */
const validateStaff = [
  body('name')
    .notEmpty()
    .withMessage('Staff name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),
    
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .trim()
    .matches(/^(\+44|0)[1-9]\d{8,9}$/)
    .withMessage('Please provide a valid UK phone number'),
    
  body('role')
    .isIn(STAFF_ROLES)
    .withMessage(`Role must be one of: ${STAFF_ROLES.join(', ')}`),
    
  body('hourlyRate')
    .isFloat({ min: CONSTRAINTS.MIN_HOURLY_RATE, max: CONSTRAINTS.MAX_HOURLY_RATE })
    .withMessage(`Hourly rate must be between £${CONSTRAINTS.MIN_HOURLY_RATE} and £${CONSTRAINTS.MAX_HOURLY_RATE}`),
    
  body('maxHoursPerWeek')
    .optional()
    .isInt({ min: CONSTRAINTS.MIN_HOURS_PER_WEEK, max: CONSTRAINTS.MAX_HOURS_PER_WEEK })
    .withMessage(`Hours per week must be between ${CONSTRAINTS.MIN_HOURS_PER_WEEK} and ${CONSTRAINTS.MAX_HOURS_PER_WEEK}`),
    
  body('availableDays')
    .optional()
    .isArray()
    .withMessage('Available days must be an array'),
    
  body('availableDays.*')
    .isIn(DAYS_OF_WEEK)
    .withMessage(`Each day must be one of: ${DAYS_OF_WEEK.join(', ')}`),
    
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Emergency contact name must be between 2 and 50 characters'),
    
  body('emergencyContact.phone')
    .optional()
    .matches(/^(\+44|0)[1-9]\d{8,9}$/)
    .withMessage('Emergency contact phone must be a valid UK number'),
    
  handleValidationErrors
];

/**
 * Time off validation rules
 */
const validateTimeOff = [
  body('staffId')
    .isMongoId()
    .withMessage('Please provide a valid staff member ID'),
    
  body('startDate')
    .isISO8601()
    .withMessage('Please provide a valid start date (YYYY-MM-DD)')
    .custom(value => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),
    
  body('endDate')
    .isISO8601()
    .withMessage('Please provide a valid end date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(value);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      
      // Check if duration is reasonable (max 30 days for holiday)
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (req.body.reason === 'holiday' && daysDiff > 30) {
        throw new Error('Holiday requests cannot exceed 30 days');
      }
      
      return true;
    }),
    
  body('reason')
    .optional()
    .isIn(TIME_OFF_TYPES)
    .withMessage(`Reason must be one of: ${TIME_OFF_TYPES.join(', ')}`),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
    
  handleValidationErrors
];

/**
 * Shift template validation rules
 */
const validateShiftTemplate = [
  body('name')
    .notEmpty()
    .withMessage('Shift template name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
    
  body('dayOfWeek')
    .isIn(DAYS_OF_WEEK)
    .withMessage(`Day must be one of: ${DAYS_OF_WEEK.join(', ')}`),
    
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format (24-hour)'),
    
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format (24-hour)')
    .custom((value, { req }) => {
      const startTime = req.body.startTime;
      if (startTime && value) {
        const start = new Date(`2000-01-01 ${startTime}`);
        const end = new Date(`2000-01-01 ${value}`);
        
        // Allow overnight shifts but warn if too long
        let duration = (end - start) / (1000 * 60 * 60);
        if (duration <= 0) duration += 24; // Handle overnight
        
        if (duration > 12) {
          throw new Error('Shift duration cannot exceed 12 hours');
        }
        if (duration < 0.5) {
          throw new Error('Shift must be at least 30 minutes long');
        }
      }
      return true;
    }),
    
  body('roleRequirements')
    .isArray({ min: 1 })
    .withMessage('At least one role requirement must be specified'),
    
  body('roleRequirements.*.role')
    .isIn(STAFF_ROLES)
    .withMessage(`Role must be one of: ${STAFF_ROLES.join(', ')}`),
    
  body('roleRequirements.*.count')
    .isInt({ min: 1, max: CONSTRAINTS.MAX_STAFF_PER_SHIFT })
    .withMessage(`Role count must be between 1 and ${CONSTRAINTS.MAX_STAFF_PER_SHIFT}`),
    
  body('priority')
    .optional()
    .isInt({ min: CONSTRAINTS.SHIFT_PRIORITY_MIN, max: CONSTRAINTS.SHIFT_PRIORITY_MAX })
    .withMessage(`Priority must be between ${CONSTRAINTS.SHIFT_PRIORITY_MIN} and ${CONSTRAINTS.SHIFT_PRIORITY_MAX}`),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
    
  handleValidationErrors
];

/**
 * Shift template validation for updates (all fields optional)
 */
const validateShiftTemplateUpdate = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Shift template name cannot be empty')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
    
  body('dayOfWeek')
    .optional()
    .isIn(DAYS_OF_WEEK)
    .withMessage(`Day must be one of: ${DAYS_OF_WEEK.join(', ')}`),
    
  body('startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format (24-hour)'),
    
  body('endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format (24-hour)'),
    
  body('roleRequirements')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one role requirement must be specified'),
    
  body('roleRequirements.*.role')
    .optional()
    .isIn(STAFF_ROLES)
    .withMessage(`Role must be one of: ${STAFF_ROLES.join(', ')}`),
    
  body('roleRequirements.*.count')
    .optional()
    .isInt({ min: 1, max: CONSTRAINTS.MAX_STAFF_PER_SHIFT })
    .withMessage(`Role count must be between 1 and ${CONSTRAINTS.MAX_STAFF_PER_SHIFT}`),
    
  body('priority')
    .optional()
    .isInt({ min: CONSTRAINTS.SHIFT_PRIORITY_MIN, max: CONSTRAINTS.SHIFT_PRIORITY_MAX })
    .withMessage(`Priority must be between ${CONSTRAINTS.SHIFT_PRIORITY_MIN} and ${CONSTRAINTS.SHIFT_PRIORITY_MAX}`),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
    
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
    
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
  param('date')
    .isISO8601()
    .withMessage('Date must be in YYYY-MM-DD format')
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Date range validation for query parameters
 */
const validateDateRange = [
  query('from')
    .optional()
    .isISO8601()
    .withMessage('From date must be in YYYY-MM-DD format'),
    
  query('to')
    .optional()
    .isISO8601()
    .withMessage('To date must be in YYYY-MM-DD format')
    .custom((value, { req }) => {
      if (req.query.from && value) {
        const from = new Date(req.query.from);
        const to = new Date(value);
        if (to <= from) {
          throw new Error('To date must be after from date');
        }
      }
      return true;
    }),
    
  handleValidationErrors
];

/**
 * Rota validation for weekly schedules
 */
const validateRota = [
  body('weekStartDate')
    .isISO8601()
    .withMessage('Week start date must be in YYYY-MM-DD format')
    .custom((value) => {
      const date = new Date(value);
      // Ensure it's a Monday for rota weeks
      if (date.getDay() !== 1) {
        throw new Error('Week start date must be a Monday');
      }
      return true;
    }),
    
  body('shifts')
    .optional()
    .isArray()
    .withMessage('Shifts must be an array'),
    
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
    
  handleValidationErrors
];

/**
 * Validation for rota generation requests
 */
const validateGenerateRota = [
  body('weekStartDate')
    .isISO8601()
    .withMessage('Week start date must be in YYYY-MM-DD format')
    .custom((value) => {
      const weekStart = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      weekStart.setHours(0, 0, 0, 0);
      
      // Get the Monday of the current week
      const currentWeekMonday = new Date(today);
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday (0) or other days
      currentWeekMonday.setDate(today.getDate() + diff);
      currentWeekMonday.setHours(0, 0, 0, 0);
      
      // Allow current week and future weeks
      if (weekStart < currentWeekMonday) {
        throw new Error('Cannot generate rotas for past weeks');
      }
      
      // Don't allow generating too far in advance (12 weeks)
      const maxAdvanceMs = 12 * 7 * 24 * 60 * 60 * 1000;
      if (weekStart - today > maxAdvanceMs) {
        throw new Error('Cannot generate rotas more than 12 weeks in advance');
      }
      
      if (weekStart.getDay() !== 1) {
        throw new Error('Week start date must be a Monday');
      }
      
      return true;
    }),
    
  body('includeTemplates')
    .optional()
    .isBoolean()
    .withMessage('includeTemplates must be a boolean value'),
    
  body('considerTimeOff')
    .optional()
    .isBoolean()
    .withMessage('considerTimeOff must be a boolean value'),
    
  handleValidationErrors
];

module.exports = {
  validateStaff,
  validateTimeOff,
  validateShiftTemplate,
  validateShiftTemplateUpdate,
  validateObjectId,
  validateWeekDate,
  validateDateRange,
  validateRota,
  validateGenerateRota,
  handleValidationErrors
};