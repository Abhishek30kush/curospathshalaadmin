import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

const QuickNoteWidget = () => {
  const [targetType, setTargetType] = useState('class'); // 'class' or 'course'
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Class 9');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const categories = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE', 'NEET'];

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snap = await getDocs(collection(db, 'courses'));
        const courseData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCourses(courseData);
        if (courseData.length > 0) setSelectedCourse(courseData[0].id);
      } catch (err) {
        console.error("Failed to fetch courses for quick note", err);
      }
    };
    fetchCourses();
  }, []);

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setMessage({ text: 'Title and content are required.', type: 'error' });
      return;
    }
    
    setIsSaving(true);
    setMessage({ text: '', type: '' });

    try {
      if (targetType === 'course') {
        if (!selectedCourse) throw new Error("Please select a course.");
        await addDoc(collection(db, "materials"), {
          courseId: selectedCourse,
          title: title,
          chapterName: 'General Notes', // Quick notes go to General
          lectureName: '',
          type: 'text',
          subject: 'General',
          url: '',
          textContent: content,
          description: 'Quick note created from dashboard',
          createdAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "studyMaterials"), {
          title: title,
          chapterName: 'General Notes',
          lectureName: '',
          category: selectedCategory,
          subject: 'General',
          materialType: 'Notes',
          type: 'text',
          url: '',
          textContent: content,
          description: 'Quick note created from dashboard',
          createdAt: new Date().toISOString()
        });
      }
      setMessage({ text: 'Note published successfully!', type: 'success' });
      setTitle('');
      setContent('');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ text: err.message || 'Failed to save note.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mt-8 border-t-4 border-t-amber-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">📝 Quick Note Creator</h3>
          <p className="text-slate-500 text-sm mt-1">Instantly publish a text note to students</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg mb-6 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSaveNote} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Target Audience</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetType('class')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${targetType === 'class' ? 'bg-amber-100 text-amber-700 border-2 border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
              >
                Class (Free Study Material)
              </button>
              <button
                type="button"
                onClick={() => setTargetType('course')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${targetType === 'course' ? 'bg-amber-100 text-amber-700 border-2 border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
              >
                Paid Course
              </button>
            </div>
          </div>

          <div>
            {targetType === 'class' ? (
              <>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Select Class / Stream</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 font-medium"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </>
            ) : (
              <>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Select Course</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 font-medium"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  {courses.length === 0 ? <option value="">No courses available</option> : null}
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">Note Title</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
            placeholder="e.g. Important Announcement / Today's Summary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">Note Content</label>
          <textarea 
            rows="5"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono text-sm whitespace-pre-wrap"
            placeholder="Type your notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          ></textarea>
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className="self-start bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-xl transition shadow-sm disabled:opacity-70 mt-2"
        >
          {isSaving ? 'Publishing...' : '🚀 Publish Note Immediately'}
        </button>
      </form>
    </div>
  );
};

export default QuickNoteWidget;
