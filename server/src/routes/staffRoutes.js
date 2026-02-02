const express = require('express');
const {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff
} = require('../controllers/staffController');

const router = express.Router();

// GET /api/staff - Get all staff members
router.get('/', getAllStaff);

// GET /api/staff/:id - Get specific staff member
router.get('/:id', getStaffById);

// POST /api/staff - Create new staff member
router.post('/', createStaff);

// PUT /api/staff/:id - Update staff member
router.put('/:id', updateStaff);

// DELETE /api/staff/:id - Delete staff member
router.delete('/:id', deleteStaff);

module.exports = router;