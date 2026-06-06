const express = require('express');
const Fees = require('../models/Fees');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/auth');

const router = express.Router();

const getFeeStandard = (fee) => fee.standard || fee.className || '';

// Get all fees records (Admin only)
router.get('/all', adminAuth, async (req, res) => {
  try {
    const { className, status } = req.query;
    let query = {};

    if (className) {
      query.$or = [{ className }, { standard: className }];
    }
    if (status) {
      query.status = status;
    }

    const fees = await Fees.find(query)
      .populate('student', 'name rollNo className email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: fees.length,
      data: fees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching fees records',
      error: error.message
    });
  }
});

// Get fees for a specific student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Student access required'
      });
    }

    if (String(req.user.id) !== String(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own fees'
      });
    }

    const student = await Student.findById(studentId).select('name rollNo className');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const fees = await Fees.find({ student: studentId }).sort({ year: -1, month: -1 });

    const summary = {
      student: {
        id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        className: student.className
      },
      totalPending: fees.filter(f => f.status === 'Pending').length,
      totalPaid: fees.filter(f => f.status === 'Paid').length,
      totalAmount: fees.reduce((sum, f) => sum + (f.status === 'Pending' ? f.amount : 0), 0),
      details: fees.map(fee => ({
        id: fee._id,
        month: fee.month,
        year: fee.year,
        amount: fee.amount,
        status: fee.status,
        paidDate: fee.paidDate,
        remarks: fee.remarks,
        standard: getFeeStandard(fee)
      }))
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student fees',
      error: error.message
    });
  }
});

// Get fees by class (for teachers and admins)
router.get('/class/:className', auth, async (req, res) => {
  try {
    const { className } = req.params;
    const { status } = req.query;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Teacher access required'
      });
    }

    const teacher = await Teacher.findById(req.user.id).select('allowedClasses mentorFor');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const canAccessClass = (teacher.allowedClasses || []).includes(className) || (teacher.mentorFor || []).includes(className);

    if (!canAccessClass) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view fees for this class'
      });
    }

    let query = { $or: [{ className }, { standard: className }] };
    if (status) {
      query.status = status;
    }

    const fees = await Fees.find(query)
      .populate('student', 'name rollNo email phone')
      .sort({ rollNo: 1, year: -1, month: -1 });

    res.json({
      success: true,
      count: fees.length,
      data: fees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching class fees',
      error: error.message
    });
  }
});

// Add fees for a student (Admin only)
router.post('/add', adminAuth, async (req, res) => {
  try {
    const { studentId, amount, month, year, remarks } = req.body;

    if (!studentId || !amount || !month) {
      return res.status(400).json({
        success: false,
        message: 'Please provide studentId, amount, and month'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if fees already exist for this month/year
    const existingFees = await Fees.findOne({
      student: studentId,
      month,
      year: year || new Date().getFullYear()
    });

    if (existingFees) {
      return res.status(400).json({
        success: false,
        message: 'Fees already exist for this student for this month'
      });
    }

    const fees = new Fees({
      student: studentId,
      studentName: student.name,
      rollNo: student.rollNo,
      standard: student.className,
      className: student.className,
      amount,
      month,
      year: year || new Date().getFullYear(),
      remarks,
      recordedBy: 'Admin'
    });

    await fees.save();

    res.status(201).json({
      success: true,
      message: 'Fees record created successfully',
      data: fees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding fees',
      error: error.message
    });
  }
});

// Mark fees as paid (Admin only)
router.put('/mark-paid/:feesId', adminAuth, async (req, res) => {
  try {
    const { feesId } = req.params;
    const { remarks } = req.body;

    const fees = await Fees.findById(feesId);

    if (!fees) {
      return res.status(404).json({
        success: false,
        message: 'Fees record not found'
      });
    }

    if (fees.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Fees already marked as paid'
      });
    }

    fees.status = 'Paid';
    fees.paidDate = new Date();
    if (remarks) {
      fees.remarks = remarks;
    }
    fees.updatedAt = new Date();

    await fees.save();

    res.json({
      success: true,
      message: 'Fees marked as paid successfully',
      data: fees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking fees as paid',
      error: error.message
    });
  }
});

// Mark fees as pending (Admin only)
router.put('/mark-pending/:feesId', adminAuth, async (req, res) => {
  try {
    const { feesId } = req.params;

    const fees = await Fees.findById(feesId);

    if (!fees) {
      return res.status(404).json({
        success: false,
        message: 'Fees record not found'
      });
    }

    fees.status = 'Pending';
    fees.paidDate = null;
    fees.updatedAt = new Date();

    await fees.save();

    res.json({
      success: true,
      message: 'Fees marked as pending successfully',
      data: fees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking fees as pending',
      error: error.message
    });
  }
});

// Update fees amount (Admin only)
router.put('/update/:feesId', adminAuth, async (req, res) => {
  try {
    const { feesId } = req.params;
    const { amount, remarks } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide amount'
      });
    }

    const fees = await Fees.findById(feesId);

    if (!fees) {
      return res.status(404).json({
        success: false,
        message: 'Fees record not found'
      });
    }

    fees.amount = amount;
    if (remarks) {
      fees.remarks = remarks;
    }
    fees.updatedAt = new Date();

    await fees.save();

    res.json({
      success: true,
      message: 'Fees updated successfully',
      data: fees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating fees',
      error: error.message
    });
  }
});

// Delete fees record (Admin only)
router.delete('/delete/:feesId', adminAuth, async (req, res) => {
  try {
    const { feesId } = req.params;

    const fees = await Fees.findByIdAndDelete(feesId);

    if (!fees) {
      return res.status(404).json({
        success: false,
        message: 'Fees record not found'
      });
    }

    res.json({
      success: true,
      message: 'Fees record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting fees',
      error: error.message
    });
  }
});

module.exports = router;
