import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { onAuthStateChanged, signOut, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getCountFromServer, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './components/Login';
import Courses from './components/Courses';
import TestSeries from './components/TestSeries';
import Questions from './components/Questions';
import Materials from './components/Materials';
import Students from './components/Students';
import Notifications from './components/Notifications';
import Earnings from './components/Earnings';
import PapersBundles from './components/PapersBundles';

const Sidebar = ({ userRole }) => {
  const handleLogout = () => {
    signOut(auth);
  };

  const linkClass = ({ isActive }) => 
    `px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white font-bold shadow-md' : 'hover:bg-slate-800 hover:text-blue-300'}`;

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen p-6 flex flex-col shadow-xl">
      <h1 className="text-3xl font-extrabold mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">Curos Admin</h1>
      <nav className="flex flex-col gap-2 flex-1">
        <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
        <NavLink to="/courses" className={linkClass}>Courses</NavLink>
        <NavLink to="/test-series" className={linkClass}>Test Series</NavLink>
        <NavLink to="/questions" className={linkClass}>Questions Upload</NavLink>
        <NavLink to="/papers" className={linkClass}>📝 Papers & Bundles</NavLink>
        <NavLink to="/materials" className={linkClass}>Materials</NavLink>
        <div className="h-px bg-slate-700 my-3"></div>
        <NavLink to="/students" className={linkClass}>👥 Students</NavLink>
        {userRole === 'superadmin' && (
          <NavLink to="/earnings" className={linkClass}>💰 Earnings</NavLink>
        )}
        <NavLink to="/notifications" className={linkClass}>🔔 Notifications</NavLink>
      </nav>
      <button 
        onClick={handleLogout}
        className="mt-auto px-4 py-3 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-colors duration-200 font-medium text-left"
      >
        Sign Out
      </button>
    </div>
  );
};

