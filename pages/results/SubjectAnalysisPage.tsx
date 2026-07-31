import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Printer, 
  Filter,
  BarChart2,
  AlertCircle,
  BookOpen,
  CheckCircle,
  ChevronDown,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import PageLoader from '../../components/common/PageLoader';
import ExamSelect from '../../components/common/ExamSelect';
import Dropdown from '../../components/common/Dropdown';

const getSubjectSortKey = (code: string) => {
  const c = (code || '').toUpperCase();
  if (c.includes('P01') || c === 'LAN I' || c === 'AT' || c.includes(' AT') || c.includes('(AT)')) return 'P01';
  if (c.includes('P02') || c === 'LAN II' || c === 'BT' || c.includes(' BT') || c.includes('(BT)')) return 'P02';
  if (c.includes('P03') || c === 'ENG') return 'P03';
  if (c.includes('P04') || c === 'HIN') return 'P04';
  if (c.includes('P05') || c === 'SS') return 'P05';
  if (c.includes('P06') || c === 'PHY') return 'P06';
  if (c.includes('P07') || c === 'CHE') return 'P07';
  if (c.includes('P08') || c === 'BIO') return 'P08';
  if (c.includes('P09') || c === 'MAT') return 'P09';
  if (c.includes('P10') || c === 'IT') return 'P10';
  return c;
};

interface SubjectStat {
  slNo: number;
  subject: string;
  total: number;
  appeared: number;
  pass: number;
  fail: number;
  aPlus: number;
  a: number;
  bPlus: number;
  b: number;
  cPlus: number;
  c: number;
  dPlus: number;
  d: number;
  e: number;
  absents: number;
}

interface AnalysisData {
  revenueDistrict: string;
  data: SubjectStat[];
}

const SubjectAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const { mediums } = useData();
  const [searchParams] = useSearchParams();
  const [districts, setDistricts] = useState<any[]>([]);
  const [eduDistricts, setEduDistricts] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  const [filters, setFilters] = useState({
    districtId: searchParams.get('districtId') || user?.districtId || 'dist-9',
    eduId: searchParams.get('eduId') || 'ALL',
    schoolType: 'ALL',
    gender: 'ALL'
  });

  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedium, setSelectedMedium] = useState<string>('ALL');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [configuredExamIds, setConfiguredExamIds] = useState<string[]>([]);

  const fetchFilters = async () => {
    if (user?.role === 'SCHOOL') return; // no need for general filters
    try {
      const districtId = user?.districtId || filters.districtId;
      const res = await apiClient.get(`/management/educational-districts?districtId=${districtId}`);
      setEduDistricts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalysis = async (examIdToUse = selectedExamId) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.role === 'SCHOOL') {
        const schoolId = user.schoolId || user.id;
        params.append('schoolId', schoolId);
      } else {
        params.append('districtId', filters.districtId);
        if (filters.eduId !== 'ALL') params.append('eduId', filters.eduId);
        if (filters.schoolType !== 'ALL') params.append('schoolType', filters.schoolType);
        if (filters.gender !== 'ALL') params.append('gender', filters.gender);
      }
      
      if (examIdToUse) {
        params.append('examId', examIdToUse);
      }
      if (selectedDivision !== 'ALL') {
        params.append('division', selectedDivision);
      }

      const res = await apiClient.get(`/results/subject-analysis?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to fetch analysis data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
    const loadExamsAndData = async () => {
      try {
        const promises: any[] = [
          apiClient.get('/management/exams')
        ];
        if (user?.role === 'SCHOOL') {
          promises.push(apiClient.get('/school/configured-exams'));
        }
        const results = await Promise.all(promises);
        const examsRes = results[0];
        setExams(examsRes.data);
        if (user?.role === 'SCHOOL' && results[1]) {
          setConfiguredExamIds(results[1].data || []);
        }
        if (examsRes.data.length > 0) {
          setSelectedExamId(examsRes.data[0].id);
          fetchAnalysis(examsRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load exams', err);
      }
    };
    loadExamsAndData();
  }, [user]);

  useEffect(() => {
    if (selectedExamId) {
      fetchAnalysis();
    }
  }, [filters, selectedExamId, selectedDivision]);

  const handlePrint = () => {
    window.print();
  };

  const isSchoolUser = user?.role === 'SCHOOL';

  // Detect available mediums from data
  const availableMediums = React.useMemo(() => {
    if (!data?.data) return [];
    const mediums = new Set<string>();
    data.data.forEach((row: any) => {
      const code = (row.shortCode || '').toUpperCase();
      if (code.endsWith(' TM')) mediums.add('Tamil');
      else if (code.endsWith(' EM')) mediums.add('English');
      else if (code.endsWith(' MM')) mediums.add('Malayalam');
    });
    return Array.from(mediums);
  }, [data]);

  // Filter data by selected medium
  const filteredData = React.useMemo(() => {
    if (!data?.data) return [];
    if (selectedMedium === 'ALL') return data.data;
    const foundMedium = mediums.find(m => m.name === selectedMedium);
    const suffix = foundMedium ? ` ${foundMedium.shortName}` : ` ${selectedMedium.substring(0, 2).toUpperCase()}`;
    return data.data.filter((row: any) => {
      const code = (row.shortCode || '').toUpperCase();
      return code.endsWith(suffix);
    });
  }, [data, selectedMedium, mediums]);

  if (isLoading) {
    return <PageLoader label="Loading Subject Analysis..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-5 print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-black tracking-tighter uppercase flex items-center gap-4">
            {isSchoolUser ? "Subject Analysis (My School)" : "Subject Grade Wall ( District Wise )"}
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">
            {isSchoolUser ? "Subject-wise performance metrics for your candidates." : "Detailed subject-wise grading distribution and analysis."}
            {isSchoolUser && selectedDivision !== 'ALL' && <span className="ml-2 text-amber-600 font-bold">Division: {selectedDivision}</span>}
            {isSchoolUser && selectedDivision === 'ALL' && <span className="ml-2 text-emerald-600 font-bold">All Divisions Combined</span>}
          </p>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
          <button 
            onClick={handlePrint}
            className="p-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      {/* Filters (Hidden for School user) */}
      {!isSchoolUser ? (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <FilterSelect 
              label="Educational District"
              value={filters.eduId}
              onChange={(val) => setFilters(prev => ({ ...prev, eduId: val }))}
              options={[
                { value: 'ALL', label: 'ALL' },
                ...eduDistricts.map(e => ({ value: e.id, label: e.name }))
              ]}
            />
            <FilterSelect 
              label="School Type"
              value={filters.schoolType}
              onChange={(val) => setFilters(prev => ({ ...prev, schoolType: val }))}
              options={[
                { value: 'ALL', label: 'ALL' },
                { value: 'Government', label: 'Government' },
                { value: 'Aided', label: 'Aided' },
                { value: 'Unaided', label: 'Unaided' }
              ]}
            />
            <FilterSelect 
              label="Gender"
              value={filters.gender}
              onChange={(val) => setFilters(prev => ({ ...prev, gender: val }))}
              options={[
                { value: 'ALL', label: 'ALL' },
                { value: 'BOYS', label: 'Boys' },
                { value: 'GIRLS', label: 'Girls' }
              ]}
            />
            <FilterSelect 
              label="Exam Term"
              value={selectedExamId}
              onChange={(val) => setSelectedExamId(val)}
              options={exams.map(e => ({ value: e.id, label: e.name }))}
            />
          </div>
          <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900">
              Revenue District :- <span className="text-blue-600 uppercase">{data?.revenueDistrict}</span>
            </div>
            <button 
              onClick={() => fetchAnalysis()}
              className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Submit
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm print:hidden flex flex-col gap-4">
          <div className="text-sm font-bold text-gray-900 uppercase w-full">
            Viewing School Results Live :- <span className="text-amber-600">{data?.revenueDistrict}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
            {exams.length > 0 && (
              <ExamSelect
                exams={exams}
                selectedExamId={selectedExamId}
                onSelect={(id) => setSelectedExamId(id)}
                configuredIds={configuredExamIds}
                className="min-w-[160px]"
              />
            )}
            <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-gray-400">Div:</span>
              <select
                value={selectedDivision}
                onChange={e => setSelectedDivision(e.target.value)}
                className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full"
              >
                <option value="ALL" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">ALL</option>
                {['A', 'B', 'C', 'D', 'E', 'F'].map(div => (
                  <option key={div} value={div} className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">{div}</option>
                ))}
              </select>
            </div>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ml-auto">
              Protected School Node
            </span>
          </div>
          {availableMediums.length > 1 && (
            <Dropdown
              ariaLabel="Select Medium"
              value={selectedMedium}
              onChange={(v) => setSelectedMedium(v)}
              options={[
                { value: 'ALL', label: 'All Mediums' },
                ...availableMediums.map(m => ({ value: m, label: m })),
              ]}
            />
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#161b22] rounded-xl border border-gray-200 dark:border-[#30363d] shadow-sm mt-8 overflow-x-auto">
        <table className="w-full border-collapse text-[13px] leading-tight" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '5.5%' }} />
            <col style={{ width: '5.5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-50/50 dark:bg-[#1a1f26] border-b border-gray-200 dark:border-[#30363d]">
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">Sl</th>
              <th className="px-3 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-left border-r border-gray-100 dark:border-[#30363d]">Subject</th>
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">Total</th>
              <th className="px-2 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">Appr</th>
              <th className="px-2 py-3 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">Pass</th>
              <th className="px-2 py-3 text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">Fail</th>
              <th className="px-2 py-3 text-[10px] font-black text-red-400 dark:text-red-400 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">Abs</th>
              <th className="px-2 py-3 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">A+</th>
              <th className="px-2 py-3 text-[10px] font-black text-emerald-500 dark:text-emerald-300 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">A</th>
              <th className="px-2 py-3 text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">B+</th>
              <th className="px-2 py-3 text-[10px] font-black text-blue-400 dark:text-blue-300 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">B</th>
              <th className="px-2 py-3 text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">C+</th>
              <th className="px-2 py-3 text-[10px] font-black text-amber-400 dark:text-amber-300 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">C</th>
              <th className="px-2 py-3 text-[10px] font-black text-orange-500 dark:text-orange-400 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">D+</th>
              <th className="px-2 py-3 text-[10px] font-black text-orange-400 dark:text-orange-300 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">D</th>
              <th className="px-2 py-3 text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest text-center border-r border-gray-100 dark:border-[#30363d]">E</th>
              <th className="px-2 py-3 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest text-center">Pass%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={17} className="px-4 py-6">
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : (
              <>
                {filteredData.length === 0 && data?.data && data.data.length > 0 ? (
                  <tr>
                    <td colSpan={17} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen size={24} className="text-gray-300" />
                        <p className="text-sm font-bold text-gray-400">No subject data for {selectedMedium} medium</p>
                        <p className="text-xs text-gray-300">Try a different medium or &quot;All Mediums&quot;</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                <>
                {[...filteredData].sort((a: any, b: any) => getSubjectSortKey(a.subjectCode || a.subject).localeCompare(getSubjectSortKey(b.subjectCode || b.subject))).map((row) => {
                  const total = row.total || 0;
                  const appeared = row.appeared || 0;
                  const pass = row.pass || 0;
                  const fail = row.fail || 0;
                  const passPct = appeared > 0 ? ((pass / appeared) * 100).toFixed(1) + '%' : '0.0%';
                  return (
                    <tr key={row.slNo} className="hover:bg-gray-50/50 dark:hover:bg-[#1f242c]/55 transition-colors border-b border-gray-100 dark:border-[#30363d]">
                      <td className="px-2 py-2.5 text-center font-medium text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-[#30363d]">{row.slNo}</td>
                      <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white border-r border-gray-100 dark:border-[#30363d]">
                        <div className="truncate" title={row.subject}>{row.subject}</div>
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-gray-700 dark:text-gray-200 border-r border-gray-100 dark:border-[#30363d]">{total.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-medium text-gray-600 dark:text-gray-300 border-r border-gray-100 dark:border-[#30363d]">{appeared.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400 border-r border-gray-100 dark:border-[#30363d]">{pass.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-red-500 dark:text-red-400 border-r border-gray-100 dark:border-[#30363d]">{fail.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-red-500 dark:text-red-400 bg-red-50/20 dark:bg-red-950/10 border-r border-gray-100 dark:border-[#30363d]">{row.absents.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400 border-r border-gray-100 dark:border-[#30363d]">{row.aPlus.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-emerald-500 dark:text-emerald-300 border-r border-gray-100 dark:border-[#30363d]">{row.a.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-blue-500 dark:text-blue-400 border-r border-gray-100 dark:border-[#30363d]">{row.bPlus.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-blue-400 dark:text-blue-300 border-r border-gray-100 dark:border-[#30363d]">{row.b.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-amber-500 dark:text-amber-400 border-r border-gray-100 dark:border-[#30363d]">{row.cPlus.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-amber-400 dark:text-amber-300 border-r border-gray-100 dark:border-[#30363d]">{row.c.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-orange-500 dark:text-orange-400 border-r border-gray-100 dark:border-[#30363d]">{row.dPlus.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-orange-400 dark:text-orange-300 border-r border-gray-100 dark:border-[#30363d]">{row.d.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-red-500 dark:text-red-400 border-r border-gray-100 dark:border-[#30363d]">{row.e.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">{passPct}</td>
                    </tr>
                  );
                })}
                {filteredData.length > 0 && (() => {
                  const totals = filteredData.reduce((acc: any, row: any) => ({
                    total: acc.total + (row.total || 0),
                    appeared: acc.appeared + (row.appeared || 0),
                    pass: acc.pass + (row.pass || 0),
                    fail: acc.fail + (row.fail || 0),
                    absents: acc.absents + (row.absents || 0),
                    aPlus: acc.aPlus + (row.aPlus || 0),
                    a: acc.a + (row.a || 0),
                    bPlus: acc.bPlus + (row.bPlus || 0),
                    b: acc.b + (row.b || 0),
                    cPlus: acc.cPlus + (row.cPlus || 0),
                    c: acc.c + (row.c || 0),
                    dPlus: acc.dPlus + (row.dPlus || 0),
                    d: acc.d + (row.d || 0),
                    e: acc.e + (row.e || 0),
                  }), { total: 0, appeared: 0, pass: 0, fail: 0, absents: 0, aPlus: 0, a: 0, bPlus: 0, b: 0, cPlus: 0, c: 0, dPlus: 0, d: 0, e: 0 });
                  const overallPassPct = totals.appeared > 0 ? ((totals.pass / totals.appeared) * 100).toFixed(1) + '%' : '0.0%';
                  return (
                    <tr className="bg-indigo-50 dark:bg-indigo-950/20 border-t-2 border-indigo-200 dark:border-indigo-800">
                      <td className="px-2 py-3 text-center font-black text-indigo-700 dark:text-indigo-300 border-r border-indigo-200 dark:border-indigo-800">★</td>
                      <td className="px-3 py-3 font-black text-indigo-900 dark:text-indigo-100 border-r border-indigo-200 dark:border-indigo-800 uppercase">
                        {selectedDivision === 'ALL' ? 'ALL DIVISIONS — TOTALS' : `DIVISION ${selectedDivision} — TOTALS`}
                      </td>
                      <td className="px-2 py-3 text-center font-black text-indigo-700 dark:text-indigo-300 border-r border-indigo-200 dark:border-indigo-800 bg-indigo-100/50 dark:bg-indigo-900/30">{totals.total.toLocaleString()}</td>
                      <td className="px-2 py-3 text-center font-black text-indigo-700 dark:text-indigo-300 border-r border-indigo-200 dark:border-indigo-800 bg-indigo-100/50 dark:bg-indigo-900/30">{totals.appeared.toLocaleString()}</td>
                      <td className="px-2 py-3 text-center font-black text-emerald-700 dark:text-emerald-300 border-r border-indigo-200 dark:border-indigo-800 bg-emerald-100/50 dark:bg-emerald-900/20">{totals.pass.toLocaleString()}</td>
                      <td className="px-2 py-3 text-center font-black text-red-600 dark:text-red-400 border-r border-indigo-200 dark:border-indigo-800 bg-red-100/50 dark:bg-red-900/20">{totals.fail.toLocaleString()}</td>
                      <td className="px-2 py-3 text-center font-black text-red-500 dark:text-red-400 border-r border-indigo-200 dark:border-indigo-800 bg-red-100/30 dark:bg-red-900/10">{totals.absents.toLocaleString()}</td>
                      <td className="px-1 py-3 text-center font-black text-emerald-600 dark:text-emerald-300 border-r border-indigo-200 dark:border-indigo-800">{totals.aPlus.toLocaleString()}</td>
                      <td className="px-1 py-3 text-center font-black text-emerald-500 dark:text-emerald-300 border-r border-indigo-200 dark:border-indigo-800">{totals.a.toLocaleString()}</td>
                      <td className="px-1 py-3 text-center font-black text-blue-600 dark:text-blue-400 border-r border-indigo-200 dark:border-indigo-800">{totals.bPlus.toLocaleString()}</td>
                      <td className="px-1 py-3 text-center font-black text-blue-500 dark:text-blue-300 border-r border-indigo-200 dark:border-indigo-800">{totals.b.toLocaleString()}</td>
                      <td className="px-1 py-3 text-center font-black text-amber-600 dark:text-amber-400 border-r border-indigo-200 dark:border-indigo-800">{totals.cPlus.toLocaleString()}</td>
                      <td className="px-1 py-3 text-center font-black text-amber-500 dark:text-amber-300 border-r border-indigo-200 dark:border-indigo-800">{totals.c.toLocaleString()}</td>
                      <td className="px-1 py-3 text-center font-black text-orange-600 dark:text-orange-400 border-r border-indigo-200 dark:border-indigo-800">{totals.dPlus.toLocaleString()}</td>
                      <td className="px-1 py-3 text-center font-black text-orange-500 dark:text-orange-300 border-r border-indigo-200 dark:border-indigo-800">{totals.d.toLocaleString()}</td>
                      <td className="px-2 py-3 text-center font-black text-red-600 dark:text-red-400 border-r border-indigo-200 dark:border-indigo-800">{totals.e.toLocaleString()}</td>
                      <td className="px-2 py-3 text-center font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-900/30">{overallPassPct}</td>
                    </tr>
                  );
                })()}
                </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{label}</label>
    <div className="relative group">
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold tracking-wider hover:border-blue-400 transition-colors focus:ring-2 focus:ring-blue-100 cursor-pointer appearance-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="px-3 py-1.5 text-xs font-bold">{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <Filter size={12} />
      </div>
    </div>
  </div>
);

export default SubjectAnalysisPage;
