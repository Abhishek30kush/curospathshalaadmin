import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const TestSeries = () => {
  const [testSeries, setTestSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSeries, setNewSeries] = useState({ title: '', category: 'IIT-JEE', description: '' });
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        category: newSeries.category || 'IIT-JEE', // fallback just in case
        description: newSeries.description,
        createdAt: new Date().toISOString()
      });
      setNewSeries({ title: '', category: 'IIT-JEE', description: '' });
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
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-600 mb-1">Series Title</label>
                <input type="text" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newSeries.title} onChange={(e) => setNewSeries({...newSeries, title: e.target.value})} placeholder="e.g. IIT-JEE Advanced Full Mock Tests" />
              </div>
              <div className="w-1/3">
                <label className="block text-sm font-semibold text-slate-600 mb-1">Category</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newSeries.category} onChange={(e) => setNewSeries({...newSeries, category: e.target.value})}>
                  <option value="IIT-JEE">IIT-JEE</option>
                  <option value="NEET">NEET</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
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

      {loading ? (
        <div className="text-slate-500 font-medium">Loading test series...</div>
      ) : testSeries.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <p className="text-xl text-slate-500">No test series found. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testSeries.map(series => (
            <div key={series.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  (series.category === 'JEE' || series.category === 'IIT-JEE') ? 'bg-blue-100 text-blue-700' :
                  (series.category === 'NEET') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {series.category === 'JEE' ? 'IIT-JEE' : series.category}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm">{new Date(series.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => handleDeleteSeries(series.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition shrink-0" title="Delete Series">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{series.title}</h3>
              <p className="text-slate-600 text-sm line-clamp-2">{series.description}</p>
              
              <div className="mt-6 flex justify-end items-center pt-4 border-t border-slate-100">
                <button onClick={() => navigate('/questions')} className="text-indigo-600 font-semibold text-sm hover:underline">Manage MCQs &rarr;</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestSeries;
