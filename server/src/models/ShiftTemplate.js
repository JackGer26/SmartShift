const mongoose = require('mongoose');
const { STAFF_ROLES, DAYS_OF_WEEK, SHIFT_TYPES, CONSTRAINTS, PATTERNS } = require('./constants');

console.log('🚀 LOADING ShiftTemplate.js - Version 3.0 - ' + new Date().toISOString());

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
  roleRequirements: [{
    role: {
      type: String,
      required: true,
      enum: {
        values: STAFF_ROLES,
        message: 'Role must be one of: {VALUES}'
      }
    },
    count: {
      type: Number,
      required: true,
      min: [1, 'Role count must be at least 1'],
      max: [CONSTRAINTS.MAX_STAFF_PER_SHIFT, `Role count cannot exceed ${CONSTRAINTS.MAX_STAFF_PER_SHIFT}`]
    }
  }],
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
  shiftType: {
    type: String,
    enum: {
      values: SHIFT_TYPES,
      message: 'Shift type must be one of: {VALUES}'
    },
    default: 'peak',
    required: false
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// Custom validation to ensure at least one role is selected
shiftTemplateSchema.pre('validate', function() {
  console.log('🔍 PRE-VALIDATE HOOK CALLED - Schema version 2.0 (no legacy fields)');
  console.log('📊 Role requirements:', JSON.stringify(this.roleRequirements));
  
  // Handle backward compatibility - convert old formats to new
  if ((!this.roleRequirements || this.roleRequirements.length === 0)) {
    // Check for old format data (these fields not in schema anymore)
    if (this.get('requiredRoles') && this.get('requiredRoles').length > 0) {
      this.roleRequirements = this.get('requiredRoles').map(role => ({ role, count: 1 }));
      console.log('📦 Converted from requiredRoles array');
    } else if (this.get('requiredRole')) {
      this.roleRequirements = [{ role: this.get('requiredRole'), count: this.get('staffCount') || 1 }];
      console.log('📦 Converted from single requiredRole');
    }
  }
  
  // Ensure at least one role requirement is specified
  if (!this.roleRequirements || this.roleRequirements.length === 0) {
    this.invalidate('roleRequirements', 'At least one role requirement must be specified');
  }
  
  // Calculate total staff count and store it as a dynamic property (not validated)
  if (this.roleRequirements && this.roleRequirements.length > 0) {
    const totalStaff = this.roleRequirements.reduce((sum, req) => sum + (req.count || 0), 0);
    if (totalStaff === 0) {
      this.invalidate('roleRequirements', 'Total staff count must be greater than 0');
    } else {
      // Store as non-schema property
      this.set('staffCount', totalStaff, { strict: false });
      console.log('✅ Calculated staffCount:', totalStaff);
    }
  }
});

// Database indexes for performance
shiftTemplateSchema.index({ dayOfWeek: 1, isActive: 1 });
shiftTemplateSchema.index({ priority: -1 }); // Descending for high priority first

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
  const totalStaff = this.get('staffCount') || this.roleRequirements?.reduce((sum, req) => sum + (req.count || 0), 0) || 0;
  return this.durationHours * totalStaff * averageHourlyRate;
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
    'roleRequirements.role': role,
    isActive: true
  }).sort({ dayOfWeek: 1, startTime: 1 });
};

// NUCLEAR OPTION: Clear all cached references
delete mongoose.models.ShiftTemplate;
delete mongoose.connection.models.ShiftTemplate;

// Clear the compiled schema cache by recreating with a clean schema object
const cleanSchema = shiftTemplateSchema.clone();

console.log('📝 Creating COMPLETELY NEW ShiftTemplate model from cloned schema...');
module.exports = mongoose.model('ShiftTemplate', cleanSchema);