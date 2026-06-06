const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Please provide student ID']
  },
  studentName: {
    type: String,
    required: true
  },
  rollNo: {
    type: String,
    required: true
  },
  className: {
    type: String,
    required: [true, 'Please provide class name']
  },
  date: {
    type: Date,
    required: [true, 'Please provide attendance date']
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'leave'],
    required: [true, 'Please provide attendance status']
  },
  recordedBy: {
    type: String,
    required: [true, 'Please provide teacher ID']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
