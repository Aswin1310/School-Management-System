const express = require('express');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const { adminTeacherClassesSchema } = require('../middleware/validation');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

const buildStudentDetailsPayload = async (studentId) => {
  const student = await Student.findById(studentId).select('-password');

  if (!student) {
    return null;
  }

  const mentor = await Teacher.findOne({
    $or: [
      { mentorFor: student.className },
      { allowedClasses: student.className }
    ]
  }).select('name teacherId email phone');

  const marks = await Marks.find({ student: studentId, className: student.className }).sort({ createdAt: -1 });
  const attendance = await Attendance.find({ student: studentId, className: student.className }).sort({ date: -1 });

  return {
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
    mentor: mentor ? {
      name: mentor.name,
      teacherId: mentor.teacherId,
      email: mentor.email,
      phone: mentor.phone || ''
    } : null,
    marks: marks.map((mark) => ({
      id: mark._id,
      subjectName: mark.subjectName,
      examName: mark.examName,
      marksObtained: mark.marksObtained,
      maxMarks: mark.maxMarks,
      percentage: mark.maxMarks > 0 ? ((mark.marksObtained / mark.maxMarks) * 100).toFixed(2) : '0.00',
      recordedBy: mark.recordedBy,
      createdAt: mark.createdAt
    })),
    attendance: attendance.map((record) => ({
      id: record._id,
      date: record.date,
      status: record.status,
      recordedBy: record.recordedBy
    }))
  };
};

