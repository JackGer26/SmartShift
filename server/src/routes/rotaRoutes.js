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

const router = express.Router();

// GET /api/rota - Get all rota weeks
router.get('/', getAllRotaWeeks);

// GET /api/rota/week/:date - Get rota for specific week (YYYY-MM-DD format)
router.get('/week/:date', getRotaWeekByDate);

// GET /api/rota/:id - Get specific rota week
router.get('/:id', getRotaWeekById);

// POST /api/rota/generate - Generate new rota week
router.post('/generate', generateRotaWeek);

// PUT /api/rota/:id - Update rota week
router.put('/:id', updateRotaWeek);

// PUT /api/rota/:id/publish - Publish rota week
router.put('/:id/publish', publishRotaWeek);

// DELETE /api/rota/:id - Delete rota week
router.delete('/:id', deleteRotaWeek);

module.exports = router;