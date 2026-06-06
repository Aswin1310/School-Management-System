const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide student name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  className: {
    type: String,
    required: [true, 'Please provide class name'],
    trim: true,
    maxlength: [50, 'Class name cannot be more than 50 characters']
  },
  rollNo: {
    type: String,
    required: [true, 'Please provide roll number'],
    unique: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  fatherName: {
    type: String,
    trim: true,
    default: ''
  },
  motherName: {
    type: String,
    trim: true,
    default: ''
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
studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
studentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Student', studentSchema);
