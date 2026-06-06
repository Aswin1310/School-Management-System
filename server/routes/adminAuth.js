const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { adminSignupSchema, adminLoginSchema } = require('../middleware/validation');

const router = express.Router();

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET_ADMIN, { expiresIn: '7d' });
};

router.post('/signup', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ message: 'Admin access denied' });
    }

    const validatedData = adminSignupSchema.parse(req.body);

    const adminExists = await Admin.findOne({ email: validatedData.email });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists with this email' });
    }

    const admin = await Admin.create({
      name: validatedData.name,
      email: validatedData.email,
      password: validatedData.password
    });

    const token = generateToken(admin._id, 'admin');

    res.status(201).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
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

router.post('/login', async (req, res) => {
  try {
    const validatedData = adminLoginSchema.parse(req.body);

    const admin = await Admin.findOne({ email: validatedData.email }).select('+password');
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await admin.matchPassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(admin._id, 'admin');

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
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
