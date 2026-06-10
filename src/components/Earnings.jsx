import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const Earnings = () => {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [classRevenue, setClassRevenue] = useState({});
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState('All');

  const categories = ['All', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE', 'NEET', 'Others'];

  useEffect(() => {
    const fetchEarningsData = async () => {
      try {
        const [usersSnap, coursesSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "courses"))
        ]);

        const students = usersSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.role !== 'admin');

        const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCoursesList(courses);

        let total = 0;
        const classRevMap = {
          'Class 9': 0,
          'Class 10': 0,
          'Class 11': 0,
          'Class 12': 0,
          'IIT-JEE': 0,
          'NEET': 0,
          'Others': 0
        };
        const purchasesList = [];

        students.forEach(student => {
          const purchasedIds = student.purchasedCourses || [];
          purchasedIds.forEach(courseId => {
            const course = courses.find(c => c.id === courseId);
            if (course) {
              const price = course.price || 0;
              total += price;

              // Determine student class category for breakdown
              let studentClass = student.targetExam || 'Others';
              if (studentClass === 'JEE') studentClass = 'IIT-JEE';
              
              const isPredefined = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE', 'NEET'].includes(studentClass);
              const mappedClass = isPredefined ? studentClass : 'Others';
              classRevMap[mappedClass] = (classRevMap[mappedClass] || 0) + price;

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

        // Sort purchases by date or student name
        purchasesList.sort((a, b) => a.studentName.localeCompare(b.studentName));

        setPurchases(purchasesList);
        setTotalRevenue(total);
        setClassRevenue(classRevMap);
      } catch (error) {
        console.error("Error fetching earnings data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEarningsData();
  }, []);

  // Filter Logic
  const filteredPurchases = purchases.filter(p => {
    // 1. Text Search Filter
    const matchesSearch = p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Class Category Filter
    if (selectedClass !== 'All') {
      let currentClass = p.targetExam;
      if (currentClass === 'JEE') currentClass = 'IIT-JEE';
      
      if (selectedClass === 'Others') {
        const predefined = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE', 'NEET'];
        if (predefined.includes(currentClass)) return false;
      } else {
        if (currentClass !== selectedClass) return false;
      }
    }

    // 3. Course Filter
    if (selectedCourse !== 'All' && p.itemName !== selectedCourse) {
      return false;
    }

    return true;
  });

  // Calculate filtered stats
  const filteredTotal = filteredPurchases.reduce((sum, p) => sum + p.price, 0);
  const averageSale = purchases.length > 0 ? Math.round(totalRevenue / purchases.length) : 0;

  return (
    <div className="p-10 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Earnings Ledger 💰</h2>
          <p className="text-slate-500 mt-1">Track course sales, student purchases, and class-wise revenue breakdown</p>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 font-medium py-10 flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
          Loading earnings records...
        </div>
      ) : (
        <>
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Total Revenue</span>
                <h3 className="text-4xl font-black text-emerald-700 mt-2">₹{totalRevenue.toLocaleString()}</h3>
              </div>
              <p className="text-emerald-600 text-xs font-semibold mt-4">Total gross sales across all classes</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-sm font-bold text-indigo-800 uppercase tracking-wider">Total Sales</span>
                <h3 className="text-4xl font-black text-indigo-700 mt-2">{purchases.length}</h3>
              </div>
              <p className="text-indigo-600 text-xs font-semibold mt-4">Number of paid course subscriptions</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-sm font-bold text-amber-800 uppercase tracking-wider">Average Sale Price</span>
                <h3 className="text-4xl font-black text-amber-700 mt-2">₹{averageSale.toLocaleString()}</h3>
              </div>
              <p className="text-amber-600 text-xs font-semibold mt-4">Mean price paid per course subscription</p>
            </div>
          </div>

          {/* Class-wise Breakdown Section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 mb-10 shadow-sm">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-6">Revenue Breakdown by Class</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Bars */}
              <div className="flex flex-col gap-4">
                {Object.keys(classRevenue).map(cls => {
                  const rev = classRevenue[cls] || 0;
                  const pct = totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
                  return (
                    <div key={cls} className="flex flex-col">
                      <div className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                        <span>{cls === 'JEE' ? 'IIT-JEE' : cls}</span>
                        <span>₹{rev.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Key summary indicators */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-lg mb-3">Revenue Summary Insights</h4>
                  <ul className="text-sm text-slate-600 space-y-2 font-medium">
                    <li>🎯 <strong>IIT-JEE & NEET</strong>: High ticket pricing, focused on advanced streams.</li>
                    <li>🏫 <strong>Classes 9-12</strong>: Regular syllabus courses, foundation curriculum.</li>
                    <li>👥 <strong>Others</strong>: Custom user registrations and trial courses.</li>
                  </ul>
                </div>
                <div className="mt-6 border-t border-slate-200 pt-4 flex items-center justify-between text-sm font-bold text-slate-800">
                  <span>Calculated dynamically from:</span>
                  <span className="text-emerald-700">{purchases.length} user registrations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Sales Ledger Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Sales Ledger</h3>
                <p className="text-slate-500 text-sm mt-1">Audit detailed history of purchases</p>
              </div>

              {/* Advanced Filter Row */}
              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                {/* Search Text */}
                <input
                  type="text"
                  placeholder="Search student or course..."
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium w-full sm:w-60"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* Class Filter Dropdown */}
                <select
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold text-slate-700 cursor-pointer"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="All">All Classes</option>
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Course Title Filter */}
                <select
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold text-slate-700 cursor-pointer"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  <option value="All">All Courses</option>
                  {coursesList.map(course => (
                    <option key={course.id} value={course.title}>{course.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredPurchases.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No sales matches your current filter choices.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                      <th className="py-4 px-6">Student</th>
                      <th className="py-4 px-6">Student Class</th>
                      <th className="py-4 px-6">Purchased Course</th>
                      <th className="py-4 px-6">Access Type</th>
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
                        <td className="py-4 px-6">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                            {purchase.targetExam === 'JEE' ? 'IIT-JEE' : purchase.targetExam}
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
                
                {/* Dynamic Sum Summary */}
                <div className="bg-slate-50 p-4 px-6 flex justify-between items-center border-t border-slate-100 text-slate-800 font-bold">
                  <span>Filtered: {filteredPurchases.length} transactions</span>
                  <span className="text-emerald-700 font-black text-lg">
                    Total: ₹{filteredTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Earnings;
