const express = require('express');
const {
  getAllShiftTemplates,
  getShiftTemplateById,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
  getShiftTemplatesByDay
} = require('../controllers/shiftTemplateController');

const router = express.Router();

// GET /api/shift-templates - Get all shift templates
router.get('/', getAllShiftTemplates);

// GET /api/shift-templates/day/:dayOfWeek - Get templates for specific day
router.get('/day/:dayOfWeek', getShiftTemplatesByDay);

// GET /api/shift-templates/:id - Get specific shift template
router.get('/:id', getShiftTemplateById);

// POST /api/shift-templates - Create new shift template
router.post('/', createShiftTemplate);

// PUT /api/shift-templates/:id - Update shift template
router.put('/:id', updateShiftTemplate);

// DELETE /api/shift-templates/:id - Delete shift template
router.delete('/:id', deleteShiftTemplate);

module.exports = router;