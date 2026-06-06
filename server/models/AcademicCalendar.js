const mongoose = require('mongoose');

const academicCalendarSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Please provide a date'],
    index: true
  },
  type: {
    type: String,
    enum: ['working', 'leave', 'holiday'],
    required: [true, 'Please specify the day type: working, leave, or holiday']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot be more than 200 characters'],
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one entry per date
academicCalendarSchema.index({ date: 1 }, { unique: true });

// Update the updatedAt before saving
academicCalendarSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);
