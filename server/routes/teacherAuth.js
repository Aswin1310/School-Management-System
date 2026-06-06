const express = require('express');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const { teacherSignupSchema, teacherLoginSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET_TEACHER, { expiresIn: '7d' });
};

// Teacher Signup
router.post('/signup', async (req, res) => {
  try {
    // Validate request body using Zod
    const validatedData = teacherSignupSchema.parse(req.body);

    // Check if teacher already exists
    const teacherExists = await Teacher.findOne({ $or: [{ email: validatedData.email }, { teacherId: validatedData.teacherId }] });
    if (teacherExists) {
      return res.status(400).json({ message: 'Teacher already exists with this email or teacher ID' });
    }

    // Create new teacher
    const teacher = await Teacher.create({
      name: validatedData.name,
      teacherId: validatedData.teacherId,
      email: validatedData.email,
      password: validatedData.password
    });

    const token = generateToken(teacher._id, 'teacher');

    res.status(201).json({
      success: true,
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        allowedClasses: teacher.allowedClasses,
        subjectPermissions: teacher.subjectPermissions,
        mentorFor: teacher.mentorFor,
        teacherId: teacher.teacherId,
        email: teacher.email
      }
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({ message: 'Validation error', errors: errorMessages });
    }
    res.status(500).json({ message: error.message });
  }
});

// Teacher Login
router.post('/login', async (req, res) => {
  try {
    // Validate request body using Zod
    const validatedData = teacherLoginSchema.parse(req.body);

    // Check if teacher exists
    const teacher = await Teacher.findOne({ email: validatedData.email }).select('+password');
    if (!teacher) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await teacher.matchPassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(teacher._id, 'teacher');

    res.status(200).json({
      success: true,
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        allowedClasses: teacher.allowedClasses,
        subjectPermissions: teacher.subjectPermissions,
        mentorFor: teacher.mentorFor,
        teacherId: teacher.teacherId,
        email: teacher.email
      }
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({ message: 'Validation error', errors: errorMessages });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get students handled by one of the logged-in teacher's assigned classes
router.get('/students', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const requestedClass = req.query.className || teacher.allowedClasses[0];

    if (!requestedClass) {
      return res.status(403).json({ message: 'No classes assigned yet. Please contact the admin.' });
    }

    if (!teacher.allowedClasses.includes(requestedClass)) {
      return res.status(403).json({ message: 'You are not allowed to access this class' });
    }

    const students = await Student.find({ className: requestedClass })
      .select('-password')
      .sort({ rollNo: 1 });

    res.status(200).json({
      success: true,
      className: requestedClass,
      allowedClasses: teacher.allowedClasses,
      count: students.length,
      students
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current teacher profile from database
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.status(200).json({
      success: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        teacherId: teacher.teacherId,
        email: teacher.email,
        allowedClasses: teacher.allowedClasses,
        subjectPermissions: teacher.subjectPermissions,
        mentorFor: teacher.mentorFor,
        phone: teacher.phone || ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/teacher/auth/me/phone - update teacher phone number
router.put('/me/phone', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const phoneValue = String(req.body?.phone || '').trim();

    if (phoneValue && !/^[0-9+()\-\s]{7,20}$/.test(phoneValue)) {
      return res.status(400).json({ message: 'Please provide a valid phone number' });
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.user.id,
      { phone: phoneValue },
      { new: true }
    );

    if (!updatedTeacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.status(200).json({
      success: true,
      teacher: {
        id: updatedTeacher._id,
        name: updatedTeacher.name,
        teacherId: updatedTeacher.teacherId,
        email: updatedTeacher.email,
        allowedClasses: updatedTeacher.allowedClasses,
        subjectPermissions: updatedTeacher.subjectPermissions,
        mentorFor: updatedTeacher.mentorFor,
        phone: updatedTeacher.phone || ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

// GET /api/teacher/student/:studentId/details
// Returns full student info + marks + attendance for the student's class
router.get('/student/:studentId/details', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const { studentId } = req.params;
    const student = await Student.findById(studentId).select('-password');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const isAssignedToClass = (teacher.allowedClasses || []).includes(student.className);
    const isMentorForClass = (teacher.mentorFor || []).includes(student.className);
    const permissionEntry = (teacher.subjectPermissions || []).find((entry) => entry.className === student.className);
    const allowedSubjects = permissionEntry ? (permissionEntry.subjects || []).map((subject) => String(subject).trim()).filter(Boolean) : [];

    // Authorization: teacher must be assigned to the student's class to view any data
    if (!isAssignedToClass && !isMentorForClass) {
      return res.status(403).json({ message: 'You are not allowed to view this student' });
    }

    const marks = await Marks.find({ student: studentId, className: student.className }).sort({ createdAt: -1 });
    const attendance = await Attendance.find({ student: studentId, className: student.className }).sort({ date: -1 });
    const filteredMarks = isMentorForClass
      ? marks
      : marks.filter((mark) => allowedSubjects.includes(String(mark.subjectName || '').trim()));

    res.status(200).json({
      success: true,
      fullDetails: isMentorForClass,
      student: {
        id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        className: student.className,
        email: student.email,
        phone: isMentorForClass ? (student.phone || '') : '',
        fatherName: isMentorForClass ? (student.fatherName || '') : '',
        motherName: isMentorForClass ? (student.motherName || '') : ''
      },
      marks: filteredMarks.map(m => ({
        id: m._id,
        subjectName: m.subjectName,
        examName: m.examName,
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        percentage: m.maxMarks > 0 ? ((m.marksObtained / m.maxMarks) * 100).toFixed(2) : '0.00',
        recordedBy: m.recordedBy,
        createdAt: m.createdAt
      })),
      attendance: isMentorForClass
        ? attendance.map(a => ({
            id: a._id,
            date: a.date,
            status: a.status,
            recordedBy: a.recordedBy
          }))
        : []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
