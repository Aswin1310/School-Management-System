# Fees Management Feature

## Overview
The Fees Management feature allows admins to manage student fees, teachers to view class fees status, and students to check their own fees payment status. Each fees record tracks whether a fee is pending or paid.

## Backend

### Database Model: Fees
Located at: `server/models/Fees.js`

**Fields:**
- `student` - Reference to Student document (ObjectId)
- `studentName` - Name of the student (String)
- `rollNo` - Roll number of the student (String)
- `className` - Class name (String)
- `amount` - Fees amount in rupees (Number)
- `month` - Month of fees (January-December)
- `year` - Academic year (Number)
- `status` - Payment status: "Pending" or "Paid" (String)
- `paidDate` - Date when fees were marked as paid (Date, nullable)
- `remarks` - Additional remarks (String)
- `recordedBy` - Who created the record (String, default: "Admin")
- `createdAt` - Record creation timestamp
- `updatedAt` - Record last update timestamp

**Unique Constraint:** One fees record per student per month per year

### API Routes
Located at: `server/routes/feesAuth.js`

All routes require authentication. Admin routes require `adminAuth` middleware.

#### GET Routes

1. **Get All Fees Records (Admin Only)**
   ```
   GET /api/fees/all
   Query Parameters:
     - className (optional): Filter by class
     - status (optional): Filter by status (Pending/Paid)
   
   Response: Array of all fees records
   ```

2. **Get Student's Fees**
   ```
   GET /api/fees/student/:studentId
   
   Response: {
     totalPending: number,
     totalPaid: number,
     totalAmount: number (amount pending),
     details: [{month, year, amount, status, paidDate, remarks}]
   }
   ```

3. **Get Fees by Class**
   ```
   GET /api/fees/class/:className
   Query Parameters:
     - status (optional): Filter by status
   
   Response: Array of fees records for the class
   ```

#### POST Routes

1. **Add New Fees Record (Admin Only)**
   ```
   POST /api/fees/add
   Body: {
     studentId: ObjectId (required),
     amount: number (required),
     month: string (required),
     year: number (optional, defaults to current year),
     remarks: string (optional)
   }
   
   Response: Created fees record
   ```

#### PUT Routes

1. **Mark Fees as Paid (Admin Only)**
   ```
   PUT /api/fees/mark-paid/:feesId
   Body: {
     remarks: string (optional)
   }
   
   Response: Updated fees record with status "Paid" and paidDate set
   ```

2. **Mark Fees as Pending (Admin Only)**
   ```
   PUT /api/fees/mark-pending/:feesId
   
   Response: Updated fees record with status "Pending"
   ```

3. **Update Fees Amount (Admin Only)**
   ```
   PUT /api/fees/update/:feesId
   Body: {
     amount: number (required),
     remarks: string (optional)
   }
   
   Response: Updated fees record
   ```

#### DELETE Routes

1. **Delete Fees Record (Admin Only)**
   ```
   DELETE /api/fees/delete/:feesId
   
   Response: Success message
   ```

## Frontend

### Components

#### 1. FeesManagement Component
Located at: `client/src/components/FeesManagement.js`

**Features:**
- Display all fees records with filtering
- Add new fees records for students
- Mark fees as paid/pending
- Delete fees records
- View statistics (pending count, paid count, total amount pending)

**Props:** None (uses local storage for admin token)

#### 2. ClassFeesView Component
Located at: `client/src/components/ClassFeesView.js`

**Features:**
- View all fees for a specific class
- Filter by payment status
- See per-student fees breakdown
- Designed for teachers to monitor class-wide fees

**Props:**
- `userClass` - The class name to display fees for
- `userType` - "teacher" or "admin"

#### 3. StudentFeesView Component
Located at: `client/src/components/StudentFeesView.js`

**Features:**
- Display student's own fees status
- Show pending and paid fees counts
- Display total amount due
- Show detailed fees breakdown by month/year

**Props:** None (uses student ID from localStorage)

### Pages

#### FeesPage
Located at: `client/src/pages/FeesPage.js`

Main page that displays the FeesManagement component. Can be integrated into admin dashboard.

## Integration Steps

### Backend Integration
1. The Fees model and routes are already added
2. The feesAuth route is registered in `server/server.js`
3. No additional setup required

### Frontend Integration

**For Admin Dashboard:**
```javascript
import FeesPage from '../pages/FeesPage';

// In AdminDashboard.js, add route or tab for Fees
<FeesPage />
```

**For Teacher Dashboard:**
```javascript
import ClassFeesView from '../components/ClassFeesView';

// In TeacherDashboard.js, display class fees
<ClassFeesView userClass={teacherClass} userType="teacher" />
```

**For Student Dashboard:**
```javascript
import StudentFeesView from '../components/StudentFeesView';

// In StudentDashboard.js, add component
<StudentFeesView />
```

## Usage Examples

### Admin: Add Fees for Students
1. Navigate to Fees Management
2. Click "Add Fees"
3. Enter Student ID, Amount, Month, and Year
4. Click "Add Fees"

### Admin: Mark Fees as Paid
1. View all fees records
2. Click "Mark Paid" button on any pending fees
3. Fees status changes to "Paid" with current date

### Teacher: View Class Fees
1. View the fees status for their assigned class
2. Filter by pending/paid status
3. See which students have paid and who still owes

### Student: Check Fees Status
1. Login to dashboard
2. View personal fees status
3. See breakdown of paid and pending fees by month

## Status Values
- **Pending**: Fees are not yet paid
- **Paid**: Fees have been paid with date recorded

## Notes
- Compound unique index ensures one fees record per student per month/year
- All dates are stored in UTC
- Amount is stored as a number (in rupees)
- Admin token is required for all write operations
