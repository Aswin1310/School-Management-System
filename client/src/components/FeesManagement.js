import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './FeesManagement.css';

const FeesManagement = ({ token: authToken, students: initialStudents = [] }) => {
  const [fees, setFees] = useState([]);
  const [filteredFees, setFilteredFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStandard, setFilterStandard] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedAddStandard, setSelectedAddStandard] = useState('');
  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    standard: '',
    amount: '',
    month: '',
    year: new Date().getFullYear(),
    remarks: ''
  });
  const [standards, setStandards] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { token: contextToken } = useAuth();
  const token = authToken || contextToken;

  useEffect(() => {
    fetchFees();
  }, []);

  useEffect(() => {
    const uniqueStandards = Array.from(new Set(initialStudents.map((student) => student.className).filter(Boolean))).sort();
    setStandards(uniqueStandards);
  }, [initialStudents]);

  useEffect(() => {
    if (!selectedAddStandard) {
      setStudentOptions([]);
      return;
    }

    const nextStudents = initialStudents
      .filter((student) => student.className === selectedAddStandard)
      .sort((first, second) => String(first.rollNo || '').localeCompare(String(second.rollNo || '')));

    setStudentOptions(nextStudents);
  }, [initialStudents, selectedAddStandard]);

  useEffect(() => {
    let filtered = fees;
    if (filterStandard) {
      filtered = filtered.filter(f => (f.standard || f.className) === filterStandard);
    }
    if (filterStatus) {
      filtered = filtered.filter(f => f.status === filterStatus);
    }
    setFilteredFees(filtered);
  }, [fees, filterStandard, filterStatus]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/fees/all', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFees(data.data || []);
        
        // Extract unique standards
        const uniqueStandards = [...new Set((data.data || []).map(f => f.standard || f.className))];
        setStandards(uniqueStandards);
      } else {
        setErrorMessage('Failed to fetch fees');
      }
    } catch (error) {
      setErrorMessage('Error fetching fees: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFees = async (e) => {
    e.preventDefault();

    if (!formData.studentId || !formData.amount || !formData.month || !formData.standard) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/fees/add', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: formData.studentId,
          standard: formData.standard,
          amount: parseFloat(formData.amount),
          month: formData.month,
          year: parseInt(formData.year),
          remarks: formData.remarks
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Fees added successfully!');
        setFormData({
          studentId: '',
          studentName: '',
          standard: '',
          amount: '',
          month: '',
          year: new Date().getFullYear(),
          remarks: ''
        });
        setSelectedAddStandard('');
        setStudentOptions([]);
        setShowAddForm(false);
        fetchFees();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to add fees');
      }
    } catch (error) {
      setErrorMessage('Error adding fees: ' + error.message);
    }
  };

  const handleMarkPaid = async (feesId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/fees/mark-paid/${feesId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Fees marked as paid!');
        fetchFees();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to mark as paid');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleMarkPending = async (feesId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/fees/mark-pending/${feesId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Fees marked as pending!');
        fetchFees();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to mark as pending');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleDeleteFees = async (feesId) => {
    if (window.confirm('Are you sure you want to delete this fees record?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/fees/delete/${feesId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok) {
          setSuccessMessage('Fees deleted successfully!');
          fetchFees();
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          setErrorMessage(data.message || 'Failed to delete');
        }
      } catch (error) {
        setErrorMessage('Error: ' + error.message);
      }
    }
  };

  const totalPending = filteredFees.filter(f => f.status === 'Pending').length;
  const totalPaid = filteredFees.filter(f => f.status === 'Paid').length;
  const totalAmount = filteredFees
    .filter(f => f.status === 'Pending')
    .reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="fees-management">
      <h2>Fees Management</h2>

      {successMessage && <div className="message success">{successMessage}</div>}
      {errorMessage && <div className="message error">{errorMessage}</div>}

      <div className="fees-stats">
        <div className="stat-card">
          <h4>Total Pending</h4>
          <p>{totalPending}</p>
        </div>
        <div className="stat-card">
          <h4>Total Paid</h4>
          <p>{totalPaid}</p>
        </div>
        <div className="stat-card">
          <h4>Total Amount Pending</h4>
          <p>₹{totalAmount.toFixed(2)}</p>
        </div>
      </div>

      <div className="fees-controls">
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
          {showAddForm ? 'Cancel' : 'Add Fees'}
        </button>

        <div className="filters">
          <select
            value={filterStandard}
            onChange={(e) => setFilterStandard(e.target.value)}
            className="filter-select"
          >
            <option value="">All Standards</option>
            {standards.map((standard) => (
              <option key={standard} value={standard}>{standard}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="add-fees-form">
          <h3>Add New Fees Record</h3>
          <form onSubmit={handleAddFees}>
            <div className="form-group">
              <label>Standard *</label>
              <select
                value={selectedAddStandard}
                onChange={(e) => {
                  const nextStandard = e.target.value;
                  setSelectedAddStandard(nextStandard);
                  setFormData({
                    ...formData,
                    standard: nextStandard,
                    studentId: '',
                    studentName: ''
                  });
                }}
                required
              >
                <option value="">Select standard</option>
                {standards.map((standard) => (
                  <option key={standard} value={standard}>{standard}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Student *</label>
              <select
                value={formData.studentId}
                onChange={(e) => {
                  const studentId = e.target.value;
                  const selectedStudent = studentOptions.find((student) => String(student._id) === studentId);
                  setFormData({
                    ...formData,
                    studentId,
                    studentName: selectedStudent?.name || '',
                    standard: selectedStudent?.className || formData.standard
                  });
                }}
                required
                disabled={!selectedAddStandard}
              >
                <option value="">{selectedAddStandard ? 'Select student' : 'Select a standard first'}</option>
                {studentOptions.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.rollNo} - {student.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Selected Student ID</label>
              <input
                type="text"
                value={formData.studentId}
                readOnly
                placeholder="Auto-selected from dropdown"
              />
            </div>

            <div className="form-group">
              <label>Amount (₹) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Month *</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  required
                >
                  <option value="">Select Month</option>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Year *</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Add remarks (optional)"
                rows="3"
              />
            </div>

            <button type="submit" className="btn-submit">Add Fees</button>
          </form>
        </div>
      )}

      <div className="fees-table">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Roll No</th>
              <th>Class</th>
              <th>Month-Year</th>
              <th>Amount (₹)</th>
              <th>Status</th>
              <th>Paid Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8">Loading...</td></tr>
            ) : filteredFees.length === 0 ? (
              <tr><td colSpan="8">No fees records found</td></tr>
            ) : (
              filteredFees.map(fee => (
                <tr key={fee._id} className={`status-${fee.status.toLowerCase()}`}>
                  <td>{fee.studentName}</td>
                  <td>{fee.rollNo}</td>
                  <td>{fee.standard || fee.className}</td>
                  <td>{fee.month} {fee.year}</td>
                  <td>{fee.amount.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${fee.status.toLowerCase()}`}>
                      {fee.status}
                    </span>
                  </td>
                  <td>{fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : '-'}</td>
                  <td className="actions">
                    {fee.status === 'Pending' ? (
                      <button onClick={() => handleMarkPaid(fee._id)} className="btn-success">
                        Mark Paid
                      </button>
                    ) : (
                      <button onClick={() => handleMarkPending(fee._id)} className="btn-warning">
                        Mark Pending
                      </button>
                    )}
                    <button onClick={() => handleDeleteFees(fee._id)} className="btn-danger">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeesManagement;
