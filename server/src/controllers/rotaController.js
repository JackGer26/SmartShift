const RotaWeek = require('../models/RotaWeek');
const rotaGenerationService = require('../services/rotaGenerationService');
const { getWeekStart } = require('../utils/dateUtils');

/**
 * Rota Controller
 * Handles rota generation, viewing, and management
 */

// @desc    Get all rota weeks
// @route   GET /api/rota
// @access  Public
const getAllRotaWeeks = async (req, res, next) => {
  try {
    const rotas = await RotaWeek.find()
      .sort({ weekStartDate: -1 })
      .populate('shifts.staffId', 'name email role')
      .populate('shifts.shiftTemplateId', 'name requiredRole');

    res.json({
      success: true,
      count: rotas.length,
      data: rotas
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rota week by ID
// @route   GET /api/rota/:id
// @access  Public
const getRotaWeekById = async (req, res, next) => {
  try {
    const rota = await RotaWeek.findById(req.params.id)
      .populate('shifts.staffId', 'name email role hourlyRate')
      .populate('shifts.shiftTemplateId', 'name requiredRole dayOfWeek');

    if (!rota) {
      return res.status(404).json({
        success: false,
        error: 'Rota not found'
      });
    }

    res.json({
      success: true,
      data: rota
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rota week by date
// @route   GET /api/rota/week/:date
// @access  Public
const getRotaWeekByDate = async (req, res, next) => {
  try {
    const inputDate = new Date(req.params.date);
    const weekStart = getWeekStart(inputDate);

    const rota = await RotaWeek.findOne({ weekStartDate: weekStart })
      .populate('shifts.staffId', 'name email role hourlyRate')
      .populate('shifts.shiftTemplateId', 'name requiredRole dayOfWeek');

    if (!rota) {
      return res.status(404).json({
        success: false,
        error: 'No rota found for this week'
      });
    }

    res.json({
      success: true,
      data: rota
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate new rota week
// @route   POST /api/rota/generate
// @access  Public
const generateRotaWeek = async (req, res, next) => {
  try {
    const { weekStartDate } = req.body;

    if (!weekStartDate) {
      return res.status(400).json({
        success: false,
        error: 'Week start date is required'
      });
    }

    const rota = await rotaGenerationService.generateWeeklyRota(new Date(weekStartDate));

    res.status(201).json({
      success: true,
      data: rota,
      message: 'Rota generated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update rota week
// @route   PUT /api/rota/:id
// @access  Public
const updateRotaWeek = async (req, res, next) => {
  try {
    const rota = await RotaWeek.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('shifts.staffId shifts.shiftTemplateId');

    if (!rota) {
      return res.status(404).json({
        success: false,
        error: 'Rota not found'
      });
    }

    res.json({
      success: true,
      data: rota
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish rota week
// @route   PUT /api/rota/:id/publish
// @access  Public
const publishRotaWeek = async (req, res, next) => {
  try {
    const rota = await RotaWeek.findByIdAndUpdate(
      req.params.id,
      { status: 'published' },
      { new: true }
    ).populate('shifts.staffId shifts.shiftTemplateId');

    if (!rota) {
      return res.status(404).json({
        success: false,
        error: 'Rota not found'
      });
    }

    res.json({
      success: true,
      data: rota,
      message: 'Rota published successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete rota week
// @route   DELETE /api/rota/:id
// @access  Public
const deleteRotaWeek = async (req, res, next) => {
  try {
    const rota = await RotaWeek.findById(req.params.id);

    if (!rota) {
      return res.status(404).json({
        success: false,
        error: 'Rota not found'
      });
    }

    if (rota.status === 'published') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete published rota'
      });
    }

    await rota.remove();

    res.json({
      success: true,
      message: 'Rota deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRotaWeeks,
  getRotaWeekById,
  getRotaWeekByDate,
  generateRotaWeek,
  updateRotaWeek,
  publishRotaWeek,
  deleteRotaWeek
};