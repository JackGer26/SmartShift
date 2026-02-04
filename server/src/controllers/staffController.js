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
  console.log('Creating staff with email:', req.body.email);
  
  // Normalize email to lowercase for consistent checking
  const normalizedEmail = req.body.email.toLowerCase();
  
  // Check for duplicate email among active staff only (case-insensitive)
  const existingStaff = await Staff.findOne({ 
    email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
    isActive: true 
  });
  
  // Also check for any staff with this email (for debugging)
  const allStaffWithEmail = await Staff.find({ 
    email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
  });
  console.log('Existing staff with this email:', allStaffWithEmail.map(s => ({ 
    id: s._id, 
    name: s.name, 
    email: s.email, 
    isActive: s.isActive 
  })));
  
  if (existingStaff) {
    console.log('Found existing active staff:', { id: existingStaff._id, name: existingStaff.name, isActive: existingStaff.isActive });
    throw new ValidationError('Email address already in use by another staff member');
  }

  // Store email in lowercase for consistency
  const staffData = {
    ...req.body,
    email: normalizedEmail
  };

  const staff = await Staff.create(staffData);
  
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
  if (req.body.email && req.body.email.toLowerCase() !== staff.email.toLowerCase()) {
    const normalizedEmail = req.body.email.toLowerCase();
    
    const existingStaff = await Staff.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') },
      isActive: true,
      _id: { $ne: req.params.id } 
    });
    if (existingStaff) {
      throw new ValidationError('Email address already in use by another staff member');
    }
  }

  // Normalize email before update
  const updateData = {
    ...req.body
  };
  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase();
  }

  staff = await Staff.findByIdAndUpdate(
    req.params.id,
    updateData,
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

  console.log('Deleting staff:', { id: staff._id, name: staff.name, email: staff.email, currentlyActive: staff.isActive });

  // Soft delete by setting isActive to false
  // Also modify email to allow reuse of the original email
  const timestamp = Date.now();
  const originalEmail = staff.email;
  
  staff.isActive = false;
  staff.deactivatedAt = new Date();
  staff.email = `${staff.email}.deactivated.${timestamp}`; // Make email unique
  await staff.save();

  console.log('Staff deactivated successfully:', { 
    id: staff._id, 
    name: staff.name, 
    originalEmail: originalEmail,
    newEmail: staff.email,
    isActive: staff.isActive 
  });

  res.json({
    success: true,
    message: 'Staff member deactivated successfully',
    data: { id: staff._id, isActive: false }
  });
});

// @desc    Debug: Check email duplicates and clean up
// @route   GET /api/staff/debug-email/:email
// @access  Public
const debugEmail = asyncHandler(async (req, res) => {
  const email = req.params.email.toLowerCase();
  
  // Find all staff with this email (case-insensitive)
  const allStaff = await Staff.find({ 
    email: { $regex: new RegExp(`^${email}$`, 'i') }
  });
  const activeStaff = await Staff.find({ 
    email: { $regex: new RegExp(`^${email}$`, 'i') },
    isActive: true 
  });
  const inactiveStaff = await Staff.find({ 
    email: { $regex: new RegExp(`^${email}$`, 'i') },
    isActive: false 
  });
  
  console.log('=== EMAIL DEBUG ===');
  console.log('Email:', email);
  console.log('Total records:', allStaff.length);
  console.log('Active records:', activeStaff.length);
  console.log('Inactive records:', inactiveStaff.length);
  
  allStaff.forEach((staff, index) => {
    console.log(`Record ${index + 1}:`, {
      id: staff._id,
      name: staff.name,
      email: staff.email,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
      deactivatedAt: staff.deactivatedAt
    });
  });
  
  res.json({
    success: true,
    data: {
      email,
      total: allStaff.length,
      active: activeStaff.length,
      inactive: inactiveStaff.length,
      records: allStaff.map(staff => ({
        id: staff._id,
        name: staff.name,
        isActive: staff.isActive,
        createdAt: staff.createdAt,
        deactivatedAt: staff.deactivatedAt
      }))
    }
  });
});

// @desc    Hard delete all inactive staff with specific email (for development)
// @route   DELETE /api/staff/cleanup-email/:email
// @access  Public
const cleanupEmail = asyncHandler(async (req, res) => {
  const email = req.params.email.toLowerCase();
  
  // Delete all inactive staff with this email (case-insensitive)
  const result = await Staff.deleteMany({ 
    email: { $regex: new RegExp(`^${email}$`, 'i') },
    isActive: false 
  });
  
  console.log(`Cleaned up ${result.deletedCount} inactive records for email: ${email}`);
  
  res.json({
    success: true,
    message: `Deleted ${result.deletedCount} inactive records for ${email}`,
    data: { deletedCount: result.deletedCount }
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
  cleanupStaffRoles,
  debugEmail,
  cleanupEmail
};