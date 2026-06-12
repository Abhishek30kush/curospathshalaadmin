import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const TestSeries = () => {
  const [testSeries, setTestSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSeries, setNewSeries] = useState({ title: '', category: 'IIT-JEE', subject: 'Full Syllabus', description: '', isTimed: false, duration: '180', status: 'published' });
  const navigate = useNavigate();

  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const handleShareTest = (seriesId) => {
    let baseUrl = import.meta.env.VITE_STUDENT_WEB_URL;
    if (!baseUrl) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = 'http://localhost:5173';
      } else {
        const currentOrigin = window.location.origin;
        if (currentOrigin.includes('admin')) {
          baseUrl = currentOrigin.replace('admin', 'student');
        } else {
          baseUrl = currentOrigin;
        }
      }
    }
    const shareUrl = `${baseUrl}/test/${seriesId}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopiedId(seriesId);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(err => {
        console.error("Failed to copy link: ", err);
      });
  };

  const handleViewLeaderboard = async (seriesId, title) => {
    setSelectedSeriesTitle(title);
    setShowLeaderboard(true);
    setLeaderboardLoading(true);
    try {
      const q = query(collection(db, "userTests"), where("testSeriesId", "==", seriesId));
      const qSnap = await getDocs(q);
      const submissions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const userBestScores = {};
      submissions.forEach(sub => {
        const uid = sub.userId;
        if (!uid) return;
        if (!userBestScores[uid] || sub.score > userBestScores[uid].score) {
          userBestScores[uid] = sub;
        }
      });

      const uniqueSubmissions = Object.values(userBestScores);
      const resolvedList = [];

      for (const sub of uniqueSubmissions) {
        try {
          const uDoc = await getDoc(doc(db, "users", sub.userId));
          const name = uDoc.exists() ? (uDoc.data().name || uDoc.data().email || 'Student') : 'Student';
          resolvedList.push({ ...sub, studentName: name });
        } catch (e) {
          resolvedList.push({ ...sub, studentName: 'Student' });
        }
      }

      resolvedList.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (a.timeTakenSeconds || Infinity) - (b.timeTakenSeconds || Infinity);
      });
      setLeaderboardData(resolvedList);
    } catch (err) {
      console.error("Error fetching leaderboard: ", err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const getSubjectsList = (cat) => {
    if (cat === 'Class 9' || cat === 'Class 10') {
      return ['Science', 'Mathematics', 'English', 'Social Science', 'Full Syllabus', 'General'];
    } else if (cat === 'Class 11' || cat === 'Class 12') {
      return ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Full Syllabus', 'General'];
    } else if (cat === 'IIT-JEE' || cat === 'JEE') {
      return ['Physics', 'Chemistry', 'Mathematics', 'Full Syllabus', 'General'];
    } else if (cat === 'NEET') {
      return ['Physics', 'Chemistry', 'Biology', 'Full Syllabus', 'General'];
    }
    return ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Full Syllabus', 'General'];
  };

  const categories = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE', 'NEET'];

  const handleCategoryChange = (cat) => {
    setNewSeries(prev => ({
      ...prev,
      category: cat,
      subject: 'Full Syllabus'
    }));
  };

  const fetchTestSeries = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "testSeries"));
      const seriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTestSeries(seriesData);
    } catch (error) {
      console.error("Error fetching test series: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestSeries();
  }, []);

  const handleAddSeries = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, "testSeries"), {
        title: newSeries.title,
        category: newSeries.category || 'IIT-JEE',
        subject: newSeries.subject || 'Full Syllabus',
        description: newSeries.description,
        isTimed: newSeries.isTimed,
        duration: newSeries.isTimed ? Number(newSeries.duration) : null,
        status: newSeries.status || 'published',
        createdAt: new Date().toISOString()
      });
      setNewSeries({ title: '', category: 'IIT-JEE', subject: 'Full Syllabus', description: '', isTimed: false, duration: '180', status: 'published' });
      setShowAddForm(false);
      fetchTestSeries();
    } catch (err) {
      console.error("Error adding test series: ", err);
      setError(err.message || "Failed to save test series.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSeries = async (seriesId) => {
    if (window.confirm("Are you sure you want to delete this test series? This will not automatically delete its questions.")) {
      try {
        await deleteDoc(doc(db, "testSeries", seriesId));
        fetchTestSeries();
      } catch (error) {
        console.error("Error deleting test series: ", error);
      }
    }
  };

  const [editingSeries, setEditingSeries] = useState(null);

  const handleStartEdit = (series) => {
    setEditingSeries({ ...series });
  };

  const handlePublishSeries = async (seriesId) => {
    try {
      await updateDoc(doc(db, "testSeries", seriesId), {
        status: 'published'
      });
      fetchTestSeries();
    } catch (error) {
      console.error("Error publishing test series: ", error);
      alert("Failed to publish test series.");
    }
  };

  const handleUpdateSeries = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await updateDoc(doc(db, "testSeries", editingSeries.id), {
        title: editingSeries.title,
        category: editingSeries.category,
        subject: editingSeries.subject,
        description: editingSeries.description,
        isTimed: editingSeries.isTimed,
        duration: editingSeries.isTimed ? Number(editingSeries.duration) : null,
        status: editingSeries.status || 'published'
      });
      setEditingSeries(null);
      fetchTestSeries();
    } catch (err) {
      console.error("Error updating test series: ", err);
      setError(err.message || "Failed to update test series.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter series based on selected Category and Subject
  const filteredSeries = testSeries.filter(series => {
    const matchesCategory = filterCategory === 'All' || series.category === filterCategory;
    const matchesSubject = filterSubject === 'All' || series.subject === filterSubject;
    return matchesCategory && matchesSubject;
  });

  const getSubjectColorClasses = (sub) => {
    const colors = {
      Mathematics: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      Physics: 'bg-blue-50 text-blue-700 border-blue-100',
      Chemistry: 'bg-amber-50 text-amber-700 border-amber-100',
      Biology: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      Science: 'bg-purple-50 text-purple-700 border-purple-100',
      English: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
      'Social Science': 'bg-orange-50 text-orange-700 border-orange-100',
      'Full Syllabus': 'bg-teal-50 text-teal-700 border-teal-100',
      General: 'bg-slate-50 text-slate-700 border-slate-100'
    };
    return colors[sub] || colors['General'];
  };

  return (
    <div className="p-10 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Test Series Management</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          {showAddForm ? 'Cancel' : '+ Create New Series'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8 border-l-4 border-l-indigo-500">
          <h3 className="text-xl font-bold text-slate-700 mb-4">Create New Test Series</h3>
          {error && <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleAddSeries} className="flex flex-col gap-4">
            <div className="flex gap-4 flex-wrap md:flex-nowrap">
              <div className="flex-1 min-w-[250px]">
                <label className="block text-sm font-semibold text-slate-600 mb-1">Series Title</label>
                <input type="text" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newSeries.title} onChange={(e) => setNewSeries({...newSeries, title: e.target.value})} placeholder="e.g. IIT-JEE Advanced Full Mock Tests" />
              </div>
              <div className="w-full md:w-1/4">
                <label className="block text-sm font-semibold text-slate-600 mb-1">Category</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newSeries.category} onChange={(e) => handleCategoryChange(e.target.value)}>
                  <option value="IIT-JEE">IIT-JEE</option>
                  <option value="NEET">NEET</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                </select>
              </div>
              <div className="w-full md:w-1/4">
                <label className="block text-sm font-semibold text-slate-600 mb-1">Subject</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" value={newSeries.subject} onChange={(e) => setNewSeries({...newSeries, subject: e.target.value})}>
                  {getSubjectsList(newSeries.category).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                    checked={newSeries.isTimed} 
                    onChange={(e) => setNewSeries({...newSeries, isTimed: e.target.checked})} 
                  />
                  <span className="text-sm font-semibold text-slate-700">Enable Test Timer / Duration?</span>
                </label>

                {newSeries.isTimed && (
                  <div className="flex items-center gap-2 animate-fadeIn">
                    <label className="text-sm font-semibold text-slate-600">Duration:</label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      className="w-24 px-3 py-1 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800"
                      value={newSeries.duration} 
                      onChange={(e) => setNewSeries({...newSeries, duration: e.target.value})} 
                    />
                    <span className="text-sm text-slate-500 font-medium">Minutes</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Status</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" value={newSeries.status} onChange={(e) => setNewSeries({...newSeries, status: e.target.value})}>
                  <option value="published">🚀 Published</option>
                  <option value="draft">📝 Save as Draft</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Description</label>
              <textarea required rows="2" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newSeries.description} onChange={(e) => setNewSeries({...newSeries, description: e.target.value})} placeholder="Brief description..."></textarea>
            </div>
            <button type="submit" disabled={isSubmitting} className="mt-2 self-start bg-indigo-600 text-white font-bold py-2 px-8 rounded-lg hover:bg-indigo-700 transition shadow-sm disabled:opacity-70">
              {isSubmitting ? 'Saving...' : 'Save Series'}
            </button>
          </form>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="flex flex-wrap gap-6 mb-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Class / Stream</label>
          <div className="flex gap-2 flex-wrap">
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => { setFilterCategory(cat); setFilterSubject('All'); }}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${filterCategory === cat ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full h-px bg-slate-100 md:hidden"></div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
          <div className="flex gap-2 flex-wrap">
            {['All', ...getSubjectsList(filterCategory)].map(sub => (
              <button
                key={sub}
                onClick={() => setFilterSubject(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${filterSubject === sub ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 font-medium">Loading test series...</div>
      ) : filteredSeries.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <p className="text-xl text-slate-500">No test series found matching the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSeries.map(series => (
            <div key={series.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2 flex-wrap items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    (series.category === 'JEE' || series.category === 'IIT-JEE') ? 'bg-blue-100 text-blue-700' :
                    (series.category === 'NEET') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {series.category === 'JEE' ? 'IIT-JEE' : series.category}
                  </span>
                  {series.status === 'draft' && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                      📝 Draft
                    </span>
                  )}
                  {series.subject && (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getSubjectColorClasses(series.subject)}`}>
                      {series.subject}
                    </span>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    series.isTimed ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    ⏱️ {series.isTimed ? `${series.duration} min` : 'Practice'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">{series.createdAt ? new Date(series.createdAt).toLocaleDateString() : ''}</span>
                  
                  {series.status === 'draft' && (
                    <button onClick={() => handlePublishSeries(series.id)} className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 p-1.5 rounded transition shrink-0" title="Publish Test Series">
                      🚀
                    </button>
                  )}
                  <button onClick={() => handleStartEdit(series)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded transition shrink-0" title="Edit Test Series">
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteSeries(series.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition shrink-0" title="Delete Series">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{series.title}</h3>
              <p className="text-slate-600 text-sm line-clamp-2">{series.description}</p>
              
              <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-100">
                <button onClick={() => handleViewLeaderboard(series.id, series.title)} className="text-emerald-600 font-semibold text-sm hover:underline">🏆 Leaderboard</button>
                <button 
                  onClick={() => handleShareTest(series.id)} 
                  className={`font-semibold text-sm hover:underline ${copiedId === series.id ? 'text-emerald-500 font-bold' : 'text-slate-500'}`}
                >
                  {copiedId === series.id ? '✅ Copied!' : '🔗 Share Link'}
                </button>
                <button onClick={() => navigate('/questions')} className="text-indigo-600 font-semibold text-sm hover:underline">Manage MCQs &rarr;</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Test Leaderboard</h3>
                <p className="text-slate-500 text-sm mt-1">{selectedSeriesTitle}</p>
              </div>
              <button onClick={() => setShowLeaderboard(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {leaderboardLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : leaderboardData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 font-medium">No students have taken this test yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {leaderboardData.map((item, idx) => (
                    <div key={item.userId} className={`flex items-center justify-between p-4 rounded-xl border ${idx === 0 ? 'bg-amber-50 border-amber-200' : idx === 1 ? 'bg-slate-50 border-slate-200' : idx === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${idx === 0 ? 'bg-amber-200 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-200 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                          {idx + 1}
                        </div>
                        <div className="font-semibold text-slate-700">{item.studentName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-indigo-600">{item.score} <span className="text-xs text-slate-400 font-normal">pts</span></div>
                        {item.timeTakenSeconds !== undefined && (
                          <div className="text-xs text-slate-400 font-medium">{Math.floor(item.timeTakenSeconds / 60)}m {item.timeTakenSeconds % 60}s</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingSeries && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 border border-slate-100 animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">✏️ Edit Test Series</h3>
              <button 
                onClick={() => setEditingSeries(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {error && <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleUpdateSeries} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Series Title</label>
                  <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={editingSeries.title} onChange={(e) => setEditingSeries({...editingSeries, title: e.target.value})} placeholder="Title" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Status</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" value={editingSeries.status || 'published'} onChange={(e) => setEditingSeries({...editingSeries, status: e.target.value})}>
                    <option value="published">🚀 Published</option>
                    <option value="draft">📝 Draft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Category</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" value={editingSeries.category} onChange={(e) => setEditingSeries({...editingSeries, category: e.target.value, subject: 'Full Syllabus'})}>
                    <option value="IIT-JEE">IIT-JEE</option>
                    <option value="NEET">NEET</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Subject</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" value={editingSeries.subject} onChange={(e) => setEditingSeries({...editingSeries, subject: e.target.value})}>
                    {getSubjectsList(editingSeries.category).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                      checked={editingSeries.isTimed} 
                      onChange={(e) => setEditingSeries({...editingSeries, isTimed: e.target.checked})} 
                    />
                    <span className="text-sm font-semibold text-slate-700">Enable Test Timer / Duration?</span>
                  </label>

                  {editingSeries.isTimed && (
                    <div className="flex items-center gap-2 animate-fadeIn">
                      <label className="text-sm font-semibold text-slate-600">Duration:</label>
                      <input 
                        type="number" 
                        required 
                        min="1"
                        className="w-24 px-3 py-1 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800"
                        value={editingSeries.duration || ''} 
                        onChange={(e) => setEditingSeries({...editingSeries, duration: e.target.value})} 
                      />
                      <span className="text-sm text-slate-500 font-medium">Minutes</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Description</label>
                <textarea required rows="2" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700" value={editingSeries.description} onChange={(e) => setEditingSeries({...editingSeries, description: e.target.value})} placeholder="Brief description..."></textarea>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingSeries(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-sm disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestSeries;
