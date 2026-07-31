import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  LayoutGrid,
  FileText,
  PieChart,
  ClipboardList,
  School as SchoolIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import Modal from '../../components/common/Modal';
import PageLoader from '../../components/common/PageLoader';
import { cn } from '../../lib/utils';
import {
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface DashboardStats {
  teachingSubjects: string[];
  assignedClasses: string[];
  classStats: { _id: string; total: number; boys: number; girls: number; }[];
  questions: { total: number; approved: number; draft: number; };
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showPendingAlert, setShowPendingAlert] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get('/teacher/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch teacher dashboard");
      } finally {
        setLoading(false);
      }
    };
    
    const fetchTasks = async () => {
      try {
        const res = await apiClient.get('/teacher/tasks');
        setTasks(res.data);
        if (res.data && res.data.some((t: any) => t.status !== 'Completed')) {
          setShowPendingAlert(true);
        }
      } catch (err) {
        console.error("Failed to fetch teacher tasks");
      } finally {
        setLoadingTasks(false);
      }
    };
    
    fetchDashboard();
    fetchTasks();
  }, []);

  if (loading) return <PageLoader />;
  if (!stats) return <div className="p-8 text-center text-gray-500">Failed to load dashboard data.</div>;

  const totalStudents = stats.classStats.reduce((acc, curr) => acc + curr.total, 0);
  
  // Filter assigned classes to only those that have active students (or just show all if none have students yet)
  const activeAssignedClasses = stats.assignedClasses.filter(c => stats.classStats.some(s => s._id === c));
  const displayClasses = activeAssignedClasses.length > 0 ? activeAssignedClasses : stats.assignedClasses;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pt-2 pb-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-950 dark:text-white tracking-tight uppercase flex items-center gap-3">
          <SchoolIcon size={32} className="text-blue-600 dark:text-[#1f6feb] shrink-0" />
          Teacher Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1.5 single-row-desc">
          Welcome back, {user?.name || user?.username}! Overview of your assigned classes and subjects.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <HeroStat 
          icon={<Users size={24} className="text-blue-600 dark:text-blue-400" />}
          label="Total Students"
          value={totalStudents.toString()}
          subText={`Across ${stats.classStats.length} Classes`}
          color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        />
        <HeroStat 
          icon={<LayoutGrid size={24} className="text-emerald-600 dark:text-emerald-400" />}
          label="Assigned Classes"
          value={displayClasses.length.toString()}
          subText={displayClasses.join(', ') || "No classes"}
          color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
        />
        <HeroStat 
          icon={<BookOpen size={24} className="text-amber-600 dark:text-amber-400" />}
          label="Subjects"
          value={stats.teachingSubjects.length.toString()}
          subText={stats.teachingSubjects.join(', ') || "No subjects"}
          color="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
        />
        <HeroStat 
          icon={<FileText size={24} className="text-purple-600 dark:text-purple-400" />}
          label="My Questions"
          value={stats.questions.total.toString()}
          subText={`${stats.questions.approved} Approved, ${stats.questions.draft} Draft`}
          color="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Breakdown */}
        <div className="bg-white dark:bg-[#161b22] p-6 rounded-3xl border border-gray-200 dark:border-[#30363d] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <PieChart size={18} className="text-gray-400" />
              Class Demographics
            </h3>
          </div>
          
          <div className="space-y-4">
            {stats.classStats.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No assigned classes found.</p>
            ) : (
              stats.classStats.map(c => (
                <div key={c._id} className="bg-gray-50 dark:bg-[#0d1117] border border-gray-100 dark:border-[#30363d] p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Class {c._id}</h4>
                    <p className="text-xs text-gray-500 font-medium">Total: {c.total} Students</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-sm font-black text-blue-600 dark:text-blue-400">{c.boys}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">Boys</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-black text-pink-600 dark:text-pink-400">{c.girls}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">Girls</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Demographics Chart */}
        <div className="bg-white dark:bg-[#161b22] p-6 rounded-3xl border border-gray-200 dark:border-[#30363d] shadow-sm">
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Demographics Chart</h3>
          {stats.classStats.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.classStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="_id" tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: '#1f2937', borderRadius: '12px', border: 'none', color: '#fff', fontWeight: 'bold' }} 
                  />
                  <Bar dataKey="boys" name="Boys" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="girls" name="Girls" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 w-full flex items-center justify-center text-sm text-gray-500 font-medium">
              Not enough data
            </div>
          )}
        </div>
      </div>

      {/* Assigned Tasks */}
      <div className="bg-white dark:bg-[#161b22] p-6 rounded-3xl border border-gray-200 dark:border-[#30363d] shadow-sm">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6">
          <ClipboardList size={18} className="text-gray-400" />
          My Assigned Tasks
        </h3>
        {loadingTasks ? (
          <div className="text-sm text-gray-500 text-center py-4">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">No tasks assigned yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-[#30363d]">
              <thead className="bg-gray-50 dark:bg-[#0d1117]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Unit</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Target</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#161b22] divide-y divide-gray-200 dark:divide-[#30363d]">
                {tasks.map((task, idx) => (
                  <tr key={task._id || idx}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{task.subjectName || task.subjectId}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{task.unit}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-center text-gray-900 dark:text-gray-100">
                      {task.progress && task.progress.length > 0 ? (
                        <div className="flex flex-col gap-1 items-center">
                          {task.progress.map((p: any, i: number) => (
                            <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {p.mark === 'Total' ? '' : `${p.mark}m: `}{p.current}/{p.target}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>{task.questionsCount}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-black rounded-full uppercase tracking-wider ${
                        task.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
                      }`}>
                        {task.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Tasks Alert Modal */}
      {showPendingAlert && (
        <Modal isOpen={showPendingAlert} onClose={() => setShowPendingAlert(false)} disableOutsideClick={true}>
          <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-[#30363d]">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pending Tasks!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              You have new question targets assigned by the Subject Expert. Please complete them as soon as possible.
            </p>
            <button 
              onClick={() => setShowPendingAlert(false)}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
            >
              OK
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const HeroStat = ({ icon, label, value, subText, color }: { icon: any, label: string, value: string, subText?: string, color: string }) => {
  let hoverStyles = "group-hover:border-blue-400 group-hover:shadow-blue-100/50";
  if (color.includes("emerald")) {
    hoverStyles = "group-hover:border-emerald-400 group-hover:shadow-emerald-100/50";
  } else if (color.includes("amber")) {
    hoverStyles = "group-hover:border-amber-400 group-hover:shadow-amber-100/50";
  } else if (color.includes("purple")) {
    hoverStyles = "group-hover:border-purple-400 group-hover:shadow-purple-100/50";
  }

  return (
    <div className={cn(
      "bg-white dark:bg-[#161b22] p-5 rounded-3xl border border-gray-200 dark:border-[#30363d] shadow-sm group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-out cursor-default flex flex-col justify-between h-32 active-tap",
      hoverStyles
    )}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] truncate">{label}</div>
        <div className={cn("p-2 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0", color)}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-black text-black dark:text-white tracking-tight leading-none truncate">{value}</div>
        {subText && <div className="text-[10px] text-gray-400 dark:text-gray-400 mt-1.5 font-bold uppercase tracking-wider truncate" title={subText}>{subText}</div>}
      </div>
    </div>
  );
};

export default TeacherDashboard;
