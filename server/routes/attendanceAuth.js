const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const auth = require('../middleware/auth');

const router = express.Router();

// Record attendance (Teacher only)
router.post('/record', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can record attendance' });
    }

    const { studentId, date, status } = req.body;

    // Validate input
    if (!studentId || !date || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use: present or absent' });
    }

    let dateString;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dateString = date;
    } else {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid attendance date' });
      }
      dateString = parsedDate.toISOString().split('T')[0];
    }

    const now = new Date();
    const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (dateString > todayString) {
      return res.status(400).json({ message: 'Attendance cannot be recorded for future dates' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const teacher = await Teacher.findById(req.user.id);
    if (!((teacher.allowedClasses || []).includes(student.className) || (teacher.mentorFor || []).includes(student.className))) {
      return res.status(403).json({ message: 'You can only record attendance for students in your assigned or mentored classes' });
    }

    // Check if attendance already exists for this student on this date
    const existingAttendance = await Attendance.findOne({
      student: studentId,
      date: {
        $gte: new Date(dateString),
        $lt: new Date(new Date(dateString).getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already recorded for this student on this date' });
    }

    const attendance = await Attendance.create({
      student: studentId,
      studentName: student.name,
      rollNo: student.rollNo,
      className: student.className,
      date: new Date(date),
      status,
      recordedBy: teacher.teacherId
    });

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      attendance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get student attendance percentage (Student only)
router.get('/percentage', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can view their attendance' });
    }

    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const allAttendance = await Attendance.find({
      student: req.user.id,
      className: student.className
    }).sort({ date: -1 });

    if (allAttendance.length === 0) {
      return res.status(200).json({
        success: true,
        attendancePercentage: 0,
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        records: []
      });
    }

    const presentDays = allAttendance.filter(a => a.status === 'present').length;
    const absentDays = allAttendance.filter(a => a.status === 'absent').length;
    const leaveDays = allAttendance.filter(a => a.status === 'leave').length;
    const totalDays = allAttendance.length;

    // Count present + leave as attended days
    const attendedDays = presentDays + leaveDays;
    const attendancePercentage = ((attendedDays / totalDays) * 100).toFixed(2);

    res.status(200).json({
      success: true,
      attendancePercentage,
      totalDays,
      presentDays,
      absentDays,
      leaveDays,
      records: allAttendance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get class attendance (Teacher only)
router.get('/class/:className', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can view class attendance' });
    }

    const { className } = req.params;
    const teacher = await Teacher.findById(req.user.id);

    if (!((teacher.allowedClasses || []).includes(className) || (teacher.mentorFor || []).includes(className))) {
      return res.status(403).json({ message: 'You are not assigned to or mentoring this class' });
    }

    const classAttendance = await Attendance.find({ className })
      .sort({ date: -1, studentName: 1 });

    res.status(200).json({
      success: true,
      className,
      totalRecords: classAttendance.length,
      attendance: classAttendance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get student attendance ranking (Student only)
router.get('/ranking', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can view attendance ranking' });
    }

    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const classStudents = await Student.find({ className: student.className }).select('_id name rollNo');
    const studentIds = classStudents.map(s => s._id);

    const attendanceData = {};
    
    for (const studentId of studentIds) {
      const allAttendance = await Attendance.find({
        student: studentId,
        className: student.className
      });

      if (allAttendance.length > 0) {
        const presentDays = allAttendance.filter(a => a.status === 'present').length;
        const leaveDays = allAttendance.filter(a => a.status === 'leave').length;
        const totalDays = allAttendance.length;
        const attendedDays = presentDays + leaveDays;
        const attendancePercentage = ((attendedDays / totalDays) * 100).toFixed(2);

        const studentInfo = classStudents.find(s => String(s._id) === String(studentId));
        attendanceData[String(studentId)] = {
          studentId: String(studentId),
          studentName: studentInfo?.name || 'Unknown',
          rollNo: studentInfo?.rollNo || 'N/A',
          attendancePercentage: parseFloat(attendancePercentage),
          presentDays,
          leaveDays,
          absentDays: allAttendance.filter(a => a.status === 'absent').length,
          totalDays
        };
      }
    }

    const rankedStudents = Object.values(attendanceData)
      .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    const studentRank = rankedStudents.find(entry => entry.studentId === String(req.user.id)) || null;

    res.status(200).json({
      success: true,
      attendanceRanking: rankedStudents,
      attendanceRank: studentRank
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
