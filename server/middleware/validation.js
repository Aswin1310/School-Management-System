const { z } = require('zod');

const studentSignupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  className: z.string()
    .min(1, 'Class name is required')
    .max(50, 'Class name cannot exceed 50 characters')
    .trim(),
  rollNo: z.string()
    .min(1, 'Roll number is required')
    .max(50, 'Roll number cannot exceed 50 characters')
    .trim(),
  email: z.string()
    .email('Invalid email format'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(50, 'Password cannot exceed 50 characters'),
  confirmPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const studentLoginSchema = z.object({
  email: z.string()
    .email('Invalid email format'),
  password: z.string()
    .min(1, 'Password is required'),
});

const teacherSignupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  teacherId: z.string()
    .min(1, 'Teacher ID is required')
    .max(50, 'Teacher ID cannot exceed 50 characters')
    .trim(),
  email: z.string()
    .email('Invalid email format'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(50, 'Password cannot exceed 50 characters'),
  confirmPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const teacherLoginSchema = z.object({
  email: z.string()
    .email('Invalid email format'),
  password: z.string()
    .min(1, 'Password is required'),
});

const adminSignupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z.string()
    .email('Invalid email format'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(50, 'Password cannot exceed 50 characters'),
  confirmPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const adminLoginSchema = z.object({
  email: z.string()
    .email('Invalid email format'),
  password: z.string()
    .min(1, 'Password is required'),
});

const adminTeacherClassesSchema = z.object({
  allowedClasses: z.array(
    z.string()
      .min(1, 'Class name cannot be empty')
      .max(50, 'Class name cannot exceed 50 characters')
      .trim()
  ).min(1, 'At least one class is required')
});

const attendanceSchema = z.object({
  studentId: z.string()
    .min(1, 'Student ID is required'),
  date: z.string()
    .min(1, 'Date is required'),
  status: z.enum(['present', 'absent', 'leave'])
    .refine(val => ['present', 'absent', 'leave'].includes(val), {
      message: 'Status must be present, absent, or leave'
    })
});

const marksRecordSchema = z.object({
  studentId: z.string()
    .min(1, 'Student ID is required'),
  subjectName: z.string()
    .min(1, 'Subject name is required')
    .max(100, 'Subject name cannot exceed 100 characters')
    .trim(),
  marksObtained: z.coerce.number()
    .min(0, 'Marks obtained cannot be negative'),
  maxMarks: z.coerce.number()
    .min(1, 'Maximum marks must be at least 1'),
  examName: z.string()
    .max(100, 'Exam name cannot exceed 100 characters')
    .trim()
    .optional()
});

module.exports = {
  studentSignupSchema,
  studentLoginSchema,
  teacherSignupSchema,
  teacherLoginSchema,
  adminSignupSchema,
  adminLoginSchema,
  adminTeacherClassesSchema,
  attendanceSchema,
  marksRecordSchema,
};
