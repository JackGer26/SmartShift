const mongoose = require('mongoose');

const timeOffSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    enum: ['holiday', 'sick', 'personal', 'other'],
    default: 'holiday'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure end date is after start date
timeOffSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    const error = new Error('End date must be after start date');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('TimeOff', timeOffSchema);