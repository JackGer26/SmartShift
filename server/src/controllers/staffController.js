const Staff = require('../models/Staff');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * Staff Controller - Restaurant Employee Management
 * 
 * Handles all staff-related CRUD operations with professional validation,
 * filtering, and comprehensive error responses.
 */

// @desc    Get all staff members with optional filtering
// @route   GET /api/staff?role=chef&isActive=true&availableOn=monday
// @access  Public
const getAllStaff = asyncHandler(async (req, res) => {
  const {
    role,
    isActive,
    availableOn,
    search,
    sortBy = 'name',
    order = 'asc',
    limit = 50,
    offset = 0
  } = req.query;

  // Build filter object
  const filter = {};
  
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (availableOn) filter.availableDays = { $in: [availableOn.toLowerCase()] };
  
  // Search across name and email
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort object
  const sortOrder = order === 'desc' ? -1 : 1;
  const sort = { [sortBy]: sortOrder };

  const staff = await Staff.find(filter)
    .sort(sort)
    .limit(Math.min(parseInt(limit), 100)) // Cap at 100 for performance
    .skip(parseInt(offset))
    .select('-__v'); // Exclude version field

  // Get total count for pagination
  const total = await Staff.countDocuments(filter);

  res.json({
    success: true,
    count: staff.length,
    total,
    data: staff,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + staff.length < total
    }
  });
});

// @desc    Get single staff member
// @route   GET /api/staff/:id
// @access  Public
const getStaffById = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id).select('-__v');
  
  if (!staff) {
    throw new NotFoundError('Staff member');
  }

  res.json({
    success: true,
    data: staff
  });
});

// @desc    Create new staff member
// @route   POST /api/staff
// @access  Public
const createStaff = asyncHandler(async (req, res) => {
  // Check for duplicate email
  const existingStaff = await Staff.findOne({ email: req.body.email });
  if (existingStaff) {
    throw new ValidationError('Email address already in use by another staff member');
  }

  const staff = await Staff.create(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Staff member created successfully',
    data: staff
  });
});

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Public
const updateStaff = asyncHandler(async (req, res) => {
  // Check if staff member exists
  let staff = await Staff.findById(req.params.id);
  if (!staff) {
    throw new NotFoundError('Staff member');
  }

  // Check for duplicate email if email is being changed
  if (req.body.email && req.body.email !== staff.email) {
    const existingStaff = await Staff.findOne({ email: req.body.email });
    if (existingStaff) {
      throw new ValidationError('Email address already in use by another staff member');
    }
  }

  staff = await Staff.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).select('-__v');

  res.json({
    success: true,
    message: 'Staff member updated successfully',
    data: staff
  });
});

// @desc    Delete staff member (soft delete)
// @route   DELETE /api/staff/:id
// @access  Public
const deleteStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  
  if (!staff) {
    throw new NotFoundError('Staff member');
  }

  // Soft delete by setting isActive to false
  staff.isActive = false;
  staff.deactivatedAt = new Date();
  await staff.save();

  res.json({
    success: true,
    message: 'Staff member deactivated successfully',
    data: { id: staff._id, isActive: false }
  });
});

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff
};