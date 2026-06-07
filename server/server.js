const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://school-management-system-omega-rose.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.options("*", cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes
const studentAuthRoutes = require('./routes/studentAuth');
const teacherAuthRoutes = require('./routes/teacherAuth');
const adminRoutes = require('./routes/admin');
const adminAuthRoutes = require('./routes/adminAuth');
const attendanceRoutes = require('./routes/attendanceAuth');
const marksRoutes = require('./routes/marksAuth');
const calendarRoutes = require('./routes/calendar');
const feesRoutes = require('./routes/feesAuth');
const itemRequestRoutes = require('./routes/itemRequestAuth');

app.use('/api/student/auth', studentAuthRoutes);
app.use('/api/teacher/auth', teacherAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-auth', adminAuthRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/item-requests', itemRequestRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'School Management System API' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
