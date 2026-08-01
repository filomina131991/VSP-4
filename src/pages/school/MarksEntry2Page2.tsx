import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Save, AlertCircle, FileEdit, Settings2, Eye, EyeOff, Plus, Trash2, CheckSquare, X, ChevronDown, ChevronUp, CheckCircle2, XCircle, CheckCircle } from 'lucide-react';
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
import SchoolExamConfigModal from '../../components/school/SchoolExamConfigModal';
import { sortSubjects, getSubjectShortLabel } from '../../lib/subjectUtils';



interface Student {
  id: string;
  name: string;
  className: string;
  globalId?: string;
  division?: string;
  firstLangPaper1?: string;
  firstLangPaper2?: string;
  medium?: string;
  mediumId?: string;
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

  const [marksData, setMarksData] = useState<Record<string, Record<string, SubjectMarkData>>>({});
  const [bulkMarks, setBulkMarks] = useState<any[]>([]);

  const [lockedSubjects, setLockedSubjects] = useState<string[]>([]);
  const [isFinalLocked, setIsFinalLocked] = useState<boolean>(false);
  const [allSubjectsCompleted, setAllSubjectsCompleted] = useState<boolean>(false);
  const [schoolTeachers, setSchoolTeachers] = useState<any[]>([]);
  const [hasDeclaredFinal, setHasDeclaredFinal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSubjectsForReset, setSelectedSubjectsForReset] = useState<string[]>([]);
  const [isResettingSubjects, setIsResettingSubjects] = useState<boolean>(false);
  const [showSubjectPanel, setShowSubjectPanel] = useState<boolean>(false);
  const [showExamConfigModal, setShowExamConfigModal] = useState<boolean>(false);
  const [isSubjectsCollapsed, setIsSubjectsCollapsed] = useState<boolean>(true);
  const [rejectedInputs, setRejectedInputs] = useState<Set<string>>(new Set());
  const unsavedInputKeysRef = useRef<Set<string>>(new Set());
  const [recentlySavedInputKeys, setRecentlySavedInputKeys] = useState<Set<string>>(new Set());
  const [configuredExamIds, setConfiguredExamIds] = useState<string[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);

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

      const configuredIds = confExamsRes.data || [];
      setConfiguredExamIds(configuredIds);
      const filteredExams = examsRes.data.filter((e: any) => configuredIds.includes(e.id));
      setExams(filteredExams);

      const sortedSubjects = sortSubjects(subjectsRes.data || []);
      setSubjects(sortedSubjects);
      setGradeConfig(gradesRes.data);

