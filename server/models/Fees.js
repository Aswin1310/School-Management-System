const mongoose = require('mongoose');

const feesSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  rollNo: {
    type: String,
    required: true
  },
  standard: {
    type: String,
    required: true
  },
  className: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Please provide fees amount'],
    min: [0, 'Amount cannot be negative']
  },
  month: {
    type: String,
    required: [true, 'Please provide month'],
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  },
  year: {
    type: Number,
    required: [true, 'Please provide year'],
    default: () => new Date().getFullYear()
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  },
  paidDate: {
    type: Date,
    default: null
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  recordedBy: {
    type: String,
    default: 'Admin'
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

// Compound index to ensure one fees record per student per month per year
feesSchema.index({ student: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Fees', feesSchema);
