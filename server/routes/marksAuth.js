const express = require('express');
const Marks = require('../models/Marks');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const auth = require('../middleware/auth');
const { marksRecordSchema } = require('../middleware/validation');

const router = express.Router();

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const buildRankings = (marks) => {
  const totalsByStudent = new Map();

  marks.forEach((mark) => {
    const key = String(mark.student);

    if (!totalsByStudent.has(key)) {
      totalsByStudent.set(key, {
        studentId: key,
        studentName: mark.studentName,
        rollNo: mark.rollNo,
        totalObtained: 0,
        totalMaximum: 0
      });
    }

    const current = totalsByStudent.get(key);
    current.totalObtained += Number(mark.marksObtained) || 0;
    current.totalMaximum += Number(mark.maxMarks) || 0;
  });

  return Array.from(totalsByStudent.values())
    .map((entry) => ({
      ...entry,
      percentage: entry.totalMaximum > 0 ? ((entry.totalObtained / entry.totalMaximum) * 100).toFixed(2) : '0.00'
    }))
    .sort((firstStudent, secondStudent) => {
      if (firstStudent.totalObtained === secondStudent.totalObtained) {
        return firstStudent.studentName.localeCompare(secondStudent.studentName);
      }

      return secondStudent.totalObtained - firstStudent.totalObtained;
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
};

const buildExamList = (marks) => {
  const seen = new Set();
  const exams = [];

  marks.forEach((mark) => {
    const examName = (mark.examName || 'Exam').trim() || 'Exam';
    const normalizedExam = normalizeText(examName);

    if (!seen.has(normalizedExam)) {
      seen.add(normalizedExam);
      exams.push(examName);
    }
  });

  return exams;
};

// Record marks (Teacher only)
router.post('/record', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can record marks' });
    }

    const validatedData = marksRecordSchema.parse(req.body);
    const student = await Student.findById(validatedData.studentId);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const teacher = await Teacher.findById(req.user.id);
    if (!((teacher.allowedClasses || []).includes(student.className) || (teacher.mentorFor || []).includes(student.className))) {
      return res.status(403).json({ message: 'You can only record marks for students in your assigned or mentored classes' });
    }

    // Enforce subject-level permission: check teacher.subjectPermissions for this class
    const permEntry = (teacher.subjectPermissions || []).find(e => e.className === student.className);
    if (permEntry) {
      const allowedSubjects = (permEntry.subjects || []).map(s => String(s).toLowerCase().trim());
      if (!allowedSubjects.includes(String(validatedData.subjectName).toLowerCase().trim())) {
        return res.status(403).json({ message: 'You are not allowed to record marks for this subject in the student\'s class' });
      }
    } else {
      // If no explicit subjectPermissions for this class exist, deny by default (admin must assign subjects)
      return res.status(403).json({ message: 'No subject permissions assigned for this class. Contact admin.' });
    }

    const marks = await Marks.create({
      student: student._id,
      studentName: student.name,
      rollNo: student.rollNo,
      className: student.className,
      subjectName: validatedData.subjectName,
      marksObtained: validatedData.marksObtained,
      maxMarks: validatedData.maxMarks,
      examName: validatedData.examName || 'Exam',
      recordedBy: teacher.teacherId
    });

    res.status(201).json({
      success: true,
      message: 'Marks recorded successfully',
      marks
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

// Student marks summary with class ranking
router.get('/summary', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can view marks summary' });
    }

    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const requestedExam = typeof req.query.examName === 'string' ? req.query.examName.trim() : '';
    const normalizedRequestedExam = normalizeText(requestedExam);

    const studentMarks = await Marks.find({ student: req.user.id, className: student.className })
      .sort({ subjectName: 1, createdAt: -1 });

    const classMarks = await Marks.find({ className: student.className })
      .sort({ createdAt: -1, subjectName: 1 });

    const availableExams = buildExamList(classMarks);
    const classRanking = buildRankings(classMarks);
    const studentRank = classRanking.find(entry => entry.studentId === String(req.user.id)) || null;

    const examMarks = requestedExam
      ? classMarks.filter(mark => normalizeText(mark.examName || 'Exam') === normalizedRequestedExam)
      : [];

    const examRanking = requestedExam ? buildRankings(examMarks) : [];
    const studentExamRank = requestedExam
      ? examRanking.find(entry => entry.studentId === String(req.user.id)) || null
      : null;

    const filteredStudentMarks = requestedExam
      ? studentMarks.filter(mark => normalizeText(mark.examName || 'Exam') === normalizedRequestedExam)
      : studentMarks;

    res.status(200).json({
      success: true,
      availableExams,
      selectedExam: requestedExam || null,
      student: {
        id: student._id,
        name: student.name,
        className: student.className,
        rollNo: student.rollNo,
        email: student.email
      },
      subjectMarks: filteredStudentMarks.map(mark => ({
        id: mark._id,
        subjectName: mark.subjectName,
        examName: mark.examName,
        marksObtained: mark.marksObtained,
        maxMarks: mark.maxMarks,
        percentage: mark.maxMarks > 0 ? ((mark.marksObtained / mark.maxMarks) * 100).toFixed(2) : '0.00'
      })),
      classRanking,
      studentRank,
      examRanking,
      studentExamRank
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Teacher class marks summary with ranking
router.get('/class/:className', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can view class marks summary' });
    }

    const { className } = req.params;
    const teacher = await Teacher.findById(req.user.id);

    if (!teacher || !teacher.allowedClasses.includes(className)) {
      return res.status(403).json({ message: 'You are not assigned to this class' });
    }

    const classMarks = await Marks.find({ className })
      .sort({ createdAt: -1, subjectName: 1 });

    const rankedStudents = buildRankings(classMarks);

    const subjectMarks = classMarks.map(mark => ({
      id: mark._id,
      studentName: mark.studentName,
      rollNo: mark.rollNo,
      subjectName: mark.subjectName,
      examName: mark.examName,
      marksObtained: mark.marksObtained,
      maxMarks: mark.maxMarks,
      percentage: mark.maxMarks > 0 ? ((mark.marksObtained / mark.maxMarks) * 100).toFixed(2) : '0.00'
    }));

    res.status(200).json({
      success: true,
      className,
      totalStudents: rankedStudents.length,
      totalRecords: classMarks.length,
      classRanking: rankedStudents,
      subjectMarks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
