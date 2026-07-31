import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  School as SchoolIcon, 
  BarChart3, 
  TrendingUp, 
  Filter,
  LayoutGrid,
  ClipboardList,
  GraduationCap,
  Award,
  TrendingDown,
  BookOpen,
  Target,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Eye,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Languages,
  Check,
  FileText,
  X,
  Printer,
  Edit3,
  Map,
  Info,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/apiClient';
import { onRefresh } from '../lib/eventBus';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar as RechartRadar
} from 'recharts';
import { cn } from '../lib/utils';
import Modal from '../components/common/Modal';
import DashboardChart from '../components/common/DashboardChart';
import PageLoader from '../components/common/PageLoader';
import PdfReportGeneratorModal, { ReportLevel } from '../components/common/PdfReportGeneratorModal';
import Dropdown from '../components/common/Dropdown';
import { generateSchoolSubmissionPdf, printSchoolSubmissionWindow, formatDateTime } from '../lib/pdfGenerator';
import TeacherDashboard from './school/TeacherDashboard';
import SubjectExpertDashboard from './repository/SubjectExpertDashboard';
import MarkEntryStatusModal from '../components/school/MarkEntryStatusModal';
import ExamSelect from '../components/common/ExamSelect';
import { sortSubjects } from '../lib/subjectUtils';



