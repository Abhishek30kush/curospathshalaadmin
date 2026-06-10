import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, setDoc } from 'firebase/firestore';

const Questions = () => {
  const [testSeriesList, setTestSeriesList] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    solution: '',
    subject: 'Physics',
    difficulty: 'Medium',
    marks: 4,
    negativeMarks: -1,
    imageUrl: '',
  });

  const symbols = [
    { label: '√', val: '√' }, { label: 'π', val: 'π' }, { label: '±', val: '±' }, { label: '≠', val: '≠' },
    { label: 'x²', val: '²' }, { label: 'x³', val: '³' }, { label: 'Δ', val: 'Δ' }, { label: 'θ', val: 'θ' },
    { label: 'α', val: 'α' }, { label: 'β', val: 'β' }, { label: 'γ', val: 'γ' }, { label: 'λ', val: 'λ' },
    { label: 'μ', val: 'μ' }, { label: 'Ω', val: 'Ω' }, { label: '→', val: '→' }, { label: '⇌', val: '⇌' },
    { label: '∞', val: '∞' }, { label: '°C', val: '°C' }
  ];

  const fetchTestSeries = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "testSeries"));
      const seriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTestSeriesList(seriesData);
      if (seriesData.length > 0) setSelectedSeries(seriesData[0].id);
    } catch (error) {
      console.error("Error fetching test series: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestSeries();
  }, []);

  const fetchQuestions = async (seriesId) => {
    try {
      const q = query(collection(db, "questions"), where("testSeriesId", "==", seriesId));
      const querySnapshot = await getDocs(q);
      const qData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuestions(qData);
    } catch (error) {
      console.error("Error fetching questions: ", error);
    }
  };

  useEffect(() => {
    if (selectedSeries) {
      fetchQuestions(selectedSeries);
      // Set default subject based on series
      const current = testSeriesList.find(s => s.id === selectedSeries);
      if (current) {
        setNewQuestion(prev => ({ 
          ...prev, 
          subject: (current.subject && current.subject !== 'Full Syllabus' && current.subject !== 'General')
            ? current.subject
            : (current.category === 'NEET' ? 'Biology' : 'Physics') 
        }));
      }
    }
  }, [selectedSeries, testSeriesList]);

  const getAvailableSubjects = () => {
    const current = testSeriesList.find(s => s.id === selectedSeries);
    if (!current) return ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Science', 'English', 'Social Science'];
    if (current.category === 'NEET') return ['Physics', 'Chemistry', 'Biology'];
    if (current.category === 'JEE' || current.category === 'IIT-JEE') return ['Physics', 'Chemistry', 'Mathematics'];
    if (current.category === 'Class 9' || current.category === 'Class 10') return ['Science', 'Mathematics', 'English', 'Social Science'];
    if (current.category === 'Class 11' || current.category === 'Class 12') return ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    return ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Science', 'English', 'Social Science'];
  };

  const insertSymbol = (symbol, targetFieldId, isEdit = false) => {
    const inputEl = document.getElementById(targetFieldId);
    if (!inputEl) return;

    const startPos = inputEl.selectionStart;
    const endPos = inputEl.selectionEnd;
    const text = inputEl.value;

    const updatedText = text.substring(0, startPos) + symbol + text.substring(endPos);

    if (isEdit) {
      const fieldName = targetFieldId.includes('solution') ? 'solution' : 'text';
      setEditingQuestion(prev => ({ ...prev, [fieldName]: updatedText }));
    } else {
      const fieldName = targetFieldId.includes('solution') ? 'solution' : 'text';
      setNewQuestion(prev => ({ ...prev, [fieldName]: updatedText }));
    }

    setTimeout(() => {
      inputEl.focus();
      inputEl.setSelectionRange(startPos + symbol.length, startPos + symbol.length);
    }, 10);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "questions"), {
        testSeriesId: selectedSeries,
        text: newQuestion.text,
        options: {
          A: newQuestion.optionA,
          B: newQuestion.optionB,
          C: newQuestion.optionC,
          D: newQuestion.optionD,
        },
        correctOption: newQuestion.correctOption,
        solution: newQuestion.solution,
        subject: newQuestion.subject,
        difficulty: newQuestion.difficulty,
        marks: Number(newQuestion.marks),
        negativeMarks: Number(newQuestion.negativeMarks),
        imageUrl: newQuestion.imageUrl,
        createdAt: new Date().toISOString()
      });
      setNewQuestion({
        text: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        solution: '',
        subject: getAvailableSubjects()[0],
        difficulty: 'Medium',
        marks: 4,
        negativeMarks: -1,
        imageUrl: '',
      });
      setShowAddForm(false);
      fetchQuestions(selectedSeries);
    } catch (error) {
      console.error("Error adding question: ", error);
    }
  };

  const handleEditQuestion = async (e) => {
    e.preventDefault();
    try {
      const docRef = doc(db, "questions", editingQuestion.id);
      await setDoc(docRef, {
        testSeriesId: selectedSeries,
        text: editingQuestion.text,
        options: {
          A: editingQuestion.optionA,
          B: editingQuestion.optionB,
          C: editingQuestion.optionC,
          D: editingQuestion.optionD,
        },
        correctOption: editingQuestion.correctOption,
        solution: editingQuestion.solution,
        subject: editingQuestion.subject,
        difficulty: editingQuestion.difficulty,
        marks: Number(editingQuestion.marks),
        negativeMarks: Number(editingQuestion.negativeMarks),
        imageUrl: editingQuestion.imageUrl,
      }, { merge: true });
      setEditingQuestion(null);
      fetchQuestions(selectedSeries);
    } catch (error) {
      console.error("Error updating question: ", error);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteDoc(doc(db, "questions", questionId));
        fetchQuestions(selectedSeries);
      } catch (error) {
        console.error("Error deleting question: ", error);
      }
    }
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      const lines = content.split(/\r?\n/);
      if (lines.length <= 1) {
        alert("File is empty or contains no headers");
        return;
      }

      const headerLine = lines[0];
      const delimiter = headerLine.includes('\t') ? '\t' : ',';
      const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

      const list = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        let fields = [];
        if (delimiter === '\t') {
          fields = line.split('\t').map(f => f.trim().replace(/^["']|["']$/g, ''));
        } else {
          // Splitting logic supporting double quotes (e.g. for question text)
          const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
          let match;
          while ((match = regex.exec(line)) !== null) {
            fields.push(match[1].trim().replace(/^["']|["']$/g, ''));
          }
          if (fields.length === 0) {
            fields = line.split(',').map(f => f.trim().replace(/^["']|["']$/g, ''));
          }
        }

        const row = {};
        headers.forEach((header, index) => {
          row[header] = fields[index] || '';
        });

        if (!row.text || !row.optionA || !row.optionB || !row.optionC || !row.optionD || !row.correctOption) {
          continue;
        }

        list.push({
          testSeriesId: selectedSeries,
          text: row.text,
          options: {
            A: row.optionA,
            B: row.optionB,
            C: row.optionC,
            D: row.optionD,
          },
          correctOption: row.correctOption.toUpperCase().trim(),
          solution: row.solution || '',
          subject: row.subject || getAvailableSubjects()[0],
          difficulty: row.difficulty || 'Medium',
          marks: Number(row.marks) || 4,
          negativeMarks: Number(row.negativeMarks) || -1,
          imageUrl: row.imageUrl || '',
          createdAt: new Date().toISOString()
        });
      }

      if (list.length === 0) {
        alert("No valid questions parsed from file.");
        return;
      }

      if (window.confirm(`Parsed ${list.length} questions. Import them to selected Test Series?`)) {
        setLoading(true);
        try {
          const promises = list.map(q => addDoc(collection(db, "questions"), q));
          await Promise.all(promises);
          alert("Imported successfully!");
          fetchQuestions(selectedSeries);
          setShowBulkForm(false);
        } catch (err) {
          alert("Error importing: " + err.message);
        } finally {
          setLoading(false);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Clear file input
  };

  const openEditModal = (q) => {
    setEditingQuestion({
      id: q.id,
      text: q.text,
      optionA: q.options.A,
      optionB: q.options.B,
      optionC: q.options.C,
      optionD: q.options.D,
      correctOption: q.correctOption,
      solution: q.solution,
      subject: q.subject || getAvailableSubjects()[0],
      difficulty: q.difficulty || 'Medium',
      marks: q.marks || 4,
      negativeMarks: q.negativeMarks || -1,
      imageUrl: q.imageUrl || '',
    });
  };

  return (
    <div className="p-10 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Questions Management</h2>
          <p className="text-slate-500 mt-1">Configure individual questions for test series</p>
        </div>
        
        {selectedSeries && (
          <div className="flex gap-4">
            <button 
              onClick={() => { setShowBulkForm(!showBulkForm); setShowAddForm(false); }}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition shadow-sm"
            >
              {showBulkForm ? 'Cancel' : '📥 Bulk CSV Import'}
            </button>
            <button 
              onClick={() => { setShowAddForm(!showAddForm); setShowBulkForm(false); }}
              className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition shadow-sm"
            >
              {showAddForm ? 'Cancel' : '＋ Add Question'}
            </button>
          </div>
        )}
      </div>

      {/* Series Selection Dropdown */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-slate-600 mb-2">Select Test Series to Manage</label>
        <select 
          className="w-full max-w-md px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none shadow-sm font-medium text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
          value={selectedSeries}
          onChange={(e) => setSelectedSeries(e.target.value)}
          disabled={testSeriesList.length === 0}
        >
          {testSeriesList.length === 0 ? (
            <option value="" disabled>No test series available</option>
          ) : (
            testSeriesList.map(series => (
              <option key={series.id} value={series.id} className="text-slate-700 bg-white py-2">{series.title} ({series.category === 'JEE' ? 'IIT-JEE' : series.category})</option>
            ))
          )}
        </select>
      </div>

      {/* Bulk Import Panel */}
      {showBulkForm && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8 border-l-4 border-l-emerald-500 animate-fadeIn">
          <h3 className="text-xl font-bold text-slate-700 mb-2">📥 Bulk CSV Import</h3>
          <p className="text-sm text-slate-500 mb-6">
            Prepare a CSV/TSV file with the following column headers. Do not use quotes around headers.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl mb-6 overflow-x-auto text-xs font-mono text-slate-600">
            text, optionA, optionB, optionC, optionD, correctOption, solution, subject, difficulty, marks, negativeMarks, imageUrl
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <input 
              type="file" 
              accept=".csv,.txt,.tsv"
              onChange={handleBulkImport}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
            />
            <a 
              href={`data:text/csv;charset=utf-8,text,optionA,optionB,optionC,optionD,correctOption,solution,subject,difficulty,marks,negativeMarks,imageUrl%0A"Find derivative of x^2","2x","3x","x","x^2",A,"Power rule: d/dx(x^n)=n*x^(n-1)",Mathematics,Easy,4,-1,""`}
              download="questions_template.csv"
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              📥 Download Template CSV
            </a>
          </div>
        </div>
      )}

      {/* Single Add Question Form */}
      {showAddForm && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8 border-l-4 border-l-purple-500">
          <h3 className="text-xl font-bold text-slate-700 mb-6">Create New MCQ Question</h3>
          <form onSubmit={handleAddQuestion} className="flex flex-col gap-5">
            
            {/* Meta details row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Subject</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-700 font-medium" value={newQuestion.subject} onChange={(e) => setNewQuestion({...newQuestion, subject: e.target.value})}>
                  {getAvailableSubjects().map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Difficulty</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-700 font-medium" value={newQuestion.difficulty} onChange={(e) => setNewQuestion({...newQuestion, difficulty: e.target.value})}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Positive Marks</label>
                <input type="number" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-700" value={newQuestion.marks} onChange={(e) => setNewQuestion({...newQuestion, marks: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Negative Marks</label>
                <input type="number" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-700" value={newQuestion.negativeMarks} onChange={(e) => setNewQuestion({...newQuestion, negativeMarks: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Diagram Image URL (optional)</label>
              <input type="url" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-700" placeholder="https://domain.com/diagram.png" value={newQuestion.imageUrl} onChange={(e) => setNewQuestion({...newQuestion, imageUrl: e.target.value})} />
              {newQuestion.imageUrl && (
                <img src={newQuestion.imageUrl} alt="Diagram preview" className="mt-2 max-h-40 rounded-lg object-contain border" />
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-slate-600">Question Text</label>
                {/* Math symbols toolbar */}
                <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 max-w-full overflow-x-auto">
                  {symbols.map(s => (
                    <button 
                      type="button" 
                      key={s.label}
                      onClick={() => insertSymbol(s.val, 'new-question-text')}
                      className="px-2 py-1 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-600 rounded text-xs border border-slate-200 transition font-mono font-bold"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea id="new-question-text" required rows="3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-800" value={newQuestion.text} onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})} placeholder="Write your question here..."></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['A', 'B', 'C', 'D'].map(opt => (
                <div key={opt}>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Option {opt}</label>
                  <input type="text" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-800" value={newQuestion[`option${opt}`]} onChange={(e) => setNewQuestion({...newQuestion, [`option${opt}`]: e.target.value})} />
                </div>
              ))}
            </div>

            <div className="w-1/3">
              <label className="block text-sm font-semibold text-slate-600 mb-1">Correct Option</label>
              <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold text-slate-700" value={newQuestion.correctOption} onChange={(e) => setNewQuestion({...newQuestion, correctOption: e.target.value})}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-slate-600">Detailed Solution / Explanation (optional)</label>
                <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                  {symbols.map(s => (
                    <button 
                      type="button" 
                      key={s.label}
                      onClick={() => insertSymbol(s.val, 'new-question-solution')}
                      className="px-2 py-1 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-600 rounded text-xs border border-slate-200 transition font-mono font-bold"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea id="new-question-solution" rows="3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-800" value={newQuestion.solution} onChange={(e) => setNewQuestion({...newQuestion, solution: e.target.value})} placeholder="Step-by-step solution..."></textarea>
            </div>

            <button type="submit" className="mt-2 self-start bg-purple-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-purple-700 transition shadow-sm">Save Question</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 font-medium">Loading...</div>
      ) : !selectedSeries ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <p className="text-xl text-slate-500">Please create a Test Series first to add questions.</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <p className="text-xl text-slate-500">No questions found in this series. Add the first one!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold text-slate-700 mb-2">Questions in Series ({questions.length})</h3>
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0 text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <p className="font-semibold text-slate-800 text-lg leading-relaxed">{q.text}</p>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => openEditModal(q)} 
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition" 
                        title="Edit Question"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteQuestion(q.id)} 
                        className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition" 
                        title="Delete Question"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                      {q.subject || 'Physics'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                      q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      q.difficulty === 'Hard' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                      'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {q.difficulty || 'Medium'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                      Marks: {q.marks || 4} / {q.negativeMarks || -1}
                    </span>
                  </div>

                  {/* Diagram Preview */}
                  {q.imageUrl && (
                    <div className="mb-4">
                      <img src={q.imageUrl} alt="Question Diagram" className="max-h-60 rounded-lg object-contain border bg-slate-50 p-2" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {['A', 'B', 'C', 'D'].map(opt => (
                      <div key={opt} className={`px-4 py-2.5 rounded-xl text-sm border ${q.correctOption === opt ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <span className="font-bold mr-2">{opt}.</span> {q.options[opt]}
                      </div>
                    ))}
                  </div>

                  {q.solution && (
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Solution</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{q.solution}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 border border-slate-100 animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">✏️ Edit Question</h3>
              <button 
                onClick={() => setEditingQuestion(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditQuestion} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Subject</label>
                  <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-700 font-medium" value={editingQuestion.subject} onChange={(e) => setEditingQuestion({...editingQuestion, subject: e.target.value})}>
                    {getAvailableSubjects().map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Difficulty</label>
                  <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-700 font-medium" value={editingQuestion.difficulty} onChange={(e) => setEditingQuestion({...editingQuestion, difficulty: e.target.value})}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Marks</label>
                  <input type="number" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-700" value={editingQuestion.marks} onChange={(e) => setEditingQuestion({...editingQuestion, marks: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Negative Marks</label>
                  <input type="number" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-700" value={editingQuestion.negativeMarks} onChange={(e) => setEditingQuestion({...editingQuestion, negativeMarks: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Diagram Image URL (optional)</label>
                <input type="url" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-700" value={editingQuestion.imageUrl} onChange={(e) => setEditingQuestion({...editingQuestion, imageUrl: e.target.value})} />
                {editingQuestion.imageUrl && (
                  <img src={editingQuestion.imageUrl} alt="Diagram preview" className="mt-2 max-h-32 rounded-lg object-contain border bg-slate-50" />
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-slate-600">Question Text</label>
                  <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                    {symbols.map(s => (
                      <button 
                        type="button" 
                        key={s.label}
                        onClick={() => insertSymbol(s.val, 'edit-question-text', true)}
                        className="px-2 py-1 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-600 rounded text-xs border border-slate-200 transition font-mono font-bold"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea id="edit-question-text" required rows="3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-800" value={editingQuestion.text} onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})}></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <div key={opt}>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Option {opt}</label>
                    <input type="text" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-slate-800" value={editingQuestion[`option${opt}`]} onChange={(e) => setEditingQuestion({...editingQuestion, [`option${opt}`]: e.target.value})} />
                  </div>
                ))}
              </div>

              <div className="w-1/3">
                <label className="block text-sm font-semibold text-slate-600 mb-1">Correct Option</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold text-slate-700" value={editingQuestion.correctOption} onChange={(e) => setEditingQuestion({...editingQuestion, correctOption: e.target.value})}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-slate-600">Detailed Solution / Explanation (optional)</label>
                  <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                    {symbols.map(s => (
                      <button 
                        type="button" 
                        key={s.label}
                        onClick={() => insertSymbol(s.val, 'edit-question-solution', true)}
                        className="px-2 py-1 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-600 rounded text-xs border border-slate-200 transition font-mono font-bold"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea id="edit-question-solution" rows="3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-800" value={editingQuestion.solution} onChange={(e) => setEditingQuestion({...editingQuestion, solution: e.target.value})}></textarea>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingQuestion(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Questions;
