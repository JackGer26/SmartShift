const TimeOff = require('../models/TimeOff');

/**
 * Time Off Controller
 * Handles all time off request CRUD operations
 */

// @desc    Get all time off requests
// @route   GET /api/time-off
// @access  Public
const getAllTimeOff = async (req, res, next) => {
  try {
    const timeOff = await TimeOff.find()
      .populate('staffId', 'name email role')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: timeOff.length,
      data: timeOff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get time off by staff member
// @route   GET /api/time-off/staff/:staffId
// @access  Public
const getTimeOffByStaff = async (req, res, next) => {
  try {
    const timeOff = await TimeOff.find({ staffId: req.params.staffId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: timeOff.length,
      data: timeOff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single time off request
// @route   GET /api/time-off/:id
// @access  Public
const getTimeOffById = async (req, res, next) => {
  try {
    const timeOff = await TimeOff.findById(req.params.id)
      .populate('staffId', 'name email role');
    
    if (!timeOff) {
      return res.status(404).json({
        success: false,
        error: 'Time off request not found'
      });
    }

    res.json({
      success: true,
      data: timeOff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new time off request
// @route   POST /api/time-off
// @access  Public
const createTimeOff = async (req, res, next) => {
  try {
    const timeOff = await TimeOff.create(req.body);
    await timeOff.populate('staffId', 'name email role');
    
    res.status(201).json({
      success: true,
      data: timeOff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update time off request
// @route   PUT /api/time-off/:id
// @access  Public
const updateTimeOff = async (req, res, next) => {
  try {
    const timeOff = await TimeOff.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('staffId', 'name email role');

    if (!timeOff) {
      return res.status(404).json({
        success: false,
        error: 'Time off request not found'
      });
    }

    res.json({
      success: true,
      data: timeOff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete time off request
// @route   DELETE /api/time-off/:id
// @access  Public
const deleteTimeOff = async (req, res, next) => {
  try {
    const timeOff = await TimeOff.findById(req.params.id);

    if (!timeOff) {
      return res.status(404).json({
        success: false,
        error: 'Time off request not found'
      });
    }

    await timeOff.remove();

    res.json({
      success: true,
      message: 'Time off request deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTimeOff,
  getTimeOffByStaff,
  getTimeOffById,
  createTimeOff,
  updateTimeOff,
  deleteTimeOff
};