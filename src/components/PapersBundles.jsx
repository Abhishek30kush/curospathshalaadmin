import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const PapersBundles = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Modal states for printing/previewing
  const [previewPaper, setPreviewPaper] = useState(null);

  // Default structure for new paper
  const [newPaper, setNewPaper] = useState({
    title: '',
    category: 'Class 10',
    subject: 'Science',
    bundleType: 'Full Paper', // 'Full Paper', 'Only Long', 'Only Short', 'Only Objective', 'Only Numerical', 'Mixed'
    mode: 'pdf', // 'pdf' or 'create'
    pdfUrl: '',
    description: '',
    questions: []
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

  const bundleTypes = [
    { label: 'Full Syllabus Paper (Mixed)', value: 'Full Paper' },
    { label: 'Only Long Questions Series', value: 'Only Long' },
    { label: 'Only Short Questions Series', value: 'Only Short' },
    { label: 'Only Objective (MCQs) Series', value: 'Only Objective' },
    { label: 'Only Numerical Series', value: 'Only Numerical' },
    { label: 'Custom Mixed Bundle', value: 'Mixed' }
  ];

  const symbols = [
    { label: '√', val: '√' }, { label: 'π', val: 'π' }, { label: '±', val: '±' }, { label: '≠', val: '≠' },
    { label: 'x²', val: '²' }, { label: 'x³', val: '³' }, { label: 'Δ', val: 'Δ' }, { label: 'θ', val: 'θ' },
    { label: 'α', val: 'α' }, { label: 'β', val: 'β' }, { label: 'γ', val: 'γ' }, { label: 'λ', val: 'λ' },
    { label: 'μ', val: 'μ' }, { label: 'Ω', val: 'Ω' }, { label: '→', val: '→' }, { label: '⇌', val: '⇌' },
    { label: '∞', val: '∞' }, { label: '°C', val: '°C' }
  ];

  const fetchPapers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "testPapers"));
      const paperData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPapers(paperData);
    } catch (err) {
      console.error("Error fetching papers: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleCategoryChangeInForm = (cat) => {
    const subs = getSubjectsList(cat);
    setNewPaper(prev => ({
      ...prev,
      category: cat,
      subject: subs[0] || 'General'
    }));
  };

  // Add a blank question to the builder
  const addQuestionToBuilder = () => {
    setNewPaper(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          type: 'short', // 'objective', 'short', 'long', 'numerical'
          text: '',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctOption: 'A', // For MCQs
          correctAnswer: '',  // For Short/Long/Numerical
          marks: 4,
          solution: ''
        }
      ]
    }));
  };

  const removeQuestionFromBuilder = (index) => {
    setNewPaper(prev => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== index)
    }));
  };

  const updateQuestionField = (index, field, value) => {
    setNewPaper(prev => {
      const updatedQs = [...prev.questions];
      updatedQs[index] = { ...updatedQs[index], [field]: value };
      return { ...prev, questions: updatedQs };
    });
  };

  const insertSymbolInline = (symbol, questionIdx, fieldName) => {
    setNewPaper(prev => {
      const updatedQs = [...prev.questions];
      const currentVal = updatedQs[questionIdx][fieldName] || '';
      updatedQs[questionIdx] = { ...updatedQs[questionIdx], [fieldName]: currentVal + symbol };
      return { ...prev, questions: updatedQs };
    });
  };

  const handleSavePaper = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (newPaper.mode === 'create' && newPaper.questions.length === 0) {
      setError("Please add at least one question to the paper.");
      setIsSubmitting(false);
      return;
    }

    try {
      const dataToSave = {
        title: newPaper.title,
        category: newPaper.category,
        subject: newPaper.subject,
        bundleType: newPaper.bundleType,
        mode: newPaper.mode,
        description: newPaper.description || '',
        createdAt: new Date().toISOString()
      };

      if (newPaper.mode === 'pdf') {
        dataToSave.pdfUrl = newPaper.pdfUrl;
      } else {
        dataToSave.questions = newPaper.questions.map(q => ({
          ...q,
          marks: Number(q.marks) || 0
        }));
      }

      await addDoc(collection(db, "testPapers"), dataToSave);
      
      // Reset form
      setNewPaper({
        title: '',
        category: 'Class 10',
        subject: 'Science',
        bundleType: 'Full Paper',
        mode: 'pdf',
        pdfUrl: '',
        description: '',
        questions: []
      });
      setShowAddForm(false);
      fetchPapers();
    } catch (err) {
      console.error("Error adding paper: ", err);
      setError(err.message || "Failed to save question paper.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePaper = async (id) => {
    if (window.confirm("Are you sure you want to delete this paper/bundle?")) {
      try {
        await deleteDoc(doc(db, "testPapers", id));
        fetchPapers();
      } catch (err) {
        console.error("Error deleting paper: ", err);
      }
    }
  };

  // Filter lists
  const filteredPapers = papers.filter(paper => {
    const matchesCategory = activeTab === 'All' || paper.category === activeTab;
    const matchesSubject = selectedSubject === 'All' || paper.subject === selectedSubject;
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
      General: 'bg-slate-50 text-slate-700 border-slate-100'
    };
    return colors[sub] || colors['General'];
  };

  // Group questions by section for printable PDF layout
  const groupQuestionsBySection = (questionsList = []) => {
    const sections = {
      objective: [],
      short: [],
      long: [],
      numerical: []
    };

    questionsList.forEach(q => {
      if (sections[q.type]) {
        sections[q.type].push(q);
      } else {
        sections.short.push(q);
      }
    });

    return sections;
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="p-10 w-full max-w-6xl mx-auto">
      {/* Print styles injected for clean layout in Print Preview Mode */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-paper-sheet, #print-paper-sheet * {
            visibility: visible;
          }
          #print-paper-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Papers & Bundles</h2>
          <p className="text-slate-500 mt-1">Upload PDF question sheets or design custom exam papers</p>
        </div>
        <button 
          onClick={() => { setShowAddForm(!showAddForm); setError(''); }}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          {showAddForm ? 'Cancel' : '＋ Add Paper / Bundle'}
        </button>
      </div>

      {/* Add Paper Form */}
      {showAddForm && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8 border-l-4 border-l-indigo-500 animate-fadeIn">
          <h3 className="text-xl font-bold text-slate-700 mb-6">Create New Paper / Question Bundle</h3>
          {error && <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-lg mb-4 text-sm font-semibold">{error}</div>}
          
          <form onSubmit={handleSavePaper} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Paper / Bundle Title</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={newPaper.title} 
                  onChange={(e) => setNewPaper({...newPaper, title: e.target.value})} 
                  placeholder="e.g. Class 10 Board Physics Mock Paper 1" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Category / Class</label>
                <select 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={newPaper.category} 
                  onChange={(e) => handleCategoryChangeInForm(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Subject</label>
                <select 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" 
                  value={newPaper.subject} 
                  onChange={(e) => setNewPaper({...newPaper, subject: e.target.value})}
                >
                  {getSubjectsList(newPaper.category).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Bundle / Question Type</label>
                <select 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700" 
                  value={newPaper.bundleType} 
                  onChange={(e) => setNewPaper({...newPaper, bundleType: e.target.value})}
                >
                  {bundleTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Upload Mode</label>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200">
                  <button 
                    type="button"
                    onClick={() => setNewPaper({...newPaper, mode: 'pdf'})}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition ${newPaper.mode === 'pdf' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    📄 Upload PDF URL
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewPaper({...newPaper, mode: 'create'})}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition ${newPaper.mode === 'create' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    ✍️ Type on Dashboard
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Brief Description / Instructions</label>
              <textarea 
                rows="2" 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={newPaper.description} 
                onChange={(e) => setNewPaper({...newPaper, description: e.target.value})} 
                placeholder="Write exam duration, instructions or description..."
              ></textarea>
            </div>

            {/* Mode: PDF URL */}
            {newPaper.mode === 'pdf' && (
              <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 animate-fadeIn">
                <label className="block text-sm font-bold text-indigo-700 mb-2">Pre-Made PDF Drive/Storage Link</label>
                <input 
                  type="url" 
                  required={newPaper.mode === 'pdf'}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                  value={newPaper.pdfUrl} 
                  onChange={(e) => setNewPaper({...newPaper, pdfUrl: e.target.value})} 
                  placeholder="https://drive.google.com/file/d/... or any direct PDF URL" 
                />
              </div>
            )}

            {/* Mode: Question Builder */}
            {newPaper.mode === 'create' && (
              <div className="bg-indigo-50/20 p-6 rounded-2xl border border-indigo-100/50 flex flex-col gap-6 animate-fadeIn">
                <div className="flex justify-between items-center border-b border-indigo-100 pb-3">
                  <h4 className="text-lg font-bold text-indigo-900">✍️ Question Paper Builder ({newPaper.questions.length} Questions)</h4>
                  <button 
                    type="button"
                    onClick={addQuestionToBuilder}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl text-sm transition shadow-sm"
                  >
                    ＋ Add Question
                  </button>
                </div>

                {newPaper.questions.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 italic text-sm">No questions added yet. Click "+ Add Question" to start building your paper.</p>
                ) : (
                  <div className="flex flex-col gap-6">
                    {newPaper.questions.map((q, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 relative animate-scaleIn">
                        <div className="flex justify-between items-center">
                          <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex items-center gap-3">
                            <div>
                              <select 
                                className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                                value={q.type}
                                onChange={(e) => updateQuestionField(idx, 'type', e.target.value)}
                              >
                                <option value="objective">Objective (MCQ)</option>
                                <option value="short">Short Answer</option>
                                <option value="long">Long Answer</option>
                                <option value="numerical">Numerical</option>
                              </select>
                            </div>
                            <div>
                              <input 
                                type="number" 
                                className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                                placeholder="Marks"
                                value={q.marks}
                                onChange={(e) => updateQuestionField(idx, 'marks', e.target.value)}
                              />
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeQuestionFromBuilder(idx)}
                              className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                              title="Delete Question"
                            >
                              🗑
                            </button>
                          </div>
                        </div>

                        {/* Question Text */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question Text</label>
                            <div className="flex flex-wrap gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100 max-w-full overflow-x-auto">
                              {symbols.map(s => (
                                <button 
                                  type="button" 
                                  key={s.label}
                                  onClick={() => insertSymbolInline(s.val, idx, 'text')}
                                  className="px-1.5 py-0.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded text-[10px] border border-slate-200 transition font-mono font-bold"
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea 
                            required
                            rows="2"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 text-sm"
                            value={q.text}
                            onChange={(e) => updateQuestionField(idx, 'text', e.target.value)}
                            placeholder="Write your question content here..."
                          ></textarea>
                        </div>

                        {/* Options for Objective Question */}
                        {q.type === 'objective' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl">
                            {['A', 'B', 'C', 'D'].map(opt => (
                              <div key={opt} className="flex items-center gap-2">
                                <span className="font-bold text-slate-500 text-sm">{opt}.</span>
                                <input 
                                  type="text" 
                                  required={q.type === 'objective'}
                                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                  value={q[`option${opt}`]}
                                  onChange={(e) => updateQuestionField(idx, `option${opt}`, e.target.value)}
                                  placeholder={`Option ${opt}`}
                                />
                              </div>
                            ))}
                            <div className="md:col-span-2 flex items-center gap-4 mt-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correct Option</label>
                              <select 
                                className="px-4 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none"
                                value={q.correctOption}
                                onChange={(e) => updateQuestionField(idx, 'correctOption', e.target.value)}
                              >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Text Answers/Correct Values for short/long/numerical */}
                        {q.type !== 'objective' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              {q.type === 'numerical' ? 'Correct Numeric Answer / Value' : 'Key Answer points'}
                            </label>
                            <input 
                              type="text" 
                              required
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                              value={q.correctAnswer}
                              onChange={(e) => updateQuestionField(idx, 'correctAnswer', e.target.value)}
                              placeholder={q.type === 'numerical' ? 'e.g. 4.5 or 12' : 'e.g. Key value or definition line'}
                            />
                          </div>
                        )}

                        {/* Detailed Solution */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solution / Explanation (optional)</label>
                            <div className="flex flex-wrap gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100 max-w-full overflow-x-auto">
                              {symbols.map(s => (
                                <button 
                                  type="button" 
                                  key={s.label}
                                  onClick={() => insertSymbolInline(s.val, idx, 'solution')}
                                  className="px-1.5 py-0.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded text-[10px] border border-slate-200 transition font-mono font-bold"
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea 
                            rows="2"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 text-sm"
                            value={q.solution}
                            onChange={(e) => updateQuestionField(idx, 'solution', e.target.value)}
                            placeholder="Step-by-step solution / reference..."
                          ></textarea>
                        </div>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={addQuestionToBuilder}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3.5 rounded-xl border-2 border-dashed border-indigo-200 text-sm transition"
                    >
                      ＋ Add Another Question Below
                    </button>
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="bg-indigo-600 text-white font-bold py-3.5 px-10 rounded-xl hover:bg-indigo-700 transition shadow-md self-start disabled:opacity-75"
            >
              {isSubmitting ? 'Saving Paper...' : '💾 Save Paper / Bundle'}
            </button>
          </form>
        </div>
      )}

      {/* FILTER & CATEGORY TABS */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Class / Stream</label>
          <div className="flex gap-2 flex-wrap">
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveTab(cat); setSelectedSubject('All'); }}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${activeTab === cat ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full h-px bg-slate-100 md:hidden"></div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Filter by Subject</label>
          <div className="flex gap-2 flex-wrap">
            {['All', ...getSubjectsList(activeTab)].map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${selectedSubject === sub ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PAPERS AND BUNDLES DIRECTORY */}
      {loading ? (
        <div className="text-slate-500 font-medium flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
          Loading papers & series bundles...
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <p className="text-xl text-slate-500">No papers or bundles found matching the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPapers.map(paper => (
            <div key={paper.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {paper.category}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSubjectColorClasses(paper.subject)}`}>
                      {paper.subject}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeletePaper(paper.id)} 
                    className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition shrink-0" 
                    title="Delete Paper"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-1 leading-snug">{paper.title}</h3>
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-3">
                  🏷️ {bundleTypes.find(t => t.value === paper.bundleType)?.label || paper.bundleType}
                </span>
                
                {paper.description && (
                  <p className="text-slate-500 text-sm line-clamp-2 mb-4">{paper.description}</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  {paper.mode === 'pdf' ? '📄 Pre-made PDF' : `✍️ Typed (${paper.questions?.length || 0} Qs)`}
                </span>
                {paper.mode === 'pdf' ? (
                  <a 
                    href={paper.pdfUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-indigo-600 font-bold text-sm hover:underline"
                  >
                    Open PDF &rarr;
                  </a>
                ) : (
                  <button 
                    onClick={() => setPreviewPaper(paper)} 
                    className="text-indigo-600 font-bold text-sm hover:underline"
                  >
                    View / Print Paper &rarr;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {previewPaper && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-start p-4 z-50 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl p-8 my-8 border border-slate-100">
            {/* Modal actions bar */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Print / Download Preview</h3>
                  <p className="text-xs text-slate-400 font-medium">Grouped automatically by Question Section</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={triggerBrowserPrint}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl text-sm transition shadow-sm"
                >
                  🖨️ Print / Save PDF
                </button>
                <button 
                  onClick={() => setPreviewPaper(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-5 rounded-xl text-sm transition"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Simulated Printed Exam Sheet Container */}
            <div 
              id="print-paper-sheet" 
              className="bg-white p-12 border border-slate-200 rounded-xl shadow-inner font-serif text-black leading-relaxed max-w-3xl mx-auto"
            >
              {/* Exam Header */}
              <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h1 className="text-3xl font-bold uppercase tracking-wide">CUROS PATHSHALA</h1>
                <p className="text-sm font-semibold tracking-wider mt-1">{previewPaper.category.toUpperCase()} EXAMINATION</p>
                <div className="flex justify-between items-center text-xs font-bold mt-4 px-2">
                  <span>SUBJECT: {previewPaper.subject.toUpperCase()}</span>
                  <span>MAX MARKS: {previewPaper.questions?.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)}</span>
                </div>
                {previewPaper.description && (
                  <p className="text-[11px] italic mt-3 text-slate-600 uppercase border-t border-slate-200 pt-2 tracking-wider">
                    Instructions: {previewPaper.description}
                  </p>
                )}
              </div>

              {/* Grouped Questions Sections */}
              <div className="flex flex-col gap-6">
                {/* Section A: Objective (MCQs) */}
                {groupQuestionsBySection(previewPaper.questions).objective.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold border-b border-black pb-1 mb-4 uppercase tracking-wider">
                      Section A: Objective Type Questions (MCQs)
                    </h3>
                    <div className="flex flex-col gap-4 pl-2">
                      {groupQuestionsBySection(previewPaper.questions).objective.map((q, idx) => (
                        <div key={idx} className="text-sm flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-4">
                            <p className="font-semibold"><span className="mr-1">Q.{idx + 1}</span> {q.text}</p>
                            <span className="text-xs font-bold text-slate-600 shrink-0">[{q.marks} Marks]</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pl-6 font-sans text-xs">
                            <div><strong>A.</strong> {q.optionA}</div>
                            <div><strong>B.</strong> {q.optionB}</div>
                            <div><strong>C.</strong> {q.optionC}</div>
                            <div><strong>D.</strong> {q.optionD}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section B: Short Answer Questions */}
                {groupQuestionsBySection(previewPaper.questions).short.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold border-b border-black pb-1 mb-4 uppercase tracking-wider">
                      Section B: Short Answer Type Questions
                    </h3>
                    <div className="flex flex-col gap-4 pl-2">
                      {groupQuestionsBySection(previewPaper.questions).short.map((q, idx) => (
                        <div key={idx} className="text-sm flex flex-col gap-1">
                          <div className="flex justify-between items-start gap-4">
                            <p className="font-semibold"><span className="mr-1">Q.{idx + 1}</span> {q.text}</p>
                            <span className="text-xs font-bold text-slate-600 shrink-0">[{q.marks} Marks]</span>
                          </div>
                          {q.correctAnswer && (
                            <p className="text-[11px] font-sans text-slate-500 pl-6 mt-1 no-print">
                              🔑 Key Answer: {q.correctAnswer}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section C: Long Answer Questions */}
                {groupQuestionsBySection(previewPaper.questions).long.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold border-b border-black pb-1 mb-4 uppercase tracking-wider">
                      Section C: Long Answer Type Questions
                    </h3>
                    <div className="flex flex-col gap-4 pl-2">
                      {groupQuestionsBySection(previewPaper.questions).long.map((q, idx) => (
                        <div key={idx} className="text-sm flex flex-col gap-1">
                          <div className="flex justify-between items-start gap-4">
                            <p className="font-semibold"><span className="mr-1">Q.{idx + 1}</span> {q.text}</p>
                            <span className="text-xs font-bold text-slate-600 shrink-0">[{q.marks} Marks]</span>
                          </div>
                          {q.correctAnswer && (
                            <p className="text-[11px] font-sans text-slate-500 pl-6 mt-1 no-print">
                              🔑 Key Answer: {q.correctAnswer}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section D: Numerical Questions */}
                {groupQuestionsBySection(previewPaper.questions).numerical.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold border-b border-black pb-1 mb-4 uppercase tracking-wider">
                      Section D: Numerical/Integer Value Questions
                    </h3>
                    <div className="flex flex-col gap-4 pl-2">
                      {groupQuestionsBySection(previewPaper.questions).numerical.map((q, idx) => (
                        <div key={idx} className="text-sm flex flex-col gap-1">
                          <div className="flex justify-between items-start gap-4">
                            <p className="font-semibold"><span className="mr-1">Q.{idx + 1}</span> {q.text}</p>
                            <span className="text-xs font-bold text-slate-600 shrink-0">[{q.marks} Marks]</span>
                          </div>
                          {q.correctAnswer && (
                            <p className="text-[11px] font-sans text-slate-500 pl-6 mt-1 no-print">
                              🔑 Correct Answer: {q.correctAnswer}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* End of Paper Sign */}
              <div className="text-center mt-12 text-xs font-bold tracking-widest border-t border-black pt-6">
                *** END OF QUESTION PAPER ***
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PapersBundles;
