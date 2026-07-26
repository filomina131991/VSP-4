import React, { useState, useEffect } from 'react';
import { ClipboardList, Download, Save, RefreshCw, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import { cn } from '../../lib/utils';

export interface CustomReportModuleProps {
  user: any;
  selectedExamId: string;
  exams: any[];
  subjects: any[];
}

const CustomReportModule: React.FC<CustomReportModuleProps> = ({ user, selectedExamId, exams, subjects }) => {
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
  const [matchCountFilter, setMatchCountFilter] = useState<'ALL' | 'MATCH_ONLY'>('ALL');
  const [customReportData, setCustomReportData] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Record<string, boolean>>({});

  const [presets, setPresets] = useState<any[]>([]);
  const [compareExamId, setCompareExamId] = useState('');
  const [compareReportData, setCompareReportData] = useState<any>(null);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const CARD = 'bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl shadow-sm';
  const CARD2 = 'bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl shadow-sm overflow-hidden';
  const INPUT = 'w-full px-3 py-2 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl text-xs font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all dark:text-white';
  const DIVIDER = 'border-gray-200 dark:border-[#30363d]';
  const chartTooltipStyle = { backgroundColor: '#1f242c', border: '1px solid #30363d', borderRadius: '8px', color: '#f3f4f6', fontSize: '10px', fontWeight: 'bold' };
  
  const TABLE_WRAP = 'overflow-x-auto bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl shadow-sm';
  const THEAD = 'bg-gray-50 dark:bg-[#1f242c] text-left';
  const TH = 'px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-[#30363d]';
  const T_BORDER = 'border-b border-gray-100 dark:border-[#21262d]';
  const T_DIV = 'flex items-center gap-2';
  const TR_HOVER = 'hover:bg-gray-50 dark:hover:bg-[#1f242c] transition-colors';
  const TR_EXP = 'bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-[#30363d]';

  const exportToCSV = (headers: string[], rows: any[][], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"\${String(c).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const chartGridColor = isDark ? '#30363d' : '#e5e7eb';
  const chartAxisColor = isDark ? '#8b949e' : '#6b7280';
  const chartCursorFill = isDark ? '#30363d' : '#f3f4f6';

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const presetsRes = await apiClient.get('/user-presets').catch(() => ({ data: [] }));
        if (presetsRes && presetsRes.data) setPresets(presetsRes.data);
      } catch(e) {}
    };
    fetchPresets();
  }, []);

  useEffect(() => {
    setCustomReportData(null);
    setCompareReportData(null);
  }, [selectedExamId]);

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;
    try {
      const payload = {
        name: newPresetName.trim(),
        filters: customReportFilters
      };
      const res = await apiClient.post('/user-presets', payload);
      setPresets([...presets, res.data]);
      setNewPresetName('');
      setShowSavePresetModal(false);
      toast.success('Preset saved successfully');
    } catch (err) {
      toast.error('Failed to save preset');
    }
  };

  const handleLoadPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    if (!pId) return;
    const p = presets.find(x => x.id === pId);
    if (p && p.filters) {
      setCustomReportFilters(p.filters);
      toast.success('Preset loaded');
    }
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
        const gradesString = Object.entries(student.grades).map(([sub, g]) => `${sub}:${g}`).join(" | ");
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

  const schools = customReportData?.schools || [];
  const activeSchoolsReport = schools.filter((s: any) =>
    matchCountFilter === 'MATCH_ONLY' ? s.matchCount > 0 : true
  );

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

