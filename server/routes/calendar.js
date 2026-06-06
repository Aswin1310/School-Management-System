const express = require('express');
const AcademicCalendar = require('../models/AcademicCalendar');

const router = express.Router();

// GET - View academic calendar (accessible to all authenticated users)
// No auth required, can be viewed by everyone
router.get('/', async (req, res) => {
  try {
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

// GET - Get calendar entries for a specific month (YYYY-MM format)
router.get('/month/:yearMonth', async (req, res) => {
  try {
    const { yearMonth } = req.params;

    // Validate format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM' });
    }

    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const entries = await AcademicCalendar.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });

    res.status(200).json({
      success: true,
      month: yearMonth,
      count: entries.length,
      entries
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - Check if a specific date is a leave/holiday
router.get('/check/:date', async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const dateObj = new Date(date);
    const entry = await AcademicCalendar.findOne({
      date: {
        $gte: dateObj,
        $lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    res.status(200).json({
      success: true,
      date,
      type: entry?.type || 'working',
      description: entry?.description || '',
      isLeave: entry?.type === 'leave' || entry?.type === 'holiday'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
