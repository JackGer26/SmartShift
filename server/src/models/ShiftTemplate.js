const mongoose = require('mongoose');

const shiftTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  startTime: {
    type: String, // Format: "HH:MM" (24-hour)
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String, // Format: "HH:MM" (24-hour)
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  requiredRole: {
    type: String,
    required: true,
    enum: ['manager', 'chef', 'waiter', 'bartender', 'cleaner']
  },
  staffCount: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

// Calculate shift duration in hours
shiftTemplateSchema.virtual('durationHours').get(function() {
  const start = new Date(`2000-01-01 ${this.startTime}`);
  const end = new Date(`2000-01-01 ${this.endTime}`);
  
  // Handle overnight shifts
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  return (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
});

module.exports = mongoose.model('ShiftTemplate', shiftTemplateSchema);