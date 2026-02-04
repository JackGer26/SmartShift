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

    await TimeOff.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Time off request deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get time off requests within date range
// @route   GET /api/time-off/range?from=2024-01-01&to=2024-01-31
// @access  Public
const getTimeOffByDateRange = async (req, res, next) => {
  try {
    const { from, to, status, staffId } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (from || to) {
      filter.$or = [];
      
      // Find time off that overlaps with the date range
      if (from && to) {
        filter.$or.push({
          $and: [
            { startDate: { $lte: new Date(to) } },
            { endDate: { $gte: new Date(from) } }
          ]
        });
      } else if (from) {
        filter.endDate = { $gte: new Date(from) };
      } else if (to) {
        filter.startDate = { $lte: new Date(to) };
      }
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (staffId) {
      filter.staffId = staffId;
    }

    const timeOff = await TimeOff.find(filter)
      .populate('staffId', 'name email role')
      .sort({ startDate: 1 });

    res.json({
      success: true,
      count: timeOff.length,
      data: timeOff,
      dateRange: { from, to }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTimeOff,
  getTimeOffByStaff,
  getTimeOffById,
  getTimeOffByDateRange,
  createTimeOff,
  updateTimeOff,
  deleteTimeOff
};