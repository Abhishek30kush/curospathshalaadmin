import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsSnap, coursesSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "courses"))
        ]);
        const data = studentsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.role !== 'admin');
        setStudents(data);
        setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchStudentHistory = async (studentId) => {
    setLoadingHistory(true);
    try {
      const q = query(collection(db, "userTests"), where("userId", "==", studentId));
      const snap = await getDocs(q);
      const tests = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch series names
      const seriesIds = [...new Set(tests.map(t => t.testSeriesId))];
      const seriesMap = {};
      for (const sid of seriesIds) {
        try {
          const sDoc = await getDoc(doc(db, "testSeries", sid));
          if (sDoc.exists()) seriesMap[sid] = sDoc.data().title;
        } catch (e) {}
      }

      const enriched = tests.map(t => ({
        ...t,
        seriesName: seriesMap[t.testSeriesId] || 'Unknown',
      }));
      enriched.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      setTestHistory(enriched);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelect = (student) => {
    if (selectedStudent?.id === student.id) {
      setSelectedStudent(null);
      setTestHistory([]);
    } else {
      setSelectedStudent(student);
      fetchStudentHistory(student.id);
    }
  };

  const handleToggleAccess = async (courseId) => {
    if (!selectedStudent) return;
    const currentPurchased = selectedStudent.purchasedCourses || [];
    let updatedPurchased;
    if (currentPurchased.includes(courseId)) {
      updatedPurchased = currentPurchased.filter(id => id !== courseId);
    } else {
      updatedPurchased = [...currentPurchased, courseId];
    }
    
    try {
      const studentRef = doc(db, "users", selectedStudent.id);
      await setDoc(studentRef, { purchasedCourses: updatedPurchased }, { merge: true });
      
      const updatedStudent = { ...selectedStudent, purchasedCourses: updatedPurchased };
      setSelectedStudent(updatedStudent);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
    } catch (e) {
      console.error("Error updating course access: ", e);
      alert("Failed to update course access.");
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'All') return true;
    if (activeTab === 'IIT-JEE') return s.targetExam === 'IIT-JEE' || s.targetExam === 'JEE';
    if (activeTab === 'Others') {
      const predefined = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE', 'NEET', 'JEE'];
      return !s.targetExam || !predefined.includes(s.targetExam);
    }
    return s.targetExam === activeTab;
  });

  const getTabCount = (tabName) => {
    if (tabName === 'All') return students.length;
    if (tabName === 'IIT-JEE') {
      return students.filter(s => s.targetExam === 'IIT-JEE' || s.targetExam === 'JEE').length;
    }
    if (tabName === 'Others') {
      const predefined = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE', 'NEET', 'JEE'];
      return students.filter(s => !s.targetExam || !predefined.includes(s.targetExam)).length;
    }
    return students.filter(s => s.targetExam === tabName).length;
  };

  const getAvgScore = () => {
    if (testHistory.length === 0) return 0;
    return Math.round(testHistory.reduce((sum, t) => sum + (t.score || 0), 0) / testHistory.length);
  };

  return (
    <div className="p-10 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Students</h2>
          <p className="text-slate-500 mt-1">{students.length} registered students</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          className="w-full max-w-md px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Class/Exam Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-100 pb-5">
        {['All', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE', 'NEET', 'Others'].map(tab => {
          const count = getTabCount(tab);
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedStudent(null);
                setTestHistory([]);
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm ${
                isActive
                  ? 'bg-amber-500 text-white shadow-amber-500/20 shadow-lg scale-[1.02]'
                  : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              <span>{tab === 'All' ? '👥 All Students' : tab}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-slate-500 font-medium">Loading students...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <p className="text-xl text-slate-500">
            {searchTerm ? 'No students match your search.' : 'No students registered yet.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredStudents.map(student => (
            <div key={student.id}>
              <div
                className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 cursor-pointer hover:shadow-md transition flex items-center gap-4 ${
                  selectedStudent?.id === student.id ? 'ring-2 ring-amber-400 rounded-b-none' : ''
                }`}
                onClick={() => handleSelect(student)}
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-xl font-black text-amber-600 shrink-0">
                  {(student.name || student.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 truncate">{student.name || 'Unnamed Student'}</h3>
                  <p className="text-slate-500 text-sm truncate">{student.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">
                    Joined {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                  {student.phone && <p className="text-xs text-slate-400 mt-1">📱 {student.phone}</p>}
                </div>
                <span className="text-slate-300 text-sm ml-2">
                  {selectedStudent?.id === student.id ? '▲' : '▼'}
                </span>
              </div>

              {selectedStudent?.id === student.id && (
                <div className="bg-amber-50 border-x border-b border-amber-200 rounded-b-2xl p-6">
                  {/* Student Details */}
                  <div className="bg-white border border-amber-200 rounded-xl p-4 mb-6 flex flex-wrap gap-6 text-sm shadow-sm">
                    <div>
                      <span className="font-semibold text-amber-800">📱 Contact Number: </span>
                      <span className="text-slate-700">{selectedStudent.phone || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-800">📅 Date of Birth: </span>
                      <span className="text-slate-700">{selectedStudent.dob || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-800">✉️ Email: </span>
                      <span className="text-slate-700">{selectedStudent.email}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-800">🎯 Target Exam: </span>
                      <span className="text-slate-700">{selectedStudent.targetExam === 'JEE' ? 'IIT-JEE' : (selectedStudent.targetExam || 'IIT-JEE')}</span>
                    </div>
                  </div>

                  {/* Course Access Management */}
                  <div className="mt-6 border-t border-amber-200 pt-4">
                    <h4 className="font-bold text-amber-900 text-sm mb-3">🔒 Manage Premium Course Access</h4>
                    {courses.filter(c => c.price > 0).length === 0 ? (
                      <p className="text-slate-500 italic text-xs">No paid courses available to manage.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {courses.filter(c => c.price > 0).map(course => {
                          const hasAccess = (selectedStudent.purchasedCourses || []).includes(course.id);
                          return (
                            <label key={course.id} className="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50/50 transition">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500" 
                                checked={hasAccess} 
                                onChange={() => handleToggleAccess(course.id)} 
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800 text-xs">{course.title}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{course.category || 'Both'} • ₹{course.price}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {loadingHistory ? (
                    <p className="text-amber-700 text-center py-4">Loading test history...</p>
                  ) : testHistory.length === 0 ? (
                    <p className="text-amber-700 text-center py-4 italic">No tests taken yet</p>
                  ) : (
                    <>
                      <div className="flex gap-4 mb-6">
                        <div className="flex-1 bg-white border border-amber-200 rounded-xl p-4 text-center">
                          <p className="text-3xl font-black text-amber-600">{testHistory.length}</p>
                          <p className="text-xs font-semibold text-amber-800 mt-1">Tests Taken</p>
                        </div>
                        <div className="flex-1 bg-white border border-amber-200 rounded-xl p-4 text-center">
                          <p className="text-3xl font-black text-amber-600">{getAvgScore()}</p>
                          <p className="text-xs font-semibold text-amber-800 mt-1">Avg Score</p>
                        </div>
                        <div className="flex-1 bg-white border border-amber-200 rounded-xl p-4 text-center">
                          <p className="text-3xl font-black text-amber-600">
                            {Math.max(...testHistory.map(t => t.score || 0))}
                          </p>
                          <p className="text-xs font-semibold text-amber-800 mt-1">Best Score</p>
                        </div>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-amber-800 border-b border-amber-200">
                            <th className="pb-2 font-semibold">#</th>
                            <th className="pb-2 font-semibold">Test Series</th>
                            <th className="pb-2 font-semibold">Score</th>
                            <th className="pb-2 font-semibold">%</th>
                            <th className="pb-2 font-semibold">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {testHistory.map((test, idx) => {
                            const pct = test.maxScore > 0 ? Math.round((test.score / test.maxScore) * 100) : 0;
                            return (
                              <tr key={test.id} className="border-b border-amber-100">
                                <td className="py-2 text-amber-700 font-bold">{idx + 1}</td>
                                <td className="py-2 text-slate-700">{test.seriesName}</td>
                                <td className="py-2 font-semibold text-slate-800">{test.score}/{test.maxScore}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                    pct >= 70 ? 'bg-emerald-100 text-emerald-700' : pct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {pct}%
                                  </span>
                                </td>
                                <td className="py-2 text-slate-500 text-xs">
                                  {test.submittedAt ? new Date(test.submittedAt).toLocaleString() : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Students;
