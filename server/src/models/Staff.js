const mongoose = require('mongoose');
const { STAFF_ROLES, DAYS_OF_WEEK, CONSTRAINTS, PATTERNS } = require('./constants');

/**
 * Staff Model - Restaurant Employee Management
 * 
 * Manages restaurant staff members with their roles, availability, and employment details.
 * Supports the automated rota generation by tracking who can work when.
 */
const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Staff name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return PATTERNS.EMAIL.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(phone) {
        return PATTERNS.UK_PHONE.test(phone);
      },
      message: 'Please provide a valid UK phone number'
    }
  },
  role: {
    type: String,
    required: [true, 'Staff role is required'],
    enum: {
      values: STAFF_ROLES,
      message: 'Role must be one of: {VALUES}'
    }
  },
  hourlyRate: {
    type: Number,
    required: [true, 'Hourly rate is required'],
    min: [CONSTRAINTS.MIN_HOURLY_RATE, `Hourly rate must be at least £${CONSTRAINTS.MIN_HOURLY_RATE}`],
    max: [CONSTRAINTS.MAX_HOURLY_RATE, `Hourly rate cannot exceed £${CONSTRAINTS.MAX_HOURLY_RATE}`]
  },
  maxHoursPerWeek: {
    type: Number,
    default: CONSTRAINTS.DEFAULT_HOURS_PER_WEEK,
    min: [CONSTRAINTS.MIN_HOURS_PER_WEEK, 'Hours per week cannot be negative'],
    max: [CONSTRAINTS.MAX_HOURS_PER_WEEK, `Maximum hours per week is ${CONSTRAINTS.MAX_HOURS_PER_WEEK}`]
  },
  availableDays: [{
    type: String,
    enum: {
      values: DAYS_OF_WEEK,
      message: 'Available day must be one of: {VALUES}'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  // Additional professional fields
  startDate: {
    type: Date,
    default: Date.now
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  }
}, {
  timestamps: true
});

// Database indexes for performance
staffSchema.index({ email: 1 }, { unique: true });
staffSchema.index({ role: 1 });
staffSchema.index({ isActive: 1 });
staffSchema.index({ role: 1, isActive: 1 }); // Compound index for active staff by role

// Virtual field - full weekly cost
staffSchema.virtual('weeklyCost').get(function() {
  return this.hourlyRate * this.maxHoursPerWeek;
});

// Instance method - check if available on specific day
staffSchema.methods.isAvailableOn = function(dayName) {
  return this.availableDays.includes(dayName.toLowerCase());
};

// Instance method - check if can work additional hours
staffSchema.methods.canWorkHours = function(additionalHours, currentWeeklyHours = 0) {
  return (currentWeeklyHours + additionalHours) <= this.maxHoursPerWeek;
};

// Static method - find available staff for specific role and day
staffSchema.statics.findAvailableForShift = function(role, dayName) {
  return this.find({
    role: role,
    isActive: true,
    availableDays: { $in: [dayName.toLowerCase()] }
  });
};

module.exports = mongoose.model('Staff', staffSchema);