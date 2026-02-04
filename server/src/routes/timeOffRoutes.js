const express = require('express');
const {
  getAllTimeOff,
  getTimeOffById,
  createTimeOff,
  updateTimeOff,
  deleteTimeOff,
  getTimeOffByStaff,
  getTimeOffByDateRange
} = require('../controllers/timeOffController');
const {
  validateTimeOff,
  validateObjectId,
  validateDateRange
} = require('../utils/validation');

/**
 * Time Off Routes - Employee Leave Management
 * 
 * Manages staff time off requests with validation and date range filtering.
 * Prevents conflicts with approved time off periods.
 */
const router = express.Router();

// GET /api/time-off - Get all time off requests with optional filtering
// Query params: staffId, status, from, to
router.get('/', getAllTimeOff);

// GET /api/time-off/range - Get time off within date range
router.get('/range', validateDateRange, getTimeOffByDateRange);

// GET /api/time-off/staff/:staffId - Get time off for specific staff member
router.get('/staff/:staffId', validateObjectId, getTimeOffByStaff);

// GET /api/time-off/:id - Get specific time off request
router.get('/:id', validateObjectId, getTimeOffById);

// POST /api/time-off - Create new time off request
router.post('/', validateTimeOff, createTimeOff);

// PUT /api/time-off/:id - Update time off request
router.put('/:id', validateObjectId, updateTimeOff);

// DELETE /api/time-off/:id - Delete time off request
router.delete('/:id', validateObjectId, deleteTimeOff);

module.exports = router;