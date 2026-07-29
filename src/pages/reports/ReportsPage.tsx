import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart2, 
  Printer, 
  TrendingUp, 
  Users,
  Award,
  AlertCircle,
  HelpCircle,
  Hash,
  FileDown,
  FileText,
  Filter,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { onRefresh } from '../../lib/eventBus';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import PageLoader from '../../components/common/PageLoader';
import ExamSelect from '../../components/common/ExamSelect';
import { getStudentResult } from '../../lib/resultClassification';
import { sortSubjects as sortSubjectsUtil, getSubjectPCode } from '../../lib/subjectUtils';


interface StudentResult {
  studentId: string;
  regNo: string;
  name: string;
  gender: string;
  isScribe: boolean;
  classStandard?: string;
  division?: string;
  grades: Record<string, string>;
  marks?: Record<string, any>;
}

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Tab controller state
  const [activeTab, setActiveTab] = useState<'detailed' | 'subject-analysis' | 'custom-report'>('detailed');

  // Custom Report States
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
  const [matchCountFilter, setMatchCountFilter] = useState<'ALL' | 'MATCH_ONLY'>('ALL');
  const [customReportData, setCustomReportData] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Record<string, boolean>>({});
  
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchId, setSelectedSchId] = useState('');
  
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('10');
  const [selectedDivision, setSelectedDivision] = useState('ALL');

  const [configuredSubjectIds, setConfiguredSubjectIds] = useState<string[]>([]);
  const [configuredExamIds, setConfiguredExamIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const SUBJECTS = React.useMemo(() => {
    const pCodeSet = new Set<string>();

    if (subjects.length > 0) {
      subjects.forEach((s: any) => {
        const p = getSubjectPCode(s);
        if (p) pCodeSet.add(p);
      });
    }

    if (reportData?.results) {
      reportData.results.forEach((r: any) => {
        const keys = [...Object.keys(r.marks || {}), ...Object.keys(r.grades || {})];
        keys.forEach(k => {
          const sub = subjects.find((s: any) => s._id?.toString() === k || s.id === k || s.code === k || s.shortName === k || s.name === k);
          const p = sub ? getSubjectPCode(sub) : (k.startsWith('P') ? k : getSubjectPCode({ name: k, shortName: k }));
          if (p) pCodeSet.add(p);
        });
      });
    }

    if (reportData?.exam?.maxMarks) {
      const maxMarkKeys = typeof reportData.exam.maxMarks.keys === 'function'
        ? Array.from(reportData.exam.maxMarks.keys())
        : Object.keys(reportData.exam.maxMarks);
      maxMarkKeys.forEach((k: any) => {
        const sub = subjects.find((s: any) => s._id?.toString() === k || s.id === k || s.code === k || s.shortName === k || s.name === k);
        const p = sub ? getSubjectPCode(sub) : (k.startsWith('P') ? k : getSubjectPCode({ name: k, shortName: k }));
        if (p) pCodeSet.add(p);
      });
    }

    if (pCodeSet.size === 0) {
      ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'].forEach(c => pCodeSet.add(c));
    }

    const sortedCodes = Array.from(pCodeSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    return sortedCodes.map(code => ({
      code,
      label: code,
      subjectId: code
    }));
  }, [configuredSubjectIds, subjects, reportData]);


  const activeSchoolId = user?.role === 'SCHOOL' ? (user.schoolId || '') : selectedSchId;

  // Subject Analysis States
  const [subjectAnalysisData, setSubjectAnalysisData] = useState<any | null>(null);
  const [isSubjectLoading, setIsSubjectLoading] = useState(false);
  const [eduDistricts, setEduDistricts] = useState<any[]>([]);
  const [subjectFilters, setSubjectFilters] = useState({
    districtId: user?.districtId || 'dist-9',
    eduId: 'ALL',
    schoolType: 'ALL',
    gender: 'ALL',
    division: 'ALL'
  });



  // Initialize page configuration
  useEffect(() => {
    const initPage = async () => {
      try {
        const promises: any[] = [
          apiClient.get('/management/exams'),
          apiClient.get('/management/schools'),
          apiClient.get('/management/subjects')
        ];
        if (user?.role === 'SCHOOL') {
          promises.push(apiClient.get('/school/configured-exams'));
        }
        const [examsRes, schoolsRes, subjectsRes, confExamsRes] = await Promise.all(promises);
        
        setExams(examsRes.data);
        setSubjects(subjectsRes.data);
        if (examsRes.data.length > 0) {
          setSelectedExamId(examsRes.data[0].id);
        }
        
        setSchools(schoolsRes.data);
        if (schoolsRes.data.length > 0 && user?.role !== 'SCHOOL') {
          setSelectedSchId(schoolsRes.data[0].id);
        }

        if (user?.role === 'SCHOOL' && confExamsRes) {
          setConfiguredExamIds(confExamsRes.data || []);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to initialize report filters');
      }
    };
    initPage();
  }, [user, refreshKey]);

  useEffect(() => {
    if (!selectedExamId || !activeSchoolId) return;
    const fetchConfiguredSubjects = async () => {
      try {
        const res = await apiClient.get(`/school/exam-config/${selectedExamId}?schoolId=${activeSchoolId}`);
        const config = res.data;
        if (config && config.subjects) {
          setConfiguredSubjectIds(config.subjects.map((s: any) => s.subjectId));
        } else {
          setConfiguredSubjectIds([]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchConfiguredSubjects();
  }, [selectedExamId, activeSchoolId]);

  // Load report data (Detailed Tab)
  useEffect(() => {
    if (!selectedExamId || !activeSchoolId) return;

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/reports/detailed-school/${activeSchoolId}/${selectedExamId}`);
        setReportData(res.data);
        const examClass = res.data.exam?.standard || '10';
        setSelectedClass(examClass);
        setSelectedDivision('ALL');
      } catch (err) {
        console.error(err);
        toast.error('Failed to load detailed report');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [selectedExamId, activeSchoolId]);

  // Fetch subject-wise educational districts (Subject Analysis Tab)
  const fetchEduDistrictsForFilters = async () => {
    if (user?.role === 'SCHOOL') return;
    try {
      const districtId = user?.districtId || subjectFilters.districtId;
      const res = await apiClient.get(`/management/educational-districts?districtId=${districtId}`);
      setEduDistricts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Subject Analysis data (Subject Analysis Tab)
  const fetchSubjectAnalysis = async (examIdToUse = selectedExamId) => {
    if (!examIdToUse) return;
    setIsSubjectLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.role === 'SCHOOL') {
        const schoolId = user.schoolId || user.id;
        params.append('schoolId', schoolId);
      } else {
        if (activeSchoolId) {
          // If simulate school is active and admin is viewing detailed report structure,
          // let them view this specific school's subject analysis
          params.append('schoolId', activeSchoolId);
        } else {
          params.append('districtId', subjectFilters.districtId);
          if (subjectFilters.eduId !== 'ALL') params.append('eduId', subjectFilters.eduId);
          if (subjectFilters.schoolType !== 'ALL') params.append('schoolType', subjectFilters.schoolType);
          if (subjectFilters.gender !== 'ALL') params.append('gender', subjectFilters.gender);
        }
      }
      params.append('examId', examIdToUse);
      if (subjectFilters.division !== 'ALL') {
        params.append('division', subjectFilters.division);
      }

      const res = await apiClient.get(`/results/subject-analysis?${params.toString()}`);
      setSubjectAnalysisData(res.data);
    } catch (err) {
      toast.error('Failed to fetch subject analysis data');
    } finally {
      setIsSubjectLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'subject-analysis' && selectedExamId) {
      fetchSubjectAnalysis();
    }
  }, [activeTab, selectedExamId, subjectFilters, activeSchoolId, refreshKey]);

  useEffect(() => {
    if (activeTab === 'subject-analysis') {
      fetchEduDistrictsForFilters();
    }
  }, [activeTab, subjectFilters.districtId]);

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

  // Listen for data refresh events (mediums/subjects updated from management pages)
  useEffect(() => {
    const unsub1 = onRefresh('mediums-updated', () => setRefreshKey(k => k + 1));
    const unsub2 = onRefresh('subjects-updated', () => setRefreshKey(k => k + 1));
    const unsub3 = onRefresh('data-updated', () => setRefreshKey(k => k + 1));
    const unsub4 = onRefresh('students-updated', () => setRefreshKey(k => k + 1));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
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
  const INPUT = "w-full text-xs font-bold border border-gray-200 dark:border-[#30363d] rounded px-3 py-2.5 bg-white dark:bg-[#1f242c] text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer";
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    navigate('/dashboard/pdf-report');
  };

  const handleExportCSV = () => {
    if (!reportData || filteredResults.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const headers = ['Sl No', 'Reg No', 'Class', 'Division', 'Student Name', 'Gender/Scribe', ...SUBJECTS.map(s => s.label), 'Percentage'];
    
    const rows = filteredResults.map((r: StudentResult, idx: number) => {
      const pct = getStudentPercentage(r, exam).toFixed(1);
      const genderScribe = r.isScribe ? 'Scribe' : (r.gender || '');
      
      const row = [
        idx + 1,
        r.regNo || '',
        r.classStandard || '10',
        r.division || '-',
        r.name.replace(/,/g, ''),
        genderScribe,
        ...SUBJECTS.map(sub => getCalculatedGrade(r, sub, exam) || ''),
        pct
      ];
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const schCode = school?.code || 'school';
    const termName = exam?.name?.replace(/\s+/g, '_') || 'exam';
    const classStd = selectedClass || '10';
    const divName = selectedDivision === 'ALL' ? 'ALL' : selectedDivision;
    const filename = `Marks_Export_Sch_${schCode}_Class_${classStd}_Div_${divName}_${termName}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully!');
  };



  // Helper to determine EHS pass/fail
  // Helper to safely resolve max marks using either subCode or subjectId mapping
  const resolveMaxMark = (subCode: string, examObj: any = reportData?.exam) => {
    const subjectDoc = subjects.find(s => s.shortName === subCode || s.name === subCode);
    const subjectId = subjectDoc ? (subjectDoc._id || subjectDoc.id) : null;
    
    const shortCodeMap: Record<string, string> = { 'P01': 'Lan I', 'P02': 'Lan II', 'P03': 'Eng', 'P04': 'Hin', 'P05': 'SS', 'P06': 'Phy', 'P07': 'Che', 'P08': 'Bio', 'P09': 'Mat' };
    const mappedCode = shortCodeMap[subCode] || subCode;
    
    return (examObj?.maxMarks && subjectId && examObj.maxMarks[subjectId])
      || examObj?.maxMarks?.[mappedCode]
      || examObj?.maxMarks?.[subCode]
      || 50;
  };

  const getSubjectMarkRecord = (result: StudentResult, sub: any) => {
    if (!result) return { mark: null, grade: '' };
    const targetPCode = typeof sub === 'string' ? sub : (sub?.code || getSubjectPCode(sub));

    const matchingSubjects = subjects.filter((s: any) => getSubjectPCode(s) === targetPCode);

    const possibleKeys = new Set<string>();
    possibleKeys.add(targetPCode);
    if (typeof sub === 'object' && sub) {
      if (sub.subjectId) possibleKeys.add(String(sub.subjectId));
      if (sub._id) possibleKeys.add(String(sub._id));
      if (sub.code) possibleKeys.add(String(sub.code));
      if (sub.shortName) possibleKeys.add(String(sub.shortName));
      if (sub.paperType) possibleKeys.add(String(sub.paperType));
      if (sub.name) possibleKeys.add(String(sub.name));
    }

    matchingSubjects.forEach((s: any) => {
      if (s._id) possibleKeys.add(String(s._id));
      if (s.id) possibleKeys.add(String(s.id));
      if (s.code) possibleKeys.add(String(s.code));
      if (s.shortName) possibleKeys.add(String(s.shortName));
      if (s.paperType) possibleKeys.add(String(s.paperType));
      if (s.name) possibleKeys.add(String(s.name));
    });

    const keysArray = Array.from(possibleKeys);

    const foundMarks: number[] = [];
    const foundGrades: string[] = [];

    keysArray.forEach(k => {
      if (result.marks && result.marks[k] !== undefined && result.marks[k] !== null && String(result.marks[k]).trim() !== '') {
        const num = Number(result.marks[k]);
        if (!isNaN(num)) foundMarks.push(num);
      }
      if (result.grades && result.grades[k] !== undefined && result.grades[k] !== null && String(result.grades[k]).trim() !== '') {
        const valStr = String(result.grades[k]).trim();
        if (isNaN(Number(valStr))) {
          foundGrades.push(valStr);
        } else if (foundMarks.length === 0) {
          foundMarks.push(Number(valStr));
        }
      }
    });

    if (foundGrades.length > 1 || foundMarks.length > 1) {
      console.warn(`[Data Integrity Warning] Student ${result.name} (${result.studentId}) has multiple filled entries for Subject Code ${targetPCode}:`, { foundGrades, foundMarks });
    }

    const mark = foundMarks.length > 0 ? foundMarks[0] : null;
    const grade = foundGrades.length > 0 ? foundGrades[0] : '';

    return { mark, grade };
  };

  const getCalculatedGrade = (result: StudentResult, sub: any, examObj: any = reportData?.exam) => {
    if (!result) return '';
    const { mark, grade } = getSubjectMarkRecord(result, sub);
    if (grade && isNaN(Number(grade))) {
      return grade;
    }

    if (mark === null && !grade) return '';
    
    const subObj = typeof sub === 'string' ? { code: sub, shortName: sub, name: sub } : sub;
    const subCode = subObj?.code || subObj?.shortName || subObj?.name || '';
    const maxMark = resolveMaxMark(subCode, examObj);
    const valToConvert = mark !== null ? Number(mark) : Number(grade);
    if (isNaN(valToConvert)) return grade;

    const pct = Math.round((valToConvert * 100) / maxMark);
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C+';
    if (pct >= 40) return 'C';
    if (pct >= 30) return 'D+';
    if (pct >= 20) return 'D';
    return 'E';
  };

  const getStudentPassStatus = (result: StudentResult) => {
    if (SUBJECTS.length === 0) {
      return { status: 'Incomplete', style: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    
    const grades = SUBJECTS.map(sub => {
      const g = getCalculatedGrade(result, sub);
      return typeof g === 'string' ? g : '';
    }).filter(g => g !== '');

    const status = getStudentResult(grades);

    if (status === 'INCOMPLETE') {
      return { status: 'Incomplete', style: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    
    if (status === 'ABSENT') {
      return { status: 'Absent', style: 'bg-gray-100 text-gray-800 border-gray-200 font-bold' };
    }
    
    if (status === 'FAIL') {
      return { status: 'Fail', style: 'bg-rose-100 text-rose-800 border-rose-200 font-bold' };
    }
    
    return { status: 'Pass', style: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-black' };
  };

  const getStudentPercentage = (result: StudentResult, examInfo: any) => {
    const gradeValues: Record<string, number> = {
      'A+': 95, 'A': 85, 'B+': 75, 'B': 65, 'C+': 55, 'C': 45, 'D+': 35, 'D': 25, 'E': 15, 'Ab': 0
    };
    
    let totalScoredMarks = 0;
    let totalMaxMarksForGraded = 0;
    let totalPointsFallback = 0;
    let gradedSubjects = 0;
    let hasActualMarks = false;
    
    SUBJECTS.forEach((sub: any) => {
      const { mark } = getSubjectMarkRecord(result, sub);
      const grade = getCalculatedGrade(result, sub, examInfo);
      const subCode = typeof sub === 'string' ? sub : (sub.code || sub.shortName || sub.name);
      const maxMark = resolveMaxMark(subCode, examInfo);
      
      if (mark !== null && !isNaN(Number(mark))) {
        totalScoredMarks += Number(mark);
        totalMaxMarksForGraded += maxMark;
        gradedSubjects++;
        hasActualMarks = true;
      } else if (grade) {
        totalPointsFallback += gradeValues[grade.trim().toUpperCase()] !== undefined ? gradeValues[grade.trim().toUpperCase()] : 0;
        gradedSubjects++;
      }
    });
    
    if (gradedSubjects === 0) return 0;
    if (hasActualMarks && totalMaxMarksForGraded > 0) {
      return (totalScoredMarks / totalMaxMarksForGraded) * 100;
    }
    return totalPointsFallback / gradedSubjects;
  };

  const getGradeBadge = (val: string) => {
    if (!val) return 'text-slate-300 font-medium';
    if (val === 'A+') return 'text-emerald-700 font-black bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md';
    if (val === 'A' || val === 'B+') return 'text-teal-700 font-bold bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-md';
    if (val === 'D' || val === 'E') return 'text-rose-700 font-bold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md';
    const upperVal = val.toUpperCase().trim();
    if (upperVal === 'AB' || upperVal === 'ABSENT' || upperVal === 'ABS') return 'text-gray-400 font-medium bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md';
    return 'text-blue-700 font-semibold bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md';
  };

  if (isLoading || !reportData) {
    return (
      <PageLoader label="Loading Report" />
    );
  }

  const { school, exam, results = [] } = reportData;

  // Extract unique divisions and classes dynamically
  const divisions = Array.from(new Set(
    results
      .map((r: StudentResult) => r.division)
      .filter(Boolean)
      .map((d: string) => d.trim().toUpperCase())
  )).sort() as string[];

  // Filter students based on division/class
  const filteredResults = results.filter((r: StudentResult) => {
    const matchesDivision = selectedDivision === 'ALL' || (r.division && r.division.trim().toUpperCase() === selectedDivision);
    const matchesClass = selectedClass === 'ALL' || (r.classStandard || '10') === selectedClass;
    return matchesDivision && matchesClass;
  });

  // Aggregate stats dynamically
  const totalStudents = filteredResults.length;
  const passCount = filteredResults.filter((r: StudentResult) => getStudentPassStatus(r).status === 'Pass').length;
  const failCount = filteredResults.filter((r: StudentResult) => getStudentPassStatus(r).status === 'Fail').length;
  const fullFailCount = 0; // Deprecated, all fails are counted under FAIL.
  const absentCount = filteredResults.filter((r: StudentResult) => {
    return SUBJECTS.some(sub => {
      const g = getCalculatedGrade(r, sub);
      return g && ['AB', 'ABSENT', 'ABS', 'AA'].includes(g.trim().toUpperCase());
    });
  }).length;
  const scribeCount = filteredResults.filter((r: StudentResult) => r.isScribe).length;
  const fullAPlusCount = filteredResults.filter((r: StudentResult) => {
    const validGrades = SUBJECTS.map(sub => getCalculatedGrade(r, sub));
    return validGrades.length > 0 && validGrades.every(g => g === 'A+');
  }).length;

  const gradeCounts: Record<string, number> = {
    'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D+': 0, 'D': 0, 'E': 0, 'Ab': 0
  };
  const boysGradeCounts: Record<string, number> = {
    'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D+': 0, 'D': 0, 'E': 0, 'Ab': 0
  };
  const girlsGradeCounts: Record<string, number> = {
    'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D+': 0, 'D': 0, 'E': 0, 'Ab': 0
  };

  filteredResults.forEach((r: StudentResult) => {
    const genderUpper = (r.gender || '').trim().toUpperCase();
    let isBoy = genderUpper.startsWith('B') || genderUpper.startsWith('M');
    let isGirl = genderUpper.startsWith('G') || genderUpper.startsWith('F');

    if (!isBoy && !isGirl) {
      isBoy = true;
    }

    let hasCountedAb = false;

    SUBJECTS.forEach(sub => {
      let gradeStr = getCalculatedGrade(r, sub);
      if (!gradeStr) return;
      
      const matchedKey = Object.keys(gradeCounts).find(k => k.toLowerCase() === gradeStr.toLowerCase());
      
      if (matchedKey !== undefined) {
        if (matchedKey === 'Ab') {
          if (!hasCountedAb) {
            gradeCounts['Ab']++;
            if (isBoy) boysGradeCounts['Ab']++;
            if (isGirl) girlsGradeCounts['Ab']++;
            hasCountedAb = true;
          }
        } else {
          gradeCounts[matchedKey]++;
          if (isBoy) boysGradeCounts[matchedKey]++;
          if (isGirl) girlsGradeCounts[matchedKey]++;
        }
      }
    });
  });

  const handleExportSummary = () => {
    if (!customReportData || customReportData.summary.totalStudentsMatching === 0) return;
    const headers = ["SL No", "School Code", "School Name", "Type", "Total Appeared", "Matching Count", "Match Rate (%)"];
    const filteredSchools = customReportData.schools.filter((s: any) => {
      if (matchCountFilter === 'MATCH_ONLY') {
        return s.matchCount > 0;
      }
      return true;
    });
    const rows = filteredSchools.map((s: any, idx: number) => [
      idx + 1,
      s.code,
      s.name,
      s.type,
      s.totalAppeared,
      s.matchCount,
      s.matchRate
    ]);
    exportToCSV(headers, rows, `Custom_Report_School_Summary_${Date.now()}.csv`);
  };

  const handleExportAllStudents = () => {
    if (!customReportData || customReportData.summary.totalStudentsMatching === 0) return;
    const headers = ["SL No", "School Code", "School Name", "Roll No", "Student Name", "Gender", "Subject Grades"];
    const rows: any[][] = [];
    let idx = 1;
    const filteredSchools = customReportData.schools.filter((s: any) => {
      if (matchCountFilter === 'MATCH_ONLY') {
        return s.matchCount > 0;
      }
      return true;
    });
    filteredSchools.forEach((s: any) => {
      s.students.forEach((student: any) => {
        const gradesString = Object.entries(student.grades).sort(([a], [b]) => sortSubjectsUtil({ shortName: a, code: a, name: a }, { shortName: b, code: b, name: b })).map(([sub, g]) => `${sub}:${g}`).join(" | ");
        rows.push([
          idx++,
          s.code,
          s.name,
          student.regNo,
          student.name,
          student.gender,
          gradesString
        ]);
      });
    });
    exportToCSV(headers, rows, `Custom_Report_All_Students_${Date.now()}.csv`);
  };

  const handleExportSchoolStudents = (school: any) => {
    const headers = ["SL No", "Roll No", "Student Name", "Gender", "Subject Grades"];
    const rows = school.students.map((student: any, idx: number) => {
      const gradesString = Object.entries(student.grades).map(([sub, g]) => `${sub}:${g}`).join(" | ");
      return [
        idx + 1,
        student.regNo,
        student.name,
        student.gender,
        gradesString
      ];
    });
    exportToCSV(headers, rows, `Custom_Report_Students_${school.name.replace(/\s+/g, '_')}_${Date.now()}.csv`);
  };



  const toggleSchoolExpanded = (schoolId: string) => {
    setExpandedSchools(prev => ({ ...prev, [schoolId]: !prev[schoolId] }));
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
    const SELECT = `${INPUT} cursor-pointer`;

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
                <option value="ALL" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">ALL Subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s._id.toString()} className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">{s.name}</option>
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
                  <option value="ANY" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">In At Least One Subject</option>
                  <option value="ALL" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">In All Subjects</option>
                  <option value="TOTAL" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">Overall / Total Percentage</option>
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
                <option value="grade" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">Grade</option>
                <option value="mark" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">Marks</option>
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
                    <option key={g} value={g} className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">{g}</option>
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
                  <option value="eq" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">Equal to (=)</option>
                  <option value="gte" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">Greater or Equal (&gt;=)</option>
                  <option value="lte" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">Less or Equal (&lt;=)</option>
                  {customReportFilters.filterType === 'mark' && <option value="between" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">Between</option>}
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
                <option value="ALL" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">All</option>
                <option value="MATCH_ONLY" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">Match Count Only</option>
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
                                                {Object.entries(student.grades).sort(([a], [b]) => sortSubjectsUtil({ shortName: a, code: a, name: a }, { shortName: b, code: b, name: b })).map(([subCode, grade]: any) => (
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
    <div className="space-y-8 animate-in fade-in duration-500 p-5 print:shadow-none print:bg-white print:p-0 text-gray-900 dark:text-gray-100">
      
      {/* Dynamic browser print controller CSS */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 10px !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          table {
            width: 100% !important;
            min-width: unset !important;
            border-collapse: collapse !important;
          }
          th, td {
            padding: 6px 4px !important;
            border: 1px solid #e2e8f0 !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          @page {
            size: landscape;
            margin: 0.8cm;
          }

          /* Hide standard UI elements outside the report */
          header, nav, aside, footer, .print\\:hidden {
            display: none !important;
          }

          /* Ensure body is block and reset background */
          body, html, #root {
            display: block !important;
            background: white !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Main structural resets */
          main, .container, .max-w-7xl, .flex-1, .w-full, .min-h-screen, .h-screen {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          
          /* Hide the container of the sidebar and header */
          .flex.h-screen {
             display: block !important;
             height: auto !important;
          }

          /* Specifically target the dashboard layout content area */
          .flex-1.flex.flex-col {
             display: block !important;
             overflow: visible !important;
          }
          
          #report-print-container, #subject-print-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Table Pagination Logics */
          thead { 
            display: table-header-group !important; 
          }
          tfoot { 
            display: table-footer-group !important; 
          }
          
          /* Force background colors to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        /* WYSIWYG overrides for PDF generation */
        .theme-light-export {
          background-color: #ffffff !important;
          color: #0f172a !important;
          padding: 1.5rem !important;
        }
        .theme-light-export h2, 
        .theme-light-export p, 
        .theme-light-export span, 
        .theme-light-export th, 
        .theme-light-export td {
          color: #0f172a !important;
        }
      `}</style>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-200 dark:border-[#30363d] print:hidden gap-6 mb-6">
        <button
          onClick={() => setActiveTab('detailed')}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer",
            activeTab === 'detailed'
              ? "border-black text-black dark:border-white dark:text-white"
              : "border-transparent text-gray-500 hover:text-black dark:hover:text-white"
          )}
        >
          <BarChart2 size={16} />
          Detailed Results
        </button>
        <button
          onClick={() => setActiveTab('subject-analysis')}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer",
            activeTab === 'subject-analysis'
              ? "border-black text-black dark:border-white dark:text-white"
              : "border-transparent text-gray-500 hover:text-black dark:hover:text-white"
          )}
        >
          <ClipboardList size={16} />
          Subject Analysis
        </button>
        <button
          onClick={() => setActiveTab('custom-report')}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer",
            activeTab === 'custom-report'
              ? "border-black text-black dark:border-white dark:text-white"
              : "border-transparent text-gray-500 hover:text-black dark:hover:text-white"
          )}
        >
          <ClipboardList size={16} />
          Customize Report
        </button>
      </div>

      {activeTab === 'detailed' ? (
        <>
          {/* Detailed results filters & actions */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-[#30363d] print:hidden">
            <div>
              <h1 className="text-3xl font-black text-black dark:text-white tracking-tight uppercase flex items-center gap-3">
                <BarChart2 size={32} className="text-gray-300 dark:text-gray-650" />
                Detailed School Results Report
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                Review detailed reports of enrolled students grades, subject codes, and Pass/Fail ratios.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {user?.role !== 'SCHOOL' && (
                <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Simulate School:</span>
                  <select
                    value={selectedSchId}
                    onChange={e => setSelectedSchId(e.target.value)}
                    className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.id} className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {exams.length > 0 && (
                <ExamSelect
                  exams={exams}
                  selectedExamId={selectedExamId}
                  onSelect={(id) => setSelectedExamId(id)}
                  configuredIds={configuredExamIds}
                  className="min-w-[160px]"
                />
              )}

              <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
                <select
                  value={selectedDivision}
                  onChange={e => setSelectedDivision(e.target.value)}
                  className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
                >
                  <option value="ALL" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">ALL DIVS</option>
                  {divisions.map(div => (
                    <option key={div} value={div} className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">{div}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Printer size={16} />
                Print
              </button>

              {user?.role !== 'SCHOOL' && (
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-[#1f6feb] text-white hover:bg-blue-700 dark:hover:bg-[#388bfd] rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <FileDown size={16} />
                  PDF
                </button>
              )}

              {user?.role !== 'SCHOOL' && (
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 dark:bg-emerald-50 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <FileDown size={16} />
                  CSV Export
                </button>
              )}
            </div>
          </div>

          {/* Printable Report content for Detailed Tab */}
          <div id="report-print-container" className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] p-8 rounded-3xl shadow-sm space-y-6 print:border-none print:p-0">
            <div className="border-b border-gray-100 dark:border-[#30363d] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:flex-row print:items-center print:justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-black dark:text-white tracking-tight uppercase leading-tight font-sans print:text-xl">
                  {school.name}
                </h2>
                <p className="text-xs text-slate-400 dark:text-gray-550 font-bold uppercase tracking-wider print:text-[10px]">
                  School Code: {school.code}
                </p>
              </div>
              <div className="text-left md:text-right space-y-1 md:shrink-0 bg-slate-50 dark:bg-[#1a1f26] p-4 rounded-2xl border border-slate-100 dark:border-[#30363d] print:p-2 print:rounded-none print:text-right print:bg-transparent print:border-none">
                <p className="text-[10px] uppercase font-black text-gray-400 dark:text-gray-550 print:text-[8px]">EXAMINATION DATABASE</p>
                <p className="text-xs font-black text-black dark:text-white uppercase print:text-[10px]">{exam?.name || 'Class Term Study'}</p>
                <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full w-fit md:ml-auto print:ml-auto print:text-[8px] print:bg-transparent print:px-0">
                  CLASS STANDARD {exam?.standard || '10'}
                </p>
              </div>
            </div>

            {/* Metrics cards row */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              <div className="bg-slate-50 dark:bg-[#1a1f26] border border-slate-100 dark:border-[#30363d] p-3.5 rounded-2xl text-center print:border print:p-2" style={{ borderWidth: '0.8px' }}>
                <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">CANDIDATES APPEARED</p>
                <p className="text-lg font-black text-black dark:text-white mt-1 leading-none">{totalStudents}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-100 dark:border-emerald-900/30 p-3.5 rounded-2xl text-center print:border print:p-2">
                <p className="text-[8px] font-black text-emerald-800 dark:text-[#08d792] uppercase tracking-widest">PASS</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1 leading-none">{passCount}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-955/20 border border-rose-100 dark:border-rose-900/30 p-3.5 rounded-2xl text-center print:border print:p-2">
                <p className="text-[8px] font-black text-rose-800 dark:text-rose-450 uppercase tracking-widest">FAIL</p>
                <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1 leading-none">{failCount}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 p-3.5 rounded-2xl text-center print:border print:p-2">
                <p className="text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">ABSENT</p>
                <p className="text-lg font-black text-gray-700 dark:text-gray-300 mt-1 leading-none">{absentCount}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 p-3.5 rounded-2xl text-center print:border print:p-2">
                <p className="text-[8px] font-black text-amber-800 dark:text-[#eea26e] uppercase tracking-widest">FULL A+ SCORES</p>
                <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1 leading-none">{fullAPlusCount}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-955/20 border border-purple-100 dark:border-purple-900/30 p-3.5 rounded-2xl text-center print:border print:p-2">
                <p className="text-[8px] font-black text-purple-800 dark:text-[#8815bd] uppercase tracking-widest">SCRIBE STUDENTS</p>
                <p className="text-lg font-black text-purple-600 dark:text-purple-450 mt-1 leading-none">{scribeCount}</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-955/20 border border-indigo-100 dark:border-indigo-900/30 p-3.5 rounded-2xl text-center print:border print:p-2">
                <p className="text-[8px] font-black text-indigo-800 dark:text-[#f6f6f6] uppercase tracking-widest font-extrabold">TOTAL DIVISIONS</p>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1 leading-none">{divisions.length}</p>
              </div>
            </div>

            {/* Cumulative grade breakdown table */}
            <div className="p-5 bg-slate-50/50 dark:bg-[#1a1f26]/40 border border-gray-100 dark:border-[#30363d] rounded-2xl space-y-4 mt-4 print:border-slate-200">
              <div>
                <p className="text-[10px] uppercase font-black text-gray-400 dark:text-gray-550 tracking-wider">
                  Cumulative Total Grade Counts ({selectedDivision === 'ALL' ? 'All Divisions' : `Division ${selectedDivision}`})
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#30363d] text-[10px] text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Segment</th>
                      {Object.keys(gradeCounts).map(grade => (
                        <th key={grade} className="py-2.5 px-2 text-center w-[75px]">{grade}</th>
                      ))}
                      <th className="py-2.5 px-3 text-center w-[100px]">Total Grades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-[#30363d]">
                    <tr className="hover:bg-slate-50/55 dark:hover:bg-[#1f242c]/55 transition-colors">
                      <td className="py-3 px-3 font-black text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block"></span>
                        Boys Row Counts
                      </td>
                      {Object.entries(boysGradeCounts).map(([grade, count]) => (
                        <td key={`boy-${grade}`} className="py-3 px-2 text-center font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{count}</td>
                      ))}
                      <td className="py-3 px-3 text-center font-mono text-xs font-black text-blue-600 dark:text-blue-450 bg-blue-50/30 dark:bg-blue-900/10">
                        {Object.values(boysGradeCounts).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/55 dark:hover:bg-[#1f242c]/55 transition-colors">
                      <td className="py-3 px-3 font-black text-xs text-pink-500 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-500 block"></span>
                        Girls Row Counts
                      </td>
                      {Object.entries(girlsGradeCounts).map(([grade, count]) => (
                        <td key={`girl-${grade}`} className="py-3 px-2 text-center font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{count}</td>
                      ))}
                      <td className="py-3 px-3 text-center font-mono text-xs font-black text-pink-600 dark:text-pink-450 bg-pink-50/30 dark:bg-pink-900/10">
                        {Object.values(girlsGradeCounts).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                    <tr className="bg-slate-100/50 dark:bg-[#1c2128]/70 font-black hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors">
                      <td className="py-3 px-3 font-black text-xs text-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500 dark:bg-gray-400 block"></span>
                        Overall Cumulative
                      </td>
                      {Object.entries(gradeCounts).map(([grade, count]) => (
                        <td key={`total-${grade}`} className="py-3 px-2 text-center font-mono text-xs font-black text-black dark:text-white">{count}</td>
                      ))}
                      <td className="py-3 px-3 text-center font-mono text-xs font-black text-black dark:text-white bg-slate-100 dark:bg-gray-800">
                        {Object.values(gradeCounts).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Student list results table */}
            <div className="border border-gray-100 dark:border-[#30363d] rounded-2xl overflow-hidden overflow-x-auto mt-6 print:border-none">
              <table className="w-full text-left border-collapse min-w-full text-xs">
                <thead>
                  <tr className="bg-slate-55 dark:bg-[#1a1f26] border-b border-gray-100 dark:border-[#30363d] font-extrabold text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-450 print:bg-slate-100 print:text-gray-700">
                    <th className="px-5 py-3 border-r border-gray-100 dark:border-[#30363d] w-[55px] text-center">Sl No</th>
                    <th className="px-5 py-3 border-r border-gray-100 dark:border-[#30363d] w-[70px] text-center">Class</th>
                    <th className="px-5 py-3 border-r border-gray-100 dark:border-[#30363d] w-[170px]">Student Name</th>
                    {SUBJECTS.map(sub => (
                      <th key={sub.code} className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center text-[10px] w-[75px]" title={sub.code}>
                        {sub.label}
                      </th>
                    ))}
                    <th className="px-5 py-3 text-center w-[120px] bg-slate-100/30 dark:bg-slate-900/30">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#30363d] font-medium">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-6 py-12 text-center text-slate-400 dark:text-gray-550">
                        No academic records found. Ensure students have class and division tags registered.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r: StudentResult, idx: number) => {
                      const pct = getStudentPercentage(r, exam);
                      return (
                        <tr key={r.studentId} className="hover:bg-slate-50 dark:hover:bg-[#1f242c]/50 transition-colors">
                          <td className="px-5 py-3.5 border-r border-gray-100 dark:border-[#30363d] text-gray-400 font-mono text-[11px] text-center">{idx + 1}</td>
                          <td className="px-5 py-3.5 border-r border-gray-100 dark:border-[#30363d] font-mono text-[11px] font-bold text-gray-700 dark:text-gray-300 text-center">
                            {r.classStandard || '10'}{r.division || '-'}
                          </td>
                          <td className="px-5 py-3.5 border-r border-gray-100 dark:border-[#30363d]">
                            <div>
                              <p className="font-extrabold text-[#111827] dark:text-white uppercase tracking-tight">{r.name}</p>
                              <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold mt-0.5 tracking-wider uppercase">
                                {r.isScribe ? "Scribe Assisted" : r.gender}
                              </p>
                            </div>
                          </td>
                          {SUBJECTS.map((sub: any) => {
                            const score = getCalculatedGrade(r, sub, exam);
                            return (
                              <td key={sub.code || sub.subjectId || sub.name} className="px-1 py-3.5 border-r border-gray-100 dark:border-[#30363d] text-center font-bold">
                                <span className={getGradeBadge(score)}>{score || '-'}</span>
                              </td>
                            );
                          })}
                          <td className="px-5 py-3.5 text-center font-mono font-black text-gray-900 dark:text-white bg-slate-50 dark:bg-slate-900 text-xs">
                            {pct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'subject-analysis' ? (
        <>
          {/* Subject Analysis Tab Filters & Actions */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-[#30363d] print:hidden">
            <div>
              <h1 className="text-3xl font-black text-black dark:text-white tracking-tight uppercase flex items-center gap-3">
                <ClipboardList size={32} className="text-gray-300 dark:text-gray-650" />
                {user?.role === 'SCHOOL' ? 'Subject Analysis (My School)' : 'Subject Grade Wall ( District Wise )'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                {user?.role === 'SCHOOL' ? 'Subject-wise performance metrics for your candidates.' : 'Detailed subject-wise grading distribution and analysis.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {user?.role !== 'SCHOOL' && !activeSchoolId && (
                <>
                  {(!user?.subDistrictId || user?.role === 'DEO') && (
                    <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Edu District:</span>
                      <select
                        value={subjectFilters.eduId}
                        onChange={e => setSubjectFilters(prev => ({ ...prev, eduId: e.target.value }))}
                        className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
                      >
                        <option value="ALL" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">ALL</option>
                        {eduDistricts
                          .filter(e => {
                            if (user?.role === 'DEO') {
                              return e.districtId === (user.districtId || 'dist-9');
                            }
                            return true;
                          })
                          .map(e => (
                          <option key={e.id} value={e.id} className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">{e.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
                    <span className="text-[10px] uppercase font-bold text-gray-400">School Type:</span>
                    <select
                      value={subjectFilters.schoolType}
                      onChange={e => setSubjectFilters(prev => ({ ...prev, schoolType: e.target.value }))}
                      className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
                    >
                      <option value="ALL" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">ALL</option>
                      <option value="Government" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">Government</option>
                      <option value="Aided" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">Aided</option>
                      <option value="Unaided" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">Unaided</option>
                    </select>
                  </div>

                  <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Gender:</span>
                    <select
                      value={subjectFilters.gender}
                      onChange={e => setSubjectFilters(prev => ({ ...prev, gender: e.target.value }))}
                      className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
                    >
                      <option value="ALL" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">ALL</option>
                      <option value="BOYS" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">Boys</option>
                      <option value="GIRLS" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">Girls</option>
                    </select>
                  </div>
                </>
              )}

              {/* simulated school dropdown also visible for admin on subject analysis tab if they want school-level details */}
              {user?.role !== 'SCHOOL' && activeSchoolId && (
                <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">School:</span>
                  <select
                    value={selectedSchId}
                    onChange={e => setSelectedSchId(e.target.value)}
                    className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
                  >
                    <option value="" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">All District</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id} className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {exams.length > 0 && (
                <ExamSelect
                  exams={exams}
                  selectedExamId={selectedExamId}
                  onSelect={(id) => setSelectedExamId(id)}
                  configuredIds={configuredExamIds}
                  className="min-w-[160px]"
                />
              )}

              <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
                <span className="text-[10px] uppercase font-bold text-gray-400">Div:</span>
                <select
                  value={subjectFilters.division}
                  onChange={e => setSubjectFilters(prev => ({ ...prev, division: e.target.value }))}
                  className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
                >
                  <option value="ALL" className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">ALL</option>
                  {(divisions.length > 0 ? divisions : ['A', 'B', 'C', 'D', 'E', 'F']).map(div => (
                    <option key={div} value={div} className="dark:bg-[#161b22] px-3 py-1.5 text-xs font-bold">{div}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Printer size={16} />
                Print
              </button>

              {user?.role !== 'SCHOOL' && (
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-[#1f6feb] text-white hover:bg-blue-700 dark:hover:bg-[#388bfd] rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <FileDown size={16} />
                  PDF
                </button>
              )}
            </div>
          </div>

          {/* Subject Analysis Printable Report Container */}
          <div id="subject-print-container" className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] p-8 rounded-3xl shadow-sm space-y-6 print:border-none print:p-0">
            <div className="border-b border-gray-100 dark:border-[#30363d] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:flex-row print:items-center print:justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-black dark:text-white tracking-tight uppercase leading-tight font-sans print:text-xl">
                  {user?.role === 'SCHOOL' || activeSchoolId ? school?.name : 'Subject Grade Wall (District Wide)'}
                </h2>
                <p className="text-xs text-slate-400 dark:text-gray-550 font-bold uppercase tracking-wider print:text-[10px]">
                  {user?.role === 'SCHOOL' || activeSchoolId ? `School Code: ${school?.code}` : `Revenue District: ${subjectAnalysisData?.revenueDistrict || 'Palakkad'}`}
                </p>
              </div>
              <div className="text-left md:text-right space-y-1 md:shrink-0 bg-slate-50 dark:bg-[#1a1f26] p-4 rounded-2xl border border-slate-100 dark:border-[#30363d] print:p-2 print:rounded-none print:text-right print:bg-transparent print:border-none">
                <p className="text-[10px] uppercase font-black text-gray-400 dark:text-gray-550 print:text-[8px]">SUBJECT ANALYSIS</p>
                <p className="text-xs font-black text-black dark:text-white uppercase print:text-[10px]">{exam?.name || 'Class Term Study'}</p>
                <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full w-fit md:ml-auto print:ml-auto print:text-[8px] print:bg-transparent print:px-0">
                  CLASS STANDARD {exam?.standard || '10'} {subjectFilters.division !== 'ALL' && `(DIV: ${subjectFilters.division})`}
                </p>
              </div>
            </div>

            {/* Tables grouped by Medium */}
            {isSubjectLoading ? (
              <div className="border border-gray-100 dark:border-[#30363d] rounded-2xl overflow-hidden mt-6 print:border-none">
                <table className="w-full text-left border-collapse text-[11px]">
                  <tbody>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={16} className="px-4 py-6 text-center text-gray-400">Loading analysis data...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !subjectAnalysisData || !subjectAnalysisData.data || subjectAnalysisData.data.length === 0 ? (
              <div className="border border-gray-100 dark:border-[#30363d] rounded-2xl overflow-hidden mt-6 print:border-none">
                <table className="w-full text-left border-collapse text-[11px]">
                  <tbody>
                    <tr>
                      <td colSpan={16} className="px-4 py-10 text-center text-slate-400 dark:text-gray-550">
                        No subject analysis records found.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (() => {
              const mediumOrder = ['Tamil', 'English', 'Malayalam', 'Unknown'];
              const mediumGroups: Record<string, any[]> = {};
              subjectAnalysisData.data.forEach((row: any) => {
                const med = row.medium || 'Unknown';
                if (!mediumGroups[med]) mediumGroups[med] = [];
                mediumGroups[med].push(row);
              });
              const orderedMediums = mediumOrder.filter(m => mediumGroups[m]?.length > 0);
              const extraMediums = Object.keys(mediumGroups).filter(m => !mediumOrder.includes(m));
              const allMediums = [...orderedMediums, ...extraMediums];

              const mediumColors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
                Tamil: { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
                English: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
                Malayalam: { bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800', badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
                Unknown: { bg: 'bg-gray-50 dark:bg-gray-950/20', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-800', badge: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300' },
              };
              const getColor = (m: string) => mediumColors[m] || mediumColors.Unknown;

              const renderMediumTable = (mediumName: string, rows: any[], slOffset: number) => {
                const colors = getColor(mediumName);
                return (
                  <div key={mediumName} className="space-y-4">
                    <div className={`flex items-center gap-3 ${colors.bg} border ${colors.border} rounded-2xl px-5 py-3 print:px-3 print:py-2`}>
                      <span className={`text-sm font-black uppercase tracking-wide ${colors.text} print:text-xs`}>
                        {mediumName === 'Unknown' ? 'Other Medium' : `${mediumName} Medium`}
                      </span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${colors.badge} print:text-[8px]`}>
                        {rows.length} {rows.length === 1 ? 'Subject' : 'Subjects'}
                      </span>
                    </div>
                    <div className="border border-gray-100 dark:border-[#30363d] rounded-2xl overflow-hidden print:border-none">
                      <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-[#1a1f26] border-b border-gray-100 dark:border-[#30363d] font-extrabold text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-450 print:bg-slate-100 print:text-gray-700">
                            <th className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">Sl</th>
                            <th className="px-3 py-3 border-r border-gray-100 dark:border-[#30363d]">Subject</th>
                            <th className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">Total</th>
                            <th className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">Appr</th>
                            <th className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center text-emerald-600">Pass</th>
                            <th className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center text-red-500">Fail</th>
                            <th className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center text-red-500">Absent</th>
                            <th className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">A+</th>
                            <th className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">A</th>
                            <th className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">B+</th>
                            <th className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">B</th>
                            <th className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">C+</th>
                            <th className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">C</th>
                            <th className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">D+</th>
                            <th className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center">D</th>
                            <th className="px-2 py-3 text-center">E</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#30363d] font-medium">
                          {rows.map((row: any, idx: number) => {
                            return (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#1f242c]/50 transition-colors">
                                <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] font-mono text-center">{slOffset + idx + 1}</td>
                                <td className="px-3 py-3 border-r border-gray-100 dark:border-[#30363d] font-bold text-gray-900 dark:text-white uppercase">
                                  <div className="truncate max-w-[150px]" title={row.subject}>{row.subject}</div>
                                </td>
                                <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono font-bold">{(row.totalStudents || 0)}</td>
                                <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono">{(row.appeared || 0)}</td>
                                <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono font-bold text-emerald-600">{(row.pass || 0)}</td>
                                <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono font-bold text-red-500">{(row.fail || 0)}</td>
                                <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono font-bold text-red-500 bg-red-50/10">{(row.absents || 0)}</td>
                                <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono">{(row.aPlus || 0)}</td>
                                <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono">{(row.a || 0)}</td>
                                <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono">{(row.bPlus || 0)}</td>
                                <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono">{(row.b || 0)}</td>
                                <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono">{(row.cPlus || 0)}</td>
                                <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono">{(row.c || 0)}</td>
                                <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono">{(row.dPlus || 0)}</td>
                                <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono">{(row.d || 0)}</td>
                                <td className="px-2 py-3 text-center font-mono">{(row.e || 0)}</td>
                              </tr>
                            );
                          })}
                          {/* Summary Row */}
                          <tr className="bg-slate-50 dark:bg-[#1a1f26] font-black hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors border-t-2 border-gray-200 dark:border-[#30363d]">
                            <td colSpan={2} className="px-3 py-3 border-r border-gray-100 dark:border-[#30363d] text-right text-[9px] uppercase tracking-wider text-black dark:text-white">
                              {mediumName} Medium — Totals
                            </td>
                            <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono bg-blue-50/50">{rows.reduce((s: number, r: any) => s + (r.totalStudents || 0), 0)}</td>
                            <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono bg-blue-50/50">{rows.reduce((s: number, r: any) => s + (r.appeared || 0), 0)}</td>
                            <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono text-emerald-600 bg-emerald-50/50">{rows.reduce((s: number, r: any) => s + (r.pass || 0), 0)}</td>
                            <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono text-red-500 bg-red-50/50">{rows.reduce((s: number, r: any) => s + (r.fail || 0), 0)}</td>
                            <td className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono text-red-500 bg-red-50/50">{rows.reduce((s: number, r: any) => s + (r.absents || 0), 0)}</td>
                            <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono bg-slate-100/50">{rows.reduce((s: number, r: any) => s + (r.aPlus || 0), 0)}</td>
                            <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono bg-slate-100/50">{rows.reduce((s: number, r: any) => s + (r.a || 0), 0)}</td>
                            <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono bg-slate-100/50">{rows.reduce((s: number, r: any) => s + (r.bPlus || 0), 0)}</td>
                            <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono bg-slate-100/50">{rows.reduce((s: number, r: any) => s + (r.b || 0), 0)}</td>
                            <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono bg-slate-100/50">{rows.reduce((s: number, r: any) => s + (r.cPlus || 0), 0)}</td>
                            <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono bg-slate-100/50">{rows.reduce((s: number, r: any) => s + (r.c || 0), 0)}</td>
                            <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono bg-slate-100/50">{rows.reduce((s: number, r: any) => s + (r.dPlus || 0), 0)}</td>
                            <td className="px-1 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono bg-slate-100/50">{rows.reduce((s: number, r: any) => s + (r.d || 0), 0)}</td>
                            <td className="px-2 py-3 text-center font-mono bg-slate-100/50">{rows.reduce((s: number, r: any) => s + (r.e || 0), 0)}</td>
                          </tr>
                          {/* Pass % Row */}
                          <tr className="bg-slate-50 dark:bg-[#1a1f26] font-black hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors">
                            <td colSpan={7} className="px-3 py-3 border-r border-gray-100 dark:border-[#30363d] text-right text-[9px] uppercase tracking-wider text-black dark:text-white">
                              {mediumName} Medium — Pass %
                            </td>
                            <td colSpan={5} className="px-2 py-3 border-r border-gray-100 dark:border-[#30363d] text-center font-mono text-blue-600 bg-blue-50/50">
                              {(() => {
                                const totalApp = rows.reduce((s: number, r: any) => s + (r.appeared || 0), 0);
                                const totalPass = rows.reduce((s: number, r: any) => s + (r.pass || 0), 0);
                                return totalApp > 0 ? ((totalPass / totalApp) * 100).toFixed(1) + '%' : '0.0%';
                              })()}
                            </td>
                            <td colSpan={4} className="px-2 py-3"></td>
                          </tr>
                        </tbody>
                      </table>
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-8 mt-6">
                  {allMediums.map((med, mIdx) => {
                    let offset = 0;
                    for (let i = 0; i < mIdx; i++) offset += mediumGroups[allMediums[i]].length;
                    return renderMediumTable(med, mediumGroups[med], offset);
                  })}
                  {/* Grand Totals across ALL mediums */}
                  {(() => {
                    const allRows = subjectAnalysisData.data || [];
                    if (allRows.length === 0) return null;
                    const gTotals = allRows.reduce((acc: any, r: any) => ({
                      totalStudents: acc.totalStudents + (r.totalStudents || 0),
                      appeared: acc.appeared + (r.appeared || 0),
                      pass: acc.pass + (r.pass || 0),
                      fail: acc.fail + (r.fail || 0),
                      absents: acc.absents + (r.absents || 0),
                      aPlus: acc.aPlus + (r.aPlus || 0),
                      a: acc.a + (r.a || 0),
                      bPlus: acc.bPlus + (r.bPlus || 0),
                      b: acc.b + (r.b || 0),
                      cPlus: acc.cPlus + (r.cPlus || 0),
                      c: acc.c + (r.c || 0),
                      dPlus: acc.dPlus + (r.dPlus || 0),
                      d: acc.d + (r.d || 0),
                      e: acc.e + (r.e || 0),
                    }), { totalStudents: 0, appeared: 0, pass: 0, fail: 0, absents: 0, aPlus: 0, a: 0, bPlus: 0, b: 0, cPlus: 0, c: 0, dPlus: 0, d: 0, e: 0 });
                    const grandPassPct = gTotals.appeared > 0 ? ((gTotals.pass / gTotals.appeared) * 100).toFixed(1) + '%' : '0.0%';
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-5 py-3">
                          <span className="text-sm font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                            {subjectFilters.division === 'ALL' ? 'All Divisions — Grand Totals' : `Division ${subjectFilters.division} — Grand Totals`}
                          </span>
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                            {allRows.length} Subjects × {allMediums.length} Medium{allMediums.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="border border-indigo-200 dark:border-indigo-800 rounded-2xl overflow-hidden">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-800 font-extrabold text-[9px] uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                                <th className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">Sl</th>
                                <th className="px-3 py-3 border-r border-indigo-200 dark:border-indigo-800">Subject</th>
                                <th className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">Total</th>
                                <th className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">Appr</th>
                                <th className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center text-emerald-600">Pass</th>
                                <th className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center text-red-500">Fail</th>
                                <th className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center text-red-500">Absent</th>
                                <th className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">A+</th>
                                <th className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">A</th>
                                <th className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">B+</th>
                                <th className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">B</th>
                                <th className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">C+</th>
                                <th className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">C</th>
                                <th className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">D+</th>
                                <th className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center">D</th>
                                <th className="px-2 py-3 text-center">E</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-indigo-100 dark:divide-indigo-800/50 font-medium">
                              <tr className="bg-indigo-50 dark:bg-indigo-950/20 font-black hover:bg-indigo-100 dark:hover:bg-indigo-950/30 transition-colors border-t-2 border-indigo-200 dark:border-indigo-800">
                                <td colSpan={2} className="px-3 py-3 border-r border-indigo-200 dark:border-indigo-800 text-right text-[9px] uppercase tracking-wider text-indigo-800 dark:text-indigo-200">
                                  ALL DIVISIONS — GRAND TOTAL
                                </td>
                                <td className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono bg-indigo-100/50 dark:bg-indigo-900/30">{gTotals.totalStudents.toLocaleString()}</td>
                                <td className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono bg-indigo-100/50 dark:bg-indigo-900/30">{gTotals.appeared.toLocaleString()}</td>
                                <td className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20">{gTotals.pass.toLocaleString()}</td>
                                <td className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono text-red-500 bg-red-50/50 dark:bg-red-900/20">{gTotals.fail.toLocaleString()}</td>
                                <td className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono text-red-500 bg-red-50/50 dark:bg-red-900/10">{gTotals.absents.toLocaleString()}</td>
                                <td className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono">{gTotals.aPlus.toLocaleString()}</td>
                                <td className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono">{gTotals.a.toLocaleString()}</td>
                                <td className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono">{gTotals.bPlus.toLocaleString()}</td>
                                <td className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono">{gTotals.b.toLocaleString()}</td>
                                <td className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono">{gTotals.cPlus.toLocaleString()}</td>
                                <td className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono">{gTotals.c.toLocaleString()}</td>
                                <td className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono">{gTotals.dPlus.toLocaleString()}</td>
                                <td className="px-1 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono">{gTotals.d.toLocaleString()}</td>
                                <td className="px-2 py-3 text-center font-mono">{gTotals.e.toLocaleString()}</td>
                              </tr>
                              <tr className="bg-indigo-50 dark:bg-indigo-950/20 font-black hover:bg-indigo-100 dark:hover:bg-indigo-950/30 transition-colors">
                                <td colSpan={7} className="px-3 py-3 border-r border-indigo-200 dark:border-indigo-800 text-right text-[9px] uppercase tracking-wider text-indigo-800 dark:text-indigo-200">
                                  ALL DIVISIONS — GRAND PASS %
                                </td>
                                <td colSpan={9} className="px-2 py-3 border-r border-indigo-200 dark:border-indigo-800 text-center font-mono text-indigo-600 bg-indigo-100/50 dark:bg-indigo-900/30">
                                  {grandPassPct}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </>
      ) : (
        renderCustomReport()
      )}

    </div>
  );
};

export default ReportsPage;

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

