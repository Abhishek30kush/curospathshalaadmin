import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNotif, setNewNotif] = useState({ title: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "notifications"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleAddNotification = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, "notifications"), {
        title: newNotif.title,
        message: newNotif.message,
        createdAt: new Date().toISOString(),
        sentBy: 'admin'
      });
      setNewNotif({ title: '', message: '' });
      setShowAddForm(false);
      fetchNotifications();
    } catch (err) {
      console.error("Error adding notification:", err);
      setError(err.message || "Failed to send notification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotification = async (notifId) => {
    if (window.confirm("Are you sure you want to delete this notification?")) {
      try {
        await deleteDoc(doc(db, "notifications", notifId));
        fetchNotifications();
      } catch (error) {
        console.error("Error deleting notification:", error);
      }
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="p-10 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Notifications</h2>
          <p className="text-slate-500 mt-1">Send announcements to all students</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-pink-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-pink-700 transition shadow-sm"
        >
          {showAddForm ? 'Cancel' : '📢 Send New'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8 border-l-4 border-l-pink-500">
          <h3 className="text-xl font-bold text-slate-700 mb-2">New Announcement</h3>
          <p className="text-sm text-slate-400 mb-6">This will be visible to all students in their notification feed.</p>
          {error && <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleAddNotification} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Title</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none"
                value={newNotif.title}
                onChange={(e) => setNewNotif({...newNotif, title: e.target.value})}
                placeholder="e.g. Important: Exam Schedule Update"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Message</label>
              <textarea
                required
                rows="4"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none"
                value={newNotif.message}
                onChange={(e) => setNewNotif({...newNotif, message: e.target.value})}
                placeholder="Write your announcement message here..."
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 self-start bg-pink-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-pink-700 transition shadow-sm disabled:opacity-70"
            >
              {isSubmitting ? 'Sending...' : '📤 Send to All Students'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 font-medium">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <p className="text-5xl mb-4">🔔</p>
          <p className="text-xl text-slate-500">No notifications sent yet.</p>
          <p className="text-sm text-slate-400 mt-2">Send an announcement to keep students updated.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {notifications.map((notif, idx) => (
            <div
              key={notif.id}
              className={`bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition ${
                idx === 0 ? 'border-l-4 border-l-pink-500 border-pink-100' : 'border-slate-100'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-pink-500' : 'bg-slate-300'}`}></span>
                  <span className="text-sm text-slate-400 font-medium">{getTimeAgo(notif.createdAt)}</span>
                </div>
                <button
                  onClick={() => handleDeleteNotification(notif.id)}
                  className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition shrink-0"
                  title="Delete Notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{notif.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{notif.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
