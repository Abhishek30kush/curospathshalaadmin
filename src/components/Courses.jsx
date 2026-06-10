import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', imageUrl: '', category: 'Both', price: '', paymentLink: '' });

  const fetchCourses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "courses"));
      const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching courses: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "courses"), {
        title: newCourse.title,
        description: newCourse.description,
        imageUrl: newCourse.imageUrl,
        category: newCourse.category,
        price: Number(newCourse.price) || 0,
        paymentLink: newCourse.paymentLink || '',
        createdAt: new Date().toISOString()
      });
      setNewCourse({ title: '', description: '', imageUrl: '', category: 'Both', price: '', paymentLink: '' });
      setShowAddForm(false);
      fetchCourses(); // Refresh the list
    } catch (error) {
      console.error("Error adding course: ", error);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "courses", courseId));
        fetchCourses();
      } catch (error) {
        console.error("Error deleting course: ", error);
      }
    }
  };

  return (
    <div className="p-10 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Courses Management</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition shadow-sm"
        >
          {showAddForm ? 'Cancel' : '+ Add New Course'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
          <h3 className="text-xl font-bold text-slate-700 mb-4">Create New Course</h3>
          <form onSubmit={handleAddCourse} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Course Title</label>
              <input type="text" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newCourse.title} onChange={(e) => setNewCourse({...newCourse, title: e.target.value})} placeholder="e.g. IIT-JEE Mains Crash Course 2026" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Description</label>
              <textarea required rows="3" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newCourse.description} onChange={(e) => setNewCourse({...newCourse, description: e.target.value})} placeholder="Detailed course description..."></textarea>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Cover Image URL</label>
              <input type="url" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newCourse.imageUrl} onChange={(e) => setNewCourse({...newCourse, imageUrl: e.target.value})} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Course Stream Category</label>
              <select 
                required 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newCourse.category}
                onChange={(e) => setNewCourse({...newCourse, category: e.target.value})}
              >
                <option value="Both">Both (IIT-JEE & NEET)</option>
                <option value="IIT-JEE">IIT-JEE Only</option>
                <option value="NEET">NEET Only</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="Class 11">Class 11</option>
                <option value="Class 12">Class 12</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Price (₹) (0 for free)</label>
                <input type="number" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newCourse.price} onChange={(e) => setNewCourse({...newCourse, price: e.target.value})} placeholder="e.g. 999" min="0" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Payment / WhatsApp Checkout URL</label>
                <input type="url" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newCourse.paymentLink} onChange={(e) => setNewCourse({...newCourse, paymentLink: e.target.value})} placeholder="https://..." />
              </div>
            </div>
            <button type="submit" className="mt-2 self-start bg-emerald-500 text-white font-bold py-2 px-8 rounded-lg hover:bg-emerald-600 transition shadow-sm">Save Course</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 font-medium">Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <p className="text-xl text-slate-500">No courses found. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
              {course.imageUrl ? (
                <img src={course.imageUrl} alt={course.title} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-slate-200 flex items-center justify-center">
                  <span className="text-slate-400">No Image</span>
                </div>
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="text-xl font-bold text-slate-800">{course.title}</h3>
                  <button onClick={() => handleDeleteCourse(course.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition shrink-0" title="Delete Course">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    course.category === 'NEET' ? 'bg-emerald-100 text-emerald-700' : (course.category === 'JEE' || course.category === 'IIT-JEE') ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {course.category === 'JEE' ? 'IIT-JEE' : (course.category || 'Both')}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    course.price > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {course.price > 0 ? `₹${course.price}` : 'Free'}
                  </span>
                </div>
                <p className="text-slate-600 text-sm line-clamp-3">{course.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Courses;
