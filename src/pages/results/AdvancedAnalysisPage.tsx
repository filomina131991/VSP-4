import React, { useState, useEffect } from 'react';
import { Trophy, AlertTriangle, Share2, TrendingUp, Scale, ClipboardList, Download, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import ExamSelect from '../../components/common/ExamSelect';
import Dropdown from '../../components/common/Dropdown';
import DrillDownPage from './DrillDownPage';
import PageLoader from '../../components/common/PageLoader';

const TABS = [
  { id: 'drill-down', label: 'Result Analysis', icon: BarChart2 },
  { id: 'performance', label: 'Performance Index', icon: Trophy },
  { id: 'anomaly', label: 'Anomaly Detection', icon: AlertTriangle },
  { id: 'correlation', label: 'Subject Correlation', icon: Share2 },
  { id: 'trend', label: 'Trend Analysis', icon: TrendingUp },
  { id: 'benchmark', label: 'Benchmarking', icon: Scale },
  { id: 'custom-report', label: 'Custom Report', icon: ClipboardList }
];

const AdvancedAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('drill-down');
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');

  // Data states
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [anomalyData, setAnomalyData] = useState<any>(null);
  const [correlationData, setCorrelationData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Custom Report states
  const [subjects, setSubjects] = useState<any[]>([]);
  const [customReportFilters, setCustomReportFilters] = useState({
    subjectId: 'ALL',
    allOrAny: 'ANY',
    filterType: 'grade',
    comparison: 'eq',
    gradeValue: 'A+',
    markValue: '90',
    markMin: '0',
    markMax: '100'
  });
  const [matchCountFilter, setMatchCountFilter] = useState<'ALL' | 'MATCH_ONLY'>('MATCH_ONLY');
  const [customReportData, setCustomReportData] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Record<string, boolean>>({});
  const [visibleSchoolCount, setVisibleSchoolCount] = useState(20);
  const [visibleStudentCounts, setVisibleStudentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const initPage = async () => {
      try {
        const [examsRes, subjectsRes] = await Promise.all([
          apiClient.get('/management/exams'),
          apiClient.get('/management/subjects')
        ]);
        setExams(examsRes.data);
        setSubjects(subjectsRes.data);
        if (examsRes.data.length > 0) {
          setSelectedExamId(examsRes.data[0].id);
        }
      } catch (err) {
        toast.error('Failed to initialize advanced analysis');
      }
    };
    initPage();
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;
    setCustomReportData(null);

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({ examId: selectedExamId });
        if (user?.role === 'DEO') {
          queryParams.append('districtId', user?.districtId || 'dist-9');
        } else if (user?.role === 'SCHOOL') {
          queryParams.append('schoolId', user?.schoolId || user?.id || '');
        }
        const qStr = queryParams.toString();

        const dashboardRes = await apiClient.get(`/results/advanced-dashboard?${qStr}`);
        const dash = dashboardRes.data;

        const score = dash.performance?.performanceIndex !== undefined ? Number(dash.performance.performanceIndex) : 62.0;
        const passRate = dash.performance?.victoryScore !== undefined ? Number(dash.performance.victoryScore) : 63.8;
        const quality = dash.performance?.qualityIndex !== undefined ? Number(dash.performance.qualityIndex) : 67.3;
        const consistency = dash.performance?.consistency !== undefined ? Number(dash.performance.consistency) : 100.0;
        const improvement = dash.performance?.improvement !== undefined ? Number(dash.performance.improvement) : 0.0;

        setPerformanceData({
          score, passRate, quality, consistency, improvement,
          breakdown: [
            { name: 'Pass Rate', value: passRate, fill: '#22c55e' },
            { name: 'Quality Index', value: quality, fill: '#eab308' },
            { name: 'Consistency', value: consistency, fill: '#3b82f6' },
            { name: 'Improvement', value: improvement, fill: '#d97706' }
          ]
        });

        setAnomalyData({ critical: dash.anomalies?.critical || [] });
        setCorrelationData({ pairs: dash.correlation?.pairs || [], insights: dash.correlation?.insights || [] });
        setTrendData({ trends: dash.trends?.trends || [], insights: dash.trends?.insights || [] });
        setBenchmarkData({ schools: dash.benchmarks?.schools || [] });
      } catch (err) {
        console.error(err);
        toast.error('Failed to load advanced analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [selectedExamId, user]);

  const generateCustomReport = async (filters = customReportFilters) => {
    if (!selectedExamId) return;
    setIsGeneratingReport(true);
    try {
      const queryParams = new URLSearchParams({
        examId: selectedExamId,
        subjectId: filters.subjectId,
        filterType: filters.filterType,
        comparison: filters.comparison,
        gradeValue: filters.gradeValue,
        markValue: filters.markValue,
        markMin: filters.markMin,
        markMax: filters.markMax,
        allOrAny: filters.allOrAny
      });
      if (user?.role === 'DEO') {
        queryParams.append('districtId', user?.districtId || 'dist-9');
      } else if (user?.role === 'SCHOOL') {
        queryParams.append('schoolId', user?.schoolId || user?.id || '');
      }
      const res = await apiClient.get(`/results/custom-report?${queryParams.toString()}`);
      setCustomReportData(res.data);
      setExpandedSchools({});
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate custom report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Reactive dark mode detection
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Chart theme colors — fully consistent with light/dark
  const chartGridColor   = isDark ? '#30363d' : '#e5e7eb';
  const chartAxisColor   = isDark ? '#8b949e' : '#6b7280';
  const chartCursorFill  = isDark ? '#30363d' : '#f3f4f6';
  const chartTooltipStyle = isDark
    ? { backgroundColor: '#1f242c', border: '1px solid #30363d', borderRadius: '8px', color: '#e6edf3' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };

  // ── Shared class tokens ──────────────────────────────────────────────────
  // Page wrapper
  const PAGE  = "bg-white dark:bg-[#161b22] min-h-[600px] border border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-gray-100 rounded-xl overflow-hidden shadow-sm";
  // Section card (panels, chart boxes)
  const CARD  = "bg-gray-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl shadow-sm";
  // Inner summary card (white in light, slightly lighter dark)
  const CARD2 = "bg-white dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl shadow-sm";
  // Table wrapper
  const TABLE_WRAP = "border border-gray-200 dark:border-[#30363d] rounded-2xl overflow-x-auto shadow-sm";
  // Table head
  const THEAD = "bg-[#F8F9FA] dark:bg-[#1a1f26] border-b border-gray-200 dark:border-[#30363d]";
  // Table head cell text
  const TH    = "text-gray-500 dark:text-gray-400";
  // Table dividers
  const T_DIV = "divide-y divide-gray-200 dark:divide-[#30363d]";
  const T_BORDER = "border-r border-gray-200 dark:border-[#30363d]";
  // Table row hover
  const TR_HOVER = "hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors";
  // Expanded sub-row bg
  const TR_EXP = "bg-gray-50/50 dark:bg-[#161b22]/35";
  // Select & input fields
  const INPUT = "w-full text-xs font-bold border border-gray-200 dark:border-[#30363d] rounded px-3 py-2 bg-white dark:bg-[#1f242c] text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer";
  // Divider
  const DIVIDER = "border-gray-200 dark:border-[#30363d]";

  if (isLoading) {
    return (
      <div className={PAGE}>
        <PageLoader label="Loading Advanced Analysis..." />
      </div>
    );
  }

  // ── Tab Renders ──────────────────────────────────────────────────────────

  const renderPerformance = () => {
    if (!performanceData) {
      return <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-10">No performance data available.</p>;
    }
    const pieData = [
      { name: 'Score', value: Number(performanceData.score) },
      { name: 'Rest',  value: 100 - Number(performanceData.score) }
    ];
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">
        <div className={`${CARD} p-6`}>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">Performance Index Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData.breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                <XAxis dataKey="name" stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: chartCursorFill }} 
                  contentStyle={chartTooltipStyle} 
                  formatter={(value: any) => typeof value === 'number' && !Number.isInteger(value) ? Number(value).toFixed(2) : value}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {performanceData.breakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${CARD} p-6 flex flex-col justify-between`}>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Performance Index Score</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="h-48 w-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={85}
                    startAngle={225} endAngle={-45} dataKey="value" stroke="none">
                    <Cell fill="#22c55e" />
                    <Cell fill={isDark ? '#1f242c' : '#e5e7eb'} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
                <span className="text-4xl font-black text-gray-900 dark:text-white">{Number(performanceData.score).toFixed(1)}</span>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">/ 100</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-y-6 mt-4">
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-500">{Number(performanceData.passRate).toFixed(1)}%</p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Pass Rate</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-500">{Number(performanceData.quality).toFixed(1)}%</p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Quality</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-500">{Number(performanceData.consistency).toFixed(1)}%</p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Consistency</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-orange-500">{Number(performanceData.improvement) > 0 ? '+' : ''}{Number(performanceData.improvement).toFixed(1)}%</p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Improvement</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnomaly = () => {
    if (!anomalyData?.critical?.length) {
      return <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-10">No anomaly data available.</p>;
    }
    return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
      {anomalyData.critical.map((item: any, i: number) => (
        <div key={item.title || i} className={`${CARD} p-5 flex items-center gap-4`}>
          <div className="bg-rose-100 dark:bg-rose-500/20 p-2 rounded-full text-rose-500 dark:text-rose-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${item.severity === 'high' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>{item.severity || 'info'}</span>
            <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-2">{item.title}</span>
            <p className="text-gray-900 dark:text-white text-sm font-medium mt-1">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
    );
  };

  const renderCorrelation = () => {
    if (!correlationData?.pairs?.length) {
      return <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-10">No correlation data available.</p>;
    }
    return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">
      <div className={`${CARD} p-6`}>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">Subject Pair Correlations</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={correlationData.pairs} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
              <XAxis type="number" stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} domain={[0, 1.0]} />
              <YAxis dataKey="name" type="category" stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} width={80} />
              <Tooltip 
                cursor={{ fill: chartCursorFill }} 
                contentStyle={chartTooltipStyle} 
                formatter={(value: any) => typeof value === 'number' && !Number.isInteger(value) ? Number(value).toFixed(2) : value}
              />
              <Bar dataKey="value" fill="#34d399" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className={`${CARD} p-6 flex flex-col`}>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Correlation Insights</h3>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {correlationData.insights.map((insight: any, i: number) => (
            <div key={i} className={`flex items-start gap-4 p-4 rounded-xl hover:bg-white dark:hover:bg-[#161b22] transition-colors`}>
              <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-400/10 p-2 rounded-lg shrink-0">{insight.score}</div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{insight.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{insight.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };

  const renderTrend = () => {
    if (!trendData?.trends?.length) {
      return <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-10">No trend data available.</p>;
    }
    return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">
      <div className={`${CARD} p-6`}>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Year-over-Year Performance Trend</h3>
        <div className="flex items-center gap-6 mb-6 justify-center">
          <div className="flex items-center gap-2">
            <span className="w-8 h-1 bg-[#22c55e] rounded"></span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Pass Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-1 bg-[#eab308] rounded"></span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Quality Index</span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
              <XAxis dataKey="year" stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} domain={[60, 100]} />
              <Tooltip 
                contentStyle={chartTooltipStyle} 
                formatter={(value: any) => typeof value === 'number' && !Number.isInteger(value) ? Number(value).toFixed(2) : value}
              />
              <Line type="monotone" dataKey="passRate" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} />
              <Line type="monotone" dataKey="qualityIndex" stroke="#eab308" strokeWidth={3} dot={{ r: 4, fill: '#eab308', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className={`${CARD} p-6`}>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">Trend Insights</h3>
        <div className="space-y-2">
          {trendData.insights.map((insight: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-4 hover:bg-white dark:hover:bg-[#161b22] rounded-xl transition-colors">
              <div className="flex items-start gap-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 font-mono mt-0.5">{insight.year}</span>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{insight.rate}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{insight.desc}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${insight.diff === 'Baseline'
                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'}`}>
                {insight.diff}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };

  const toggleSchoolExpanded = (schoolId: string) => {
    setExpandedSchools(prev => ({ ...prev, [schoolId]: !prev[schoolId] }));
  };

  const handleExportSummary = () => {
    if (!customReportData) return;
    const headers = ["SL No", "School Code", "School Name", "Type", "Total Appeared", "Matching Count", "Match Rate (%)"];
    const filteredSchools = customReportData.schools.filter((s: any) =>
      matchCountFilter === 'MATCH_ONLY' ? s.matchCount > 0 : true
    );
    const rows = filteredSchools.map((s: any, idx: number) => [idx + 1, s.code, s.name, s.type, s.totalAppeared, s.matchCount, s.matchRate]);
    exportToCSV(headers, rows, `Custom_Report_School_Summary_${Date.now()}.csv`);
  };

  const handleExportAllStudents = () => {
    if (!customReportData) return;
    const headers = ["SL No", "School Code", "School Name", "Roll No", "Student Name", "Gender", "Subject Grades"];
    const rows: any[][] = [];
    let idx = 1;
    const filteredSchools = customReportData.schools.filter((s: any) =>
      matchCountFilter === 'MATCH_ONLY' ? s.matchCount > 0 : true
    );
    filteredSchools.forEach((s: any) => {
      s.students.forEach((student: any) => {
        const gradesString = Object.entries(student.grades).sort(([a], [b]) => a.localeCompare(b)).map(([sub, g]) => `${sub}:${g}`).join(" | ");
        rows.push([idx++, s.code, s.name, student.regNo, student.name, student.gender, gradesString]);
      });
    });
    exportToCSV(headers, rows, `Custom_Report_All_Students_${Date.now()}.csv`);
  };

  const handleExportSchoolStudents = (school: any) => {
    const headers = ["SL No", "Roll No", "Student Name", "Gender", "Subject Grades"];
    const rows = school.students.map((student: any, idx: number) => {
      const gradesString = Object.entries(student.grades).map(([sub, g]) => `${sub}:${g}`).join(" | ");
      return [idx + 1, student.regNo, student.name, student.gender, gradesString];
    });
    exportToCSV(headers, rows, `Custom_Report_Students_${school.name.replace(/\s+/g, '_')}_${Date.now()}.csv`);
  };

  const renderCustomReport = () => {
    const summary = customReportData?.summary || { totalSchools: 0, totalStudentsMatching: 0, totalAppeared: 0 };
    const matchPercentage = summary.totalAppeared > 0
      ? ((summary.totalStudentsMatching / summary.totalAppeared) * 100).toFixed(1)
      : '0.0';

    const schools = customReportData?.schools || [];
    const filteredSchools = schools.filter((s: any) =>
      matchCountFilter === 'MATCH_ONLY' ? s.matchCount > 0 : true
    );
    const visibleSchools = filteredSchools.slice(0, visibleSchoolCount);

    const getInsightText = () => {
      if (summary.totalStudentsMatching === 0) {
        return "No students match the current criteria. Standard performance levels are uniform.";
      }
      const filterDesc = customReportFilters.filterType === 'grade'
        ? `grade is ${customReportFilters.comparison === 'eq' ? 'exactly' : customReportFilters.comparison === 'gte' ? 'above or equal to' : 'below or equal to'} ${customReportFilters.gradeValue}`
        : `score is ${customReportFilters.comparison === 'eq' ? 'exactly' : customReportFilters.comparison === 'gte' ? 'above or equal to' : customReportFilters.comparison === 'lte' ? 'below or equal to' : 'between'} ${customReportFilters.comparison === 'between' ? `${customReportFilters.markMin}-${customReportFilters.markMax}` : customReportFilters.markValue}`;
      const subjectName = customReportFilters.subjectId === 'ALL'
        ? (customReportFilters.allOrAny === 'ALL' ? 'all subjects' : 'at least one subject')
        : (subjects.find(s => s._id.toString() === customReportFilters.subjectId)?.name || 'the selected subject');
      return `Analysis: ${summary.totalStudentsMatching} students (${matchPercentage}% of total appeared) satisfy the criteria where the ${filterDesc} in ${subjectName}. Recommended action: target these schools and plan subject-specific counseling sessions.`;
    };

    return (
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">

        {/* Left: Filters Panel */}
        <div className={`xl:col-span-1 ${CARD} p-5 h-fit space-y-5`}>
          <div>
            <h3 className="text-sm font-black uppercase text-indigo-500 tracking-wider">Report Filters</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">Configure criteria & generate</p>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-1 gap-3 md:gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-500">Subject</label>
              <Dropdown
                className="w-full"
                ariaLabel="Select Subject"
                value={customReportFilters.subjectId}
                onChange={(v) => setCustomReportFilters(prev => ({ ...prev, subjectId: v }))}
                options={[
                  { value: 'ALL', label: 'ALL Subjects' },
                  ...subjects.map(s => ({ value: s._id.toString(), label: s.name })),
                ]}
              />
            </div>

            {customReportFilters.subjectId === 'ALL' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Scope</label>
                <Dropdown
                  className="w-full"
                  ariaLabel="Select Scope"
                  value={customReportFilters.allOrAny}
                  onChange={(v) => setCustomReportFilters(prev => ({ ...prev, allOrAny: v }))}
                  options={[
                    { value: 'ANY', label: 'In At Least One Subject' },
                    { value: 'ALL', label: 'In All Subjects' },
                    { value: 'TOTAL', label: 'Overall / Total Percentage' },
                  ]}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-500">Filter By</label>
              <Dropdown
                className="w-full"
                ariaLabel="Filter By"
                value={customReportFilters.filterType}
                onChange={(v) => setCustomReportFilters(prev => ({ ...prev, filterType: v, comparison: 'eq' }))}
                options={[
                  { value: 'grade', label: 'Grade' },
                  { value: 'mark', label: 'Marks' },
                ]}
              />
            </div>

            {customReportFilters.filterType === 'grade' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Grade Value</label>
                <Dropdown
                  className="w-full"
                  ariaLabel="Grade Value"
                  value={customReportFilters.gradeValue}
                  onChange={(v) => setCustomReportFilters(prev => ({ ...prev, gradeValue: v }))}
                  options={["A+", "A", "B+", "B", "C+", "C", "D+", "D", "E", "Ab"].map(g => ({ value: g, label: g }))}
                />
              </div>
            )}

            {!(customReportFilters.filterType === 'grade' && customReportFilters.gradeValue === 'Ab') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Condition</label>
                <Dropdown
                  className="w-full"
                  ariaLabel="Condition"
                  value={customReportFilters.comparison}
                  onChange={(v) => setCustomReportFilters(prev => ({ ...prev, comparison: v }))}
                  options={[
                    { value: 'eq', label: 'Equal to (=)' },
                    { value: 'gte', label: 'Greater or Equal (>=)' },
                    { value: 'lte', label: 'Less or Equal (<=)' },
                    ...(customReportFilters.filterType === 'mark' ? [{ value: 'between', label: 'Between' }] : []),
                  ]}
                />
              </div>
            )}

            {customReportFilters.filterType === 'mark' && (
              customReportFilters.comparison === 'between' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Min Score</label>
                    <input type="number" value={customReportFilters.markMin}
                      onChange={e => setCustomReportFilters(prev => ({ ...prev, markMin: e.target.value }))}
                      className={INPUT} placeholder="0" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Max Score</label>
                    <input type="number" value={customReportFilters.markMax}
                      onChange={e => setCustomReportFilters(prev => ({ ...prev, markMax: e.target.value }))}
                      className={INPUT} placeholder="100" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Score Value</label>
                  <input type="number" value={customReportFilters.markValue}
                    onChange={e => setCustomReportFilters(prev => ({ ...prev, markValue: e.target.value }))}
                    className={INPUT} placeholder="90" />
                </div>
              )
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-500">Match Count Filter</label>
              <Dropdown
                className="w-full"
                ariaLabel="Match Count Filter"
                value={matchCountFilter}
                onChange={(v) => setMatchCountFilter(v as 'ALL' | 'MATCH_ONLY')}
                options={[
                  { value: 'ALL', label: 'All' },
                  { value: 'MATCH_ONLY', label: 'Match Count Only' },
                ]}
              />
            </div>
          </div>

          {/* Quick Quality Brackets */}
          <div className={`pt-4 border-t ${DIVIDER}`}>
            <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Quick Quality Analysis</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { const f = { ...customReportFilters, filterType: 'mark', comparison: 'gte', markValue: '90' }; setCustomReportFilters(f); setTimeout(() => generateCustomReport(f), 0); }}
                className="text-[10px] font-bold py-2 px-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-center shadow-sm">
                Top Performers (&ge;90)
              </button>
              <button onClick={() => { const f = { ...customReportFilters, filterType: 'mark', comparison: 'between', markMin: '60', markMax: '89' }; setCustomReportFilters(f); setTimeout(() => generateCustomReport(f), 0); }}
                className="text-[10px] font-bold py-2 px-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-center shadow-sm">
                Average (60-89)
              </button>
              <button onClick={() => { const f = { ...customReportFilters, filterType: 'mark', comparison: 'between', markMin: '35', markMax: '59' }; setCustomReportFilters(f); setTimeout(() => generateCustomReport(f), 0); }}
                className="text-[10px] font-bold py-2 px-1 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors text-center shadow-sm">
                Borderline (35-59)
              </button>
              <button onClick={() => { const f = { ...customReportFilters, filterType: 'mark', comparison: 'lte', markValue: '34' }; setCustomReportFilters(f); setTimeout(() => generateCustomReport(f), 0); }}
                className="text-[10px] font-bold py-2 px-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-center shadow-sm">
                Critical (&le;34)
              </button>
            </div>
          </div>

          <button
            onClick={() => generateCustomReport()}
            disabled={isGeneratingReport}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {isGeneratingReport ? (
              <><div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin"></div>Generating...</>
            ) : "Generate Report"}
          </button>
        </div>

        {/* Right: Results */}
        <div className="xl:col-span-3 space-y-6">
          {isGeneratingReport ? (
            <div className={`${CARD2} flex flex-col items-center justify-center py-20 h-full`}>
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-400 mt-4 uppercase tracking-widest">Generating Custom Analysis...</p>
            </div>
          ) : !customReportData ? (
            <div className={`${CARD2} flex flex-col items-center justify-center py-20 h-full text-center p-6`}>
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-full text-indigo-500 dark:text-indigo-400 mb-4 animate-bounce">
                <ClipboardList size={32} />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">No Report Generated</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Select your filters on the left panel and click <span className="text-emerald-500 font-extrabold">Generate Report</span> to analyze custom academic performance results.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">

              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className={`${CARD2} p-5 flex flex-col justify-between active-tap`}>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider single-line-label">Matching Schools</span>
                  <span className="text-3xl font-black text-gray-900 dark:text-white mt-2">
                    {matchCountFilter === 'MATCH_ONLY' ? filteredSchools.length : summary.totalSchools}
                  </span>
                </div>
                <div className={`${CARD2} p-5 flex flex-col justify-between`}>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Matching Students</span>
                  <span className="text-3xl font-black text-gray-900 dark:text-white mt-2">{summary.totalStudentsMatching.toLocaleString()}</span>
                </div>
                <div className={`${CARD2} p-5 flex flex-col justify-between`}>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Match Percentage</span>
                  <span className="text-3xl font-black text-emerald-500 mt-2">{matchPercentage}%</span>
                </div>
              </div>

              {/* Insight box */}
              <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 p-5 rounded-2xl flex gap-4 items-start shadow-sm">
                <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded-full text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">AI Analysis Insight</h4>
                  <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium mt-1 leading-relaxed">{getInsightText()}</p>
                </div>
              </div>

              {/* Actions row */}
              <div className={`flex items-center justify-between border-b ${DIVIDER} pb-4`}>
                <span className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-white">School Wise Breakdown</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportSummary}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border ${DIVIDER} bg-white dark:bg-[#1f242c] hover:bg-gray-50 dark:hover:bg-[#21262d] text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-sm text-gray-700 dark:text-gray-200`}
                  >
                    <Download size={14} />Export Summary
                  </button>
                  <button
                    onClick={handleExportAllStudents}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95 shadow-sm"
                  >
                    <Download size={14} />Export All Students
                  </button>
                </div>
              </div>

              {/* Schools table */}
              <div className={TABLE_WRAP}>
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead className={THEAD}>
                    <tr>
                      {["SL", "School Code", "School Name", "Type", "Appeared", "Match Count", "Match Rate", "Actions"].map((h, i) => (
                        <th key={h} className={`px-4 py-3 text-xs font-black ${TH} uppercase ${i < 7 ? `${T_BORDER}` : ''} ${h === 'SL' ? 'w-16' : h === 'School Code' ? 'w-24' : h === 'School Name' ? 'min-w-[200px]' : h === 'Actions' ? 'w-32' : 'w-24'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={T_DIV}>
                    {filteredSchools.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400 font-bold">
                          {schools.length === 0 ? "No schools have students matching these criteria" : "No schools match the selected filters"}
                        </td>
                      </tr>
                    ) : (
                      visibleSchools.map((school: any, idx: number) => {
                        const isExpanded = expandedSchools[school.schoolId];
                        const visibleStudents = school.students.slice(0, visibleStudentCounts[school.schoolId] || 20);
                        return (
                          <React.Fragment key={school.schoolId}>
                            <tr className={TR_HOVER}>
                              <td className={`px-4 py-3 text-xs ${T_BORDER} text-gray-500`}>{idx + 1}</td>
                              <td className={`px-4 py-3 text-xs ${T_BORDER} font-mono text-gray-700 dark:text-gray-300`}>{school.code}</td>
                              <td className={`px-4 py-3 text-xs ${T_BORDER} font-bold text-gray-900 dark:text-white`}>{school.name}</td>
                              <td className={`px-4 py-3 text-xs ${T_BORDER} text-gray-700 dark:text-gray-300`}>{school.type}</td>
                              <td className={`px-4 py-3 text-xs ${T_BORDER} text-gray-700 dark:text-gray-300`}>{school.totalAppeared}</td>
                              <td className={`px-4 py-3 text-xs ${T_BORDER} font-bold text-gray-900 dark:text-white`}>{school.matchCount}</td>
                              <td className={`px-4 py-3 text-xs ${T_BORDER} font-black text-emerald-500`}>{school.matchRate}%</td>
                              <td className="px-4 py-3 text-xs">
                                <button
                                  onClick={() => toggleSchoolExpanded(school.schoolId)}
                                  className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-left"
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  {school.students.length} Students
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className={TR_EXP}>
                                <td colSpan={8} className={`p-4 border-b ${DIVIDER}`}>
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider">
                                        Matching Students in {school.name}
                                      </h4>
                                      <button
                                        onClick={() => handleExportSchoolStudents(school)}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 text-[10px] font-bold uppercase rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95"
                                      >
                                        <Download size={12} />Export List
                                      </button>
                                    </div>
                                    <div className={`border ${DIVIDER} rounded-xl overflow-hidden bg-white dark:bg-[#161b22] shadow-inner`}>
                                      <table className="w-full text-left border-collapse">
                                        <thead className={`${THEAD}`}>
                                          <tr className={`border-b ${DIVIDER}`}>
                                            {["SL", "Roll No", "Student Name", "Gender", "Grades"].map((h, i) => (
                                              <th key={h} className={`px-4 py-2 text-[10px] font-black ${TH} uppercase ${i < 4 ? T_BORDER : ''}`}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className={T_DIV}>
                                          {visibleStudents.map((student: any, sIdx: number) => (
                                            <tr key={student.studentId} className={TR_HOVER}>
                                              <td className={`px-4 py-2 text-xs text-gray-500 ${T_BORDER}`}>{sIdx + 1}</td>
                                              <td className={`px-4 py-2 text-xs font-mono text-gray-700 dark:text-gray-300 ${T_BORDER}`}>{student.regNo}</td>
                                              <td className={`px-4 py-2 text-xs font-bold text-gray-900 dark:text-white ${T_BORDER}`}>{student.name}</td>
                                              <td className={`px-4 py-2 text-xs text-gray-700 dark:text-gray-300 ${T_BORDER}`}>{student.gender}</td>
                                              <td className="px-4 py-2 text-xs font-mono flex flex-wrap gap-1.5">
                                                {Object.entries(student.grades).sort(([a], [b]) => a.localeCompare(b)).map(([subCode, grade]: any) => (
                                                  <span key={subCode} className={cn(
                                                    "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                                    grade === 'A+' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                                    (grade === 'D' || grade === 'E' || grade === 'Ab') ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' :
                                                    'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400'
                                                  )}>
                                                    {subCode}: {grade}
                                                  </span>
                                                ))}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                      {school.students.length > (visibleStudentCounts[school.schoolId] || 20) && (
                                        <div className="p-3 border-t border-gray-200 dark:border-[#30363d]">
                                          <button
                                            onClick={() => setVisibleStudentCounts(prev => ({
                                              ...prev,
                                              [school.schoolId]: (prev[school.schoolId] || 20) + 20
                                            }))}
                                            className="w-full py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                                          >
                                            Show More ({school.students.length - (visibleStudentCounts[school.schoolId] || 20)} remaining)
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {filteredSchools.length > visibleSchoolCount && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => setVisibleSchoolCount(prev => prev + 20)}
                    className="px-6 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95 shadow-sm"
                  >
                    Load More ({filteredSchools.length - visibleSchoolCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBenchmark = () => {
    if (!benchmarkData?.schools?.length) {
      return <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-10">No benchmark data available.</p>;
    }
    return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
      {benchmarkData.schools.map((school: any, i: number) => (
        <div key={school.name || i} className={`${CARD} p-6`}>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">{school.name}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-3 bg-white dark:bg-[#161b22] rounded-xl border border-gray-200 dark:border-[#30363d]">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">School</p>
              <p className="text-lg font-black text-gray-900 dark:text-white mt-2">{(school.rate ?? 0).toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">vs State</p>
              <p className={`text-lg font-black mt-2 ${(school.vsState ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {(school.vsState ?? 0) > 0 ? '+' : ''}{(school.vsState ?? 0).toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">vs District</p>
              <p className={`text-lg font-black mt-2 ${(school.vsDist ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {(school.vsDist ?? 0) > 0 ? '+' : ''}{(school.vsDist ?? 0).toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">vs Edu Dist</p>
              <p className={`text-lg font-black mt-2 ${(school.vsEdu ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {(school.vsEdu ?? 0) > 0 ? '+' : ''}{(school.vsEdu ?? 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
    );
  };

  return (
    <div className={PAGE}>
      <div className="max-w-7xl mx-auto space-y-6 p-5">

        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${DIVIDER} pb-5`}>
          <div className="w-full sm:w-auto overflow-hidden">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter text-gray-900 dark:text-white uppercase single-line-label w-full">
              Advanced Analysis
            </h1>
          </div>

          {/* Exam Selector */}
          <ExamSelect
            exams={exams}
            selectedExamId={selectedExamId}
            onSelect={(id) => setSelectedExamId(id)}
            className="min-w-[160px]"
          />
        </div>

        {/* Tab Nav */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 w-full">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all w-full active-tap native-touch-target ${
                  isActive
                    ? 'bg-blue-600 dark:bg-[#1f6feb] text-white border border-blue-600 dark:border-[#1f6feb] shadow-sm'
                    : `bg-gray-100 dark:bg-[#1f242c] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#30363d] hover:bg-gray-200 dark:hover:bg-[#21262d] shadow-sm`
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="single-line-label text-center sm:text-left">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="pb-4">
          {activeTab === 'drill-down' && <DrillDownPage isEmbedded={true} examId={selectedExamId} />}
          {activeTab === 'performance' && renderPerformance()}
          {activeTab === 'anomaly' && renderAnomaly()}
          {activeTab === 'correlation' && renderCorrelation()}
          {activeTab === 'trend' && renderTrend()}
          {activeTab === 'benchmark' && renderBenchmark()}
          {activeTab === 'custom-report' && renderCustomReport()}
        </div>

      </div>
    </div>
  );
};

// CSV Export Helper
const exportToCSV = (headers: string[], rows: any[][], filename: string) => {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(val => {
      const stringVal = val === undefined || val === null ? "" : String(val);
      const cleanVal = stringVal.replace(/"/g, '""');
      return `"${cleanVal}"`;
    }).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default AdvancedAnalysisPage;
