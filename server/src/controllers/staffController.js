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
  
  // Default to only active staff unless explicitly requesting inactive ones
  if (isActive === undefined) {
    filter.isActive = true;
  } else {
    filter.isActive = isActive === 'true';
  }
  
  if (role) filter.role = role;
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
  // Check for duplicate email among active staff only
  const existingStaff = await Staff.findOne({ 
    email: req.body.email, 
    isActive: true 
  });
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
    const existingStaff = await Staff.findOne({ 
      email: req.body.email,
      isActive: true,
      _id: { $ne: req.params.id } 
    });
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

// @desc    Cleanup and standardize all staff roles
// @route   POST /api/staff/cleanup-roles
// @access  Public
const cleanupStaffRoles = asyncHandler(async (req, res) => {
  const { STAFF_ROLES } = require('../models/constants');
  
  // Role mapping for common variations
  const roleMapping = {
    'head chef': 'head_chef',
    'headchef': 'head_chef',
    'sous chef': 'chef',
    'souschef': 'chef',
    'cook': 'chef',
    'kitchen staff': 'kitchen_assistant',
    'server': 'waiter',
    'waitress': 'waiter',
    'waiter/waitress': 'waiter',
    'head waiter': 'head_waiter',
    'headwaiter': 'head_waiter',
    'senior waiter': 'head_waiter',
    'bar staff': 'bartender',
    'barman': 'bartender',
    'barmaid': 'bartender',
    'head bartender': 'head_bartender',
    'headbartender': 'head_bartender',
    'senior bartender': 'head_bartender',
    'host': 'hostess',
    'hostess/host': 'hostess',
    'driver': 'delivery_driver',
    'delivery': 'delivery_driver',
    'cleaning': 'cleaner',
    'cleaning staff': 'cleaner',
    'janitor': 'cleaner',
    'dishwasher': 'kitchen_assistant',
    'prep cook': 'kitchen_assistant',
    'trainee staff': 'trainee',
    'apprentice': 'trainee',
    'intern': 'trainee'
  };

  // Get all active staff
  const allStaff = await Staff.find({ isActive: true });
  
  let updatedCount = 0;
  const updates = [];
  const errors = [];

  for (const staff of allStaff) {
    const currentRole = staff.role.toLowerCase().trim();
    let newRole = staff.role;

    // Check if role needs mapping
    if (roleMapping[currentRole]) {
      newRole = roleMapping[currentRole];
    }
    // Check if role is invalid and needs default assignment
    else if (!STAFF_ROLES.includes(staff.role)) {
      newRole = 'waiter'; // Default role for unknown roles
    }

    // Update if different
    if (newRole !== staff.role) {
      try {
        const oldRole = staff.role;
        staff.role = newRole;
        await staff.save();
        
        updatedCount++;
        updates.push({
          staffId: staff._id,
          name: staff.name,
          oldRole: oldRole,
          newRole: newRole
        });
      } catch (error) {
        errors.push({
          staffId: staff._id,
          name: staff.name,
          error: error.message
        });
      }
    }
  }

  res.json({
    success: true,
    message: `Role cleanup completed. Updated ${updatedCount} staff members.`,
    data: {
      updatedCount,
      totalStaff: allStaff.length,
      updates,
      errors,
      validRoles: STAFF_ROLES
    }
  });
});

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  cleanupStaffRoles
};