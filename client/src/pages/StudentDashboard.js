import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import StudentFeesView from '../components/StudentFeesView';
import StudentItemRequest from '../components/StudentItemRequest';

const StudentDashboard = () => {
  const { user, token, logout } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [marksSummary, setMarksSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('attendance');
  const [selectedExam, setSelectedExam] = useState('');
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({ phone: '', fatherName: '', motherName: '' });
  const [subjectTeachers, setSubjectTeachers] = useState(null);
  const [subjectTeachersLoading, setSubjectTeachersLoading] = useState(false);
  const [subjectTeachersError, setSubjectTeachersError] = useState('');
  const [academicCalendar, setAcademicCalendar] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const menuItems = [
    { id: 'attendance', label: 'Attendance', icon: '📊', view: 'attendance' },
    { id: 'marks', label: 'Exam Marks', icon: '📚', view: 'marks' },
    { id: 'rank', label: 'Class Rank', icon: '🏆', view: 'rank' },
    { id: 'subjectTeachers', label: 'Subject Teachers', icon: '👩‍🏫', view: 'subjectTeachers' },
    { id: 'details', label: 'Student Detail', icon: '🧾', view: 'details' },
    { id: 'calendar', label: 'Calendar', icon: '📅', view: 'calendar' },
    { id: 'fees', label: 'My Fees', icon: '💰', view: 'fees' },
    { id: 'itemRequest', label: 'Item Request', icon: '📦', view: 'itemRequest' }
  ];

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const [attendanceResponse, attendanceRankingResponse] = await Promise.all([
          axios.get('/api/attendance/percentage', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          axios.get('/api/attendance/ranking', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        ]);

        setAttendance(attendanceResponse.data);
        setMarksSummary((previous) => ({
          ...(previous || {}),
          attendanceRanking: attendanceRankingResponse.data.attendanceRanking,
          attendanceRank: attendanceRankingResponse.data.attendanceRank
        }));
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load student dashboard data');
      }
    };

    if (token) {
      fetchAttendanceData();
    }
  }, [token]);

  useEffect(() => {
    const fetchSubjectTeachers = async () => {
      try {
        setSubjectTeachersLoading(true);
        setSubjectTeachersError('');

        const response = await axios.get('/api/student/auth/subject-teachers', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setSubjectTeachers(response.data);
      } catch (err) {
        setSubjectTeachersError(err.response?.data?.message || 'Unable to load subject teachers');
      } finally {
        setSubjectTeachersLoading(false);
      }
    };

    if (token && activeView === 'subjectTeachers') {
      fetchSubjectTeachers();
    }
  }, [token, activeView]);

  useEffect(() => {
    const fetchMarksSummary = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await axios.get('/api/marks/summary', {
          params: selectedExam ? { examName: selectedExam } : {},
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setMarksSummary((previous) => ({
          ...(previous || {}),
          ...response.data,
          attendanceRanking: previous?.attendanceRanking || [],
          attendanceRank: previous?.attendanceRank || null
        }));

        const availableExams = response.data.availableExams || [];
        if (!selectedExam && availableExams.length > 0) {
          setSelectedExam(availableExams[0]);
        } else if (selectedExam && availableExams.length > 0 && !availableExams.includes(selectedExam)) {
          setSelectedExam(availableExams[0]);
        } else if (availableExams.length === 0 && selectedExam) {
          setSelectedExam('');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load student marks');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchMarksSummary();
    }
  }, [token, selectedExam]);

  const toggleMenu = (menuId) => {
    setExpandedMenu(expandedMenu === menuId ? null : menuId);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setDetailsLoading(true);
        const res = await axios.get('/api/student/auth/me/details', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setStudentDetails(res.data);
      } catch (err) {
        setStudentDetails({ error: err.response?.data?.message || 'Unable to load student details' });
      } finally {
        setDetailsLoading(false);
      }
    };

    if (token && activeView === 'details') {
      fetchDetails();
    }
  }, [token, activeView]);

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

  const handleDetailsChange = (e) => {
    const { name, value } = e.target;
    setDetailsForm(prev => ({ ...prev, [name]: value }));
  };

  const saveDetails = async () => {
    try {
      const response = await axios.put('/api/student/auth/me/details', detailsForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStudentDetails(response.data);
      setIsEditingDetails(false);
    } catch (err) {
      console.error('Failed to save details', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to save details');
    }
  };

  const renderContent = () => {
    if (activeView === 'dashboard') {
      return (
        <>
          <div style={styles.card}>
            <h2>Welcome, {user?.name}!</h2>
            <p><strong>Class:</strong> {user?.className}</p>
            <p><strong>Roll Number:</strong> {user?.rollNo}</p>
            <p><strong>Email:</strong> {user?.email}</p>
          </div>

          <div style={{ ...styles.card, marginTop: '20px' }}>
            <h3>📝 Subject Marks</h3>
            {marksSummary && marksSummary.subjectMarks && marksSummary.subjectMarks.length > 0 ? (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Subject</th>
                      <th style={styles.th}>Exam</th>
                      <th style={styles.th}>Marks</th>
                      <th style={styles.th}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksSummary.subjectMarks.map((mark) => (
                      <tr key={mark.id}>
                        <td style={styles.td}>{mark.subjectName}</td>
                        <td style={styles.td}>{mark.examName}</td>
                        <td style={styles.td}>{mark.marksObtained}/{mark.maxMarks}</td>
                        <td style={styles.td}>{mark.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              !loading && <p>No marks recorded yet.</p>
            )}
          </div>

          <div style={{ ...styles.card, marginTop: '20px' }}>
            <h3>📊 Attendance Overview</h3>
            {attendance && !loading && (
              <div>
                <div style={styles.attendanceBox}>
                  <div style={{ ...styles.statBox, ...styles.statPercentage }}>
                    <span style={styles.statLabel}>Attendance</span>
                    <h4 style={styles.statValue}>{attendance.attendancePercentage}%</h4>
                    <p style={styles.statCaption}>Overall attendance rate</p>
                  </div>
                  <div style={{ ...styles.statBox, ...styles.statPresent }}>
                    <span style={styles.statLabel}>Present</span>
                    <h4 style={styles.statValue}>{attendance.presentDays}</h4>
                    <p style={styles.statCaption}>Days attended</p>
                  </div>
                  <div style={{ ...styles.statBox, ...styles.statAbsent }}>
                    <span style={styles.statLabel}>Absent</span>
                    <h4 style={styles.statValue}>{attendance.absentDays}</h4>
                    <p style={styles.statCaption}>Missed days</p>
                  </div>
                </div>
                <p style={styles.totalDaysText}>Total Days: <strong>{attendance.totalDays}</strong></p>
              </div>
            )}
          </div>
        </>
      );
    } else if (activeView === 'marks') {
      const availableExams = marksSummary?.availableExams || [];

      return (
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <span style={styles.sectionEyebrow}>Academic</span>
              <h3 style={styles.sectionTitle}>Exam Marks</h3>
            </div>
            <p style={styles.sectionDescription}>View subject-wise marks for a selected exam.</p>
          </div>
          {loading && <p>Loading marks data...</p>}
          {error && <p style={{ color: '#c33' }}>{error}</p>}
          {!loading && (
            <>
              <div style={styles.examSelector}>
                <label style={styles.label}>Select exam</label>
                {availableExams.length > 0 ? (
                  <select
                    value={selectedExam}
                    onChange={(event) => setSelectedExam(event.target.value)}
                    style={styles.select}
                  >
                    {availableExams.map((examName) => (
                      <option key={examName} value={examName}>
                        {examName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p>No exams recorded yet.</p>
                )}
                <p style={styles.helperText}>Choose any exam to view the subject marks for that exam.</p>
              </div>

              {marksSummary && marksSummary.subjectMarks && marksSummary.subjectMarks.length > 0 ? (
                <div style={{ ...styles.tableWrap, marginTop: '20px' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Subject</th>
                        <th style={styles.th}>Exam</th>
                        <th style={styles.th}>Marks</th>
                        <th style={styles.th}>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marksSummary.subjectMarks.map((mark) => (
                        <tr key={mark.id}>
                          <td style={styles.td}>{mark.subjectName}</td>
                          <td style={styles.td}>{mark.examName}</td>
                          <td style={styles.td}>{mark.marksObtained}/{mark.maxMarks}</td>
                          <td style={styles.td}>{mark.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No marks recorded yet for the selected exam.</p>
              )}
            </>
          )}
        </div>
      );
    } else if (activeView === 'attendance') {
      return (
        <div style={styles.card}>
          <h3>📊 Attendance Overview with Rank</h3>
          {loading && <p>Loading attendance data...</p>}
          {error && <p style={{ color: '#c33' }}>{error}</p>}
          {attendance && !loading && (
            <div>
              <div style={styles.attendanceBox}>
                <div style={{ ...styles.statBox, ...styles.statPercentage }}>
                  <span style={styles.statLabel}>Attendance</span>
                  <h4 style={styles.statValue}>{attendance.attendancePercentage}%</h4>
                  <p style={styles.statCaption}>Overall attendance rate</p>
                </div>
                <div style={{ ...styles.statBox, ...styles.statPresent }}>
                  <span style={styles.statLabel}>Present</span>
                  <h4 style={styles.statValue}>{attendance.presentDays}</h4>
                  <p style={styles.statCaption}>Days attended</p>
                </div>
                <div style={{ ...styles.statBox, ...styles.statAbsent }}>
                  <span style={styles.statLabel}>Absent</span>
                  <h4 style={styles.statValue}>{attendance.absentDays}</h4>
                  <p style={styles.statCaption}>Missed days</p>
                </div>
              </div>
              <p style={styles.totalDaysText}>Total Days: <strong>{attendance.totalDays}</strong></p>
            </div>
          )}
        </div>
      );
    } else if (activeView === 'rank') {
      const availableExams = marksSummary?.availableExams || [];
      const selectedExamName = marksSummary?.selectedExam || selectedExam;

      return (
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <span style={styles.sectionEyebrow}>Performance</span>
              <h3 style={styles.sectionTitle}>Exam Rank</h3>
            </div>
            <p style={styles.sectionDescription}>Compare your score against the class ranking for an exam.</p>
          </div>
          {loading && <p>Loading ranking data...</p>}
          {error && <p style={{ color: '#c33' }}>{error}</p>}

          <div style={styles.examSelector}>
            <label style={styles.label}>Select exam</label>
            {availableExams.length > 0 ? (
              <select
                value={selectedExam}
                onChange={(event) => setSelectedExam(event.target.value)}
                style={styles.select}
              >
                {availableExams.map((examName) => (
                  <option key={examName} value={examName}>
                    {examName}
                  </option>
                ))}
              </select>
            ) : (
              <p>No exams recorded yet.</p>
            )}
            <p style={styles.helperText}>Choose an exam to view your rank and the exam ranking.</p>
          </div>

          {selectedExamName && marksSummary?.studentExamRank ? (
            <div style={{ ...styles.summaryCard, marginTop: '16px' }}>
              <span style={styles.summaryLabel}>{selectedExamName}</span>
              <h4 style={styles.summaryTitle}>Your Rank</h4>
              <div style={styles.summaryStats}>
                <div style={styles.summaryStatItem}>
                  <span style={styles.summaryStatValue}>#{marksSummary.studentExamRank.rank}</span>
                  <span style={styles.summaryStatLabel}>Class Position</span>
                </div>
                <div style={styles.summaryStatItem}>
                  <span style={styles.summaryStatValue}>{marksSummary.studentExamRank.totalObtained}</span>
                  <span style={styles.summaryStatLabel}>Marks Obtained</span>
                </div>
                <div style={styles.summaryStatItem}>
                  <span style={styles.summaryStatValue}>{marksSummary.studentExamRank.totalMaximum}</span>
                  <span style={styles.summaryStatLabel}>Maximum Marks</span>
                </div>
              </div>
            </div>
          ) : (
            !loading && <p>No ranking available for the selected exam.</p>
          )}

          {selectedExamName && marksSummary?.examRanking && marksSummary.examRanking.length > 0 && (
            <div style={styles.rankTableCard}>
              <div style={styles.rankTableHeader}>
                <h4 style={{ margin: 0 }}>Exam Ranking</h4>
                <span style={styles.rankTableMeta}>{marksSummary.examRanking.length} students</span>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Rank</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Roll No</th>
                      <th style={styles.th}>Total Marks</th>
                      <th style={styles.th}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksSummary.examRanking.map((studentRank) => (
                      <tr
                        key={studentRank.studentId}
                        style={studentRank.studentId === marksSummary.studentExamRank?.studentId ? styles.highlightRow : undefined}
                      >
                        <td style={styles.td}>{studentRank.rank}</td>
                        <td style={styles.td}>{studentRank.studentName}</td>
                        <td style={styles.td}>{studentRank.rollNo}</td>
                        <td style={styles.td}>{studentRank.totalObtained}</td>
                        <td style={styles.td}>{studentRank.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fallback: show class ranking if no exam selected or available */}
          {!selectedExamName && marksSummary && marksSummary.studentRank && (
            <div style={{ ...styles.summaryCard, marginTop: 20 }}>
              <span style={styles.summaryLabel}>Class Ranking</span>
              <h4 style={styles.summaryTitle}>Your Class Rank</h4>
              <p>
                Your class rank is <strong>#{marksSummary.studentRank.rank}</strong> with total marks <strong>{marksSummary.studentRank.totalObtained}</strong>.
              </p>

              {marksSummary.classRanking && marksSummary.classRanking.length > 0 && (
                <div style={{ ...styles.rankTableCard, marginTop: '16px' }}>
                  {(() => {
                    const orderedRanking = [...marksSummary.classRanking].sort((a, b) => a.rank - b.rank);
                    return (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Rank</th>
                            <th style={styles.th}>Name</th>
                            <th style={styles.th}>Roll No</th>
                            <th style={styles.th}>Total Marks</th>
                            <th style={styles.th}>%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderedRanking.map((studentRank) => (
                            <tr key={studentRank.studentId} style={studentRank.studentId === marksSummary.studentRank?.studentId ? styles.highlightRow : undefined}>
                              <td style={styles.td}>{studentRank.rank}</td>
                              <td style={styles.td}>{studentRank.studentName}</td>
                              <td style={styles.td}>{studentRank.rollNo}</td>
                              <td style={styles.td}>{studentRank.totalObtained}</td>
                              <td style={styles.td}>{studentRank.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else if (activeView === 'subjectTeachers') {
      return (
        <div style={styles.card}>
          <h3>👩‍🏫 Subject Teachers</h3>
          {subjectTeachersLoading && <p>Loading subject teachers...</p>}
          {subjectTeachersError && <p style={{ color: '#c33' }}>{subjectTeachersError}</p>}
          {!subjectTeachersLoading && !subjectTeachersError && (
            <>
              <div style={styles.examSelector}>
                <label style={styles.label}>Class</label>
                <input
                  value={subjectTeachers?.className || user?.className || ''}
                  readOnly
                  style={styles.select}
                />
                <p style={styles.helperText}>This shows the teachers assigned to your current class subjects.</p>
              </div>

              {subjectTeachers?.subjectTeachers?.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Subject</th>
                        <th style={styles.th}>Teacher Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectTeachers.subjectTeachers.flatMap((entry) =>
                        entry.teachers.map((teacher) => (
                          <tr key={`${entry.subjectName}-${teacher.teacherId}`}>
                            <td style={styles.td}>{entry.subjectName}</td>
                            <td style={styles.td}>
                              {teacher.teacherName}
                              {teacher.isMentor ? <span style={{ marginLeft: 8, color: '#1d4ed8', fontSize: 12 }}>(Mentor)</span> : null}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No subject teachers have been assigned to your class yet.</p>
              )}
            </>
          )}
        </div>
      );
    }
    else if (activeView === 'details') {
      return (
        <div style={styles.card}>
          <h3>Student Detail</h3>
          {detailsLoading && <p>Loading details...</p>}
          {!detailsLoading && studentDetails?.error && <p style={{ color: '#c33' }}>{studentDetails.error}</p>}
          {!detailsLoading && studentDetails && !studentDetails.error && (
            <div>
              <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p><strong>Roll No:</strong> {studentDetails.student.rollNo}</p>
                    <p><strong>Name:</strong> {studentDetails.student.name}</p>
                    <p><strong>Class:</strong> {studentDetails.student.className}</p>
                  </div>
                  <div>
                    {!isEditingDetails ? (
                      <button style={{ padding: '8px 12px', borderRadius: 6 }} onClick={() => {
                        setDetailsForm({
                          phone: studentDetails.student.phone || '',
                          fatherName: studentDetails.student.fatherName || '',
                          motherName: studentDetails.student.motherName || ''
                        });
                        setIsEditingDetails(true);
                      }}>Edit</button>
                    ) : (
                      <div>
                        <button style={{ padding: '8px 12px', marginRight: 8 }} onClick={saveDetails}>Save</button>
                        <button style={{ padding: '8px 12px' }} onClick={() => setIsEditingDetails(false)}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>

                {!isEditingDetails ? (
                  <>
                    <p><strong>Phone:</strong> {studentDetails.student.phone || 'Not provided'}</p>
                    <p><strong>Father's Name:</strong> {studentDetails.student.fatherName || 'Not provided'}</p>
                    <p><strong>Mother's Name:</strong> {studentDetails.student.motherName || 'Not provided'}</p>
                    <p><strong>Mentor:</strong> {studentDetails.mentor ? studentDetails.mentor.name : 'Not assigned'}</p>
                  </>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <label style={styles.label}>Phone</label>
                    <input name="phone" value={detailsForm.phone} onChange={handleDetailsChange} style={{ padding: '8px', width: '100%', marginBottom: 8 }} />
                    <label style={styles.label}>Father's Name</label>
                    <input name="fatherName" value={detailsForm.fatherName} onChange={handleDetailsChange} style={{ padding: '8px', width: '100%', marginBottom: 8 }} />
                    <label style={styles.label}>Mother's Name</label>
                    <input name="motherName" value={detailsForm.motherName} onChange={handleDetailsChange} style={{ padding: '8px', width: '100%', marginBottom: 8 }} />
                  </div>
                )}
              </div>
            </div>
          )}
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
      return (
        <div style={styles.card}>
          <StudentFeesView studentId={user?.id || user?._id} token={token} />
        </div>
      );
    }

    if (activeView === 'itemRequest') {
      return (
        <div style={styles.card}>
          <StudentItemRequest studentId={user?.id || user?._id} token={token} />
        </div>
      );
    }
    
    return (
      <div style={styles.card}>
        <h3>Coming Soon</h3>
        <p>This section is under development.</p>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.studentInfo}>
            <div style={styles.avatarCircle}>{user?.name?.[0]?.toUpperCase() || 'S'}</div>
            <div>
              <h2 style={styles.studentId}>{user?.rollNo || 'Student ID'}</h2>
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
            {menuItems.map((item) => (
              <div key={item.id}>
                <button
                  style={{
                    ...styles.sidebarBtn,
                    ...(activeView === item.view ? styles.sidebarBtnActive : {})
                  }}
                  onClick={() => {
                    setActiveView(item.view);
                    toggleMenu(item.id);
                  }}
                >
                  <span style={styles.sidebarIcon}>{item.icon}</span>
                  <span style={styles.sidebarLabel}>{item.label}</span>
                  <span style={styles.sidebarArrow}>▼</span>
                </button>
              </div>
            ))}
          </nav>
        </aside>

        <div style={styles.content}>
          {loading && <p>Loading dashboard data...</p>}
          {error && <p style={{ color: '#c33' }}>{error}</p>}
          {!loading && renderContent()}
        </div>
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
    padding: '15px 18px',
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
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid var(--line)',
    fontSize: '14px',
    backgroundColor: '#fff'
  },
  examSelector: {
    marginTop: '18px',
    padding: '20px',
    borderRadius: '20px',
    background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%)',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)'
  },
  summaryCard: {
    padding: '22px',
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
    marginBottom: '16px'
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
    maxWidth: '320px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    lineHeight: 1.6,
    textAlign: 'right'
  },
  summaryLabel: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#2563eb',
    marginBottom: '8px'
  },
  summaryTitle: {
    margin: '0 0 14px 0',
    fontSize: '20px',
    color: 'var(--text)'
  },
  summaryStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  summaryStatItem: {
    padding: '14px 16px',
    borderRadius: '16px',
    background: '#ffffff',
    border: '1px solid rgba(226, 232, 240, 0.9)'
  },
  summaryStatValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--text)',
    lineHeight: 1.1
  },
  summaryStatLabel: {
    display: 'block',
    marginTop: '6px',
    fontSize: '12px',
    color: 'var(--text-secondary)'
  },
  rankTableCard: {
    marginTop: '20px',
    padding: '18px',
    borderRadius: '20px',
    background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
    border: '1px solid rgba(226, 232, 240, 0.95)',
    boxShadow: '0 14px 28px rgba(15, 23, 42, 0.06)'
  },
  rankTableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px'
  },
  rankTableMeta: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: '600'
  },
  attendanceBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginTop: '20px'
  },
  statBox: {
    padding: '20px 18px',
    borderRadius: '20px',
    color: 'var(--text)',
    textAlign: 'center',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
  },
  statPercentage: {
    borderTop: '4px solid #1e40af'
  },
  statPresent: {
    borderTop: '4px solid #2563eb'
  },
  statAbsent: {
    borderTop: '4px solid #f59e0b'
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: '8px'
  },
  statValue: {
    margin: 0,
    fontSize: '32px',
    lineHeight: 1,
    fontWeight: '800',
    color: 'var(--text)'
  },
  statCaption: {
    marginTop: '8px',
    marginBottom: 0,
    color: 'var(--text-secondary)',
    fontSize: '13px',
    lineHeight: 1.5
  },
  totalDaysText: {
    marginTop: '20px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px'
  }
};

export default StudentDashboard;
