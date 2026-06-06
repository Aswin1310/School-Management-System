import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './ClassFeesView.css';

const ClassFeesView = ({ userClass, token: authToken }) => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { token: contextToken } = useAuth();
  const token = authToken || contextToken;

  const fetchClassFees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/fees/class/${userClass}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFees(data.data || []);
      } else {
        setErrorMessage('Failed to fetch fees');
      }
    } catch (error) {
      setErrorMessage('Error fetching fees: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [token, userClass]);

  useEffect(() => {
    if (userClass) {
      fetchClassFees();
    }
  }, [fetchClassFees, userClass]);

  const filteredFees = filterStatus
    ? fees.filter(f => f.status === filterStatus)
    : fees;

  const pendingCount = fees.filter(f => f.status === 'Pending').length;
  const paidCount = fees.filter(f => f.status === 'Paid').length;
  const pendingAmount = fees
    .filter(f => f.status === 'Pending')
    .reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="class-fees-view">
      <h2>Fees Status - {userClass}</h2>

      {errorMessage && <div className="message error">{errorMessage}</div>}
      <div className="fees-summary">
        <div className="summary-card pending">
          <h4>Pending Fees</h4>
          <p>{pendingCount}</p>
          <span>₹{pendingAmount.toFixed(2)}</span>
        </div>
        <div className="summary-card paid">
          <h4>Paid Fees</h4>
          <p>{paidCount}</p>
        </div>
        <div className="summary-card total">
          <h4>Total Students</h4>
          <p>{fees.length}</p>
        </div>
      </div>

      <div className="fees-filter">
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

      <div className="fees-list">
        {loading ? (
          <p>Loading fees data...</p>
        ) : filteredFees.length === 0 ? (
          <p>No fees records found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Month-Year</th>
                <th>Amount (₹)</th>
                <th>Status</th>
                <th>Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredFees.map(fee => (
                <tr key={fee._id} className={`status-${fee.status.toLowerCase()}`}>
                  <td>{fee.rollNo}</td>
                  <td>{fee.student?.name || fee.studentName}</td>
                  <td>{fee.month} {fee.year}</td>
                  <td>₹{fee.amount.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${fee.status.toLowerCase()}`}>
                      {fee.status}
                    </span>
                  </td>
                  <td>{fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ClassFeesView;
