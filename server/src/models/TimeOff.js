const mongoose = require('mongoose');
const { TIME_OFF_TYPES, TIME_OFF_STATUSES } = require('./constants');

/**
 * Time Off Model - Staff Leave Request Management
 * 
 * Handles holiday requests, sick leave, and other time off for restaurant staff.
 * Integrates with rota generation to prevent scheduling conflicts.
 */
const timeOffSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: [true, 'Staff member is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(date) {
        return date >= new Date().setHours(0, 0, 0, 0); // Cannot be in the past
      },
      message: 'Start date cannot be in the past'
    }
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  reason: {
    type: String,
    enum: {
      values: TIME_OFF_TYPES,
      message: 'Reason must be one of: {VALUES}'
    },
    default: 'holiday'
  },
  status: {
    type: String,
    enum: {
      values: TIME_OFF_STATUSES,
      message: 'Status must be one of: {VALUES}'
    },
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff' // Manager who approved/denied
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Database indexes for performance
timeOffSchema.index({ staffId: 1, startDate: 1 });
timeOffSchema.index({ status: 1 });
timeOffSchema.index({ startDate: 1, endDate: 1 }); // For date range queries
timeOffSchema.index({ staffId: 1, status: 1 }); // For staff-specific approved time off

// Virtual field - duration in days
timeOffSchema.virtual('durationDays').get(function() {
  const timeDiff = this.endDate.getTime() - this.startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
});

// Pre-save validation
timeOffSchema.pre('save', function(next) {
  // Ensure end date is after start date
  if (this.endDate <= this.startDate) {
    const error = new Error('End date must be after start date');
    return next(error);
  }
  
  // Set approval timestamp when status changes to approved/denied
  if (this.isModified('status') && ['approved', 'denied'].includes(this.status)) {
    this.approvedAt = new Date();
  }
  
  next();
});

// Instance method - check if date range overlaps with this request
timeOffSchema.methods.overlapsWithDates = function(startDate, endDate) {
  return (this.startDate <= endDate) && (this.endDate >= startDate);
};

// Static method - find overlapping time off for staff member
timeOffSchema.statics.findOverlapping = function(staffId, startDate, endDate, excludeId = null) {
  const query = {
    staffId: staffId,
    status: { $in: ['approved', 'pending'] }, // Only consider approved or pending requests
    $or: [
      { startDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $lte: endDate, $gte: startDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query);
};

module.exports = mongoose.model('TimeOff', timeOffSchema);