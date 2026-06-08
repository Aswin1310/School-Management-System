import React, { useState, useEffect, useCallback } from 'react';
import './StudentItemRequest.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

const buildApiUrl = (path) => {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
};

const readResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : {};
};

const StudentItemRequest = ({ token, studentId }) => {
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    itemType: 'ID Card',
    itemDescription: '',
    quantity: 1,
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const itemTypes = ['ID Card', 'Belt', 'Tie', 'Uniform', 'Books', 'Other'];

  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/api/item-requests/my-requests'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await readResponseBody(response);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'quantity' ? parseInt(value) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(buildApiUrl('/api/item-requests/submit'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await readResponseBody(response);
      if (response.ok) {
        setMessage('✓ Request submitted successfully!');
        setFormData({ itemType: 'ID Card', itemDescription: '', quantity: 1, reason: '' });
        setShowForm(false);
        fetchRequests();
      } else {
        setMessage(`✗ Error: ${data.message || 'Error submitting request'}`);
      }
    } catch (error) {
      setMessage('✗ Error submitting request');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#f59e0b';
      case 'Approved':
        return '#10b981';
      case 'Issued':
        return '#3b82f6';
      case 'Rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📦 Item Request</h2>
        <button
          style={{
            ...styles.primaryBtn,
            ...(showForm ? styles.secondaryBtn : {})
          }}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Request Item'}
        </button>
      </div>

      {message && (
        <div
          style={{
            ...styles.message,
            backgroundColor: message.startsWith('✓') ? '#d1fae5' : '#fee2e2',
            color: message.startsWith('✓') ? '#065f46' : '#991b1b'
          }}
        >
          {message}
        </div>
      )}

      {showForm && (
        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Item Type *</label>
            <select
              name="itemType"
              value={formData.itemType}
              onChange={handleInputChange}
              style={styles.input}
            >
              {itemTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Item Description *</label>
            <input
              type="text"
              name="itemDescription"
              value={formData.itemDescription}
              onChange={handleInputChange}
              placeholder="e.g., School ID Card with new photo"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="1"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Reason for Request *</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Why do you need this item?"
              style={{ ...styles.input, minHeight: '80px', fontFamily: 'inherit' }}
              required
            />
          </div>

          <button
            type="submit"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      )}

      <div style={styles.requestsSection}>
        <h3 style={styles.sectionTitle}>Your Requests ({requests.length})</h3>
        {requests.length === 0 ? (
          <p style={styles.emptyMessage}>No requests yet. Submit your first request above.</p>
        ) : (
          <div style={styles.requestsList}>
            {requests.map((request) => (
              <div key={request._id} style={styles.requestCard}>
                <div style={styles.requestHeader}>
                  <div>
                    <h4 style={styles.itemType}>{request.itemType}</h4>
                    <p style={styles.description}>{request.itemDescription}</p>
                  </div>
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(request.status),
                      color: 'white'
                    }}
                  >
                    {request.status}
                  </div>
                </div>

                <div style={styles.requestDetails}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Quantity:</span>
                    <span>{request.quantity}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Requested:</span>
                    <span>{new Date(request.requestedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={styles.requestReason}>
                  <span style={styles.detailLabel}>Reason:</span>
                  <p style={{ margin: '4px 0 0 0' }}>{request.reason}</p>
                </div>

                {request.adminRemarks && (
                  <div style={styles.adminRemarks}>
                    <span style={styles.detailLabel}>Admin Remarks:</span>
                    <p style={{ margin: '4px 0 0 0' }}>{request.adminRemarks}</p>
                  </div>
                )}

                {request.issuedDate && (
                  <div style={styles.issuedDate}>
                    <span style={styles.detailLabel}>Issued on:</span>
                    <span>{new Date(request.issuedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  primaryBtn: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  secondaryBtn: {
    backgroundColor: '#ef4444'
  },
  message: {
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '500'
  },
  form: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb'
  },
  formGroup: {
    marginBottom: '16px'
  },
  formRow: {
    display: 'flex',
    gap: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '500',
    color: '#374151',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  submitBtn: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    width: '100%',
    transition: 'background-color 0.2s'
  },
  requestsSection: {
    marginTop: '24px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px'
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '20px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px'
  },
  requestsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  requestCard: {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  requestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px'
  },
  itemType: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  requestDetails: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
    fontSize: '14px'
  },
  detailItem: {
    display: 'flex',
    gap: '8px'
  },
  detailLabel: {
    fontWeight: '600',
    color: '#374151'
  },
  requestReason: {
    padding: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '14px'
  },
  adminRemarks: {
    padding: '12px',
    backgroundColor: '#fef3c7',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '14px',
    borderLeft: '4px solid #f59e0b'
  },
  issuedDate: {
    padding: '12px',
    backgroundColor: '#d1fae5',
    borderRadius: '6px',
    fontSize: '14px',
    borderLeft: '4px solid #10b981'
  }
};

export default StudentItemRequest;
