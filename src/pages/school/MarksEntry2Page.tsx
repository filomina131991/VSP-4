import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Save, AlertCircle, FileEdit, Settings2, Eye, EyeOff, Plus, Trash2, CheckSquare, X, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/common/Modal';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { MarksEntryBulkGrid } from './MarksEntryBulkGrid';
import PageLoader from '../../components/common/PageLoader';
import ExamSelect from '../../components/common/ExamSelect';
import Dropdown from '../../components/common/Dropdown';
import { getSubjectShortLabel, sortSubjects } from '../../lib/subjectUtils';

import PremiumExamConfigModal from '../../components/school/PremiumExamConfigModal';
import { draftStore, DraftKeyParams, DraftMetadata, StudentMarkDraftRecord, SyncStatusState, ConflictedRow } from '../../lib/draftStore';
import MarksEntrySyncStatus from '../../components/school/MarksEntrySyncStatus';
import DraftRecoveryModal from '../../components/school/DraftRecoveryModal';
import ConflictResolutionModal from '../../components/school/ConflictResolutionModal';


interface Student {
  id: string;
  name: string;
  className: string;
  globalId: string;
  division?: string;
  medium?: string;
  subjects?: string[];
  gender?: string;
}

interface MarkGroup {
  name: string;
  maxQuestions: number;
  maxMarks: number;
  total: number;
}

interface SubjectMarkData {
  isAbsent?: boolean;
  totalObtained?: number;
  grade?: string;
  isEmpty?: boolean;
  markGroups: {
    name: string;
    maxQuestions: number;
    maxMarks: number;
    total: number;
    marksObtained: string | number;
  }[];
}

import { Medium } from '../../types';

const getMediumSuffixByName = (mediumName: string, mediums: Medium[] = []): string => {
  const found = mediums.find(m => m.shortName === mediumName || m.name === mediumName || m.code === mediumName);
  return found ? found.code : mediumName.substring(0, 2).toUpperCase();
};

const getAllMediumSuffixes = (mediumNames: string[], mediums: Medium[] = []): string[] => {
  return mediumNames.map(m => getMediumSuffixByName(m, mediums));
};

