import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Unlock, 
  ListTodo, 
  Calendar, 
  Building2, 
  Check, 
  AlertCircle,
  Edit2,
  X,
  Printer,
  Search,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Zap,
  User,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import Modal from '../../components/common/Modal';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import PageLoader from '../../components/common/PageLoader';
import { generateSchoolSubmissionPdf, printSchoolSubmissionWindow, formatDateTime } from '../../lib/pdfGenerator';
import { getSubjectPCode } from '../../lib/subjectUtils';

interface Exam {
  id: string;
  name: string;
  standard: string;
  active: boolean;
  confirmedSchools: string[];
  confirmations?: Record<string, string>;
  maxMarks?: Record<string, number>;
  includeCEMarks?: boolean;
  allow_csv_upload?: boolean;
  marksEntryMode?: 'marks' | 'grades' | 'both';
  hasMarkGroups?: boolean;
  isDefault?: boolean;
}

interface SubjectEntry {
  _id: string;
  id: string;
  name: string;
  shortName: string;
  displayOrder?: number;
  groups?: { name: string; maxMarks: number; maxQuestions: number; total: number }[];
}

interface MediumSubjectGroup {
  p01: SubjectEntry[];
  p02: SubjectEntry[];
  p03: SubjectEntry[];
  p04: SubjectEntry[];
  core: SubjectEntry[];
}

const PAPER_CODE_LABELS: Record<string, string> = {
  P01: 'First Language Paper I',
  P02: 'First Language Paper II',
  P03: 'Second Language (English)',
  P04: 'Third Language (Hindi)',
  P05: 'Social Science',
  P06: 'Physics',
  P07: 'Chemistry',
  P08: 'Biology',
  P09: 'Mathematics',
  P10: 'ICT / Information Technology',
};

interface School {
  id: string;
  code: string;
  name: string;
  hmName?: string;
  hmMobile?: string;
  phone?: string;
  email?: string;
  subDistrictId?: string;
}

const ExamManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [eduDistricts, setEduDistricts] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User permission/access helper variables
  const isWebmaster = user?.role === 'WEBMASTER';
  const userSubDistrictId = user?.subDistrictId;
  const hasAllAccess = isWebmaster || !userSubDistrictId;
  const defaultEduId = hasAllAccess ? 'ALL' : userSubDistrictId;

  // Filter school dataset based on user's assigned Educational District (subDistrictId)
  const filteredSchools = React.useMemo(() => {
    if (hasAllAccess) {
      return schools;
    }
    return schools.filter(s => s.subDistrictId === userSubDistrictId);
  }, [schools, hasAllAccess, userSubDistrictId]);

  // Form states
  const [newExamName, setNewExamName] = useState('');
  const [newExamStandard, setNewExamStandard] = useState('10');
  const [includeCEMarks, setIncludeCEMarks] = useState(false);
  const [allowCsvUpload, setAllowCsvUpload] = useState(false);
  const [newMarksEntryMode, setNewMarksEntryMode] = useState<'marks' | 'grades' | 'both'>('both');
  const [hasMarkGroups, setHasMarkGroups] = useState(true);
  const [newExamMaxMarks, setNewExamMaxMarks] = useState<Record<string, number>>({});
  const [codeMarks, setCodeMarks] = useState<Record<string, number>>({ P01: 100, P02: 100, P03: 100, P04: 100, P05: 100, P06: 100, P07: 100, P08: 100, P09: 100, P10: 100 });
  const [newExamIsDefault, setNewExamIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [isCreatingExam, setIsCreatingExam] = useState(false);

  // Dynamic subjects from DB
  const [subjectsByMedium, setSubjectsByMedium] = useState<Record<string, MediumSubjectGroup>>({});
  const [subjectMediums, setSubjectMediums] = useState<string[]>([]);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('');

  // Selected exam to view locks
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Searching field
  const [searchQuery, setSearchQuery] = useState('');
  
  // District & SubDistrict filters for the reset list
  const [resetFilterDistrictId, setResetFilterDistrictId] = useState<string>('ALL');
  const [resetFilterEduId, setResetFilterEduId] = useState<string>('ALL');

  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isConfirmedModalOpen, setIsConfirmedModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedModalEduId, setSelectedModalEduId] = useState<string>('ALL');
  const [isMarksSectionOpen, setIsMarksSectionOpen] = useState(false);

  const getSubjectCode = (sub: SubjectEntry): string => {
    return getSubjectPCode(sub) || ((sub as any).code || (sub as any).paperType || sub.shortName || '').toUpperCase().trim();
  };

  const availableCodes = React.useMemo(() => {
    const codeSet = new Set<string>();
    Object.values(subjectsByMedium).forEach(group => {
      [...(group.p01 || []), ...(group.p02 || []), ...(group.p03 || []), ...(group.p04 || []), ...(group.core || [])].forEach(sub => {
        const code = getSubjectCode(sub);
        if (code && /^P\d{2}$/i.test(code)) codeSet.add(code);
      });
    });
    ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'].forEach(c => codeSet.add(c));
    return Array.from(codeSet).sort((a, b) => parseInt(a.replace('P', '')) - parseInt(b.replace('P', '')));
  }, [subjectsByMedium]);

  const applyCodeMarksToSubjects = (updatedCodeMarks: Record<string, number>, withCE: boolean = false) => {
    const nextMarks: Record<string, number> = {};

    Object.keys(updatedCodeMarks).forEach(code => {
      const base = updatedCodeMarks[code];
      nextMarks[code] = withCE ? Math.round(base * 1.25) : base;
    });

    Object.values(subjectsByMedium).forEach(group => {
      [...(group.p01 || []), ...(group.p02 || []), ...(group.p03 || []), ...(group.p04 || []), ...(group.core || [])].forEach(sub => {
        const subId = (sub._id || sub.id) as string;
        const code = getSubjectCode(sub);
        const baseMarks = updatedCodeMarks[code] || (code === 'P01' ? (updatedCodeMarks['P01'] || 100) : 100);
        nextMarks[subId] = withCE ? Math.round(baseMarks * 1.25) : baseMarks;
      });
    });
    setNewExamMaxMarks(nextMarks);
  };

  const handleCodeMarksChange = (code: string, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0 || num > 999) return;
    const updated = { ...codeMarks, [code]: num };
    setCodeMarks(updated);
    applyCodeMarksToSubjects(updated, includeCEMarks);
  };

  const applyMarksToAllCodes = () => {
    const firstCode = availableCodes[0];
    if (!firstCode) return;
    const marks = codeMarks[firstCode] || 100;
    const updated: Record<string, number> = {};
    availableCodes.forEach(code => { updated[code] = marks; });
    setCodeMarks(updated);
    applyCodeMarksToSubjects(updated, includeCEMarks);
    toast.success(`Applied ${marks} marks to all codes`);
  };

  const resetCodeMarks = () => {
    const reset: Record<string, number> = {};
    availableCodes.forEach(code => { reset[code] = 100; });
    setCodeMarks(reset);
    applyCodeMarksToSubjects(reset, includeCEMarks);
    toast.success('Reset to default (100 marks per code)');
  };

  // Synchronize default selected educational district on user load
  useEffect(() => {
    if (user) {
      setSelectedModalEduId(defaultEduId);
    }
  }, [user, defaultEduId]);

  // Print preview state to generate a dedicated printable section
  const [printData, setPrintData] = useState<{ title: string; columns: string[]; rows: any[] } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [examsRes, schoolsRes, eduRes, distRes, subjectsGroupedRes] = await Promise.all([
        apiClient.get('/management/exams'),
        apiClient.get('/management/schools'),
        apiClient.get('/management/educational-districts'),
        apiClient.get('/management/districts'),
        apiClient.get('/management/subjects/grouped')
      ]);
      setExams(examsRes.data);
      setSchools(schoolsRes.data);
      setEduDistricts(eduRes.data);
      setDistricts(distRes.data);

      const sgData = subjectsGroupedRes.data;
      setSubjectsByMedium(sgData.subjectsByMedium || {});
      setSubjectMediums(sgData.mediums || []);
      if (sgData.mediums?.length > 0) {
        setActiveSubjectTab(sgData.mediums[0]);
      }

      if (examsRes.data.length > 0 && !selectedExamId) {
        setSelectedExamId(examsRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const applyDefaultMarks = (withCE: boolean) => {
    applyCodeMarksToSubjects(codeMarks, withCE);
  };

  useEffect(() => {
    if (!editingExamId && Object.keys(subjectsByMedium).length > 0) {
      applyDefaultMarks(includeCEMarks);
    }
  }, [editingExamId, subjectsByMedium]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim()) {
      toast.error('Please enter an exam title');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingExamId) {
        const res = await apiClient.post('/management/exams', {
          id: editingExamId,
          name: newExamName,
          standard: newExamStandard,
          maxMarks: newExamMaxMarks,
          includeCEMarks,
          allow_csv_upload: allowCsvUpload,
          marksEntryMode: newMarksEntryMode,
          hasMarkGroups,
          isDefault: newExamIsDefault,
        });
        toast.success('Exam details saved successfully');
        setExams(prev => {
          if (newExamIsDefault) {
            return prev.map(ex => ex.id === editingExamId ? { ...ex, ...res.data } : { ...ex, isDefault: false });
          }
          return prev.map(ex => ex.id === editingExamId ? { ...ex, ...res.data } : ex);
        });
        if (newExamIsDefault) {
          setSelectedExamId(res.data.id);
        }
        setEditingExamId(null);
        setIsCreatingExam(false);
        setNewExamName('');
        setNewExamStandard('10');
        setIncludeCEMarks(false);
        setAllowCsvUpload(false);
        setNewMarksEntryMode('both');
        setHasMarkGroups(true);
        setNewExamIsDefault(false);
      } else {
        const res = await apiClient.post('/management/exams', {
          name: newExamName,
          standard: newExamStandard,
          active: true,
          maxMarks: newExamMaxMarks,
          includeCEMarks,
          allow_csv_upload: allowCsvUpload,
          marksEntryMode: newMarksEntryMode,
          hasMarkGroups,
          isDefault: newExamIsDefault,
        });
        toast.success('Exam created successfully');
        setIsCreatingExam(false);
        setNewExamName('');
        setNewExamStandard('10');
        setIncludeCEMarks(false);
        setAllowCsvUpload(false);
        setNewMarksEntryMode('both');
        setHasMarkGroups(true);
        setNewExamIsDefault(false);
        setExams(prev => {
          if (newExamIsDefault) {
            return [...prev.map(e => ({ ...e, isDefault: false })), res.data];
          }
          return [...prev, res.data];
        });
        if (newExamIsDefault || !selectedExamId) {
          setSelectedExamId(res.data.id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(editingExamId ? 'Failed to save exam details' : 'Failed to create new exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDeleteExam = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Deleting exam "${name}" will remove all marks associated with it!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000000',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'rounded-3xl shadow-xl border border-gray-150'
      }
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/management/exams/${id}`);
        toast.success('Exam deleted');
        setExams(prev => prev.filter(e => e.id !== id));
        if (selectedExamId === id) {
          setSelectedExamId(null);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete exam');
      }
    }
  };

  const triggerResetSchoolLock = async (examId: string, schoolId: string, schoolName: string) => {
    const result = await Swal.fire({
      title: 'Unlock Submission?',
      text: `This will allow ${schoolName} to edit and re-submit marks for this exam.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#000000',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, unlock!',
      customClass: {
        popup: 'rounded-3xl shadow-xl border border-gray-150'
      }
    });

    if (result.isConfirmed) {
      try {
        const res = await apiClient.post(`/management/exams/${examId}/reset-school`, { schoolId });
        toast.success(`Unlocked marks submission for ${schoolName}`);
        
        // Update local exams list with response
        setExams(prev => prev.map(e => e.id === examId ? res.data.exam : e));
      } catch (err) {
        console.error(err);
        toast.error('Failed to unlock/reset marks submission');
      }
    }
  };

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const confirmedSchoolIds = selectedExam?.confirmedSchools || [];

  // Filter confirmed schools by user's permitted schools
  const confirmedSchoolsInDistrict = React.useMemo(() => {
    return confirmedSchoolIds.filter(schoolId => 
      filteredSchools.some(s => s.id === schoolId)
    );
  }, [confirmedSchoolIds, filteredSchools]);

  if (isLoading) {
    return (
      <PageLoader label="Loading Exam Management..." />
    );
  }

  const filteredConfirmedSchoolIds = confirmedSchoolsInDistrict.filter(schoolId => {
    const school = filteredSchools.find(s => s.id === schoolId);
    if (!school) return false;
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase().trim();
    return school.name.toLowerCase().includes(term) || school.code.toLowerCase().includes(term);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Create and List Exams Column */}
      <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 lg:self-start">
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          {(isCreatingExam || editingExamId) ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-black tracking-wider uppercase flex items-center gap-2">
                  <PlusCircle size={18} className="text-gray-400" />
                  {editingExamId ? "Edit Exam Details" : "Create New Exam"}
                </h2>
                <button
                  onClick={() => {
                    setEditingExamId(null);
                    setIsCreatingExam(false);
                    setNewExamName('');
                    setNewExamStandard('10');
                    setIncludeCEMarks(false);
                    setAllowCsvUpload(false);
                    setNewMarksEntryMode('both');
                    setHasMarkGroups(true);
                    setNewExamIsDefault(false);
                  }}
                  className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1 transition-colors"
                  title="Cancel"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
              <form onSubmit={handleCreateExam} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Exam Title/Name</label>
              <input 
                type="text" 
                placeholder="e.g. SSLC Term Exam 2026"
                value={newExamName}
                onChange={e => setNewExamName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:border-black focus:ring-1 focus:ring-black outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Class</label>
              <select 
                value={newExamStandard}
                onChange={e => setNewExamStandard(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:border-black focus:ring-0 outline-none cursor-pointer transition-colors"
              >
                <option value="8" className="px-3 py-1.5 text-xs font-bold">Class 8</option>
                <option value="9" className="px-3 py-1.5 text-xs font-bold">Class 9</option>
                <option value="10" className="px-3 py-1.5 text-xs font-bold">Class 10</option>
              </select>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <input 
                type="checkbox" 
                id="includeCEMarks"
                checked={includeCEMarks}
                onChange={e => {
                  setIncludeCEMarks(e.target.checked);
                  applyDefaultMarks(e.target.checked);
                }}
                className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
              />
              <label htmlFor="includeCEMarks" className="text-xs font-bold text-gray-700 cursor-pointer">
                Include CE Marks (Continuous Evaluation)
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input 
                type="checkbox" 
                id="isDefaultExam"
                checked={newExamIsDefault}
                onChange={e => setNewExamIsDefault(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="isDefaultExam" className="text-xs font-bold text-gray-700 cursor-pointer">
                Set as Default Exam
              </label>
            </div>

            <div className="flex flex-col gap-1 pt-2">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="allowCsvUpload"
                  checked={allowCsvUpload}
                  onChange={e => setAllowCsvUpload(e.target.checked)}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
                />
                <label htmlFor="allowCsvUpload" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Enable CSV Upload for Marks Entry
                </label>
              </div>
              <p className="text-[10px] text-gray-500 pl-7 leading-relaxed">
                When enabled, the "Upload CSV" button will be visible in the Marks Entry page for this exam. When disabled, the CSV Upload option must be completely hidden.
              </p>
            </div>

            <div className="pt-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Allowed Entry Mode</label>
              <select 
                value={newMarksEntryMode}
                onChange={e => setNewMarksEntryMode(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:border-black focus:ring-0 outline-none cursor-pointer transition-colors"
              >
                <option value="both" className="px-3 py-1.5 text-xs font-bold">Both (Marks & Grades)</option>
                <option value="marks" className="px-3 py-1.5 text-xs font-bold">Marks Only</option>
                <option value="grades" className="px-3 py-1.5 text-xs font-bold">Grades Only</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Exam Format</label>
              <select 
                value={hasMarkGroups ? "true" : "false"}
                onChange={e => setHasMarkGroups(e.target.value === "true")}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:border-black focus:ring-0 outline-none cursor-pointer transition-colors"
              >
                <option value="true" className="px-3 py-1.5 text-xs font-bold">With Mark Group</option>
                <option value="false" className="px-3 py-1.5 text-xs font-bold">Without Mark Group</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsMarksSectionOpen(!isMarksSectionOpen)}
                className="flex items-center justify-between w-full text-left group"
              >
                <label className="text-[10px] uppercase font-black bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent cursor-pointer group-hover:from-pink-600 group-hover:to-violet-600 transition-all">
                  Subject Maximum Marks ({availableCodes.length} codes &middot; {Object.values(subjectsByMedium).reduce((sum, g) => sum + (g.p01?.length || 0) + (g.p02?.length || 0) + (g.p03?.length || 0) + (g.p04?.length || 0) + (g.core?.length || 0), 0)} subjects)
                </label>
                {isMarksSectionOpen ? (
                  <ChevronUp size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                )}
              </button>
              
              {isMarksSectionOpen && (subjectMediums.length > 0 ? (
                <div className="space-y-3">
                  {/* Code-Based Maximum Marks */}
                  {availableCodes.length > 0 && (
                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider">Set Marks Per Code (applies to all subjects with that code)</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={applyMarksToAllCodes} className="px-2 py-1 text-[8px] font-bold uppercase bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
                            Apply to All
                          </button>
                          <button type="button" onClick={resetCodeMarks} className="px-2 py-1 text-[8px] font-bold uppercase bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors">
                            Reset
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {availableCodes.map(code => (
                          <div key={code} className="flex flex-col items-center gap-1">
                            <span className="text-[9px] font-black text-indigo-600 tracking-wider">{code}</span>
                            <input
                              type="number"
                              min={0}
                              max={999}
                              value={codeMarks[code] ?? 100}
                              onChange={e => handleCodeMarksChange(code, e.target.value)}
                              className="w-full text-center text-xs font-black text-amber-700 bg-white border border-amber-200 rounded-lg py-1 focus:ring-1 focus:ring-amber-400 outline-none"
                            />
                            <span className="text-[7px] text-gray-400 font-bold">{PAPER_CODE_LABELS[code] || code}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medium Tabs */}
                  <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-100">
                    {subjectMediums.map(medium => (
                      <button
                        key={medium}
                        type="button"
                        onClick={() => setActiveSubjectTab(medium)}
                        className={`px-3 py-1.5 rounded-t-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                          activeSubjectTab === medium
                            ? 'bg-white text-indigo-600 border-t-2 border-l border-r border-gray-200 border-t-indigo-600'
                            : 'bg-gray-50 text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {medium}
                      </button>
                    ))}
                  </div>

                  {/* Subjects for Active Medium */}
                  {activeSubjectTab && subjectsByMedium[activeSubjectTab] && (
                    <div className="space-y-3 pl-1">
                      {/* P01 Section */}
                      {subjectsByMedium[activeSubjectTab].p01.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">P01</span>
                            <span className="text-[9px] font-bold text-gray-400">First Language Paper I</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {subjectsByMedium[activeSubjectTab].p01.map(sub => {
                              const subId = sub._id || sub.id;
                              return (
                                <div key={subId} className="flex flex-col gap-1">
                                  <label className="text-[9px] font-black text-gray-500 truncate">{sub.name}</label>
                                  <input 
                                    type="number" 
                                    min="0"
                                    max="200"
                                    value={newExamMaxMarks[subId] || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setNewExamMaxMarks(prev => {
                                        const next = { ...prev };
                                        if (val === '') {
                                          delete next[subId];
                                        } else {
                                          next[subId] = Number(val);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-center focus:border-black focus:ring-1 focus:ring-black outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* P02 Section - Interlinked with P01 */}
                      {subjectsByMedium[activeSubjectTab].p02.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-purple-500 bg-purple-50 px-2 py-0.5 rounded uppercase tracking-wider">P02</span>
                            <span className="text-[9px] font-bold text-gray-400">First Language Paper II</span>
                            {subjectsByMedium[activeSubjectTab].p01.length > 0 && (
                              <span className="text-[8px] font-bold text-purple-400 bg-purple-50 px-1.5 py-0.5 rounded">(Linked to P01)</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {subjectsByMedium[activeSubjectTab].p02.map(sub => {
                              const subId = sub._id || sub.id;
                              const p01Sub = subjectsByMedium[activeSubjectTab].p01[0];
                              const p01Val = p01Sub ? newExamMaxMarks[p01Sub._id || p01Sub.id] : undefined;
                              return (
                                <div key={subId} className="flex flex-col gap-1">
                                  <label className="text-[9px] font-black text-gray-500 truncate">{sub.name}</label>
                                  <input 
                                    type="number" 
                                    min="0"
                                    max="200"
                                    value={newExamMaxMarks[subId] ?? p01Val ?? ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setNewExamMaxMarks(prev => {
                                        const next = { ...prev };
                                        if (val === '') {
                                          delete next[subId];
                                        } else {
                                          next[subId] = Number(val);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-center focus:border-black focus:ring-1 focus:ring-black outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* P03 – Second Language Section */}
                      {subjectsByMedium[activeSubjectTab].p03.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">P03</span>
                            <span className="text-[9px] font-bold text-gray-400">Second Language</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {subjectsByMedium[activeSubjectTab].p03.map(sub => {
                              const subId = sub._id || sub.id;
                              return (
                                <div key={subId} className="flex flex-col gap-1">
                                  <label className="text-[9px] font-black text-gray-500 truncate">{sub.name}</label>
                                  <input 
                                    type="number" 
                                    min="0"
                                    max="200"
                                    value={newExamMaxMarks[subId] || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setNewExamMaxMarks(prev => {
                                        const next = { ...prev };
                                        if (val === '') {
                                          delete next[subId];
                                        } else {
                                          next[subId] = Number(val);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-center focus:border-black focus:ring-1 focus:ring-black outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* P04 – Third Language Section */}
                      {subjectsByMedium[activeSubjectTab].p04.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-teal-500 bg-teal-50 px-2 py-0.5 rounded uppercase tracking-wider">P04</span>
                            <span className="text-[9px] font-bold text-gray-400">Third Language</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {subjectsByMedium[activeSubjectTab].p04.map(sub => {
                              const subId = sub._id || sub.id;
                              return (
                                <div key={subId} className="flex flex-col gap-1">
                                  <label className="text-[9px] font-black text-gray-500 truncate">{sub.name}</label>
                                  <input 
                                    type="number" 
                                    min="0"
                                    max="200"
                                    value={newExamMaxMarks[subId] || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setNewExamMaxMarks(prev => {
                                        const next = { ...prev };
                                        if (val === '') {
                                          delete next[subId];
                                        } else {
                                          next[subId] = Number(val);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-center focus:border-black focus:ring-1 focus:ring-black outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Core Subjects Section */}
                      {subjectsByMedium[activeSubjectTab].core.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wider">Core</span>
                            <span className="text-[9px] font-bold text-gray-400">Core Subjects</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {subjectsByMedium[activeSubjectTab].core.map(sub => {
                              const subId = sub._id || sub.id;
                              return (
                                <div key={subId} className="flex flex-col gap-1">
                                  <label className="text-[9px] font-black text-gray-500 truncate">{sub.name}</label>
                                  <input 
                                    type="number" 
                                    min="0"
                                    max="200"
                                    value={newExamMaxMarks[subId] || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setNewExamMaxMarks(prev => {
                                        const next = { ...prev };
                                        if (val === '') {
                                          delete next[subId];
                                        } else {
                                          next[subId] = Number(val);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-center focus:border-black focus:ring-1 focus:ring-black outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Empty state for medium */}
                      {subjectsByMedium[activeSubjectTab].p01.length === 0 && 
                       subjectsByMedium[activeSubjectTab].p02.length === 0 && 
                       subjectsByMedium[activeSubjectTab].p03.length === 0 && 
                       subjectsByMedium[activeSubjectTab].p04.length === 0 && 
                       subjectsByMedium[activeSubjectTab].core.length === 0 && (
                        <div className="text-center py-6 text-gray-400 font-bold text-[10px] uppercase tracking-wider border-2 border-dashed border-gray-100 rounded-xl">
                          No subjects found for {activeSubjectTab} medium. Add subjects in Admin → Subject Management.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 font-bold text-[10px] uppercase tracking-wider border-2 border-dashed border-gray-100 rounded-xl">
                  No subjects configured. Add subjects in Admin → Subject Management.
                </div>
              ))}
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 text-white dark:bg-[#1f6feb] hover:bg-blue-700 dark:hover:bg-[#388bfd] rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:bg-slate-300"
            >
              {isSubmitting ? "Saving..." : editingExamId ? "Save Exam Details" : "Save Exam"}
            </button>
          </form>
            </>
          ) : (
            <div className="text-center py-6 px-4 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-blue-50 border border-indigo-100 shadow-sm transition-all hover:shadow-md">
              <div className="w-16 h-16 bg-white border border-indigo-100 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm transform hover:scale-110 transition-transform duration-300">
                <PlusCircle size={32} />
              </div>
              <h2 className="text-sm font-black text-indigo-950 tracking-wider uppercase mb-2">Create New Exam</h2>
              <p className="text-[10px] text-slate-500 mb-6 font-bold uppercase tracking-wider">Configure a new exam for a specific class</p>
              <button 
                onClick={() => setIsCreatingExam(true)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg active:scale-95 flex justify-center items-center gap-2"
              >
                <Zap size={14} className="animate-pulse" />
                Start Creating
              </button>
            </div>
          )}
        </div>

        {/* List of Exams */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-black tracking-wider uppercase">Active Exams ({exams.length})</h2>
          <div className="space-y-2 lg:max-h-[400px] lg:overflow-y-auto custom-scrollbar">
            {exams.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No exams configured yet.</p>
            ) : (
              exams.map(ex => (
                <div 
                  key={ex.id}
                  onClick={() => setSelectedExamId(ex.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                    selectedExamId === ex.id 
                      ? "border-black bg-slate-50 shadow-sm" 
                      : "border-gray-100 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-black uppercase">{ex.name}</p>
                      {ex.isDefault && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded text-[9px] font-black uppercase tracking-widest border border-blue-200 dark:border-blue-800/50">Default</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={12} /> Class {ex.standard}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingExamId(ex.id);
                        setNewExamName(ex.name);
                        setNewExamStandard(ex.standard);
                        setIncludeCEMarks(ex.includeCEMarks || false);
                        setAllowCsvUpload(ex.allow_csv_upload !== false);
                        setNewMarksEntryMode(ex.marksEntryMode || 'both');
                        setHasMarkGroups(ex.hasMarkGroups !== false);
                        setNewExamIsDefault(ex.isDefault || false);
                        
                        // Parse maxMarks mapping - keys are subject IDs from DB
                        const parsedMaxMarks: Record<string, number> = {};
                        if (ex.maxMarks && Object.keys(ex.maxMarks).length > 0) {
                          Object.assign(parsedMaxMarks, ex.maxMarks);
                        }
                        setNewExamMaxMarks(parsedMaxMarks);
                        
                        setSelectedExamId(ex.id);
                      }}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        editingExamId === ex.id
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "hover:bg-gray-100 text-gray-400 hover:text-slate-700"
                      )}
                      title="Edit Exam"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerDeleteExam(ex.id, ex.name);
                      }}
                      className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete Exam"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmed Schools / Locks Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <ListTodo size={20} className="text-indigo-600" />
                </div>
                Submission & Unlock Controls
              </h2>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 pl-1">
                {selectedExam ? `Monitor & reset locks for: ${selectedExam.name}` : "Select an exam on the left"}
              </p>
            </div>
            {selectedExam && (
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                Class {selectedExam.standard}
              </span>
            )}
          </div>

          {selectedExam ? (
            <div className="space-y-6">
              {/* Submission Statistics Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div 
                  onClick={() => setIsConfirmedModalOpen(true)}
                  className="relative p-6 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[2rem] text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-95 group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                    <ShieldCheck size={100} className="text-white" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1 drop-shadow-sm">SUBMISSIONS LOCKED</p>
                    <p className="text-4xl font-black text-white mt-1 drop-shadow-md">
                      {confirmedSchoolsInDistrict.length} <span className="text-sm font-bold text-emerald-200">/ {filteredSchools.length}</span>
                    </p>
                    <div className="mt-4">
                      <span className="inline-block text-[9px] font-black text-emerald-900 uppercase bg-emerald-100/90 px-3 py-1 rounded-full tracking-widest shadow-sm backdrop-blur-sm group-hover:bg-white transition-colors">
                        View Locked List 🔍
                      </span>
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setIsPendingModalOpen(true)}
                  className="relative p-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/30 active:scale-95 group overflow-hidden"
                >
                  <div className="absolute top-0 left-0 p-4 opacity-20 transform -translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                    <ShieldAlert size={100} className="text-white" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-amber-100 uppercase tracking-widest mb-1 drop-shadow-sm">PENDING SUBMISSIONS</p>
                    <p className="text-4xl font-black text-white mt-1 drop-shadow-md">
                      {filteredSchools.length - confirmedSchoolsInDistrict.length} <span className="text-sm font-bold text-amber-200">/ {filteredSchools.length}</span>
                    </p>
                    <div className="mt-4">
                      <span className="inline-block text-[9px] font-black text-amber-900 uppercase bg-amber-100/90 px-3 py-1 rounded-full tracking-widest shadow-sm backdrop-blur-sm group-hover:bg-white transition-colors">
                        View Pending List 🔍
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmed schools List */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Confirmed Submissions Ready For Reset
                  </h3>
                  
                  {confirmedSchoolIds.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {hasAllAccess && (
                        <>
                          <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
                            <select 
                              value={resetFilterDistrictId}
                              onChange={(e) => {
                                setResetFilterDistrictId(e.target.value);
                                setResetFilterEduId('ALL');
                              }}
                              className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
                            >
                              <option value="ALL" className="px-3 py-1.5 text-xs font-bold">ALL REVENUE DISTRICTS</option>
                              {districts.map(d => (
                                <option key={d.id} value={d.id} className="px-3 py-1.5 text-xs font-bold">{d.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
                            <select 
                              value={resetFilterEduId}
                              onChange={(e) => setResetFilterEduId(e.target.value)}
                              className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
                            >
                              <option value="ALL" className="px-3 py-1.5 text-xs font-bold">ALL EDU DISTRICTS</option>
                              {eduDistricts
                                .filter(ed => resetFilterDistrictId === 'ALL' || ed.districtId === resetFilterDistrictId)
                                .map(ed => (
                                <option key={ed.id} value={ed.id} className="px-3 py-1.5 text-xs font-bold">{ed.name}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                      
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search schools..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[11px] font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-slate-50 transition-all min-w-[180px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {confirmedSchoolIds.length === 0 ? (
                  <div className="p-10 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] text-center text-slate-400 transition-all">
                    <ShieldAlert className="mx-auto mb-3 text-slate-300" size={32} />
                    <p className="text-sm font-bold uppercase tracking-widest">No Locked Schools</p>
                    <p className="text-[10px] mt-1 font-semibold">No schools have locked operations for this term yet.</p>
                  </div>
                ) : filteredConfirmedSchoolIds.length === 0 ? (
                  <div className="p-10 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] text-center text-slate-400">
                    <Search className="mx-auto mb-3 text-slate-300" size={32} />
                    <p className="text-sm font-bold uppercase tracking-widest">No Matches Found</p>
                    <p className="text-[10px] mt-1 font-semibold">No confirmed schools matched "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredConfirmedSchoolIds
                      .filter(schoolId => {
                        const s = filteredSchools.find(sch => sch.id === schoolId);
                        if (!s) return false;
                        
                        if (resetFilterEduId !== 'ALL' && s.subDistrictId !== resetFilterEduId) {
                          return false;
                        }
                        if (resetFilterDistrictId !== 'ALL' && resetFilterEduId === 'ALL') {
                           const sEdu = eduDistricts.find(ed => ed.id === s.subDistrictId);
                           if (sEdu && sEdu.districtId !== resetFilterDistrictId) return false;
                        }
                        return true;
                      })
                      .map((schoolId) => {
                      const school = filteredSchools.find(s => s.id === schoolId);
                      return (
                        <div key={schoolId} className="px-3 sm:px-4 py-3 bg-white border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-sm rounded-xl flex items-start sm:items-center justify-between gap-3 transition-all duration-200 group">
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 sm:h-8 sm:w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-100 transition-transform mt-1 sm:mt-0">
                              <Building2 size={18} className="sm:w-4 sm:h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="text-[13px] sm:text-xs font-black text-slate-800 uppercase leading-snug" title={school ? `${school.code} - ${school.name}` : "Unknown School"}>
                                <span className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded mr-2 mb-1 sm:mb-0 border border-indigo-200/50">{school ? school.code : "N/A"}</span>
                                <span>{school ? school.name : "Unknown School"}</span>
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                {(() => {
                                  const val = (selectedExam.confirmations || {})[schoolId];
                                  if (!val) return null;
                                  const parts = val.split('|');
                                  const dateStr = parts[0];
                                  const userStr = parts[1] || 'System';
                                  return (
                                    <>
                                      <span className="flex items-center gap-1" title="Confirmed By">
                                        <User size={10} className="text-indigo-400" /> {userStr}
                                      </span>
                                      <span className="flex items-center gap-1" title="Confirmed At">
                                        <Clock size={10} className="text-emerald-400" /> {formatDateTime(dateStr)}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => triggerResetSchoolLock(selectedExam.id, schoolId, school?.name || 'School')}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                            title="Reset Lock Status"
                          >
                            <Unlock size={12} className="group-hover:animate-bounce" />
                            Reset
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <Calendar size={36} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider">No Exam Selected</p>
              <p className="text-xs mt-1">Please configure or choose an exam to monitor and unlock submissions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmed / Locked Schools Modal */}
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
                        className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl py-2.5 px-3 pr-10 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        <option value="ALL">All Educational Districts</option>
                        {eduDistricts.map((edu) => (
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
                      const filtered = filteredSchools.filter(s => 
                        confirmedSchoolIds.includes(s.id) && 
                        (selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId) && (
                          s.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
                          s.code.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                      );
                      const eduName = selectedModalEduId === 'ALL' ? 'All Educational Districts' : (eduDistricts.find(e => e.id === selectedModalEduId)?.name || 'Educational District');
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
                      const filtered = filteredSchools.filter(s => 
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
                    {filteredSchools
                      .filter(s => confirmedSchoolIds.includes(s.id))
                      .filter(s => selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId)
                      .filter(s => !modalSearch.trim() || s.name.toLowerCase().includes(modalSearch.toLowerCase()) || s.code.toLowerCase().includes(modalSearch.toLowerCase()))
                      .map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1f242c]/30 text-xs font-bold transition-all text-slate-800 dark:text-slate-200">
                          <td className="px-6 py-4 text-center text-gray-400">{idx + 1}</td>
                          <td className="px-6 py-4 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">{s.code}</td>
                          <td className="px-6 py-4 font-black uppercase text-black dark:text-white">{s.name}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{s.hmName || 'N/A'}</td>
                          <td className="px-6 py-4 text-center font-mono text-gray-600 dark:text-gray-300">{s.hmMobile || s.phone || 'N/A'}</td>
                          <td className="p-3 text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">
                            {(() => {
                              const val = (selectedExam.confirmations || {})[s.id];
                              if (!val) return 'N/A';
                              const parts = val.split('|');
                              return formatDateTime(parts[0]);
                            })()}
                          </td>
                        </tr>
                      ))}
                    {filteredSchools.filter(s => 
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
                        className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-2xl py-2.5 px-3 pr-10 text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        <option value="ALL">All Educational Districts</option>
                        {eduDistricts.map((edu) => (
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
                      const filtered = filteredSchools.filter(s => 
                        !confirmedSchoolIds.includes(s.id) && 
                        (selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId) && (
                          s.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
                          s.code.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                      );
                      const eduName = selectedModalEduId === 'ALL' ? 'All Educational Districts' : (eduDistricts.find(e => e.id === selectedModalEduId)?.name || 'Educational District');
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
                      const filtered = filteredSchools.filter(s => 
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
                    {filteredSchools
                      .filter(s => !confirmedSchoolIds.includes(s.id))
                      .filter(s => selectedModalEduId === 'ALL' || s.subDistrictId === selectedModalEduId)
                      .filter(s => !modalSearch.trim() || s.name.toLowerCase().includes(modalSearch.toLowerCase()) || s.code.toLowerCase().includes(modalSearch.toLowerCase()))
                      .map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1f242c]/30 text-xs font-bold transition-all text-slate-800 dark:text-slate-200">
                          <td className="px-6 py-4 text-center text-gray-400">{idx + 1}</td>
                          <td className="px-6 py-4 text-center font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">{s.code}</td>
                          <td className="px-6 py-4 font-black uppercase text-black dark:text-white">{s.name}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{s.hmName || 'N/A'}</td>
                          <td className="px-6 py-4 text-center font-mono text-gray-600 dark:text-gray-300">{s.hmMobile || s.phone || 'N/A'}</td>
                        </tr>
                      ))}
                    {filteredSchools.filter(s => 
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

export default ExamManagementPage;
