const Staff = require('../models/Staff');

/**
 * Staff Controller
 * Handles all staff-related CRUD operations
 */

// @desc    Get all staff members
// @route   GET /api/staff
// @access  Public
const getAllStaff = async (req, res, next) => {
  try {
    const staff = await Staff.find({ isActive: true }).sort({ name: 1 });
    res.json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single staff member
// @route   GET /api/staff/:id
// @access  Public
const getStaffById = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new staff member
// @route   POST /api/staff
// @access  Public
const createStaff = async (req, res, next) => {
  try {
    const staff = await Staff.create(req.body);
    
    res.status(201).json({
      success: true,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Public
const updateStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete staff member
// @route   DELETE /api/staff/:id
// @access  Public
const deleteStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      message: 'Staff member deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff
};