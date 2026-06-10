import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

const Materials = () => {
  const [activeTab, setActiveTab] = useState('course'); // 'course' or 'class'
  const [coursesList, setCoursesList] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Course Material Form State
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    chapterName: '',
    type: 'pdf',
    url: '',
    description: '',
    subject: 'General'
  });

  const [courseFilterSubject, setCourseFilterSubject] = useState('All');

  // Class Study Materials State
  const [classMaterials, setClassMaterials] = useState([]);
  const [classFilterCategory, setClassFilterCategory] = useState('Class 9');
  const [classFilterSubject, setClassFilterSubject] = useState('All');
  
  // Class Material Form State
  const [newClassMaterial, setNewClassMaterial] = useState({
    title: '',
    chapterName: '',
    category: 'Class 9',
    subject: 'Mathematics',
    materialType: 'Notes',
    type: 'pdf',
    url: '',
    description: ''
  });

  const categories = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE', 'NEET'];

  const getSubjectsList = (cat) => {
    if (cat === 'Class 9' || cat === 'Class 10') {
      return ['Science', 'Mathematics', 'English', 'Social Science', 'General'];
    } else if (cat === 'Class 11' || cat === 'Class 12') {
      return ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'General'];
    } else if (cat === 'IIT-JEE' || cat === 'JEE') {
      return ['Physics', 'Chemistry', 'Mathematics', 'General'];
    } else if (cat === 'NEET') {
      return ['Physics', 'Chemistry', 'Biology', 'General'];
    }
    return ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'General'];
  };

  const resourceTypes = ['Notes', 'Question Sheet', 'Syllabus', 'Video Lecture', 'Other'];

  const fetchCourses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "courses"));
      const courseData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCoursesList(courseData);
      if (courseData.length > 0) setSelectedCourse(courseData[0].id);
    } catch (error) {
      console.error("Error fetching courses: ", error);
    }
  };

  const fetchMaterials = async (courseId) => {
    try {
      const q = query(collection(db, "materials"), where("courseId", "==", courseId));
      const querySnapshot = await getDocs(q);
      const mData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMaterials(mData);
    } catch (error) {
      console.error("Error fetching materials: ", error);
    }
  };

  const fetchClassMaterials = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "studyMaterials"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClassMaterials(data);
    } catch (error) {
      console.error("Error fetching class materials: ", error);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchCourses(), fetchClassMaterials()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchMaterials(selectedCourse);
      setCourseFilterSubject('All');
      const course = coursesList.find(c => c.id === selectedCourse);
      if (course) {
        const subs = getSubjectsList(course.category);
        setNewMaterial(prev => ({
          ...prev,
          subject: subs[0] || 'General'
        }));
      }
    }
  }, [selectedCourse, coursesList]);

  // Handle Category Change in Form
  const handleClassCategoryChange = (cat) => {
    const subs = getSubjectsList(cat);
    setNewClassMaterial(prev => ({
      ...prev,
      category: cat,
      subject: subs[0] || 'General'
    }));
  };

  // Add Course Material
  const handleAddCourseMaterial = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, "materials"), {
        courseId: selectedCourse,
        title: newMaterial.title,
        chapterName: newMaterial.chapterName || 'General',
        type: newMaterial.type || 'pdf',
        subject: newMaterial.subject || 'General',
        url: newMaterial.url,
        description: newMaterial.description,
        createdAt: new Date().toISOString()
      });
      const course = coursesList.find(c => c.id === selectedCourse);
      const defaultSub = course ? getSubjectsList(course.category)[0] : 'General';
      setNewMaterial({ title: '', chapterName: '', type: 'pdf', url: '', description: '', subject: defaultSub });
      setShowAddForm(false);
      fetchMaterials(selectedCourse);
    } catch (err) {
      console.error("Error adding course material: ", err);
      setError(err.message || "Failed to save course material.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Class Study Material
  const handleAddClassMaterial = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, "studyMaterials"), {
        title: newClassMaterial.title,
        chapterName: newClassMaterial.chapterName || 'General',
        category: newClassMaterial.category,
        subject: newClassMaterial.subject,
        materialType: newClassMaterial.materialType,
        type: newClassMaterial.type,
        url: newClassMaterial.url,
        description: newClassMaterial.description,
        createdAt: new Date().toISOString()
      });
      // Keep category & subject to make uploading multiple documents faster, clear title and url
      setNewClassMaterial(prev => ({
        ...prev,
        title: '',
        chapterName: '',
        url: '',
        description: ''
      }));
      setShowAddForm(false);
      fetchClassMaterials();
    } catch (err) {
      console.error("Error adding class material: ", err);
      setError(err.message || "Failed to save class study material.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (window.confirm("Are you sure you want to delete this course material?")) {
      try {
        await deleteDoc(doc(db, "materials", materialId));
        fetchMaterials(selectedCourse);
      } catch (error) {
        console.error("Error deleting course material: ", error);
      }
    }
  };

  const handleDeleteClassMaterial = async (materialId) => {
    if (window.confirm("Are you sure you want to delete this class study material?")) {
      try {
        await deleteDoc(doc(db, "studyMaterials", materialId));
        fetchClassMaterials();
      } catch (error) {
        console.error("Error deleting class study material: ", error);
      }
    }
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getSubjectColorClasses = (sub) => {
    const colors = {
      Mathematics: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      Physics: 'bg-blue-50 text-blue-700 border-blue-100',
      Chemistry: 'bg-amber-50 text-amber-700 border-amber-100',
      Biology: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      Science: 'bg-purple-50 text-purple-700 border-purple-100',
      English: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
      'Social Science': 'bg-orange-50 text-orange-700 border-orange-100',
      General: 'bg-slate-50 text-slate-700 border-slate-100'
    };
    return colors[sub] || colors['General'];
  };

  // Filter class materials list
  const filteredClassMaterials = classMaterials.filter(m => {
    const matchesCategory = m.category === classFilterCategory;
    const matchesSubject = classFilterSubject === 'All' || m.subject === classFilterSubject;
    return matchesCategory && matchesSubject;
  });

  // Filter course materials list
  const filteredCourseMaterials = materials.filter(m => {
    return courseFilterSubject === 'All' || m.subject === courseFilterSubject;
  });

  const groupMaterialsByChapter = (materialsList) => {
    const grouped = {};
    materialsList.forEach(m => {
      const ch = m.chapterName || 'General';
      if (!grouped[ch]) grouped[ch] = [];
      grouped[ch].push(m);
    });
    return grouped;
  };

  return (
    <div className="p-10 w-full max-w-6xl mx-auto">
      {/* Tab Header Selector */}
      <div className="flex gap-6 border-b border-slate-200 mb-8">
        <button
          onClick={() => { setActiveTab('course'); setShowAddForm(false); setError(''); }}
          className={`pb-4 px-2 font-bold text-lg border-b-2 transition ${activeTab === 'course' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Course Materials 📚
        </button>
        <button
          onClick={() => { setActiveTab('class'); setShowAddForm(false); setError(''); fetchClassMaterials(); }}
          className={`pb-4 px-2 font-bold text-lg border-b-2 transition ${activeTab === 'class' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Class Study Materials 📂
        </button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">
          {activeTab === 'course' ? 'Course Materials' : 'Class Study Materials'}
        </h2>
        {(activeTab === 'course' ? selectedCourse : true) && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-teal-700 transition shadow-sm"
          >
            {showAddForm ? 'Cancel' : '+ Add Material'}
          </button>
        )}
      </div>

      {/* FILTER CONTROLS */}
      {activeTab === 'course' ? (
        <div className="flex flex-col md:flex-row gap-6 mb-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-600 mb-2">Select Course to Manage Materials</label>
            <select 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              disabled={coursesList.length === 0}
            >
              {coursesList.length === 0 ? (
                <option value="" disabled>No courses available</option>
              ) : (
                coursesList.map(course => (
                  <option key={course.id} value={course.id} className="text-slate-700 bg-white py-2">{course.title}</option>
                ))
              )}
            </select>
          </div>
          {selectedCourse && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Filter by Subject</label>
              <div className="flex gap-2 flex-wrap">
                {['All', ...getSubjectsList(coursesList.find(c => c.id === selectedCourse)?.category || 'Both')].map(sub => (
                  <button
                    key={sub}
                    onClick={() => setCourseFilterSubject(sub)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${courseFilterSubject === sub ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-6 mb-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Class / Stream</label>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setClassFilterCategory(cat); setClassFilterSubject('All'); }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${classFilterCategory === cat ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}
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
              {['All', ...getSubjectsList(classFilterCategory)].map(sub => (
                <button
                  key={sub}
                  onClick={() => setClassFilterSubject(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${classFilterSubject === sub ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD FORMS */}
      {showAddForm && activeTab === 'course' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8 border-l-4 border-l-teal-500">
          <h3 className="text-xl font-bold text-slate-700 mb-6">Upload New Course Material</h3>
          {error && <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleAddCourseMaterial} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Title</label>
                <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" value={newMaterial.title} onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})} placeholder="e.g. Kinematics Lecture 1 Notes" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Chapter Name</label>
                <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" value={newMaterial.chapterName} onChange={(e) => setNewMaterial({...newMaterial, chapterName: e.target.value})} placeholder="e.g. Chapter 1: Kinematics" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Type</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700" value={newMaterial.type} onChange={(e) => setNewMaterial({...newMaterial, type: e.target.value})}>
                  <option value="pdf">PDF Note</option>
                  <option value="video">YouTube Video</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Subject</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-700" value={newMaterial.subject} onChange={(e) => setNewMaterial({...newMaterial, subject: e.target.value})}>
                  {getSubjectsList(coursesList.find(c => c.id === selectedCourse)?.category || 'Both').map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                {newMaterial.type === 'pdf' ? 'PDF Link (Drive / Storage URL)' : 'YouTube Video Link'}
              </label>
              <input type="url" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" value={newMaterial.url} onChange={(e) => setNewMaterial({...newMaterial, url: e.target.value})} placeholder="https://..." />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Short Description</label>
              <textarea rows="2" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" value={newMaterial.description} onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})} placeholder="Optional brief details..."></textarea>
            </div>

            <button type="submit" disabled={isSubmitting} className="mt-2 self-start bg-teal-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-teal-700 transition shadow-sm disabled:opacity-70">
              {isSubmitting ? 'Saving...' : 'Save Material'}
            </button>
          </form>
        </div>
      )}

      {showAddForm && activeTab === 'class' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8 border-l-4 border-l-teal-500">
          <h3 className="text-xl font-bold text-slate-700 mb-6">Upload Class Study Material</h3>
          {error && <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleAddClassMaterial} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Title</label>
                <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" value={newClassMaterial.title} onChange={(e) => setNewClassMaterial({...newClassMaterial, title: e.target.value})} placeholder="e.g. Class 9 Trigonometry Question Sheet" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Chapter Name</label>
                <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" value={newClassMaterial.chapterName} onChange={(e) => setNewClassMaterial({...newClassMaterial, chapterName: e.target.value})} placeholder="e.g. Chapter 1: Trigonometry" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Class / Category</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700" value={newClassMaterial.category} onChange={(e) => handleClassCategoryChange(e.target.value)}>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Subject</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-700" value={newClassMaterial.subject} onChange={(e) => setNewClassMaterial({...newClassMaterial, subject: e.target.value})}>
                  {getSubjectsList(newClassMaterial.category).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Resource Category</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-700" value={newClassMaterial.materialType} onChange={(e) => setNewClassMaterial({...newClassMaterial, materialType: e.target.value})}>
                  {resourceTypes.map(rt => (
                    <option key={rt} value={rt}>{rt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Media Type</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-700" value={newClassMaterial.type} onChange={(e) => setNewClassMaterial({...newClassMaterial, type: e.target.value})}>
                  <option value="pdf">📄 PDF Note/Sheet</option>
                  <option value="video">🎥 YouTube Video Link</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                {newClassMaterial.type === 'pdf' ? 'PDF Drive / Storage Link' : 'YouTube Video Link'}
              </label>
              <input type="url" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" value={newClassMaterial.url} onChange={(e) => setNewClassMaterial({...newClassMaterial, url: e.target.value})} placeholder="https://..." />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Description / Topics covered</label>
              <textarea rows="2" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" value={newClassMaterial.description} onChange={(e) => setNewClassMaterial({...newClassMaterial, description: e.target.value})} placeholder="Topics covered inside this note..."></textarea>
            </div>

            <button type="submit" disabled={isSubmitting} className="mt-2 self-start bg-teal-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-teal-700 transition shadow-sm disabled:opacity-70">
              {isSubmitting ? 'Saving...' : 'Save Class Material'}
            </button>
          </form>
        </div>
      )}

      {/* DISPLAY CARDS LIST */}
      {loading ? (
        <div className="text-slate-500 font-medium flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full"></div>
          Loading study materials...
        </div>
      ) : activeTab === 'course' ? (
        !selectedCourse ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <p className="text-xl text-slate-500">Please create a Course first to add materials.</p>
          </div>
        ) : filteredCourseMaterials.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <p className="text-xl text-slate-500">No course materials found matching the selected filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {Object.entries(groupMaterialsByChapter(filteredCourseMaterials)).sort(([a], [b]) => a.localeCompare(b)).map(([chapter, mats]) => (
              <div key={chapter}>
                <h3 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-3 border-slate-200">{chapter}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mats.map(material => (
                    <div key={material.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
                      {material.type === 'video' ? (
                        <div className="aspect-video w-full bg-slate-900">
                          {getYouTubeId(material.url) ? (
                            <iframe 
                              className="w-full h-full"
                              src={`https://www.youtube.com/embed/${getYouTubeId(material.url)}`}
                              title="YouTube video player"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Invalid Video URL</div>
                          )}
                        </div>
                      ) : (
                        <div className="h-40 w-full bg-red-50 flex items-center justify-center">
                          <svg className="w-16 h-16 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                        </div>
                      )}
                      
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${material.type === 'video' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                              {material.type}
                            </span>
                            {material.subject && (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSubjectColorClasses(material.subject)}`}>
                                {material.subject}
                              </span>
                            )}
                            <span className="text-slate-400 text-xs">{material.createdAt ? new Date(material.createdAt).toLocaleDateString() : ''}</span>
                          </div>
                          <button onClick={() => handleDeleteMaterial(material.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition shrink-0" title="Delete Material">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{material.title}</h3>
                        {material.description && <p className="text-slate-500 text-sm line-clamp-2 mb-4">{material.description}</p>}
                        
                        {material.type === 'pdf' && (
                          <a href={material.url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm font-semibold text-teal-600 hover:text-teal-700">
                            Open PDF Document &rarr;
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredClassMaterials.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <p className="text-xl text-slate-500">No study materials found for {classFilterCategory} {classFilterSubject !== 'All' ? `(${classFilterSubject})` : ''}.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {Object.entries(groupMaterialsByChapter(filteredClassMaterials)).sort(([a], [b]) => a.localeCompare(b)).map(([chapter, mats]) => (
              <div key={chapter}>
                <h3 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-3 border-slate-200">{chapter}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mats.map(material => (
                    <div key={material.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition flex flex-col justify-between">
                      <div>
                        {material.type === 'video' ? (
                          <div className="aspect-video w-full bg-slate-900">
                            {getYouTubeId(material.url) ? (
                              <iframe 
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${getYouTubeId(material.url)}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Invalid Video URL</div>
                            )}
                          </div>
                        ) : (
                          <div className="h-40 w-full bg-indigo-50/50 flex items-center justify-center relative">
                            <span className="text-6xl">📝</span>
                            <span className="absolute bottom-3 right-3 text-xs font-bold bg-slate-800 text-white px-2 py-0.5 rounded shadow">
                              {material.materialType}
                            </span>
                          </div>
                        )}
                        
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSubjectColorClasses(material.subject)}`}>
                                {material.subject}
                              </span>
                              <span className="text-slate-400 text-xs">{material.createdAt ? new Date(material.createdAt).toLocaleDateString() : ''}</span>
                            </div>
                            <button onClick={() => handleDeleteClassMaterial(material.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition shrink-0" title="Delete Class Material">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{material.title}</h3>
                          {material.description && <p className="text-slate-500 text-sm line-clamp-2 mb-4">{material.description}</p>}
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-0 border-t border-slate-50 mt-auto">
                        {material.type === 'pdf' ? (
                          <a href={material.url} target="_blank" rel="noreferrer" className="inline-block mt-4 text-sm font-semibold text-teal-600 hover:text-teal-700">
                            Open PDF Document &rarr;
                          </a>
                        ) : (
                          <a href={material.url} target="_blank" rel="noreferrer" className="inline-block mt-4 text-sm font-semibold text-teal-600 hover:text-teal-700">
                            Watch Video &rarr;
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default Materials;
