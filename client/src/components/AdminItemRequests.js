import React, { useState, useEffect, useCallback } from 'react';
import './AdminItemRequests.css';

const AdminItemRequests = ({ token, onRequestsChanged }) => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    itemType: '',
    className: ''
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updateData, setUpdateData] = useState({
    status: '',
    adminRemarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const itemTypes = ['ID Card', 'Belt', 'Tie', 'Uniform', 'Books', 'Other'];
  const statuses = ['Pending', 'Approved', 'Rejected', 'Issued'];

  const fetchAllRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/item-requests/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    }
  }, [token]);

  const applyFilters = useCallback(() => {
    let filtered = requests;

    if (filters.status) {
      filtered = filtered.filter((r) => r.status === filters.status);
    }
    if (filters.itemType) {
      filtered = filtered.filter((r) => r.itemType === filters.itemType);
    }
    if (filters.className) {
      filtered = filtered.filter((r) => r.className === filters.className);
    }

    setFilteredRequests(filtered);
  }, [filters, requests]);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const markRequestAsSeen = async (requestId) => {
    try {
      const response = await fetch(`/api/item-requests/mark-seen/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchAllRequests();
        if (typeof onRequestsChanged === 'function') {
          onRequestsChanged();
        }
      }
    } catch (error) {
      console.error('Error marking request as seen:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const handleUpdateRequest = async () => {
    if (!updateData.status) {
      setMessage('✗ Please select a status');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`/api/item-requests/update-status/${selectedRequest._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('✓ Request updated successfully!');
        setSelectedRequest(null);
        setUpdateData({ status: '', adminRemarks: '' });
        fetchAllRequests();
        if (typeof onRequestsChanged === 'function') {
          onRequestsChanged();
        }
      } else {
        setMessage(`✗ Error: ${data.message}`);
      }
    } catch (error) {
      setMessage('✗ Error updating request');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;

    try {
      const response = await fetch(`/api/item-requests/delete/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage('✓ Request deleted successfully!');
        fetchAllRequests();
        setSelectedRequest(null);
        if (typeof onRequestsChanged === 'function') {
          onRequestsChanged();
        }
      } else {
        setMessage('✗ Error deleting request');
      }
    } catch (error) {
      setMessage('✗ Error deleting request');
      console.error('Error:', error);
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

  const uniqueClasses = [...new Set(requests.map((r) => r.className))].sort();
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📦 Item Requests Management</h2>
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

      <div style={styles.statsContainer}>
        <div style={{ ...styles.statCard, borderLeftColor: '#f59e0b' }}>
          <div style={styles.statValue}>{pendingCount}</div>
          <div style={styles.statLabel}>Pending</div>
        </div>
        <div style={{ ...styles.statCard, borderLeftColor: '#10b981' }}>
          <div style={styles.statValue}>{approvedCount}</div>
          <div style={styles.statLabel}>Approved</div>
        </div>
        <div style={{ ...styles.statCard, borderLeftColor: '#3b82f6' }}>
          <div style={styles.statValue}>{requests.length}</div>
          <div style={styles.statLabel}>Total</div>
        </div>
      </div>

      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            style={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Item Type</label>
          <select
            name="itemType"
            value={filters.itemType}
            onChange={handleFilterChange}
            style={styles.filterSelect}
          >
            <option value="">All Items</option>
            {itemTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Class</label>
          <select
            name="className"
            value={filters.className}
            onChange={handleFilterChange}
            style={styles.filterSelect}
          >
            <option value="">All Classes</option>
            {uniqueClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={{ ...styles.th, textAlign: 'left' }}>Student</th>
              <th style={styles.th}>Item</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Class</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Requested</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                  No requests found
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => (
                <tr key={request._id} style={styles.tableRow}>
                  <td style={{ ...styles.td, textAlign: 'left' }}>
                    <div style={styles.studentInfo}>
                      <div style={styles.studentName}>{request.studentName}</div>
                      <div style={styles.rollNo}>Roll: {request.rollNo}</div>
                    </div>
                  </td>
                  <td style={styles.td}>{request.itemType}</td>
                  <td style={styles.td}>{request.quantity}</td>
                  <td style={styles.td}>{request.className}</td>
                  <td style={styles.td}>
                    <div
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(request.status)
                      }}
                    >
                      {request.status}
                    </div>
                  </td>
                  <td style={styles.td}>
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.actionBtn}
                      onClick={() => {
                        setSelectedRequest(request);
                        setUpdateData({ status: request.status, adminRemarks: request.adminRemarks });
                        markRequestAsSeen(request._id);
                      }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <div style={styles.modalOverlay} onClick={() => setSelectedRequest(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Manage Item Request</h3>
              <button
                style={styles.closeBtn}
                onClick={() => setSelectedRequest(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalContent}>
              <div style={styles.modalSection}>
                <h4 style={styles.sectionTitle}>Request Details</h4>
                <div style={styles.detailsGrid}>
                  <div>
                    <span style={styles.detailLabel}>Student:</span>
                    <div>{selectedRequest.studentName}</div>
                  </div>
                  <div>
                    <span style={styles.detailLabel}>Roll No:</span>
                    <div>{selectedRequest.rollNo}</div>
                  </div>
                  <div>
                    <span style={styles.detailLabel}>Class:</span>
                    <div>{selectedRequest.className}</div>
                  </div>
                  <div>
                    <span style={styles.detailLabel}>Item:</span>
                    <div>{selectedRequest.itemType}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={styles.detailLabel}>Description:</span>
                    <div>{selectedRequest.itemDescription}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={styles.detailLabel}>Reason:</span>
                    <div>{selectedRequest.reason}</div>
                  </div>
                </div>
              </div>

              <div style={styles.modalSection}>
                <h4 style={styles.sectionTitle}>Update Status</h4>
                <div style={styles.formGroup}>
                  <label style={styles.label}>New Status *</label>
                  <select
                    value={updateData.status}
                    onChange={(e) =>
                      setUpdateData({ ...updateData, status: e.target.value })
                    }
                    style={styles.input}
                  >
                    <option value="">Select Status</option>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Admin Remarks</label>
                  <textarea
                    value={updateData.adminRemarks}
                    onChange={(e) =>
                      setUpdateData({ ...updateData, adminRemarks: e.target.value })
                    }
                    placeholder="Add any remarks for the student..."
                    style={{ ...styles.input, minHeight: '80px', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  style={styles.cancelBtn}
                  onClick={() => setSelectedRequest(null)}
                >
                  Cancel
                </button>
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDeleteRequest(selectedRequest._id)}
                >
                  Delete
                </button>
                <button
                  style={styles.saveBtn}
                  onClick={handleUpdateRequest}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  message: {
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '500'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    borderLeft: '4px solid #3b82f6'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  filtersContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px'
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    borderBottom: '2px solid #e5e7eb'
  },
  th: {
    padding: '12px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
    ':hover': {
      backgroundColor: '#f9fafb'
    }
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    textAlign: 'center',
    color: '#1f2937'
  },
  studentInfo: {
    textAlign: 'left'
  },
  studentName: {
    fontWeight: '600',
    color: '#1f2937'
  },
  rollNo: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600'
  },
  actionBtn: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  modalContent: {
    padding: '20px'
  },
  modalSection: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  detailLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '4px'
  },
  formGroup: {
    marginBottom: '16px'
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
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  deleteBtn: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  saveBtn: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  }
};

export default AdminItemRequests;
