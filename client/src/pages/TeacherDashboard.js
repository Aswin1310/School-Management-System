import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ClassFeesView from '../components/ClassFeesView';

const TeacherDashboard = () => {
  const { user, token, logout } = useAuth();
  const [activeView, setActiveView] = useState('profile');
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [teacherProfile, setTeacherProfile] = useState(user);
  const [marksForm, setMarksForm] = useState({
    studentName: '',
    studentId: '',
    subjectName: '',
    marksObtained: '',
    maxMarks: '',
    examName: ''
  });
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [selectedDetailExam, setSelectedDetailExam] = useState('all');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedMentorClass, setSelectedMentorClass] = useState('');
  const [mentorStudents, setMentorStudents] = useState([]);
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [academicCalendar, setAcademicCalendar] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const allowedClasses = useMemo(() => teacherProfile?.allowedClasses || [], [teacherProfile?.allowedClasses]);
  const mentorClasses = useMemo(() => teacherProfile?.mentorFor || [], [teacherProfile?.mentorFor]);
  const isMentor = mentorClasses.length > 0;

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      try {
        const response = await axios.get('/api/teacher/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setTeacherProfile(response.data.teacher);
      } catch (err) {
        setTeacherProfile(user);
      }
    };

    if (token) {
      fetchTeacherProfile();
    }
  }, [token, user]);

  useEffect(() => {
    setPhoneInput(teacherProfile?.phone || '');
  }, [teacherProfile?.phone]);

  useEffect(() => {
    if (activeView === 'calendar') {
      const fetchCalendar = async () => {
        try {
          setCalendarLoading(true);
          const res = await axios.get('/api/calendar');
          setAcademicCalendar(res.data.entries || []);
        } catch (err) {
          setAcademicCalendar([]);
        } finally {
          setCalendarLoading(false);
        }
      };

      fetchCalendar();
    }
  }, [activeView]);

  const handlePhoneSave = async () => {
    const normalizedPhone = String(phoneInput || '').trim();

    if (normalizedPhone && !/^[0-9+()\-\s]{7,20}$/.test(normalizedPhone)) {
      setError('Please enter a valid phone number');
      setSuccess('');
      return false;
    }

    try {
      setPhoneSaving(true);
      setError('');
      setSuccess('');

      const response = await axios.put('/api/teacher/auth/me/phone', {
        phone: normalizedPhone
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const updatedPhone = response.data?.teacher?.phone || '';
      setTeacherProfile((previous) => ({
        ...previous,
        phone: updatedPhone
      }));
      setPhoneInput(updatedPhone);
      setSuccess('Phone number saved successfully');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save phone number');
      setSuccess('');
      return false;
    } finally {
      setPhoneSaving(false);
    }
  };

  const renderContent = () => {
    if (activeView === 'profile') {
      return (
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <span style={styles.sectionEyebrow}>Teacher Portal</span>
              <h3 style={styles.sectionTitle}>Welcome, {user?.name}!</h3>
            </div>
            <p style={styles.sectionDescription}>Review your assigned classes and mentor coverage.</p>
          </div>

          <div style={styles.detailCard}>
            <div style={styles.detailTopRow}>
              <div style={styles.detailPrimaryCol}>
                <p style={styles.detailLine}><strong>Teacher ID:</strong> <span style={styles.profileValue}>{teacherProfile?.teacherId || user?.teacherId || 'N/A'}</span></p>
                <p style={styles.detailLine}><strong>Name:</strong> <span style={styles.profileValue}>{teacherProfile?.name || user?.name || 'N/A'}</span></p>
                <p style={styles.detailLine}><strong>Email:</strong> <span style={styles.profileValue}>{teacherProfile?.email || user?.email || 'N/A'}</span></p>
                <p style={styles.detailLine}><strong>Assigned Classes:</strong> <span style={styles.profileValue}>{allowedClasses.length > 0 ? allowedClasses.join(', ') : 'No classes assigned yet'}</span></p>
                <p style={styles.detailLine}><strong>Mentor For:</strong> <span style={styles.profileValue}>{mentorClasses.length > 0 ? mentorClasses.join(', ') : 'None'}</span></p>
              </div>

              <div>
                {!isEditingPhone ? (
                  <button
                    type="button"
                    style={styles.detailActionBtn}
                    onClick={() => {
                      setPhoneInput(teacherProfile?.phone || '');
                      setIsEditingPhone(true);
                      setError('');
                      setSuccess('');
                    }}
                  >
                    Edit
                  </button>
                ) : (
                  <div style={styles.detailBtnRow}>
                    <button
                      type="button"
                      style={styles.detailActionBtn}
                      onClick={async () => {
                        const isSaved = await handlePhoneSave();
                        if (isSaved) {
                          setIsEditingPhone(false);
                        }
                      }}
                      disabled={phoneSaving}
                    >
                      {phoneSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.detailActionBtn, ...styles.detailCancelBtn }}
                      onClick={() => {
                        setPhoneInput(teacherProfile?.phone || '');
                        setIsEditingPhone(false);
                        setError('');
                      }}
                      disabled={phoneSaving}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!isEditingPhone ? (
              <p style={styles.detailLine}><strong>Phone:</strong> <span style={styles.profileValue}>{teacherProfile?.phone || 'Not provided'}</span></p>
            ) : (
              <div style={{ marginTop: '12px' }}>
                <label style={styles.label}>Phone</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(event) => setPhoneInput(event.target.value)}
                  style={styles.input}
                  placeholder="Enter phone number"
                />
                <p style={styles.helperText}>Allowed characters: digits, spaces, +, -, and parentheses.</p>
              </div>
            )}

            {error && <p style={styles.errorText}>{error}</p>}
            {success && <p style={styles.successText}>{success}</p>}
          </div>
        </div>
      );
    }

    if (activeView === 'students') {
      return (
        <div style={{ ...styles.card }}>
          <div style={styles.sectionHeader}>
            <div>
              <span style={styles.sectionEyebrow}>Class Management</span>
              <h3 style={styles.sectionTitle}>Students in Your Class</h3>
            </div>
            <p style={styles.sectionDescription}>Browse students in the class you are assigned to teach.</p>
          </div>
          {allowedClasses.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Choose class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={styles.select}
              >
                {allowedClasses.map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p style={{ color: '#c33' }}>{error}</p>}
          {!error && allowedClasses.length === 0 && <p>No classes assigned yet. Please contact the admin.</p>}
          {!error && allowedClasses.length > 0 && students.length === 0 && <p>No students found for this class.</p>}
          {students.length > 0 && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Roll No</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student._id} style={styles.studentItemRow}>
                      <td style={styles.td}>{student.name}</td>
                      <td style={styles.td}>{student.rollNo}</td>
                      <td style={styles.td}>{student.email}</td>
                      <td style={styles.td}>{student.className}</td>
                      <td style={styles.td}>
                        <button style={styles.viewBtn} onClick={() => fetchStudentDetails(student._id)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {detailModalOpen && (
            <div style={styles.modalOverlay} onClick={() => setDetailModalOpen(false)}>
              <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                  <h3>Student Details</h3>
                  <button style={styles.closeBtn} onClick={() => setDetailModalOpen(false)}>✕</button>
                </div>

                {detailLoading && <p>Loading...</p>}

                {detailData?.error && <p style={{ color: '#c33' }}>{detailData.error}</p>}

                {detailData && !detailLoading && !detailData.error && (
                  <div>
                    <div style={styles.card}>
                      <h4>{detailData.student.name} — {detailData.student.rollNo}</h4>
                      <p><strong>Email:</strong> {detailData.student.email}</p>
                      <p><strong>Class:</strong> {detailData.student.className}</p>
                      {!detailData.fullDetails && <p style={{ color: '#64748b' }}>Showing marks for your assigned subjects only.</p>}
                    </div>

                    <div style={{ ...styles.card, marginTop: '12px' }}>
                      <h4>Marks</h4>
                      {detailData.marks.length > 0 ? (
                        <>
                          <div style={{ marginBottom: '14px' }}>
                            <label style={styles.label}>Filter by exam name</label>
                            <select
                              value={selectedDetailExam}
                              onChange={(event) => setSelectedDetailExam(event.target.value)}
                              style={styles.select}
                            >
                              {detailExamOptions.map((examName) => (
                                <option key={examName} value={examName}>
                                  {examName}
                                </option>
                              ))}
                            </select>
                          </div>

                          {visibleDetailMarks.length > 0 ? (
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
                                  {visibleDetailMarks.map((m) => (
                                    <tr key={m.id}>
                                      <td style={styles.td}>{m.subjectName}</td>
                                      <td style={styles.td}>{m.examName}</td>
                                      <td style={styles.td}>{m.marksObtained}/{m.maxMarks}</td>
                                      <td style={styles.td}>{m.percentage}%</td>
                                      <td style={styles.td}>{m.recordedBy}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p>No marks found for the selected exam.</p>
                          )}
                        </>
                      ) : (
                        <p>No marks recorded for this student.</p>
                      )}
                    </div>

                    {detailData.fullDetails && (
                      <div style={{ ...styles.card, marginTop: '12px' }}>
                        <h4>Attendance</h4>
                        {detailData.attendance.length > 0 ? (
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
                                {detailData.attendance.map(a => (
                                  <tr key={a.id}>
                                    <td style={styles.td}>{new Date(a.date).toLocaleDateString()}</td>
                                    <td style={styles.td}>{a.status}</td>
                                    <td style={styles.td}>{a.recordedBy}</td>
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
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeView === 'marks') {
      return (
        <div>
          <div style={{ ...styles.card, marginTop: '20px' }}>
            <div style={styles.sectionHeader}>
              <div>
                <span style={styles.sectionEyebrow}>Academic</span>
                <h3 style={styles.sectionTitle}>Record Subject Marks</h3>
              </div>
              <p style={styles.sectionDescription}>Record marks cleanly by student and exam.</p>
            </div>
            {success && <p style={{ color: '#1a7f37' }}>{success}</p>}
            <form onSubmit={handleMarksSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Student Name</label>
                <input
                  type="text"
                  value={marksForm.studentName}
                  onChange={(event) => setMarksForm({ ...marksForm, studentName: event.target.value })}
                  style={styles.select}
                  placeholder="Type student name"
                  list="student-name-list"
                  required
                />
                <datalist id="student-name-list">
                  {students.map((student) => (
                    <option key={student.id || student._id} value={student.name} />
                  ))}
                </datalist>
                <p style={styles.helperText}>Type the student name exactly as it appears in the class list.</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Subject Name</label>
                <input
                  type="text"
                  value={marksForm.subjectName}
                  onChange={(event) => setMarksForm({ ...marksForm, subjectName: event.target.value })}
                  style={styles.input}
                  placeholder="Type Subject Name"
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroupHalf}>
                  <label style={styles.label}>Marks Obtained</label>
                  <input
                    type="number"
                    value={marksForm.marksObtained}
                    onChange={(event) => setMarksForm({ ...marksForm, marksObtained: event.target.value })}
                    style={styles.input}
                    min="0"
                    required
                  />
                </div>

                <div style={styles.formGroupHalf}>
                  <label style={styles.label}>Maximum Marks</label>
                  <input
                    type="number"
                    value={marksForm.maxMarks}
                    onChange={(event) => setMarksForm({ ...marksForm, maxMarks: event.target.value })}
                    style={styles.input}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Exam Name</label>
                <input
                  type="text"
                  value={marksForm.examName}
                  onChange={(event) => setMarksForm({ ...marksForm, examName: event.target.value })}
                  style={styles.input}
                  placeholder="Mid Term"
                />
              </div>

              <button type="submit" style={styles.submitBtn}>Save Marks</button>
            </form>
          </div>
        </div>
      );
    }

    if (activeView === 'attendance') {
      return (
        <div>
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <span style={styles.sectionEyebrow}>Mentor Tools</span>
                <h3 style={styles.sectionTitle}>Mark Attendance for Your Class</h3>
              </div>
              <p style={styles.sectionDescription}>Record attendance for the classes you mentor.</p>
            </div>
            {success && <p style={{ color: '#1a7f37', fontWeight: 600, marginBottom: '12px' }}>✓ {success}</p>}
            {error && <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '12px' }}>✗ {error}</p>}

            <div style={styles.formRow}>
              <div style={styles.formGroupHalf}>
                <label style={styles.label}>Class</label>
                <select
                  value={selectedMentorClass}
                  onChange={(e) => {
                    setSelectedMentorClass(e.target.value);
                    setAttendanceData({});
                  }}
                  style={styles.select}
                >
                  <option value="">Select class</option>
                  {mentorClasses.map((className) => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroupHalf}>
                <label style={styles.label}>Attendance Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={styles.select}
                />
              </div>
            </div>

            {selectedMentorClass && mentorStudents.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '12px' }}>Students in {selectedMentorClass}</h4>
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Roll No</th>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mentorStudents.map((student) => (
                        <tr key={student._id} style={styles.studentItemRow}>
                          <td style={styles.td}>{student.rollNo}</td>
                          <td style={styles.td}>{student.name}</td>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setAttendanceData({ ...attendanceData, [student._id]: 'present' })}
                                style={{
                                  ...styles.attendanceBtn,
                                  ...(attendanceData[student._id] === 'present' ? styles.attendanceBtnPresent : {}),
                                  backgroundColor: attendanceData[student._id] === 'present' ? '#10b981' : '#e5e7eb',
                                  color: attendanceData[student._id] === 'present' ? 'white' : '#374151'
                                }}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => setAttendanceData({ ...attendanceData, [student._id]: 'absent' })}
                                style={{
                                  ...styles.attendanceBtn,
                                  ...(attendanceData[student._id] === 'absent' ? styles.attendanceBtnAbsent : {}),
                                  backgroundColor: attendanceData[student._id] === 'absent' ? '#1e40af' : '#e5e7eb',
                                  color: attendanceData[student._id] === 'absent' ? 'white' : '#374151'
                                }}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleAttendanceSubmit}
                  disabled={attendanceSubmitting}
                  style={{
                    ...styles.submitBtn,
                    opacity: attendanceSubmitting ? 0.6 : 1,
                    cursor: attendanceSubmitting ? 'not-allowed' : 'pointer',
                    marginTop: '20px'
                  }}
                >
                  {attendanceSubmitting ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            )}

            {selectedMentorClass && mentorStudents.length === 0 && (
              <p style={{ marginTop: '20px', color: '#64748b' }}>No students found in this class.</p>
            )}

            {!selectedMentorClass && (
              <p style={{ marginTop: '20px', color: '#64748b' }}>Select a class to view and mark attendance.</p>
            )}
          </div>
        </div>
      );
    }

    if (activeView === 'calendar') {
      return (
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <span style={styles.sectionEyebrow}>Schedule</span>
              <h3 style={styles.sectionTitle}>Academic Calendar</h3>
            </div>
            <p style={styles.sectionDescription}>View school calendar for working days, leaves, and holidays.</p>
          </div>

          {calendarLoading && <p>Loading calendar...</p>}
          {!calendarLoading && academicCalendar.length > 0 && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {academicCalendar.map((entry) => (
                    <tr key={entry._id}>
                      <td style={styles.td}>{new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                      <td style={{...styles.td, ...{
                        backgroundColor: entry.type === 'holiday' ? '#93c5fd' : entry.type === 'leave' ? '#bfdbfe' : '#dbeafe',
                        color: '#0c2340',
                        fontWeight: 600,
                        borderRadius: '6px',
                        padding: '6px 10px',
                        textAlign: 'center'
                      }}}>
                        {entry.type === 'working' ? '🏫' : entry.type === 'leave' ? '🏖️' : '🎉'} {entry.type === 'working' ? 'Working' : entry.type === 'leave' ? 'Leave' : 'Holiday'}
                      </td>
                      <td style={styles.td}>{entry.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!calendarLoading && academicCalendar.length === 0 && (
            <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '20px' }}>No calendar entries available yet.</p>
          )}
        </div>
      );
    }

    if (activeView === 'fees') {
      const feesClass = selectedMentorClass || (mentorClasses.length > 0 ? mentorClasses[0] : '');
      return (
        <div style={styles.card}>
          {!isMentor ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              <p>You need to be assigned as a mentor for a class to view fees information.</p>
            </div>
          ) : (
            <>
              {mentorClasses.length > 1 && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.label}>Select Class</label>
                  <select
                    value={selectedMentorClass}
                    onChange={(e) => setSelectedMentorClass(e.target.value)}
                    style={styles.input}
                  >
                    {mentorClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              )}
              <ClassFeesView userClass={feesClass} token={token} />
            </>
          )}
        </div>
      );
    }

    return (
      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <span style={styles.sectionEyebrow}>Teacher Portal</span>
            <h3 style={styles.sectionTitle}>Profile</h3>
          </div>
          <p style={styles.sectionDescription}>A quick overview of your teacher account.</p>
        </div>
        <div style={styles.profileGrid}>
          <div style={styles.profileItem}><span style={styles.profileLabel}>Name</span><strong style={styles.profileValue}>{teacherProfile?.name}</strong></div>
          <div style={styles.profileItem}><span style={styles.profileLabel}>Teacher ID</span><strong style={styles.profileValue}>{teacherProfile?.teacherId}</strong></div>
          <div style={styles.profileItem}><span style={styles.profileLabel}>Email</span><strong style={styles.profileValue}>{teacherProfile?.email}</strong></div>
          <div style={styles.profileItem}><span style={styles.profileLabel}>Phone</span><strong style={styles.profileValue}>{teacherProfile?.phone || 'Not provided'}</strong></div>
        </div>
      </div>
    );
  };

  const fetchStudentDetails = async (studentId) => {
    try {
      setDetailLoading(true);
      setDetailData(null);
      setDetailModalOpen(true);
      setSelectedDetailExam('');

      const response = await axios.get(`/api/teacher/auth/student/${studentId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDetailData(response.data);
    } catch (err) {
      setDetailData({ error: err.response?.data?.message || 'Unable to load student details' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAttendanceSubmit = async () => {
    try {
      setError('');
      setSuccess('');

      const now = new Date();
      const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (attendanceDate > todayString) {
        setError('Future dates are not allowed for attendance');
        return;
      }

      // Check if any student has been marked
      if (Object.keys(attendanceData).length === 0) {
        setError('Please mark attendance for at least one student');
        return;
      }

      setAttendanceSubmitting(true);

      // Submit attendance for each student
      const promises = mentorStudents
        .filter((student) => attendanceData[student._id])
        .map((student) =>
          axios.post(
            '/api/attendance/record',
            {
              studentId: student._id,
              date: attendanceDate,
              status: attendanceData[student._id]
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          )
        );

      await Promise.all(promises);

      setSuccess(`Attendance marked successfully for ${promises.length} student(s)`);
      setAttendanceData({});
      setAttendanceDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save attendance');
    } finally {
      setAttendanceSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchMentorStudents = async () => {
      try {
        if (!selectedMentorClass) {
          setMentorStudents([]);
          return;
        }

        const response = await axios.get('/api/teacher/auth/students', {
          params: { className: selectedMentorClass },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setMentorStudents(response.data.students || []);
        setError('');
      } catch (err) {
        setMentorStudents([]);
        setError(err.response?.data?.message || 'Unable to load students');
      }
    };

    if (selectedMentorClass && token) {
      fetchMentorStudents();
    }
  }, [selectedMentorClass, token]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsResponse = await axios.get('/api/teacher/auth/students', {
          params: selectedClass ? { className: selectedClass } : {},
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setStudents(studentsResponse.data.students || []);
        setError('');
        setSuccess('');
        if (!selectedClass && studentsResponse.data.className) {
          setSelectedClass(studentsResponse.data.className);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load students');
        setStudents([]);
      }
    };

    if (token) {
      fetchStudents();
    }
  }, [token, selectedClass]);

  useEffect(() => {
    if (!selectedClass && allowedClasses.length > 0) {
      setSelectedClass(allowedClasses[0]);
    }
  }, [allowedClasses, selectedClass]);

  useEffect(() => {
    if (marksForm.studentName) {
      const matchedStudent = students.find((student) => student.name.toLowerCase() === marksForm.studentName.trim().toLowerCase());

      setMarksForm((previous) => ({
        ...previous,
        studentId: matchedStudent ? (matchedStudent.id || matchedStudent._id || '') : ''
      }));
    }
  }, [students, marksForm.studentName]);

  const handleMarksSubmit = async (event) => {
    event.preventDefault();

    try {
      setError('');
      setSuccess('');

      const matchedStudent = students.find((student) => student.name.toLowerCase() === marksForm.studentName.trim().toLowerCase());

      if (!matchedStudent) {
        setError('Please type a valid student name from the selected class');
        return;
      }

      await axios.post('/api/marks/record', {
        ...marksForm,
        studentId: matchedStudent.id || matchedStudent._id || ''
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSuccess('Marks recorded successfully');
      setMarksForm((previous) => ({
        ...previous,
        studentName: '',
        studentId: '',
        subjectName: '',
        marksObtained: '',
        maxMarks: '',
        examName: ''
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to record marks');
    }
  };

  const detailExamOptions = useMemo(() => {
    return detailData?.marks
      ? Array.from(new Set(detailData.marks.map((mark) => String(mark.examName || '').trim()).filter(Boolean)))
      : [];
  }, [detailData?.marks]);

  useEffect(() => {
    if (!detailModalOpen) {
      return;
    }

    if (detailExamOptions.length === 0) {
      setSelectedDetailExam('');
      return;
    }

    if (!selectedDetailExam || !detailExamOptions.includes(selectedDetailExam)) {
      setSelectedDetailExam(detailExamOptions[0]);
    }
  }, [detailModalOpen, detailExamOptions, selectedDetailExam]);

  const visibleDetailMarks = detailData?.marks
    ? detailData.marks.filter((mark) => {
        return String(mark.examName || '').trim().toLowerCase() === selectedDetailExam.toLowerCase();
      })
    : [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.studentInfo}>
            <div style={styles.avatarCircle}>{user?.name?.[0]?.toUpperCase() || 'T'}</div>
            <div>
              <h2 style={styles.studentId}>{user?.teacherId || 'Teacher'}</h2>
              <p style={styles.version}>{user?.name}</p>
            </div>
          </div>
          <div style={styles.headerIcons}>
            <button style={styles.iconBtn} title="Refresh">🔄</button>
            <button style={styles.iconBtn} title="Dashboard">✨</button>
            <button style={styles.iconBtn} title="Home">🏠</button>
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
                  ...(activeView === 'profile' ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveView('profile')}
              >
                <span style={styles.sidebarIcon}>🧾</span>
                <span style={styles.sidebarLabel}>Profile</span>
                <span style={styles.sidebarArrow}>▼</span>
              </button>
            </div>

            <div>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeView === 'students' ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveView('students')}
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
                  ...(activeView === 'marks' ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveView('marks')}
              >
                <span style={styles.sidebarIcon}>✏️</span>
                <span style={styles.sidebarLabel}>Marks</span>
                <span style={styles.sidebarArrow}>▼</span>
              </button>
            </div>

            {isMentor && (
              <div>
                <button
                  style={{
                    ...styles.sidebarBtn,
                    ...(activeView === 'attendance' ? styles.sidebarBtnActive : {}),
                    backgroundColor: activeView === 'attendance' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                    borderLeftColor: activeView === 'attendance' ? '#10b981' : 'transparent'
                  }}
                  onClick={() => setActiveView('attendance')}
                >
                  <span style={styles.sidebarIcon}>📋</span>
                  <span style={styles.sidebarLabel}>Attendance</span>
                  <span style={styles.sidebarArrow}>▼</span>
                </button>
              </div>
            )}

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

            {isMentor && (
              <div>
                <button
                  style={{
                    ...styles.sidebarBtn,
                    ...(activeView === 'fees' ? styles.sidebarBtnActive : {})
                  }}
                  onClick={() => setActiveView('fees')}
                >
                  <span style={styles.sidebarIcon}>💰</span>
                  <span style={styles.sidebarLabel}>Fees</span>
                  <span style={styles.sidebarArrow}>▼</span>
                </button>
              </div>
            )}

          </nav>
        </aside>

        <div style={styles.content}>{renderContent()}</div>
      </div>
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
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: '30px',
    borderRadius: '24px',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
    border: '1px solid rgba(226, 232, 240, 0.85)'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '700',
    color: 'var(--text)',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
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
  select: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1.5px solid var(--line)',
    fontSize: '14px',
    backgroundColor: '#fff',
    color: 'var(--text)'
  },
  examSelector: {
    marginTop: '18px',
    padding: '20px',
    borderRadius: '20px',
    background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(241, 245, 249, 0.92) 100%)',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)'
  },
  summaryCard: {
    padding: '20px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(238, 246, 255, 0.96) 0%, rgba(248, 250, 252, 0.98) 100%)',
    border: '1px solid rgba(191, 219, 254, 0.9)',
    boxShadow: '0 14px 28px rgba(37, 99, 235, 0.08)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '18px'
  },
  sectionEyebrow: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#2563eb',
    marginBottom: '6px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '26px',
    lineHeight: 1.1,
    color: 'var(--text)',
    letterSpacing: '-0.03em'
  },
  sectionDescription: {
    margin: 0,
    maxWidth: '360px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    lineHeight: 1.6,
    textAlign: 'right'
  },
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px'
  },
  profileItem: {
    padding: '14px 16px',
    borderRadius: '16px',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    border: '1px solid rgba(226, 232, 240, 0.9)'
  },
  profileValue: {
    display: 'block',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    lineHeight: 1.35,
    color: '#0f172a'
  },
  profileLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: '8px'
  },
  detailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.06)',
    border: '1px solid rgba(226, 232, 240, 0.9)'
  },
  detailTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '14px',
    flexWrap: 'wrap'
  },
  detailPrimaryCol: {
    minWidth: '260px',
    flex: 1
  },
  detailLine: {
    marginTop: 0,
    marginBottom: '10px',
    color: '#1f2937',
    lineHeight: 1.45
  },
  detailBtnRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  detailActionBtn: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(148, 163, 184, 0.5)',
    backgroundColor: '#fff',
    color: '#0f172a',
    cursor: 'pointer',
    fontWeight: 600
  },
  detailCancelBtn: {
    color: '#475569'
  },
  successText: {
    color: '#15803d',
    fontWeight: 600,
    marginTop: '14px',
    marginBottom: 0
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: 600,
    marginTop: '14px',
    marginBottom: 0
  },
  attendanceBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '15px',
    marginTop: '20px'
  },
  statBox: {
    padding: '20px',
    borderRadius: '16px',
    color: 'white',
    textAlign: 'center',
    boxShadow: '0 14px 24px rgba(15, 23, 42, 0.12)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  formGroupHalf: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid var(--line)',
    fontSize: '14px',
    backgroundColor: '#fff'
  },
  helperText: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px'
  },
  submitBtn: {
    padding: '12px 24px',
    backgroundColor: 'var(--brand)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 20px rgba(29, 78, 216, 0.22)'
  },
  viewBtn: {
    padding: '6px 12px',
    backgroundColor: 'rgba(29, 78, 216, 0.1)',
    color: 'var(--brand)',
    border: '1px solid var(--brand)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  studentItemRow: {
    backgroundColor: '#fafbfc'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '24px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px rgba(15, 23, 42, 0.15)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--line)',
    paddingBottom: '12px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#64748b'
  },
  attendanceBtn: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  attendanceBtnPresent: {
    backgroundColor: '#10b981',
    color: 'white'
  },
  attendanceBtnAbsent: {
    backgroundColor: '#1e40af',
    color: 'white'
  }
};

export default TeacherDashboard;
