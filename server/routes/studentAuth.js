const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const auth = require('../middleware/auth');
const { studentSignupSchema, studentLoginSchema } = require('../middleware/validation');

const router = express.Router();

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET_STUDENT, { expiresIn: '7d' });
};

// Student Signup
router.post('/signup', async (req, res) => {
  try {
    // Validate request body using Zod
    const validatedData = studentSignupSchema.parse(req.body);

    // Check if student already exists
    const studentExists = await Student.findOne({ $or: [{ email: validatedData.email }, { rollNo: validatedData.rollNo }] });
    if (studentExists) {
      return res.status(400).json({ message: 'Student already exists with this email or roll number' });
    }

    // Create new student
    const student = await Student.create({
      name: validatedData.name,
      className: validatedData.className,
      rollNo: validatedData.rollNo,
      email: validatedData.email,
      password: validatedData.password
    });

    const token = generateToken(student._id, 'student');

    res.status(201).json({
      success: true,
      token,
      student: {
        id: student._id,
        name: student.name,
        className: student.className,
        rollNo: student.rollNo,
        email: student.email
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

// Student Login
router.post('/login', async (req, res) => {
  try {
    // Validate request body using Zod
    const validatedData = studentLoginSchema.parse(req.body);

    // Check if student exists
    const student = await Student.findOne({ email: validatedData.email }).select('+password');
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await student.matchPassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(student._id, 'student');

    res.status(200).json({
      success: true,
      token,
      student: {
        id: student._id,
        name: student.name,
        className: student.className,
        rollNo: student.rollNo,
        email: student.email
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

module.exports = router;

// GET /api/student/auth/me/details
router.get('/me/details', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const student = await Student.findById(req.user.id).select('-password');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // find mentor/teacher for this class
    const Teacher = require('../models/Teacher');
    const mentor = await Teacher.findOne({
      $or: [
        { mentorFor: student.className },
        { allowedClasses: student.className }
      ]
    }).select('name teacherId email phone');

    res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        className: student.className,
        email: student.email,
        phone: student.phone || '',
        fatherName: student.fatherName || '',
        motherName: student.motherName || ''
      },
      mentor: mentor ? { name: mentor.name, teacherId: mentor.teacherId, email: mentor.email } : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/student/auth/me/details - update student's contact/parent info
router.put('/me/details', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { phone, fatherName, motherName } = req.body;

    const updated = await Student.findByIdAndUpdate(
      req.user.id,
      { phone: phone || '', fatherName: fatherName || '', motherName: motherName || '' },
      { new: true }
    ).select('-password');

    if (!updated) return res.status(404).json({ message: 'Student not found' });

    // find mentor/teacher for this class
    const Teacher = require('../models/Teacher');
    const mentor = await Teacher.findOne({
      $or: [
        { mentorFor: updated.className },
        { allowedClasses: updated.className }
      ]
    }).select('name teacherId email phone');

    res.status(200).json({
      success: true,
      student: {
        id: updated._id,
        name: updated.name,
        rollNo: updated.rollNo,
        className: updated.className,
        email: updated.email,
        phone: updated.phone || '',
        fatherName: updated.fatherName || '',
        motherName: updated.motherName || ''
      },
      mentor: mentor ? { name: mentor.name, teacherId: mentor.teacherId, email: mentor.email, phone: mentor.phone || '' } : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/student/auth/subject-teachers
// Returns the subject-wise teacher assignments for the logged-in student's class
router.get('/subject-teachers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const student = await Student.findById(req.user.id).select('className');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const Teacher = require('../models/Teacher');
    const teachers = await Teacher.find({
      $or: [
        { allowedClasses: student.className },
        { mentorFor: student.className },
        { 'subjectPermissions.className': student.className }
      ]
    }).select('name teacherId email phone allowedClasses subjectPermissions mentorFor');

    const subjectMap = new Map();

    teachers.forEach((teacher) => {
      const permissionEntry = (teacher.subjectPermissions || []).find((entry) => entry.className === student.className);
      const subjects = permissionEntry?.subjects || [];

      subjects.forEach((subjectName) => {
        const normalizedSubject = String(subjectName || '').trim();

        if (!normalizedSubject) {
          return;
        }

        if (!subjectMap.has(normalizedSubject)) {
          subjectMap.set(normalizedSubject, []);
        }

        subjectMap.get(normalizedSubject).push({
          teacherName: teacher.name,
          teacherId: teacher.teacherId,
          email: teacher.email,
          phone: teacher.phone || '',
          isMentor: (teacher.mentorFor || []).includes(student.className)
        });
      });
    });

    const subjectTeachers = Array.from(subjectMap.entries())
      .sort(([firstSubject], [secondSubject]) => firstSubject.localeCompare(secondSubject))
      .map(([subjectName, teacherList]) => ({
        subjectName,
        teachers: teacherList
      }));

    res.status(200).json({
      success: true,
      className: student.className,
      subjectTeachers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

