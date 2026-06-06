const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide teacher name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  allowedClasses: {
    type: [String],
    default: []
  },
  subjectPermissions: {
    type: [
      {
        className: { type: String },
        subjects: { type: [String], default: [] }
      }
    ],
    default: []
  },
  teacherId: {
    type: String,
    required: [true, 'Please provide teacher ID'],
    unique: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  mentorFor: {
    type: [String],
    default: []
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
teacherSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Teacher', teacherSchema);
