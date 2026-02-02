const express = require('express');
const {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  cleanupStaffRoles
} = require('../controllers/staffController');
const { validateStaff, validateObjectId } = require('../utils/validation');

/**
 * Staff Routes - Restaurant Employee Management
 * 
 * Comprehensive CRUD operations for restaurant staff with validation.
 * Supports filtering by role, active status, and availability.
 */
const router = express.Router();

// GET /api/staff - Get all staff members with optional filtering
// Query params: role, isActive, availableOn (day)
router.get('/', getAllStaff);

// GET /api/staff/:id - Get specific staff member
router.get('/:id', validateObjectId, getStaffById);

// POST /api/staff - Create new staff member
router.post('/', validateStaff, createStaff);

// PUT /api/staff/:id - Update staff member
router.put('/:id', validateObjectId, validateStaff, updateStaff);

// DELETE /api/staff/:id - Soft delete staff member (set isActive = false)
router.delete('/:id', validateObjectId, deleteStaff);

// POST /api/staff/cleanup-roles - Cleanup and standardize staff roles
router.post('/cleanup-roles', cleanupStaffRoles);

module.exports = router;