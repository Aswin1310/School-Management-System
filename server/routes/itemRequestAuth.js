const express = require('express');
const ItemRequest = require('../models/ItemRequest');
const Student = require('../models/Student');
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/auth');

const router = express.Router();

// POST: Student submits item request
router.post('/submit', auth, async (req, res) => {
  try {
    const { itemType, itemDescription, quantity, reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only students can submit item requests
    if (userRole !== 'student') {
      return res.status(403).json({ message: 'Only students can submit item requests' });
    }

    // Find the student record
    const student = await Student.findById(userId);
    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    if (!itemType || !itemDescription || !reason) {
      return res.status(400).json({ message: 'Please provide itemType, description, and reason' });
    }

    // Create new item request
    const newRequest = new ItemRequest({
      student: userId,
      studentName: student.name,
      rollNo: student.rollNo,
      className: student.className,
      standard: student.standard || student.className,
      itemType,
      itemDescription,
      quantity: quantity || 1,
      reason,
      status: 'Pending',
      adminSeen: false,
      adminSeenAt: null
    });

    await newRequest.save();
    res.status(201).json({ message: 'Item request submitted successfully', request: newRequest });
  } catch (error) {
    console.error('Error submitting item request:', error);
    res.status(500).json({ message: 'Error submitting request', error: error.message });
  }
});

// GET: Student views their own requests
router.get('/my-requests', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'student') {
      return res.status(403).json({ message: 'Only students can view their own requests' });
    }

    const requests = await ItemRequest.find({ student: userId }).sort({ requestedAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
});

// GET: Admin views all requests with optional filters
router.get('/all', adminAuth, async (req, res) => {
  try {
    const { status, className, itemType } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (className) filter.className = className;
    if (itemType) filter.itemType = itemType;

    const requests = await ItemRequest.find(filter).sort({ requestedAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching all requests:', error);
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
});

// GET: Admin unread request count
router.get('/unread-count', adminAuth, async (req, res) => {
  try {
    const unreadCount = await ItemRequest.countDocuments({
      status: 'Pending',
      adminSeen: { $ne: true }
    });
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count', error: error.message });
  }
});

// PUT: Mark a request as seen by admin
router.put('/mark-seen/:requestId', adminAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const updatedRequest = await ItemRequest.findByIdAndUpdate(
      requestId,
      {
        adminSeen: true,
        adminSeenAt: new Date()
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json({ message: 'Request marked as seen', request: updatedRequest });
  } catch (error) {
    console.error('Error marking request as seen:', error);
    res.status(500).json({ message: 'Error marking request as seen', error: error.message });
  }
});

// PUT: Mark all requests as seen by admin
router.put('/mark-all-seen', adminAuth, async (req, res) => {
  try {
    await ItemRequest.updateMany(
      { adminSeen: { $ne: true } },
      {
        $set: {
          adminSeen: true,
          adminSeenAt: new Date()
        }
      }
    );

    res.json({ message: 'All requests marked as seen' });
  } catch (error) {
    console.error('Error marking requests as seen:', error);
    res.status(500).json({ message: 'Error marking requests as seen', error: error.message });
  }
});

// PUT: Admin updates request status
router.put('/update-status/:requestId', adminAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, adminRemarks } = req.body;

    if (!status || !['Pending', 'Approved', 'Rejected', 'Issued'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Pending, Approved, Rejected, or Issued' });
    }

    const updateData = { status, adminRemarks: adminRemarks || '', adminSeen: true, adminSeenAt: new Date() };
    if (status === 'Issued') {
      updateData.issuedDate = new Date();
    }

    const updatedRequest = await ItemRequest.findByIdAndUpdate(requestId, updateData, { new: true });
    if (!updatedRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json({ message: 'Request updated successfully', request: updatedRequest });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Error updating request', error: error.message });
  }
});

// DELETE: Admin deletes a request
router.delete('/delete/:requestId', adminAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const deletedRequest = await ItemRequest.findByIdAndDelete(requestId);

    if (!deletedRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ message: 'Error deleting request', error: error.message });
  }
});

module.exports = router;
