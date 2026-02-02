const ShiftTemplate = require('../models/ShiftTemplate');

/**
 * Shift Template Controller
 * Handles all shift template CRUD operations
 */

// @desc    Get all shift templates
// @route   GET /api/shift-templates
// @access  Public
const getAllShiftTemplates = async (req, res, next) => {
  try {
    const shiftTemplates = await ShiftTemplate.find({ isActive: true })
      .sort({ dayOfWeek: 1, startTime: 1 });
    
    res.json({
      success: true,
      count: shiftTemplates.length,
      data: shiftTemplates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get shift templates by day
// @route   GET /api/shift-templates/day/:dayOfWeek
// @access  Public
const getShiftTemplatesByDay = async (req, res, next) => {
  try {
    const { dayOfWeek } = req.params;
    const shiftTemplates = await ShiftTemplate.find({ 
      dayOfWeek: dayOfWeek.toLowerCase(),
      isActive: true
    }).sort({ startTime: 1 });
    
    res.json({
      success: true,
      count: shiftTemplates.length,
      data: shiftTemplates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single shift template
// @route   GET /api/shift-templates/:id
// @access  Public
const getShiftTemplateById = async (req, res, next) => {
  try {
    const shiftTemplate = await ShiftTemplate.findById(req.params.id);
    
    if (!shiftTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Shift template not found'
      });
    }

    res.json({
      success: true,
      data: shiftTemplate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new shift template
// @route   POST /api/shift-templates
// @access  Public
const createShiftTemplate = async (req, res, next) => {
  try {
    const shiftTemplate = await ShiftTemplate.create(req.body);
    
    res.status(201).json({
      success: true,
      data: shiftTemplate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update shift template
// @route   PUT /api/shift-templates/:id
// @access  Public
const updateShiftTemplate = async (req, res, next) => {
  try {
    const shiftTemplate = await ShiftTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!shiftTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Shift template not found'
      });
    }

    res.json({
      success: true,
      data: shiftTemplate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete shift template
// @route   DELETE /api/shift-templates/:id
// @access  Public
const deleteShiftTemplate = async (req, res, next) => {
  try {
    const shiftTemplate = await ShiftTemplate.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!shiftTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Shift template not found'
      });
    }

    res.json({
      success: true,
      message: 'Shift template deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllShiftTemplates,
  getShiftTemplatesByDay,
  getShiftTemplateById,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate
};