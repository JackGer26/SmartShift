const express = require('express');
const {
  getAllTimeOff,
  getTimeOffById,
  createTimeOff,
  updateTimeOff,
  deleteTimeOff,
  getTimeOffByStaff
} = require('../controllers/timeOffController');

const router = express.Router();

// GET /api/time-off - Get all time off requests
router.get('/', getAllTimeOff);

// GET /api/time-off/staff/:staffId - Get time off for specific staff member
router.get('/staff/:staffId', getTimeOffByStaff);

// GET /api/time-off/:id - Get specific time off request
router.get('/:id', getTimeOffById);

// POST /api/time-off - Create new time off request
router.post('/', createTimeOff);

// PUT /api/time-off/:id - Update time off request
router.put('/:id', updateTimeOff);

// DELETE /api/time-off/:id - Delete time off request
router.delete('/:id', deleteTimeOff);

module.exports = router;