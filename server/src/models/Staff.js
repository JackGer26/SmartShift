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
  
  // Preference fields for soft constraint scoring
  preferredDays: [{
    type: String,
    enum: {
      values: DAYS_OF_WEEK,
      message: 'Preferred day must be one of: {VALUES}'
    }
  }],
  avoidDays: [{
    type: String,
    enum: {
      values: DAYS_OF_WEEK,
      message: 'Avoid day must be one of: {VALUES}'
    }
  }],
  preferredTimeSlots: [{
    startTime: {
      type: String,
      validate: {
        validator: function(time) {
          return PATTERNS.TIME_24H.test(time);
        },
        message: 'Start time must be in HH:MM format'
      }
    },
    endTime: {
      type: String,
      validate: {
        validator: function(time) {
          return PATTERNS.TIME_24H.test(time);
        },
        message: 'End time must be in HH:MM format'
      }
    },
    preference: {
      type: String,
      enum: ['strongly_prefer', 'prefer', 'neutral', 'avoid'],
      default: 'prefer'
    }
  }],
  timePreference: {
    type: String,
    enum: ['early', 'late', 'night', 'flexible'],
    default: 'flexible'
  },
  weekendPreference: {
    type: String,
    enum: ['prefer', 'neutral', 'avoid'],
    default: 'neutral'
  },
  
  // Experience and performance fields
  experienceYears: {
    type: Number,
    min: 0,
    max: 50
  },
  performanceRating: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: function(rating) {
        return Number.isInteger(rating);
      },
      message: 'Performance rating must be an integer from 1 to 5'
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  // Additional professional fields
  startDate: {
    type: Date,
    default: Date.now
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date) {
        // Must be at least 16 years old (UK minimum working age)
        const age = Math.floor((new Date() - date) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 16;
      },
      message: 'Staff member must be at least 16 years old'
    }
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

// Instance method - calculate current age
staffSchema.methods.getAge = function() {
  if (!this.dateOfBirth) return null;
  return Math.floor((new Date() - this.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
};

// Instance method - check if minor (under 18)
staffSchema.methods.isMinor = function() {
  const age = this.getAge();
  return age !== null && age < 18;
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