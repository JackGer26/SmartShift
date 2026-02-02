const mongoose = require('mongoose');

const shiftAssignmentSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  shiftTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftTemplate',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'missed'],
    default: 'scheduled'
  }
});

const rotaWeekSchema = new mongoose.Schema({
  weekStartDate: {
    type: Date,
    required: true,
    unique: true // Only one rota per week
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  shifts: [shiftAssignmentSchema],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  totalStaffHours: {
    type: Number,
    default: 0
  },
  totalLaborCost: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure week start is a Monday
rotaWeekSchema.pre('save', function(next) {
  const weekStart = new Date(this.weekStartDate);
  if (weekStart.getDay() !== 1) { // Monday = 1
    const error = new Error('Week start date must be a Monday');
    return next(error);
  }
  
  // Automatically set week end date (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  this.weekEndDate = weekEnd;
  
  next();
});

module.exports = mongoose.model('RotaWeek', rotaWeekSchema);