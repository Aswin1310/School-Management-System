import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import FeesManagement from '../components/FeesManagement';
import AdminItemRequests from '../components/AdminItemRequests';

const AdminDashboard = () => {
  const { user, token, logout } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [selectedClass, setSelectedClass] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [allowedClassesText, setAllowedClassesText] = useState('');
  const [subjectAssignmentsText, setSubjectAssignmentsText] = useState('');
  const [mentorClassesText, setMentorClassesText] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [deletingStudentId, setDeletingStudentId] = useState('');
  const [deletingTeacherId, setDeletingTeacherId] = useState('');
  const [removingClassKey, setRemovingClassKey] = useState('');
  const [studentDetailOpen, setStudentDetailOpen] = useState(false);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [studentDetailError, setStudentDetailError] = useState('');
  const [studentDetailData, setStudentDetailData] = useState(null);
  const [studentDetailTab, setStudentDetailTab] = useState('details');
  const [studentDetailsForm, setStudentDetailsForm] = useState({
    phone: '',
    fatherName: '',
    motherName: ''
  });
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [calendarForm, setCalendarForm] = useState({
    date: '',
    type: 'working',
    description: ''
  });
  const [editingCalendarId, setEditingCalendarId] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    setMessage('');
    setError('');
  }, [teacherId, allowedClassesText]);

  useEffect(() => {
    const loadOverview = async () => {
      setOverviewLoading(true);
      setOverviewError('');

      try {
        const [studentsResponse, teachersResponse] = await Promise.all([
          axios.get('/api/admin/students', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          axios.get('/api/admin/teachers', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        ]);

        setStudents(studentsResponse.data.students || []);
        setTeachers(teachersResponse.data.teachers || []);
      } catch (fetchError) {
        setOverviewError(fetchError.response?.data?.message || 'Unable to load school overview.');
      } finally {
        setOverviewLoading(false);
      }
    };

    if (token) {
      loadOverview();
    }
  }, [token]);

  const loadCalendar = useCallback(async () => {
    try {
      setCalendarLoading(true);
      setCalendarError('');

      const response = await axios.get('/api/admin/calendar', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setCalendarEntries(response.data.entries || []);
    } catch (err) {
      setCalendarError(err.response?.data?.message || 'Unable to load calendar');
    } finally {
      setCalendarLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeView === 'calendar') {
      loadCalendar();
    }
  }, [activeView, loadCalendar]);

  useEffect(() => {
    if (!token) {
      setNotificationCount(0);
      return undefined;
    }

    let mounted = true;

    const loadNotificationCount = async () => {
      try {
        const response = await axios.get('/api/item-requests/unread-count', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (mounted) {
          setNotificationCount(response.data.unreadCount || 0);
        }
      } catch (err) {
        if (mounted) {
          setNotificationCount(0);
        }
      }
    };

    loadNotificationCount();
    const intervalId = window.setInterval(loadNotificationCount, 15000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [token]);

  const markAllNotificationsSeen = async () => {
    if (!token) {
      return;
    }

    await axios.put('/api/item-requests/mark-all-seen', {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    setNotificationCount(0);
  };

  const openItemRequests = async () => {
    try {
      await markAllNotificationsSeen();
    } catch (err) {
      console.error('Unable to mark notifications as seen:', err);
    } finally {
      setActiveView('itemRequests');
    }
  };

  const refreshOverview = async () => {
    setOverviewLoading(true);
    setOverviewError('');

    try {
      const [studentsResponse, teachersResponse] = await Promise.all([
        axios.get('/api/admin/students', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }),
        axios.get('/api/admin/teachers', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ]);

      setStudents(studentsResponse.data.students || []);
      setTeachers(teachersResponse.data.teachers || []);
    } catch (fetchError) {
      setOverviewError(fetchError.response?.data?.message || 'Unable to load school overview.');
    } finally {
      setOverviewLoading(false);
    }
  };

  const filteredTeachers = teachers.filter((teacher) => {
    const query = teacherSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      teacher.name,
      teacher.teacherId,
      teacher.phone,
      teacher.email,
      ...(teacher.allowedClasses || []),
      ...(teacher.mentorFor || [])
    ].some((value) => String(value || '').toLowerCase().includes(query));
  });

  const handleAssign = async (event) => {
    event.preventDefault();

    const allowedClasses = allowedClassesText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!teacherId || allowedClasses.length === 0) {
      setError('Teacher ID and at least one class are required.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // parse subjectAssignmentsText: lines of "Class:sub1,sub2" or comma separated entries
      const subjectAssignments = subjectAssignmentsText
        .split(/\n|;/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [cls, subs] = line.split(':');
          return {
            className: cls ? cls.trim() : '',
            subjects: subs ? subs.split(',').map(s => s.trim()).filter(Boolean) : []
          };
        })
        .filter(a => a.className && a.subjects.length > 0);

      const mentorFor = mentorClassesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const response = await axios.put(
        `/api/admin/teachers/${teacherId}/classes`,
        { allowedClasses, subjectAssignments, mentorFor },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage(response.data.message || 'Classes updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update classes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    const confirmDelete = window.confirm(`Delete student ${studentName}? This will also remove related marks and attendance.`);

    if (!confirmDelete) {
      return;
    }

    setDeletingStudentId(studentId);
    setMessage('');
    setError('');

    try {
      await axios.delete(`/api/admin/students/${studentId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setMessage('Student deleted successfully.');
      await refreshOverview();
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || 'Unable to delete student.');
    } finally {
      setDeletingStudentId('');
    }
  };

  const handleDeleteTeacher = async (teacherId, teacherName) => {
    const confirmDelete = window.confirm(`Delete teacher ${teacherName}?`);

    if (!confirmDelete) {
      return;
    }

    setDeletingTeacherId(teacherId);
    setMessage('');
    setError('');

    try {
      await axios.delete(`/api/admin/teachers/${teacherId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setMessage('Teacher deleted successfully.');
      await refreshOverview();
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || 'Unable to delete teacher.');
    } finally {
      setDeletingTeacherId('');
    }
  };

  const handleRemoveClass = async (teacherId, className) => {
    const confirmRemove = window.confirm(`Remove class ${className} from teacher ${teacherId}?`);
    if (!confirmRemove) return;

    const key = `${teacherId}::${className}`;
    setRemovingClassKey(key);
    setMessage('');
    setError('');

    try {
      await axios.delete(`/api/admin/teachers/${teacherId}/classes/${encodeURIComponent(className)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setMessage(`Class '${className}' removed from teacher successfully.`);
      await refreshOverview();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to remove class.');
    } finally {
      setRemovingClassKey('');
    }
  };

  const handleSaveCalendar = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      if (!calendarForm.date) {
        setError('Date is required');
        return;
      }

      if (editingCalendarId) {
        await axios.put(`/api/admin/calendar/${editingCalendarId}`, calendarForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Calendar entry updated successfully');
      } else {
        await axios.post('/api/admin/calendar', calendarForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Calendar entry created successfully');
      }

      setCalendarForm({ date: '', type: 'working', description: '' });
      setEditingCalendarId(null);
      await loadCalendar();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save calendar entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCalendar = async (calendarId) => {
    const confirmDelete = window.confirm('Delete this calendar entry?');
    if (!confirmDelete) return;

    try {
      await axios.delete(`/api/admin/calendar/${calendarId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Calendar entry deleted successfully');
      await loadCalendar();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete calendar entry');
    }
  };

  const handleEditCalendar = (entry) => {
    setEditingCalendarId(entry._id);
    setCalendarForm({
      date: new Date(entry.date).toISOString().split('T')[0],
      type: entry.type,
      description: entry.description || ''
    });
  };

  const openStudentDetails = async (student) => {
    setStudentDetailOpen(true);
    setStudentDetailLoading(true);
    setStudentDetailError('');
    setStudentDetailData(null);
    setStudentDetailTab('details');

    try {
      const response = await axios.get(`/api/admin/students/${student._id}/details`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setStudentDetailData(response.data);
      setStudentDetailsForm({
        phone: response.data.student?.phone || '',
        fatherName: response.data.student?.fatherName || '',
        motherName: response.data.student?.motherName || ''
      });
    } catch (detailsError) {
      setStudentDetailError(detailsError.response?.data?.message || 'Unable to load student details.');
    } finally {
      setStudentDetailLoading(false);
    }
  };

  const handleStudentDetailsChange = (event) => {
    const { name, value } = event.target;
    setStudentDetailsForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const saveStudentDetails = async () => {
    if (!studentDetailData?.student?._id && !studentDetailData?.student?.id) {
      return;
    }

    const studentId = studentDetailData.student.id || studentDetailData.student._id;

    try {
      setStudentDetailLoading(true);
      const response = await axios.put(`/api/admin/students/${studentId}`, studentDetailsForm, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setStudentDetailData(response.data);
      setStudentDetailsForm({
        phone: response.data.student?.phone || '',
        fatherName: response.data.student?.fatherName || '',
        motherName: response.data.student?.motherName || ''
      });
      setStudentDetailTab('details');
      setMessage('Student details updated successfully.');
    } catch (saveError) {
      setStudentDetailError(saveError.response?.data?.message || 'Unable to save student details.');
    } finally {
      setStudentDetailLoading(false);
    }
  };

  const closeStudentDetails = () => {
    setStudentDetailOpen(false);
    setStudentDetailError('');
    setStudentDetailData(null);
    setStudentDetailTab('details');
  };

  const renderOverview = () => (
    <>
      <div className="overview-grid">
        <div className="overview-card">
          <span className="overview-label">Students</span>
          <strong>{students.length}</strong>
        </div>
        <div className="overview-card">
          <span className="overview-label">Teachers</span>
          <strong>{teachers.length}</strong>
        </div>
      </div>

      {overviewError && <div className="error-message">{overviewError}</div>}
    </>
  );

  const getUniqueClasses = () => {
    const classes = new Set(students.map(s => s.className));
    return Array.from(classes).sort();
  };

  const renderStudents = () => {
    const uniqueClasses = getUniqueClasses();
    const classStudents = selectedClass 
      ? students.filter(s => s.className === selectedClass)
      : [];
    
    return (
      <>
        <div className="admin-panel data-panel">
          <div className="panel-header">
            <h3>Student Details</h3>
            <span className="panel-subtitle">Class wise student list</span>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="search-input"
            >
              <option value="">Choose a class</option>
              {uniqueClasses.map((className) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>

          {selectedClass && (
            <div className="search-row">
              <input
                type="text"
                className="search-input"
                placeholder="Search students by name, roll number, phone, or email"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
              />
            </div>
          )}

          {!selectedClass ? (
            <div className="empty-state">Select a class to view students</div>
          ) : overviewLoading ? (
            <div className="empty-state">Loading student records...</div>
          ) : classStudents.length === 0 ? (
            <div className="empty-state">No students found in this class.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Roll No</th>
                    <th>Phone</th>
                    <th>Father</th>
                    <th>Mother</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.filter(student => {
                    const query = studentSearch.trim().toLowerCase();
                    if (!query) return true;
                    return [
                      student.name,
                      student.rollNo,
                      student.phone,
                      student.fatherName,
                      student.motherName,
                      student.email
                    ].some((value) => String(value || '').toLowerCase().includes(query));
                  }).map((student) => (
                    <tr key={student._id}>
                      <td>{student.name}</td>
                      <td>{student.rollNo}</td>
                      <td>{student.phone || '-'}</td>
                      <td>{student.fatherName || '-'}</td>
                      <td>{student.motherName || '-'}</td>
                      <td>{student.email}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => openStudentDetails(student)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => handleDeleteStudent(student._id, student.name)}
                            disabled={deletingStudentId === student._id}
                          >
                            {deletingStudentId === student._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderTeachers = () => {
    return (
      <>
        <div className="admin-panel data-panel">
          <div className="panel-header">
            <h3>Teacher Details</h3>
            <span className="panel-subtitle">All staff and permissions</span>
          </div>

          <div className="search-row">
            <input
              type="text"
              className="search-input"
              placeholder="Search teachers by name, ID, class, or email"
              value={teacherSearch}
              onChange={(event) => setTeacherSearch(event.target.value)}
            />
          </div>

          {overviewLoading ? (
            <div className="empty-state">Loading teacher records...</div>
          ) : filteredTeachers.length === 0 ? (
            <div className="empty-state">No teachers found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Teacher ID</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Allowed Classes</th>
                    <th>Mentor For</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher._id}>
                      <td>{teacher.name}</td>
                      <td>{teacher.teacherId}</td>
                      <td>{teacher.phone || '-'}</td>
                      <td>{teacher.email}</td>
                      <td>
                        {(teacher.allowedClasses || []).length === 0 ? '-' : (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {(teacher.allowedClasses || []).map((cls) => {
                              const key = `${teacher.teacherId}::${cls}`;
                              return (
                                <div key={cls} style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>{cls}</span>
                                  <button
                                    type="button"
                                    className="danger-btn"
                                    onClick={() => handleRemoveClass(teacher.teacherId, cls)}
                                    disabled={removingClassKey === key}
                                    style={{ padding: '4px 6px', fontSize: '12px' }}
                                  >
                                    {removingClassKey === key ? 'Removing...' : 'Remove'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td>
                        {(teacher.mentorFor || []).length === 0 ? '-' : (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {(teacher.mentorFor || []).map((cls) => {
                              const key = `${teacher.teacherId}::${cls}`;
                              return (
                                <div key={cls} style={{ background: '#fff7ed', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>{cls}</span>
                                  <button
                                    type="button"
                                    className="danger-btn"
                                    onClick={() => handleRemoveClass(teacher.teacherId, cls)}
                                    disabled={removingClassKey === key}
                                    style={{ padding: '4px 6px', fontSize: '12px' }}
                                  >
                                    {removingClassKey === key ? 'Removing...' : 'Remove'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => handleDeleteTeacher(teacher.teacherId, teacher.name)}
                          disabled={deletingTeacherId === teacher.teacherId}
                        >
                          {deletingTeacherId === teacher.teacherId ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderAssignForm = () => (
    <div className="admin-panel">
      <h3>Assign Classes to Teacher</h3>
      <form onSubmit={handleAssign} className="admin-form">
        <div className="form-group">
          <input
            type="text"
            name="teacherId"
            placeholder="Teacher ID"
            value={teacherId}
            onChange={(event) => setTeacherId(event.target.value)}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            name="allowedClasses"
            placeholder="Allowed Classes (comma separated, e.g. 8A, 9B, 10C)"
            value={allowedClassesText}
            onChange={(event) => setAllowedClassesText(event.target.value)}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            name="mentorClasses"
            placeholder="Mentor For Classes (comma separated, e.g. 8A, 9B)"
            value={mentorClassesText}
            onChange={(event) => setMentorClassesText(event.target.value)}
          />
        </div>
        <div className="form-group">
          <textarea
            name="subjectAssignments"
            placeholder={"Optional: Class:subjects lines, e.g.\n8A:Math,Science\n9B:English"}
            value={subjectAssignmentsText}
            onChange={(event) => setSubjectAssignmentsText(event.target.value)}
            rows={4}
          />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Assigning...' : 'Save Classes'}</button>
      </form>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );

  const renderCalendar = () => (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h3>Academic Calendar</h3>
        <p style={styles.panelSubtext}>Manage school calendar - working days, leaves, and holidays</p>
      </div>

      {message && <div style={{ ...styles.card, ...{ backgroundColor: '#dbeafe', color: '#0c2340', marginBottom: '16px' } }}>{message}</div>}
      {error && <div style={{ ...styles.card, ...{ backgroundColor: '#93c5fd', color: '#0c2340', marginBottom: '16px' } }}>{error}</div>}
      {calendarError && <div style={{ ...styles.card, ...{ backgroundColor: '#fee2e2', color: '#991b1b', marginBottom: '16px' } }}>{calendarError}</div>}

      <form onSubmit={handleSaveCalendar} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Date</label>
          <input
            type="date"
            value={calendarForm.date}
            onChange={(e) => setCalendarForm({ ...calendarForm, date: e.target.value })}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Type</label>
          <select
            value={calendarForm.type}
            onChange={(e) => setCalendarForm({ ...calendarForm, type: e.target.value })}
            style={styles.select}
          >
            <option value="working">Working Day</option>
            <option value="leave">Leave</option>
            <option value="holiday">Holiday</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description (Optional)</label>
          <input
            type="text"
            value={calendarForm.description}
            onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })}
            style={styles.input}
            placeholder="e.g., Summer vacation, Independence Day"
          />
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'Saving...' : (editingCalendarId ? 'Update Entry' : 'Add Entry')}
        </button>
        {editingCalendarId && (
          <button
            type="button"
            onClick={() => {
              setEditingCalendarId(null);
              setCalendarForm({ date: '', type: 'working', description: '' });
            }}
            style={{ ...styles.submitBtn, ...{ backgroundColor: '#6b7280', marginLeft: '8px' } }}
          >
            Cancel
          </button>
        )}
      </form>

      {calendarLoading && <p>Loading calendar...</p>}
      {!calendarLoading && calendarEntries.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {calendarEntries.map((entry) => {
                const typeEmoji = entry.type === 'working' ? '🏫' : entry.type === 'leave' ? '🏖️' : '🎉';
                const typeLabel = entry.type === 'working' ? 'Working' : entry.type === 'leave' ? 'Leave' : 'Holiday';
                return (
                  <tr key={entry._id}>
                    <td style={styles.td}>{new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                    <td style={{
                      ...styles.td,
                      backgroundColor: entry.type === 'holiday' ? '#93c5fd' : entry.type === 'leave' ? '#bfdbfe' : '#dbeafe',
                      color: '#0c2340',
                      fontWeight: 600,
                      borderRadius: '6px',
                      padding: '6px 10px',
                      textAlign: 'center'
                    }}>
                      {typeEmoji} {typeLabel}
                    </td>
                    <td style={styles.td}>{entry.description || '—'}</td>
                    <td style={styles.td}>
                      <button onClick={() => handleEditCalendar(entry)} style={{ ...styles.viewBtn, marginRight: '6px' }}>Edit</button>
                      <button onClick={() => handleDeleteCalendar(entry._id)} style={{ ...styles.viewBtn, ...{ backgroundColor: '#dbeafe', color: '#0c2340', border: '1px solid #93c5fd' } }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!calendarLoading && calendarEntries.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '20px' }}>No calendar entries yet. Add one to get started.</p>
      )}
    </div>
  );

  const renderStudentDetailModal = () => {
    if (!studentDetailOpen) {
      return null;
    }

    const student = studentDetailData?.student;
    const mentor = studentDetailData?.mentor;

    return (
      <div style={styles.modalOverlay} onClick={closeStudentDetails}>
        <div style={styles.modalContent} onClick={(event) => event.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div>
              <h3 style={{ margin: 0 }}>Student Details</h3>
              {student && <p style={styles.modalSubtext}>{student.name} • {student.rollNo} • {student.className}</p>}
            </div>
            <button type="button" style={styles.closeBtn} onClick={closeStudentDetails}>✕</button>
          </div>

          <div style={styles.detailTabs}>
            <button
              type="button"
              style={{ ...styles.detailTabBtn, ...(studentDetailTab === 'details' ? styles.detailTabBtnActive : {}) }}
              onClick={() => setStudentDetailTab('details')}
            >
              Details
            </button>
            <button
              type="button"
              style={{ ...styles.detailTabBtn, ...(studentDetailTab === 'marks' ? styles.detailTabBtnActive : {}) }}
              onClick={() => setStudentDetailTab('marks')}
            >
              Marks
            </button>
            <button
              type="button"
              style={{ ...styles.detailTabBtn, ...(studentDetailTab === 'attendance' ? styles.detailTabBtnActive : {}) }}
              onClick={() => setStudentDetailTab('attendance')}
            >
              Attendance
            </button>
            <button
              type="button"
              style={{ ...styles.detailTabBtn, ...(studentDetailTab === 'edit' ? styles.detailTabBtnActive : {}) }}
              onClick={() => setStudentDetailTab('edit')}
            >
              Edit
            </button>
          </div>

          {studentDetailLoading && <p>Loading student data...</p>}
          {studentDetailError && <p style={{ color: '#c33' }}>{studentDetailError}</p>}

          {!studentDetailLoading && studentDetailData && !studentDetailError && studentDetailTab === 'details' && student && (
            <div style={styles.detailPanel}>
              <div style={styles.detailGrid}>
                <div>
                  <p><strong>Name:</strong> {student.name}</p>
                  <p><strong>Roll No:</strong> {student.rollNo}</p>
                  <p><strong>Class:</strong> {student.className}</p>
                  <p><strong>Email:</strong> {student.email}</p>
                </div>
                <div>
                  <p><strong>Phone:</strong> {student.phone || 'Not provided'}</p>
                  <p><strong>Father's Name:</strong> {student.fatherName || 'Not provided'}</p>
                  <p><strong>Mother's Name:</strong> {student.motherName || 'Not provided'}</p>
                  <p><strong>Mentor:</strong> {mentor ? `${mentor.name} (${mentor.teacherId})` : 'Not assigned'}</p>
                </div>
              </div>
            </div>
          )}

          {!studentDetailLoading && studentDetailData && !studentDetailError && studentDetailTab === 'marks' && (
            <div style={styles.detailPanel}>
              <h4 style={{ marginTop: 0 }}>Marks</h4>
              {studentDetailData.marks?.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Subject</th>
                        <th style={styles.th}>Exam</th>
                        <th style={styles.th}>Marks</th>
                        <th style={styles.th}>%</th>
                        <th style={styles.th}>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentDetailData.marks.map((mark) => (
                        <tr key={mark.id}>
                          <td style={styles.td}>{mark.subjectName}</td>
                          <td style={styles.td}>{mark.examName}</td>
                          <td style={styles.td}>{mark.marksObtained}/{mark.maxMarks}</td>
                          <td style={styles.td}>{mark.percentage}%</td>
                          <td style={styles.td}>{mark.recordedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No marks recorded for this student.</p>
              )}
            </div>
          )}

          {!studentDetailLoading && studentDetailData && !studentDetailError && studentDetailTab === 'attendance' && (
            <div style={styles.detailPanel}>
              <h4 style={{ marginTop: 0 }}>Attendance</h4>
              {studentDetailData.attendance?.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentDetailData.attendance.map((record) => (
                        <tr key={record.id}>
                          <td style={styles.td}>{new Date(record.date).toLocaleDateString()}</td>
                          <td style={styles.td}>{record.status}</td>
                          <td style={styles.td}>{record.recordedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No attendance records for this student.</p>
              )}
            </div>
          )}

          {!studentDetailLoading && studentDetailData && !studentDetailError && studentDetailTab === 'edit' && (
            <div style={styles.detailPanel}>
              <h4 style={{ marginTop: 0 }}>Edit Contact Details</h4>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone</label>
                  <input
                    name="phone"
                    value={studentDetailsForm.phone}
                    onChange={handleStudentDetailsChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Father's Name</label>
                  <input
                    name="fatherName"
                    value={studentDetailsForm.fatherName}
                    onChange={handleStudentDetailsChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Mother's Name</label>
                  <input
                    name="motherName"
                    value={studentDetailsForm.motherName}
                    onChange={handleStudentDetailsChange}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="secondary-btn" onClick={() => setStudentDetailTab('details')}>
                  Cancel
                </button>
                <button type="button" className="primary-btn" onClick={saveStudentDetails} disabled={studentDetailLoading}>
                  {studentDetailLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.studentInfo}>
            <div style={styles.avatarCircle}>{user?.name?.[0]?.toUpperCase() || 'A'}</div>
            <div>
              <h2 style={styles.studentId}>Admin</h2>
              <p style={styles.version}>{user?.name}</p>
            </div>
          </div>
          <div style={styles.headerIcons}>
            <button style={styles.iconBtn} title="Refresh" onClick={refreshOverview}>{overviewLoading ? '...' : '🔄'}</button>
            <button style={styles.iconBtn} title="Dashboard">✨</button>
            <button style={styles.iconBtn} title="Home">🏠</button>
            <button
              style={{ ...styles.iconBtn, ...styles.notificationBtn }}
              title="Item request notifications"
              onClick={openItemRequests}
            >
              🔔
              {notificationCount > 0 && (
                <span style={styles.notificationBadge}>{notificationCount > 99 ? '99+' : notificationCount}</span>
              )}
            </button>
            <button style={{ ...styles.iconBtn, ...styles.logoutIconBtn }} onClick={logout} title="Logout">🚪</button>
          </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <aside style={styles.sidebar}>
          <nav style={styles.sidebarNav}>
            <div>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeView === 'overview' ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveView('overview')}
              >
                <span style={styles.sidebarIcon}>📊</span>
                <span style={styles.sidebarLabel}>Overview</span>
                <span style={styles.sidebarArrow}>▼</span>
              </button>
            </div>

            <div>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeView === 'students' ? styles.sidebarBtnActive : {})
                }}
                onClick={() => {
                  setActiveView('students');
                  setSelectedClass('');
                  setStudentSearch('');
                }}
              >
                <span style={styles.sidebarIcon}>👥</span>
                <span style={styles.sidebarLabel}>Students</span>
                <span style={styles.sidebarArrow}>▼</span>
              </button>
            </div>

            <div>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeView === 'teachers' ? styles.sidebarBtnActive : {})
                }}
                onClick={() => {
                  setActiveView('teachers');
                  setTeacherSearch('');
                }}
              >
                <span style={styles.sidebarIcon}>🎓</span>
                <span style={styles.sidebarLabel}>Teachers</span>
                <span style={styles.sidebarArrow}>▼</span>
              </button>
            </div>

            <div>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeView === 'assign' ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveView('assign')}
              >
                <span style={styles.sidebarIcon}>✏️</span>
                <span style={styles.sidebarLabel}>Assign Classes</span>
                <span style={styles.sidebarArrow}>▼</span>
              </button>
            </div>

            <div>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeView === 'calendar' ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveView('calendar')}
              >
                <span style={styles.sidebarIcon}>📅</span>
                <span style={styles.sidebarLabel}>Calendar</span>
                <span style={styles.sidebarArrow}>▼</span>
              </button>
            </div>

            <div>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeView === 'fees' ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveView('fees')}
              >
                <span style={styles.sidebarIcon}>💰</span>
                <span style={styles.sidebarLabel}>Fees Management</span>
                <span style={styles.sidebarArrow}>▼</span>
              </button>
            </div>

            <div>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeView === 'itemRequests' ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveView('itemRequests')}
              >
                <span style={styles.sidebarIcon}>📦</span>
                <span style={styles.sidebarLabel}>Item Requests</span>
                <span style={styles.sidebarArrow}>▼</span>
              </button>
            </div>
          </nav>
        </aside>

        <div style={styles.content}>
          {activeView === 'overview' && renderOverview()}
          {activeView === 'students' && renderStudents()}
          {activeView === 'teachers' && renderTeachers()}
          {activeView === 'assign' && renderAssignForm()}
          {activeView === 'calendar' && renderCalendar()}
          {activeView === 'fees' && <FeesManagement token={token} students={students} />}
          {activeView === 'itemRequests' && (
            <AdminItemRequests
              token={token}
              onRequestsChanged={() => {
                axios.get('/api/item-requests/unread-count', {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                })
                  .then((response) => setNotificationCount(response.data.unreadCount || 0))
                  .catch(() => setNotificationCount(0));
              }}
            />
          )}
        </div>
      </div>
      {renderStudentDetailModal()}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg)'
  },
  header: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    color: 'white',
    padding: '16px 24px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  studentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  avatarCircle: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    boxShadow: '0 12px 24px rgba(29, 78, 216, 0.25)'
  },
  studentId: {
    margin: '0',
    fontSize: '18px',
    fontWeight: '600'
  },
  version: {
    margin: '5px 0 0 0',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.72)',
    opacity: 0.8
  },
  headerIcons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.10)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#e2e8f0',
    boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)'
  },
  notificationBtn: {
    position: 'relative'
  },
  notificationBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    minWidth: '20px',
    height: '20px',
    padding: '0 5px',
    borderRadius: '999px',
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #0f172a'
  },
  logoutIconBtn: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  },
  mainContent: {
    display: 'flex',
    minHeight: 'calc(100vh - 100px)'
  },
  sidebar: {
    width: '280px',
    background: 'rgba(15, 23, 42, 0.96)',
    padding: '18px 0',
    overflowY: 'auto',
    borderRight: '1px solid rgba(148, 163, 184, 0.14)'
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px'
  },
  sidebarBtn: {
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    border: 'none',
    padding: '15px 20px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    borderLeft: '4px solid transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '0 14px 14px 0'
  },
  sidebarBtnActive: {
    backgroundColor: 'rgba(29, 78, 216, 0.16)',
    color: 'white',
    borderLeftColor: 'var(--brand)'
  },
  sidebarIcon: {
    fontSize: '16px',
    minWidth: '20px'
  },
  sidebarLabel: {
    flex: 1
  },
  sidebarArrow: {
    fontSize: '10px',
    opacity: 0.6
  },
  content: {
    flex: 1,
    padding: '28px',
    overflowY: 'auto',
    background: 'linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)'
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    padding: '30px',
    borderRadius: '24px',
    boxShadow: 'var(--shadow)',
    border: '1px solid rgba(226, 232, 240, 0.9)'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    color: '#1f2937'
  },
  tableWrap: {
    overflowX: 'auto',
    marginTop: '18px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    borderBottom: '1px solid var(--line)',
    padding: '12px 10px',
    backgroundColor: 'var(--surface-strong)',
    fontWeight: '600',
    color: 'var(--text)'
  },
  td: {
    padding: '12px 10px',
    borderBottom: '1px solid #edf2f7',
    color: '#334155'
  },
  highlightRow: {
    backgroundColor: 'rgba(29, 78, 216, 0.05)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    width: '100%',
    maxWidth: '980px',
    maxHeight: '88vh',
    overflowY: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px'
  },
  modalSubtext: {
    margin: '6px 0 0',
    color: '#6b7280'
  },
  closeBtn: {
    border: 'none',
    background: '#eef2f7',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '16px'
  },
  detailTabs: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '18px'
  },
  detailTabBtn: {
    border: '1px solid #d1d5db',
    backgroundColor: '#f8fafc',
    color: '#334155',
    borderRadius: '999px',
    padding: '8px 14px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  detailTabBtnActive: {
    backgroundColor: 'var(--brand)',
    color: 'white',
    borderColor: 'var(--brand)'
  },
  detailPanel: {
    backgroundColor: '#f8fafc',
    border: '1px solid var(--line)',
    borderRadius: '18px',
    padding: '18px'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '18px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid var(--line)',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: '#fff'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid var(--line)',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '18px'
  }
};

export default AdminDashboard;
