# School Management System

A MERN stack application for managing school activities with separate login systems for students and teachers.

## Features

- **Separate Login Systems**: Independent authentication for students, teachers, and admins
- **Student Login**: Name, Roll Number, Class, Email, Password
- **Teacher Login**: Name, Teacher ID, Email, Password
- **Hidden Admin Portal**: Admin sign in and sign up pages are not linked from the public home page
- **Role-Based Access**: Protected routes based on user roles
- **JWT Authentication**: Secure token-based authentication
- **MongoDB Database**: All data stored in MongoDB

## Project Structure

```
school management/
├── server/                 # Backend (Node.js + Express)
│   ├── models/            # MongoDB models
│   │   ├── Admin.js
│   │   ├── Student.js
│   │   └── Teacher.js
│   ├── routes/            # API routes
│   │   ├── admin.js
│   │   ├── adminAuth.js
│   │   ├── studentAuth.js
│   │   └── teacherAuth.js
│   ├── middleware/        # Authentication middleware
│   │   ├── adminAuth.js
│   │   └── auth.js
│   ├── server.js          # Main server file
│   └── package.json
│
└── client/                # Frontend (React)
    ├── src/
    │   ├── pages/        # React pages
    │   │   ├── AdminDashboard.js
    │   │   ├── AdminLogin.js
    │   │   ├── AdminSignup.js
    │   │   ├── Home.js
    │   │   ├── StudentDashboard.js
    │   │   ├── StudentLogin.js
    │   │   ├── TeacherDashboard.js
    │   │   └── TeacherLogin.js
    │   ├── context/      # Context API
    │   │   └── AuthContext.js
    │   ├── App.js
    │   ├── index.js
    │   └── package.json
    └── public/
        └── index.html
```

## Setup Instructions

### Prerequisites
- Node.js installed
- MongoDB running locally or connection string ready
- npm or yarn package manager

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in server directory:
```env
MONGODB_URI=mongodb://localhost:27017/school-management
PORT=5000
JWT_SECRET_STUDENT=your_jwt_secret_key_for_students_here
JWT_SECRET_TEACHER=your_jwt_secret_key_for_teachers_here
JWT_SECRET_ADMIN=your_jwt_secret_key_for_admin_here
ADMIN_API_KEY=your_admin_api_key_here
NODE_ENV=development
```

4. Start the server:
```bash
npm run dev
```
Server will run on http://localhost:5000

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the React app:
```bash
npm start
```
App will open at http://localhost:3000

## API Endpoints

### Student Authentication
- **POST** `/api/student/auth/register` - Register new student
- **POST** `/api/student/auth/login` - Login student

### Teacher Authentication
- **POST** `/api/teacher/auth/signup` - Sign up new teacher
- **POST** `/api/teacher/auth/login` - Login teacher

### Admin Authentication
- **POST** `/api/admin-auth/signup` - Create admin account
- **POST** `/api/admin-auth/login` - Login admin
- **PUT** `/api/admin/teachers/:teacherId/classes` - Assign classes to a teacher

## Request/Response Examples

### Student Registration
```json
POST /api/student/auth/register
{
  "name": "John Doe",
  "rollNo": "001",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

### Student Login
```json
POST /api/student/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Teacher Registration
```json
POST /api/teacher/auth/register
{
  "name": "Jane Smith",
  "teacherId": "T001",
  "email": "jane@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

### Teacher Login
```json
POST /api/teacher/auth/login
{
  "email": "jane@example.com",
  "password": "password123"
}
```

## Usage

1. Open the application at http://localhost:3000
2. Click on "Student Login" or "Teacher Login"
3. For new users: use the signup toggle on the login screen
4. Admin pages are hidden routes and are not linked from the home page
5. After successful login, you'll be redirected to your dashboard

## Technologies Used

- **Frontend**: React 18, React Router v6, Axios, CSS3
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens), bcryptjs for password hashing
- **Others**: CORS, dotenv

## Security Features

- Passwords are hashed using bcryptjs before storing
- JWT tokens expire after 7 days
- Protected routes require valid authentication
- Role-based access control (RBAC)
- Email and unique ID validation

## Future Enhancements

- Email verification
- Password reset functionality
- User profile management
- Class management
- Assignment submission
- Grades management
- Attendance tracking
- Notifications
- Admin panel

## License

ISC
