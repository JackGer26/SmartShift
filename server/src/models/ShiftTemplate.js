const mongoose = require('mongoose');
const { STAFF_ROLES, DAYS_OF_WEEK, CONSTRAINTS, PATTERNS } = require('./constants');

/**
 * Shift Template Model - Reusable Shift Patterns
 * 
 * Defines standard shift patterns for different days and roles.
 * Used by the rota generation system to create weekly schedules.
 */
const shiftTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Shift template name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  dayOfWeek: {
    type: String,
    required: [true, 'Day of week is required'],
    enum: {
      values: DAYS_OF_WEEK,
      message: 'Day must be one of: {VALUES}'
    }
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(time) {
        return PATTERNS.TIME_24H.test(time);
      },
      message: 'Start time must be in HH:MM format (24-hour)'
    }
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: function(time) {
        return PATTERNS.TIME_24H.test(time);
      },
      message: 'End time must be in HH:MM format (24-hour)'
    }
  },
  requiredRole: {
    type: String,
    required: [true, 'Required role is required'],
    enum: {
      values: STAFF_ROLES,
      message: 'Role must be one of: {VALUES}'
    }
  },
  staffCount: {
    type: Number,
    required: [true, 'Staff count is required'],
    min: [CONSTRAINTS.MIN_STAFF_PER_SHIFT, `At least ${CONSTRAINTS.MIN_STAFF_PER_SHIFT} staff member required`],
    max: [CONSTRAINTS.MAX_STAFF_PER_SHIFT, `Cannot exceed ${CONSTRAINTS.MAX_STAFF_PER_SHIFT} staff members`]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: [CONSTRAINTS.SHIFT_PRIORITY_MIN, `Priority must be at least ${CONSTRAINTS.SHIFT_PRIORITY_MIN}`],
    max: [CONSTRAINTS.SHIFT_PRIORITY_MAX, `Priority cannot exceed ${CONSTRAINTS.SHIFT_PRIORITY_MAX}`]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// Database indexes for performance
shiftTemplateSchema.index({ dayOfWeek: 1, isActive: 1 });
shiftTemplateSchema.index({ requiredRole: 1, isActive: 1 });
shiftTemplateSchema.index({ priority: -1 }); // Descending for high priority first
shiftTemplateSchema.index({ dayOfWeek: 1, requiredRole: 1, isActive: 1 }); // Compound for rota generation

// Virtual field - shift duration in hours
shiftTemplateSchema.virtual('durationHours').get(function() {
  const start = new Date(`2000-01-01 ${this.startTime}`);
  const end = new Date(`2000-01-01 ${this.endTime}`);
  
  // Handle overnight shifts
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  return (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
});

// Virtual field - estimated labor cost (will need staff hourly rates)
shiftTemplateSchema.virtual('estimatedCost').get(function() {
  // This would need to be calculated with actual staff rates
  // Placeholder calculation with average rate
  const averageHourlyRate = 15; // £15/hour average
  return this.durationHours * this.staffCount * averageHourlyRate;
});

// Pre-save validation
shiftTemplateSchema.pre('save', function(next) {
  // Validate that end time is after start time (for same-day shifts)
  const start = new Date(`2000-01-01 ${this.startTime}`);
  const end = new Date(`2000-01-01 ${this.endTime}`);
  
  // Allow overnight shifts but warn if duration seems too long
  const duration = this.durationHours;
  if (duration > 12) {
    console.warn(`Warning: Shift '${this.name}' has duration of ${duration} hours`);
  }
  
  next();
});

// Static method - find templates for specific day
shiftTemplateSchema.statics.findForDay = function(dayOfWeek) {
  return this.find({
    dayOfWeek: dayOfWeek.toLowerCase(),
    isActive: true
  }).sort({ priority: -1, startTime: 1 });
};

// Static method - find templates for role
shiftTemplateSchema.statics.findForRole = function(role) {
  return this.find({
    requiredRole: role,
    isActive: true
  }).sort({ dayOfWeek: 1, startTime: 1 });
};

module.exports = mongoose.model('ShiftTemplate', shiftTemplateSchema);