const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Region filtering states
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    if (user?.role === 'WEBMASTER' || user?.role === 'DIET') {
      return "ALL";
    }
    return user?.districtId || "dist-9";
  });
  const [selectedEduId, setSelectedEduId] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  // PDF Report Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Modals for submission stats click
  const [isConfirmedModalOpen, setIsConfirmedModalOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedModalEduId, setSelectedModalEduId] = useState<string>('ALL');
  
  const [showMarkEntryStatusModal, setShowMarkEntryStatusModal] = useState(false);
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  // School List Modal (admin)
  const [isSchoolListModalOpen, setIsSchoolListModalOpen] = useState(false);
  const [schoolListSearch, setSchoolListSearch] = useState('');
  const [schoolListFilterEdu, setSchoolListFilterEdu] = useState<string>('ALL');
  const [schoolListFilterDistrict, setSchoolListFilterDistrict] = useState<string>('ALL');

  // District Student Breakdown Modal (admin / district)
  const [isDistrictStudentsModalOpen, setIsDistrictStudentsModalOpen] = useState(false);
  const [districtSchoolStudentsData, setDistrictSchoolStudentsData] = useState<any>(null);
  const [isDistrictStudentsLoading, setIsDistrictStudentsLoading] = useState(false);
  const [districtModalSearch, setDistrictModalSearch] = useState('');
  const [districtModalRevenueDistrict, setDistrictModalRevenueDistrict] = useState('ALL');
  const [districtModalEduDistrict, setDistrictModalEduDistrict] = useState('ALL');
  const [districtModalSchoolType, setDistrictModalSchoolType] = useState('ALL');
  const [districtModalGender, setDistrictModalGender] = useState('ALL');

  const [isEagleViewModalOpen, setIsEagleViewModalOpen] = useState(false);
  const [eagleViewData, setEagleViewData] = useState<any>(null);
  const [isEagleViewLoading, setIsEagleViewLoading] = useState(false);
  const [eagleViewSearch, setEagleViewSearch] = useState('');

  const isWebmaster = user?.role === 'WEBMASTER';
  const userSubDistrictId = user?.subDistrictId;
  const hasAllAccess = isWebmaster || !userSubDistrictId;
  const defaultEduId = hasAllAccess ? 'ALL' : (userSubDistrictId || 'ALL');

  useEffect(() => {
    if (user) {
      setSelectedModalEduId(defaultEduId);
    }
  }, [user, defaultEduId]);

  // Exam selection states
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // Loaded data
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [districts, setDistricts] = useState<any[]>([]);
  const [eduDistricts, setEduDistricts] = useState<any[]>([]);
  const [allSchools, setAllSchools] = useState<any[]>([]);
  const [schoolAnalysis, setSchoolAnalysis] = useState<any>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [langValidation, setLangValidation] = useState<any>(null);
  const [showLangModal, setShowLangModal] = useState(false);

  // Region Analytics
  const [regionAnalytics, setRegionAnalytics] = useState<any>(null);
  const [isRegionLoading, setIsRegionLoading] = useState(false);

  // Subject-wise & School Type counts (admin/DEO/DIET/Webmaster)
  const [subjectCounts, setSubjectCounts] = useState<any>(null);
  const [isSubjectCountsLoading, setIsSubjectCountsLoading] = useState(false);
  const [schoolTypeCounts, setSchoolTypeCounts] = useState<any>(null);
  const [isSchoolTypeLoading, setIsSchoolTypeLoading] = useState(false);
  const [isAllMediumsExpanded, setIsAllMediumsExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedExam = exams.find((e: any) => e.id === selectedExamId) || exams[0];

  // On mount, fetch available exams, districts, educational districts, and schools
  useEffect(() => {
    setIsMounted(true);
    const fetchInitialData = async () => {
      try {
        const [examsRes, distRes, eduRes, schoolsRes] = await Promise.all([
          apiClient.get('/management/exams'),
          apiClient.get('/management/districts'),
          apiClient.get('/management/educational-districts'),
          apiClient.get('/management/schools')
        ]);
        setExams(examsRes.data);
        setDistricts(distRes.data);
        setEduDistricts(eduRes.data);
        setAllSchools(schoolsRes.data);
        if (examsRes.data.length > 0) {
          setSelectedExamId(examsRes.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load initial data in dashboard:", err);
      }
    };
    fetchInitialData();
  }, []);

  // Sync role-based scope restrictions
  useEffect(() => {
    if (user?.role === 'SCHOOL' && (user.schoolId || user.id)) {
      setSelectedSchoolId(user.schoolId || user.id);
    }
  }, [user]);

      // Fetch stats whenever region filters or exam choices change
      useEffect(() => {
        const fetchStats = async () => {
          setIsLoading(true);
          try {
            let url = '/dashboard/stats';
            const params = new URLSearchParams();
            
            // Ensure school role is locked strictly to their school
            const effectiveSchoolId = user?.role === 'SCHOOL' ? (user.schoolId || user.id) : selectedSchoolId;
            
            if (effectiveSchoolId) {
              params.append('schoolId', effectiveSchoolId);
            }
            if (selectedEduId) {
              params.append('eduId', selectedEduId);
            }
            if (selectedDistrict) {
              params.append('districtId', selectedDistrict);
            }
    
            if (selectedExamId) {
              params.append('examId', selectedExamId);
            }
    
            const queryString = params.toString();
            const res = await apiClient.get(`${url}${queryString ? '?' + queryString : ''}`);
            setData(res.data);
          } catch (err) {
            console.error("Error fetching stats:", err);
          } finally {
            setIsLoading(false);
          }
        };
    
        fetchStats();
      }, [selectedDistrict, selectedEduId, selectedSchoolId, selectedExamId, user, refreshKey]);

  useEffect(() => {
    const fetchSchoolAnalysis = async () => {
      const isSchool = user?.role === 'SCHOOL' || !!selectedSchoolId;
      if (!isSchool || !selectedExamId) return;
      const effectiveSid = user?.role === 'SCHOOL' ? (user.schoolId || user.id) : selectedSchoolId;
      if (!effectiveSid) return;
      setIsAnalysisLoading(true);
      try {
        const res = await apiClient.get(`/dashboard/school-analysis?examId=${selectedExamId}&schoolId=${effectiveSid}`);
        setSchoolAnalysis(res.data);
      } catch (err) {
        console.error("Error fetching school analysis:", err);
      } finally {
        setIsAnalysisLoading(false);
      }
    };
    fetchSchoolAnalysis();
  }, [selectedExamId, selectedSchoolId, user, refreshKey]);

  const handleForceRefreshStats = async () => {
    const isSchool = user?.role === 'SCHOOL' || !!selectedSchoolId;
    if (!isSchool || !selectedExamId) return;
    const effectiveSid = user?.role === 'SCHOOL' ? (user.schoolId || user.id) : selectedSchoolId;
    if (!effectiveSid) return;
    
    const toastId = toast.loading('Recalculating live counts from database...');
    setIsAnalysisLoading(true);
    try {
      const res = await apiClient.get(`/dashboard/school-analysis?examId=${selectedExamId}&schoolId=${effectiveSid}&force=true`);
      setSchoolAnalysis(res.data);
      toast.success('Accurate counts updated from database!', { id: toastId });
    } catch (err) {
      console.error("Error force refreshing school analysis:", err);
      toast.error('Failed to update counts', { id: toastId });
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const [isRefreshingExamStats, setIsRefreshingExamStats] = useState(false);

  const handleRefreshExamStats = async () => {
    setIsRefreshingExamStats(true);
    const toastId = toast.loading('Recalculating Exam Statistics live...');
    try {
      const params = new URLSearchParams();
      const effectiveSchoolId = user?.role === 'SCHOOL' ? (user.schoolId || user.id) : selectedSchoolId;
      if (effectiveSchoolId) params.append('schoolId', effectiveSchoolId);
      if (selectedEduId) params.append('eduId', selectedEduId);
      if (selectedDistrict) params.append('districtId', selectedDistrict);
      if (selectedExamId) params.append('examId', selectedExamId);
      params.append('force', 'true');

      const res = await apiClient.get(`/dashboard/stats?${params.toString()}`);
      setData(res.data);
      setRefreshKey(prev => prev + 1);
      toast.success('Exam Statistics updated live from database!', { id: toastId });
    } catch (err) {
      console.error("Error refreshing exam stats:", err);
      toast.error('Failed to refresh stats', { id: toastId });
    } finally {
      setIsRefreshingExamStats(false);
    }
  };

  // Language Distribution Validation
  useEffect(() => {
    const fetchLangValidation = async () => {
      const isSchool = user?.role === 'SCHOOL' || !!selectedSchoolId;
      if (!isSchool) return;
      const effectiveSid = user?.role === 'SCHOOL' ? (user.schoolId || user.id) : selectedSchoolId;
      if (!effectiveSid) return;
      try {
        const res = await apiClient.get(`/school/language-validation?schoolId=${effectiveSid}`);
        setLangValidation(res.data);
      } catch (err) {
        console.error('Language validation error:', err);
      }
    };
    fetchLangValidation();
  }, [selectedSchoolId, user, refreshKey]);

  // Region Analytics fetch
  useEffect(() => {
    const fetchRegionAnalytics = async () => {
      if (['SCHOOL', 'TEACHER', 'RESOURCE_PERSON'].includes(user?.role) || selectedSchoolId || selectedEduId ||
          (selectedDistrict && selectedDistrict !== 'ALL')) return;
      if (!selectedExamId) return;
      setIsRegionLoading(true);
      try {
        const res = await apiClient.get(`/dashboard/region-analytics?examId=${selectedExamId}`);
        setRegionAnalytics(res.data);
      } catch (err) {
        console.error("Error fetching region analytics:", err);
      } finally {
        setIsRegionLoading(false);
      }
    };
    fetchRegionAnalytics();
  }, [selectedExamId, user, selectedDistrict, selectedEduId, selectedSchoolId, refreshKey]);

  // Subject-wise counts (admin only)
  useEffect(() => {
    const fetchSubjectCounts = async () => {
      if (['SCHOOL', 'TEACHER', 'RESOURCE_PERSON'].includes(user?.role) || selectedSchoolId) return;
      if (!selectedExamId) return;
      setIsSubjectCountsLoading(true);
      try {
        const params = new URLSearchParams({ examId: selectedExamId });
        if (selectedEduId) params.append('eduId', selectedEduId);
        if (selectedDistrict && selectedDistrict !== 'ALL') params.append('districtId', selectedDistrict);
        const res = await apiClient.get(`/dashboard/subject-counts?${params.toString()}`);
        setSubjectCounts(res.data);
      } catch (err) {
        console.error("Error fetching subject counts:", err);
      } finally {
        setIsSubjectCountsLoading(false);
      }
    };
    fetchSubjectCounts();
  }, [selectedExamId, user, selectedDistrict, selectedEduId, selectedSchoolId, refreshKey]);

  // School type wise counts (admin only)
  useEffect(() => {
    const fetchSchoolTypeCounts = async () => {
      if (['SCHOOL', 'TEACHER', 'RESOURCE_PERSON'].includes(user?.role) || selectedSchoolId) return;
      if (!selectedExamId) return;
      setIsSchoolTypeLoading(true);
      try {
        const params = new URLSearchParams({ examId: selectedExamId });
        if (selectedEduId) params.append('eduId', selectedEduId);
        if (selectedDistrict && selectedDistrict !== 'ALL') params.append('districtId', selectedDistrict);
        const res = await apiClient.get(`/dashboard/school-type-counts?${params.toString()}`);
        setSchoolTypeCounts(res.data);
      } catch (err) {
        console.error("Error fetching school type counts:", err);
      } finally {
        setIsSchoolTypeLoading(false);
      }
    };
    fetchSchoolTypeCounts();
  }, [selectedExamId, user, selectedDistrict, selectedEduId, selectedSchoolId, refreshKey]);

  // Fetch school-wise student counts for District Student Breakdown Modal
  useEffect(() => {
    if (!isDistrictStudentsModalOpen || !selectedExamId) return;
    const fetchDistrictStudents = async () => {
      setIsDistrictStudentsLoading(true);
      try {
        const params = new URLSearchParams({ examId: selectedExamId });
        if (selectedDistrict && selectedDistrict !== 'ALL') params.append('districtId', selectedDistrict);
        if (selectedEduId && selectedEduId !== 'ALL') params.append('eduId', selectedEduId);
        const res = await apiClient.get(`/dashboard/district-school-students?${params.toString()}`);
        setDistrictSchoolStudentsData(res.data);
      } catch (err) {
        console.error("Error fetching district school students:", err);
      } finally {
        setIsDistrictStudentsLoading(false);
      }
    };
    fetchDistrictStudents();
  }, [isDistrictStudentsModalOpen, selectedExamId, selectedDistrict, selectedEduId, refreshKey]);

  useEffect(() => {
    if (!isEagleViewModalOpen || !selectedExamId) return;
    const fetchEagleViewData = async () => {
      setIsEagleViewLoading(true);
      try {
        const params = new URLSearchParams({ examId: selectedExamId });
        if (selectedDistrict && selectedDistrict !== 'ALL') params.append('districtId', selectedDistrict);
        if (selectedEduId && selectedEduId !== 'ALL') params.append('eduId', selectedEduId);
        const res = await apiClient.get(`/dashboard/entry-eagle-view?${params.toString()}`);
        setEagleViewData(res.data);
      } catch (err) {
        console.error("Error fetching eagle view data:", err);
      } finally {
        setIsEagleViewLoading(false);
      }
    };
    fetchEagleViewData();
  }, [isEagleViewModalOpen, selectedExamId, selectedDistrict, selectedEduId, refreshKey]);

  const filteredDistrictSchools = useMemo(() => {
    if (!districtSchoolStudentsData?.schools) return [];
    return districtSchoolStudentsData.schools.filter((s: any) => {
      if (districtModalSearch.trim()) {
        const q = districtModalSearch.toLowerCase().trim();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchCode = (s.code || '').toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      if (districtModalRevenueDistrict !== 'ALL' && s.districtId !== districtModalRevenueDistrict) {
        return false;
      }
      if (districtModalEduDistrict !== 'ALL' && s.subDistrictId !== districtModalEduDistrict) {
        return false;
      }
      if (districtModalSchoolType !== 'ALL' && (s.schoolType || '').toUpperCase() !== districtModalSchoolType.toUpperCase()) {
        return false;
      }
      if (districtModalGender === 'MALE_ONLY' && (s.maleCount || 0) === 0) {
        return false;
      }
      if (districtModalGender === 'FEMALE_ONLY' && (s.femaleCount || 0) === 0) {
        return false;
      }
      return true;
    });
  }, [districtSchoolStudentsData, districtModalSearch, districtModalRevenueDistrict, districtModalEduDistrict, districtModalSchoolType, districtModalGender]);

  const filteredDistrictTotals = useMemo(() => {
    let male = 0, female = 0, total = 0;
    filteredDistrictSchools.forEach((s: any) => {
      male += s.maleCount || 0;
      female += s.femaleCount || 0;
      total += s.totalStudents || 0;
    });
    return { male, female, total, schools: filteredDistrictSchools.length };
  }, [filteredDistrictSchools]);

  // Listen for data refresh events (mediums/subjects updated from management pages)
  useEffect(() => {
    const unsub1 = onRefresh('mediums-updated', () => setRefreshKey(k => k + 1));
    const unsub2 = onRefresh('subjects-updated', () => setRefreshKey(k => k + 1));
    const unsub3 = onRefresh('data-updated', () => setRefreshKey(k => k + 1));
    const unsub4 = onRefresh('students-updated', () => setRefreshKey(k => k + 1));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  // Auto-show language validation modal
  useEffect(() => {
    if (langValidation && !langValidation.isValid) {
      setShowLangModal(true);
    }
  }, [langValidation]);



  const handleBarClick = (item: any) => {
    if (user?.role === 'SCHOOL') return; // schools have static grade distribution charts
    if (!selectedEduId) {
      setSelectedEduId(item.id);
    } else if (!selectedSchoolId) {
      setSelectedSchoolId(item.id);
    }
  };

  const resetSelection = () => {
    if (user?.role === 'SCHOOL') return;
    setSelectedDistrict((user?.role === 'WEBMASTER' || user?.role === 'DIET') ? "ALL" : (user?.districtId || "dist-9"));
    setSelectedEduId(user?.subDistrictId || null);
    setSelectedSchoolId(null);
  };

  const goBack = () => {
    if (user?.role === 'SCHOOL') return;
    if (selectedSchoolId) {
      setSelectedSchoolId(null);
    } else if (selectedEduId && !user?.subDistrictId) {
      setSelectedEduId(null);
    }
  };

  const activeSchoolScope = React.useMemo(() => {
    if (!allSchools) return [];
    if (!hasAllAccess && userSubDistrictId) {
      return allSchools.filter((s: any) => s.subDistrictId === userSubDistrictId);
    }
    if (selectedDistrict && selectedDistrict !== 'ALL') {
      const eduIdsInDistrict = eduDistricts.filter((e: any) => e.districtId === selectedDistrict).map((e: any) => e.id);
      return allSchools.filter((s: any) => eduIdsInDistrict.includes(s.subDistrictId));
    }
    return allSchools;
  }, [allSchools, hasAllAccess, userSubDistrictId, selectedDistrict, eduDistricts]);

  if (isLoading || !data) {
    return (
      <PageLoader label="Loading Dashboard..." />
    );
  }

  const isSchoolView = user?.role === 'SCHOOL' || !!selectedSchoolId;
  const isSchoolUser = user?.role === 'SCHOOL';

  // Calculate victory pass percentage dynamically if school view
  const victoryPercentage = isSchoolView && data?.appeared > 0
    ? ((data?.pass / data?.appeared) * 100)
    : 0;

  const showBackButton = 
    user?.role !== 'SCHOOL' && (
      user?.subDistrictId
        ? !!selectedSchoolId 
        : (!!selectedSchoolId || !!selectedEduId || selectedDistrict !== "ALL")
    );

  const totalSchools = (data?.confirmedSchoolsCount || 0) + (data?.unconfirmedSchoolsCount || 0);
  const confirmedPct = totalSchools > 0 ? ((data?.confirmedSchoolsCount || 0) / totalSchools) * 100 : 0;
  const isConfirmed = !!data?.isSchoolConfirmed;

  // Resolve breadcrumbs dynamic labels
  const resolvedEduName = selectedEduId 
    ? eduDistricts.find(e => e.id === selectedEduId)?.name
    : null;

  const resolvedSchoolName = selectedSchoolId
    ? allSchools.find(s => s.id === selectedSchoolId)?.name
    : null;

  const schoolForUser = isSchoolUser && user?.schoolId 
    ? allSchools.find(s => s.id === user.schoolId)
    : null;
  const eduIdForUser = schoolForUser?.eduId;
  const eduForUser = eduIdForUser ? eduDistricts.find(e => e.id === eduIdForUser) : null;

  const showEduName = resolvedEduName || eduForUser?.name;
  const showSchoolName = resolvedSchoolName || (isSchoolUser ? (schoolForUser?.name || data?.title) : null);

  const pendingSchoolsCount = data?.unconfirmedSchoolsCount || 0;
  const confirmedSchoolsCount = data?.confirmedSchoolsCount || 0;

  const confirmedSchoolIds = selectedExam?.confirmedSchools || [];

  
  if (user?.role === 'TEACHER') {
    return <TeacherDashboard />;
  }

  if (user?.role === 'SUBJECT_EXPERT') {
    return <SubjectExpertDashboard />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-5">
      {/* Modals */}
      {user?.role === 'SCHOOL' && showMarkEntryStatusModal && selectedExamId && (
        <MarkEntryStatusModal
          isOpen={showMarkEntryStatusModal}
          onClose={() => setShowMarkEntryStatusModal(false)}
          examId={selectedExamId}
          examName={selectedExam?.name || 'Selected Exam'}
        />
      )}

      {isPdfModalOpen && (
        <PdfReportGeneratorModal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} />
      )}

      {/* Language Validation Modal */}
      {showLangModal && langValidation && !langValidation.isValid && (
        <Modal isOpen={showLangModal} onClose={() => setShowLangModal(false)} disableOutsideClick={true}>
          <div className="bg-white dark:bg-[#161b22] border-2 border-red-300 dark:border-red-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={22} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-red-800 dark:text-red-300 uppercase tracking-wider">Language Validation Failed</h3>
                <p className="text-[10px] font-bold text-red-500 dark:text-red-400">{langValidation.totalStudents} Total Students</p>
              </div>
              <button onClick={() => setShowLangModal(false)} className="ml-auto p-1.5 hover:bg-gray-100 dark:hover:bg-[#1a1f26] rounded-lg transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Per-slot detailed breakdown */}
            <div className="space-y-2 mb-4">
              {langValidation.perSlot && Object.entries(langValidation.perSlot).map(([slot, info]: [string, any]) => (
                <div key={slot} className={`border rounded-xl p-3 ${info.valid ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black ${info.valid ? 'text-emerald-700' : 'text-red-700'}`}>{slot}</span>
                      <span className="text-[9px] font-bold text-gray-500">{info.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black ${info.valid ? 'text-emerald-700' : 'text-red-700'}`}>{info.total}/{info.expected}</span>
                      <span className={`text-xs ${info.valid ? 'text-emerald-500' : 'text-red-500'}`}>{info.valid ? '✓' : '✗'}</span>
                    </div>
                  </div>
                  {info.languages && info.languages.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {info.languages.map((l: any, i: number) => (
                        <span key={i} className={`text-[9px] font-black px-1.5 py-0.5 rounded ${info.valid ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'}`}>
                          {l.language}: {l.count} ({l.percentage}%)
                        </span>
                      ))}
                    </div>
                  )}
                  {!info.valid && info.missingCount > 0 && (
                    <div className="text-[9px] font-bold text-red-600 dark:text-red-400 mt-1">
                      Missing: {info.missingCount} student(s)
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Missing field alerts */}
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 mb-4">
              <p className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-2">Missing Student Fields</p>
              <div className="grid grid-cols-2 gap-1">
                {langValidation.missingMediumStudents > 0 && (
                  <div className="text-[10px] font-bold text-orange-600">No Medium: {langValidation.missingMediumStudents} students</div>
                )}
                {langValidation.missingPaper1Students > 0 && (
                  <div className="text-[10px] font-bold text-red-600">No P01 (First Lang 1): {langValidation.missingPaper1Students}</div>
                )}
                {langValidation.missingPaper2Students > 0 && (
                  <div className="text-[10px] font-bold text-red-600">No P02 (First Lang 2): {langValidation.missingPaper2Students}</div>
                )}
                {langValidation.missingSecondLangStudents > 0 && (
                  <div className="text-[10px] font-bold text-red-600">No P03 (Second Lang): {langValidation.missingSecondLangStudents}</div>
                )}
                {langValidation.missingThirdLangStudents > 0 && (
                  <div className="text-[10px] font-bold text-red-600">No P04 (Third Lang): {langValidation.missingThirdLangStudents}</div>
                )}
              </div>
            </div>

            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-4">
              Correct student language information in Students Management. Dashboard and Marks Entry may be inaccurate until resolved.
            </p>

            <button
              onClick={() => setShowLangModal(false)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-colors"
            >
              I Understand
            </button>
          </div>
        </Modal>
      )}

      <div className="flex flex-col gap-4 pb-6 border-b border-gray-100">
        <div className="w-full min-w-0">
          <div className="flex items-center gap-2 mb-2 w-full">
            {showBackButton && (
              <button 
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 shrink-0 mr-2"
                title="Go back"
              >
                <Filter size={16} className="rotate-180" />
              </button>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight uppercase leading-none flex items-center gap-2 animate-in fade-in duration-300 w-full overflow-hidden whitespace-nowrap">
              <span 
                onClick={() => {
                  if (user?.role !== 'SCHOOL' && !user?.subDistrictId && (selectedEduId || selectedSchoolId)) {
                    setSelectedEduId(null);
                    setSelectedSchoolId(null);
                  }
                }}
                className={cn(
                  "shrink-0",
                  user?.role !== 'SCHOOL' && !user?.subDistrictId && (selectedEduId || selectedSchoolId)
                    ? "cursor-pointer hover:underline transition-all"
                    : ""
                )}
                title={user?.role !== 'SCHOOL' && !user?.subDistrictId && (selectedEduId || selectedSchoolId) ? "Back to District View" : undefined}
              >
                District: {data?.districtName || 'Palakkad'}
              </span>
              {showEduName && (
                <>
                  <span className="text-gray-400 font-normal select-none shrink-0">→</span>
                  <span 
                    onClick={() => {
                      if (user?.role !== 'SCHOOL' && selectedSchoolId) {
                        setSelectedSchoolId(null);
                      }
                    }}
                    className={cn(
                      "text-blue-600 shrink-0",
                      user?.role !== 'SCHOOL' && selectedSchoolId
                        ? "cursor-pointer hover:underline transition-all"
                        : ""
                    )}
                    title={user?.role !== 'SCHOOL' && selectedSchoolId ? "Back to Educational District View" : undefined}
                  >
                    {showEduName}
                  </span>
                </>
              )}
              {showSchoolName && (
                <>
                  <span className="text-gray-400 font-normal select-none shrink-0">→</span>
                  <span className="text-emerald-600 truncate" title={showSchoolName}>{showSchoolName}</span>
                </>
              )}
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm truncate">
            {isSchoolView 
              ? `School Performance metrics for ${data.selectedExam || 'Active Term'}.`
              : "Real-time performance analytics and regional results."
            }
          </p>
        </div>

        <div className="flex justify-end w-full">
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full sm:w-auto">
            {/* Revenue District Selector Dropdown (for WEBMASTER and DIET) */}
            {(user?.role === 'WEBMASTER' || user?.role === 'DIET') && districts.length > 0 && (
              <Dropdown
                className="w-full sm:w-auto"
                minWidth={200}
                ariaLabel="Select Revenue District"
                value={selectedDistrict}
                onChange={(v) => {
                  setSelectedDistrict(v);
                  setSelectedEduId(null);
                  setSelectedSchoolId(null);
                }}
                options={[
                  { value: 'ALL', label: 'All Revenue Districts' },
                  ...districts.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            )}

            {/* Educational District Selector Dropdown */}
            {user?.role !== 'SCHOOL' && eduDistricts.length > 0 && (
              <Dropdown
                className="w-full sm:w-auto"
                minWidth={200}
                ariaLabel="Select Educational District"
                value={selectedEduId || ''}
                onChange={(v) => {
                  setSelectedEduId(v || null);
                  setSelectedSchoolId(null);
                }}
                options={[
                  { value: '', label: 'All Edu Districts' },
                  ...eduDistricts
                    .filter(edu => !selectedDistrict || selectedDistrict === 'ALL' || edu.districtId === selectedDistrict)
                    .map((edu) => ({ value: edu.id, label: edu.name })),
                ]}
              />
            )}



            {/* Mark Entry Status Trigger */}
            {user?.role === 'SCHOOL' && selectedExamId && (
              <button
                type="button"
                onClick={() => setShowMarkEntryStatusModal(true)}
                className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap"
              >
                <BarChart3 size={15} className="shrink-0" />
                <span className="hidden sm:inline">Mark Entry Status</span>
              </button>
            )}

            {/* Searchable Exam Selector */}
            {exams.length > 0 && (
              <ExamSelect
                exams={exams}
                selectedExamId={selectedExamId}
                onSelect={(id) => setSelectedExamId(id)}
                schoolId={user?.schoolId || user?.id}
                className="w-full sm:w-auto min-w-[280px]"
              />
            )}
          </div>
        </div>
      </div>

      {isSchoolView ? (
        <>
          {isAnalysisLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-gray-400">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading Analysis...
              </div>
            </div>
          )}

          {/* ======== LANGUAGE VALIDATION ALERT ======== */}
          {langValidation && !langValidation.isValid && (
            <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-700 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-red-800 dark:text-red-300 uppercase tracking-wider mb-1">
                    Language Validation Failed
                  </h3>
                  <p className="text-[11px] font-bold text-red-700 dark:text-red-400 mb-2">
                    {langValidation.totalStudents} Students — {langValidation.alertMessage}
                  </p>

                  {/* Per-slot breakdown */}
                  <div className="bg-white dark:bg-[#0d1117] border border-red-200 dark:border-red-800 rounded-lg p-3 mb-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {langValidation.perSlot && Object.entries(langValidation.perSlot).map(([slot, info]: [string, any]) => (
                        <div key={slot} className={`text-center p-2 rounded-lg ${info.valid ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'}`}>
                          <div className={`text-[10px] font-black uppercase ${info.valid ? 'text-emerald-600' : 'text-red-600'}`}>{slot}</div>
                          <div className={`text-lg font-black ${info.valid ? 'text-emerald-700' : 'text-red-700'}`}>{info.total}<span className="text-[10px]">/{info.expected}</span></div>
                          <div className="text-[9px] font-bold text-gray-500">{info.label}</div>
                          {info.languages && info.languages.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {info.languages.map((l: any, i: number) => (
                                <div key={i} className="text-[9px] font-bold text-gray-600 dark:text-gray-400">
                                  {l.language}: {l.count} ({l.percentage}%)
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing field counts */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {langValidation.missingMediumStudents > 0 && (
                      <span className="text-[9px] font-black bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">
                        No Medium: {langValidation.missingMediumStudents}
                      </span>
                    )}
                    {langValidation.missingPaper1Students > 0 && (
                      <span className="text-[9px] font-black bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                        No P01: {langValidation.missingPaper1Students}
                      </span>
                    )}
                    {langValidation.missingPaper2Students > 0 && (
                      <span className="text-[9px] font-black bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                        No P02: {langValidation.missingPaper2Students}
                      </span>
                    )}
                    {langValidation.missingSecondLangStudents > 0 && (
                      <span className="text-[9px] font-black bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                        No P03: {langValidation.missingSecondLangStudents}
                      </span>
                    )}
                    {langValidation.missingThirdLangStudents > 0 && (
                      <span className="text-[9px] font-black bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                        No P04: {langValidation.missingThirdLangStudents}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] font-bold text-red-500 dark:text-red-400">
                    Please correct in Students Management. Dashboard statistics and Marks Entry may be inaccurate.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======== SUBMISSION BANNER ======== */}
          {isConfirmed ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-black uppercase tracking-wider">Submission Confirmed & Locked</div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 mt-0.5">All marks are finalized and cannot be modified.</div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 shadow-md overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start gap-4 p-5">
                {/* Icon */}
                <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight">Results Not Yet Confirmed</h3>
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mt-1.5 leading-relaxed max-w-xl">
                    You have not yet confirmed the marks for this examination. Please review all entries and complete the confirmation process as soon as possible. Until confirmation, these results will remain in <strong>Editable Mode</strong> and can still be modified.
                  </p>
                </div>

                {/* Button */}
                <button
                  onClick={() => navigate('/dashboard/marks')}
                  className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.97]"
                >
                  <Edit3 size={15} />
                  Editable Mode
                </button>
              </div>
            </div>
          )}

          {/* ======== ROW 1: 7x KPI CARDS ======== */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {[
              { label: 'Total Students', value: schoolAnalysis?.totalStudents ?? 0, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/20', border: 'border-indigo-100 dark:border-indigo-800', icon: <Users size={16} className="text-indigo-500" /> },
              { label: 'Appeared', value: (schoolAnalysis?.totalStudents ?? 0) - (schoolAnalysis?.fullAbsent ?? 0), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-100 dark:border-blue-800', icon: <Eye size={16} className="text-blue-500" /> },
              { label: 'Passed', value: schoolAnalysis?.fullAPass ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-100 dark:border-emerald-800', icon: <CheckCircle2 size={16} className="text-emerald-500" /> },
              { label: 'Failed', value: schoolAnalysis?.fullFail ?? 0, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-100 dark:border-red-800', icon: <XCircle size={16} className="text-red-500" /> },
              { label: 'Absent', value: schoolAnalysis?.fullAbsent ?? 0, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-100 dark:border-orange-800', icon: <AlertTriangle size={16} className="text-orange-500" /> },
              { label: 'Pass %', value: `${schoolAnalysis?.totalStudents > 0 ? Math.round(((schoolAnalysis?.fullAPass ?? 0) / (schoolAnalysis.totalStudents - (schoolAnalysis?.fullAbsent ?? 0) || 1)) * 100) : 0}%`, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/20', border: 'border-violet-100 dark:border-violet-800', icon: <TrendingUp size={16} className="text-violet-500" /> },
              { label: 'A+ Students', value: schoolAnalysis?.fullAPlus ?? 0, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-100 dark:border-amber-800', icon: <Award size={16} className="text-amber-500" /> },
            ].map((c, i) => (
              <div key={i} className={`${c.bg} border ${c.border} rounded-xl p-3 hover:shadow-sm transition-all`}>
                <div className="flex items-center gap-1.5 mb-1.5">{c.icon}<span className="text-[10px] font-black text-gray-400 uppercase tracking-wider leading-none">{c.label}</span></div>
                <div className={`text-xl sm:text-2xl font-black ${c.color} leading-none`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* ======== ROW 2: GAUGE (60%) + SUBJECT PERFORMANCE (40%) ======== */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Gauge Pass % */}
            <div className="lg:col-span-2 bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-violet-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Victory Pass Rate</h3>
              </div>
              <div className="flex items-center justify-center">
                <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
                  {(() => {
                    const pct = schoolAnalysis?.totalStudents > 0 ? Math.round(((schoolAnalysis?.fullAPass ?? 0) / Math.max(1, schoolAnalysis.totalStudents - (schoolAnalysis?.fullAbsent ?? 0))) * 100) : 0;
                    const angle = (pct / 100) * 180;
                    const rad = (angle - 180) * (Math.PI / 180);
                    const x = 100 + 80 * Math.cos(rad);
                    const y = 100 + 80 * Math.sin(rad);
                    return <path d={`M 20 100 A 80 80 0 0 1 ${x} ${y}`} fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round" />;
                  })()}
                  <text x="100" y="85" textAnchor="middle" className="text-2xl font-black fill-gray-900 dark:fill-white" style={{ fontSize: 34, fontWeight: 900 }}>
                    {schoolAnalysis?.totalStudents > 0 ? Math.round(((schoolAnalysis?.fullAPass ?? 0) / Math.max(1, schoolAnalysis.totalStudents - (schoolAnalysis?.fullAbsent ?? 0))) * 100) : 0}%
                  </text>
                  <text x="100" y="105" textAnchor="middle" className="fill-gray-400" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Pass Rate
                  </text>
                </svg>
              </div>
              <div className="flex justify-between mt-2 px-4">
                <span className="text-[10px] font-bold text-red-400 uppercase">0%</span>
                <span className="text-[10px] font-bold text-amber-400 uppercase">50%</span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">100%</span>
              </div>
            </div>

            {/* Subject Performance Horizontal Bars */}
            <div className="lg:col-span-3 bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-blue-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Subject Performance</h3>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Pass %</span>
              </div>
              <div className={`space-y-2.5 ${!showAllSubjects ? 'max-h-[180px] overflow-hidden' : ''}`}>
                {(() => {
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
                  const subs = sortSubjects(schoolAnalysis?.subjectWise || []);
                  const visibleSubs = showAllSubjects ? subs : subs.slice(0, 5);
                  if (subs.length === 0) return <div className="text-center py-6 text-gray-300 text-[11px] font-bold uppercase">No data</div>;
                  return visibleSubs.map((sub: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[120px] truncate uppercase shrink-0">{sub.name}</span>
                      <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${sub.passPercentage >= 80 ? 'bg-emerald-500' : sub.passPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${sub.passPercentage}%` }} />
                      </div>
                      <span className={`text-[11px] font-black w-10 text-right ${sub.passPercentage >= 80 ? 'text-emerald-600' : sub.passPercentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{sub.passPercentage}%</span>
                    </div>
                  ));
                })()}
              </div>
              {(() => {
                const getSubjectSortKey2 = (code: string) => {
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
                const subs = sortSubjects(schoolAnalysis?.subjectWise || []);
                if (subs.length <= 5) return null;
                return (
                  <button
                    onClick={() => setShowAllSubjects(!showAllSubjects)}
                    className="mt-3 flex items-center gap-1.5 text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider hover:text-blue-800 dark:hover:text-blue-300 transition-colors mx-auto"
                  >
                    {showAllSubjects ? 'Show Less' : `Read More (${subs.length - 5} more)`}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${showAllSubjects ? 'rotate-180' : ''}`} />
                  </button>
                );
              })()}
            </div>
          </div>

          {/* ======== ROW 3: MEDIUM/GENDER + LANGUAGE + GRADE ======== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
            {/* Medium + Gender Pie */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-pink-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Medium & Gender</h3>
                </div>
                <button
                  type="button"
                  onClick={handleForceRefreshStats}
                  disabled={isAnalysisLoading}
                  title="Reload accurate count from database"
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isAnalysisLoading ? 'animate-spin text-pink-500' : ''} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Left: Pie chart + Medium & Gender labels below */}
                <div className="flex flex-col gap-2">
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 25, right: 25, bottom: 25, left: 25 }}>
                        <Pie 
                          data={schoolAnalysis?.mediumStats ? Object.entries(schoolAnalysis.mediumStats).map(([k, v]: [string, any]) => ({ name: k, value: v.total })).filter(d => d.value > 0) : []} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={28} 
                          outerRadius={46} 
                          paddingAngle={3} 
                          dataKey="value"
                          label={({ cx, cy, midAngle, outerRadius, value, index }) => {
                            if (!value) return null;
                            const MED_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6'];
                            const RADIAN = Math.PI / 180;
                            const radius = outerRadius + 18;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text
                                x={x}
                                y={y}
                                fill={MED_COLORS[index % MED_COLORS.length]}
                                textAnchor={x > cx ? 'start' : x < cx ? 'end' : 'middle'}
                                dominantBaseline="central"
                                style={{ fontSize: '13px', fontWeight: 900 }}
                              >
                                {value}
                              </text>
                            );
                          }}
                          labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                        >
                          <Cell fill="#f97316" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#22c55e" />
                          <Cell fill="#8b5cf6" />
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Medium & Gender labels — moved below the graph */}
                  <div className="space-y-1.5">
                    {schoolAnalysis?.mediumStats && Object.entries(schoolAnalysis.mediumStats).map(([med, stats]: [string, any], i: number) => {
                      const dotColors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'];
                      return (
                        <div key={med} className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColors[i % dotColors.length]}`} />
                          <span className="text-[11px] font-bold text-gray-500 uppercase flex-1">{med}</span>
                          <span className="text-[11px] font-black text-gray-900 dark:text-white">{stats.total}</span>
                          <span className="text-[10px] font-bold text-gray-400">(M:{stats.male} F:{stats.female})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Right: Male Total & Female Total — stay in present place */}
                <div className="flex flex-col justify-center gap-2">
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-1.5 mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      <span className="text-[11px] font-bold text-gray-500 uppercase flex-1">Male Total</span>
                      <span className="text-[11px] font-black text-blue-600">{schoolAnalysis?.maleCount ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                      <span className="text-[11px] font-bold text-gray-500 uppercase flex-1">Female Total</span>
                      <span className="text-[11px] font-black text-pink-600">{schoolAnalysis?.femaleCount ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Language Distribution Pie */}
            <div className={`bg-white dark:bg-[#161b22] border rounded-xl p-4 flex flex-col ${langValidation && !langValidation.isValid ? 'border-red-300 dark:border-red-700 shadow-red-100 dark:shadow-red-900/20 shadow-md' : 'border-gray-100 dark:border-[#30363d]'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Languages size={16} className="text-cyan-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Language Distribution</h3>
                </div>
                <button
                  type="button"
                  onClick={handleForceRefreshStats}
                  disabled={isAnalysisLoading}
                  title="Reload accurate count from database"
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isAnalysisLoading ? 'animate-spin text-cyan-500' : ''} />
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center min-h-[120px]">
                {(() => {
                  const langData = schoolAnalysis?.languageDistribution || [];
                  if (langData.length === 0) return <div className="h-full flex items-center justify-center text-gray-300 text-[11px] font-bold uppercase">No data</div>;
                  const pieData = langData.map((l: any) => ({ name: `${l.language} (${l.slot})`, value: l.count }));
                  const LANG_COLORS = ['#06b6d4','#8b5cf6','#f43f5e','#10b981','#f59e0b','#6366f1','#ec4899','#14b8a6','#f97316'];
                  return (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart margin={{ top: 25, right: 25, bottom: 25, left: 25 }}>
                        <Pie 
                          data={pieData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={28} 
                          outerRadius={46} 
                          paddingAngle={2} 
                          dataKey="value" 
                          label={({ cx, cy, midAngle, outerRadius, value, index }) => {
                            if (!value) return null;
                            const RADIAN = Math.PI / 180;
                            const radius = outerRadius + 18;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text
                                x={x}
                                y={y}
                                fill={LANG_COLORS[index % LANG_COLORS.length]}
                                textAnchor={x > cx ? 'start' : x < cx ? 'end' : 'middle'}
                                dominantBaseline="central"
                                style={{ fontSize: '13px', fontWeight: 900 }}
                              >
                                {value}
                              </text>
                            );
                          }} 
                          labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                        >
                          {pieData.map((_: any, idx: number) => <Cell key={idx} fill={LANG_COLORS[idx % LANG_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
              <div className="space-y-1 mt-2 pt-2 border-t border-gray-100 dark:border-[#30363d]">
                {(() => {
                  const langData = schoolAnalysis?.languageDistribution || [];
                  const LANG_COLORS = ['#06b6d4','#8b5cf6','#f43f5e','#10b981','#f59e0b','#6366f1','#ec4899','#14b8a6','#f97316'];
                  const grouped: Record<string, { language: string; count: number }[]> = {};
                  langData.forEach((l: any) => {
                    if (!grouped[l.slot]) grouped[l.slot] = [];
                    grouped[l.slot].push({ language: l.language, count: l.count });
                  });
                  return Object.entries(grouped).map(([slot, langs]) => (
                    <div key={slot}>
                      {langs.map((l, i) => {
                        const idx = langData.findIndex((x: any) => x.slot === slot && x.language === l.language);
                        return (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: LANG_COLORS[idx % LANG_COLORS.length] }} />
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 flex-1 uppercase truncate">{l.language} <span className="text-gray-400 dark:text-gray-500">({slot})</span></span>
                            <span className="text-[10px] font-black text-gray-900 dark:text-white">{l.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Grade Distribution Bar */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-indigo-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Grade Distribution</h3>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Student Level</span>
              </div>
              <div className="flex-1 min-h-[190px]">
                {(() => {
                  const ALL_GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E'];
                  const dist = schoolAnalysis?.studentGradeDistribution;
                  const distMap = dist ? (typeof dist === 'object' && !Array.isArray(dist) ? dist : {}) : {};
                  const chartData = ALL_GRADES.map(name => ({ name, victory: Number(distMap[name]) || 0 }));
                  const COLORS = ['#22c55e','#84cc16','#eab308','#f59e0b','#f97316','#ef4444','#a855f7','#6366f1','#ec4899'];
                  const maxVal = Math.max(...chartData.map(d => d.victory), 1);
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 18, right: 5, left: -20, bottom: 5 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#cbd5e1' }} axisLine={false} tickLine={false} domain={[0, maxVal]} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700 }} />
                        <Bar dataKey="victory" radius={[3, 3, 0, 0]} isAnimationActive={true} minPointSize={0}>
                          {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                          <LabelList dataKey="victory" position="top" style={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ======== ROW 4: 3-COL — TOP PERFORMERS / AT-RISK / PERFORMANCE LEVELS ======== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Top Performers */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-md flex items-center justify-center"><ArrowUpRight size={12} className="text-emerald-600" /></div>
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Top Performers <span className="text-gray-400">({schoolAnalysis?.topPerformers?.length || 0})</span></h3>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {(schoolAnalysis?.topPerformers || []).slice(0, 8).map((st: any, i: number) => (
                  <div key={st.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-[#1a1f26] rounded-lg transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="min-w-0"><p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{st.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{st.medium}</p></div>
                    </div>
                    <div className="text-right shrink-0 ml-2"><p className="text-sm font-black text-emerald-600">{st.avgPct}%</p>{st.totalAPlus > 0 && <p className="text-[9px] font-bold text-amber-500">{st.totalAPlus} A+</p>}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* At-Risk Students */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-md flex items-center justify-center"><AlertTriangle size={12} className="text-red-600" /></div>
                <h3 className="text-xs font-black uppercase tracking-wider text-red-700 dark:text-red-400">Needs Attention <span className="text-gray-400">({(schoolAnalysis?.weakStudents?.length || 0) + (schoolAnalysis?.failedStudents?.length || 0)})</span></h3>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {(() => {
                  const weakList = [...(schoolAnalysis?.failedStudents || []), ...(schoolAnalysis?.weakStudents || [])].slice(0, 8);
                  return weakList.map((st: any, i: number) => (
                    <div key={st.id || i} className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-[#1a1f26] rounded-lg transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="min-w-0"><p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{st.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{st.medium}</p></div>
                      </div>
                      <div className="text-right shrink-0 ml-2"><p className="text-sm font-black text-red-500">{st.avgPct}%</p></div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Performance Levels */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-6 h-6 bg-violet-100 dark:bg-violet-900/30 rounded-md flex items-center justify-center"><Brain size={12} className="text-violet-600" /></div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Performance Levels</h3>
              </div>
              {(() => {
                const total = schoolAnalysis?.totalStudents || 1;
                const levels = [
                  { label: 'Profound', sub: '80-100%', count: schoolAnalysis?.profoundLevel || 0, color: 'bg-emerald-500', text: 'text-emerald-600' },
                  { label: 'Above Avg', sub: '50-80%', count: schoolAnalysis?.aboveAvgLevel || 0, color: 'bg-blue-500', text: 'text-blue-600' },
                  { label: 'Average', sub: '30-50%', count: schoolAnalysis?.avgLevel || 0, color: 'bg-amber-500', text: 'text-amber-600' },
                  { label: 'Below Avg', sub: '<30%', count: schoolAnalysis?.belowAvg || 0, color: 'bg-red-500', text: 'text-red-600' },
                ];
                return (
                  <div className="space-y-3">
                    {levels.map((l, i) => {
                      const pct = total > 0 ? Math.round((l.count / total) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                              <span className="text-[11px] font-bold text-gray-500 uppercase">{l.label}</span>
                              <span className="text-[10px] font-bold text-gray-400">{l.sub}</span>
                            </div>
                            <span className={`text-xs font-black ${l.text}`}>{l.count} <span className="text-gray-400 font-bold">({pct}%)</span></span>
                          </div>
                          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full ${l.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {/* Quick Insights */}
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                {(schoolAnalysis?.fullAPlus ?? 0) > 0 && <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600"><Award size={11} />{schoolAnalysis.fullAPlus} student(s) with Full A+</div>}
                {(schoolAnalysis?.belowAvg ?? 0) > 0 && <div className="flex items-center gap-1 text-[10px] font-bold text-red-500"><AlertTriangle size={11} />{schoolAnalysis.belowAvg} students need support</div>}
              </div>
            </div>
          </div>

          {/* ======== ROW 5: FULL-WIDTH SUBJECT ANALYSIS TABLE ======== */}
          <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Subject Analysis</h3>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{schoolAnalysis?.subjectWise?.length || 0} subjects</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              {(() => {
                const subs = schoolAnalysis?.subjectWise || [];
                if (subs.length === 0) return <div className="text-center py-8 text-gray-400 text-[11px] font-bold uppercase">No subject data available</div>;
                const getSubjectSortKey3 = (code: string) => {
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
                const sorted = sortSubjects(subs);
                const totals = sorted.reduce((acc: any, s: any) => ({
                  appeared: acc.appeared + (s.appeared || 0), passCount: acc.passCount + (s.passCount || 0), failCount: acc.failCount + (s.failCount || 0),
                  absentCount: acc.absentCount + (s.absentCount || 0), totalStudents: acc.totalStudents + (s.totalStudents || 0), aPlus: acc.aPlus + (s.grades?.['A+'] || 0),
                  below30: acc.below30 + (s.below30 || 0), below55: acc.below55 + (s.below55 || 0), below85: acc.below85 + (s.below85 || 0), below100: acc.below100 + (s.below100 || 0),
                }), { appeared: 0, passCount: 0, failCount: 0, absentCount: 0, totalStudents: 0, aPlus: 0, below30: 0, below55: 0, below85: 0, below100: 0 });
                return (
                  <table className="w-full text-[11px] min-w-[1020px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#1a1f26]">
                        {['#', 'Subject', 'Total', 'Pass', 'Fail', 'A+', 'Absent', 'Appeared', 'Pass%', 'Fail%', 'Avg%', '<30', '<55', '<85', '<100'].map((h, i) => (
                          <th key={i} className={`px-2 py-2.5 font-black text-gray-400 uppercase text-[9px] tracking-wider ${i >= 2 ? 'text-center' : i === 1 ? 'text-left' : 'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-[#30363d]">
                      {sorted.map((sub: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/80 dark:hover:bg-[#1a1f26] transition-colors">
                          <td className="px-2 py-2 text-gray-400 font-mono">{i + 1}</td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-gray-900 dark:text-white uppercase truncate max-w-[200px]">{sub.name}</span>
                              <span className="text-[9px] text-gray-400 font-bold bg-gray-100 dark:bg-gray-800 px-1 rounded shrink-0">{sub.shortCode}</span>
                              {sub.paperTag && <span className={`text-[8px] font-black px-0.5 rounded ${sub.paperTag === 'AT' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>{sub.paperTag}</span>}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center font-black text-gray-900 dark:text-white">{sub.totalStudents || 0}</td>
                          <td className="px-2 py-2 text-center font-black text-emerald-600">{sub.passCount || 0}</td>
                          <td className="px-2 py-2 text-center font-black text-red-600">{sub.failCount || 0}</td>
                          <td className="px-2 py-2 text-center font-black text-amber-500">{sub.grades?.['A+'] || 0}</td>
                          <td className="px-2 py-2 text-center font-black text-orange-500">{sub.absentCount || 0}</td>
                          <td className="px-2 py-2 text-center font-black text-blue-600">{sub.appeared || 0}</td>
                          <td className="px-2 py-2 text-center"><span className={`font-black ${sub.passPercentage >= 80 ? 'text-emerald-600' : sub.passPercentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{sub.passPercentage}%</span></td>
                          <td className="px-2 py-2 text-center"><span className={`font-black ${sub.failPercentage <= 20 ? 'text-emerald-600' : sub.failPercentage <= 50 ? 'text-amber-600' : 'text-red-600'}`}>{sub.failPercentage}%</span></td>
                          <td className="px-2 py-2 text-center"><span className={`font-black ${sub.avgPercentage >= 75 ? 'text-emerald-600' : sub.avgPercentage >= 45 ? 'text-amber-600' : 'text-red-600'}`}>{sub.avgPercentage}%</span></td>
                          <td className="px-2 py-2 text-center"><span className={`font-black ${(sub.below30 || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>{sub.below30 || 0}</span></td>
                          <td className="px-2 py-2 text-center"><span className={`font-black ${(sub.below55 || 0) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{sub.below55 || 0}</span></td>
                          <td className="px-2 py-2 text-center"><span className="font-black text-blue-600">{sub.below85 || 0}</span></td>
                          <td className="px-2 py-2 text-center"><span className="font-black text-gray-500">{sub.below100 || 0}</span></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-[#1a1f26] border-t-2 border-gray-200 dark:border-[#30363d] font-black">
                        <td className="px-2 py-2 text-[9px]" colSpan={2}>TOTAL ({sorted.length})</td>
                        <td className="px-2 py-2 text-center">{totals.totalStudents}</td>
                        <td className="px-2 py-2 text-center text-emerald-600">{totals.passCount}</td>
                        <td className="px-2 py-2 text-center text-red-600">{totals.failCount}</td>
                        <td className="px-2 py-2 text-center text-amber-500">{totals.aPlus}</td>
                        <td className="px-2 py-2 text-center text-orange-500">{totals.absentCount}</td>
                        <td className="px-2 py-2 text-center text-blue-600">{totals.appeared}</td>
                        <td className="px-2 py-2 text-center text-emerald-600">{totals.appeared > 0 ? Math.round((totals.passCount / totals.appeared) * 100) : 0}%</td>
                        <td className="px-2 py-2 text-center text-red-600">{totals.appeared > 0 ? Math.round((totals.failCount / totals.appeared) * 100) : 0}%</td>
                        <td className="px-2 py-2 text-center text-indigo-600">-</td>
                        <td className="px-2 py-2 text-center text-red-600">{totals.below30}</td>
                        <td className="px-2 py-2 text-center text-amber-600">{totals.below55}</td>
                        <td className="px-2 py-2 text-center text-blue-600">{totals.below85}</td>
                        <td className="px-2 py-2 text-center text-gray-500">{totals.below100}</td>
                      </tr>
                    </tfoot>
                  </table>
                );
              })()}
            </div>
          </div>

          {/* ======== ROW 6: EXAM COMPARE (50%) + AI INSIGHTS (50%) ======== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Exam Comparison */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-violet-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Exam Comparison</h3>
              </div>
              {(() => {
                const compData = schoolAnalysis?.examComparison || [];
                if (compData.length === 0) return <div className="h-full flex items-center justify-center text-gray-300 text-[11px] font-bold uppercase">No comparison data</div>;
                return (
                  <>
                    <div className="flex-1 min-h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={compData} margin={{ top: 16, right: 8, left: -20, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="examName" tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700 }} />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                          <Bar dataKey="passPct" name="Pass %" fill="#6366f1" radius={[3, 3, 0, 0]}>
                            <LabelList dataKey="passPct" position="top" style={{ fontSize: 9, fontWeight: 800 }} />
                          </Bar>
                          <Bar dataKey="fullAPlus" name="Full A+" fill="#f59e0b" radius={[3, 3, 0, 0]}>
                            <LabelList dataKey="fullAPlus" position="top" style={{ fontSize: 9, fontWeight: 800 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-[11px]">
                        <thead><tr className="border-b border-gray-100 dark:border-[#30363d]">
                          <th className="px-2 py-2 text-left font-black text-gray-400 uppercase text-[9px]">Exam</th>
                          <th className="px-2 py-2 text-center font-black text-gray-400 uppercase text-[9px]">Appeared</th>
                          <th className="px-2 py-2 text-center font-black text-gray-400 uppercase text-[9px]">Pass%</th>
                          <th className="px-2 py-2 text-center font-black text-gray-400 uppercase text-[9px]">A+</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-[#30363d]">
                          {compData.map((ex: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#1a1f26]">
                        <td className="px-2 py-1.5 font-bold text-gray-900 dark:text-white">{ex.examName}</td>
                        <td className="px-2 py-1.5 text-center font-mono">{ex.appeared}</td>
                        <td className={`px-2 py-1.5 text-center font-black ${ex.passPct >= 80 ? 'text-emerald-600' : ex.passPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{ex.passPct}%</td>
                        <td className="px-2 py-1.5 text-center font-black text-amber-600">{ex.fullAPlus}</td>
                      </tr>
                    ))}
                  </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* AI Insights & Suggestions */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={16} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">AI Insights & Recommendations</h3>
              </div>
              <div className="space-y-2.5">
                {(schoolAnalysis?.belowAvg ?? 0) > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1"><AlertTriangle size={12} className="text-red-500" /><span className="text-[11px] font-black text-red-700 dark:text-red-400 uppercase">Risk Alert</span></div>
                    <p className="text-[11px] font-medium text-red-900/70 dark:text-red-200/60">{schoolAnalysis.belowAvg} students are below 30% average. Assign dedicated remedial sessions and track weekly progress.</p>
                  </div>
                )}
                {(schoolAnalysis?.fullFail ?? 0) > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1"><XCircle size={12} className="text-amber-500" /><span className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase">Action Required</span></div>
                    <p className="text-[11px] font-medium text-amber-900/70 dark:text-amber-200/60">{schoolAnalysis.fullFail} students have failed. Identify weak subjects from the analysis table and provide focused coaching.</p>
                  </div>
                )}
                {(schoolAnalysis?.profoundLevel ?? 0) > (schoolAnalysis?.totalStudents ?? 1) * 0.3 && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1"><Sparkles size={12} className="text-emerald-500" /><span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase">Excellent</span></div>
                    <p className="text-[11px] font-medium text-emerald-900/70 dark:text-emerald-200/60">Over 30% students are in the profound category (75%+). Keep the momentum — consider enrichment programs for advanced learners.</p>
                  </div>
                )}
                {(schoolAnalysis?.fullAPlus ?? 0) > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1"><Award size={12} className="text-amber-500" /><span className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase">Achievement</span></div>
                    <p className="text-[11px] font-medium text-amber-900/70 dark:text-amber-200/60">{schoolAnalysis.fullAPlus} student(s) achieved Full A+ across all subjects — outstanding academic excellence!</p>
                  </div>
                )}
                {(schoolAnalysis?.fullAbsent ?? 0) > 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1"><Eye size={12} className="text-gray-500" /><span className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase">Attendance</span></div>
                    <p className="text-[11px] font-medium text-gray-600/70 dark:text-gray-300/60">{schoolAnalysis.fullAbsent} student(s) were absent. Ensure proper follow-up for missed exams.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </>
      ) : (
        <>
          {/* ======== ROW 1: COMBINED SUBMISSIONS + ENTRY RATE + PASS RATE GAUGE ======== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Combined Submissions Card */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl overflow-hidden hover:shadow-md transition-all duration-300">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList size={16} className="text-indigo-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Submission Status</h3>
                </div>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{totalSchools} Total Schools</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-[#30363d]">
                <div onClick={() => setIsConfirmedModalOpen(true)} className="p-4 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-colors group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Confirmed</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-300">{confirmedSchoolsCount}</div>
                  <p className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-500/60 mt-1 uppercase">Locked & finalized &bull; Click to view</p>
                </div>
                <div onClick={() => setIsPendingModalOpen(true)} className="p-4 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition-colors group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertTriangle size={16} className="text-amber-600" />
                    </div>
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending</span>
                  </div>
                  <div className="text-2xl font-black text-amber-900 dark:text-amber-300">{pendingSchoolsCount}</div>
                  <p className="text-[9px] font-bold text-amber-600/70 dark:text-amber-500/60 mt-1 uppercase">Currently editing &bull; Click to view</p>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 dark:bg-[#1a1f26]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Completion</span>
                  <span className="text-[10px] font-black text-gray-600 dark:text-gray-300">{confirmedPct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${confirmedPct}%` }} />
                </div>
              </div>
            </div>

            {/* Overall Entry Rate Gauge */}
            <div 
              className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4 cursor-pointer hover:shadow-lg hover:border-cyan-200 dark:hover:border-cyan-800 transition-all group relative"
              onClick={() => setIsEagleViewModalOpen(true)}
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-black uppercase text-cyan-600 bg-cyan-50 px-2 py-1 rounded">Eagle View</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-cyan-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Overall Entry Rate</h3>
                <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Enter: {(data?.totalStudents - (data?.notEntered || 0) || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-center">
                <svg viewBox="0 0 200 120" className="w-full max-w-[220px]">
                  <defs>
                    <linearGradient id="entryGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
                  {(() => {
                    const total = data?.totalStudents || 0;
                    const notEntered = data?.notEntered || 0;
                    const entered = total - notEntered;
                    const pct = total > 0 ? Math.round((entered / total) * 100) : 0;
                    const angle = (pct / 100) * 180;
                    const rad = (angle - 180) * (Math.PI / 180);
                    const x = 100 + 80 * Math.cos(rad);
                    const y = 100 + 80 * Math.sin(rad);
                    return <path d={`M 20 100 A 80 80 0 0 1 ${x} ${y}`} fill="none" stroke="url(#entryGaugeGrad)" strokeWidth="12" strokeLinecap="round" />;
                  })()}
                  <text x="100" y="80" textAnchor="middle" className="fill-gray-900 dark:fill-white" style={{ fontSize: 30, fontWeight: 900 }}>
                    {(() => {
                      const total = data?.totalStudents || 0;
                      const notEntered = data?.notEntered || 0;
                      return total > 0 ? Math.round(((total - notEntered) / total) * 100) : 0;
                    })()}%
                  </text>
                  <text x="100" y="100" textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Entry Rate
                  </text>
                </svg>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-[#30363d]">
                <div className="text-center">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Total Students</div>
                  <div className="text-sm font-black text-blue-600">{(data?.totalStudents || 0).toLocaleString()}</div>
                </div>
                <div className="text-center border-x border-gray-100 dark:border-[#30363d]">
                  <div className="text-[9px] font-black text-cyan-500 uppercase tracking-wider">Enter Marks</div>
                  <div className="text-sm font-black text-cyan-600">{((data?.totalStudents || 0) - (data?.notEntered || 0)).toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-black text-red-500 uppercase tracking-wider">Not Enter Marks</div>
                  <div className="text-sm font-black text-red-600">{(data?.notEntered || 0).toLocaleString()}</div>
                </div>
              </div>
              {(() => {
                const total = data?.totalStudents || 0;
                const notEntered = data?.notEntered || 0;
                const entered = total - notEntered;
                const appeared = data?.appeared || 0;
                const absent = data?.absent || 0;
                if (entered + notEntered !== total) {
                  return (
                    <div className="mt-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">Entry Count Mismatch</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Pass Rate Gauge */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-violet-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Overall Pass Rate</h3>
                <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Full A+: {(data?.fullAPlus || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-center">
                <svg viewBox="0 0 200 120" className="w-full max-w-[220px]">
                  <defs>
                    <linearGradient id="adminGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
                  {(() => {
                    const pct = data?.appeared > 0 ? Math.round(((data?.pass || 0) / data.appeared) * 100) : 0;
                    const angle = (pct / 100) * 180;
                    const rad = (angle - 180) * (Math.PI / 180);
                    const x = 100 + 80 * Math.cos(rad);
                    const y = 100 + 80 * Math.sin(rad);
                    return <path d={`M 20 100 A 80 80 0 0 1 ${x} ${y}`} fill="none" stroke="url(#adminGaugeGrad)" strokeWidth="12" strokeLinecap="round" />;
                  })()}
                  <text x="100" y="80" textAnchor="middle" className="fill-gray-900 dark:fill-white" style={{ fontSize: 30, fontWeight: 900 }}>
                    {data?.appeared > 0 ? Math.round(((data?.pass || 0) / data.appeared) * 100) : 0}%
                  </text>
                  <text x="100" y="100" textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Pass Rate
                  </text>
                </svg>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-[#30363d]">
                <div className="text-center">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Appeared</div>
                  <div className="text-sm font-black text-blue-600">{(data?.appeared || 0).toLocaleString()}</div>
                </div>
                <div className="text-center border-x border-gray-100 dark:border-[#30363d]">
                  <div className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Passed</div>
                  <div className="text-sm font-black text-emerald-600">{(data?.pass || 0).toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-black text-red-500 uppercase tracking-wider">Failed</div>
                  <div className="text-sm font-black text-red-600">{(data?.fail || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ======== ROW 2: REDESIGNED COUNT CARDS (50% / 50% SPLIT) ======== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* LEFT CONTAINER: General Statistics (50%) */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-[#30363d]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    General Statistics
                  </h3>
                </div>
                <span className="text-[10px] font-extrabold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                  Master Data
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  { 
                    label: 'Total Schools', 
                    value: totalSchools.toLocaleString(), 
                    color: 'text-purple-600 dark:text-purple-400', 
                    bg: 'bg-purple-50 dark:bg-purple-950/20', 
                    border: 'border-purple-100 dark:border-purple-800', 
                    icon: <SchoolIcon size={14} className="text-purple-500" />, 
                    clickable: true, 
                    onClick: () => setIsSchoolListModalOpen(true) 
                  },
                  { 
                    label: 'Total Students', 
                    value: (data?.totalStudents || 0).toLocaleString(), 
                    color: 'text-indigo-600 dark:text-indigo-400', 
                    bg: 'bg-indigo-50 dark:bg-indigo-950/20', 
                    border: 'border-indigo-100 dark:border-indigo-800', 
                    icon: <Users size={14} className="text-indigo-500" />, 
                    clickable: true, 
                    onClick: () => setIsDistrictStudentsModalOpen(true) 
                  },
                  { 
                    label: 'Male Students', 
                    value: (data?.maleCount || 0).toLocaleString(), 
                    color: 'text-blue-600 dark:text-blue-400', 
                    bg: 'bg-blue-50 dark:bg-blue-950/20', 
                    border: 'border-blue-100 dark:border-blue-800', 
                    icon: <Users size={14} className="text-blue-500" /> 
                  },
                  { 
                    label: 'Female Students', 
                    value: (data?.femaleCount || 0).toLocaleString(), 
                    color: 'text-pink-600 dark:text-pink-400', 
                    bg: 'bg-pink-50 dark:bg-pink-950/20', 
                    border: 'border-pink-100 dark:border-pink-800', 
                    icon: <Users size={14} className="text-pink-500" /> 
                  },
                  { 
                    label: 'Scribe Students', 
                    value: (data?.scribeCount ? data.scribeCount.toLocaleString() : '--'), 
                    color: 'text-violet-600 dark:text-violet-400', 
                    bg: 'bg-violet-50 dark:bg-violet-950/20', 
                    border: 'border-violet-100 dark:border-violet-800', 
                    icon: <FileText size={14} className="text-violet-500" /> 
                  },
                  { 
                    label: 'Condonation', 
                    value: '--', 
                    color: 'text-amber-600 dark:text-amber-400', 
                    bg: 'bg-amber-50 dark:bg-amber-950/20', 
                    border: 'border-amber-100 dark:border-amber-800', 
                    icon: <Award size={14} className="text-amber-500" /> 
                  },
                ].map((c, i) => (
                  <div 
                    key={i} 
                    onClick={c.onClick}
                    className={`${c.bg} border ${c.border} rounded-xl p-3 hover:shadow-md transition-all duration-300 ${c.clickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {c.icon}
                      <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-none truncate">
                        {c.label}
                      </span>
                    </div>
                    <div className={`text-base sm:text-lg font-black ${c.color} leading-none`}>
                      {c.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT CONTAINER: Exam Statistics (50%) */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-[#30363d]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    Exam Statistics
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md truncate max-w-[180px]">
                    {selectedExam?.name || 'Selected Test'}
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshExamStats}
                    disabled={isRefreshingExamStats}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all cursor-pointer disabled:opacity-50"
                    title="Refresh & Recalculate Exam Statistics"
                  >
                    <RefreshCw size={13} className={isRefreshingExamStats ? 'animate-spin text-emerald-500' : ''} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  { 
                    label: 'Schools Submitted', 
                    value: (data?.confirmedSchoolsCount || 0).toLocaleString(), 
                    color: 'text-emerald-600 dark:text-emerald-400', 
                    bg: 'bg-emerald-50 dark:bg-emerald-950/20', 
                    border: 'border-emerald-100 dark:border-emerald-800', 
                    icon: <CheckCircle2 size={14} className="text-emerald-500" /> 
                  },
                  { 
                    label: 'Total Students', 
                    value: (data?.totalStudents || 0).toLocaleString(), 
                    color: 'text-indigo-600 dark:text-indigo-400', 
                    bg: 'bg-indigo-50 dark:bg-indigo-950/20', 
                    border: 'border-indigo-100 dark:border-indigo-800', 
                    icon: <Users size={14} className="text-indigo-500" /> 
                  },
                  { 
                    label: 'Appeared', 
                    value: (data?.appeared || 0).toLocaleString(), 
                    color: 'text-blue-600 dark:text-blue-400', 
                    bg: 'bg-blue-50 dark:bg-blue-950/20', 
                    border: 'border-blue-100 dark:border-blue-800', 
                    icon: <Eye size={14} className="text-blue-500" /> 
                  },
                  { 
                    label: 'Absent', 
                    value: (data?.absent || 0).toLocaleString(), 
                    color: 'text-orange-600 dark:text-orange-400', 
                    bg: 'bg-orange-50 dark:bg-orange-950/20', 
                    border: 'border-orange-100 dark:border-orange-800', 
                    icon: <AlertTriangle size={14} className="text-orange-500" /> 
                  },
                  { 
                    label: 'Passed', 
                    value: (data?.pass || 0).toLocaleString(), 
                    color: 'text-emerald-600 dark:text-emerald-400', 
                    bg: 'bg-emerald-50 dark:bg-emerald-950/20', 
                    border: 'border-emerald-100 dark:border-emerald-800', 
                    icon: <CheckCircle2 size={14} className="text-emerald-500" /> 
                  },
                  { 
                    label: 'Failed', 
                    value: (data?.fail || 0).toLocaleString(), 
                    color: 'text-red-600 dark:text-red-400', 
                    bg: 'bg-red-50 dark:bg-red-950/20', 
                    border: 'border-red-100 dark:border-red-800', 
                    icon: <XCircle size={14} className="text-red-500" /> 
                  },
                ].map((c, i) => (
                  <div 
                    key={i} 
                    className={`${c.bg} border ${c.border} rounded-xl p-3 hover:shadow-md transition-all duration-300`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {c.icon}
                      <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-none truncate">
                        {c.label}
                      </span>
                    </div>
                    <div className={`text-base sm:text-lg font-black ${c.color} leading-none`}>
                      {c.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}

      {/* ======== ADMIN: FIRST LANGUAGES (P01 - P04) DISTRIBUTION ======== */}
      {user?.role !== 'SCHOOL' && !selectedSchoolId && subjectCounts?.firstLanguages && (
        <div className="animate-in slide-in-from-bottom duration-500 delay-50">
          <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl overflow-hidden mb-5 shadow-xs">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-cyan-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                  First Language & Paper Distribution (P01 - P04)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                {(subjectCounts.totalStudents || 0).toLocaleString()} Total Enrolled
              </span>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {(subjectCounts.firstLanguages || []).map((langGroup: any, gIdx: number) => {
                  const slotColors = [
                    { bar: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50/60 dark:bg-cyan-950/20', border: 'border-cyan-100 dark:border-cyan-800' },
                    { bar: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50/60 dark:bg-violet-950/20', border: 'border-violet-100 dark:border-violet-800' },
                    { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/60 dark:bg-emerald-950/20', border: 'border-emerald-100 dark:border-emerald-800' },
                    { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/60 dark:bg-amber-950/20', border: 'border-amber-100 dark:border-amber-800' },
                  ];
                  const col = slotColors[gIdx % slotColors.length];
                  const totalInSlot = langGroup.data.reduce((s: number, d: any) => s + d.count, 0);

                  return (
                    <div key={langGroup.code} className={`${col.bg} border ${col.border} rounded-xl p-3.5`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] font-black ${col.text} uppercase tracking-wider`}>{langGroup.code}</span>
                        <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 bg-white dark:bg-[#161b22] px-2 py-0.5 rounded-full shadow-2xs">
                          {totalInSlot.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 mb-3 uppercase tracking-tight">{langGroup.label}</p>
                      <div className="space-y-2">
                        {langGroup.data.slice(0, 5).map((lang: any, i: number) => {
                          const pct = totalInSlot > 0 ? Math.round((lang.count / totalInSlot) * 100) : 0;
                          return (
                            <div key={i} className="bg-white/80 dark:bg-[#161b22]/80 p-2 rounded-lg border border-gray-100 dark:border-[#30363d]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-extrabold text-gray-800 dark:text-gray-200 truncate max-w-[70%]">{lang._id}</span>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="text-blue-600 dark:text-blue-400 font-bold" title="Boys">M:{lang.male || 0}</span>
                                  <span className="text-gray-300 dark:text-gray-600">|</span>
                                  <span className="text-rose-600 dark:text-rose-400 font-bold" title="Girls">F:{lang.female || 0}</span>
                                  <span className="text-gray-300 dark:text-gray-600">|</span>
                                  <span className="text-gray-900 dark:text-white font-black">{lang.count.toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-gray-100 dark:bg-[#30363d] rounded-full overflow-hidden">
                                <div className={`h-full ${col.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {langGroup.data.length > 5 && (
                          <div className="text-[9px] font-bold text-gray-400 text-center pt-1">+{langGroup.data.length - 5} more languages</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======== ADMIN: MEDIUM-WISE INDIVIDUAL CARDS WITH UNIQUE SUBJECTS ======== */}
      {user?.role !== 'SCHOOL' && !selectedSchoolId && (
        <div className="animate-in slide-in-from-bottom duration-500 delay-75">
          {isSubjectCountsLoading ? (
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-2xl p-8 mb-6 shadow-xs">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="relative flex items-center justify-center mb-4">
                  <div className="w-14 h-14 rounded-full border-4 border-indigo-100 dark:border-indigo-950 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
                  <div className="absolute w-7 h-7 rounded-full bg-indigo-500/20 dark:bg-indigo-400/20 animate-ping" />
                  <GraduationCap className="absolute text-indigo-600 dark:text-indigo-400" size={22} />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  Loading Medium-wise Subject Data...
                </h4>
                <p className="text-[10px] font-bold text-gray-400 max-w-xs">
                  Fetching enrollment statistics for English, Malayalam, and Tamil Mediums...
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mt-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-slate-50 dark:bg-[#1a1f26] p-4 rounded-xl border border-gray-100 dark:border-[#30363d] animate-pulse space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
                        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      </div>
                      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
                      <div className="space-y-1.5 pt-2">
                        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : subjectCounts?.mediumCounts && subjectCounts.mediumCounts.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectCounts.mediumCounts.map((med: any) => {
                  const mediumStyles: Record<string, { gradient: string; accent: string; ring: string; badgeBg: string }> = {
                    EM: { gradient: 'from-blue-50/80 to-cyan-50/40 dark:from-blue-950/30 dark:to-cyan-950/10', accent: 'text-blue-600 dark:text-blue-400', ring: 'border-blue-200 dark:border-blue-800', badgeBg: 'bg-blue-500 text-white' },
                    MM: { gradient: 'from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/10', accent: 'text-emerald-600 dark:text-emerald-400', ring: 'border-emerald-200 dark:border-emerald-800', badgeBg: 'bg-emerald-500 text-white' },
                    TM: { gradient: 'from-orange-50/80 to-amber-50/40 dark:from-orange-950/30 dark:to-amber-950/10', accent: 'text-orange-600 dark:text-orange-400', ring: 'border-orange-200 dark:border-orange-800', badgeBg: 'bg-orange-500 text-white' },
                  };
                  const st = mediumStyles[med.code] || { gradient: 'from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/10', accent: 'text-gray-600', ring: 'border-gray-200 dark:border-[#30363d]', badgeBg: 'bg-gray-600 text-white' };

                  const allSubjects = med.subjects || [];
                  const displayedSubjects = isAllMediumsExpanded ? allSubjects : allSubjects.slice(0, 5);
                  const remainingCount = allSubjects.length - 5;

                  return (
                    <div key={med.code} className={`bg-gradient-to-br ${st.gradient} border ${st.ring} rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between`}>
                      {/* Card Header */}
                      <div className="p-3.5 border-b border-gray-100/80 dark:border-[#30363d]">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${st.badgeBg}`}>
                              {med.code}
                            </span>
                            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">
                              {med.name}
                            </h4>
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-[#161b22]/80 px-2 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700 shrink-0">
                            {med.total.toLocaleString()} Students
                          </span>
                        </div>

                        {/* Gender Breakdown Row */}
                        <div className="flex items-center justify-between text-[11px] bg-white/60 dark:bg-[#161b22]/60 px-3 py-1 rounded-lg border border-gray-100/80 dark:border-[#30363d]">
                          <span className="text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1">
                            Boys : <span className="font-black">{med.male.toLocaleString()}</span>
                          </span>
                          <span className="text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1">
                            Girls : <span className="font-black">{med.female.toLocaleString()}</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Body - Subject Table */}
                      <div className="p-3 flex-1 overflow-hidden">
                        {displayedSubjects.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border border-gray-200/60 dark:border-[#30363d] bg-white/70 dark:bg-[#161b22]/70 shadow-2xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-gray-100/70 dark:bg-gray-800/60 border-b border-gray-200/60 dark:border-[#30363d] text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                  <th className="py-2 px-2.5 w-14 text-center">Code</th>
                                  <th className="py-2 px-2.5">Subject</th>
                                  <th className="py-2 px-2.5 text-right w-16">Male</th>
                                  <th className="py-2 px-2.5 text-right w-16">Female</th>
                                  <th className="py-2 px-2.5 text-right w-20">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                {displayedSubjects.map((subItem: any, idx: number) => (
                                  <tr 
                                    key={subItem.pCode + subItem.subjectName + idx} 
                                    className="hover:bg-white/90 dark:hover:bg-gray-800/50 transition-colors h-9"
                                  >
                                    <td className="py-1.5 px-2.5 text-center">
                                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                                        {subItem.pCode}
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-2.5 font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[160px]" title={subItem.subjectName}>
                                      {subItem.subjectName}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-bold text-blue-600 dark:text-blue-400">
                                      {subItem.male.toLocaleString()}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
                                      {subItem.female.toLocaleString()}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-extrabold text-gray-900 dark:text-white">
                                      {subItem.total.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[11px] font-medium text-gray-400 py-3 text-center">No subjects recorded for this medium.</p>
                        )}
                      </div>

                      {/* Card Footer - Expandable More Toggle */}
                      {allSubjects.length > 5 && (
                        <div className="p-2.5 bg-white/40 dark:bg-[#161b22]/40 border-t border-gray-100/60 dark:border-[#30363d] text-center">
                          <button
                            type="button"
                            onClick={() => setIsAllMediumsExpanded(!isAllMediumsExpanded)}
                            className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors uppercase tracking-wider cursor-pointer"
                          >
                            {isAllMediumsExpanded ? (
                              <>
                                <ChevronUp size={14} /> ▲ Show Less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} /> ▼ +{remainingCount} More Subjects (Expand All)
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== ADMIN: SCHOOL TYPE COUNTS ======== */}
      {user?.role !== 'SCHOOL' && !selectedSchoolId && (
        <div className="animate-in slide-in-from-bottom duration-500 delay-100">
          {isSchoolTypeLoading ? (
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-8">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  Loading School Type Counts...
                </div>
              </div>
            </div>
          ) : schoolTypeCounts && (
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SchoolIcon size={16} className="text-violet-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">School Type Distribution</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-400">{(schoolTypeCounts.totalSchools || 0).toLocaleString()} Schools</span>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{(schoolTypeCounts.totalStudents || 0).toLocaleString()} Students</span>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['Government', 'Aided', 'Unaided'] as const).map((type) => {
                    const typeData = schoolTypeCounts.schoolTypes?.[type] || { male: 0, female: 0, total: 0, schools: 0 };
                    const totalAll = schoolTypeCounts.totalStudents || 1;
                    const typePct = Math.round((typeData.total / totalAll) * 100);
                    const typeStyles: Record<string, { gradient: string; iconBg: string; iconText: string; border: string; maleBar: string; femaleBar: string }> = {
                      Government: { gradient: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/10', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconText: 'text-blue-600', border: 'border-blue-200 dark:border-blue-800', maleBar: 'bg-blue-500', femaleBar: 'bg-pink-500' },
                      Aided: { gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconText: 'text-emerald-600', border: 'border-emerald-200 dark:border-emerald-800', maleBar: 'bg-emerald-500', femaleBar: 'bg-rose-500' },
                      Unaided: { gradient: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconText: 'text-amber-600', border: 'border-amber-200 dark:border-amber-800', maleBar: 'bg-amber-500', femaleBar: 'bg-fuchsia-500' },
                    };
                    const st = typeStyles[type];

                    return (
                      <div key={type} className={`bg-gradient-to-br ${st.gradient} border ${st.border} rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between`}>
                        {/* Header: Icon + Type Name + % of Total Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 ${st.iconBg} rounded-xl flex items-center justify-center`}>
                              <SchoolIcon size={16} className={st.iconText} />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">{type}</h4>
                          </div>
                          <span className={`text-[10px] font-black ${st.iconText} bg-white/80 dark:bg-[#161b22]/80 px-2 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700`}>
                            {typePct}% of Total
                          </span>
                        </div>

                        {/* Primary Stat Block: Prominent School Count & Total Students */}
                        <div className="grid grid-cols-2 gap-2 mb-3 bg-white/60 dark:bg-[#161b22]/60 p-3 rounded-xl border border-gray-100/80 dark:border-[#30363d]">
                          <div>
                            <div className={`text-2xl sm:text-3xl font-black ${st.iconText} leading-none`}>
                              {typeData.schools.toLocaleString()}
                            </div>
                            <div className="text-[9px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">
                              Schools
                            </div>
                          </div>
                          <div className="border-l border-gray-200/60 dark:border-[#30363d] pl-3">
                            <div className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-none">
                              {typeData.total.toLocaleString()}
                            </div>
                            <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mt-1 truncate">
                              Total Students
                            </div>
                          </div>
                        </div>

                        {/* Gender Split Progress Bars */}
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Male</span>
                              </div>
                              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{typeData.male.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-white dark:bg-[#161b22] rounded-full overflow-hidden">
                              <div className={`h-full ${st.maleBar} rounded-full transition-all duration-700`} style={{ width: `${typeData.total > 0 ? (typeData.male / typeData.total) * 100 : 0}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-pink-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Female</span>
                              </div>
                              <span className="text-[10px] font-black text-pink-600 dark:text-pink-400">{typeData.female.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-white dark:bg-[#161b22] rounded-full overflow-hidden">
                              <div className={`h-full ${st.femaleBar} rounded-full transition-all duration-700`} style={{ width: `${typeData.total > 0 ? (typeData.female / typeData.total) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Footer: M:F Ratio */}
                        <div className="mt-3 pt-2.5 border-t border-white/50 dark:border-white/5 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-gray-400">M:F Ratio</span>
                          <span className="text-[10px] font-black text-gray-700 dark:text-gray-300">
                            {typeData.female > 0 ? `${(typeData.male / typeData.female).toFixed(2)}` : typeData.male > 0 ? 'All M' : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== ADMIN: DISTRICT BREAKDOWN ======== */}
      {user?.role !== 'SCHOOL' && data.chartData && data.chartData.length > 0 && (
        <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl overflow-hidden animate-in slide-in-from-bottom duration-500 delay-100">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} className="text-indigo-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">{data.detailLabel || 'District Breakdown'}</h3>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{data.chartData.length} regions</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Click to drill down</span>
          </div>

          {/* Summary Bar */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-[#1a1f26] border-b border-gray-100 dark:border-[#30363d] flex items-center gap-4 overflow-x-auto">
            {(() => {
              const totalAppeared = data.chartData.reduce((s: number, d: any) => s + (d.appeared || 0), 0);
              const totalPassed = data.chartData.reduce((s: number, d: any) => s + (d.pass || 0), 0);
              const totalSchools = data.chartData.reduce((s: number, d: any) => s + (d.totalCount || 0), 0);
              const totalStudentsAll = data.chartData.reduce((s: number, d: any) => s + (d.totalStudents || 0), 0);
              const totalConfirmed = data.chartData.reduce((s: number, d: any) => s + (d.confirmedCount || 0), 0);
              const overallPct = totalAppeared > 0 ? Math.round((totalPassed / totalAppeared) * 100) : 0;
              const summaryItems = [
                { label: 'Total Students', value: totalStudentsAll.toLocaleString(), color: 'text-blue-600' },
                { label: 'Total Schools', value: totalSchools.toLocaleString(), color: 'text-purple-600' },
                { label: 'Appeared', value: totalAppeared.toLocaleString(), color: 'text-blue-600' },
                { label: 'Passed', value: totalPassed.toLocaleString(), color: 'text-emerald-600' },
                { label: 'Pass Rate', value: `${overallPct}%`, color: overallPct >= 80 ? 'text-emerald-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-600' },
                { label: 'Confirmed', value: `${totalConfirmed}/${totalSchools}`, color: 'text-indigo-600' },
              ];
              return summaryItems.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">{item.label}</span>
                  <span className={`text-[11px] font-black ${item.color}`}>{item.value}</span>
                  {i < summaryItems.length - 1 && <span className="text-gray-200 dark:text-gray-700 ml-2">|</span>}
                </div>
              ));
            })()}
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.chartData.map((item: any, idx: number) => {
                const passPct = item.appeared > 0 ? Math.round((item.pass / item.appeared) * 100) : 0;
                const failPct = item.appeared > 0 ? Math.round(((item.appeared - (item.pass || 0)) / item.appeared) * 100) : 0;
                const confirmedPctItem = item.totalCount > 0 ? Math.round((item.confirmedCount / item.totalCount) * 100) : 0;
                const animDelay = idx * 150;
                const accentColor = passPct >= 80 ? '#22c55e' : passPct >= 50 ? '#f59e0b' : '#ef4444';
                const bgAccent = passPct >= 80 ? 'emerald' : passPct >= 50 ? 'amber' : 'red';

                // Donut chart data
                const donutData = item.appeared > 0 ? [
                  { name: 'Passed', value: item.pass || 0, color: '#22c55e' },
                  { name: 'Failed', value: Math.max(0, (item.appeared || 0) - (item.pass || 0)), color: '#ef4444' },
                ] : [];

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => handleBarClick(item)}
                    className="group relative p-5 rounded-2xl border border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] cursor-pointer transition-all duration-500 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/20 active:scale-[0.97] hover:-translate-y-1"
                    style={{ animationDelay: `${animDelay}ms` }}
                  >
                    {/* Animated background glow on hover */}
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${passPct >= 80 ? 'from-emerald-50/0 to-emerald-100/0 group-hover:from-emerald-50 group-hover:to-emerald-100/50' : passPct >= 50 ? 'from-amber-50/0 to-amber-100/0 group-hover:from-amber-50 group-hover:to-amber-100/50' : 'from-red-50/0 to-red-100/0 group-hover:from-red-50 group-hover:to-red-100/50'} dark:from-transparent dark:to-transparent dark:group-hover:from-transparent dark:group-hover:to-transparent transition-all duration-500`} />

                    <div className="relative">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="min-w-0">
                          <h4 className="font-black text-base text-gray-900 dark:text-white uppercase tracking-tight truncate">{item.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-bold text-gray-400">{item.totalCount || 0} Schools</span>
                            <span className="text-gray-300 dark:text-gray-700">|</span>
                            <span className="text-[9px] font-bold text-blue-500">{(item.totalStudents || 0).toLocaleString()} Students</span>
                            {item.confirmedCount !== undefined && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${confirmedPctItem === 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                                {item.confirmedCount}/{item.totalCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all duration-300 shrink-0 mt-1" />
                      </div>

                      {/* Donut + Percentage */}
                      <div className="flex items-center gap-4 mb-4">
                        {/* Animated Donut Chart */}
                        <div className="relative w-[80px] h-[80px] shrink-0">
                          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                            <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="8" className="dark:stroke-gray-800" />
                            {item.appeared > 0 && donutData.map((seg: any, si: number) => {
                              const circumference = 2 * Math.PI * 32;
                              const pct = (seg.value / item.appeared) * 100;
                              const offset = donutData.slice(0, si).reduce((s: number, d: any) => s + (d.value / item.appeared) * circumference, 0);
                              const dashLen = (pct / 100) * circumference;
                              return (
                                <circle
                                  key={si}
                                  cx="40" cy="40" r="32"
                                  fill="none"
                                  stroke={seg.color}
                                  strokeWidth="8"
                                  strokeLinecap="round"
                                  strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                                  strokeDashoffset={-offset}
                                />
                              );
                            })}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-lg font-black text-gray-900 dark:text-white leading-none`}>{passPct}%</span>
                            <span className="text-[7px] font-bold text-gray-400 uppercase mt-0.5">Pass</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Total Students</span>
                            </div>
                            <span className="text-xs font-black text-purple-600 dark:text-purple-400">{(item.totalStudents || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Appeared</span>
                            </div>
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400">{(item.appeared || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Passed</span>
                            </div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{(item.pass || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Full A+</span>
                            </div>
                            <span className="text-xs font-black text-amber-600 dark:text-amber-400">{(item.fullAPlus || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pass/Fail Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.max(passPct, 2)}%`, transition: 'width 1s ease' }} />
                            <span className="text-[8px] font-black text-emerald-600">{passPct}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-red-600">{failPct}%</span>
                            <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${Math.max(failPct, 2)}%`, transition: 'width 1s ease' }} />
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-1000 ease-out" style={{ width: `${passPct}%`, transitionDelay: `${animDelay + 200}ms` }} />
                          <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-r-full transition-all duration-1000 ease-out" style={{ width: `${failPct}%`, transitionDelay: `${animDelay + 400}ms` }} />
                        </div>
                      </div>

                      {/* Confirmation Progress */}
                      {item.confirmedCount !== undefined && item.totalCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Confirmation</span>
                            <span className="text-[9px] font-black text-gray-500">{confirmedPctItem}%</span>
                          </div>
                          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700" style={{ width: `${confirmedPctItem}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======== ADMIN: REGION ANALYTICS SUMMARY ======== */}
      {user?.role !== 'SCHOOL' && !selectedSchoolId && !selectedEduId &&
       (!selectedDistrict || selectedDistrict === 'ALL') && regionAnalytics && regionAnalytics.regions && (
        <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl overflow-hidden animate-in slide-in-from-bottom duration-500 delay-150">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map size={16} className="text-violet-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Region Analytics Summary</h3>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{regionAnalytics.regions.length} regions</span>
            </div>
            <div className="flex items-center gap-2">
              {regionAnalytics.lastUpdated && (
                <span className="text-[9px] font-bold text-gray-400">Updated: {new Date(regionAnalytics.lastUpdated).toLocaleTimeString()}</span>
              )}
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
              </span>
            </div>
          </div>

          {isRegionLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-gray-400">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading Region Analytics...
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regionAnalytics.regions.map((region: any, idx: number) => {
                  const r = region;
                  const h = r.header;
                  const ss = r.studentStrength;
                  const ep = r.examParticipation;
                  const ra = r.resultAnalysis;
                  const ga = r.gradeAnalysis;
                  const pc = r.performanceClassification;
                  const mes = r.marksEntryStatus;
                  const sub = r.schoolSubmission;
                  const qi = r.qualityIndicators;
                  const ri = r.riskIndicators;
                  const ca = r.comparativeAnalytics;
                  const ti = r.trendIndicators;
                  const vr = r.validationRules;

                  const circumference = 2 * Math.PI * 24;
                  const animDelay = idx * 150;
                  const passColor = ra.overallPassPct >= 80 ? '#22c55e' : ra.overallPassPct >= 50 ? '#f59e0b' : '#ef4444';

                  return (
                    <div
                      key={h.name || idx}
                      className="group relative p-5 rounded-2xl border border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] transition-all duration-500 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/20"
                      style={{ animationDelay: `${animDelay}ms` }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <h4 className="font-black text-base text-gray-900 dark:text-white uppercase tracking-tight">{h.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-bold text-gray-400">{h.totalSchools} Schools</span>
                            <span className="text-gray-300 dark:text-gray-700">|</span>
                            <span className="text-[9px] font-bold text-blue-500">{ss.totalStudents.toLocaleString()} Students</span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          pc.color === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                          pc.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                          pc.color === 'violet' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' :
                          pc.color === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }`}>
                          {pc.level}
                        </span>
                      </div>

                      {/* Confirmation Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase">School Submission</span>
                          <span className="text-[9px] font-black text-gray-500">{sub.confirmed}/{h.totalSchools} ({sub.confirmationPct}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700"
                               style={{ width: `${sub.confirmationPct}%` }} />
                          <div className="h-full bg-gray-200 dark:bg-gray-700 rounded-full transition-all duration-700"
                               style={{ width: `${100 - sub.confirmationPct}%` }} />
                        </div>
                      </div>

                      {/* Donut + Pass Rate + Gender Split */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative w-[68px] h-[68px] shrink-0">
                          <svg viewBox="0 0 68 68" className="w-full h-full -rotate-90">
                            <circle cx="34" cy="34" r="24" fill="none" stroke="#f1f5f9" strokeWidth="6" className="dark:stroke-gray-800" />
                            {ra.totalAppeared > 0 && (
                              <circle cx="34" cy="34" r="24" fill="none" stroke={passColor} strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={`${(ra.overallPassPct / 100) * circumference} ${circumference}`} />
                            )}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm font-black text-gray-900 dark:text-white leading-none">{ra.overallPassPct}%</span>
                            <span className="text-[6px] font-bold text-gray-400 uppercase mt-0.5">Pass</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-500">Boys {ra.boyPassPct}%</span>
                            <span className="text-[10px] font-black text-blue-600">{ra.passedBoys.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-pink-500">Girls {ra.girlPassPct}%</span>
                            <span className="text-[10px] font-black text-pink-600">{ra.passedGirls.toLocaleString()}</span>
                          </div>
                          {ti.hasPreviousExam && (
                            <div className="flex items-center gap-1">
                              {ti.passPctDirection === 'up' ? (
                                <ArrowUpRight size={10} className="text-emerald-500" />
                              ) : ti.passPctDirection === 'down' ? (
                                <ArrowDownRight size={10} className="text-red-500" />
                              ) : null}
                              <span className={`text-[9px] font-black ${ti.passPctDirection === 'up' ? 'text-emerald-500' : ti.passPctDirection === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                                {ti.passPctChange > 0 ? '+' : ''}{ti.passPctChange}% vs prev
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Gender Bars */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-bold text-blue-400 w-8">BOYS</span>
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${ra.boyPassPct}%` }} />
                          </div>
                          <span className="text-[9px] font-black text-blue-500 w-12 text-right">{ss.boysPct}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-bold text-pink-400 w-8">GIRLS</span>
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full transition-all duration-700" style={{ width: `${ra.girlPassPct}%` }} />
                          </div>
                          <span className="text-[9px] font-black text-pink-500 w-12 text-right">{ss.girlsPct}%</span>
                        </div>
                      </div>

                      {/* Mini Grade Distribution */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase">Grade Distribution</span>
                          <span className="text-[9px] font-black text-gray-500">{ga.averageGrade}</span>
                        </div>
                        <div className="flex items-end gap-0.5" style={{ height: '24px' }}>
                          {ga.gradeDistributionBar.map((g: any, gi: number) => {
                            const maxPct = Math.max(...ga.gradeDistributionBar.map((x: any) => x.pct), 1);
                            const h = Math.max((g.pct / maxPct) * 100, 4);
                            const gc = g.grade === 'A+' ? '#22c55e' : g.grade === 'A' ? '#34d399' : g.grade === 'B+' ? '#60a5fa' : g.grade === 'B' ? '#818cf8' : g.grade === 'C+' ? '#fbbf24' : g.grade === 'C' ? '#f59e0b' : g.grade === 'D+' ? '#f97316' : g.grade === 'D' ? '#ef4444' : '#9ca3af';
                            return (
                              <div key={gi} className="flex-1 flex flex-col items-center justify-end" title={`${g.grade}: ${g.count} (${g.pct}%)`}>
                                <div className="w-full rounded-sm transition-all duration-500" style={{ height: `${h}%`, backgroundColor: gc, minHeight: '2px' }} />
                                <span className="text-[6px] font-bold text-gray-400 mt-0.5">{g.grade}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Risk + Quality Chips */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {ri.highFailureSchools > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle size={8} />{ri.highFailureSchools} High-Failure
                          </span>
                        )}
                        {ri.schoolsBelow80Pct > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                            <TrendingDown size={8} />{ri.schoolsBelow80Pct} Below 80%
                          </span>
                        )}
                        {ri.notConfirmedSchools > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full">
                            <XCircle size={8} />{ri.notConfirmedSchools} Pending
                          </span>
                        )}
                        {ri.highAbsenteeSchools > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full">
                            <Eye size={8} />{ri.highAbsenteeSchools} High Absent
                          </span>
                        )}
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 size={8} />{mes.entryPct}% Entered
                        </span>
                      </div>

                      {/* Participation + Entry Status */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-gray-50 dark:bg-[#1a1f26] rounded-lg p-2">
                          <div className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Participation</div>
                          <div className="text-sm font-black text-gray-900 dark:text-white">{ep.participationRate}%</div>
                          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ep.participationRate}%` }} />
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#1a1f26] rounded-lg p-2">
                          <div className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Marks Entry</div>
                          <div className="text-sm font-black text-gray-900 dark:text-white">{mes.entryPct}%</div>
                          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${mes.entryPct}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Quality Indicators Mini */}
                      {qi.highestPassSchool && (
                        <div className="mb-3 bg-gray-50 dark:bg-[#1a1f26] rounded-lg p-2">
                          <div className="text-[8px] font-bold text-gray-400 uppercase mb-1">Top School</div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[70%]">{qi.highestPassSchool.name}</span>
                            <span className="text-[9px] font-black text-emerald-600">{qi.highestPassSchool.passPct}%</span>
                          </div>
                        </div>
                      )}

                      {/* Validation Warning */}
                      {vr.warnings.length > 0 && (
                        <div className="mb-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 flex items-center gap-1.5">
                          <AlertTriangle size={10} className="text-amber-500 shrink-0" />
                          <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400">{vr.warnings[0]}</span>
                        </div>
                      )}

                      {/* Comparative + Trend */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {ca.trendDirection === 'above' ? (
                              <ArrowUpRight size={10} className="text-emerald-500" />
                            ) : ca.trendDirection === 'below' ? (
                              <ArrowDownRight size={10} className="text-red-500" />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                            )}
                            <span className="text-[9px] font-bold text-gray-400">vs State:</span>
                            <span className={`text-[9px] font-black ${
                              ca.difference > 0 ? 'text-emerald-600' : ca.difference < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {ca.difference > 0 ? '+' : ''}{ca.difference}%
                            </span>
                          </div>
                          {qi.lowestPassSchool && (
                            <span className="text-[8px] font-bold text-gray-400 truncate max-w-[50%]">
                              Low: {qi.lowestPassSchool.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== ADMIN: GRADE DISTRIBUTION + PERFORMANCE LEVELS ======== */}
      {user?.role !== 'SCHOOL' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-in slide-in-from-bottom duration-500 delay-200">
          {/* Grade Distribution */}
          <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Grade Distribution</h3>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Overall</span>
            </div>
            <div className="min-h-[220px]">
              {(() => {
                const ALL_GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E'];
                const dist = data?.gradeDistribution || {};
                const chartData = ALL_GRADES.map(name => ({ name, victory: Number(dist[name]) || 0 }));
                const COLORS = ['#22c55e','#84cc16','#eab308','#f59e0b','#f97316','#ef4444','#a855f7','#6366f1','#ec4899'];
                const maxVal = Math.max(...chartData.map(d => d.victory), 1);
                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 18, right: 5, left: -20, bottom: 5 }} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#cbd5e1' }} axisLine={false} tickLine={false} domain={[0, maxVal]} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700 }} />
                      <Bar dataKey="victory" radius={[3, 3, 0, 0]} isAnimationActive={true}>
                        {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                        <LabelList dataKey="victory" position="top" style={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>

          {/* Performance Levels */}
          <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={16} className="text-violet-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Performance Levels</h3>
            </div>
            {(() => {
              const total = (data?.totalStudents || data?.appeared || 1);
              const levels = [
                { label: 'Profound', sub: '75%+', count: data?.profoundLevel || 0, color: 'bg-emerald-500', text: 'text-emerald-600' },
                { label: 'Above Average', sub: '50-75%', count: data?.averageLevel || 0, color: 'bg-blue-500', text: 'text-blue-600' },
                { label: 'Basic', sub: '30-50%', count: data?.basicLevel || 0, color: 'bg-amber-500', text: 'text-amber-600' },
                { label: 'Below Basic', sub: '<30%', count: (data?.totalStudents || 0) - (data?.profoundLevel || 0) - (data?.averageLevel || 0) - (data?.basicLevel || 0), color: 'bg-red-500', text: 'text-red-600' },
              ];
              return (
                <div className="space-y-4">
                  {levels.map((l, i) => {
                    const pct = total > 0 ? Math.round((l.count / total) * 100) : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                            <span className="text-[11px] font-bold text-gray-500 uppercase">{l.label}</span>
                            <span className="text-[10px] font-bold text-gray-400">{l.sub}</span>
                          </div>
                          <span className={`text-xs font-black ${l.text}`}>{l.count.toLocaleString()} <span className="text-gray-400 font-bold">({pct}%)</span></span>
                        </div>
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${l.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {/* Quick Insights */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
              {(data?.fullAPlus ?? 0) > 0 && <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600"><Award size={11} />{data.fullAPlus.toLocaleString()} student(s) with Full A+</div>}
              {(data?.fail ?? 0) > 0 && <div className="flex items-center gap-1 text-[10px] font-bold text-red-500"><AlertTriangle size={11} />{data.fail.toLocaleString()} students failed</div>}
              {(data?.absent ?? 0) > 0 && <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500"><Eye size={11} />{data.absent.toLocaleString()} students absent</div>}
            </div>
          </div>
        </div>
      )}

      {/* ======== ADMIN: CHART + TOP PERFORMERS + AI INSIGHTS ======== */}
      {user?.role !== 'SCHOOL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-in slide-in-from-bottom duration-500 delay-300">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">{data.detailLabel || 'District Breakdown'}</h3>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Click bars to drill down</span>
            </div>
            {isMounted && (
              <DashboardChart 
                data={data.chartData}
                isSchoolView={isSchoolView}
                onBarClick={handleBarClick}
              />
            )}
          </div>

          {/* Top Performing Regions + AI Insights */}
          <div className="flex flex-col gap-3">
            {/* Top Performers */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-xl shadow-lg relative overflow-hidden flex-1">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-white/80" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white/90">Top Performing</h3>
                </div>
                <div className="space-y-2">
                  {(data.chartData || []).slice().sort((a: any, b: any) => b.victory - a.victory).slice(0, 5).map((d: any, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => handleBarClick(d)}
                      className="flex items-center justify-between p-2.5 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 bg-white/20 text-[9px] font-black rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-tight truncate">{d.name}</div>
                          <div className="text-[9px] text-white/50 font-bold">{d.fullAPlus || 0} Full A+</div>
                        </div>
                      </div>
                      <div className="text-sm font-black text-emerald-300 shrink-0">{Number(d.victory || 0).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* AI Insights */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Quality Insights</h3>
              </div>
              <div className="space-y-2">
                {(() => {
                  const passPct = data?.appeared > 0 ? Math.round(((data?.pass || 0) / data.appeared) * 100) : 0;
                  const insights: { icon: any; text: string; color: string; bg: string }[] = [];
                  if (passPct >= 80) {
                    insights.push({ icon: <Sparkles size={11} />, text: `Excellent pass rate of ${passPct}%. Maintain the momentum with enrichment programs.`, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900' });
                  } else if (passPct >= 50) {
                    insights.push({ icon: <TrendingUp size={11} />, text: `Pass rate is ${passPct}%. Focus on weak subjects to push above 80%.`, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900' });
                  } else {
                    insights.push({ icon: <AlertTriangle size={11} />, text: `Pass rate is ${passPct}%. Immediate intervention needed for underperforming regions.`, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900' });
                  }
                  if ((data?.fullAPlus ?? 0) > 0) {
                    insights.push({ icon: <Award size={11} />, text: `${data.fullAPlus.toLocaleString()} students achieved Full A+ across all subjects.`, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900' });
                  }
                  if ((data?.absent ?? 0) > 0) {
                    insights.push({ icon: <Eye size={11} />, text: `${data.absent.toLocaleString()} students were absent. Follow up for better attendance.`, color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900' });
                  }
                  if (pendingSchoolsCount > 0) {
                    insights.push({ icon: <AlertTriangle size={11} />, text: `${pendingSchoolsCount} school(s) yet to confirm. Remind headmasters to lock results.`, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900' });
                  }
                  if (insights.length === 0) {
                    insights.push({ icon: <CheckCircle2 size={11} />, text: 'All metrics are on track. Keep up the good work!', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900' });
                  }
                  return insights.map((ins, i) => (
                    <div key={i} className={`p-2.5 border rounded-lg ${ins.bg}`}>
                      <div className={`flex items-center gap-1.5 mb-0.5 ${ins.color}`}>{ins.icon}<span className="text-[10px] font-black uppercase">Insight</span></div>
                      <p className="text-[10px] font-medium text-gray-600 dark:text-gray-300">{ins.text}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======== SCHOOL LIST MODAL (Admin) ======== */}
      {isSchoolListModalOpen && (
        <Modal 
          isOpen={isSchoolListModalOpen} 
          onClose={() => {
            setIsSchoolListModalOpen(false);
            setSchoolListSearch('');
            setSchoolListFilterEdu('ALL');
            setSchoolListFilterDistrict('ALL');
          }} 
          className="items-start pt-4 sm:pt-8"
          disableOutsideClick={true}
        >
          <div className="bg-white dark:bg-[#161b22] w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#30363d] h-[88vh] max-h-[88vh] flex flex-col my-auto sm:my-0">
            <div className="px-8 py-6 bg-slate-50 dark:bg-[#1f242c] border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-black dark:text-white tracking-tight uppercase">All Schools</h2>
                <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">
                  Exam: {selectedExam?.name || 'N/A'} &bull; {allSchools.length} Total Schools
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsSchoolListModalOpen(false);
                  setSchoolListSearch('');
                  setSchoolListFilterEdu('ALL');
                  setSchoolListFilterDistrict('ALL');
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-[#30363d] rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {/* Search & Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search school name or code..."
                    value={schoolListSearch}
                    onChange={(e) => setSchoolListSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none"
                  />
                </div>
                {/* Revenue District Filter */}
                {districts.length > 0 && (user?.role === 'WEBMASTER' || user?.role === 'DIET') && (
                  <div className="relative min-w-[200px]">
                    <select
                      value={schoolListFilterDistrict}
                      onChange={(e) => {
                        setSchoolListFilterDistrict(e.target.value);
                        setSchoolListFilterEdu('ALL');
                      }}
                      className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl py-3 px-4 pr-10 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="ALL">All Revenue Districts</option>
                      {districts.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold text-xs select-none">▼</div>
                  </div>
                )}
                {/* Sub-District (Edu District) Filter */}
                {eduDistricts.length > 0 && (
                  <div className="relative min-w-[200px]">
                    <select
                      value={schoolListFilterEdu}
                      onChange={(e) => setSchoolListFilterEdu(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl py-3 px-4 pr-10 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="ALL">All Sub-Districts</option>
                      {eduDistricts
                        .filter((edu: any) => schoolListFilterDistrict === 'ALL' || edu.districtId === schoolListFilterDistrict)
                        .map((edu: any) => (
                        <option key={edu.id} value={edu.id}>{edu.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold text-xs select-none">▼</div>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="border border-gray-100 dark:border-[#30363d] rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#1f242c] border-b border-gray-100 dark:border-[#30363d]">
                      <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: '60px' }}>#</th>
                      <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: '100px' }}>Code</th>
                      <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">School Name</th>
                      <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Headmaster</th>
                      <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
                    {(() => {
                      const confirmedIds = selectedExam?.confirmedSchools || [];
                      const filtered = allSchools.filter((s: any) => {
                        const matchSearch = !schoolListSearch.trim() || 
                          s.name.toLowerCase().includes(schoolListSearch.toLowerCase()) || 
                          s.code.toLowerCase().includes(schoolListSearch.toLowerCase());
                        const matchEdu = schoolListFilterEdu === 'ALL' || s.subDistrictId === schoolListFilterEdu;
                        const matchDistrict = schoolListFilterDistrict === 'ALL' || 
                          eduDistricts.some((e: any) => e.id === s.subDistrictId && e.districtId === schoolListFilterDistrict);
                        return matchSearch && matchEdu && matchDistrict;
                      });
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-xs font-bold uppercase">No schools match your filters</td>
                          </tr>
                        );
                      }
                      return filtered.map((s: any, idx: number) => {
                        const isConfirmed = confirmedIds.includes(s._id?.toString() || s.id);
                        return (
                          <tr key={s.id || s._id} className="hover:bg-slate-50/50 dark:hover:bg-[#1f242c]/30 text-xs font-bold transition-all text-slate-800 dark:text-slate-200">
                            <td className="px-5 py-3 text-center text-gray-400">{idx + 1}</td>
                            <td className="px-5 py-3 text-center font-mono font-black text-indigo-600 dark:text-indigo-400">{s.code}</td>
                            <td className="px-5 py-3 font-black uppercase text-black dark:text-white truncate max-w-[250px]" title={s.name}>{s.name}</td>
                            <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{s.hmName || 'N/A'}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                isConfirmed 
                                  ? "bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400" 
                                  : "bg-amber-100 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400"
                              )}>
                                {isConfirmed ? 'Confirmed' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-50 dark:bg-[#1f242c] border-t border-gray-100 dark:border-[#30363d] flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {allSchools.filter((s: any) => {
                  const matchEdu = schoolListFilterEdu === 'ALL' || s.subDistrictId === schoolListFilterEdu;
                  const matchDistrict = schoolListFilterDistrict === 'ALL' || 
                    eduDistricts.some((e: any) => e.id === s.subDistrictId && e.districtId === schoolListFilterDistrict);
                  return matchEdu && matchDistrict;
                }).length} schools shown
              </span>
              <button 
                onClick={() => {
                  setIsSchoolListModalOpen(false);
                  setSchoolListSearch('');
                  setSchoolListFilterEdu('ALL');
                  setSchoolListFilterDistrict('ALL');
                }}
                className="px-6 py-3 bg-gray-100 dark:bg-[#30363d] hover:bg-gray-200 dark:hover:bg-slate-750 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* District Student Breakdown Modal */}

      


      {isEagleViewModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-[#0d1117] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsEagleViewModalOpen(false)}
                className="p-2 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl text-gray-500 hover:text-cyan-600 hover:border-cyan-200 transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 rounded-xl">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h1 className="text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white leading-tight">ENTRY RATE BREAKDOWN (EAGLE VIEW)</h1>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">MONITOR MARKS ENTRY PROGRESS PER SCHOOL AND SUBJECT</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search schools..."
                  value={eagleViewSearch}
                  onChange={(e) => setEagleViewSearch(e.target.value)}
                  className="w-64 bg-slate-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
              <button onClick={() => setIsEagleViewModalOpen(false)} className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white text-xs font-black rounded-lg hover:bg-gray-700 transition-colors">Close</button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 flex flex-col min-h-0">
            <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col min-h-0 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl shadow-sm">
              {isEagleViewLoading ? (
                <div className="p-20 text-center text-sm font-bold text-gray-500 flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  Loading eagle view data...
                </div>
              ) : (
                <div className="overflow-auto custom-scrollbar flex-1 rounded-2xl relative shadow-inner">
                  <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-[#1f242c]">
                        <th className="px-2 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-8 sticky left-0 top-0 bg-slate-100 dark:bg-[#1f242c] z-30 border-b border-gray-200 dark:border-[#30363d] shadow-[1px_0_0_rgba(0,0,0,0.05)]">#</th>
                        <th className="px-2 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[180px] sticky left-[32px] top-0 bg-slate-100 dark:bg-[#1f242c] z-30 border-b border-gray-200 dark:border-[#30363d] shadow-[1px_0_0_rgba(0,0,0,0.05)]">School Name (Code)</th>
                        <th className="px-2 py-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wider text-center w-20 sticky top-0 bg-slate-100 dark:bg-[#1f242c] z-20 border-b border-r border-gray-200 dark:border-[#30363d]">Total</th>
                        {(eagleViewData?.validSubjects || []).map((p: string) => (
                          <th key={p} className="px-1 py-2 text-[10px] font-bold text-cyan-600 uppercase tracking-wider text-center min-w-[50px] sticky top-0 bg-slate-100 dark:bg-[#1f242c] z-20 border-b border-gray-200 dark:border-[#30363d]">{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
                      {(!eagleViewData?.schools || eagleViewData.schools.length === 0) ? (
                          <tr><td colSpan={3 + ((eagleViewData?.validSubjects || []).length)} className="p-12 text-center text-sm text-gray-400 font-bold uppercase tracking-widest">No data available for this selection</td></tr>
                      ) : (
                        eagleViewData.schools
                          .filter((s: any) => !eagleViewSearch || s.name.toLowerCase().includes(eagleViewSearch.toLowerCase()) || s.code.includes(eagleViewSearch))
                          .map((s: any, idx: number) => (
                          <tr key={s.code} className="hover:bg-slate-50 dark:hover:bg-[#1f242c]/50 transition-colors group">
                            <td className="px-2 py-2 text-center text-xs text-gray-400 sticky left-0 bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">{idx + 1}</td>
                            <td className="px-2 py-2 text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px] sticky left-[32px] bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]" title={`${s.name} (${s.code})`}>
                              {s.name} <span className="text-gray-400 font-mono text-[9px] ml-1">({s.code})</span>
                            </td>
                            <td className="px-2 py-2 text-center text-[11px] font-bold text-indigo-600 border-r border-gray-100 dark:border-[#30363d]">{s.totalStudents}</td>
                            {(eagleViewData?.validSubjects || []).map((p: string) => {
                              const entered = s.subjects[p] || 0;
                              const total = s.totalStudents;
                              const isComplete = entered >= total;
                              const isPending = entered > 0 && entered < total;
                              
                              return (
                                <td key={p} className="px-1 py-1 text-center border-r border-gray-50 dark:border-[#30363d]/30 last:border-0">
                                  <div className="flex flex-col items-center justify-center gap-0.5" title={`${entered} / ${total} marks entered`}>
                                    <span className={`text-[9px] font-bold uppercase px-1 py-[1px] rounded-[4px] border shadow-sm leading-none ${
                                      isComplete ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700/50' :
                                      isPending ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/50' :
                                      'bg-red-50 text-red-500 border-red-200 dark:bg-red-900/30 dark:border-red-700/50'
                                    }`}>
                                      {isComplete ? 'Done' : isPending ? 'Pend' : 'None'}
                                    </span>
                                    <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none">{entered}/{total}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
\n      {isDistrictStudentsModalOpen && (
        <Modal 
          isOpen={isDistrictStudentsModalOpen} 
          onClose={() => {
            setIsDistrictStudentsModalOpen(false);
            setDistrictModalSearch('');
            setDistrictModalRevenueDistrict('ALL');
            setDistrictModalEduDistrict('ALL');
            setDistrictModalSchoolType('ALL');
            setDistrictModalGender('ALL');
          }} 
          className="items-start pt-4 sm:pt-6"
          disableOutsideClick={true}
        >
          <div className="bg-white dark:bg-[#161b22] w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#30363d] h-[90vh] max-h-[90vh] flex flex-col my-auto sm:my-0">
            {/* Header */}
            <div className="px-8 py-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white border-b border-indigo-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600/30 border border-indigo-400/30 rounded-2xl">
                  <Users className="text-indigo-300" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight uppercase">District Student Breakdown (All Schools)</h2>
                  <p className="text-xs text-indigo-200 font-bold uppercase mt-0.5">
                    Exam: {selectedExam?.name || 'N/A'} &bull; Male, Female and Total Enrollment per School
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsDistrictStudentsModalOpen(false);
                  setDistrictModalSearch('');
                  setDistrictModalRevenueDistrict('ALL');
                  setDistrictModalEduDistrict('ALL');
                  setDistrictModalSchoolType('ALL');
                  setDistrictModalGender('ALL');
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5 bg-slate-50/50 dark:bg-[#12161c]">
              
              {/* Multi-Filters Control Panel */}
              <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#30363d]">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Filter size={14} className="text-indigo-600" />
                    <span>District & School Multi-Filters</span>
                  </div>
                  {(districtModalSearch || districtModalRevenueDistrict !== 'ALL' || districtModalEduDistrict !== 'ALL' || districtModalSchoolType !== 'ALL' || districtModalGender !== 'ALL') && (
                    <button
                      onClick={() => {
                        setDistrictModalSearch('');
                        setDistrictModalRevenueDistrict('ALL');
                        setDistrictModalEduDistrict('ALL');
                        setDistrictModalSchoolType('ALL');
                        setDistrictModalGender('ALL');
                      }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="text"
                      placeholder="School name or code..."
                      value={districtModalSearch}
                      onChange={(e) => setDistrictModalSearch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-xl py-2.5 pl-10 pr-3 text-xs font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>

                  {/* Revenue District Filter */}
                  <div>
                    <select
                      value={districtModalRevenueDistrict}
                      onChange={(e) => {
                        setDistrictModalRevenueDistrict(e.target.value);
                        setDistrictModalEduDistrict('ALL');
                      }}
                      className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer"
                    >
                      <option value="ALL">All Revenue Districts</option>
                      {districts.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Educational District Filter */}
                  <div>
                    <select
                      value={districtModalEduDistrict}
                      onChange={(e) => setDistrictModalEduDistrict(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer"
                    >
                      <option value="ALL">All Educational Districts</option>
                      {eduDistricts
                        .filter((edu: any) => districtModalRevenueDistrict === 'ALL' || edu.districtId === districtModalRevenueDistrict)
                        .map((edu: any) => (
                        <option key={edu.id} value={edu.id}>{edu.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* School Type Filter */}
                  <div>
                    <select
                      value={districtModalSchoolType}
                      onChange={(e) => setDistrictModalSchoolType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer"
                    >
                      <option value="ALL">All School Types</option>
                      <option value="Government">Government</option>
                      <option value="Aided">Aided</option>
                      <option value="Unaided">Unaided / Private</option>
                    </select>
                  </div>

                  {/* Male / Female Multi-Filter */}
                  <div>
                    <select
                      value={districtModalGender}
                      onChange={(e) => setDistrictModalGender(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer"
                    >
                      <option value="ALL">All Genders (Male & Female)</option>
                      <option value="MALE_ONLY">Male Students Only</option>
                      <option value="FEMALE_ONLY">Female Students Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* KPI Summary Cards inside Modal */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-3.5">
                  <div className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Schools Displayed</div>
                  <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">{filteredDistrictTotals.schools}</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-3.5">
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Total Male Students</div>
                  <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">{filteredDistrictTotals.male.toLocaleString()}</div>
                </div>
                <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-800 rounded-2xl p-3.5">
                  <div className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Total Female Students</div>
                  <div className="text-xl font-black text-pink-700 dark:text-pink-400 mt-1">{filteredDistrictTotals.female.toLocaleString()}</div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-3.5">
                  <div className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Grand Total Students</div>
                  <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-1">{filteredDistrictTotals.total.toLocaleString()}</div>
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-200 dark:border-[#30363d] rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-[#161b22]">
                {isDistrictStudentsLoading ? (
                  <div className="p-12 text-center text-xs font-bold text-gray-500">Loading student counts for all schools in district...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-[#1f242c] border-b border-gray-200 dark:border-[#30363d]">
                          <th className="px-4 py-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center" style={{ width: '50px' }}>#</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center" style={{ width: '90px' }}>Code</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">School Name</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Revenue & Edu District</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center" style={{ width: '120px' }}>School Type</th>
                          <th className="px-4 py-3 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest text-right" style={{ width: '90px' }}>Male</th>
                          <th className="px-4 py-3 text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest text-right" style={{ width: '90px' }}>Female</th>
                          <th className="px-4 py-3 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-right" style={{ width: '110px' }}>Total Students</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
                        {filteredDistrictSchools.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-xs font-bold uppercase">No schools match your multi-filter criteria</td>
                          </tr>
                        ) : (
                          filteredDistrictSchools.map((s: any, idx: number) => (
                            <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1f242c]/50 text-xs font-bold transition-all text-slate-800 dark:text-slate-200">
                              <td className="px-4 py-3 text-center text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-3 text-center font-mono font-black text-indigo-600 dark:text-indigo-400">{s.code}</td>
                              <td className="px-4 py-3 font-black uppercase text-black dark:text-white truncate max-w-[280px]" title={s.name}>{s.name}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-[11px]">
                                <span className="font-bold">{s.districtName}</span> &bull; <span className="text-gray-400">{s.subDistrictName}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  s.schoolType?.toLowerCase() === 'aided' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                    : s.schoolType?.toLowerCase().includes('unaided') || s.schoolType?.toLowerCase().includes('private')
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
                                }`}>
                                  {s.schoolType || 'Government'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-black text-blue-600 dark:text-blue-400">{s.maleCount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-black text-pink-600 dark:text-pink-400">{s.femaleCount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-black text-indigo-700 dark:text-indigo-300 text-sm">{s.totalStudents.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {filteredDistrictSchools.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-100 dark:bg-[#1f242c] font-black text-xs text-slate-900 dark:text-white border-t-2 border-gray-300 dark:border-[#30363d]">
                            <td colSpan={5} className="px-4 py-3 uppercase tracking-wider text-right">Filtered Total ({filteredDistrictTotals.schools} Schools):</td>
                            <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{filteredDistrictTotals.male.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-pink-600 dark:text-pink-400">{filteredDistrictTotals.female.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 text-sm">{filteredDistrictTotals.total.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-slate-50 dark:bg-[#1f242c] border-t border-gray-200 dark:border-[#30363d] flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Showing {filteredDistrictSchools.length} of {districtSchoolStudentsData?.schools?.length || 0} total schools
              </span>
              <button 
                onClick={() => {
                  setIsDistrictStudentsModalOpen(false);
                  setDistrictModalSearch('');
                  setDistrictModalRevenueDistrict('ALL');
                  setDistrictModalEduDistrict('ALL');
                  setDistrictModalSchoolType('ALL');
                  setDistrictModalGender('ALL');
                }}
                className="px-6 py-2.5 bg-gray-200 dark:bg-[#30363d] hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmed Submissions Modal */}
      {isConfirmedModalOpen && selectedExam && (
        <Modal 
          isOpen={isConfirmedModalOpen} 
          onClose={() => {
            setIsConfirmedModalOpen(false);
            setModalSearch('');
            setSelectedModalEduId(defaultEduId);
          }} 
          className="items-start pt-4 sm:pt-8"
          disableOutsideClick={true}
        >
          <div className="bg-white dark:bg-[#161b22] w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#30363d] h-[88vh] max-h-[88vh] flex flex-col my-auto sm:my-0">
            <div className="px-8 py-6 bg-slate-50 dark:bg-[#1f242c] border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-black dark:text-white tracking-tight uppercase">
                  Confirmed & Locked Submissions
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">
                  Exam: {selectedExam.name}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsConfirmedModalOpen(false);
                  setModalSearch('');
                  setSelectedModalEduId(defaultEduId);
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-[#30363d] rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {/* Search & Actions Bar */}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search school name or code..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none"
                    />
                  </div>
                  {/* Educational District Filter Dropdown */}
                  {eduDistricts.length > 0 && (
                    <div className="relative min-w-[220px]">
                      <select
                        value={selectedModalEduId}
                        onChange={(e) => setSelectedModalEduId(e.target.value)}
                        disabled={!hasAllAccess}
                        className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl py-3 px-4 pr-10 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        <option value="ALL">All Educational Districts</option>
                        {eduDistricts
                          .filter((edu: any) => !selectedDistrict || selectedDistrict === 'ALL' || edu.districtId === selectedDistrict)
                          .map((edu: any) => (
                          <option key={edu.id} value={edu.id}>{edu.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold text-xs select-none">
                        ▼
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const filtered = activeSchoolScope.filter((s: any) => 
                        confirmedSchoolIds.includes(s.id) && 
                        (selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId) && (
                          s.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
                          s.code.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                      );
                      const eduName = selectedModalEduId === 'ALL' ? 'All Educational Districts' : (eduDistricts.find((e: any) => e.id === selectedModalEduId)?.name || 'Educational District');
                      generateSchoolSubmissionPdf({
                        examName: selectedExam.name,
                        listType: 'confirmed',
                        schoolList: filtered,
                        confirmations: selectedExam.confirmations || {},
                        eduDistrictName: eduName
                      });
                    }}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <FileText size={16} />
                    Export PDF
                  </button>
                  <button
                    onClick={() => {
                      const filtered = activeSchoolScope.filter((s: any) => 
                        confirmedSchoolIds.includes(s.id) && 
                        (selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId) && (
                          s.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
                          s.code.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                      );
                      printSchoolSubmissionWindow(
                        `${selectedExam.name} - Confirmed & Locked Submissions`, 
                        filtered, 
                        true, 
                        selectedExam.confirmations || {}
                      );
                    }}
                    className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Printer size={16} />
                    Print List
                  </button>
                </div>
              </div>

              {/* Table List */}
              <div className="border border-gray-100 dark:border-[#30363d] rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#1f242c] border-b border-gray-100 dark:border-[#30363d]">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: '80px' }}>Sl No</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: '120px' }}>Code</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">School Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Headmaster Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Mobile / Phone</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Locked Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
                    {activeSchoolScope
                      .filter((s: any) => confirmedSchoolIds.includes(s.id))
                      .filter((s: any) => selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId)
                      .filter((s: any) => !modalSearch.trim() || s.name.toLowerCase().includes(modalSearch.toLowerCase()) || s.code.toLowerCase().includes(modalSearch.toLowerCase()))
                      .map((s: any, idx: number) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1f242c]/30 text-xs font-bold transition-all text-slate-800 dark:text-slate-200">
                          <td className="px-6 py-4 text-center text-gray-400">{idx + 1}</td>
                          <td className="px-6 py-4 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">{s.code}</td>
                          <td className="px-6 py-4 font-black uppercase text-black dark:text-white">{s.name}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{s.hmName || 'N/A'}</td>
                          <td className="px-6 py-4 text-center font-mono text-gray-600 dark:text-gray-300">{s.hmMobile || s.phone || 'N/A'}</td>
                          <td className="px-6 py-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatDateTime((selectedExam.confirmations || {})[s.id])}
                          </td>
                        </tr>
                      ))}
                    {activeSchoolScope.filter((s: any) => 
                      confirmedSchoolIds.includes(s.id) && 
                      (selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId) && 
                      (!modalSearch.trim() || s.name.toLowerCase().includes(modalSearch.toLowerCase()) || s.code.toLowerCase().includes(modalSearch.toLowerCase()))
                    ).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          No confirmed school submissions found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-50 dark:bg-[#1f242c] border-t border-gray-100 dark:border-[#30363d] flex justify-end">
              <button 
                onClick={() => {
                  setIsConfirmedModalOpen(false);
                  setModalSearch('');
                  setSelectedModalEduId(defaultEduId);
                }}
                className="px-6 py-3 bg-gray-100 dark:bg-[#30363d] hover:bg-gray-200 dark:hover:bg-slate-750 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pending Submissions Modal */}
      {isPendingModalOpen && selectedExam && (
        <Modal 
          isOpen={isPendingModalOpen} 
          onClose={() => {
            setIsPendingModalOpen(false);
            setModalSearch('');
            setSelectedModalEduId(defaultEduId);
          }} 
          className="items-start pt-4 sm:pt-8"
          disableOutsideClick={true}
        >
          <div className="bg-white dark:bg-[#161b22] w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#30363d] h-[88vh] max-h-[88vh] flex flex-col my-auto sm:my-0">
            <div className="px-8 py-6 bg-slate-50 dark:bg-[#1f242c] border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-black dark:text-white tracking-tight uppercase">
                  Pending Submissions
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">
                  Exam: {selectedExam.name}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsPendingModalOpen(false);
                  setModalSearch('');
                  setSelectedModalEduId(defaultEduId);
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-[#30363d] rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {/* Search & Actions Bar */}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search school name or code..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none"
                    />
                  </div>
                  {/* Educational District Filter Dropdown */}
                  {eduDistricts.length > 0 && (
                    <div className="relative min-w-[220px]">
                      <select
                        value={selectedModalEduId}
                        onChange={(e) => setSelectedModalEduId(e.target.value)}
                        disabled={!hasAllAccess}
                        className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl py-3 px-4 pr-10 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        <option value="ALL">All Educational Districts</option>
                        {eduDistricts
                          .filter((edu: any) => !selectedDistrict || selectedDistrict === 'ALL' || edu.districtId === selectedDistrict)
                          .map((edu: any) => (
                          <option key={edu.id} value={edu.id}>{edu.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold text-xs select-none">
                        ▼
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const filtered = activeSchoolScope.filter((s: any) => 
                        !confirmedSchoolIds.includes(s.id) && 
                        (selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId) && (
                          s.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
                          s.code.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                      );
                      const eduName = selectedModalEduId === 'ALL' ? 'All Educational Districts' : (eduDistricts.find((e: any) => e.id === selectedModalEduId)?.name || 'Educational District');
                      generateSchoolSubmissionPdf({
                        examName: selectedExam.name,
                        listType: 'pending',
                        schoolList: filtered,
                        confirmations: {},
                        eduDistrictName: eduName
                      });
                    }}
                    className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <FileText size={16} />
                    Export PDF
                  </button>
                  <button
                    onClick={() => {
                      const filtered = activeSchoolScope.filter((s: any) => 
                        !confirmedSchoolIds.includes(s.id) && 
                        (selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId) && (
                          s.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
                          s.code.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                      );
                      printSchoolSubmissionWindow(
                        `${selectedExam.name} - Pending Submissions`, 
                        filtered, 
                        false
                      );
                    }}
                    className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Printer size={16} />
                    Print List
                  </button>
                </div>
              </div>

              {/* Table List */}
              <div className="border border-gray-100 dark:border-[#30363d] rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#1f242c] border-b border-gray-100 dark:border-[#30363d]">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: '80px' }}>Sl No</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: '120px' }}>Code</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">School Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Headmaster Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Mobile / Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
                    {activeSchoolScope
                      .filter((s: any) => !confirmedSchoolIds.includes(s.id))
                      .filter((s: any) => selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId)
                      .filter((s: any) => !modalSearch.trim() || s.name.toLowerCase().includes(modalSearch.toLowerCase()) || s.code.toLowerCase().includes(modalSearch.toLowerCase()))
                      .map((s: any, idx: number) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1f242c]/30 text-xs font-bold transition-all text-slate-800 dark:text-slate-200">
                          <td className="px-6 py-4 text-center text-gray-400">{idx + 1}</td>
                          <td className="px-6 py-4 text-center font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">{s.code}</td>
                          <td className="px-6 py-4 font-black uppercase text-black dark:text-white">{s.name}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{s.hmName || 'N/A'}</td>
                          <td className="px-6 py-4 text-center font-mono text-gray-600 dark:text-gray-300">{s.hmMobile || s.phone || 'N/A'}</td>
                        </tr>
                      ))}
                    {activeSchoolScope.filter((s: any) => 
                      !confirmedSchoolIds.includes(s.id) && 
                      (selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId) && 
                      (!modalSearch.trim() || s.name.toLowerCase().includes(modalSearch.toLowerCase()) || s.code.toLowerCase().includes(modalSearch.toLowerCase()))
                    ).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          No pending school submissions found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-50 dark:bg-[#1f242c] border-t border-gray-100 dark:border-[#30363d] flex justify-end">
              <button 
                onClick={() => {
                  setIsPendingModalOpen(false);
                  setModalSearch('');
                  setSelectedModalEduId(defaultEduId);
                }}
                className="px-6 py-3 bg-gray-100 dark:bg-[#30363d] hover:bg-gray-200 dark:hover:bg-slate-750 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
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
  } else if (color.includes("indigo")) {
    hoverStyles = "group-hover:border-indigo-400 group-hover:shadow-indigo-100/50";
  }

  return (
    <div className={cn(
      "bg-white dark:bg-[#161b22] p-5 rounded-3xl border border-gray-200 dark:border-[#30363d] shadow-sm group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-out cursor-default flex flex-col justify-between h-32 active-tap",
      hoverStyles
    )}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-[0.15em] single-line-label">{label}</div>
        <div className={cn("p-2 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0", color)}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-black text-black dark:text-white tracking-tight leading-none single-line-label">{value}</div>
        {subText && <div className="text-[10px] text-gray-400 dark:text-gray-400 mt-1.5 font-bold uppercase tracking-wider single-row-desc">{subText}</div>}
      </div>
    </div>
  );
};

export default DashboardPage;
