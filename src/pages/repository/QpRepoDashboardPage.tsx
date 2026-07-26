import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { getCleanSubjectName } from '../../lib/subjectUtils';
import { BarChart2, BookOpen, CheckCircle, Clock, XCircle, PieChart as PieChartIcon } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function QpRepoDashboardPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/questions');
      setQuestions(res.data || []);
    } catch (error: any) {
      console.error('Failed to load questions', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get('/management/subjects');
      setSubjects(res.data || []);
    } catch (error: any) {
      console.error('Failed to load subjects', error);
    }
  };

  // Metrics
  const totalQuestions = questions.length;
  const approvedQuestions = questions.filter(q => q.status === 'Approved').length;
  const pendingQuestions = questions.filter(q => q.status === 'Pending').length;
  const rejectedQuestions = questions.filter(q => q.status === 'Rejected' || q.status === 'Returned for Modification').length;

  // Medium Wise Data
  const mediumWiseData = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach(q => {
      const medium = q.medium || 'Unknown';
      counts[medium] = (counts[medium] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [questions]);

  // Subject Wise Data
  const subjectWiseData = useMemo(() => {
    const counts: Record<string, { count: number; name: string }> = {};

    questions.forEach(q => {
      const subjectId = q.subjectId || q.subject?._id || q.subject?.id || (typeof q.subject === 'string' ? q.subject : '') || 'Unknown';
      const key = String(subjectId).trim();
      if (!key) return;

      if (!counts[key]) {
        const subjectObj = subjects.find(s => 
          String(s.id || '').trim() === key || 
          String(s._id || '').trim() === key || 
          String(s.code || '').trim().toUpperCase() === key.toUpperCase() ||
          String(s.shortName || '').trim().toUpperCase() === key.toUpperCase()
        );

        let resolvedName = '';
        if (subjectObj) {
          resolvedName = subjectObj.shortName ? `${subjectObj.shortName} - ${getCleanSubjectName(subjectObj.name)}` : subjectObj.name;
        } else if (q.subjectName) {
          resolvedName = getCleanSubjectName(q.subjectName);
        } else if (q.subject?.name) {
          resolvedName = getCleanSubjectName(q.subject.name);
        } else if (q.paperName) {
          resolvedName = getCleanSubjectName(q.paperName);
        } else if (/^[0-9a-fA-F]{24}$/.test(key)) {
          resolvedName = `Subject (${key.slice(-4)})`;
        } else {
          resolvedName = key;
        }

        counts[key] = { count: 0, name: resolvedName };
      }

      counts[key].count += 1;
    });

    return Object.values(counts)
      .map(item => ({ name: item.name, value: item.count }))
      .sort((a, b) => b.value - a.value);
  }, [questions, subjects]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto flex-1 h-full overflow-y-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart2 className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">QP Repo Dashboard</h1>
          <p className="text-sm text-gray-500 font-medium">Question Paper Repository System Analytics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Questions</p>
            <BookOpen className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">{totalQuestions}</p>
        </div>

        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Task Complete (Approved)</p>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">{approvedQuestions}</p>
          <p className="text-xs text-emerald-600 font-bold mt-1">
            {totalQuestions > 0 ? Math.round((approvedQuestions / totalQuestions) * 100) : 0}% Completion
          </p>
        </div>

        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Pending Review</p>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">{pendingQuestions}</p>
        </div>

        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Needs Mod / Rejected</p>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">{rejectedQuestions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medium Wise Chart */}
        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-blue-500" />
            Medium-Wise Question Count
          </h2>
          <div className="h-[300px] w-full">
            {mediumWiseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mediumWiseData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {mediumWiseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No data available</div>
            )}
          </div>
        </div>

        {/* Subject Wise Chart */}
        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-500" />
            Subject-Wise Question Task Complete
          </h2>
          <div className="h-[300px] w-full">
            {subjectWiseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={subjectWiseData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fontWeight: 700 }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={60}
                    stroke="#9ca3af"
                  />
                  <YAxis tick={{ fontSize: 12, fontWeight: 700 }} stroke="#9ca3af" />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" name="Total Questions" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {subjectWiseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
