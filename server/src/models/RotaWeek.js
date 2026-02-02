const mongoose = require('mongoose');
const { SHIFT_STATUSES, ROTA_STATUSES } = require('./constants');

/**
 * Rota Week Model - Weekly Staff Schedule Management
 * 
 * Represents a complete weekly rota for the restaurant.
 * Contains all shift assignments and tracks schedule status.
 */
const shiftAssignmentSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: [true, 'Staff member is required for shift assignment']
  },
  shiftTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftTemplate',
    required: [true, 'Shift template is required']
  },
  date: {
    type: Date,
    required: [true, 'Shift date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required']
  },
  status: {
    type: String,
    enum: {
      values: SHIFT_STATUSES,
      message: 'Status must be one of: {VALUES}'
    },
    default: 'scheduled'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [200, 'Shift notes cannot exceed 200 characters']
  }
});

const rotaWeekSchema = new mongoose.Schema({
  weekStartDate: {
    type: Date,
    required: [true, 'Week start date is required'],
    unique: true, // Only one rota per week
    validate: {
      validator: function(date) {
        return date.getDay() === 1; // Must be Monday
      },
      message: 'Week start date must be a Monday'
    }
  },
  weekEndDate: {
    type: Date,
    required: [true, 'Week end date is required']
  },
  shifts: [shiftAssignmentSchema],
  status: {
    type: String,
    enum: {
      values: ROTA_STATUSES,
      message: 'Status must be one of: {VALUES}'
    },
    default: 'draft'
  },
  totalStaffHours: {
    type: Number,
    default: 0,
    min: [0, 'Total staff hours cannot be negative']
  },
  totalLaborCost: {
    type: Number,
    default: 0,
    min: [0, 'Total labor cost cannot be negative']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Rota notes cannot exceed 1000 characters']
  },
  publishedAt: {
    type: Date
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  }
}, {
  timestamps: true
});

// Database indexes for performance
rotaWeekSchema.index({ weekStartDate: 1 }, { unique: true });
rotaWeekSchema.index({ status: 1 });
rotaWeekSchema.index({ weekStartDate: 1, status: 1 });
rotaWeekSchema.index({ 'shifts.staffId': 1 }); // For staff-specific queries
rotaWeekSchema.index({ 'shifts.date': 1 }); // For daily shift queries

// Virtual field - week identifier (YYYY-WXX format)
rotaWeekSchema.virtual('weekIdentifier').get(function() {
  const startDate = new Date(this.weekStartDate);
  const year = startDate.getFullYear();
  const weekNumber = getWeekNumber(startDate);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
});

// Virtual field - total number of shifts
rotaWeekSchema.virtual('totalShifts').get(function() {
  return this.shifts.length;
});

// Pre-save middleware
rotaWeekSchema.pre('save', function(next) {
  // Automatically set week end date (Sunday) and publication timestamp
  if (this.isNew || this.isModified('weekStartDate')) {
    const weekEnd = new Date(this.weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    this.weekEndDate = weekEnd;
  }
  
  // Set publication timestamp when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Instance method - get shifts for specific date
rotaWeekSchema.methods.getShiftsForDate = function(date) {
  const targetDate = new Date(date).toDateString();
  return this.shifts.filter(shift => 
    new Date(shift.date).toDateString() === targetDate
  );
};

// Instance method - get shifts for specific staff member
rotaWeekSchema.methods.getShiftsForStaff = function(staffId) {
  return this.shifts.filter(shift => 
    shift.staffId.toString() === staffId.toString()
  );
};

// Instance method - calculate total hours for staff member
rotaWeekSchema.methods.getHoursForStaff = function(staffId) {
  const staffShifts = this.getShiftsForStaff(staffId);
  return staffShifts.reduce((total, shift) => {
    const duration = calculateShiftHours(shift.startTime, shift.endTime);
    return total + duration;
  }, 0);
};

// Static method - find rota for specific week
rotaWeekSchema.statics.findByWeek = function(date) {
  const monday = getMonday(new Date(date));
  return this.findOne({ weekStartDate: monday });
};

// Static method - find current week's rota
rotaWeekSchema.statics.findCurrentWeek = function() {
  const monday = getMonday(new Date());
  return this.findOne({ weekStartDate: monday });
};

// Helper function - get week number
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Helper function - get Monday of week
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Helper function - calculate shift duration
function calculateShiftHours(startTime, endTime) {
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  return (end - start) / (1000 * 60 * 60);
}

module.exports = mongoose.model('RotaWeek', rotaWeekSchema);