// Assign allowed classes to a teacher
router.put('/teachers/:teacherId/classes', adminAuth, async (req, res) => {
  try {
    const { allowedClasses } = adminTeacherClassesSchema.parse(req.body);
    const { subjectAssignments } = req.body; // optional, array of { className, subjects }
    const { teacherId } = req.params;

    const teacher = await Teacher.findOne({ teacherId });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Merge classes
    const mergedClasses = Array.from(new Set([...(teacher.allowedClasses || []), ...allowedClasses]));
    teacher.allowedClasses = mergedClasses;

    // Merge subject assignments if provided. subjectAssignments expected as array of { className, subjects }
    if (Array.isArray(subjectAssignments)) {
      const map = new Map();
      // start with existing
      (teacher.subjectPermissions || []).forEach(entry => {
        map.set(entry.className, new Set(entry.subjects || []));
      });

      // merge incoming
      subjectAssignments.forEach(assign => {
        if (!assign || !assign.className) return;
        const cls = assign.className;
        const subs = Array.isArray(assign.subjects) ? assign.subjects : [];
        if (!map.has(cls)) map.set(cls, new Set());
        subs.forEach(s => { if (s) map.get(cls).add(String(s).trim()); });
      });

      // write back
      teacher.subjectPermissions = Array.from(map.entries()).map(([className, subjSet]) => ({
        className,
        subjects: Array.from(subjSet)
      }));
    }

    // Merge mentor assignments if provided (mentorFor expected as array of class names)
    if (Array.isArray(req.body.mentorFor)) {
      const existingMentors = new Set(teacher.mentorFor || []);
      req.body.mentorFor.forEach(c => { if (c) existingMentors.add(String(c).trim()); });
      teacher.mentorFor = Array.from(existingMentors);
    }

    await teacher.save();

    res.status(200).json({
      success: true,
      message: 'Teacher classes updated successfully',
      teacher: {
        id: teacher._id,
        name: teacher.name,
        teacherId: teacher.teacherId,
        email: teacher.email,
        allowedClasses: teacher.allowedClasses
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

router.get('/students', adminAuth, async (req, res) => {
  try {
    const students = await Student.find({})
      .select('-password')
      .sort({ className: 1, rollNo: 1 });

    res.status(200).json({
      success: true,
      count: students.length,
      students
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/teachers', adminAuth, async (req, res) => {
  try {
    const teachers = await Teacher.find({})
      .select('-password')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: teachers.length,
      teachers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/students/:studentId/details', adminAuth, async (req, res) => {
  try {
    const payload = await buildStudentDetailsPayload(req.params.studentId);

    if (!payload) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/students/:studentId', adminAuth, async (req, res) => {
  try {
    const { phone, fatherName, motherName } = req.body;
    const { studentId } = req.params;

    const student = await Student.findByIdAndUpdate(
      studentId,
      {
        phone: phone || '',
        fatherName: fatherName || '',
        motherName: motherName || ''
      },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const payload = await buildStudentDetailsPayload(studentId);

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/students/:studentId', adminAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await Promise.all([
      Marks.deleteMany({ student: studentId }),
      Attendance.deleteMany({ student: studentId }),
      Student.findByIdAndDelete(studentId)
    ]);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/teachers/:teacherId', adminAuth, async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    await Teacher.deleteOne({ teacherId });

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove a class from a teacher's allowedClasses and mentorFor (admin only)
router.delete('/teachers/:teacherId/classes/:className', adminAuth, async (req, res) => {
  try {
    const { teacherId, className } = req.params;

    if (!className || String(className).trim() === '') {
      return res.status(400).json({ message: 'Class name is required' });
    }

    const decodedClass = decodeURIComponent(className).trim();

    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Remove from allowedClasses
    teacher.allowedClasses = (teacher.allowedClasses || []).filter(c => String(c).trim() !== decodedClass);

    // Remove from mentorFor
    teacher.mentorFor = (teacher.mentorFor || []).filter(c => String(c).trim() !== decodedClass);

    await teacher.save();

    res.status(200).json({
      success: true,
      message: `Class '${decodedClass}' removed from teacher access successfully`,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        teacherId: teacher.teacherId,
        allowedClasses: teacher.allowedClasses,
        mentorFor: teacher.mentorFor
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Academic Calendar Routes (Admin only)

// POST - Create a new calendar entry
router.post('/calendar', adminAuth, async (req, res) => {
  try {
    const AcademicCalendar = require('../models/AcademicCalendar');
    const { date, type, description } = req.body;

    if (!date || !type) {
      return res.status(400).json({ message: 'Date and type are required' });
    }

    if (!['working', 'leave', 'holiday'].includes(type)) {
      return res.status(400).json({ message: 'Type must be: working, leave, or holiday' });
    }

    const dateObj = new Date(date);
    const dateString = dateObj.toISOString().split('T')[0];

    const existing = await AcademicCalendar.findOne({
      date: {
        $gte: new Date(dateString),
        $lt: new Date(new Date(dateString).getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Calendar entry already exists for this date' });
    }

    const entry = await AcademicCalendar.create({
      date: new Date(dateString),
      type,
      description: description || ''
    });

    res.status(201).json({
      success: true,
      message: 'Calendar entry created successfully',
      entry
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - List all calendar entries (admin view)
router.get('/calendar', adminAuth, async (req, res) => {
  try {
    const AcademicCalendar = require('../models/AcademicCalendar');

    const entries = await AcademicCalendar.find({})
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: entries.length,
      entries
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT - Update a calendar entry
router.put('/calendar/:calendarId', adminAuth, async (req, res) => {
  try {
    const AcademicCalendar = require('../models/AcademicCalendar');
    const { calendarId } = req.params;
    const { date, type, description } = req.body;

    if (!date || !type) {
      return res.status(400).json({ message: 'Date and type are required' });
    }

    if (!['working', 'leave', 'holiday'].includes(type)) {
      return res.status(400).json({ message: 'Type must be: working, leave, or holiday' });
    }

    const updated = await AcademicCalendar.findByIdAndUpdate(
      calendarId,
      { date: new Date(date), type, description: description || '' },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Calendar entry not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Calendar entry updated successfully',
      entry: updated
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE - Delete a calendar entry
router.delete('/calendar/:calendarId', adminAuth, async (req, res) => {
  try {
    const AcademicCalendar = require('../models/AcademicCalendar');
    const { calendarId } = req.params;

    const deleted = await AcademicCalendar.findByIdAndDelete(calendarId);

    if (!deleted) {
      return res.status(404).json({ message: 'Calendar entry not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Calendar entry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
