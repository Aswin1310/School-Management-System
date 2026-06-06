import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './StudentFeesView.css';

const StudentFeesView = ({ studentId: propStudentId, token: propToken }) => {
  const [feesData, setFeesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [studentId, setStudentId] = useState('');

  const { user, token: contextToken } = useAuth();
  const token = propToken || contextToken;
  const studentIdValue = propStudentId || user?.id || user?._id || '';

  useEffect(() => {
    if (studentIdValue && token) {
      setStudentId(studentIdValue);
      fetchStudentFees(studentIdValue);
    }
  }, [studentIdValue, token]);

  const fetchStudentFees = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/fees/student/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFeesData(data.data);
      } else {
        setErrorMessage('Failed to fetch fees data');
      }
    } catch (error) {
      setErrorMessage('Error fetching fees: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!studentId) {
    return <div className="student-fees-view"><p>Loading student information...</p></div>;
  }

  return (
    <div className="student-fees-view">
      <h2>My Fees Status</h2>

      {errorMessage && <div className="message error">{errorMessage}</div>}

      {loading ? (
        <p>Loading your fees information...</p>
      ) : feesData ? (
        <>
          <div className="fees-overview">
            <div className="overview-card pending">
              <h4>Pending Fees</h4>
              <p>{feesData.totalPending}</p>
            </div>
            <div className="overview-card paid">
              <h4>Paid Fees</h4>
              <p>{feesData.totalPaid}</p>
            </div>
            <div className="overview-card amount">
              <h4>Amount Due</h4>
              <p>₹{feesData.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          <div className="fees-details">
            <h3>Fees Details</h3>
            {feesData.details.length === 0 ? (
              <p>No fees records found</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Year</th>
                    <th>Amount (₹)</th>
                    <th>Status</th>
                    <th>Paid Date</th>
                  </tr>
                </thead>
                <tbody>
                  {feesData.details.map((fee, index) => (
                    <tr key={index} className={`status-${fee.status.toLowerCase()}`}>
                      <td>{fee.month}</td>
                      <td>{fee.year}</td>
                      <td>₹{fee.amount.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${fee.status.toLowerCase()}`}>
                          {fee.status}
                        </span>
                      </td>
                      <td>
                        {fee.paidDate
                          ? new Date(fee.paidDate).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <p>No fees data available</p>
      )}
    </div>
  );
};

export default StudentFeesView;
