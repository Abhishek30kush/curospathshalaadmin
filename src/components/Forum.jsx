import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, getDoc, orderBy, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function Forum() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  // New reply state
  const [replyText, setReplyText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const userId = auth.currentUser?.uid;
  const userEmail = auth.currentUser?.email;
  const categories = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'General'];

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'forums'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const threadList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setThreads(threadList);
    } catch (e) {
      console.error("Error fetching threads:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchReplies = async (threadId) => {
    setRepliesLoading(true);
    try {
      const q = query(collection(db, `forums/${threadId}/replies`), orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      const replyList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReplies(replyList);
    } catch (e) {
      console.error("Error fetching replies:", e);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleSelectThread = (thread) => {
    setSelectedThread(thread);
    fetchReplies(thread.id);
  };

  const handleDeleteThread = async (threadId) => {
    if (window.confirm("Are you sure you want to delete this doubt thread? All replies will also be deleted from the database.")) {
      try {
        await deleteDoc(doc(db, 'forums', threadId));
        setSelectedThread(null);
        fetchThreads();
      } catch (e) {
        console.error("Error deleting thread:", e);
      }
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (window.confirm("Are you sure you want to delete this reply?")) {
      try {
        await deleteDoc(doc(db, `forums/${selectedThread.id}/replies`, replyId));
        fetchReplies(selectedThread.id);
      } catch (e) {
        console.error("Error deleting reply:", e);
      }
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThread) return;

    try {
      let authorName = "Instructor";
      if (userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          authorName = userDoc.data().name || userEmail.split('@')[0] + " (Staff)";
        }
      }

      const newReply = {
        body: replyText.trim(),
        authorId: userId,
        authorName: authorName,
        isAdminReply: true,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, `forums/${selectedThread.id}/replies`), newReply);
      setReplyText('');
      fetchReplies(selectedThread.id);
    } catch (e) {
      console.error("Error posting reply:", e);
    }
  };

  const filteredThreads = activeCategory === 'All' 
    ? threads 
    : threads.filter(t => t.subject === activeCategory);

  return (
    <div className="p-10 w-full bg-slate-50 min-h-screen">
      <div className="mb-8">
        <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">💬 Student Doubt Forum</h2>
        <p className="text-slate-500 mt-1">Answer, manage, and moderate questions submitted by students.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left pane: Threads list */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelectedThread(null); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-12 text-slate-400 font-medium">Loading threads...</div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
                No doubts posted in this category.
              </div>
            ) : (
              filteredThreads.map(thread => (
                <div
                  key={thread.id}
                  onClick={() => handleSelectThread(thread)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedThread?.id === thread.id
                      ? 'bg-blue-50/50 border-blue-500'
                      : 'bg-white border-slate-100 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                      {thread.subject}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(thread.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2">{thread.title}</h3>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-slate-500 text-xs font-semibold">By {thread.authorName}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteThread(thread.id); }}
                      className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right pane: Thread details and replies */}
        <div className="lg:col-span-2">
          {selectedThread ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-8 flex flex-col gap-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex gap-2 items-center mb-3">
                    <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded text-xs font-extrabold uppercase">
                      {selectedThread.subject}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Posted on {new Date(selectedThread.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 leading-snug">{selectedThread.title}</h2>
                  <p className="text-slate-500 text-xs font-bold mt-1">Submitted by {selectedThread.authorName}</p>
                </div>
                <button
                  onClick={() => handleDeleteThread(selectedThread.id)}
                  className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white font-bold py-1.5 px-3 rounded-lg text-xs transition"
                >
                  Delete Doubt
                </button>
              </div>

              <div className="text-slate-700 text-sm bg-slate-50 p-5 rounded-2xl leading-relaxed whitespace-pre-wrap">
                {selectedThread.body}
              </div>

              {/* Replies list */}
              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-4">Replies / Responses</h3>
                {repliesLoading ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-semibold">Loading responses...</div>
                ) : replies.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-2xl">
                    No responses yet. Answer this student's doubt below.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {replies.map(reply => (
                      <div key={reply.id} className={`p-4 rounded-xl border text-xs flex justify-between items-start ${
                        reply.isAdminReply 
                          ? 'bg-emerald-50/30 border-emerald-100' 
                          : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1.5 font-bold text-slate-500">
                            <span className={reply.isAdminReply ? 'text-emerald-700' : ''}>
                              {reply.authorName} {reply.isAdminReply ? '🛡️ (Staff)' : ''}
                            </span>
                            <span className="font-medium text-[10px]">{new Date(reply.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteReply(reply.id)}
                          className="text-rose-500 hover:text-rose-700 font-bold ml-4"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Answer submission form */}
              <form onSubmit={handlePostReply} className="flex gap-3 items-end border-t border-slate-100 pt-4">
                <div className="flex-1">
                  <textarea
                    rows="3"
                    required
                    placeholder="Provide a detailed, clear response to help the student..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs text-slate-800 resize-none shadow-inner"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl text-xs active:scale-95 transition shadow-lg shadow-blue-500/20"
                >
                  Post Answer
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-slate-100 min-h-[400px]">
              <span className="text-5xl mb-4">💬</span>
              <h3 className="text-lg font-bold text-slate-800">Select a Student Doubt</h3>
              <p className="text-slate-400 text-xs max-w-xs mt-1 leading-relaxed">
                Click on any student doubt from the list to view its description, moderate content, or post instructor answers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
