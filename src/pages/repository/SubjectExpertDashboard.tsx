import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { Users, FileText, CheckCircle, Clock, Download, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLoader from '../../components/common/PageLoader';

const getMarkColor = (marks: number | string) => {
  switch (Number(marks)) {
    case 1: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case 2: return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case 3: return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case 5: return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case 10: return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
    default: return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
  }
};

export default function SubjectExpertDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/subject-expert/dashboard');
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load subject expert dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    let csv = 'Subject Report\n\n';
    csv += `Subject Names,${data.subjectNames}\n`;
    csv += `Total Teachers,${data.totalTeachers}\n`;
    csv += `Total Questions,${data.totalQuestions}\n\n`;

    csv += 'Questions by Marks Category\n';
    csv += 'Marks,Count\n';
    Object.keys(data.marksDistribution).sort().forEach(mark => {
      csv += `${mark} Marks,${data.marksDistribution[mark]}\n`;
    });
    csv += '\n';

    csv += 'Questions by Level\n';
    csv += 'Level,Count\n';
    csv += `Basic,${data.levelDistribution.Basic}\n`;
    csv += `Average,${data.levelDistribution.Average}\n`;
    csv += `Profound,${data.levelDistribution.Profound}\n\n`;

    csv += 'Chapter/Unit Configuration\n';
    csv += 'Class,Medium,Chapter/Unit,Sub-Units\n';
    if (data.chapters && data.chapters.length > 0) {
      data.chapters.forEach((chap: any) => {
        csv += `${chap.className},${chap.medium},"${chap.chapterName}","${chap.subUnits.join('; ')}"\n`;
      });
    } else {
      csv += 'No chapters configured\n';
    }
    csv += '\n';

    csv += 'Completed Task Teachers\n';
    csv += 'Name,School Code,Questions Created\n';
    data.completedTeachers.forEach((t: any) => {
      csv += `"${t.name}",${t.schoolCode},${t.count}\n`;
    });
    csv += '\n';

    csv += 'Pending Task Teachers\n';
    csv += 'Name,School Code\n';
    data.pendingTeachers.forEach((t: any) => {
      csv += `"${t.name}",${t.schoolCode}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `subject_expert_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !data) return <PageLoader label="Loading Subject Dashboard..." />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b pb-4 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Subject Expert Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Subjects: <span className="font-semibold text-blue-600 dark:text-blue-400">{data.subjectNames || 'None'}</span></p>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
        >
          <Download size={18} /> Export Subject Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#161b22] p-5 rounded-2xl border border-gray-200 dark:border-[#30363d] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Teachers</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{data.totalTeachers}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-5 rounded-2xl border border-gray-200 dark:border-[#30363d] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Questions</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{data.totalQuestions}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-5 rounded-2xl border border-gray-200 dark:border-[#30363d] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Tasks</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{data.completedTeachers.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-5 rounded-2xl border border-gray-200 dark:border-[#30363d] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Tasks</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{data.pendingTeachers.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 dark:border-gray-700 flex items-center gap-2">
            <BarChart2 size={20}/> Questions by Marks
          </h2>
          <div className="space-y-3">
            {Object.keys(data.marksDistribution).length > 0 ? (
              Object.keys(data.marksDistribution).sort((a,b)=>Number(a)-Number(b)).map(mark => (
                <div key={mark} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#21262d] rounded-xl border border-gray-100 dark:border-[#30363d]">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{mark} Marks</span>
                  <span className={`${getMarkColor(mark)} font-bold px-3 py-1 rounded-full text-sm`}>
                    {data.marksDistribution[mark]} Questions
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No questions found.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 dark:border-gray-700 flex items-center gap-2">
            <BarChart2 size={20}/> Questions by Level
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#21262d] rounded-xl border border-gray-100 dark:border-[#30363d]">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Basic (Easy)</span>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold px-3 py-1 rounded-full text-sm">
                {data.levelDistribution.Basic} Questions
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#21262d] rounded-xl border border-gray-100 dark:border-[#30363d]">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Average (Medium)</span>
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold px-3 py-1 rounded-full text-sm">
                {data.levelDistribution.Average} Questions
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#21262d] rounded-xl border border-gray-100 dark:border-[#30363d]">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Profound (Hard)</span>
              <span className="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-bold px-3 py-1 rounded-full text-sm">
                {data.levelDistribution.Profound} Questions
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-6 shadow-sm max-h-[400px] overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 sticky top-0 bg-white dark:bg-[#161b22] pb-2 border-b dark:border-gray-700">
            Completed Task Teachers <span className="text-sm font-normal text-gray-500">({data.completedTeachers.length})</span>
          </h2>
          <div className="space-y-2">
            {data.completedTeachers.length > 0 ? (
              data.completedTeachers.map((t: any) => (
                <div key={t.id} className="p-3 bg-gray-50 dark:bg-[#21262d] border border-gray-100 dark:border-[#30363d] rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{t.name || 'Unnamed Teacher'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">School: {t.schoolCode}</p>
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-md">
                    {t.count} Created
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">No completed tasks yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-6 shadow-sm max-h-[400px] overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 sticky top-0 bg-white dark:bg-[#161b22] pb-2 border-b dark:border-gray-700">
            Pending Task Teachers <span className="text-sm font-normal text-gray-500">({data.pendingTeachers.length})</span>
          </h2>
          <div className="space-y-2">
            {data.pendingTeachers.length > 0 ? (
              data.pendingTeachers.map((t: any) => (
                <div key={t.id} className="p-3 bg-gray-50 dark:bg-[#21262d] border border-gray-100 dark:border-[#30363d] rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{t.name || 'Unnamed Teacher'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">School: {t.schoolCode}</p>
                  </div>
                  <span className="text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-md">
                    Pending
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">No pending tasks.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
