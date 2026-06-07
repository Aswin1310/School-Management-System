const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

mongoose.set('bufferCommands', false);

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

const allowedOriginPatterns = [
  /^https:\/\/.*\.vercel\.app$/,
];

const corsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      allowedOriginPatterns.some((pattern) => pattern.test(origin))
    ) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin || allowedOrigins.includes(origin) || allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  }

  return res.status(403).json({ message: 'Not allowed by CORS' });
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

startServer();