const renderCustomReport = () => {
    const summary = customReportData?.summary || { totalSchools: 0, totalStudentsMatching: 0, totalAppeared: 0 };
    const matchPercentage = summary.totalAppeared > 0
      ? ((summary.totalStudentsMatching / summary.totalAppeared) * 100).toFixed(1)
      : '0.0';

    const schools = customReportData?.schools || [];
    const filteredSchools = schools.filter((s: any) =>
      matchCountFilter === 'MATCH_ONLY' ? s.matchCount > 0 : true
    );

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

    // Shared select className
    const SELECT = "vz-select-bare";

    return (
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">

        {/* Left: Filters Panel */}
        <div className={`xl:col-span-1 ${CARD} p-5 h-fit space-y-5`}>
          <div>
            <h3 className="text-sm font-black uppercase text-indigo-500 tracking-wider">Report Filters</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">Configure criteria & generate</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-500">Subject</label>
              <select
                value={customReportFilters.subjectId}
                onChange={e => setCustomReportFilters(prev => ({ ...prev, subjectId: e.target.value }))}
                className={SELECT}
              >
                <option value="ALL">ALL Subjects</option>
                {subjects
                  .filter(s => s.shortName !== 'P10' && s.name !== 'P10' && !s.name.includes('P10'))
                  .map(s => (
                    <option key={s.id} value={s._id.toString()}>{s.name}</option>
                  ))}
              </select>
            </div>

            {customReportFilters.subjectId === 'ALL' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Scope</label>
                <select
                  value={customReportFilters.allOrAny}
                  onChange={e => setCustomReportFilters(prev => ({ ...prev, allOrAny: e.target.value }))}
                  className={SELECT}
                >
                  <option value="ANY">In At Least One Subject</option>
                  <option value="ALL">In All Subjects</option>
                  <option value="TOTAL">Overall / Total Percentage</option>
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-500">Filter By</label>
              <select
                value={customReportFilters.filterType}
                onChange={e => setCustomReportFilters(prev => ({ ...prev, filterType: e.target.value, comparison: 'eq' }))}
                className={SELECT}
              >
                <option value="grade">Grade</option>
                <option value="mark">Marks</option>
              </select>
            </div>

            {customReportFilters.filterType === 'grade' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Grade Value</label>
                <select
                  value={customReportFilters.gradeValue}
                  onChange={e => setCustomReportFilters(prev => ({ ...prev, gradeValue: e.target.value }))}
                  className={SELECT}
                >
                  {["A+", "A", "B+", "B", "C+", "C", "D+", "D", "E", "Ab"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            )}

            {!(customReportFilters.filterType === 'grade' && customReportFilters.gradeValue === 'Ab') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500">Condition</label>
                <select
                  value={customReportFilters.comparison}
                  onChange={e => setCustomReportFilters(prev => ({ ...prev, comparison: e.target.value }))}
                  className={SELECT}
                >
                  <option value="eq">Equal to (=)</option>
                  <option value="gte">Greater or Equal (&gt;=)</option>
                  <option value="lte">Less or Equal (&lt;=)</option>
                  {customReportFilters.filterType === 'mark' && <option value="between">Between</option>}
                </select>
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
              <select
                value={matchCountFilter}
                onChange={e => setMatchCountFilter(e.target.value as 'ALL' | 'MATCH_ONLY')}
                className={SELECT}
              >
                <option value="ALL">All</option>
                <option value="MATCH_ONLY">Match Count Only</option>
              </select>
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
                      filteredSchools.map((school: any, idx: number) => {
                        const isExpanded = expandedSchools[school.schoolId];
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
                                          {school.students.map((student: any, sIdx: number) => (
                                            <tr key={student.studentId} className={TR_HOVER}>
                                              <td className={`px-4 py-2 text-xs text-gray-500 ${T_BORDER}`}>{sIdx + 1}</td>
                                              <td className={`px-4 py-2 text-xs font-mono text-gray-700 dark:text-gray-300 ${T_BORDER}`}>{student.regNo}</td>
                                              <td className={`px-4 py-2 text-xs font-bold text-gray-900 dark:text-white ${T_BORDER}`}>{student.name}</td>
                                              <td className={`px-4 py-2 text-xs text-gray-700 dark:text-gray-300 ${T_BORDER}`}>{student.gender}</td>
                                              <td className="px-4 py-2 text-xs font-mono flex flex-wrap gap-1.5">
                                                 {Object.entries(student.grades).map(([subCode, grade]: any) => {
                                                   const isSelected = customReportFilters.filterType === 'grade' && grade === customReportFilters.gradeValue;
                                                   return (
                                                     <span key={subCode} className={cn(
                                                       "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all",
                                                       isSelected ? 'bg-yellow-400 text-black dark:bg-yellow-500 dark:text-black font-black ring-2 ring-yellow-300 dark:ring-yellow-600 scale-105 shadow-md' :
                                                       grade === 'A+' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                                       (grade === 'D' || grade === 'E' || grade === 'Ab') ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' :
                                                       'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400'
                                                     )}>
                                                       {subCode}: {grade}
                                                     </span>
                                                   );
                                                 })}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
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
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderCustomReport()}
      {showSavePresetModal && (
        <Modal isOpen={showSavePresetModal} onClose={() => setShowSavePresetModal(false)} disableOutsideClick={true}>
          <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase mb-4">Save Filter Preset</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 block">Preset Name</label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  placeholder="e.g. High Performers in Science"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setShowSavePresetModal(false)}
                  className="flex-1 px-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 dark:bg-[#1f242c] dark:hover:bg-[#30363d] rounded-xl transition-colors uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreset}
                  disabled={!newPresetName.trim()}
                  className="flex-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 rounded-xl transition-colors uppercase disabled:cursor-not-allowed"
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default CustomReportModule;
