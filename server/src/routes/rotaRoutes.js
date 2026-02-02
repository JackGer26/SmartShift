const express = require('express');
const {
  getAllRotaWeeks,
  getRotaWeekById,
  generateRotaWeek,
  updateRotaWeek,
  deleteRotaWeek,
  publishRotaWeek,
  getRotaWeekByDate
} = require('../controllers/rotaController');
const {
  validateRota,
  validateObjectId,
  validateGenerateRota
} = require('../utils/validation');

/**
 * Rota Routes - Weekly Schedule Management
 * 
 * Manages weekly rotas with automatic generation and manual overrides.
 * Coordinates staff scheduling with shift templates and time-off requests.
 */
const router = express.Router();

// GET /api/rota - Get all rota weeks with optional filtering
// Query params: weekStart, from, to, status
router.get('/', getAllRotaWeeks);

// GET /api/rota/week/:date - Get rota for specific week (YYYY-MM-DD format)
router.get('/week/:date', getRotaWeekByDate);

// GET /api/rota/:id - Get specific rota week
router.get('/:id', validateObjectId, getRotaWeekById);

// POST /api/rota/generate - Generate new rota week
router.post('/generate', validateGenerateRota, generateRotaWeek);

// PUT /api/rota/:id - Update rota week
router.put('/:id', validateObjectId, validateRota, updateRotaWeek);

// PUT /api/rota/:id/publish - Publish rota week
router.put('/:id/publish', validateObjectId, publishRotaWeek);

// DELETE /api/rota/:id - Delete rota week
router.delete('/:id', validateObjectId, deleteRotaWeek);

module.exports = router;