      let fetchedDbClasses: { className: string; division: string }[] = [];
      if (user?.role === 'SCHOOL' && results[4]) {
        fetchedDbClasses = results[4].data;
        if (results[5]) setSchoolTeachers(results[5].data);
      } else if (user?.role === 'TEACHER' && results[4]) {
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
      const configuredIds = confExamsRes.data || [];
      setConfiguredExamIds(configuredIds);
      const filteredExams = examsRes.data.filter((e: any) => configuredIds.includes(e.id));
      setExams(filteredExams);
    } catch (err) {
      console.error('Failed to refetch exams:', err);
    }
  };

  const [schoolConfig, setSchoolConfig] = useState<any>(null);

  const reloadExamConfig = async (examId: string) => {
    try {
      const res = await apiClient.get(`/school/exam-config/${examId}`, {
        params: { schoolId: user?.schoolId || user?.id }
      });
      const savedConfig = res.data || {};
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

  const availableSubjects = useMemo(() => {
    if (!schoolConfig || !schoolConfig.papers) return [];
    
    let subs = schoolConfig.papers.map((p: any) => ({
      id: p.id, // e.g., P01
      name: p.name,
      shortName: p.id,
      maxMarks: p.maxMarks,
      mappedSubjects: p.subjects || [],
      isPaper: true
    }));

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

        if ((shortUpper === 'P01' || shortUpper === 'P02') && students.length > 0) {
          const langs = new Set<string>();
          students.forEach(st => {
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

    if (user?.role === 'TEACHER' && user?.teachingSubjects && Array.isArray(user.teachingSubjects)) {
      // In dynamic mode, teachers might just get all papers, but we can filter if needed.
      // For now, let's keep all papers accessible to teachers, or you can filter by paper name.
      // As per prompt, all columns should be generated. 
    }
    return sortSubjects(subs);
  }, [schoolConfig, user, selectedMedium, students]);

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

  const studentSubjectApplicability = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    const studentsToUse = classStudents && classStudents.length > 0 ? classStudents : students;

    studentsToUse.forEach((st: any) => {
      const applicable = new Set<string>();
      const studentSubjectNames = new Set(
        (st.subjects || []).map((s: string) => s.trim().toUpperCase())
      );
      
      if (st.firstLangPaper1) studentSubjectNames.add(st.firstLangPaper1.trim().toUpperCase());
      if (st.firstLangPaper2) studentSubjectNames.add(st.firstLangPaper2.trim().toUpperCase());
      if (st.secondLang) studentSubjectNames.add(st.secondLang.trim().toUpperCase());
      if (st.thirdLang) studentSubjectNames.add(st.thirdLang.trim().toUpperCase());
      if (st.medium) studentSubjectNames.add(st.medium.trim().toUpperCase());

      availableSubjects.forEach(paper => {
        const mappedSubjects = paper.mappedSubjects || [];
        if (mappedSubjects.length === 0) {
           applicable.add(paper.id);
           return;
        }

        let isApplicable = false;
        for (const subId of mappedSubjects) {
           const subObj = subjects.find(s => s.id === subId);
           if (!subObj) continue;
           
           const subName = (subObj.name || '').trim().toUpperCase();
           if (studentSubjectNames.has(subName)) {
             isApplicable = true;
             break;
           }
           
           if (st.medium) {
             const med = st.medium.toUpperCase();
             let suffix = '';
             if (med === 'TAMIL') suffix = ' TM';
             if (med === 'ENGLISH') suffix = ' EM';
             if (med === 'MALAYALAM') suffix = ' MM';
             
             if (suffix && subName.endsWith(suffix)) {
                if (subName.includes('MATHEMATICS') || subName.includes('SCIENCE') || subName.includes('SOCIAL')) {
                  isApplicable = true;
                  break;
                }
             }
           }
        }
        if (isApplicable) applicable.add(paper.id);
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

  useEffect(() => {
    if (!selectedMedium && students.length > 0) {
      const studentMediums = new Set<string>();
      students.forEach(st => { if (st.medium) studentMediums.add(st.medium); });
      const availableMeds = Array.from(studentMediums);
      
      if (user?.role === 'TEACHER' && (user as any).mediums) {
        const teacherMeds = (user as any).mediums as string[];
        const resolvedTeacherMeds = teacherMeds.map(val => mediums.find(m => m.id === val || m.name === val || m.code === val || m.shortName === val)?.shortName ?? val);
        const validMeds = availableMeds.filter(m => resolvedTeacherMeds.includes(m));
        if (validMeds.length > 0) setSelectedMedium(validMeds[0]);
      } else if (availableMeds.length > 0) {
        setSelectedMedium(availableMeds[0]);
      }
    }
  }, [students, selectedMedium, user, mediums]);


  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (user?.role === 'TEACHER') {
        // Do not auto-select all subjects for teachers since they must select one at a time.
        // Optionally select the first subject:
        // setSelectedSubjectIds([availableSubjects[0].id]);
        setSelectedSubjectIds([]);
      } else {
        setSelectedSubjectIds(availableSubjects.map(s => s.id));
      }
    } else {
      setSelectedSubjectIds([]);
    }
  }, [availableSubjects, user?.role]);

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
    return subConfig?.groups || [];
  };

  const loadStudentsAndMarks = async () => {
    setIsLoading(true);
    try {
      const studentsRes = await apiClient.get(`/management/students`, {
        params: { schoolId: user?.schoolId || user?.id, className: selectedClass }
      });
      const fetchedStudents = studentsRes.data.students || studentsRes.data;
      setStudents(fetchedStudents);

      if (isBulkMode) {
        const marksReq = await apiClient.get(`/marks/batch-all`, { params: { examId: selectedExamId, schoolId: user?.schoolId || user?.id, className: selectedClass } });
        setBulkMarks(marksReq.data.marks || marksReq.data);
        setAllSubjectsCompleted(marksReq.data.allCompleted || false);
        setIsFinalLocked(marksReq.data.isFinalLocked || false);
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

        await Promise.all(selectedSubjectIds.map(async (subId) => {
          try {
            const marksRes = await apiClient.get(`/marks/batch`, { params: { examId: selectedExamId, subjectId: subId, schoolId: user?.schoolId || user?.id, className: selectedClass } });
            const fetchedMarks = marksRes.data.marks || marksRes.data;
            if (marksRes.data.allCompleted === false) allComp = false;

            if (fetchedMarks && fetchedMarks.length > 0) {
              fetchedMarks.forEach((m: any) => {
                if (m.locked) loadedLock = true;
                if (m.finalLocked) loadedFinalLock = true;
                if (newMarksData[m.studentId] && newMarksData[m.studentId][subId]) {
                  if (m.grade === 'Ab') newMarksData[m.studentId][subId].isAbsent = true;
                  if (m.markGroups && m.markGroups.length > 0) {
                    newMarksData[m.studentId][subId].markGroups = newMarksData[m.studentId][subId].markGroups.map(g => {
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

        let allInputsFilled = true;
        if (fetchedStudents.length === 0 || availableSubjects.length === 0) {
          allInputsFilled = false;
        } else {
          for (const s of fetchedStudents) {
            for (const sub of availableSubjects) {
              const data = newMarksData[s.id]?.[sub.id];
              if (!data) {
                allInputsFilled = false;
                break;
              }
              if (!data.isAbsent) {
                const hasEmpty = data.markGroups.some((g: any) => g.marksObtained === '' || g.marksObtained === null || g.marksObtained === undefined);
                if (hasEmpty) {
                  allInputsFilled = false;
                  break;
                }
              }
            }
            if (!allInputsFilled) break;
          }
        }

        setAllSubjectsCompleted(allComp && allInputsFilled);
        setMarksData(newMarksData);
      }
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkChange = (studentId: string, subjectId: string, groupName: string, value: string, studentIdx: number, subIdx: number, groupIdx: number, maxTotal: number) => {
    if (lockedSubjects.includes(subjectId) || isFinalLocked) return;
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

    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: {
          ...prev[studentId][subjectId],
          markGroups: prev[studentId][subjectId].markGroups.map(g => {
            if (g.name === groupName) {
              if (safeValue === '*') return { ...g, marksObtained: '*' as any };
              let num = Number(safeValue);
              if (num < 0) num = 0;
              return { ...g, marksObtained: safeValue === '' ? '' : num };
            }
            return g;
          })
        }
      }
    }));

    unsavedInputKeysRef.current.add(`${studentId}-${subjectId}-${groupName}`);

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
    if (pct >= 30) return 'D+';
    if (pct >= 20) return 'D';
    return 'E';
  };

  const toggleAbsent = (studentId: string, subjectId: string) => {
    if (lockedSubjects.includes(subjectId) || isFinalLocked) return;
    setMarksData(prev => {
      const isAbs = !prev[studentId][subjectId].isAbsent;
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subjectId]: {
            ...prev[studentId][subjectId],
            isAbsent: isAbs,
            markGroups: prev[studentId][subjectId].markGroups.map(g => ({ ...g, marksObtained: isAbs ? '' : g.marksObtained }))
          }
        }
      };
    });
  };

  const handleSave = async (confirmSubmit: boolean = false, autoSave: boolean = false) => {
    if (!selectedExamId || selectedSubjectIds.length === 0) return;

    if (confirmSubmit) {
      for (const subId of selectedSubjectIds) {
        const incompleteStudent = displayedStudents.find(s => {
          if (!isSubjectApplicable(s.id, subId)) return false;
          const sub = availableSubjects.find(x => x.id === subId);
          if (sub) {
            const getPCode = (s: any) => {
              const str = `${s.shortName || ''} ${s.name || ''}`.toUpperCase();
              const match = str.match(/P\d{2}/);
              return match ? match[0] : s.shortName;
            };
            const currentPCode = getPCode(sub);
            const sameCodeSubjects = availableSubjects.filter(x => getPCode(x) === currentPCode && x.id !== sub.id);
            const sameCodeHasMarks = sameCodeSubjects.some(x => {
              const otherData = marksData[s.id]?.[x.id];
              return otherData && otherData.markGroups && otherData.markGroups.some((g: any) => g.marksObtained !== '' && g.marksObtained !== null && g.marksObtained !== undefined);
            });
            const data = marksData[s.id]?.[subId];
            const hasThisMarks = data && data.markGroups && data.markGroups.some((g: any) => g.marksObtained !== '' && g.marksObtained !== null && g.marksObtained !== undefined);
            if (sameCodeHasMarks && !hasThisMarks) {
              return false; // Mutually excluded
            }
          }
          const data = marksData[s.id]?.[subId];
          if (!data) return true;
          if (data.isAbsent) return false;
          return data.markGroups.some(g => g.marksObtained === '' || g.marksObtained === null);
        });

        const invalidStudent = displayedStudents.find(s => {
          const data = marksData[s.id]?.[subId];
          if (!data || data.isAbsent) return false;
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
    try {
      let allComp = false;
      for (const subId of selectedSubjectIds) {
        const payload = displayedStudents.filter(s => {
          if (!isSubjectApplicable(s.id, subId)) return false;
          const sub = availableSubjects.find(x => x.id === subId);
          if (sub) {
            const getPCode = (s: any) => {
              const str = `${s.shortName || ''} ${s.name || ''}`.toUpperCase();
              const match = str.match(/P\d{2}/);
              return match ? match[0] : s.shortName;
            };
            const currentPCode = getPCode(sub);
            const sameCodeSubjects = availableSubjects.filter(x => getPCode(x) === currentPCode && x.id !== sub.id);
            const sameCodeHasMarks = sameCodeSubjects.some(x => {
              const otherData = marksData[s.id]?.[x.id];
              return otherData && otherData.markGroups && otherData.markGroups.some((g: any) => g.marksObtained !== '' && g.marksObtained !== null && g.marksObtained !== undefined);
            });
            const data = marksData[s.id]?.[subId];
            const hasThisMarks = data && data.markGroups && data.markGroups.some((g: any) => g.marksObtained !== '' && g.marksObtained !== null && g.marksObtained !== undefined);
            if (sameCodeHasMarks && !hasThisMarks) {
              return false; // Mutually excluded
            }
          }
          return true;
        }).map(s => {
          const data = marksData[s.id]?.[subId] || { isAbsent: false, markGroups: getGroupsForSubject(subId).map(g => ({ ...g, marksObtained: '' })) };
          if (data.isAbsent) {
            return { studentId: s.id, className: s.className, ...data, totalObtained: 0, grade: 'Ab', isEmpty: false };
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
          if (!hasMarks && !data.isAbsent) {
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
          for (const sub of availableSubjects) {
            const data = marksData[s.id]?.[sub.id];
            if (!data) {
              allInputsFilled = false;
              break;
            }
            if (!data.isAbsent) {
              const hasEmpty = data.markGroups.some((g: any) => g.marksObtained === '' || g.marksObtained === null || g.marksObtained === undefined);
              if (hasEmpty) {
                allInputsFilled = false;
                break;
              }
            }
          }
          if (!allInputsFilled) break;
        }
      }

      setAllSubjectsCompleted(allComp && allInputsFilled);
      if (confirmSubmit) setLockedSubjects(prev => Array.from(new Set([...prev, ...selectedSubjectIds])));
      
      // Only show success toast if it's a manual save or confirm, avoid spamming on auto-save
      if (confirmSubmit || !autoSave) toast.success(confirmSubmit ? 'Marks Confirmed & Locked!' : 'Draft saved successfully');
      
      if (unsavedInputKeysRef.current.size > 0) {
        setRecentlySavedInputKeys(new Set(unsavedInputKeysRef.current));
        unsavedInputKeysRef.current.clear();
        setTimeout(() => {
          setRecentlySavedInputKeys(new Set());
        }, 3000);
      }

      await refetchExams();
    } catch (err) {
      if (!autoSave) toast.error('Failed to finalize subject entry');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Auto-Save for School Users ---
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (user?.role === 'SCHOOL' && Object.keys(marksData).length > 0) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave(false, true); // true indicates it's an auto-save
      }, 2000); // 2 seconds debounce
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [marksData]); // Trigger on marksData change

  const handleBulkSave = async (marksDataList: any[], confirm: boolean, finalConfirm: boolean) => {
    setIsSaving(true);
    try {
      const res = await apiClient.post('/marks/entry-all', {
        schoolId: user?.schoolId || user?.id,
        examId: selectedExamId,
        marksData: marksDataList,
        confirm,
        finalConfirm
      });

      toast.success(res.data.message || 'Marks saved successfully');

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
    setIsSaving(true);
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
      toast.success('Subject Confirmed & Locked!');
      await refetchExams();
      if (selectedExamId) {
        await reloadExamConfig(selectedExamId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm subject');
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

  const handleConfirmClick = async () => {
    if (hasValidationErrors || !isAllVisibleInputsComplete || selectedSubjectIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Confirm Subject Marks',
      text: 'Once confirmed, the marks for this subject cannot be edited. Are you sure all marks are correct?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Confirm',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#9ca3af',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      await handleSave(true);
    }
  };

  const handleFinalConfirm = async () => {
    // Client-side strict validation
    for (let studentIdx = 0; studentIdx < displayedStudents.length; studentIdx++) {
      const st = displayedStudents[studentIdx];
      for (let subIdx = 0; subIdx < availableSubjects.length; subIdx++) {
        const sub = availableSubjects[subIdx];
        const data = marksData[st.id]?.[sub.id];

        const focusInput = (groupIdx: number) => {
          const inputEl = document.getElementById(`input-${studentIdx}-${subIdx}-${groupIdx}`);
          if (inputEl) {
            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputEl.focus();
            inputEl.classList.add('animate-pulse', 'border-red-500', 'ring-2', 'ring-red-500');
            setTimeout(() => inputEl.classList.remove('animate-pulse', 'border-red-500', 'ring-2', 'ring-red-500'), 3000);
          }
        };

        if (!data) {
           toast.error(`Validation Failed: Missing marks for ${st.name} in ${sub.name}. Please enter all marks or 'Ab' before confirming.`);
           focusInput(0);
           return;
        }
        if (!data.isAbsent) {
          const emptyGroupIdx = data.markGroups.findIndex(g => g.marksObtained === '' || g.marksObtained === null || g.marksObtained === undefined);
          if (emptyGroupIdx !== -1) {
             toast.error(`Validation Failed: Missing marks for ${st.name} in ${sub.name}. Please enter all marks or 'Ab' before confirming.`);
             focusInput(emptyGroupIdx);
             return;
          }
        }
      }
    }

    // Step 1: First confirmation
    const step1 = await Swal.fire({
      title: 'Do you want to confirm?',
      text: 'I confirm that marks have been entered for all subjects.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Continue',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#9ca3af',
      reverseButtons: true
    });

    if (!step1.isConfirmed) return;

    // Step 2: Final confirmation
    const step2 = await Swal.fire({
      title: 'Final Confirmation',
      text: 'I confirm that marks have been entered for all students in all subjects. I understand that once confirmed, marks cannot be edited again, and I will not request a reset again.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'I Confirm',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#9ca3af',
      reverseButtons: true
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
      toast.success('Marks finalized and locked successfully.');
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
  }, [students, selectedDivision, sortOption]);

  const availableDivisions = useMemo(() => {
    const divs = new Set(dbClasses.filter(c => c.className === selectedClass).map(c => (c.division || '').toUpperCase()).filter(d => d !== ''));
    return Array.from(divs).sort();
  }, [dbClasses, selectedClass]);

  const hasValidationErrors = useMemo(() => {
    return displayedStudents.some(s => {
      return selectedSubjectIds.some(subId => {
        const data = marksData[s.id]?.[subId];
        if (!data || data.isAbsent) return false;
        return data.markGroups.some(g => Number(g.marksObtained) > g.total);
      });
    });
  }, [displayedStudents, marksData, selectedSubjectIds]);

  const isAllVisibleInputsComplete = useMemo(() => {
    if (students.length === 0 || selectedSubjectIds.length === 0) return false;
    for (const s of students) {
      for (const subId of selectedSubjectIds) {
        if (!isSubjectApplicable(s.id, subId)) continue;
        
        const sub = availableSubjects.find(x => x.id === subId);
        if (sub) {
          const getPCode = (s: any) => {
            const str = `${s.shortName || ''} ${s.name || ''}`.toUpperCase();
            const match = str.match(/P\d{2}/);
            return match ? match[0] : s.shortName;
          };
          const currentPCode = getPCode(sub);
          const sameCodeSubjects = availableSubjects.filter(x => getPCode(x) === currentPCode && x.id !== sub.id);
          const sameCodeHasMarks = sameCodeSubjects.some(x => {
            const otherData = marksData[s.id]?.[x.id];
            return otherData && otherData.markGroups && otherData.markGroups.some((g: any) => g.marksObtained !== '' && g.marksObtained !== null && g.marksObtained !== undefined);
          });
          const data = marksData[s.id]?.[subId];
          const hasThisMarks = data && data.markGroups && data.markGroups.some((g: any) => g.marksObtained !== '' && g.marksObtained !== null && g.marksObtained !== undefined);
          if (sameCodeHasMarks && !hasThisMarks) {
            continue; // Mutually excluded
          }
        }

        const data = marksData[s.id]?.[subId];
        if (!data) return false; // Not even initialized
        if (data.isAbsent) continue;
        const hasEmpty = data.markGroups.some((g: any) => g.marksObtained === '' || g.marksObtained === null || g.marksObtained === undefined);
        if (hasEmpty) return false;
      }
    }
    return true;
  }, [students, marksData, selectedSubjectIds, isSubjectApplicable, availableSubjects]);

  const isLocked = selectedSubjectIds.length > 0 && selectedSubjectIds.every(id => lockedSubjects.includes(id));

  return (
    <div className="space-y-6 p-5 text-slate-900 dark:text-white">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-[#161b22] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-[#30363d]">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase flex items-center gap-3">
            <FileEdit size={32} className="text-indigo-500" />
            Marks Entry 2.0
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Dynamic Mark Group Entry</p>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          {user?.role === 'SCHOOL' && (
            <button
              onClick={() => setShowExamConfigModal(true)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 border ${
                configuredExamIds.includes(selectedExamId)
                  ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:hover:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-400 dark:border-emerald-600 shadow-emerald-500/10'
                  : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border-transparent'
              }`}
            >
              <Settings2 size={18} className={configuredExamIds.includes(selectedExamId) ? 'text-emerald-600 dark:text-emerald-400' : ''} />
              {configuredExamIds.includes(selectedExamId) ? '✓ Exam Configured' : 'Exam Config'}
            </button>
          )}
          {selectedExamId && availableSubjects.length > 0 && !isFinalLocked && !isBulkMode && (
            <button
              onClick={() => setShowSubjectPanel(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all shadow-sm active:scale-95 focus:outline-none"
            >
              <CheckSquare size={18} className="text-indigo-500" />
              Subject Status
            </button>
          )}
          {selectedExamId && (
            isFinalLocked ? (
              <div className="bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-400 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-sm">
                Finalized
              </div>
            ) : !isLocked ? (
              !isBulkMode && (
                <>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={isSaving || displayedStudents.length === 0 || selectedSubjectIds.length === 0 || hasValidationErrors}
                    className="flex items-center gap-2 bg-gray-200 dark:bg-[#21262d] text-gray-800 dark:text-gray-200 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-300 dark:hover:bg-[#30363d] transition-all shadow-sm active:scale-95 disabled:opacity-50 border border-transparent dark:border-[#30363d]"
                  >
                    <Save size={18} />
                    Save Draft
                  </button>
                  {isAllVisibleInputsComplete && !hasValidationErrors && selectedSubjectIds.length > 0 && (
                    <button
                      onClick={handleConfirmClick}
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} />
                      Confirm Subject
                    </button>
                  )}
                </>
              )
            ) : (
              !isBulkMode && user?.role === 'SCHOOL' && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 bg-red-650 dark:bg-red-700 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-red-700 dark:hover:bg-red-600 transition-all shadow-md active:scale-95"
                >
                  Reset Subjects
                </button>
              )
            )
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

      {showSubjectPanel && selectedExamId && !isFinalLocked && availableSubjects.length > 0 && !isBulkMode && (
        <Modal isOpen={showSubjectPanel} onClose={() => setShowSubjectPanel(false)} disableOutsideClick={true}>
          <div className="bg-white dark:bg-[#161b22] rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-xl overflow-hidden flex flex-col border border-gray-100 dark:border-[#30363d] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#30363d] bg-indigo-50/40 dark:bg-indigo-950/10">
              <div className="flex items-center gap-3">
                <Settings2 size={24} className="text-indigo-500" />
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Subject Status Dashboard</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                    Confirmed: {currentSchoolConfirmedSubjects.length} / {availableSubjects.length} subjects
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowSubjectPanel(false)} 
                className="p-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-400 hover:text-indigo-600 transition-all focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              
              {/* Pending Subjects Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-950 pb-2">
                  <h3 className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={16} />
                    Pending / Draft ({availableSubjects.length - currentSchoolConfirmedSubjects.length})
                  </h3>
                </div>
                
                {availableSubjects.filter(sub => !currentSchoolConfirmedSubjects.includes(sub.id)).length === 0 ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950/15 border border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400 rounded-xl text-xs font-bold uppercase text-center w-full">
                    All subjects are completed and confirmed!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {availableSubjects.filter(sub => !currentSchoolConfirmedSubjects.includes(sub.id)).map(sub => {
                      const assignedTeachers = schoolTeachers.filter(t => (t as any).teachingSubjects?.includes(sub.id));
                      const teacherNames = assignedTeachers.length > 0 
                        ? assignedTeachers.map(t => t.name).join(', ') 
                        : 'Unassigned';
                      return (
                        <div key={sub.id} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-full shadow-sm w-full">
                          <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-black text-amber-900 dark:text-amber-100 uppercase leading-none truncate">{sub.shortName}</span>
                            <span className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5 truncate">{teacherNames}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirmed Subjects Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-green-100 dark:border-green-955 pb-2">
                  <h3 className="text-sm font-black text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    Confirmed & Locked ({currentSchoolConfirmedSubjects.length})
                  </h3>
                  {user?.role === 'SCHOOL' && currentSchoolConfirmedSubjects.length > 0 && (
                    <button
                      onClick={handleResetSelectedSubjects}
                      disabled={selectedSubjectsForReset.length === 0 || isResettingSubjects}
                      className="flex items-center gap-1.5 bg-red-650 hover:bg-red-700 text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 focus:outline-none"
                    >
                      {isResettingSubjects ? 'Resetting...' : `Reset Selected (${selectedSubjectsForReset.length})`}
                    </button>
                  )}
                </div>

                {currentSchoolConfirmedSubjects.length === 0 ? (
                  <div className="p-4 bg-gray-50 dark:bg-[#1a1f26] border border-gray-200 dark:border-[#30363d] text-gray-400 dark:text-gray-500 rounded-xl text-xs font-bold uppercase text-center w-full">
                    No confirmed subjects yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {availableSubjects.filter(sub => currentSchoolConfirmedSubjects.includes(sub.id)).map(sub => {
                      const isChecked = selectedSubjectsForReset.includes(sub.id);
                      const assignedTeachers = schoolTeachers.filter(t => (t as any).teachingSubjects?.includes(sub.id));
                      const teacherNames = assignedTeachers.length > 0 
                        ? assignedTeachers.map(t => t.name).join(', ') 
                        : 'Unassigned';
                      
                      return (
                        <div 
                          key={sub.id}
                          onClick={() => user?.role === 'SCHOOL' && toggleSubjectSelectForReset(sub.id)}
                          className={`flex items-center gap-2 pl-3 pr-2 py-1.5 border rounded-full shadow-sm transition-all w-full ${
                            user?.role === 'SCHOOL' 
                              ? isChecked 
                                ? 'bg-red-50 border-red-300 cursor-pointer dark:bg-red-950/20 dark:border-red-800' 
                                : 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer dark:bg-green-950/10 dark:border-green-800 dark:hover:bg-green-950/20'
                              : 'bg-green-50 border-green-200 dark:bg-green-950/10 dark:border-green-800'
                          }`}
                        >
                          {isChecked ? (
                            <XCircle size={14} className="text-red-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0 flex-1 mr-1">
                            <span className={`text-xs font-black uppercase leading-none truncate ${isChecked ? 'text-red-900 dark:text-red-300' : 'text-green-900 dark:text-green-300'}`}>{sub.shortName}</span>
                            <span className={`text-[9px] font-semibold mt-0.5 truncate ${isChecked ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>{teacherNames}</span>
                          </div>
                          
                          {user?.role === 'SCHOOL' && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleResetSubject(sub.id); }}
                              disabled={isResettingSubjects}
                              className="ml-1 flex-shrink-0 text-[9px] font-bold text-red-600 bg-white hover:bg-red-50 border border-red-100 px-2 py-0.5 rounded-full transition-colors dark:bg-red-950 dark:border-red-900 dark:hover:bg-red-900/50"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-4 border-t border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={() => setShowSubjectPanel(false)}
                className="px-6 py-2.5 bg-gray-200 dark:bg-[#30363d] hover:bg-gray-300 dark:hover:bg-indigo-650 dark:hover:text-white text-gray-800 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 focus:outline-none"
              >
                Close Status Dashboard
              </button>
            </div>

          </div>
        </Modal>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center"><PageLoader /></div>
      ) : exams.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm font-medium border border-blue-100 dark:border-blue-800 flex items-center justify-center w-full shadow-sm text-center">
          Please configure an exam first using the 'Exam Config' button to proceed with Marks Entry.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 bg-white dark:bg-[#161b22] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-[#30363d]">
            <ExamSelect
              exams={exams}
              selectedExamId={selectedExamId}
              onSelect={(id) => { setSelectedExamId(id); setSelectedSubjectIds([]); }}
              placeholder="Select Exam"
              configuredIds={configuredExamIds}
              className="min-w-[350px]"
            />

            {true && (
              <Dropdown
                minWidth={120}
                ariaLabel="Select Medium"
                placeholder="Select Medium..."
                value={selectedMedium}
                onChange={(v) => { setSelectedMedium(v); setSelectedSubjectIds([]); }}
                options={(() => {
                  const resolveMed = (val: string) => mediums.find(m => m.id === val || m.name === val || m.code === val || m.shortName === val)?.name ?? val;
                  if (user?.role === 'TEACHER' && (user as any).mediums) {
                    return (user as any).mediums.map((m: string) => ({ value: resolveMed(m), label: resolveMed(m) }));
                  }
                  const studentMediums = new Set<string>();
                  students.forEach(st => { if (st.medium) studentMediums.add(st.medium); });
                  return Array.from(studentMediums).map((m: string) => ({ value: m, label: resolveMed(m) }));
                })()}
              />
            )}

            <Dropdown
              minWidth={100}
              ariaLabel="Select Class"
              placeholder="Select Class"
              value={selectedClass}
              disabled={dbClasses.length === 0}
              onChange={(v) => { setSelectedClass(v); setSelectedDivision(''); setSelectedMedium(''); }}
              options={
                dbClasses.length === 0
                  ? []
                  : Array.from(new Set(dbClasses.map(c => c.className))).map(c => ({ value: c, label: `Class ${c}` }))
              }
            />

            {availableDivisions.length > 0 && (
              <Dropdown
                minWidth={100}
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
                minWidth={160}
                ariaLabel="Select Subject"
                placeholder="Select Subject..."
                value={selectedSubjectIds[0] || ''}
                onChange={(v) => setSelectedSubjectIds([v])}
                options={availableSubjects.map((s: any) => ({ value: s.id, label: `${getSubjectShortLabel(s)} - ${s.name || s.shortName}` }))}
              />
            )}

            <Dropdown
              minWidth={200}
              ariaLabel="Sort Order"
              value={sortOption}
              onChange={(v) => setSortOption(v as any)}
              className="col-span-2 md:col-auto"
              options={[
                { value: 'FEMALE_MALE_ALPHA', label: 'Female - Male' },
                { value: 'MALE_FEMALE_ALPHA', label: 'Male - Female' },
                { value: 'REG_NO', label: 'Admission No / Reg No' },
                { value: 'ALPHA', label: 'Alphabets' },
              ]}
            />

            {selectedExamId && user?.role !== 'TEACHER' && (
              <div className="flex flex-col gap-2 w-full mt-2 bg-gray-50/50 dark:bg-[#1a1f26]/30 p-4 rounded-2xl border border-gray-100 dark:border-[#30363d] transition-all">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsSubjectsCollapsed(!isSubjectsCollapsed)}
                    className="flex items-center gap-2 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-indigo-500 transition-colors focus:outline-none"
                  >
                    <span>Select Subjects to Enter Marks</span>
                    {isSubjectsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    {isSubjectsCollapsed && (
                      <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold lowercase tracking-normal bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full">
                        ({selectedSubjectIds.length} of {availableSubjects.length} selected)
                      </span>
                    )}
                  </button>
                  {!isSubjectsCollapsed && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={availableSubjects.length > 0 && selectedSubjectIds.length === availableSubjects.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const validSubjects = availableSubjects.filter(s => {
                              const subCode = s.code || ((`${s.shortName || ''} ${s.name || ''}`.toUpperCase().match(/P\d{2}/)?.[0] || s.shortName));
                              const subjectMaxMarks = selectedExamObj?.maxMarks?.[s.id] ?? (subCode && selectedExamObj?.maxMarks?.[subCode]);
                              return subjectMaxMarks !== undefined && subjectMaxMarks !== null;
                            });
                            if (validSubjects.length < availableSubjects.length) {
                                toast.error('Some subjects are not allowed for this exam configuration and were skipped.');
                            }
                            setSelectedSubjectIds(validSubjects.map(s => s.id));
                          } else {
                            setSelectedSubjectIds([]);
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Select All</span>
                    </label>
                  )}
                </div>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isSubjectsCollapsed
                      ? 'max-h-0 opacity-0 pointer-events-none mt-0'
                      : 'max-h-[500px] opacity-100 mt-3'
                  }`}
                >
                  <div className="flex flex-wrap gap-2 pt-1">
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
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-gray-100 dark:border-[#30363d] p-12 flex flex-col items-center justify-center gap-3 text-gray-400 font-bold uppercase text-sm text-center">
              <AlertCircle size={48} className="text-gray-300 dark:text-gray-600 mb-2" />
              <p>Please select an exam to proceed.</p>
            </div>
          ) : user?.role === 'TEACHER' && dbClasses.length === 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-red-100 dark:border-red-900/50 p-12 flex flex-col items-center justify-center gap-3 text-red-600 dark:text-red-400 font-bold uppercase text-sm text-center">
              <AlertCircle size={48} className="text-red-500 mb-2" />
              <p>NO CLASSES ASSIGNED</p>
              <p className="text-xs text-red-400 dark:text-red-500 normal-case">You have not been assigned any classes in your profile. Please contact the School Admin to edit your profile and assign classes.</p>
            </div>
          ) : user?.role === 'TEACHER' && availableSubjects.length === 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-red-100 dark:border-red-900/50 p-12 flex flex-col items-center justify-center gap-3 text-red-600 dark:text-red-400 font-bold uppercase text-sm text-center">
              <AlertCircle size={48} className="text-red-500 mb-2" />
              <p>NO SUBJECTS ASSIGNED</p>
              <p className="text-xs text-red-400 dark:text-red-500 normal-case">You have not been assigned any subjects for this class/exam. Please contact the School Admin to edit your profile and assign subjects.</p>
            </div>
          ) : user?.role === 'TEACHER' && !selectedDivision ? (
             <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-amber-100 dark:border-amber-900/50 p-12 flex flex-col items-center justify-center gap-3 text-amber-600 dark:text-amber-400 font-bold uppercase text-sm text-center">
              <AlertCircle size={48} className="text-amber-500 mb-2" />
              <p>Please select a Division </p>
              <p className="text-xs text-amber-500 dark:text-amber-600 normal-case">You must select a division from the dropdown above to load the students list.</p>
            </div>
          ) : isBulkMode ? (
            <MarksEntryBulkGrid
              students={displayedStudents}
              availableSubjects={availableSubjects.filter(s => selectedSubjectIds.includes(s.id))}
              selectedExam={exams.find(e => e.id === selectedExamId)}
              onSave={handleBulkSave}
              onConfirmSubject={handleConfirmSubject}
              onResetSubject={handleResetSubject}
              isLoading={isSaving}
              lockedSubjects={lockedSubjects}
              isFinalLocked={isFinalLocked}
              existingMarks={bulkMarks}
              isSubjectApplicable={isSubjectApplicable}
            />
          ) : selectedSubjectIds.length === 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-gray-100 dark:border-[#30363d] p-12 flex flex-col items-center justify-center gap-3 text-gray-400 font-bold uppercase text-sm text-center">
              <AlertCircle size={48} className="text-gray-300 dark:text-gray-600 mb-2" />
              <p>Please select at least one subject to view the marks entry grid.</p>
            </div>
          ) : displayedStudents.length > 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-gray-100 dark:border-[#30363d] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="border-b-2 border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-[#1a1f26]">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-[#1a1f26] z-10 border-r border-gray-200 dark:border-[#30363d]" rowSpan={2}>Student Name</th>
                      {selectedSubjectIds.map(subId => {
                        const subObj = availableSubjects.find(s => s.id === subId);
                        const groups = getGroupsForSubject(subId);
                        return (
                          <th key={subId} colSpan={groups.length + 2} className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300 text-center border-b border-gray-200 dark:border-[#30363d] border-r">
                            {subObj ? getSubjectShortLabel(subObj) : 'Subject'}
                          </th>
                        );
                      })}
                    </tr>
                    <tr className="border-b-2 border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-[#1a1f26]">
                      {selectedSubjectIds.map(subId => {
                        const groups = getGroupsForSubject(subId);
                        return (
                          <React.Fragment key={subId}>
                            <th className="px-2 py-2 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center border-r border-gray-200 dark:border-[#30363d]">Absent</th>
                            {groups.map(g => (
                              <th key={g.name} className="px-2 py-2 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center">
                                {g.name} <span className="text-gray-400 block mt-0.5">({g.total})</span>
                              </th>
                            ))}
                            <th className="px-2 py-2 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center bg-gray-100 dark:bg-[#1f242c]/65 border-l border-r border-gray-200 dark:border-[#30363d]">Total</th>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStudents.map((student, studentIdx) => {
                      return (
                        <tr key={student.id} className="border-b border-gray-50 dark:border-[#30363d] hover:bg-indigo-50/30 dark:hover:bg-indigo-950/15 transition-colors">
                          <td className="px-4 py-3 sticky left-0 bg-white dark:bg-[#161b22] z-10 border-r border-gray-100 dark:border-[#30363d]">
                            <div className="flex items-start gap-2.5">
                              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 font-mono mt-0.5 min-w-[20px] text-right">
                                {studentIdx + 1}.
                              </span>
                              <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{student.name}</div>
                                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">Reg: {student.globalId} | Class {student.className}</div>
                              </div>
                            </div>
                          </td>

                          {selectedSubjectIds.map((subId, subIdx) => {
                            const data = marksData[student.id]?.[subId];
                            const groups = getGroupsForSubject(subId);

                            if (!data) {
                              return (
                                <td key={subId} colSpan={groups.length + 2} className="px-2 py-3 text-center border-r border-gray-100 dark:border-[#30363d]">
                                  -
                                </td>
                              );
                            }

                            let rowTotal = 0;
                            if (!data.isAbsent) {
                              data.markGroups.forEach((g: any) => {
                                rowTotal += Number(g.marksObtained || 0);
                              });
                            }

                            const selectedSubjectObj = availableSubjects.find(s => s.id === subId);
                            const subCode = selectedSubjectObj?.shortName || selectedSubjectObj?.name || '';
                            const calculatedMaxMarks = groups.reduce((acc, g) => acc + (g.total || 0), 0);
                            const subjectMaxMarks = selectedExamObj?.maxMarks?.[subId] || (subCode && selectedExamObj?.maxMarks?.[subCode]) || (calculatedMaxMarks > 0 ? calculatedMaxMarks : 20);
                            const rowGrade = data.isAbsent ? 'Ab' : getGrade(rowTotal, subjectMaxMarks, student.className);
                            const hasMarks = data.markGroups.some((g: any) => g.marksObtained !== '' && g.marksObtained !== null && g.marksObtained !== undefined);

                            return (
                              <React.Fragment key={subId}>
                                <td className={`px-2 py-3 text-center border-r border-gray-100 dark:border-[#30363d] ${data.isAbsent ? 'bg-gray-50 dark:bg-[#1f242c]/30' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={!!data.isAbsent}
                                    onChange={() => toggleAbsent(student.id, subId)}
                                    disabled={(user?.role === 'TEACHER' ? lockedSubjects.includes(subId) : !lockedSubjects.includes(subId)) || isFinalLocked}
                                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                                {data.markGroups.map((g: any, groupIdx: number) => (
                                  <td key={groupIdx} className={`px-1 py-3 text-center ${data.isAbsent ? 'bg-gray-50 dark:bg-[#1f242c]/30' : ''}`}>
                                    <div className="relative inline-block w-full">
                                      <input
                                        id={`input-${studentIdx}-${subIdx}-${groupIdx}`}
                                        type="text"
                                        inputMode="numeric"
                                        value={data.isAbsent ? '' : g.marksObtained}
                                        onChange={(e) => handleMarkChange(student.id, subId, g.name, e.target.value, studentIdx, subIdx, groupIdx, g.total)}
                                        disabled={(user?.role === 'TEACHER' ? lockedSubjects.includes(subId) : !lockedSubjects.includes(subId)) || isFinalLocked || data.isAbsent}
                                        className={`w-full min-w-[2.5rem] max-w-[4rem] mx-auto px-1 py-1 text-center text-sm font-bold border-2 rounded-lg bg-transparent text-slate-800 dark:text-white outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:opacity-60 ${rejectedInputs.has(`${student.id}-${subId}-${g.name}`)
                                          ? 'border-red-500 focus:border-red-600 focus:ring-red-500 text-red-600 animate-pulse'
                                          : (g.marksObtained === '' || g.marksObtained === null || g.marksObtained === undefined)
                                            ? 'border-blue-400 dark:border-blue-500 focus:border-blue-500 focus:ring-0'
                                            : 'border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-0'
                                          }`}
                                        placeholder={data.isAbsent ? "Ab" : "-"}
                                      />
                                      {recentlySavedInputKeys.has(`${student.id}-${subId}-${g.name}`) && (
                                        <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2">
                                          <div className="absolute inline-flex w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75"></div>
                                          <div className="relative inline-flex w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-[#161b22]"></div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                ))}
                                <td className={`px-2 py-3 text-center border-l border-r border-gray-200 dark:border-[#30363d] bg-gray-50 dark:bg-[#1f242c]/50 ${data.isAbsent ? 'opacity-70' : ''}`}>
                                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{rowTotal}</div>
                                  {rowGrade && <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">{rowGrade}</div>}
                                </td>
                              </React.Fragment>
                            );
                          })}
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
        </>
      )}

      {/* Fixed Floating Save Actions via Portal */}
      {!isBulkMode && selectedExamId && selectedSubjectIds.length > 0 && document.body && createPortal(
        <div className="fixed bottom-6 right-6 md:right-8 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] z-[9999] flex justify-end gap-3 rounded-2xl p-3 animate-in slide-in-from-bottom-8">
          {isFinalLocked ? (
            <div className="flex items-center gap-2 bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-400 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest cursor-not-allowed">
              Finalized
            </div>
          ) : lockedSubjects.includes(selectedSubjectIds[0]) ? (
            user?.role === 'SCHOOL' ? (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 bg-red-650 dark:bg-red-700 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-red-700 dark:hover:bg-red-600 transition-all shadow-md active:scale-95"
              >
                Reset Subjects
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-400 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest">
                <CheckCircle2 size={16} />
                Confirmed
              </div>
            )
          ) : (
            <>
              <button
                onClick={() => handleSave(false)}
                disabled={isSaving || displayedStudents.length === 0 || selectedSubjectIds.length === 0 || hasValidationErrors}
                className="flex items-center gap-2 bg-gray-200 dark:bg-[#21262d] text-gray-800 dark:text-gray-200 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-300 dark:hover:bg-[#30363d] transition-all shadow-sm active:scale-95 disabled:opacity-50 border border-transparent dark:border-[#30363d]"
              >
                <Save size={18} />
                Save Draft
              </button>
              {isAllVisibleInputsComplete && !hasValidationErrors && (
                <button
                  onClick={handleConfirmClick}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  Confirm
                </button>
              )}
            </>
          )}
        </div>,
        document.body
      )}

      {showExamConfigModal && (
        <SchoolExamConfigModal initialExamId={selectedExamId} onClose={() => {
          setShowExamConfigModal(false);
          if (selectedExamId) reloadExamConfig(selectedExamId);
        }} />
      )}
    </div>
  );
};

export default MarksEntry2Page;