const Dashboard = ({ userRole }) => {
  const [stats, setStats] = useState({ courses: 0, testSeries: 0, materials: 0, questions: 0, students: 0, notifications: 0 });
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Sub-Admin Management States
  const [adminList, setAdminList] = useState([]);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchAdmins = async () => {
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const admins = usersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.role === 'admin');
      setAdminList(admins);
    } catch (e) {
      console.error("Error fetching admins:", e);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [cSnap, tsSnap, mSnap, qSnap, nSnap, smSnap] = await Promise.all([
          getCountFromServer(collection(db, "courses")),
          getCountFromServer(collection(db, "testSeries")),
          getCountFromServer(collection(db, "materials")),
          getCountFromServer(collection(db, "questions")),
          getCountFromServer(collection(db, "notifications")),
          getCountFromServer(collection(db, "studyMaterials")),
        ]);

        const [usersSnap, coursesListSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "courses"))
        ]);

        const students = usersSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.role !== 'admin' && u.role !== 'superadmin');

        const courses = coursesListSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let earningsSum = 0;
        const purchasesList = [];

        students.forEach(student => {
          const purchasedIds = student.purchasedCourses || [];
          purchasedIds.forEach(courseId => {
            const course = courses.find(c => c.id === courseId);
            if (course) {
              const price = course.price || 0;
              earningsSum += price;
              purchasesList.push({
                id: `${student.id}_${course.id}`,
                studentName: student.name || 'Unnamed Student',
                studentEmail: student.email || 'No Email',
                itemName: course.title,
                itemType: 'Course',
                price: price,
                targetExam: student.targetExam || 'Not Specified',
                purchasedAt: student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'Unknown'
              });
            }
          });
        });

        // Sort purchases by student name
        purchasesList.sort((a, b) => a.studentName.localeCompare(b.studentName));

        setPurchases(purchasesList);
        setTotalEarnings(earningsSum);

        setStats({
          courses: cSnap.data().count,
          testSeries: tsSnap.data().count,
          materials: mSnap.data().count + smSnap.data().count,
          questions: qSnap.data().count,
          students: students.length,
          notifications: nSnap.data().count,
        });

        // Load active admins list for superadmin
        if (userRole === 'superadmin') {
          const admins = usersSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(u => u.role === 'admin');
          setAdminList(admins);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userRole]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setAdminError("Please fill out all fields.");
      return;
    }
    setIsGenerating(true);
    setAdminError('');
    setAdminSuccess('');
    // Secondary Firebase Config to prevent current admin logout
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    };

    const secName = `secApp_${Date.now()}`;
    const secApp = initializeApp(firebaseConfig, secName);
    const secAuth = getAuth(secApp);

    try {
      const cred = await createUserWithEmailAndPassword(secAuth, adminEmail.trim(), adminPassword);
      const userId = cred.user.uid;

      // Save sub-admin role to users db
      await setDoc(doc(db, "users", userId), {
        name: adminName.trim(),
        email: adminEmail.trim(),
        role: 'admin',
        createdAt: new Date().toISOString()
      });

      await signOut(secAuth);

      setAdminSuccess(`Sub-Admin registered successfully: ${adminEmail.trim()}`);
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      fetchAdmins();
    } catch (err) {
      console.error(err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        msg = "This email is already registered.";
      } else if (err.code === 'auth/weak-password') {
        msg = "Password should be at least 6 characters.";
      }
      setAdminError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (window.confirm("Are you sure you want to revoke this admin's access?")) {
      try {
        await deleteDoc(doc(db, "users", adminId));
        setAdminSuccess("Admin access revoked.");
        fetchAdmins();
      } catch (e) {
        console.error(e);
        setAdminError("Failed to revoke access.");
      }
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^&*()";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminPassword(pass);
  };

  const statCards = [
    ...(userRole === 'superadmin' ? [{ label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-l-4 border-l-emerald-500 shadow-emerald-100/50' }] : []),
    { label: 'Total Courses', value: stats.courses, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Test Series', value: stats.testSeries, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Materials', value: stats.materials, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Questions', value: stats.questions, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Students', value: stats.students, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Notifications', value: stats.notifications, color: 'text-pink-500', bg: 'bg-pink-50' },
  ];

  const filteredPurchases = purchases.filter(p => 
    p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-10 w-full">
      <h2 className="text-4xl font-extrabold text-slate-800 mb-8 tracking-tight">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className={`bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow ${stat.bg}`}>
            <h3 className="text-lg font-medium text-slate-500">{stat.label}</h3>
            <p className={`text-5xl font-black ${stat.color} mt-3`}>
              {loading ? '...' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Superadmin Section: Sub-Admins Management */}
      {userRole === 'superadmin' && (
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Admin Account Generator Form */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm border-t-4 border-t-blue-500">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Create Sub-Admin</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">Generate sub-admin login credentials</p>

            {adminError && <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-lg mb-6 text-sm font-medium">{adminError}</div>}
            {adminSuccess && <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 p-3 rounded-lg mb-6 text-sm font-medium">{adminSuccess}</div>}

            <form onSubmit={handleCreateAdmin} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" 
                  value={adminName} 
                  onChange={(e) => setAdminName(e.target.value)} 
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" 
                  value={adminEmail} 
                  onChange={(e) => setAdminEmail(e.target.value)} 
                  placeholder="e.g. staff@curos.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Password</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required 
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" 
                    value={adminPassword} 
                    onChange={(e) => setAdminPassword(e.target.value)} 
                    placeholder="Enter password or generate one"
                  />
                  <button 
                    type="button" 
                    onClick={generatePassword}
                    className="bg-slate-800 text-white px-4 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
                  >
                    🎲 Generate
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isGenerating}
                className="mt-2 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-70"
              >
                {isGenerating ? 'Registering Sub-Admin...' : '👤 Create Sub-Admin Account'}
              </button>
            </form>
          </div>

          {/* Sub-Admins Directory */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Active Sub-Admins</h3>
              <p className="text-slate-500 text-sm mt-1 mb-6">Staff with restricted dashboard access (no Earnings tab)</p>
              
              {adminList.length === 0 ? (
                <p className="text-slate-400 italic text-sm py-4">No active sub-admins created yet.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-2">
                  {adminList.map(adm => (
                    <div key={adm.id} className="py-3.5 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{adm.name}</p>
                        <p className="text-slate-400 text-xs font-medium">{adm.email}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteAdmin(adm.id)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-xl transition font-semibold text-xs"
                      >
                        Revoke Access
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-500 text-xs font-medium mt-4">
              🛡️ Sub-admins can manage courses, test series, materials, and student registrations, but the <strong>Earnings tab is completely hidden</strong> from them.
            </div>
          </div>
        </div>
      )}

      {/* Earnings & Purchase Details Section (visible only to superadmin) */}
      {userRole === 'superadmin' && (
        <div className="mt-12 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Recent Purchases & Earnings Details</h3>
              <p className="text-slate-500 text-sm mt-1">Detailed log of courses unlocked by registered students</p>
            </div>
            
            {/* Search bar for table */}
            <div className="w-full md:w-80">
              <input
                type="text"
                placeholder="Search student or course..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-slate-500 py-10 text-center font-medium">Loading transactions data...</div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-500 font-medium">
                {searchTerm ? 'No purchase matching search term found.' : 'No purchases recorded yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <th className="py-4 px-6">Student</th>
                    <th className="py-4 px-6">Class/Target Exam</th>
                    <th className="py-4 px-6">Purchased Item</th>
                    <th className="py-4 px-6">Item Type</th>
                    <th className="py-4 px-6 text-right">Price Paid</th>
                    <th className="py-4 px-6">Purchase Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map(purchase => (
                    <tr key={purchase.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">{purchase.studentName}</div>
                        <div className="text-xs text-slate-400 font-medium">{purchase.studentEmail}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                          {purchase.targetExam}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-700">{purchase.itemName}</td>
                      <td className="py-4 px-6">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs font-semibold">
                          {purchase.itemType}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-black text-emerald-600 text-right">
                        ₹{purchase.price}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-semibold text-xs">
                        {purchase.purchasedAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Table Footer with Filtered sum */}
              <div className="bg-slate-50 p-4 px-6 flex justify-between items-center border-t border-slate-100 text-slate-800 font-bold">
                <span>Showing {filteredPurchases.length} transactions</span>
                <span className="text-emerald-700 font-black text-base">
                  Total: ₹{filteredPurchases.reduce((sum, p) => sum + p.price, 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === 'admin' || data.role === 'superadmin') {
              setUser(currentUser);
              setUserRole(data.role);
            } else {
              await signOut(auth);
              alert("Access Denied: You do not have administrator permissions.");
              setUser(null);
              setUserRole(null);
            }
          } else {
            // Default user to superadmin if no doc exists in Firestore (for the initial auth user)
            setUser(currentUser);
            setUserRole('superadmin');
          }
        } catch (e) {
          console.error("Error verifying admin role:", e);
          setUser(currentUser);
          setUserRole('superadmin'); // fallback
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-400 rounded-full mb-4"></div>
          <p className="text-xl text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="flex font-sans bg-slate-50 min-h-screen">
        <Sidebar userRole={userRole} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard userRole={userRole} />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/test-series" element={<TestSeries />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/papers" element={<PapersBundles />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/students" element={<Students />} />
            <Route path="/earnings" element={
              userRole === 'superadmin' ? (
                <Earnings />
              ) : (
                <div className="p-10 font-extrabold text-rose-500 text-lg">
                  Access Denied: You do not have permissions to view this section.
                </div>
              )
            } />
            <Route path="/notifications" element={<Notifications />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
