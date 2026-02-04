const express = require('express');
const {
  getAllShiftTemplates,
  getShiftTemplateById,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
  getShiftTemplatesByDay
} = require('../controllers/shiftTemplateController');
const {
  validateShiftTemplate,
  validateShiftTemplateUpdate,
  validateObjectId
} = require('../utils/validation');

/**
 * Shift Template Routes - Restaurant Shift Management
 * 
 * Manages reusable shift templates for consistent rota generation.
 * Templates define standard shifts across different roles and days.
 */
const router = express.Router();

// GET /api/shift-templates - Get all shift templates with optional filtering
// Query params: roleRequired, dayOfWeek, isActive
router.get('/', getAllShiftTemplates);

// GET /api/shift-templates/day/:dayOfWeek - Get templates for specific day
router.get('/day/:dayOfWeek', getShiftTemplatesByDay);

// GET /api/shift-templates/:id - Get specific shift template
router.get('/:id', validateObjectId, getShiftTemplateById);

// POST /api/shift-templates - Create new shift template
router.post('/', validateShiftTemplate, createShiftTemplate);

// PUT /api/shift-templates/:id - Update shift template
router.put('/:id', validateObjectId, validateShiftTemplateUpdate, updateShiftTemplate);

// DELETE /api/shift-templates/:id - Delete shift template permanently
router.delete('/:id', validateObjectId, deleteShiftTemplate);

module.exports = router;