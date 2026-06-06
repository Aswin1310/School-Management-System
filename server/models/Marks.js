const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
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
  subjectName: {
    type: String,
    required: [true, 'Please provide subject name'],
    trim: true
  },
  marksObtained: {
    type: Number,
    required: [true, 'Please provide obtained marks'],
    min: 0
  },
  maxMarks: {
    type: Number,
    required: [true, 'Please provide maximum marks'],
    min: 1
  },
  examName: {
    type: String,
    trim: true,
    default: 'Exam'
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

module.exports = mongoose.model('Marks', marksSchema);
