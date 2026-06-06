const mongoose = require('mongoose');

const itemRequestSchema = new mongoose.Schema(
  {
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
    className: {
      type: String,
      required: true
    },
    standard: {
      type: String,
      required: true
    },
    itemType: {
      type: String,
      enum: ['ID Card', 'Belt', 'Tie', 'Uniform', 'Books', 'Other'],
      required: true
    },
    itemDescription: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Issued'],
      default: 'Pending'
    },
    adminRemarks: {
      type: String,
      default: ''
    },
    adminSeen: {
      type: Boolean,
      default: false
    },
    adminSeenAt: {
      type: Date,
      default: null
    },
    issuedDate: {
      type: Date,
      default: null
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ItemRequest', itemRequestSchema);
