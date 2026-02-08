const express = require('express');
const {
  getAllRotaWeeks,
  getRotaWeekById,
  generateRotaWeek,
  updateRotaWeek,
  deleteRotaWeek,
  publishRotaWeek,
  getRotaWeekByDate,
  exportRotaAsCSV,
  getRotaStats,
  getStaffHours,
  validateStaffAssignment,
  getAssignmentScoring,
  validateEntireRota,
  cloneRota
} = require('../controllers/rotaController');
const {
  validateRota,
  validateObjectId,
  validateGenerateRota,
  validateWeekDate
} = require('../utils/validation');

/**
 * Comprehensive Rota Routes - Weekly Schedule Management
 * 
 * Provides complete rota management including generation, editing,
 * publishing, analytics, and export functionality.
 */
const router = express.Router();

// GET /api/rota - Get all rota weeks with filtering and pagination
// Query params: status, from, to, limit, offset, sortBy, order
router.get('/', getAllRotaWeeks);

// POST /api/rota/generate - Generate new rota week with advanced algorithm
router.post('/generate', validateGenerateRota, generateRotaWeek);

// GET /api/rota/week/:date - Get rota for specific week (YYYY-MM-DD format)
router.get('/week/:date', validateWeekDate, getRotaWeekByDate);

// GET /api/rota/:id - Get specific rota week
router.get('/:id', validateObjectId, getRotaWeekById);

// GET /api/rota/:id/stats - Get comprehensive rota statistics
router.get('/:id/stats', validateObjectId, getRotaStats);

// GET /api/rota/:id/staff-hours - Get staff hours summary for rota
router.get('/:id/staff-hours', validateObjectId, getStaffHours);

// GET /api/rota/:id/export/csv - Export rota as CSV
// Query params: format (detailed|summary)
router.get('/:id/export/csv', validateObjectId, exportRotaAsCSV);

// POST /api/rota/validate-assignment - Validate staff assignment against hard constraints
router.post('/validate-assignment', validateStaffAssignment);

// POST /api/rota/score-assignment - Get soft constraint scoring for staff assignment
router.post('/score-assignment', getAssignmentScoring);

// POST /api/rota/:id/validate - Validate entire rota against hard constraints
router.post('/:id/validate', validateObjectId, validateEntireRota);

// PUT /api/rota/:id - Save manual edits to rota
router.put('/:id', validateObjectId, validateRota, updateRotaWeek);

// POST /api/rota/:id/publish - Publish rota (make visible to staff)
router.post('/:id/publish', validateObjectId, publishRotaWeek);

// POST /api/rota/:id/clone - Clone rota to another week
router.post('/:id/clone', validateObjectId, cloneRota);

// DELETE /api/rota/:id - Delete rota week
router.delete('/:id', validateObjectId, deleteRotaWeek);

module.exports = router;