const MarksEntry2Page: React.FC = () => {
  const { user } = useAuth();
  const { mediums } = useData();
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [gradeConfig, setGradeConfig] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedMedium, setSelectedMedium] = useState<string>('');
  const [sortOption, setSortOption] = useState<'REG_NO' | 'MALE_FEMALE_ALPHA' | 'FEMALE_MALE_ALPHA' | 'ALPHA'>(() => {
    return (localStorage.getItem('marksEntrySortPreference') as any) || 'FEMALE_MALE_ALPHA';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [marksData, setMarksData] = useState<Record<string, Record<string, SubjectMarkData>>>({});
  const [bulkMarks, setBulkMarks] = useState<any[]>([]);
  const [studentAbsentMap, setStudentAbsentMap] = useState<Record<string, boolean>>({});

  const [lockedSubjects, setLockedSubjects] = useState<string[]>([]);
  const [isFinalLocked, setIsFinalLocked] = useState<boolean>(false);
  const [allSubjectsCompleted, setAllSubjectsCompleted] = useState<boolean>(false);
  const [schoolTeachers, setSchoolTeachers] = useState<any[]>([]);
  const [teacherDashboardData, setTeacherDashboardData] = useState<any>(null);
  const [hasDeclaredFinal, setHasDeclaredFinal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSubjectsForReset, setSelectedSubjectsForReset] = useState<string[]>([]);
  const [isResettingSubjects, setIsResettingSubjects] = useState<boolean>(false);
  const [showExamConfigModal, setShowExamConfigModal] = useState<boolean>(false);
  const [configuredExamIds, setConfiguredExamIds] = useState<string[]>([]);
  const [isSubjectsCollapsed, setIsSubjectsCollapsed] = useState<boolean>(true);
  const [langValidation, setLangValidation] = useState<any>(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedStudentRowIds, setSelectedStudentRowIds] = useState<string[]>([]);
  const [subjectWorkflowStatuses, setSubjectWorkflowStatuses] = useState<Record<string, string>>({});
  const [rejectedInputs, setRejectedInputs] = useState<Set<string>>(new Set());

  // Offline Draft & Sync Status State
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>('DRAFT_SAVED_LOCALLY');
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  const [initialDbTimestamp, setInitialDbTimestamp] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Recovery Modal State
  const [recoveryModalOpen, setRecoveryModalOpen] = useState<boolean>(false);
  const [recoveryMetadata, setRecoveryMetadata] = useState<DraftMetadata | null>(null);
  const [recoveryRecords, setRecoveryRecords] = useState<Record<string, Record<string, StudentMarkDraftRecord>>>({});
  const [activeRecoverySubId, setActiveRecoverySubId] = useState<string>('');

  // Conflict Resolution Modal State
  const [conflictModalOpen, setConflictModalOpen] = useState<boolean>(false);
  const [conflictedRows, setConflictedRows] = useState<ConflictedRow[]>([]);
  const [pendingSaveConfirm, setPendingSaveConfirm] = useState<boolean>(false);
  const [pendingSubjectToConfirm, setPendingSubjectToConfirm] = useState<any>(null);

  const getDraftParams = (subId: string): DraftKeyParams => {
    const examObj = exams.find(e => e.id === selectedExamId);
    const subObj = availableSubjects.find(s => s.id === subId) || subjects.find(s => s.id === subId);
    return {
      schoolId: user?.schoolId || user?.id || 'all',
      academicYear: (examObj as any)?.academicYear || '2025-2026',
      examId: selectedExamId,
      mediumId: selectedMedium || 'ALL',
      className: selectedClass,
      division: selectedDivision || 'ALL',
      subjectId: subId,
      teacherId: user?.id || 'anonymous',
      examName: (examObj as any)?.name || selectedExamId,
      subjectName: (subObj as any)?.name || subId,
    };
  };

  useEffect(() => {
    localStorage.setItem('marksEntrySortPreference', sortOption);
  }, [sortOption]);

  useEffect(() => {
    loadInitialData();
  }, []);



  const [dbClasses, setDbClasses] = useState<{ className: string; division: string }[]>([]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const promises: any[] = [
        apiClient.get('/management/exams'),
        apiClient.get('/management/subjects'),
        apiClient.get('/management/grades'),
        apiClient.get('/school/configured-exams')
      ];

      if (user?.role === 'SCHOOL') {
        promises.push(apiClient.get('/school/classes-divisions'));
        promises.push(apiClient.get('/school/teachers'));
      } else if (user?.role === 'TEACHER') {
        promises.push(apiClient.get('/teacher/dashboard'));
      }

      const results = await Promise.all(promises);
      const [examsRes, subjectsRes, gradesRes, confExamsRes] = results;

      const configuredIds: string[] = confExamsRes.data || [];
      setConfiguredExamIds(configuredIds);
      setExams(examsRes.data || []);

      const sortedSubjects = sortSubjects(subjectsRes.data || []);
      setSubjects(sortedSubjects);
      setGradeConfig(gradesRes.data);

      let fetchedDbClasses: { className: string; division: string }[] = [];
      if (user?.role === 'SCHOOL' && results[4]) {
        fetchedDbClasses = results[4].data;
        if (results[5]) {
          const teachers = results[5].data;
          setSchoolTeachers(teachers);
          
          if (teachers.length === 0) {
            toast.error('No Teacher Assignments found. Please add teachers.');
            setTimeout(() => {
              navigate('/dashboard/teachers');
            }, 1000);
            return;
          }
        }
      } else if (user?.role === 'TEACHER' && results[4]) {
        setTeacherDashboardData(results[4].data);
        const teacherClasses = results[4].data.assignedClasses || [];
        fetchedDbClasses = teacherClasses.map((cStr: string) => {
          const match = cStr.match(/^(\d+|LKG|UKG|PRE-KG)(.*)$/i);
          if (match) {
            return { className: match[1], division: (match[2] || '').trim() };
          }
          return { className: cStr, division: '' };
        });
      }
      setDbClasses(fetchedDbClasses);

      // Auto-select first class if not already selected and we have classes
      if (fetchedDbClasses.length > 0) {
        const uniqueClasses = Array.from(new Set(fetchedDbClasses.map(c => c.className)));
        if (!uniqueClasses.includes(selectedClass)) {
          setSelectedClass(uniqueClasses[0]);
        }
      }
    } catch (err) {
      toast.error('Failed to load initial data');
    } finally {
      setIsLoading(false);
    }
  };

  const refetchExams = async () => {
    try {
      const [examsRes, confExamsRes] = await Promise.all([
        apiClient.get('/management/exams'),
        apiClient.get('/school/configured-exams')
      ]);
      const configuredIds: string[] = confExamsRes.data || [];
      setConfiguredExamIds(configuredIds);
      setExams(examsRes.data || []);
    } catch (err) {
      console.error('Failed to refetch exams:', err);
    }
  };

  const [schoolConfig, setSchoolConfig] = useState<any[]>([]);

  const reloadExamConfig = async (examId: string) => {
    try {
      const res = await apiClient.get(`/school/exam-config/${examId}`, {
        params: { schoolId: user?.schoolId || user?.id }
      });
      const savedConfig = res.data.subjects || [];
      setSchoolConfig(savedConfig);
    } catch (err) {
      toast.error('Failed to load exam config');
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      reloadExamConfig(selectedExamId);
    }
  }, [selectedExamId]);

  // Language Distribution Validation on Marks Entry
  useEffect(() => {
    const fetchLangValidation = async () => {
      const schoolId = user?.schoolId || user?.id;
      if (!schoolId) return;
      try {
        const res = await apiClient.get(`/school/language-validation?schoolId=${schoolId}`);
        setLangValidation(res.data);
      } catch (err) {
        console.error('Language validation error:', err);
      }
    };
    fetchLangValidation();
  }, [user]);

  useEffect(() => {
    if (langValidation && !langValidation.isValid) {
      setShowLangModal(true);
    }
  }, [langValidation]);

  const [classStudents, setClassStudents] = useState<any[]>([]);

  useEffect(() => {
    if (selectedClass) {
      const fetchClassStudents = async () => {
        try {
          const res = await apiClient.get(`/management/students`, {
            params: { schoolId: user?.schoolId || user?.id, className: selectedClass }
          });
          const fetched = res.data.students || res.data;
          setClassStudents(fetched);
          
          if (!selectedMedium && fetched.length > 0) {
            const studentMediums = new Set<string>();
            fetched.forEach((st: any) => { if (st.medium) studentMediums.add(st.medium); });
            const allMediumNames = mediums.length > 0 ? mediums.map(m => m.shortName) : Array.from(studentMediums);
            const resolveMed = (val: string) => mediums.find(m => m.id === val || m.shortName === val || m.code === val.toUpperCase() || m.name === val)?.shortName ?? val;
            const teacherMeds = [
              ...((user as any)?.mediums || []),
              ...(teacherDashboardData?.mediums || []),
              ...(teacherDashboardData?.teacherAssignments || []).map((a: any) => a.medium)
            ].filter(Boolean);
            const rawAllowed = user?.role === 'TEACHER' && teacherMeds.length > 0 ? Array.from(new Set(teacherMeds)) : allMediumNames;
            const allowedMediums = rawAllowed.map(resolveMed);
            const availableMeds = Array.from(studentMediums).filter(m => allowedMediums.includes(m));
            if (availableMeds.length === 1) {
              setSelectedMedium(availableMeds[0]);
            }
          }
        } catch (e) {
          console.error("Failed to fetch class students for filtering", e);
        }
      };
      fetchClassStudents();
    } else {
      setClassStudents([]);
    }
  }, [selectedClass, user]);

  useEffect(() => {
    setSelectedDivision('');
  }, [selectedMedium]);

  const availableSubjects = useMemo(() => {
    const allowedIds = schoolConfig.map((s: any) => s.subjectId);
    let subs = schoolConfig.length > 0
      ? subjects.filter(s => allowedIds.includes(s.id))
      : [];
    
    // Filter subjects by selected medium
    if (selectedMedium) {
      const normSel = selectedMedium.trim().toLowerCase();
      const selMedObj = mediums.find(m => 
        m.id === selectedMedium || 
        m.shortName.toLowerCase() === normSel || 
        m.code.toLowerCase() === normSel || 
        m.name.toLowerCase() === normSel
      );
      const targetShortName = selMedObj ? selMedObj.shortName.toLowerCase() : normSel;

      let reqSuffix = '';
      if (targetShortName === 'tamil') reqSuffix = 'TM';
      else if (targetShortName === 'english') reqSuffix = 'EM';
      else if (targetShortName === 'malayalam') reqSuffix = 'MM';
      else if (targetShortName === 'kannada') reqSuffix = 'KM';
      else if (targetShortName === 'urdu') reqSuffix = 'UR';
      else if (targetShortName === 'arabic') reqSuffix = 'AR';

      const allSuffixes = ['TM', 'EM', 'MM', 'KM', 'UR', 'AR', 'HI'];

      subs = subs.filter(s => {
        const nameUpper = (s.name || '').trim().toUpperCase();
        const shortUpper = (s.shortName || '').trim().toUpperCase();
        const sMedium = (s.medium || '').trim().toUpperCase();

        if (s.mediumId && selMedObj && (String(s.mediumId) === String(selMedObj.id) || String(s.mediumId) === String(selMedObj._id))) {
          return true;
        }

        if (sMedium) {
          if (sMedium.toLowerCase() === targetShortName || sMedium.toLowerCase() === reqSuffix.toLowerCase()) return true;
          if (targetShortName === 'tamil' && (sMedium === 'TM' || sMedium.includes('TAMIL'))) return true;
          if (targetShortName === 'english' && (sMedium === 'EM' || sMedium.includes('ENGLISH'))) return true;
          if (targetShortName === 'malayalam' && (sMedium === 'MM' || sMedium.includes('MALAYALAM'))) return true;
          if (targetShortName === 'kannada' && (sMedium === 'KM' || sMedium.includes('KANNADA'))) return true;
          if (targetShortName === 'urdu' && (sMedium === 'UR' || sMedium.includes('URDU'))) return true;
          if (targetShortName === 'arabic' && (sMedium === 'AR' || sMedium.includes('ARABIC'))) return true;
          return false;
        }

        const endingSuffix = allSuffixes.find(suf => nameUpper.endsWith(' ' + suf) || nameUpper.endsWith('-' + suf));
        if (endingSuffix) {
          return reqSuffix ? (nameUpper.endsWith(' ' + reqSuffix) || nameUpper.endsWith('-' + reqSuffix)) : true;
        }

        if ((shortUpper === 'P01' || shortUpper === 'P02') && classStudents.length > 0) {
          const langs = new Set<string>();
          classStudents.forEach(st => {
            if (st.firstLangPaper1) langs.add(st.firstLangPaper1.trim().toUpperCase());
            if (st.firstLangPaper2) langs.add(st.firstLangPaper2.trim().toUpperCase());
          });
          if (langs.size > 0) {
            const baseName = nameUpper.replace(/\s+(TM|EM|MM|KM|UR|AR|HI)\b/g, '').trim();
            return langs.has(baseName) || Array.from(langs).some(l => baseName.includes(l) || l.includes(baseName));
          }
        }

        return true;
      });
    }

    if (user?.role === 'TEACHER') {
      const teacherSubs = [
        ...(Array.isArray(user?.teachingSubjects) ? user.teachingSubjects : []),
        ...(Array.isArray(teacherDashboardData?.teachingSubjects) ? teacherDashboardData.teachingSubjects : []),
        ...(Array.isArray(teacherDashboardData?.teacherAssignments) ? teacherDashboardData.teacherAssignments.map((a: any) => {
          if (selectedClass && a.className && !a.className.startsWith(selectedClass)) return null;
          if (selectedMedium && a.medium && a.medium !== selectedMedium && !a.medium.toLowerCase().includes(selectedMedium.toLowerCase())) return null;
          return a.subject;
        }).filter(Boolean) : [])
      ];

      if (teacherSubs.length > 0) {
        subs = subs.filter(s => {
          const dbName = (s.name || '').toUpperCase();
          const dbShort = (s.shortName || '').toUpperCase();
          const stripP = (v: string) => v.replace(/\s*-\s*P\d+\b/gi, '').replace(/\s+/g, ' ').trim();
          const stripMed = (v: string) => v.replace(/\s+(TM|EM|MM|KM)\b$/i, '').replace(/\s+/g, ' ').trim();
          const normalize = (v: string) => stripMed(stripP(v));

          return teacherSubs.some((ts: string) => {
            const taught = ts.toUpperCase();
            const normTaught = normalize(taught);
            const normDb = normalize(dbName);

            if (normTaught.includes(normDb) || normDb.includes(normTaught)) return true;
            if (normTaught === normDb) return true;
            if (dbShort && normTaught.includes(dbShort)) return true;

            if (taught.includes('MATHS') && dbName.includes('MATHEMATICS')) return true;
            if (taught.includes('ENGLISH') && dbName.includes('ENGLISH (SECOND')) return true;
            if (taught.includes('HINDI') && (dbName.includes('HINDI (THIRD') || dbName.includes('ADDL. HINDI'))) return true;
            if (taught.includes('SPECIAL ENGLISH') && dbName.includes('SPECIAL. ENGLISH')) return true;
            return taught.includes(dbName) || dbName.includes(taught);
          });
        });
      }
    }
    return sortSubjects(subs);
  }, [subjects, schoolConfig, user, selectedMedium, classStudents, mediums, teacherDashboardData, selectedClass]);



  const studentSubjectApplicability = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    const studentsToUse = classStudents.length > 0 ? classStudents : students;

    studentsToUse.forEach((st: any) => {
      const applicable = new Set<string>();
      // Fallback: If st.subjects isn't fully populated, we can also use their medium/languages to infer
      const studentSubjectNames = new Set(
        (st.subjects || []).map((s: string) => s.trim().toUpperCase())
      );
      
      // Also add legacy language fields just in case they are used instead of st.subjects
      if (st.firstLangPaper1) studentSubjectNames.add(st.firstLangPaper1.trim().toUpperCase());
      if (st.firstLangPaper2) studentSubjectNames.add(st.firstLangPaper2.trim().toUpperCase());
      if (st.secondLang) studentSubjectNames.add(st.secondLang.trim().toUpperCase());
      if (st.thirdLang) studentSubjectNames.add(st.thirdLang.trim().toUpperCase());
      
      // Add medium to help match core subjects if they are medium-specific
      if (st.medium) studentSubjectNames.add(st.medium.trim().toUpperCase());

      availableSubjects.forEach(paper => {
        // paper is actually a Paper object from SchoolExamConfig
        const mappedSubjects = paper.mappedSubjects || [];
        
        // If a paper has no subjects mapped, it might be open to everyone?
        if (mappedSubjects.length === 0) {
           applicable.add(paper.id);
           return;
        }

        let isApplicable = false;
        for (const subId of mappedSubjects) {
           const subObj = subjects.find(s => s.id === subId);
           if (!subObj) continue;
           
           const subName = (subObj.name || '').trim().toUpperCase();
           
           // Direct match in student.subjects
           if (studentSubjectNames.has(subName)) {
             isApplicable = true;
             break;
           }
           
           // Medium match logic:
           // If subject is a core subject with a medium suffix (e.g. MATHEMATICS TM)
           if (st.medium) {
             const med = st.medium.toUpperCase();
             let suffix = '';
             if (med === 'TAMIL') suffix = ' TM';
             if (med === 'ENGLISH') suffix = ' EM';
             if (med === 'MALAYALAM') suffix = ' MM';
             
             if (suffix && subName.endsWith(suffix)) {
                // If it's a core subject (like Maths, Science, Social) and matches medium, it's applicable
                if (subName.includes('MATHEMATICS') || subName.includes('SCIENCE') || subName.includes('SOCIAL')) {
                  isApplicable = true;
                  break;
                }
             }
           }
        }
        
        if (isApplicable) {
           applicable.add(paper.id);
        }
      });
      map[st.id] = applicable;
    });
    return map;
  }, [classStudents, students, availableSubjects, subjects]);

  const isSubjectApplicable = useCallback((studentId: string, subjectId: string): boolean => {
    const applicable = studentSubjectApplicability[studentId];
    if (!applicable) return true; // Default to true if not found to avoid blocking
    return applicable.has(subjectId);
  }, [studentSubjectApplicability]);

  const currentSchoolConfirmedSubjects = useMemo(() => {
    const selectedExam = exams.find(e => e.id === selectedExamId);
    if (!selectedExam || !selectedExam.confirmedSubjects) return [];
    const schoolId = user?.schoolId || user?.id;

    let confirmedList: string[] = [];
    if (typeof selectedExam.confirmedSubjects.get === 'function') {
      confirmedList = selectedExam.confirmedSubjects.get(schoolId) || [];
    } else if (selectedExam.confirmedSubjects instanceof Map) {
      confirmedList = selectedExam.confirmedSubjects.get(schoolId) || [];
    } else {
      confirmedList = (selectedExam.confirmedSubjects as any)[schoolId] || [];
    }
    return confirmedList;
  }, [exams, selectedExamId, user]);

  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (user?.role === 'TEACHER') {
        if (selectedSubjectIds.length === 0 || !selectedSubjectIds.some(id => availableSubjects.some(s => s.id === id))) {
          setSelectedSubjectIds([availableSubjects[0].id]);
        }
      } else {
        setSelectedSubjectIds(availableSubjects.map(s => s.id));
      }
    } else {
      setSelectedSubjectIds([]);
    }
  }, [availableSubjects, selectedMedium, user?.role]);

  const selectedExamObj = useMemo(() => exams.find(e => e.id === selectedExamId), [exams, selectedExamId]);
  const isBulkMode = selectedExamObj && selectedExamObj.hasMarkGroups === false;

  useEffect(() => {
    if (selectedExamId && (selectedSubjectIds.length > 0 || isBulkMode)) {
      loadStudentsAndMarks();
    } else if (!selectedExamId || (!isBulkMode && selectedSubjectIds.length === 0)) {
      setStudents([]);
      setMarksData({});
    }
  }, [selectedExamId, selectedSubjectIds, selectedClass, isBulkMode]);

  const getGroupsForSubject = (subId: string): MarkGroup[] => {
    if (!schoolConfig || !subId) return [];
    const subConfig = schoolConfig.find((s: any) => s.subjectId === subId);
    const groups = subConfig?.groups || [];
    
    if (user?.role === 'SCHOOL') {
      const totalMax = groups.reduce((acc: number, g: any) => acc + (g.total || 0), 0);
      return [{
        name: 'Total Marks',
        maxQuestions: 1,
        maxMarks: totalMax,
        total: totalMax
      }];
    }
    
    return groups;
  };

  const loadStudentsAndMarks = async () => {
    setIsLoading(true);
    setHasUnsavedChanges(false);
    try {
      const studentsRes = await apiClient.get(`/management/students`, {
        params: { schoolId: user?.schoolId || user?.id, className: selectedClass }
      });
      const fetchedStudents = studentsRes.data.students || studentsRes.data;
      setStudents(fetchedStudents);

      if (isBulkMode) {
        const marksReq = await apiClient.get(`/marks/batch-all`, { params: { examId: selectedExamId, schoolId: user?.schoolId || user?.id, className: selectedClass } });
        const fetchedBulk = marksReq.data.marks || marksReq.data || [];
        setBulkMarks(fetchedBulk);
        setAllSubjectsCompleted(marksReq.data.allCompleted || false);
        setIsFinalLocked(marksReq.data.isFinalLocked || false);

        let bulkTs = 0;
        if (Array.isArray(fetchedBulk)) {
          fetchedBulk.forEach((m: any) => {
            if (m.updatedAt) bulkTs = Math.max(bulkTs, new Date(m.updatedAt).getTime());
          });
        }
        setInitialDbTimestamp(bulkTs);

        const unsavedBySub: Record<string, Record<string, StudentMarkDraftRecord>> = {};
        let latestMeta: DraftMetadata | null = null;
        const subjectsToCheck = availableSubjects.length > 0 ? availableSubjects.map(s => s.id) : selectedSubjectIds;
        for (const subId of subjectsToCheck) {
          const params = getDraftParams(subId);
          const draft = draftStore.findDraft(params, bulkTs);
          if (draft && draft.metadata && Object.keys(draft.records).length > 0) {
            unsavedBySub[subId] = draft.records;
            if (!latestMeta || draft.metadata.lastSavedTime > latestMeta.lastSavedTime) {
              latestMeta = draft.metadata;
            }
          }
        }
        if (Object.keys(unsavedBySub).length > 0 && latestMeta && !showExamConfigModal) {
          setRecoveryMetadata(latestMeta);
          setRecoveryRecords(unsavedBySub);
          setActiveRecoverySubId(Object.keys(unsavedBySub)[0] || '');
          setRecoveryModalOpen(true);
          setSyncStatus('UNSAVED_CHANGES');
          setLastSavedTime(latestMeta.lastSavedTime);
        } else {
          setSyncStatus('DRAFT_SAVED_LOCALLY');
        }
      } else {
        const newMarksData: Record<string, Record<string, SubjectMarkData>> = {};
        fetchedStudents.forEach((st: Student) => {
          newMarksData[st.id] = {};
          selectedSubjectIds.forEach(subId => {
            const confGroups = getGroupsForSubject(subId);
            newMarksData[st.id][subId] = {
              isAbsent: false,
              markGroups: confGroups.map(g => ({
                name: g.name,
                maxQuestions: g.maxQuestions,
                maxMarks: g.maxMarks,
                total: g.total,
                marksObtained: ''
              }))
            };
          });
        });

        let loadedLock = false;
        let loadedFinalLock = false;
        let allComp = true;
        const workflowMap: Record<string, string> = {};

        await Promise.all(selectedSubjectIds.map(async (subId) => {
          try {
            const marksRes = await apiClient.get(`/marks/batch`, { params: { examId: selectedExamId, subjectId: subId, schoolId: user?.schoolId || user?.id, className: selectedClass } });
            const fetchedMarks = marksRes.data.marks || marksRes.data;
            if (marksRes.data.allCompleted === false) allComp = false;
            if (marksRes.data.subjectWorkflowStatus) {
              workflowMap[subId] = marksRes.data.subjectWorkflowStatus;
            }

            if (fetchedMarks && fetchedMarks.length > 0) {
              fetchedMarks.forEach((m: any) => {
                if (m.locked) loadedLock = true;
                if (m.finalLocked) loadedFinalLock = true;
                if (newMarksData[m.studentId] && newMarksData[m.studentId][subId]) {
                  (newMarksData[m.studentId][subId] as any).updatedAt = m.updatedAt || m.createdAt || new Date(0);
                  if (m.grade === 'Ab') newMarksData[m.studentId][subId].isAbsent = true;
                  if (m.markGroups && m.markGroups.length > 0) {
                    newMarksData[m.studentId][subId].markGroups = newMarksData[m.studentId][subId].markGroups.map(g => {
                      if (user?.role === 'SCHOOL' && g.name === 'Total Marks') {
                        return { ...g, marksObtained: (m.totalObtained !== undefined && m.totalObtained !== null) ? m.totalObtained.toString() : '' };
                      }
                      const existing = m.markGroups.find((mg: any) => mg.name === g.name);
                      return existing ? { ...g, marksObtained: existing.marksObtained } : g;
                    });
                  }
                }
              });
            }
          } catch (e) {
            console.error(e);
          }
        }));

        setLockedSubjects(currentSchoolConfirmedSubjects);
        setIsFinalLocked(loadedFinalLock);
        setSubjectWorkflowStatuses(workflowMap);

        setMarksData(newMarksData);

        const absentMap: Record<string, boolean> = {};
        fetchedStudents.forEach((st: Student) => {
          if (selectedSubjectIds.some(subId => newMarksData[st.id]?.[subId]?.isAbsent)) {
            absentMap[st.id] = true;
          }
        });
        setStudentAbsentMap(absentMap);

        let latestDbTs = 0;
        Object.values(newMarksData).forEach(studObj => {
          Object.values(studObj).forEach(subObj => {
            if ((subObj as any).updatedAt) {
              latestDbTs = Math.max(latestDbTs, new Date((subObj as any).updatedAt).getTime());
            }
          });
        });
        setInitialDbTimestamp(latestDbTs);

        const unsavedBySub: Record<string, Record<string, StudentMarkDraftRecord>> = {};
        let latestMeta: DraftMetadata | null = null;
        for (const subId of selectedSubjectIds) {
          const params = getDraftParams(subId);
          const draft = draftStore.findDraft(params, latestDbTs);
          if (draft && draft.metadata && Object.keys(draft.records).length > 0) {
            unsavedBySub[subId] = draft.records;
            if (!latestMeta || draft.metadata.lastSavedTime > latestMeta.lastSavedTime) {
              latestMeta = draft.metadata;
            }
          }
        }
        if (Object.keys(unsavedBySub).length > 0 && latestMeta && !showExamConfigModal) {
          setRecoveryMetadata(latestMeta);
          setRecoveryRecords(unsavedBySub);
          setActiveRecoverySubId(Object.keys(unsavedBySub)[0] || '');
          setRecoveryModalOpen(true);
          setSyncStatus('UNSAVED_CHANGES');
          setLastSavedTime(latestMeta.lastSavedTime);
        } else {
          setSyncStatus('DRAFT_SAVED_LOCALLY');
        }

        let allInputsRecheck = true;
        if (fetchedStudents.length === 0 || availableSubjects.length === 0) {
          allInputsRecheck = false;
        } else {
          for (const s of fetchedStudents) {
            if (absentMap[s.id]) continue;
            for (const sub of availableSubjects) {
              if (!isSubjectApplicable(s.id, sub.id)) continue;
              const data = newMarksData[s.id]?.[sub.id];
              if (!data) {
                allInputsRecheck = false;
                break;
              }
              const hasEmpty = data.markGroups.some((g: any) => g.marksObtained === '' || g.marksObtained === null || g.marksObtained === undefined);
              if (hasEmpty) {
                allInputsRecheck = false;
                break;
              }
            }
            if (!allInputsRecheck) break;
          }
        }
        setAllSubjectsCompleted(allComp && allInputsRecheck);
      }
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkChange = (studentId: string, subjectId: string, groupName: string, value: string, studentIdx: number, subIdx: number, groupIdx: number, maxTotal: number) => {
    if (lockedSubjects.includes(subjectId) || isFinalLocked) return;
    if (isSchoolUser && !schoolCanEditSubject(subjectId)) return;
    const numericRegex = /^[0-9]*$/;
    if (!numericRegex.test(value) && value !== '*' && value !== '*1') return;

    let safeValue = value;
    if (value === '*1') safeValue = '100';
    else if (value === '*') safeValue = '*';

    if (safeValue !== '*' && safeValue !== '') {
      if (safeValue !== '100') {
        const maxLen = 2;
        if (safeValue.length > maxLen) {
          safeValue = safeValue.slice(0, maxLen);
        }
      }
    }

    let numForValidation = safeValue === '*' || safeValue === '' ? -1 : Number(safeValue);
    let isInvalid = numForValidation !== -1 && numForValidation > maxTotal;

    if (isInvalid) {
      toast.error(`Maximum marks is ${maxTotal}. Entered ${numForValidation} rejected.`);
      safeValue = '';
      const rejectKey = `${studentId}-${subjectId}-${groupName}`;
      setRejectedInputs(prev => new Set(prev).add(rejectKey));
      setTimeout(() => {
        setRejectedInputs(prev => {
          const next = new Set(prev);
          next.delete(rejectKey);
          return next;
        });
      }, 2000);
    }

    setMarksData(prev => {
      const updatedGroups = prev[studentId][subjectId].markGroups.map(g => {
        if (g.name === groupName) {
          if (safeValue === '*') return { ...g, marksObtained: '*' as any };
          let num = Number(safeValue);
          if (num < 0) num = 0;
          return { ...g, marksObtained: safeValue === '' ? '' : num };
        }
        return g;
      });
      const updatedSub = {
        ...prev[studentId][subjectId],
        markGroups: updatedGroups
      };

      setSyncStatus('SYNC_PENDING');
      setHasUnsavedChanges(true);
      draftStore.saveStudentMarkDebounced(
        getDraftParams(subjectId),
        studentId,
        {
          markGroups: updatedGroups,
          isAbsent: !!updatedSub.isAbsent,
          marks: updatedGroups.reduce((acc, g) => acc + (Number(g.marksObtained) || 0), 0)
        },
        initialDbTimestamp,
        1,
        () => {
          setSyncStatus('DRAFT_SAVED_LOCALLY');
          setLastSavedTime(Date.now());
        }
      );

      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subjectId]: updatedSub
        }
      };
    });

    if (isInvalid) {
      setTimeout(() => {
        const currentInput = document.getElementById(`input-${studentIdx}-${subIdx}-${groupIdx}`) as HTMLInputElement;
        if (currentInput) {
          currentInput.focus();
          currentInput.select();
        }
      }, 0);
    } else {
      let shouldAutoFocus = false;
      if (safeValue !== '*' && safeValue !== '') {
        if (safeValue === '100' || safeValue.length === 2) {
          shouldAutoFocus = true;
        }
      }

      if (shouldAutoFocus) {
        let nextGroupIdx = groupIdx + 1;
        let nextSubIdx = subIdx;
        let nextStudentIdx = studentIdx;
        const subGroups = getGroupsForSubject(selectedSubjectIds[subIdx]);

        if (nextGroupIdx >= subGroups.length) {
          nextGroupIdx = 0;
          nextSubIdx++;
        }

        if (nextSubIdx >= selectedSubjectIds.length) {
          nextSubIdx = 0;
          nextStudentIdx++;
        }

        if (nextStudentIdx < displayedStudents.length) {
          setTimeout(() => {
            const nextInput = document.getElementById(`input-${nextStudentIdx}-${nextSubIdx}-${nextGroupIdx}`);
            if (nextInput) {
              nextInput.focus();
            }
          }, 0);
        }
      }
    }
  };

  const getGrade = (mark: number, total: number, examClass: string) => {
    if (total === 0 || mark === undefined || mark === null || isNaN(mark)) return '';
    const pct = Math.round((mark * 100) / total);
    const classGradeConfig = examClass === '8' ? gradeConfig?.std8 : gradeConfig?.std9_10;
    if (classGradeConfig && classGradeConfig.length > 0) {
      const sortedConfig = [...classGradeConfig].sort((a: any, b: any) => {
        const getMin = (g: any) => g.min !== undefined ? g.min : (g.minScore !== undefined ? g.minScore : g.minPercentage);
        return getMin(b) - getMin(a);
      });
      for (const g of sortedConfig) {
        const min = g.min !== undefined ? g.min : (g.minScore !== undefined ? g.minScore : g.minPercentage);
        if (pct >= min) return g.grade;
      }
    }
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C+';
    if (pct >= 40) return 'C';
    if (pct >= 35) return 'D+';
    if (pct >= 30) return 'D';
    return 'E';
  };

  const getStudentPassFailStatus = useCallback((student: Student): 'PASS' | 'FAIL' | 'PENDING' => {
    if (studentAbsentMap[student.id]) return 'FAIL';

    const applicableSubs = availableSubjects.filter(s => isSubjectApplicable(student.id, s.id));
    if (applicableSubs.length === 0) return 'PENDING';

    let hasAnyMarks = false;
    let hasIncomplete = false;

    for (const sub of applicableSubs) {
      const subId = sub.id;
      const data = marksData[student.id]?.[subId];

      if (!data) {
        hasIncomplete = true;
        continue;
      }

      if (data.isAbsent) return 'FAIL';

      const groups = getGroupsForSubject(subId);
      const calculatedMaxMarks = groups.reduce((acc, g) => acc + (g.total || 0), 0);
      const subCode = sub.shortName || sub.name || '';
      const shortCodeMap: Record<string, string> = { 'P01': 'Lan I', 'P02': 'Lan II', 'P03': 'Eng', 'P04': 'Hin', 'P05': 'SS', 'P06': 'Phy', 'P07': 'Che', 'P08': 'Bio', 'P09': 'Mat' };
      let mappedCode = shortCodeMap[subCode] || subCode;
      const upperName = (sub.name || '').toUpperCase();
      if (upperName.includes('TAMIL AT') || upperName.includes('MALAYALAM AT')) {
        mappedCode = 'Lan I';
      } else if (upperName.includes('TAMIL BT') || upperName.includes('MALAYALAM BT')) {
        mappedCode = 'Lan II';
      }

      const subjectMaxMarks = selectedExamObj?.maxMarks?.[subId] || selectedExamObj?.maxMarks?.[mappedCode] || selectedExamObj?.maxMarks?.[subCode] || (calculatedMaxMarks > 0 ? calculatedMaxMarks : 20);

      let subTotal = 0;
      let subHasMark = false;
      let hasEmptyGroup = false;

      data.markGroups.forEach(g => {
        if (g.marksObtained !== '' && g.marksObtained !== null && g.marksObtained !== undefined) {
          subHasMark = true;
          hasAnyMarks = true;
          subTotal += Number(g.marksObtained || 0);
        } else {
          hasEmptyGroup = true;
        }
      });

      if (subHasMark) {
        const grade = getGrade(subTotal, subjectMaxMarks, student.className);
        if (grade === 'E') return 'FAIL';
      }
    }

    if (!hasAnyMarks) return 'PENDING';

    return 'PASS';
  }, [studentAbsentMap, availableSubjects, isSubjectApplicable, marksData, selectedExamObj, schoolConfig, gradeConfig]);

  const toggleAbsent = (studentId: string) => {
    if (isFinalLocked) return;
    const newAbsent = !studentAbsentMap[studentId];
    setStudentAbsentMap(prev => ({ ...prev, [studentId]: newAbsent }));
    setHasUnsavedChanges(true);
    setMarksData(prev => {
      const studentData = prev[studentId];
      if (!studentData) return prev;
      const updated: Record<string, SubjectMarkData> = {};
      Object.keys(studentData).forEach(subId => {
        if (lockedSubjects.includes(subId)) {
          updated[subId] = studentData[subId];
        } else {
          const newGroups = studentData[subId].markGroups.map(g => ({ ...g, marksObtained: newAbsent ? '' : g.marksObtained }));
          updated[subId] = {
            ...studentData[subId],
            isAbsent: newAbsent,
            markGroups: newGroups
          };
          setSyncStatus('SYNC_PENDING');
          draftStore.saveStudentMarkDebounced(
            getDraftParams(subId),
            studentId,
            {
              markGroups: newGroups,
              isAbsent: newAbsent,
              grade: newAbsent ? 'AB' : ''
            },
            initialDbTimestamp,
            1,
            () => {
              setSyncStatus('DRAFT_SAVED_LOCALLY');
              setLastSavedTime(Date.now());
            }
          );
        }
      });
      return { ...prev, [studentId]: updated };
    });
  };



  const handleRestoreDraft = () => {
    if (!recoveryMetadata || Object.keys(recoveryRecords).length === 0) return;

    if (isBulkMode) {
      const updatedBulk = Array.isArray(bulkMarks) ? [...bulkMarks] : [];
      Object.entries(recoveryRecords).forEach(([subId, records]) => {
        Object.entries(records).forEach(([studentId, rec]) => {
          const idx = updatedBulk.findIndex((m: any) => m.studentId === studentId && m.subjectId === subId);
          const gradeVal = rec.isAbsent ? 'Ab' : (rec.grade !== undefined && rec.grade !== null ? rec.grade : (rec.marks !== undefined && rec.marks !== null ? rec.marks.toString() : ''));
          const newEntry = {
            studentId,
            subjectId: subId,
            mark: rec.marks !== undefined && rec.marks !== null ? rec.marks : undefined,
            grade: gradeVal,
            isAbsent: !!rec.isAbsent
          };
          if (idx >= 0) updatedBulk[idx] = { ...updatedBulk[idx], ...newEntry };
          else updatedBulk.push(newEntry);
        });
      });
      setBulkMarks(updatedBulk);
    } else {
      setMarksData(prev => {
        const next = { ...prev };
        Object.entries(recoveryRecords).forEach(([subId, records]) => {
          Object.entries(records).forEach(([studentId, rec]) => {
            const studentPrev = next[studentId] ? { ...next[studentId] } : {};
            const defaultGroups = getGroupsForSubject(subId).map(g => ({
              name: g.name,
              maxQuestions: g.maxQuestions,
              maxMarks: g.maxMarks,
              total: g.total,
              marksObtained: ''
            }));
            const currentSub = studentPrev[subId] ? { ...studentPrev[subId] } : { isAbsent: false, markGroups: defaultGroups };
            currentSub.isAbsent = !!rec.isAbsent;
            currentSub.totalObtained = rec.marks !== undefined && rec.marks !== null ? Number(rec.marks) : undefined;
            if (rec.markGroups && rec.markGroups.length > 0) {
              currentSub.markGroups = rec.markGroups;
            }
            studentPrev[subId] = currentSub;
            next[studentId] = studentPrev;
          });
        });
        return next;
      });

      setStudentAbsentMap(prev => {
        const next = { ...prev };
        Object.entries(recoveryRecords).forEach(([subId, records]) => {
          Object.entries(records).forEach(([studentId, rec]) => {
            if (rec.isAbsent) next[studentId] = true;
            else delete next[studentId];
          });
        });
        return next;
      });
    }

    setRecoveryModalOpen(false);
    setSyncStatus('DRAFT_SAVED_LOCALLY');
    setHasUnsavedChanges(true);
    toast.success('Unsaved draft restored successfully from local storage');
  };

  const handleDiscardDraft = () => {
    Object.keys(recoveryRecords).forEach(subId => {
      draftStore.clearDraft(getDraftParams(subId));
    });
    setRecoveryModalOpen(false);
    setSyncStatus('DRAFT_SAVED_LOCALLY');
    toast.success('Local draft discarded');
  };

  const handleCellDraftSave = (studentId: string, subjectId: string, val: string) => {
    setSyncStatus('SYNC_PENDING');
    setHasUnsavedChanges(true);
    const isAbs = val.toLowerCase() === 'ab';
    const numMark = !isAbs && !isNaN(Number(val)) && val !== '' ? Number(val) : undefined;
    
    draftStore.saveStudentMarkDebounced(
      getDraftParams(subjectId),
      studentId,
      {
        grade: isAbs ? 'Ab' : val,
        marks: numMark,
        isAbsent: isAbs,
        markGroups: []
      },
      initialDbTimestamp,
      1,
      () => {
        setSyncStatus('DRAFT_SAVED_LOCALLY');
        setLastSavedTime(Date.now());
      }
    );
  };

  const handleKeepLocal = () => {
    setPendingSaveConfirm(true);
    setConflictModalOpen(false);
    if (pendingSubjectToConfirm) {
      handleSave(pendingSubjectToConfirm.confirmSubmit, true);
    }
  };

  const handleReloadServer = () => {
    if (pendingSubjectToConfirm?.subId) {
      draftStore.clearDraft(getDraftParams(pendingSubjectToConfirm.subId));
    }
    setConflictModalOpen(false);
    setPendingSaveConfirm(false);
    loadStudentsAndMarks();
    toast('Reloaded latest server marks', { icon: 'ℹ️' });
  };

  const handleMerge = () => {
    setPendingSaveConfirm(true);
    setConflictModalOpen(false);
    if (pendingSubjectToConfirm) {
      handleSave(pendingSubjectToConfirm.confirmSubmit, true);
      toast.success('Merged local changes onto latest server records');
    }
  };

  const handleSave = async (confirmSubmit: boolean = false, skipConflictCheck: boolean = false) => {
    if (!selectedExamId || selectedSubjectIds.length === 0) return;

    if (!navigator.onLine) {
      toast.error('Upload failed due to offline status. Your marks remain safely stored locally on this device.', { duration: 5000 });
      setSyncStatus('OFFLINE');
      return;
    }

    const subjectIdsToSave = isSchoolUser
      ? selectedSubjectIds.filter(subId => schoolCanEditSubject(subId))
      : selectedSubjectIds;

    if (isSchoolUser && subjectIdsToSave.length === 0) {
      toast.error('No confirmed subjects available for mark entry');
      return;
    }

    if (confirmSubmit) {
      for (const subId of subjectIdsToSave) {
        const incompleteStudent = displayedStudents.find(s => {
          if (studentAbsentMap[s.id]) return false;
          const data = marksData[s.id]?.[subId];
          if (!data) return true;
          return data.markGroups.some(g => g.marksObtained === '' || g.marksObtained === null);
        });

        const invalidStudent = displayedStudents.find(s => {
          if (studentAbsentMap[s.id]) return false;
          const data = marksData[s.id]?.[subId];
          if (!data) return false;
          return data.markGroups.some(g => Number(g.marksObtained) > g.total);
        });

        if (invalidStudent) {
          const subObj = availableSubjects.find(s => s.id === subId);
          toast.error(`Validation Failed: Marks entered for ${invalidStudent.name} in ${subObj?.name} exceed the maximum allowed limits.`);
          return;
        }

        if (incompleteStudent) {
          const subObj = availableSubjects.find(s => s.id === subId);
          toast.error(`Validation Failed: Missing marks for ${incompleteStudent.name} in ${subObj?.name}. Please enter all marks or mark as Absent before confirming.`);
          return;
        }
      }
    }

    setIsSaving(true);
    setSyncStatus('UPLOADING');
    try {
      let allComp = false;
      for (const subId of subjectIdsToSave) {
        if (!skipConflictCheck && !pendingSaveConfirm) {
          try {
            const checkRes = await apiClient.get('/marks/check-version', {
              params: { examId: selectedExamId, subjectId: subId, schoolId: user?.schoolId || user?.id }
            });
            const serverMarks: any[] = checkRes.data.marks || [];
            const conflicts = draftStore.detectConflicts(getDraftParams(subId), serverMarks, initialDbTimestamp, (stuId) => {
              return displayedStudents.find(s => s.id === stuId)?.name || stuId;
            });

            if (conflicts.length > 0) {
              setConflictedRows(conflicts);
              setPendingSubjectToConfirm({ subId, confirmSubmit });
              setConflictModalOpen(true);
              setIsSaving(false);
              setSyncStatus('UNSAVED_CHANGES');
              return;
            }
          } catch (verErr) {
            console.warn('Could not complete version check, proceeding to save', verErr);
          }
        }

        const payload = displayedStudents.map(s => {
          const isAbs = !!studentAbsentMap[s.id];
          const data = marksData[s.id]?.[subId] || { isAbsent: false, markGroups: getGroupsForSubject(subId).map(g => ({ ...g, marksObtained: '' })) };
          if (isAbs) {
            return { studentId: s.id, className: s.className, ...data, isAbsent: true, totalObtained: 0, grade: 'Ab' };
          }
          let rowTotal = 0;
          let maxRowTotal = 0;
          let hasMarks = false;
          data.markGroups.forEach(g => {
            if (g.marksObtained !== '' && g.marksObtained !== null && g.marksObtained !== undefined) {
              hasMarks = true;
            }
            rowTotal += Number(g.marksObtained || 0);
            maxRowTotal += Number(g.total || 0);
          });

          let finalData = { studentId: s.id, className: s.className, ...data, isEmpty: false };
          if (!hasMarks && !isAbs) {
            finalData.isEmpty = true;
          }

          const selectedSubjectObj = availableSubjects.find(s => s.id === subId);
          const subCode = selectedSubjectObj?.shortName || selectedSubjectObj?.name || '';
          const shortCodeMap: Record<string, string> = { 'P01': 'Lan I', 'P02': 'Lan II', 'P03': 'Eng', 'P04': 'Hin', 'P05': 'SS', 'P06': 'Phy', 'P07': 'Che', 'P08': 'Bio', 'P09': 'Mat' };
          let mappedCode = shortCodeMap[subCode] || subCode;

          const upperName = (selectedSubjectObj?.name || '').toUpperCase();
          if (upperName.includes('TAMIL AT') || upperName.includes('MALAYALAM AT')) {
            mappedCode = 'Lan I';
          } else if (upperName.includes('TAMIL BT') || upperName.includes('MALAYALAM BT')) {
            mappedCode = 'Lan II';
          }

          const calculatedMaxMarks = getGroupsForSubject(subId).reduce((acc, g) => acc + (g.total || 0), 0);
          const subjectMaxMarks = selectedExamObj?.maxMarks?.[subId] || selectedExamObj?.maxMarks?.[mappedCode] || selectedExamObj?.maxMarks?.[subCode] || (calculatedMaxMarks > 0 ? calculatedMaxMarks : 20);
          const grade = getGrade(rowTotal, subjectMaxMarks, s.className);

          return {
            ...finalData,
            totalObtained: rowTotal,
            grade
          };
        });

        const calculatedMaxMarks = getGroupsForSubject(subId).reduce((acc, g) => acc + (g.total || 0), 0);

        const saveRes = await apiClient.post('/marks/entry2', {
          schoolId: user?.schoolId || user?.id,
          examId: selectedExamId,
          subjectId: subId,
          marksData: payload,
          confirm: confirmSubmit,
          subjectMaxMarks: calculatedMaxMarks > 0 ? calculatedMaxMarks : 0
        });
        if (saveRes.data && saveRes.data.allCompleted !== undefined) {
          allComp = saveRes.data.allCompleted;
        }
      }

      let allInputsFilled = true;
      if (displayedStudents.length === 0 || availableSubjects.length === 0) {
        allInputsFilled = false;
      } else {
        for (const s of displayedStudents) {
          if (studentAbsentMap[s.id]) continue;
          for (const sub of availableSubjects) {
            if (!isSubjectApplicable(s.id, sub.id)) continue;
            const data = marksData[s.id]?.[sub.id];
            if (!data) {
              allInputsFilled = false;
              break;
            }
            const hasEmpty = data.markGroups.some((g: any) => g.marksObtained === '' || g.marksObtained === null || g.marksObtained === undefined);
            if (hasEmpty) {
              allInputsFilled = false;
              break;
            }
          }
          if (!allInputsFilled) break;
        }
      }

      setAllSubjectsCompleted(allComp && allInputsFilled);
      for (const subId of subjectIdsToSave) {
        draftStore.clearDraft(getDraftParams(subId));
      }
      setSyncStatus('UPLOAD_SUCCESSFUL');
      setHasUnsavedChanges(false);
      setInitialDbTimestamp(Date.now());
      setPendingSaveConfirm(false);
      if (confirmSubmit) setLockedSubjects(prev => Array.from(new Set([...prev, ...subjectIdsToSave])));
      toast.success(confirmSubmit ? 'Marks Confirmed & Locked!' : 'Draft saved successfully');
      await refetchExams();
    } catch (err) {
      toast.error('Failed to finalize subject entry. Local draft preserved.', { duration: 5000 });
      setSyncStatus('OFFLINE');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkSave = async (marksDataList: any[], confirm: boolean, finalConfirm: boolean) => {
    if (!navigator.onLine) {
      toast.error('Upload failed due to offline status. Your marks remain safely stored locally.', { duration: 5000 });
      setSyncStatus('OFFLINE');
      return;
    }
    setIsSaving(true);
    setSyncStatus('UPLOADING');
    try {
      const res = await apiClient.post('/marks/entry-all', {
        schoolId: user?.schoolId || user?.id,
        examId: selectedExamId,
        marksData: marksDataList,
        confirm,
        finalConfirm
      });

      toast.success(res.data.message || 'Marks saved successfully');
      selectedSubjectIds.forEach(subId => draftStore.clearDraft(getDraftParams(subId)));
      setSyncStatus('UPLOAD_SUCCESSFUL');
      setHasUnsavedChanges(false);
      setInitialDbTimestamp(Date.now());

      if (confirm && !finalConfirm) {
        setLockedSubjects(prev => Array.from(new Set([...prev, ...selectedSubjectIds])));
      }
      if (finalConfirm) {
        setIsFinalLocked(true);
      }
      await refetchExams();
      loadStudentsAndMarks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
      setSyncStatus('OFFLINE');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      for (const subId of selectedSubjectIds) {
        await apiClient.post('/marks/entry2', {
          schoolId: user?.schoolId || user?.id,
          examId: selectedExamId,
          subjectId: subId,
          marksData: displayedStudents.map(s => ({ studentId: s.id })),
          reset: true
        });
      }
      setLockedSubjects(prev => prev.filter(id => !selectedSubjectIds.includes(id)));
      toast.success("Marks Unlocked!");
      await refetchExams();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to unlock marks");
    }
  };

  const handleConfirmSubject = async (subjectId: string, subjectMarksData: any[]) => {
    if (!navigator.onLine) {
      toast.error('Cannot confirm marks while offline. Your marks are safely stored locally.', { duration: 5000 });
      setSyncStatus('OFFLINE');
      return;
    }
    setIsSaving(true);
    setSyncStatus('UPLOADING');
    try {
      const calculatedMaxMarks = getGroupsForSubject(subjectId).reduce((acc, g) => acc + (g.total || 0), 0);
      await apiClient.post('/marks/entry2', {
        schoolId: user?.schoolId || user?.id,
        examId: selectedExamId,
        subjectId,
        marksData: subjectMarksData,
        confirm: true,
        subjectMaxMarks: calculatedMaxMarks > 0 ? calculatedMaxMarks : 0
      });
      setLockedSubjects(prev => Array.from(new Set([...prev, subjectId])));
      draftStore.clearDraft(getDraftParams(subjectId));
      setSyncStatus('UPLOAD_SUCCESSFUL');
      setInitialDbTimestamp(Date.now());
      toast.success('Subject Confirmed & Locked!');
      await refetchExams();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm subject');
      setSyncStatus('OFFLINE');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSubject = async (subjectId: string) => {
    try {
      await apiClient.post('/marks/entry2', {
        schoolId: user?.schoolId || user?.id,
        examId: selectedExamId,
        subjectId,
        marksData: displayedStudents.map(s => ({ studentId: s.id })),
        reset: true
      });
      setLockedSubjects(prev => prev.filter(id => id !== subjectId));
      toast.success("Subject Marks Unlocked!");
      await refetchExams();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to unlock subject");
    }
  };

  const handleDeleteStudentMarks = async (student: Student): Promise<boolean> => {
    if (!selectedExamId || !student?.id) return false;
    if (isFinalLocked) {
      toast.error('Cannot delete marks. Final exam confirmation is locked.');
      return false;
    }

    const firstConfirm = await Swal.fire({
      title: 'Delete All Subject Marks?',
      html: `Are you sure you want to delete <b>ALL subject marks</b> for student <br/><b class="text-indigo-600">${student.name}</b> (Reg: ${student.globalId || '—'})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete All Marks',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'rounded-3xl shadow-2xl border border-gray-100 dark:border-[#30363d] dark:bg-[#161b22]'
      }
    });

    if (!firstConfirm.isConfirmed) return false;

    const doubleConfirm = await Swal.fire({
      title: '⚠️ Double Check Confirmation',
      html: `Please confirm <b>ONCE MORE</b>.<br/>This will permanently erase all recorded marks for <b class="text-red-600">${student.name}</b> from the database directly.`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonText: 'PERMANENTLY DELETE MARKS',
      cancelButtonText: 'Keep Marks',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#4b5563',
      customClass: {
        popup: 'rounded-3xl shadow-2xl border border-red-200 dark:border-red-900/50 dark:bg-[#161b22]'
      }
    });

    if (!doubleConfirm.isConfirmed) return false;

    try {
      await apiClient.post('/marks/delete-student-marks', {
        studentId: student.id,
        examId: selectedExamId
      });

      setMarksData(prev => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });

      setBulkMarks(prev => prev.filter(m => m.studentId !== student.id));

      toast.success(`All subject marks deleted for ${student.name}`);
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete student marks');
      return false;
    }
  };

  const handleFinalConfirm = async () => {

    const step1 = await Swal.fire({
      title: 'Are you sure you want to confirm?',
      text: 'I verify that marks have been entered for all subjects.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Confirm',
      cancelButtonText: 'Cancel'
    });

    if (!step1.isConfirmed) return;

    const step2 = await Swal.fire({
      title: 'Final Confirmation',
      html: `
        <div style="text-align: left; line-height: 1.6;">
          <p>I confirm that marks have been entered for <b>all students</b> in <b>all subjects</b>.</p>
          <p style="color: #dc2626; font-weight: bold; margin-top: 10px;">I understand that once confirmed, the marks cannot be edited under any circumstances, and I will not request a reset.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'I Confirm and Lock Data',
      cancelButtonText: 'Cancel'
    });

    if (!step2.isConfirmed) return;

    try {
      await apiClient.post('/marks/school-confirm', {
        schoolId: user?.schoolId || user?.id,
        examId: selectedExamId
      });
      setIsFinalLocked(true);
      setLockedSubjects(availableSubjects.map(s => s.id));
      await refetchExams();
      Swal.fire('Success', 'Marks have been successfully confirmed and locked.', 'success');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to final confirm");
    }
  };

  const toggleSubjectSelectForReset = (subjectId: string) => {
    setSelectedSubjectsForReset(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleResetSelectedSubjects = async () => {
    if (selectedSubjectsForReset.length === 0) return;
    setIsResettingSubjects(true);
    try {
      await apiClient.post('/marks/reset-subjects', {
        examId: selectedExamId,
        subjectIds: selectedSubjectsForReset,
        schoolId: user?.schoolId || user?.id
      });
      toast.success("Selected subjects unlocked successfully");
      setSelectedSubjectsForReset([]);
      await loadInitialData();
      await loadStudentsAndMarks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset selected subjects");
    } finally {
      setIsResettingSubjects(false);
    }
  };

  const displayedStudents = useMemo(() => {
    if (user?.role === 'TEACHER' && !selectedDivision) {
      return [];
    }

    let filtered = students;
    if (selectedMedium) {
      const normSel = selectedMedium.trim().toLowerCase();
      const selMedObj = mediums.find(m => 
        m.id === selectedMedium || 
        m.shortName.toLowerCase() === normSel || 
        m.code.toLowerCase() === normSel || 
        m.name.toLowerCase() === normSel
      );
      const targetShortName = selMedObj ? selMedObj.shortName.toLowerCase() : normSel;
      const targetCode = selMedObj ? selMedObj.code.toLowerCase() : normSel;
      const targetName = selMedObj ? selMedObj.name.toLowerCase() : normSel;

      filtered = filtered.filter(s => {
        if (!s.medium) return true;
        const stMed = s.medium.trim().toLowerCase();
        return stMed === targetShortName || stMed === targetCode || stMed === targetName ||
          (targetShortName === 'tamil' && (stMed === 'tm' || stMed.includes('tamil'))) ||
          (targetShortName === 'english' && (stMed === 'em' || stMed.includes('english'))) ||
          (targetShortName === 'malayalam' && (stMed === 'mm' || stMed.includes('malayalam'))) ||
          (targetShortName === 'kannada' && (stMed === 'km' || stMed.includes('kannada'))) ||
          (targetShortName === 'urdu' && (stMed === 'ur' || stMed.includes('urdu'))) ||
          (targetShortName === 'arabic' && (stMed === 'ar' || stMed.includes('arabic')));
      });
    }
    if (selectedDivision) {
      filtered = filtered.filter(s => (s.division || '').toUpperCase() === selectedDivision.toUpperCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.globalId && s.globalId.toLowerCase().includes(q))
      );
    }

    return [...filtered].sort((a: any, b: any) => {
      // Primary sort: Division (A, B, C, D, etc.)
      const divA = (a.division || '').toUpperCase();
      const divB = (b.division || '').toUpperCase();
      if (divA !== divB) {
        if (!divA) return 1;
        if (!divB) return -1;
        return divA.localeCompare(divB, undefined, { numeric: true, sensitivity: 'base' });
      }

      // Secondary sort: Selected sort option
      if (sortOption === 'REG_NO') {
        const aNum = a.globalId ? parseInt(a.globalId.replace(/\D/g, ''), 10) || 0 : 0;
        const bNum = b.globalId ? parseInt(b.globalId.replace(/\D/g, ''), 10) || 0 : 0;
        if (aNum !== bNum) return aNum - bNum;
        return (a.globalId || '').localeCompare(b.globalId || '');
      } else if (sortOption === 'ALPHA') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortOption === 'MALE_FEMALE_ALPHA') {
        const aGen = (a.gender || '').toLowerCase();
        const bGen = (b.gender || '').toLowerCase();
        const isAMale = aGen === 'male' || aGen === 'boy' || aGen === 'm' || aGen === 'b';
        const isBMale = bGen === 'male' || bGen === 'boy' || bGen === 'm' || bGen === 'b';
        if (isAMale && !isBMale) return -1;
        if (!isAMale && isBMale) return 1;
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortOption === 'FEMALE_MALE_ALPHA') {
        const aGen = (a.gender || '').toLowerCase();
        const bGen = (b.gender || '').toLowerCase();
        const isAFemale = aGen === 'female' || aGen === 'girl' || aGen === 'f' || aGen === 'g';
        const isBFemale = bGen === 'female' || bGen === 'girl' || bGen === 'f' || bGen === 'g';
        if (isAFemale && !isBFemale) return -1;
        if (!isAFemale && isBFemale) return 1;
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });
  }, [students, selectedDivision, selectedMedium, selectedSubjectIds, availableSubjects, sortOption, searchQuery, mediums]);

  const availableDivisions = useMemo(() => {
    if (!selectedMedium) return [];

    if (user?.role === 'TEACHER') {
      const teacherDivs = new Set<string>();
      dbClasses.filter(c => c.className === selectedClass).forEach(c => {
        if (c.division) teacherDivs.add(c.division.toUpperCase());
      });
      (teacherDashboardData?.assignedClasses || []).forEach((cStr: string) => {
        const match = cStr.match(/^(\d+|LKG|UKG|PRE-KG)(.*)$/i);
        if (match && match[1] === selectedClass && match[2]?.trim()) {
          teacherDivs.add(match[2].trim().toUpperCase());
        }
      });
      (teacherDashboardData?.teacherAssignments || []).forEach((a: any) => {
        const match = (a.className || '').match(/^(\d+|LKG|UKG|PRE-KG)(.*)$/i);
        if (match && match[1] === selectedClass && match[2]?.trim()) {
          teacherDivs.add(match[2].trim().toUpperCase());
        }
      });
      if (teacherDivs.size > 0) {
        return Array.from(teacherDivs).sort();
      }
    }

    const normSel = selectedMedium.trim().toLowerCase();
    const selMedObj = mediums.find(m => 
      m.id === selectedMedium || 
      m.shortName.toLowerCase() === normSel || 
      m.code.toLowerCase() === normSel || 
      m.name.toLowerCase() === normSel
    );
    const targetShortName = selMedObj ? selMedObj.shortName.toLowerCase() : normSel;
    const targetCode = selMedObj ? selMedObj.code.toLowerCase() : normSel;
    const targetName = selMedObj ? selMedObj.name.toLowerCase() : normSel;

    const filterMed = (s: any) => {
      if (!s.medium) return true;
      const stMed = s.medium.trim().toLowerCase();
      return stMed === targetShortName || stMed === targetCode || stMed === targetName ||
        (targetShortName === 'tamil' && (stMed === 'tm' || stMed.includes('tamil'))) ||
        (targetShortName === 'english' && (stMed === 'em' || stMed.includes('english'))) ||
        (targetShortName === 'malayalam' && (stMed === 'mm' || stMed.includes('malayalam'))) ||
        (targetShortName === 'kannada' && (stMed === 'km' || stMed.includes('kannada'))) ||
        (targetShortName === 'urdu' && (stMed === 'ur' || stMed.includes('urdu'))) ||
        (targetShortName === 'arabic' && (stMed === 'ar' || stMed.includes('arabic')));
    };

    const divs = new Set<string>();
    classStudents.filter(s => s.className === selectedClass && filterMed(s)).forEach(s => {
      if (s.division) divs.add(s.division.toUpperCase());
    });
    students.filter(s => s.className === selectedClass && filterMed(s)).forEach(s => {
      if (s.division) divs.add(s.division.toUpperCase());
    });
    if (divs.size === 0) {
      dbClasses.filter(c => c.className === selectedClass).forEach(c => {
        if (c.division) divs.add(c.division.toUpperCase());
      });
    }
    return Array.from(divs).sort();
  }, [dbClasses, selectedClass, students, classStudents, selectedMedium, mediums, user, teacherDashboardData]);

  useEffect(() => {
    if (user?.role === 'TEACHER' && availableDivisions.length === 1 && selectedDivision !== availableDivisions[0]) {
      setSelectedDivision(availableDivisions[0]);
    }
  }, [availableDivisions, selectedDivision, user?.role]);

  const hasValidationErrors = useMemo(() => {
    return displayedStudents.some(s => {
      if (studentAbsentMap[s.id]) return false;
      return selectedSubjectIds.some(subId => {
        const data = marksData[s.id]?.[subId];
        if (!data) return false;
        return data.markGroups.some(g => Number(g.marksObtained) > g.total);
      });
    });
  }, [displayedStudents, marksData, selectedSubjectIds, studentAbsentMap]);

  const isAllVisibleInputsComplete = useMemo(() => {
    if (displayedStudents.length === 0 || selectedSubjectIds.length === 0) return false;
    for (const s of displayedStudents) {
      if (studentAbsentMap[s.id]) continue;
      for (const subId of selectedSubjectIds) {
        if (!isSubjectApplicable(s.id, subId)) continue;
        const data = marksData[s.id]?.[subId];
        if (!data) return false;
        const hasEmpty = data.markGroups.some(g => g.marksObtained === '' || g.marksObtained === null || g.marksObtained === undefined);
        if (hasEmpty) return false;
      }
    }
    return true;
  }, [displayedStudents, marksData, selectedSubjectIds, isSubjectApplicable, studentAbsentMap]);

  const isLocked = selectedSubjectIds.length > 0 && selectedSubjectIds.every(id => lockedSubjects.includes(id));

  // SCHOOL user: check if a subject is teacher-confirmed (can only edit confirmed subjects)
  const schoolTeacherConfirmedSubjectIds = useMemo(() => {
    if (user?.role !== 'SCHOOL') return new Set<string>();
    return new Set(
      schoolConfig
        .filter((s: any) => s.isSubjectConfirmed === true)
        .map((s: any) => s.subjectId)
    );
  }, [schoolConfig, user?.role]);

  const isSchoolUser = user?.role === 'SCHOOL';

  const schoolCanEditSubject = useCallback((subjectId: string): boolean => {
    if (!isSchoolUser) return true;
    return schoolTeacherConfirmedSubjectIds.has(subjectId);
  }, [isSchoolUser, schoolTeacherConfirmedSubjectIds]);

  // For SCHOOL: true if any selected subject is NOT teacher-confirmed (all inputs disabled)
  const schoolAllSelectedLocked = useMemo(() => {
    if (!isSchoolUser || selectedSubjectIds.length === 0) return false;
    return selectedSubjectIds.some(subId => !schoolTeacherConfirmedSubjectIds.has(subId));
  }, [isSchoolUser, selectedSubjectIds, schoolTeacherConfirmedSubjectIds]);

  return (
    <div className="space-y-6 p-5 text-slate-900 dark:text-white">
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
                Please update Students Management before continuing.
              </p>
            </div>
          </div>
        </div>
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
              Correct student language information in Students Management. Marks Entry may be inaccurate until resolved.
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

      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-[#161b22] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-[#30363d]">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase flex items-center gap-3">
            <FileEdit size={32} className="text-indigo-500" />
            Marks Entry 2.0
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Dynamic Mark Group Entry</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0 w-full md:w-auto">
          {selectedExamId && selectedSubjectIds.length > 0 && (
            <MarksEntrySyncStatus status={syncStatus} lastSavedTime={lastSavedTime} className="mr-1" />
          )}
          <ExamSelect
            exams={exams}
            selectedExamId={selectedExamId}
            onSelect={(id) => {
              setSelectedExamId(id);
              setSelectedSubjectIds([]);
              if (id && !configuredExamIds.includes(id)) {
                setTimeout(() => setShowExamConfigModal(true), 300);
              }
            }}
            configuredIds={configuredExamIds}
            placeholder="Select Exam"
            className="w-full sm:min-w-[350px] sm:w-auto flex-shrink-0"
          />
          {(user?.role === 'SCHOOL' || user?.role === 'WEBMASTER') && selectedExamId && (
            <button
              type="button"
              onClick={() => setShowExamConfigModal(true)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap border ${
                configuredExamIds.includes(selectedExamId)
                  ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:hover:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-400 dark:border-emerald-600 shadow-sm shadow-emerald-500/10'
                  : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
              }`}
            >
              <Settings2 size={15} className={`shrink-0 ${configuredExamIds.includes(selectedExamId) ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`} />
              <span className="hidden sm:inline">{configuredExamIds.includes(selectedExamId) ? '✓ Exam Configured' : 'Config Exam'}</span>
            </button>
          )}

          {selectedExamId && (
            isFinalLocked ? (
              <div className="bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-400 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-sm">
                Finalized
              </div>
            ) : null
          )}
        </div>
      </div>

      {allSubjectsCompleted && !isFinalLocked && availableSubjects.length > 0 && user?.role === 'SCHOOL' ? (
        <div className="bg-indigo-50 dark:bg-indigo-950/15 border-2 border-indigo-200 dark:border-indigo-800/40 p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-tight mb-3">Final Confirmation</h3>
          <p className="text-sm text-indigo-700 dark:text-indigo-400 font-bold mb-4">You have entered marks for all {availableSubjects.length} subjects. You can now finalize the marks.</p>

          <div className="flex items-start gap-3 mb-5">
            <input
              type="checkbox"
              id="declareFinal"
              checked={hasDeclaredFinal}
              onChange={(e) => setHasDeclaredFinal(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-indigo-300 dark:border-indigo-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="declareFinal" className="text-sm font-bold text-indigo-900 dark:text-indigo-200 cursor-pointer select-none">
              I assure that all subjects are completed and marks are verified correctly. I understand that once finalized, I cannot edit any subject marks without Admin permission.
            </label>
          </div>

          <button
            onClick={handleFinalConfirm}
            disabled={!hasDeclaredFinal}
            className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Final Confirmation
          </button>
        </div>
      ) : null}



      {isLoading ? (
        <div className="py-20 flex justify-center"><PageLoader /></div>
      ) : exams.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm font-medium border border-blue-100 dark:border-blue-800 flex items-center justify-center w-full shadow-sm text-center">
          Please configure an exam first using the 'Exam Config' button to proceed with Marks Entry.
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:gap-4 w-full">
          <div className="flex flex-col w-full bg-white dark:bg-[#161b22] rounded-2xl shadow-sm border border-gray-100 dark:border-[#30363d] transition-all">
            <div className="flex flex-row flex-wrap xl:flex-nowrap items-center gap-2 md:gap-3 p-4 w-full">
            {(user?.role === 'TEACHER' || user?.role === 'SCHOOL') && (
              <Dropdown
                minWidth={100}
                className="flex-shrink"
                ariaLabel="Select Medium"
                placeholder="Select Medium..."
                value={selectedMedium}
                onChange={(v) => { setSelectedMedium(v); }}
                options={(() => {
                  const allMediumNames = mediums.filter(m => m.active !== false).map(m => m.shortName);
                  const resolveMed = (val: string) => mediums.find(m => m.id === val || m.shortName === val || m.code === val.toUpperCase() || m.name === val)?.shortName ?? val;
                  const teacherMeds = [
                    ...((user as any)?.mediums || []),
                    ...(teacherDashboardData?.mediums || []),
                    ...(teacherDashboardData?.teacherAssignments || []).map((a: any) => a.medium)
                  ].filter(Boolean);
                  const rawAllowed = user?.role === 'TEACHER' && teacherMeds.length > 0 ? Array.from(new Set(teacherMeds)) : allMediumNames;
                  const allowedMediums = rawAllowed.map(resolveMed);
                  const mediumsInClass = new Set(classStudents.map(s => (s.medium || '').toUpperCase()).filter(Boolean));
                  const displayMediums = allowedMediums.filter((m: string) => classStudents.length === 0 || mediumsInClass.size === 0 || mediumsInClass.has(m.toUpperCase()));
                  return displayMediums.map((m: string) => ({ value: m, label: m }));
                })()}
              />
            )}

            <Dropdown
              minWidth={120}
              className="flex-shrink"
              ariaLabel="Select Class"
              placeholder="Select Class"
              value={selectedClass}
              disabled={dbClasses.length === 0}
              onChange={(v) => { setSelectedClass(v); setSelectedDivision(''); }}
              options={
                dbClasses.length === 0
                  ? []
                  : Array.from(new Set(dbClasses.map(c => c.className))).map(c => ({ value: c, label: `Class ${c}` }))
              }
            />

            {selectedMedium && availableDivisions.length > 0 && (
              <Dropdown
                minWidth={110}
                className="flex-shrink"
                ariaLabel="Select Division"
                placeholder="Select Div..."
                value={selectedDivision}
                onChange={(v) => setSelectedDivision(v)}
                options={[
                  ...(user?.role === 'TEACHER' ? [] : [{ value: '', label: 'All Divs' }]),
                  ...availableDivisions.map(d => ({ value: d, label: d })),
                ]}
              />
            )}

            {selectedExamId && user?.role === 'TEACHER' && (
              <Dropdown
                minWidth={140}
                className="flex-shrink"
                ariaLabel="Select Subject"
                placeholder="Select Subject..."
                value={selectedSubjectIds[0] || ''}
                onChange={(v) => setSelectedSubjectIds([v])}
                options={availableSubjects.map((s: any) => ({ value: s.id, label: `${getSubjectShortLabel(s)} - ${s.name || s.shortName}` }))}
              />
            )}

            <Dropdown
              minWidth={140}
              className="flex-shrink"
              ariaLabel="Sort Order"
              value={sortOption}
              onChange={(v) => setSortOption(v as any)}
              options={[
                { value: 'FEMALE_MALE_ALPHA', label: 'Female - Male' },
                { value: 'MALE_FEMALE_ALPHA', label: 'Male - Female' },
                { value: 'REG_NO', label: 'Admission No / Reg No' },
                { value: 'ALPHA', label: 'Alphabets' },
              ]}
            />

            <div className="flex-shrink relative">
              <input
                type="text"
                placeholder="Search name or reg no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-w-[180px] pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#1a1f26] border border-gray-200 dark:border-[#30363d] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-gray-100 placeholder-gray-400"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            </div>

            {selectedMedium && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl flex-shrink">
                <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 whitespace-nowrap">{displayedStudents.length} Students</span>
              </div>
            )}

            {selectedExamId && user?.role !== 'TEACHER' && (
              <div className="flex flex-1 justify-end min-w-fit">
                <button
                  type="button"
                  onClick={() => setIsSubjectsCollapsed(!isSubjectsCollapsed)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#1a1f26]/50 transition-colors focus:outline-none ml-auto whitespace-nowrap"
                >
                  <span className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Subjects ({selectedSubjectIds.length}/{availableSubjects.length})
                  </span>
                  <ChevronDown 
                    size={16} 
                    className={`text-gray-400 transition-transform duration-200 ease-in-out ${!isSubjectsCollapsed ? 'rotate-180' : ''}`} 
                  />
                </button>
              </div>
            )}
          </div>

          {selectedExamId && user?.role !== 'TEACHER' && (
            <div
              className={`transition-all duration-200 ease-in-out overflow-hidden border-t border-gray-100 dark:border-[#30363d] ${
                isSubjectsCollapsed ? 'max-h-0 opacity-0 border-transparent' : 'max-h-[800px] opacity-100'
              }`}
            >
              <div className="px-5 pb-5 pt-4">
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availableSubjects.length > 0 && selectedSubjectIds.length === availableSubjects.length}
                      onChange={(e) => setSelectedSubjectIds(e.target.checked ? availableSubjects.map(s => s.id) : [])}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Select All Subjects</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                    {availableSubjects.map(s => (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedSubjectIds.includes(s.id)
                            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20 shadow-sm'
                            : 'border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] hover:bg-gray-50 dark:hover:bg-[#21262d]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubjectIds.includes(s.id)}
                          onChange={(e) => {
                            setSelectedSubjectIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id));
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={`text-xs font-bold ${
                          selectedSubjectIds.includes(s.id)
                            ? 'text-indigo-900 dark:text-indigo-200'
                            : 'text-gray-700 dark:text-gray-200'
                        }`}>
                          {getSubjectShortLabel(s)} - {s.name || s.shortName}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!selectedExamId ? (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-gray-100 dark:border-[#30363d] p-12 flex flex-col items-center justify-center gap-3 text-gray-400 font-bold uppercase text-sm text-center mt-3">
              <AlertCircle size={48} className="text-gray-300 dark:text-gray-600 mb-2" />
              <p>Please select an exam to proceed.</p>
            </div>
          ) : user?.role === 'TEACHER' && dbClasses.length === 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-red-100 dark:border-red-900/50 p-12 flex flex-col items-center justify-center gap-3 text-red-600 dark:text-red-400 font-bold uppercase text-sm text-center mt-3">
              <AlertCircle size={48} className="text-red-500 mb-2" />
              <p>NO CLASSES ASSIGNED</p>
              <p className="text-xs text-red-400 dark:text-red-500 normal-case">You have not been assigned any classes in your profile. Please contact the School Admin to edit your profile and assign classes.</p>
            </div>
          ) : user?.role === 'TEACHER' && availableSubjects.length === 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-red-100 dark:border-red-900/50 p-12 flex flex-col items-center justify-center gap-3 text-red-600 dark:text-red-400 font-bold uppercase text-sm text-center mt-3">
              <AlertCircle size={48} className="text-red-500 mb-2" />
              <p>NO SUBJECTS ASSIGNED</p>
              <p className="text-xs text-red-400 dark:text-red-500 normal-case">You have not been assigned any subjects for this class/exam. Please contact the School Admin to edit your profile and assign subjects.</p>
            </div>
          ) : user?.role === 'TEACHER' && !selectedDivision ? (
             <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-amber-100 dark:border-amber-900/50 p-12 flex flex-col items-center justify-center gap-3 text-amber-600 dark:text-amber-400 font-bold uppercase text-sm text-center mt-3">
              <AlertCircle size={48} className="text-amber-500 mb-2" />
              <p>Please select a Division </p>
              <p className="text-xs text-amber-500 dark:text-amber-600 normal-case">You must select a division from the dropdown above to load the students list.</p>
            </div>
          ) : isBulkMode ? (
            <div className="mt-3">
              <MarksEntryBulkGrid
                students={displayedStudents}
                availableSubjects={availableSubjects.filter(s => selectedSubjectIds.includes(s.id))}
                selectedExam={exams.find(e => e.id === selectedExamId)}
                onSave={handleBulkSave}
                onConfirmSubject={handleConfirmSubject}
                onResetSubject={handleResetSubject}
                onDeleteStudentMarks={handleDeleteStudentMarks}
                isLoading={isSaving}
                lockedSubjects={lockedSubjects}
                isFinalLocked={isFinalLocked}
                existingMarks={bulkMarks}
                isSubjectApplicable={isSubjectApplicable}
                isSchoolUser={isSchoolUser}
                schoolCanEditSubject={schoolCanEditSubject}
                onCellDraftSave={handleCellDraftSave}
              />
            </div>
          ) : selectedSubjectIds.length === 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-gray-100 dark:border-[#30363d] p-12 flex flex-col items-center justify-center gap-3 text-gray-400 font-bold uppercase text-sm text-center mt-3">
              <AlertCircle size={48} className="text-gray-300 dark:text-gray-600 mb-2" />
              <p>Please select at least one subject to view the marks entry grid.</p>
            </div>
          ) : displayedStudents.length > 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-gray-100 dark:border-[#30363d] mt-3 min-h-[400px] relative table-wrapper">
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] rounded-t-3xl">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm md:text-base font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Marks Entry Grid</span>
                    <span className="text-[11px] bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-300 font-bold px-2.5 py-0.5 rounded-full">
                      {displayedStudents.length} {displayedStudents.length === 1 ? 'Student' : 'Students'}
                    </span>
                  </h3>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  {isFinalLocked ? (
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-400 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed">
                      Finalized
                    </div>
                  ) : schoolAllSelectedLocked && !showExamConfigModal ? (
                    <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed border border-amber-200 dark:border-amber-800">
                      <AlertCircle size={16} />
                      Awaiting Teacher Confirmation
                    </div>
                  ) : !lockedSubjects.includes(selectedSubjectIds[0]) ? (
                    <button
                      onClick={() => handleSave(false)}
                      disabled={isSaving || displayedStudents.length === 0 || selectedSubjectIds.length === 0}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                        hasUnsavedChanges
                          ? 'bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 shadow-blue-500/25'
                          : 'bg-gray-200 dark:bg-[#21262d] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-300 dark:hover:bg-[#2a3038]'
                      }`}
                    >
                      {isSaving ? (
                        <span className="animate-pulse">Saving...</span>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Draft {hasUnsavedChanges && '• Unsaved'}
                        </>
                      )}
                    </button>
                  ) : !showExamConfigModal ? (
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-2 bg-red-650 dark:bg-red-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 dark:hover:bg-red-600 transition-all shadow-md active:scale-95"
                    >
                      Reset Subjects
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full md:w-auto md:min-w-max text-left border-separate border-spacing-0">
                <thead className="sticky top-[12px] z-30 bg-gray-50 dark:bg-[#1a1f26] shadow-sm">
                  <tr className="border-b-2 border-gray-100 dark:border-[#30363d] bg-gray-50 dark:bg-[#1a1f26]">
                    <th className="w-10 px-3 py-3 text-center border-r border-gray-200 dark:border-[#30363d] sticky top-[12px] left-0 bg-gray-50 dark:bg-[#1a1f26] z-40">
                      <input
                        type="checkbox"
                        checked={displayedStudents.length > 0 && selectedStudentRowIds.length === displayedStudents.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentRowIds(displayedStudents.map(s => s.id));
                          } else {
                            setSelectedStudentRowIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer align-middle"
                        title="Select all students"
                      />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#30363d] min-w-[160px] sticky top-[12px] bg-gray-50 dark:bg-[#1a1f26] z-30">
                      Student Name
                    </th>
                    <th className="w-14 px-2 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center border-r border-gray-200 dark:border-[#30363d] sticky top-[12px] bg-gray-50 dark:bg-[#1a1f26] z-30">
                      ABS
                    </th>
                    {selectedSubjectIds.map(subId => {
                      const subObj = availableSubjects.find(s => s.id === subId);
                      const groups = getGroupsForSubject(subId);
                      const maxMark = groups.reduce((acc: number, g: any) => acc + (g.total || g.maxMarks || 0), 0);
                      const fullName = subObj?.name || subObj?.shortName || 'Subject';
                      const hoverTitle = maxMark > 0 ? `${fullName} (Max: ${maxMark})` : fullName;
                      const headerLabel = subObj ? getSubjectShortLabel(subObj) : 'Subject';
                      return (
                        <th 
                          key={subId} 
                          colSpan={groups.length} 
                          title={hoverTitle}
                          className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 text-center border-r border-gray-200 dark:border-[#30363d] whitespace-nowrap cursor-help sticky top-[12px] bg-gray-50 dark:bg-[#1a1f26] z-30"
                        >
                          {headerLabel}
                        </th>
                      );
                    })}
                    {user?.role === 'SCHOOL' ? (
                      <th className="w-20 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 text-center border-r border-gray-200 dark:border-[#30363d] sticky top-[12px] bg-gray-50 dark:bg-[#1a1f26] z-30">
                        Status
                      </th>
                    ) : (user?.role === 'TEACHER' && selectedSubjectIds.length > 1) ? (
                      <th className="w-14 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 text-center border-l border-gray-200 dark:border-[#30363d] sticky top-[12px] bg-gray-50 dark:bg-[#1a1f26] z-30">
                        Action
                      </th>
                    ) : null}
                  </tr>
                </thead>
                  <tbody>
                    {displayedStudents.map((student, studentIdx) => {
                      const isSelected = selectedStudentRowIds.includes(student.id);
                      const isAbs = !!studentAbsentMap[student.id];

                      return (
                        <tr
                          id={`student-row-${student.id}`}
                          key={student.id}
                          className={`border-b border-gray-100 dark:border-[#30363d] transition-colors ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/25' : 'hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10'}`}
                        >
                          <td className="w-10 px-3 py-2 text-center border-r border-gray-100 dark:border-[#30363d] sticky left-0 bg-white dark:bg-[#161b22] z-10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedStudentRowIds(prev =>
                                  prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id]
                                );
                              }}
                              className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer align-middle"
                            />
                          </td>
                          <td className="px-3 py-2 border-r border-gray-100 dark:border-[#30363d] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono min-w-[18px] text-right">
                                {studentIdx + 1}.
                              </span>
                              <div>
                                <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{student.name}</div>
                                <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500">{student.globalId}</div>
                              </div>
                            </div>
                          </td>
                          <td className={`w-14 px-1.5 py-2 text-center border-r border-gray-100 dark:border-[#30363d] ${isAbs ? 'bg-gray-50 dark:bg-[#1f242c]/30' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isAbs}
                              onChange={() => toggleAbsent(student.id)}
                              disabled={isFinalLocked}
                              className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed align-middle"
                            />
                          </td>
                          {selectedSubjectIds.map((subId, subIdx) => {
                            const data = marksData[student.id]?.[subId];
                            const groups = getGroupsForSubject(subId);

                            if (!data) {
                              return (
                                <td key={subId} colSpan={groups.length} className="px-2 py-2 text-center border-r border-gray-100 dark:border-[#30363d]">
                                  -
                                </td>
                              );
                            }

                            return (
                              <React.Fragment key={subId}>
                                {data.markGroups.map((g: any, groupIdx: number) => (
                                  <td key={groupIdx} className={`px-2 py-2 text-center border-r border-gray-100 dark:border-[#30363d] ${isAbs ? 'bg-gray-50 dark:bg-[#1f242c]/30' : ''}`}>
                                    <input
                                      id={`input-${studentIdx}-${subIdx}-${groupIdx}`}
                                      type="text"
                                      inputMode="numeric"
                                      value={isAbs ? '' : g.marksObtained}
                                      onChange={(e) => handleMarkChange(student.id, subId, g.name, e.target.value, studentIdx, subIdx, groupIdx, g.total)}
                                      disabled={lockedSubjects.includes(subId) || isFinalLocked || isAbs || (isSchoolUser && !schoolCanEditSubject(subId))}
                                      className={`w-[4rem] px-2 py-1 text-center text-sm font-bold border-2 rounded-lg bg-transparent text-slate-800 dark:text-white outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:opacity-60 ${rejectedInputs.has(`${student.id}-${subId}-${g.name}`)
                                        ? 'border-red-500 focus:border-red-600 focus:ring-red-500 text-red-600 animate-pulse'
                                        : (g.marksObtained === '' || g.marksObtained === null || g.marksObtained === undefined)
                                          ? 'border-blue-400 dark:border-blue-500 focus:border-blue-500 focus:ring-0'
                                          : 'border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-0'
                                        }`}
                                      placeholder={isAbs ? "Ab" : "-"}
                                    />
                                  </td>
                                ))}
                              </React.Fragment>
                            );
                          })}
                          {user?.role === 'SCHOOL' ? (
                            <td className="w-20 px-2 py-2 text-center border-r border-gray-100 dark:border-[#30363d] whitespace-nowrap">
                              {(() => {
                                const status = getStudentPassFailStatus(student);
                                if (status === 'PASS') {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                      <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                                      Pass
                                    </span>
                                  );
                                }
                                if (status === 'FAIL') {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                                      <XCircle size={12} className="text-rose-600 dark:text-rose-400" />
                                      Fail
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                                    —
                                  </span>
                                );
                              })()}
                            </td>
                          ) : (user?.role === 'TEACHER' && selectedSubjectIds.length > 1) ? (
                            <td className="w-14 px-3 py-2 text-center sticky right-0 bg-white dark:bg-[#161b22] z-10 border-l border-gray-100 dark:border-[#30363d]">
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteStudentMarks(student);
                                }}
                                disabled={isFinalLocked}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
                                title={`Delete all subject marks for ${student.name}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : selectedSubjectIds.length > 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-gray-100 dark:border-[#30363d] p-12 flex flex-col items-center justify-center gap-3 text-center text-gray-400 font-bold uppercase">
              <AlertCircle size={48} className="text-gray-300 dark:text-gray-600 mb-2" />
              <p>No students found for Class {selectedClass}{selectedDivision ? ` '${selectedDivision}'` : ''}.</p>
            </div>
      ) : null}

      {/* SCHOOL USER: Teacher Confirmation Pending Banner */}
      {isSchoolUser && schoolAllSelectedLocked && !showExamConfigModal && selectedExamId && !isFinalLocked && selectedSubjectIds.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">
                Teacher Confirmation Pending
              </h3>
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-2">
                The following subjects have not yet been confirmed by the assigned teacher. Mark entry fields are <strong>disabled</strong> until the teacher confirms.
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSubjectIds
                  .filter(subId => !schoolTeacherConfirmedSubjectIds.has(subId))
                  .map(subId => {
                    const subObj = availableSubjects.find(s => s.id === subId);
                    const wfStatus = subjectWorkflowStatuses[subId] || 'NOT_STARTED';
                    return (
                      <span key={subId} className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800">
                        {subObj?.name || subObj?.shortName || subId}
                        <span className="text-[8px] font-bold opacity-70">
                          ({wfStatus === 'NOT_STARTED' ? 'Not Started' : wfStatus === 'IN_PROGRESS' ? 'In Progress' : wfStatus})
                        </span>
                      </span>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {showExamConfigModal && (
        <PremiumExamConfigModal
          isOpen={showExamConfigModal}
          examId={selectedExamId}
          examName={selectedExamObj?.name || ''}
          onClose={() => {
            setShowExamConfigModal(false);
            if (selectedExamId) {
              reloadExamConfig(selectedExamId);
              refetchExams();
            }
          }}
          onSave={() => {
            setShowExamConfigModal(false);
            if (selectedExamId) {
              reloadExamConfig(selectedExamId);
              refetchExams();
            }
          }}
        />
      )}

      <DraftRecoveryModal
        isOpen={recoveryModalOpen}
        metadata={recoveryMetadata}
        recordCount={Object.values(recoveryRecords).reduce((acc, recs) => acc + Object.keys(recs).length, 0)}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
      />

      <ConflictResolutionModal
        isOpen={conflictModalOpen}
        conflicts={conflictedRows}
        onKeepLocal={handleKeepLocal}
        onReloadServer={handleReloadServer}
        onMerge={handleMerge}
        subjectName={availableSubjects.find(s => s.id === pendingSubjectToConfirm?.subId)?.name || 'the subject'}
      />

      {/* Mobile Bottom Fixed Full-Width Save Draft Bar */}
      {!isBulkMode && !isFinalLocked && selectedExamId && displayedStudents.length > 0 && selectedSubjectIds.length > 0 && document.body && createPortal(
        <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 dark:bg-[#161b22]/95 backdrop-blur border-t border-gray-200 dark:border-[#30363d] z-[9999] md:hidden flex flex-col gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
          {!lockedSubjects.includes(selectedSubjectIds[0]) ? (
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving || displayedStudents.length === 0 || selectedSubjectIds.length === 0}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50 ${
                hasUnsavedChanges
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
                  : 'bg-gray-200 dark:bg-[#21262d] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-300 dark:hover:bg-[#2a3038]'
              }`}
            >
              {isSaving ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  <Save size={18} />
                  Save Draft {hasUnsavedChanges && '• Unsaved'}
                </>
              )}
            </button>
          ) : !showExamConfigModal ? (
            <button
              onClick={handleReset}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-red-650 dark:bg-red-700 text-white hover:bg-red-700 transition-all shadow-md active:scale-98"
            >
              Reset Subjects
            </button>
          ) : null}
        </div>,
        document.body
      )}
    </div>
  );
};

export default MarksEntry2Page;
