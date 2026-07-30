import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Search,
  FileText,
  AlertCircle,
  AlertTriangle,
  X,
  RefreshCw,
  SlidersHorizontal,
  GraduationCap,
  CheckCircle2,
  Download,
  MoreVertical,
  User,
  Languages
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

import { autoCorrectRow, validateRow, ParsedStudentRow, ValidationError } from '../../lib/studentImportUtils';
import { resolveMediumCode, resolveMediumShortName } from '../../lib/mediumUtils';
import { apiClient } from '../../lib/apiClient';
import { emitRefresh } from '../../lib/eventBus';
import Modal from '../../components/common/Modal';
import Dropdown from '../../components/common/Dropdown';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import PageLoader from '../../components/common/PageLoader';

interface Student {
  id: string;
  regNo?: string;        // alias for globalId on some records
  globalId?: string;     // actual DB field: registration/admission number
  sslcRegNo?: string;
  name: string;
  schoolId: string;
  schoolCode?: string;
  uniqueId?: string;
  gender: string;
  dob: string;
  fatherName?: string;
  motherName?: string;
  caste: string;
  category: string;
  religion: string;
  place: string;
  mobile: string;
  scribe: boolean;
  className?: string;       // actual DB field
  classStandard?: string;   // virtual = className
  division?: string;
  academicYear?: string;
  letterStatus?: number;
  readingStatus?: number;
  writingStatus?: number;
  medium?: string;
  firstLangPaper1?: string;
  firstLangPaper2?: string;
  secondLang?: string;
  thirdLang?: string;
  status?: string;
}

const RELIGIONS = [
  { value: "1", label: "Hindu" },
  { value: "2", label: "Christian" },
  { value: "3", label: "Muslim" },
  { value: "4", label: "Islam" },
  { value: "5", label: "Jain" },
  { value: "6", label: "Sikh" },
  { value: "7", label: "Buddhist" },
  { value: "8", label: "Bahai" },
  { value: "9", label: "Secular" },
  { value: "10", label: "Non-Religion" },
  { value: "11", label: "Not Applicable" },
  { value: "13", label: "Judaism" },
];

const CATEGORIES = ["SC", "ST", "OBC", "OEC", "General"];

const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  // Academic year usually starts around June (6)
  if (month >= 5) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
};

const formatDate = (dateStr: any) => {
  if (!dateStr) return '-';
  try {
    // If it's already a Date object
    const date = (dateStr instanceof Date) ? dateStr : new Date(dateStr);

    if (isNaN(date.getTime())) {
      // Try to handle dd/mm/yyyy if it's already in that format but failed parsing
      if (typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
      }
      return String(dateStr);
    }

    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  } catch (e) {
    return String(dateStr);
  }
};

const STANDARD_NAMES: Record<string, string> = {
  '8': 'Eighth Standard',
  '9': 'Ninth Standard',
  '10': 'Tenth Standard'
};

const StudentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { mediums, subjects: dmSubjects } = useData();
  const allMediumNames = useMemo(() => {
    if (mediums.length === 0) return [];
    return mediums.filter(m => m.active !== false).map(m => m.shortName);
  }, [mediums]);
  // Resolve user.mediums (may be IDs, codes, shortNames, or names) to medium shortNames
  const resolveMediumName = (val: string): string => {
    if (!mediums.length) return val;
    const found = mediums.find(
      m => m.id === val || m.shortName === val || m.code === val.toUpperCase() || m.name === val
    );
    return found ? found.shortName : val;
  };
  const schoolMediums = user?.mediums?.length
    ? user.mediums.map(resolveMediumName).filter(m => allMediumNames.length === 0 || allMediumNames.includes(m))
    : allMediumNames;

  // Lists
  const [students, setStudents] = useState<Student[]>([]);
  const studentsRef = useRef<Student[]>([]);
  studentsRef.current = students;
  const [schools, setSchools] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkMedium, setBulkMedium] = useState('');
  const [bulkFirstLangPaper1, setBulkFirstLangPaper1] = useState('');
  const [bulkFirstLangPaper2, setBulkFirstLangPaper2] = useState('');
  const [bulkSecondLang, setBulkSecondLang] = useState("");
  const [bulkThirdLang, setBulkThirdLang] = useState("");
  const normalizeSecondLang = (lang?: string) => lang || "";

  const normalizeThirdLang = (lang?: string) => lang || "";

  // Default 2nd/3rd languages based on chosen medium
  const defaultLangsForMedium = (_medium: string): { second: string; third: string } => {
    return { second: "", third: "" };
  };

  const extractPCode = (sObj: any): string => {
    const fields = [sObj.paperType, sObj.code, sObj.shortName, sObj.name];
    for (const f of fields) {
      if (!f) continue;
      const m = String(f).toUpperCase().match(/\b(P0[1-9]|P10|P\d{2})\b/);
      if (m) return m[1];
    }
    return '';
  };

  const getLanguageOptions = (medium: string, keyword: string) => {
    if (!medium) return [];
    
    return subjects.filter((s: any) => {
      const name = (s.name || '').toUpperCase();
      const shortName = (s.shortName || '').toUpperCase();
      const code = (s.code || '').toUpperCase();
      const paperType = (s.paperType || '').toUpperCase();
      const category = (s.category || '').toUpperCase();
      const pCode = extractPCode(s);
      
      let matchesKeyword = false;
      if (keyword === 'P01') {
        matchesKeyword = pCode === 'P01' || code === 'P01' || paperType === 'P01' || name.includes('P01') || shortName.includes('P01') || (category === 'FIRST_LANGUAGE' && (name.includes(' AT') || name.includes('PAPER I')));
      } else if (keyword === 'P02') {
        matchesKeyword = pCode === 'P02' || code === 'P02' || paperType === 'P02' || name.includes('P02') || shortName.includes('P02') || (category === 'FIRST_LANGUAGE' && (name.includes(' BT') || name.includes('PAPER II')));
      } else if (keyword === 'P03') {
        matchesKeyword = pCode === 'P03' || code === 'P03' || paperType === 'P03' || name.includes('P03') || shortName.includes('P03') || category === 'SECOND_LANGUAGE';
      } else if (keyword === 'P04') {
        matchesKeyword = pCode === 'P04' || code === 'P04' || paperType === 'P04' || name.includes('P04') || shortName.includes('P04') || category === 'THIRD_LANGUAGE';
      } else {
        matchesKeyword = name.includes(keyword) || shortName.includes(keyword) || code.includes(keyword);
      }
      if (!matchesKeyword) return false;
      
      // Use subject's mediumId for matching when available, fall back to name pattern
      let subMediumShort = '';
      if (s.mediumId && mediums.length > 0) {
        const found = mediums.find(m => m.id === s.mediumId);
        subMediumShort = found ? found.shortName : '';
      }
      if (!subMediumShort && s.medium) {
        const found = mediums.find(m => m.id === s.medium || m.code === s.medium.toUpperCase() || m.shortName === s.medium || m.name === s.medium);
        subMediumShort = found ? found.shortName : s.medium;
      }
      if (!subMediumShort && s.name) {
        const upperName = s.name.toUpperCase();
        if (upperName.includes('TAMIL')) subMediumShort = 'Tamil';
        else if (upperName.includes('MALAYALAM')) subMediumShort = 'Malayalam';
        else if (upperName.includes('KANNADA')) subMediumShort = 'Kannada';
        else if (upperName.includes('ENGLISH') && !upperName.includes('ADDL')) subMediumShort = 'English';
      }

      const studentMedShort = resolveMediumShortName(medium, mediums) || medium;
      return subMediumShort.toLowerCase() === studentMedShort.toLowerCase() || !subMediumShort;
    }).sort((a: any, b: any) => {
      const pA = extractPCode(a);
      const pB = extractPCode(b);
      const numA = pA ? parseInt(pA.slice(1), 10) : 999;
      const numB = pB ? parseInt(pB.slice(1), 10) : 999;
      if (numA !== numB) return numA - numB;
      if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  };
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState('ALL');
  const [selectedAcademicYearFilter, setSelectedAcademicYearFilter] = useState('ALL');
  const [selectedSchId, setSelectedSchId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Drill-down view states
  const [currentView, setCurrentView] = useState<'STANDARDS' | 'DIVISIONS' | 'STUDENTS' | 'FORMER_SEARCH'>('STANDARDS');
  const [selectedStandard, setSelectedStandard] = useState<string>(''); // '8' | '9' | '10'
  const [selectedDivision, setSelectedDivision] = useState<string>('');

  // Custom divisions added in session
  const [customDivisions, setCustomDivisions] = useState<Record<string, string[]>>({});

  // Former student search states
  const [formerSearchClass, setFormerSearchClass] = useState('ALL');
  const [formerSearchDiv, setFormerSearchDiv] = useState('ALL');
  const [formerSearchConfirmStatus, setFormerSearchConfirmStatus] = useState('ALL');
  const [formerSearchName, setFormerSearchName] = useState('');
  const [formerSearchAdmissionNo, setFormerSearchAdmissionNo] = useState('');
  const [formerSearchStudentCode, setFormerSearchStudentCode] = useState('');
  const [formerSearchAcademicYear, setFormerSearchAcademicYear] = useState('');
  const [isFormerSearchExecuted, setIsFormerSearchExecuted] = useState(false);

  // Modals visibility toggles
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  // Dropdown states for 3-dot menus
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // Form states (Add / Edit)
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const currentAcademicYear = getCurrentAcademicYear();

  const initialFormState = {
    regNo: '',
    sslcRegNo: '',
    name: '',
    gender: 'Male',
    dob: '',
    fatherName: '',
    motherName: '',
    caste: '',
    category: 'General',
    religion: '',
    place: '',
    mobile: '',
    scribe: false,
    classStandard: '10',
    division: '',
    academicYear: currentAcademicYear,
    letterStatus: 100 as number | string,
    readingStatus: 100 as number | string,
    writingStatus: 100 as number | string,
    medium: '',
    firstLangPaper1: '',
    firstLangPaper2: '',
    secondLang: "",
    thirdLang: ""
  };

  const [studentForm, setStudentForm] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Promotion state
  const [promotionForm, setPromotionForm] = useState<{
    sourceClass: string;
    targetClass: string;
    newAcademicYear: string;
    selectedStudentIds: string[];
  }>({
    sourceClass: '9',
    targetClass: '10',
    newAcademicYear: currentAcademicYear,
    selectedStudentIds: []
  });
  const [isPromoting, setIsPromoting] = useState(false);

  // Import state
  const [bulkAcademicYear, setBulkAcademicYear] = useState(currentAcademicYear);
  const [bulkText, setBulkText] = useState('');
  const [bulkSourceOption, setBulkSourceOption] = useState<'paste' | 'file'>('paste');
  const [bulkOverrideDivision, setBulkOverrideDivision] = useState(false);
  const [parsedImportRows, setParsedImportRows] = useState<ParsedStudentRow[]>([]);
  const [importValidationErrors, setImportValidationErrors] = useState<ValidationError[]>([]);
  const [importStage, setImportStage] = useState<'idle' | 'reading' | 'cleaning' | 'validating' | 'saving' | 'completed'>('idle');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    processed: number;
    successfulCount: number;
    failedCount: number;
    successful: any[];
    failed: any[];
    type: 'school' | 'student';
  } | null>(null);

  // Active School ID based on role
  const activeSchoolId = user?.role === 'SCHOOL' ? (user.id || '') : selectedSchId;

  const initData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [schoolsRes, subjectsRes] = await Promise.all([
        apiClient.get('/management/schools'),
        apiClient.get('/management/subjects')
      ]);
      setSchools(schoolsRes.data);
      setSubjects(subjectsRes.data || []);
      if (schoolsRes.data.length > 0 && user?.role !== 'SCHOOL') {
        setSelectedSchId(schoolsRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load schools list');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadStudents = useCallback(async () => {
    if (!activeSchoolId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/management/students?schoolId=${activeSchoolId}`);
      setStudents(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load student directory');
    } finally {
      setIsLoading(false);
    }
  }, [activeSchoolId]);

  const handlePromoteStudents = async () => {
    if (!activeSchoolId) return;
    if (!promotionForm.newAcademicYear.trim()) {
      toast.error('New Academic Year is required for promotion');
      return;
    }
    if (promotionForm.selectedStudentIds.length === 0) {
      toast.error('Please select at least one student to promote');
      return;
    }

    const result = await Swal.fire({
      title: 'Promote Students?',
      text: `${promotionForm.selectedStudentIds.length} selected students in Class ${promotionForm.sourceClass} will be moved to Class ${promotionForm.targetClass} for Academic Year ${promotionForm.newAcademicYear}. This action cannot be easily undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000000',
      confirmButtonText: 'Yes, promote them!',
      customClass: {
        popup: 'rounded-3xl shadow-xl'
      }
    });

    if (!result.isConfirmed) return;

    setIsPromoting(true);
    try {
      const res = await apiClient.post('/management/students/promote', {
        schoolId: activeSchoolId,
        sourceClass: promotionForm.sourceClass,
        targetClass: promotionForm.targetClass,
        newAcademicYear: promotionForm.newAcademicYear,
        studentIds: promotionForm.selectedStudentIds
      });

      toast.success(res.data.message);
      setShowPromoteModal(false);
      loadStudents();
      emitRefresh('students-updated');
      emitRefresh('data-updated');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to promote students');
    } finally {
      setIsPromoting(false);
    }
  };

  useEffect(() => {
    initData();
  }, [user, initData]);

  useEffect(() => {
    loadStudents();
  }, [activeSchoolId, loadStudents]);

  // Open clean add student form
  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingStudentId(null);
    setStudentForm(initialFormState);
    setFormErrors({});
    setShowAddEditModal(true);
  };

  // Handle creating/saving single student
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!studentForm.regNo.trim()) {
      errors.regNo = 'Register Number is required';
    } else if (!/^\d+$/.test(studentForm.regNo.trim())) {
      errors.regNo = 'Register Number must contain only numbers';
    }

    if (studentForm.sslcRegNo && studentForm.sslcRegNo.trim() && !/^\d+$/.test(studentForm.sslcRegNo.trim())) {
      errors.sslcRegNo = 'SSLC Reg. No must contain only numbers';
    }

    if (!studentForm.name.trim()) {
      errors.name = 'Full Student Name is required';
    }

    if (!studentForm.academicYear.trim()) {
      errors.academicYear = 'Academic Year is required (e.g. 2026-27)';
    }

    // DOB Validation (formats: DD/MM/YYYY)
    const dobValue = studentForm.dob ? studentForm.dob.trim() : '';
    if (dobValue) {
      const parts = dobValue.split('/');
      if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
        errors.dob = 'Please enter date in DD/MM/YYYY format';
      } else {
        const dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`);
        if (isNaN(dateObj.getTime())) {
          errors.dob = 'Please enter a valid date';
        } else {
          const minDate = new Date('1950-01-01');
          const maxDate = new Date();
          if (dateObj > maxDate) {
            errors.dob = 'Date of birth cannot be in the future';
          } else if (dateObj < minDate) {
            errors.dob = 'Date of birth appears to be too far in the past';
          }
        }
      }
    }

    // Mobile validation format: Standard 10 digit Indian number pattern (optional but if input is written, it must be valid)
    const mobTrim = studentForm.mobile ? studentForm.mobile.trim() : '';
    if (mobTrim) {
      const mobClean = mobTrim.replace(/[\s\-\(\)]/g, ''); // strip spaces, dashes, parentheses
      if (!/^[6-9]\d{9}$/.test(mobClean)) {
        errors.mobile = 'Mobile number must be a valid 10-digit number (e.g. 9845321099)';
      }
    }

    // Status Percentages validation
    const letterStat = studentForm.letterStatus;
    const readingStat = studentForm.readingStatus;
    const writingStat = studentForm.writingStatus;

    if (letterStat === undefined || letterStat === null || String(letterStat).trim() === '') {
      errors.letterStatus = 'Letter Status percentage is required';
    } else {
      const val = Number(letterStat);
      if (isNaN(val) || val < 0 || val > 100) {
        errors.letterStatus = 'Must be between 0 and 100';
      }
    }

    if (readingStat === undefined || readingStat === null || String(readingStat).trim() === '') {
      errors.readingStatus = 'Reading Status percentage is required';
    } else {
      const val = Number(readingStat);
      if (isNaN(val) || val < 0 || val > 100) {
        errors.readingStatus = 'Must be between 0 and 100';
      }
    }

    if (writingStat === undefined || writingStat === null || String(writingStat).trim() === '') {
      errors.writingStatus = 'Writing Status percentage is required';
    } else {
      const val = Number(writingStat);
      if (isNaN(val) || val < 0 || val > 100) {
        errors.writingStatus = 'Must be between 0 and 100';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please correct the validation errors in the form.');
      return;
    }

    setFormErrors({});

    try {
      let parsedDob = null;
      if (studentForm.dob) {
        const parts = studentForm.dob.split('/');
        if (parts.length === 3) {
          parsedDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      const payload = {
        ...(editingStudentId ? { id: editingStudentId } : {}),
        ...studentForm,
        dob: parsedDob,
        regNo: studentForm.regNo.trim(),
        name: studentForm.name.trim().toUpperCase(),
        schoolId: activeSchoolId,
        letterStatus: Number(studentForm.letterStatus),
        readingStatus: Number(studentForm.readingStatus),
        writingStatus: Number(studentForm.writingStatus)
      };

      const res = await apiClient.post('/management/students', payload);

      if (editingStudentId) {
        setStudents(prev => prev.map(s => s.id === editingStudentId ? res.data : s));
        toast.success('Candidate profile updated');
      } else {
        setStudents(prev => [...prev, res.data]);
        toast.success('New candidate profile saved');
      }
      emitRefresh('students-updated');
      emitRefresh('data-updated');

      setShowAddEditModal(false);
      setStudentForm(initialFormState);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save student record');
    }
  };

  const startEditStudent = (stud: Student) => {
    setIsEditMode(true);
    setEditingStudentId(stud.id);
    setFormErrors({});
    setStudentForm({
      regNo: stud.regNo || (stud as any).globalId || '',
      sslcRegNo: stud.sslcRegNo || '',
      name: stud.name || '',
      gender: stud.gender || 'Male',
      dob: stud.dob ? formatDate(stud.dob) : '',
      fatherName: stud.fatherName || '',
      motherName: stud.motherName || '',
      caste: stud.caste || '',
      category: stud.category || 'General',
      religion: stud.religion || '',
      place: stud.place || '',
      mobile: stud.mobile || '',
      scribe: !!stud.scribe,
      classStandard: stud.classStandard || '10',
      division: stud.division || '',
      academicYear: stud.academicYear || '',
      letterStatus: stud.letterStatus !== undefined ? Number(stud.letterStatus) : 100,
      readingStatus: stud.readingStatus !== undefined ? Number(stud.readingStatus) : 100,
      writingStatus: stud.writingStatus !== undefined ? Number(stud.writingStatus) : 100,
      medium: stud.medium || '',
      firstLangPaper1: stud.firstLangPaper1 || '',
      firstLangPaper2: stud.firstLangPaper2 || '',
      secondLang: stud.secondLang || "",
      thirdLang: stud.thirdLang || ""
    });
    setShowAddEditModal(true);
  };

  const handleDeleteStudent = async (stud: Student) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete candidate ${stud.name}. This will permanently remove all their exam grades and marks!`,
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
        await apiClient.delete(`/management/students/${stud.id}`);
        setStudents(prev => prev.filter(s => s.id !== stud.id));
        toast.success('Student deleted successfully');
        emitRefresh('students-updated');
        emitRefresh('data-updated');
      } catch (err) {
        toast.error('Failed to delete student');
      }
    }
  };

  const updateStudentLanguage = async (stud: Student, field: 'medium' | 'firstLangPaper1' | 'firstLangPaper2' | 'secondLang' | 'thirdLang', value: string) => {
    try {
      // Read LATEST student from ref to avoid stale closure data on rapid dropdown changes
      const latestStudent = studentsRef.current.find(s => s.id === stud.id) || stud;

      const updates: any = { [field]: value };
      
      if (field === 'medium') {
        const p01Opts = getLanguageOptions(value, 'P01');
        const p02Opts = getLanguageOptions(value, 'P02');
        const p03Opts = getLanguageOptions(value, 'P03');
        const p04Opts = getLanguageOptions(value, 'P04');
        
        const p03Eng = p03Opts.find((o: any) => o.name.toUpperCase().includes('ENGLISH'));
        const p04Hin = p04Opts.find((o: any) => o.name.toUpperCase().includes('HINDI'));

        updates.firstLangPaper1 = p01Opts.length > 0 ? p01Opts[0].name : '';
        updates.firstLangPaper2 = p02Opts.length > 0 ? p02Opts[0].name : '';
        updates.secondLang = p03Eng ? p03Eng.name : (p03Opts.length > 0 ? p03Opts[0].name : "");
        updates.thirdLang = p04Hin ? p04Hin.name : (p04Opts.length > 0 ? p04Opts[0].name : "");
      }
      
      // Force-replace: use ?? so new dropdown values always override old data
      let mediumCode = resolveMediumCode(updates.medium ?? latestStudent.medium ?? '', mediums) || 'EM';
      
      const finalSecondLang = normalizeSecondLang(updates.secondLang ?? latestStudent.secondLang);
      const finalThirdLang = normalizeThirdLang(updates.thirdLang ?? latestStudent.thirdLang);

      const secBase = finalSecondLang.split(' - ')[0];
      const thirdBase = finalThirdLang.split(' - ')[0];
      
      const hasMediumCode = (n: string) => mediums.some(m => m.code && n.toUpperCase().endsWith(` ${m.code}`));
      const p01Name = (updates.firstLangPaper1 ?? latestStudent.firstLangPaper1) || '';
      const p02Name = (updates.firstLangPaper2 ?? latestStudent.firstLangPaper2) || '';
      const newSubjects: string[] = [];
      if (p01Name) newSubjects.push(hasMediumCode(p01Name) ? p01Name.trim() : `${p01Name} ${mediumCode}`.trim());
      if (p02Name) newSubjects.push(hasMediumCode(p02Name) ? p02Name.trim() : `${p02Name} ${mediumCode}`.trim());
      newSubjects.push(`${secBase} - P03 ${mediumCode}`);
      newSubjects.push(`${thirdBase} - P04 ${mediumCode}`);
      // Dynamically add core subjects from Data Management
      const coreSubjects = dmSubjects.filter((s: any) => s.active && s.category === 'CORE');
      coreSubjects.forEach((s: any) => {
        const subjectName = (s.name || '').replace(/ - P\d+$/, '').trim();
        const code = s.shortName || s.code || '';
        newSubjects.push(`${subjectName} - ${code} ${mediumCode}`);
      });
      
      updates.secondLang = finalSecondLang;
      updates.thirdLang = finalThirdLang;
      updates.subjects = newSubjects;

      const res = await apiClient.post('/management/students', { ...latestStudent, ...updates });
      if (res.data && res.data.id) {
        setStudents(prev => prev.map(s => s.id === latestStudent.id ? { ...s, ...updates } : s));
        toast.success('Updated successfully');
        emitRefresh('students-updated');
        emitRefresh('data-updated');
      }
    } catch (err) {
      toast.error('Failed to update student language details');
    }
  };

  const handleBulkMediumUpdate = async (medium: string, firstLangPaper1?: string, firstLangPaper2?: string, secondLang?: string, thirdLang?: string) => {
    if (!medium) return;
    
    const secLangToUse = normalizeSecondLang(secondLang);
    const thirdLangToUse = normalizeThirdLang(thirdLang);

    const result = await Swal.fire({
      title: 'Bulk Update Medium',
      text: `Are you sure you want to update the medium to ${medium} for all students in Class ${selectedStandard} Division ${selectedDivision}? This will also auto-assign First Language Papers, Second Language, Third Language Hindi, and Core subjects.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#000000',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, update all',
      customClass: {
        popup: 'rounded-3xl shadow-xl border border-gray-150'
      }
    });

    if (result.isConfirmed) {
      try {
        await apiClient.post('/management/students/bulk-update-medium', {
          schoolId: activeSchoolId,
          academicYear: currentAcademicYear,
          className: selectedStandard,
          division: selectedDivision,
          medium,
          firstLangPaper1,
          firstLangPaper2,
          secondLang: secLangToUse,
          thirdLang: thirdLangToUse
        });
        toast.success(`Successfully updated medium to ${medium}`);
        
        loadStudents();
        emitRefresh('students-updated');
        emitRefresh('data-updated');
      } catch (err) {
        toast.error('Failed to perform bulk medium update');
      }
    }
  };

  // Analyze text paste to generate parse preview
  // Download CSV template
  const downloadTemplate = () => {
    const headers = [
      'Admission no',
      'Full name',
      'SSLC Reg.NO',
      'Gender',
      'Date of birth',
      'Class',
      'Division',
      'Category',
      'Scribe'
    ];
    const sampleRow = [
      '604901',
      'PRASAD',
      '123456',
      'Male',
      '15/05/2010',
      '10',
      'A',
      'General',
      'False'
    ];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------- PARSING AND VALIDATION ----------

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleParseBulkInput = async (text: string) => {
    setBulkText(text);
    if (!text.trim()) {
      setParsedImportRows([]);
      setImportValidationErrors([]);
      setImportStage('idle');
      return;
    }

    setImportStage('reading');
    await sleep(200);

    const lines = text.split('\n');
    const parsed: any[] = [];

    if (lines.length === 0) return;

    // Normalizer to remove spaces, underscores, dashes, and lowercase
    const norm = (s: string) => s.trim().toLowerCase().replace(/[\s\-_%]/g, '');

    // Target fields and their recognized variants
    const rules: Record<string, string[]> = {
      regNo: ['admissionsno', 'admissionno', 'registerno', 'regno', 'register_no', 'admission_no'],
      sslcRegNo: ['sslcregisno', 'sslcregno', 'sslc_regis_no', 'sslc_reg_no', 'sslcregisterno'],
      name: ['name', 'studentname', 'candidatename', 'fullname'],
      gender: ['gender', 'sex'],
      classStandard: ['class', 'classstandard', 'classname', 'std', 'standard'],
      division: ['division', 'div', 'section', 'sec'],
      dob: ['dob', 'dateofbirth', 'date_of_birth', 'birthdate'],
      caste: ['caste', 'subcaste', 'castename', 'caste_name'],
      category: ['category', 'cat', 'socialcategory'],
      religion: ['religion', 'religionid', 'religion_id'],
      fatherName: ['fathername', 'father_name', 'father', 'guardianname', 'fatherfullname'],
      motherName: ['mothername', 'mother_name', 'mother', 'motherfullname'],
      place: ['place', 'location', 'address'],
      mobile: ['mobile', 'phone', 'mobileno', 'contact', 'phoneno', 'phonenumber', 'mobilenumber'],
      scribe: ['isscribe', 'ifscribe', 'scribe', 'scribestatus'],
      medium: ['medium'],
      firstLangPaper1: ['firstlangpaper1', 'firstlanguagepaper1', 'paper1', 'lang1', 'firstlang1'],
      firstLangPaper2: ['firstlangpaper2', 'firstlanguagepaper2', 'paper2', 'lang2', 'firstlang2']
    };

    // Find the header row or check if first row is a header
    let headerRowIdx = -1;
    let mappedIndices: Record<string, number> = {};

    // Let's inspect the first non-empty line
    let firstLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim()) {
        firstLineIdx = i;
        break;
      }
    }

    if (firstLineIdx !== -1) {
      const firstLineParts = lines[firstLineIdx].split(',').map(s => s.trim());
      // Try split by tab if split by comma yields only 1 element
      const parts = firstLineParts.length < 2 ? lines[firstLineIdx].split('\t').map(s => s.trim()) : firstLineParts;

      // Count how many parts match any variants in rules
      let matchCount = 0;
      const indices: Record<string, number> = {};

      parts.forEach((part, colIdx) => {
        const normPart = norm(part);
        for (const [field, variants] of Object.entries(rules)) {
          if (variants.includes(normPart)) {
            indices[field] = colIdx;
            matchCount++;
            break;
          }
        }
      });

      // If at least 3 recognizable headers are matched, we treat this row as the header row!
      if (matchCount >= 3) {
        headerRowIdx = firstLineIdx;
        mappedIndices = indices;
      }
    }

    // Default mapping if no header row is detected (original position-based mapping)
    const defaultSeq = [
      'regNo', 'name', 'sslcRegNo', 'gender', 'dob', 'classStandard', 'division', 'category', 'scribe', 'letterStatus', 'readingStatus', 'writingStatus'
    ];

    const requiredFields = ['regNo', 'name', 'gender', 'classStandard', 'division', 'category'];

    // Loop through lines to parse data
    lines.forEach((line, lineIdx) => {
      // Skip header row if it exists
      if (lineIdx === headerRowIdx) return;

      const trimmed = line.trim();
      if (!trimmed) return;

      let parts = trimmed.split(',').map(s => s.trim());
      if (parts.length < 2) {
        parts = trimmed.split('\t').map(s => s.trim());
      }

      if (parts.length >= 2) {
        let studentData: any = {};

        if (headerRowIdx !== -1) {
          // Dynamic mapping based on headers
          requiredFields.concat(Object.keys(rules)).forEach(field => {
            const idx = mappedIndices[field];
            if (idx !== undefined && idx < parts.length && parts[idx] !== undefined) {
              studentData[field] = parts[idx];
            } else {
              studentData[field] = '';
            }
          });
        } else {
          // Default positional mapping
          defaultSeq.forEach((field, idx) => {
            if (idx < parts.length && parts[idx] !== undefined) {
              studentData[field] = parts[idx];
            } else {
              studentData[field] = '';
            }
          });
        }

        // Normalize values
        const regNo = studentData.regNo ? String(studentData.regNo).trim() : "";
        const name = studentData.name ? String(studentData.name).trim().toUpperCase() : "";

        const genderVal = studentData.gender ? String(studentData.gender).trim().toLowerCase() : 'male';
        const gender = genderVal.startsWith('f') || genderVal === 'girl' ? 'Female' : 'Male';

        let dob = studentData.dob ? String(studentData.dob).trim() : '';
        if (dob) {
          const sep = dob.includes('/') ? '/' : dob.includes('-') ? '-' : '';
          if (sep) {
            const dobParts = dob.split(sep);
            if (dobParts.length === 3) {
              if (dobParts[0].length === 4) {
                dob = `${dobParts[0]}-${dobParts[1].padStart(2, '0')}-${dobParts[2].padStart(2, '0')}`;
              } else {
                dob = `${dobParts[2]}-${dobParts[1].padStart(2, '0')}-${dobParts[0].padStart(2, '0')}`;
              }
            }
          }
          const parsedDate = new Date(dob);
          if (isNaN(parsedDate.getTime())) {
            dob = '';
          }
        } else {
          dob = '';
        }

        const fatherName = studentData.fatherName ? String(studentData.fatherName).trim() : '';
        const motherName = studentData.motherName ? String(studentData.motherName).trim() : '';
        const caste = studentData.caste ? String(studentData.caste).trim() : '';

        const categoryVal = studentData.category ? String(studentData.category).trim().toUpperCase() : 'GENERAL';
        const category = CATEGORIES.includes(categoryVal) ? categoryVal : 'General';

        let religion = '';
        const religionVal = studentData.religion ? String(studentData.religion).trim().toLowerCase() : '';
        if (religionVal) {
          const match = RELIGIONS.find(r => r.label.toLowerCase() === religionVal || r.value.toLowerCase() === religionVal);
          if (match) {
            religion = match.value;
          } else {
            const matchPartial = RELIGIONS.find(r => {
              const label = r.label.toLowerCase();
              return religionVal.includes(label) || label.includes(religionVal);
            });
            if (matchPartial) {
              religion = matchPartial.value;
            } else {
              religion = religionVal;
            }
          }
        }

        const place = studentData.place ? String(studentData.place).trim() : '';
        const mobile = studentData.mobile ? String(studentData.mobile).trim() : '';

        const scribeVal = studentData.scribe ? String(studentData.scribe).trim().toLowerCase() : 'false';
        const scribe = scribeVal === 'true' || scribeVal === 'yes' || scribeVal === '1' || scribeVal === 'scribe';

        parsed.push({
          regNo: studentData.regNo,
          name: studentData.name,
          gender: studentData.gender,
          dob: studentData.dob,
          fatherName: studentData.fatherName,
          motherName: studentData.motherName,
          caste: studentData.caste,
          category: studentData.category,
          religion: studentData.religion,
          place: studentData.place,
          mobile: studentData.mobile,
          scribe: scribe,
          classStandard: studentData.classStandard,
          division: studentData.division,
          letterStatus: studentData.letterStatus,
          readingStatus: studentData.readingStatus,
          writingStatus: studentData.writingStatus,
          sslcRegNo: studentData.sslcRegNo,
          medium: studentData.medium,
          firstLangPaper1: studentData.firstLangPaper1,
          firstLangPaper2: studentData.firstLangPaper2,
        });
      }
    });

    setImportStage('cleaning');
    await sleep(300);

    const autoCorrectedRows = parsed.map(row => autoCorrectRow(row));

    setImportStage('validating');
    await sleep(300);

    let allErrors: ValidationError[] = [];
    const finalRows = autoCorrectedRows.map((row, idx) => {
      // row index for user display starts at 2 (assuming header at 1)
      const res = validateRow(row, headerRowIdx !== -1 ? idx + 2 : idx + 1);
      if (!res.isValid) {
        allErrors = [...allErrors, ...res.errors];
      }
      return { ...res.student, isValid: res.isValid };
    });

    setParsedImportRows(finalRows);
    setImportValidationErrors(allErrors);
    setImportStage('completed');
  };

    // Import File Handler (simple reader)
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        if (data) {
          toast.loading('Converting Excel to CSV format...', { id: 'excel-convert' });
          try {
            const XLSX = await import('xlsx');
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csvText = XLSX.utils.sheet_to_csv(worksheet);
            toast.success('Excel converted to CSV successfully!', { id: 'excel-convert' });
            handleParseBulkInput(csvText);
          } catch (err) {
            toast.error('Failed to convert Excel file. Please check format.', { id: 'excel-convert' });
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          toast.success('CSV loaded successfully!');
          handleParseBulkInput(text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Execute Backend Import
  const handleExecuteBulkImport = async () => {
    if (!bulkAcademicYear.trim()) {
      toast.error('Academic Year is required for import');
      return;
    }

    if (parsedImportRows.length === 0) {
      toast.error('No records parsed. Verify layout format.');
      return;
    }

    if (importValidationErrors.length > 0) {
      toast.error('Cannot import data with validation errors. Please fix them and re-upload.');
      return;
    }

    const validRows = parsedImportRows;
    setIsBulkImporting(true);
    setImportStage('saving');
    
    try {
      const res = await apiClient.post('/management/students/bulk', {
        students: validRows.map(r => ({
          ...r,
          academicYear: bulkAcademicYear,
          // If override is enabled, force all rows to the currently selected class+division
          ...(bulkOverrideDivision && selectedStandard ? { classStandard: selectedStandard } : {}),
          ...(bulkOverrideDivision && selectedDivision ? { division: selectedDivision } : {}),
        })),
        schoolId: activeSchoolId
      }, { timeout: 120000 });
      const data = res.data;

      // Set import summary state
      setImportSummary({
        processed: data.processed,
        successfulCount: data.successfulCount,
        failedCount: data.failedCount + (parsedImportRows.length - validRows.length), // count filtered invalid rows as failed/skipped
        successful: data.successful || [],
        failed: [
          ...parsedImportRows.filter(r => !(r as any).isValid).map((r, i) => ({
            row: 'N/A',
            name: r.name || 'Unknown Candidate',
            identifier: r.regNo || 'N/A',
            reason: 'Missing one or more required fields (admission_no, name, gender, class, division, category).'
          })),
          ...(data.failed || [])
        ],
        type: 'student'
      });

      // Fire sweet alert
      Swal.fire({
        title: data.failedCount > 0 || parsedImportRows.length > validRows.length ? 'Imported with Warnings' : 'Import Successful!',
        html: `
          <div style="text-align: left; font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.6;" class="space-y-2">
            <p>Successfully processed student entries for import.</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Total Candidate Rows:</span> <strong>${parsedImportRows.length}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #10b981;">
                <span>Successfully Imported:</span> <strong>${data.successfulCount}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #ef4444;">
                <span>Failed/Skipped:</span> <strong>${parsedImportRows.length - data.successfulCount}</strong>
              </div>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 8px;">A detailed row-by-row diagnostics breakdown has been loaded below.</p>
          </div>
        `,
        icon: data.failedCount > 0 || parsedImportRows.length > validRows.length ? 'warning' : 'success',
        confirmButtonText: 'Inspect Details 🔍',
        confirmButtonColor: '#000000',
        customClass: {
          popup: 'rounded-3xl shadow-xl border border-gray-150'
        }
      });

      setBulkText('');
      setParsedImportRows([]);
      setShowImportModal(false);
      // After import: add all new divisions to customDivisions so they appear immediately
      setCustomDivisions(prev => {
        const next = { ...prev };
        validRows.forEach(row => {
          const std = (bulkOverrideDivision && selectedStandard) ? selectedStandard : row.classStandard;
          const div = (bulkOverrideDivision && selectedDivision) ? selectedDivision : row.division;
          if (std && div) {
            if (!next[std]) next[std] = [];
            if (!next[std].includes(div)) {
              next[std] = [...next[std], div];
            }
          }
        });
        return next;
      });

      const targetStandard = (bulkOverrideDivision && selectedStandard) ? selectedStandard : validRows[0]?.classStandard;
      const targetDivision = (bulkOverrideDivision && selectedDivision) ? selectedDivision : validRows[0]?.division;

      if (targetStandard && targetDivision) {
        setSelectedStandard(targetStandard);
        setSelectedDivision(targetDivision);
      }

      await loadStudents();
      emitRefresh('students-updated');
      emitRefresh('data-updated');

      if (targetStandard && targetDivision) {
        setCurrentView('STUDENTS');
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Import Failed',
        text: 'Failed to import student database. Ensure register numbers and name alignments are correct.',
        icon: 'error',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#0c0a09'
      });
    } finally {
      setIsBulkImporting(false);
    }
  };

  const getActiveSchoolCode = () => {
    const school = schools.find(s => s.id === activeSchoolId);
    return school?.code || "SCH_CODE";
  };

  const activeSchoolCode = getActiveSchoolCode();

  const getReligionLabel = (val: string) => {
    const match = RELIGIONS.find(r => r.value === val);
    return match ? match.label : val || 'Not Set';
  };

  const isCurrentYearStudent = (student: Student) => {
    // Use className OR classStandard (virtual alias) both for robustness
    const yr = (student.academicYear || '').trim();
    return yr === currentAcademicYear.trim();
  };

  // Helper: get effective class standard from student (handles className vs classStandard)
  const getStudentClass = (student: Student): string =>
    String(student.classStandard || student.className || '10').trim();

  const divisionsForSelectedStandard = useMemo(() => {
    if (!selectedStandard) return [];

    const standardStudents = students.filter(s =>
      getStudentClass(s) === String(selectedStandard).trim() &&
      isCurrentYearStudent(s) &&
      s.division
    );

    const uniqueDivs = Array.from(new Set(standardStudents.map(s => s.division)));
    return uniqueDivs.sort();
  }, [students, selectedStandard, currentAcademicYear]);

  const activeDivisions = useMemo(() => {
    const derived = divisionsForSelectedStandard;
    const custom = customDivisions[selectedStandard] || [];
    return Array.from(new Set([...derived, ...custom])).sort();
  }, [divisionsForSelectedStandard, customDivisions, selectedStandard]);

  const handleRenameDivision = async (oldDiv: string) => {
    const { value: newDivName } = await Swal.fire({
      title: 'Rename Division',
      input: 'text',
      inputValue: oldDiv,
      inputLabel: `Rename Division ${selectedStandard}${oldDiv} to:`,
      inputPlaceholder: 'New Division Name',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Rename',
      customClass: { popup: 'rounded-3xl shadow-xl' },
      inputValidator: (value) => {
        if (!value || value.trim() === '') {
          return 'Division name cannot be empty!';
        }
        if (!/^[A-Za-z]$/.test(value.trim())) {
          return 'Division must be a single letter (A-Z)!';
        }
      }
    });

    if (!newDivName || newDivName.trim() === '' || newDivName.trim() === oldDiv) return;

    const cleanNewDiv = newDivName.trim().toUpperCase();

    const divisionStudents = students.filter(s =>
      String(s.classStandard) === String(selectedStandard) &&
      s.division === oldDiv &&
      isCurrentYearStudent(s)
    );

    if (divisionStudents.length === 0) {
      setCustomDivisions(prev => {
        const list = prev[selectedStandard] || [];
        const updated = list.map(d => d === oldDiv ? cleanNewDiv : d);
        return { ...prev, [selectedStandard]: updated };
      });
      toast.success('Division renamed');
      return;
    }

    const loadToast = toast.loading(`Renaming division to ${cleanNewDiv}...`);
    try {
      for (const student of divisionStudents) {
        await apiClient.post('/management/students', {
          ...student,
          id: student.id,
          division: cleanNewDiv
        });
      }
      toast.dismiss(loadToast);
      toast.success('Division renamed successfully');
      loadStudents();
      emitRefresh('students-updated');
      emitRefresh('data-updated');
    } catch (err) {
      console.error(err);
      toast.dismiss(loadToast);
      toast.error('Failed to rename division for some students');
    }
  };

  const handleDeleteDivision = async (div: string) => {
    const divisionStudents = students.filter(s =>
      String(s.classStandard) === String(selectedStandard) &&
      s.division === div &&
      isCurrentYearStudent(s)
    );

    const result = await Swal.fire({
      title: `Delete Division ${selectedStandard}${div}?`,
      text: `You are about to delete Division ${selectedStandard}${div}. It currently has ${divisionStudents.length} candidates.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Proceed',
      cancelButtonColor: '#000000',
      customClass: {
        popup: 'rounded-3xl shadow-xl'
      }
    });

    if (!result.isConfirmed) return;

    const finalResult = await Swal.fire({
      title: 'Final Warning',
      text: `Are you absolutely sure? This will PERMANENTLY remove all ${divisionStudents.length} candidates, along with their exam grades and marks! This action cannot be undone.`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Yes, Delete Permanently!',
      cancelButtonColor: '#000000',
      customClass: {
        popup: 'rounded-3xl shadow-2xl border border-red-100'
      }
    });

    if (!finalResult.isConfirmed) return;

    if (divisionStudents.length === 0) {
      setCustomDivisions(prev => {
        const list = prev[selectedStandard] || [];
        const updated = list.filter(d => d !== div);
        return { ...prev, [selectedStandard]: updated };
      });
      toast.success('Division deleted');
      return;
    }

    const loadToast = toast.loading('Deleting candidates...');
    try {
      for (const student of divisionStudents) {
        await apiClient.delete(`/management/students/${student.id}`);
      }

      setCustomDivisions(prev => {
        const list = prev[selectedStandard] || [];
        const updated = list.filter(d => d !== div);
        return { ...prev, [selectedStandard]: updated };
      });

      toast.dismiss(loadToast);
      toast.success('Division deleted successfully');
      loadStudents();
      emitRefresh('students-updated');
      emitRefresh('data-updated');
    } catch (err) {
      console.error(err);
      toast.dismiss(loadToast);
      toast.error('Failed to delete some candidates');
    }
  };

  const handleAddNewDivision = async () => {
    const { value: divName } = await Swal.fire({
      title: 'New Division',
      input: 'text',
      inputLabel: `Enter new division name for Class ${selectedStandard} (e.g. A, B, C)`,
      inputPlaceholder: 'Division Name',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Create Division',
      customClass: { popup: 'rounded-3xl shadow-xl' },
      inputValidator: (value) => {
        if (!value || value.trim() === '') {
          return 'Division name cannot be empty!';
        }
        if (!/^[A-Za-z]$/.test(value.trim())) {
          return 'Division must be a single letter (A-Z)!';
        }
      }
    });

    if (!divName || divName.trim() === '') return;
    const cleanDiv = divName.trim().toUpperCase();

    setCustomDivisions(prev => {
      const list = prev[selectedStandard] || [];
      if (list.includes(cleanDiv)) {
        toast.error('Division already exists');
        return prev;
      }
      return { ...prev, [selectedStandard]: [...list, cleanDiv] };
    });

    // Do not automatically show the Add Student modal when creating a new division
  };

  const studentsInSourceClass = useMemo(() => {
    const targetYear = selectedAcademicYearFilter === 'ALL' ? currentAcademicYear : selectedAcademicYearFilter;
    return students.filter(s =>
      String(s.classStandard) === String(promotionForm.sourceClass) &&
      s.academicYear === targetYear
    );
  }, [students, promotionForm.sourceClass, selectedAcademicYearFilter, currentAcademicYear]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const term = searchQuery.toLowerCase();
      const matchesQuery = (
        (student.name ?? '').toLowerCase().includes(term) ||
        (student.regNo ?? student.globalId ?? '').toLowerCase().includes(term) ||
        (student.uniqueId ?? '').toLowerCase().includes(term)
      );

      if (currentView === 'STUDENTS') {
        const matchesClass = getStudentClass(student) === String(selectedStandard).trim();
        const matchesDivision = (student.division || '') === selectedDivision;
        const matchesYear = isCurrentYearStudent(student);
        return matchesQuery && matchesClass && matchesDivision && matchesYear;
      } else if (currentView === 'FORMER_SEARCH') {
        if (!isFormerSearchExecuted) return false;

        const matchesClass = formerSearchClass === 'ALL' || getStudentClass(student) === String(formerSearchClass).trim();
        const matchesDivision = formerSearchDiv === 'ALL' || (student.division || '') === formerSearchDiv;

        const matchesName = !formerSearchName.trim() ||
          (student.name ?? '').toLowerCase().includes(formerSearchName.toLowerCase());

        // Search admission no in globalId (actual field), regNo alias, and also sslcRegNo
        const admNo = (student.globalId || student.regNo || '').toLowerCase();
        const sslcNo = (student.sslcRegNo || '').toLowerCase();
        const searchAdm = formerSearchAdmissionNo.toLowerCase().trim();
        const matchesAdmissionNo = !searchAdm ||
          admNo.includes(searchAdm) ||
          sslcNo.includes(searchAdm);

        // Student Code = schoolCode + admissionNo = uniqueId
        const matchesStudentCode = !formerSearchStudentCode.trim() ||
          (student.uniqueId ?? '').toLowerCase().includes(formerSearchStudentCode.toLowerCase());

        const matchesAcademicYearSearch = !formerSearchAcademicYear.trim() ||
          (student.academicYear ?? '').trim() === formerSearchAcademicYear.trim();

        return matchesQuery && matchesClass && matchesDivision && matchesName && matchesAdmissionNo && matchesStudentCode && matchesAcademicYearSearch;
      } else {
        const matchesClass = selectedClassFilter === 'ALL' || (student.classStandard || '10') === selectedClassFilter;
        const matchesDivision = selectedDivisionFilter === 'ALL' || (student.division || '') === selectedDivisionFilter;
        const matchesAcademicYear = selectedAcademicYearFilter === 'ALL' || student.academicYear === selectedAcademicYearFilter;
        return matchesQuery && matchesClass && matchesDivision && matchesAcademicYear;
      }
    });
  }, [
    students,
    currentView,
    selectedStandard,
    selectedDivision,
    searchQuery,
    isFormerSearchExecuted,
    formerSearchClass,
    formerSearchDiv,
    formerSearchConfirmStatus,
    formerSearchName,
    formerSearchAdmissionNo,
    formerSearchStudentCode,
    formerSearchAcademicYear,
    currentAcademicYear,
    selectedClassFilter,
    selectedDivisionFilter,
    selectedAcademicYearFilter
  ]);

  const rosterStats = useMemo(() => {
    const mediumCounts: Record<string, number> = {};
    const langCounts: Record<string, number> = {};
    let maleCount = 0;
    let femaleCount = 0;
    const invalidStudents: string[] = [];
    const invalidRules: string[] = [];

    for (const s of filteredStudents) {
      const med = resolveMediumShortName(s.medium || '', mediums) || (s.medium || '').trim() || 'Not Set';
      mediumCounts[med] = (mediumCounts[med] || 0) + 1;

      const g = (s.gender || '').trim().toLowerCase();
      if (g === 'female') femaleCount++;
      else maleCount++;

      const p1 = (s.firstLangPaper1 || '').trim();
      const p2 = (s.firstLangPaper2 || '').trim();
      if (p1) langCounts[p1] = (langCounts[p1] || 0) + 1;
      if (p2) langCounts[p2] = (langCounts[p2] || 0) + 1;
      if ((s.secondLang || '').trim()) {
        const s2 = (s.secondLang || '').trim();
        langCounts[s2] = (langCounts[s2] || 0) + 1;
      }
      if ((s.thirdLang || '').trim()) {
        const s3 = (s.thirdLang || '').trim();
        langCounts[s3] = (langCounts[s3] || 0) + 1;
      }

      const allLangs = `${p1} ${p2} ${s.secondLang || ''} ${s.thirdLang || ''}`.toUpperCase();
      if (med === 'Tamil') {
        if (/MALAYALAM|ARABIC|SANSKRIT|URDU/.test(allLangs)) {
          invalidStudents.push(s.name || s.regNo || 'Unknown');
          if (/MALAYALAM/.test(allLangs) && !invalidRules.includes('Tamil Medium → Malayalam')) invalidRules.push('Tamil Medium → Malayalam');
          if (/ARABIC/.test(allLangs) && !invalidRules.includes('Tamil Medium → Arabic')) invalidRules.push('Tamil Medium → Arabic');
          if (/SANSKRIT/.test(allLangs) && !invalidRules.includes('Tamil Medium → Sanskrit')) invalidRules.push('Tamil Medium → Sanskrit');
          if (/URDU/.test(allLangs) && !invalidRules.includes('Tamil Medium → Urdu')) invalidRules.push('Tamil Medium → Urdu');
        }
      } else if (med === 'Malayalam') {
        if (/TAMIL/.test(allLangs) && !/TAMIL.*\(\s*MM\s*\)/.test(allLangs)) {
          invalidStudents.push(s.name || s.regNo || 'Unknown');
          if (!invalidRules.includes('Malayalam Medium → Tamil (TM)')) invalidRules.push('Malayalam Medium → Tamil (TM)');
        }
      }
    }

    return { mediumCounts, langCounts, maleCount, femaleCount, invalidStudents, invalidRules, invalidCount: invalidStudents.length };
  }, [filteredStudents, mediums]);

  const isStudentInvalid = (s: any) => {
    const med = resolveMediumShortName(s.medium || '', mediums) || (s.medium || '').trim();
    const allLangs = `${s.firstLangPaper1 || ''} ${s.firstLangPaper2 || ''} ${s.secondLang || ''} ${s.thirdLang || ''}`.toUpperCase();
    if (med === 'Tamil') return /MALAYALAM|ARABIC|SANSKRIT|URDU/.test(allLangs);
    if (med === 'Malayalam') return /TAMIL/.test(allLangs) && !/TAMIL.*\(\s*MM\s*\)/.test(allLangs);
    return false;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-5">

      {/* Header Profile Dashboard element */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-black tracking-tighter uppercase flex items-center gap-3">
            <Users size={32} className="text-gray-300" />
            Student Management Directory
          </h1>
          <p className="text-sm text-gray-400 font-medium mt-1">
            Build and view registered candidate profiles, assign scribes, track communication progress metrics, and search through full candidate roster.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role !== 'SCHOOL' && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm mr-2">
              <span className="text-[10px] uppercase font-bold text-amber-600">Admin Mode (Select School):</span>
              <Dropdown
                value={selectedSchId}
                onChange={(v) => setSelectedSchId(v)}
                options={schools.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* View Case 1: STANDARDS VIEW */}
      {currentView === 'STANDARDS' && (
        <div className="space-y-6">
          <div className="flex justify-end items-center gap-3 relative">
            <div className="relative">
              <button
                onClick={() => setShowClassDropdown(prev => !prev)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-gray-500 hover:text-black border border-gray-250 bg-white"
                title="Options"
              >
                <MoreVertical size={16} />
              </button>
              {showClassDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowClassDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-150 rounded-2xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                      onClick={() => {
                        setShowClassDropdown(false);
                        setCurrentView('FORMER_SEARCH');
                        setIsFormerSearchExecuted(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-black uppercase text-slate-700 hover:text-black transition-colors"
                    >
                      Search Former Students
                    </button>
                    <button
                      onClick={() => {
                        setShowClassDropdown(false);
                        setShowPromoteModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-black uppercase text-slate-700 hover:text-black transition-colors"
                    >
                      Student Promotion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-slate-50/50">
              <h3 className="text-xs font-black text-black uppercase tracking-wider">Academic Classes</h3>
              <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Select a standard class to inspect divisions and registered candidates</p>
            </div>

            <div className="divide-y divide-gray-100">
              {['8', '9', '10'].map((std) => (
                <div
                  key={std}
                  onClick={() => {
                    setSelectedStandard(std);
                    setCurrentView('DIVISIONS');
                  }}
                  className="flex items-center justify-between px-8 py-5 cursor-pointer hover:bg-indigo-50/30 bg-indigo-50/15 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-black text-slate-800 bg-indigo-100/50 px-3.5 py-1 rounded-xl min-w-[36px] text-center font-mono">
                      {std}
                    </span>
                    <span className="text-sm font-black text-slate-700 uppercase tracking-wide group-hover:text-black transition-colors">
                      {STANDARD_NAMES[std] || `${std}th Standard`}
                    </span>
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-700 flex items-center gap-1.5 transition-colors">
                    Manage Divisions →
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Case 2: DIVISIONS VIEW */}
      {currentView === 'DIVISIONS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
              <button
                onClick={() => setCurrentView('STANDARDS')}
                className="hover:underline hover:text-black uppercase tracking-widest font-black text-[10px]"
              >
                Classes
              </button>
              <span className="text-slate-300 font-black">»</span>
              <span className="text-indigo-600 font-black uppercase tracking-widest text-[10px]">
                {STANDARD_NAMES[selectedStandard] || `${selectedStandard}th Standard`}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowDivisionDropdown(prev => !prev)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-gray-500 hover:text-black border border-gray-250 bg-white"
                title="Options"
              >
                <MoreVertical size={16} />
              </button>
              {showDivisionDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDivisionDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-150 rounded-2xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                      onClick={() => {
                        setShowDivisionDropdown(false);
                        handleAddNewDivision();
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-black uppercase text-slate-700 hover:text-black transition-colors"
                    >
                      New Division
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            {activeDivisions.length === 0 ? (
              <div className="p-20 text-center text-gray-400 bg-white">
                <Users size={48} className="mx-auto text-gray-250 mb-3 animate-pulse" />
                <p className="text-xs font-black uppercase tracking-wider text-black">No active divisions configured</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Create a division using "New Division" to add candidates.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeDivisions.map((div) => (
                  <div
                    key={div}
                    onClick={() => {
                      setSelectedDivision(div);
                      setCurrentView('STUDENTS');
                    }}
className="flex items-center justify-between px-8 py-5 cursor-pointer hover:bg-blue-100 bg-indigo-50/15 transition-all group"
                  >
                    <div>
                      {(() => {
                        const divStudents = students.filter(s =>
                          String(s.classStandard || s.className || '10').trim() === String(selectedStandard).trim() &&
                          s.division === div &&
                          isCurrentYearStudent(s)
                        );
                        const m = divStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
                        const f = divStudents.filter(s => s.gender?.toLowerCase() === 'female').length;
                        return (
                          <div className="flex items-center gap-4">
                            <div className="text-sm font-black text-slate-800 font-mono">
                              {selectedStandard}{div} &nbsp;
                              <span className="text-[10px] text-gray-400 font-bold">{currentAcademicYear}</span>
                            </div>
                            <div className="flex gap-2 text-[10px] font-black uppercase tracking-wider">
                              <span className="bg-black text-white px-2 py-0.5 rounded-md shadow-sm">Total: {divStudents.length}</span>
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md shadow-sm border border-emerald-200">Male: {m}</span>
                              <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded-md shadow-sm border border-pink-200">Female: {f}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-black uppercase tracking-wider" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedDivision(div);
                          setBulkOverrideDivision(false);
                          setBulkAcademicYear(currentAcademicYear);
                          setParsedImportRows([]);
                          setBulkText('');
                          setShowImportModal(true);
                        }}
                        className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-700 transition-colors"
                        title={`Import students into ${selectedStandard}${div}`}
                      >
                        <Upload size={13} />
                        Import
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleDeleteDivision(div)}
                        className="text-gray-400 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleRenameDivision(div)}
                        className="text-gray-400 hover:text-indigo-700 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Case 3: STUDENTS DIRECTORY VIEW */}
      {currentView === 'STUDENTS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
              <button
                onClick={() => setCurrentView('STANDARDS')}
                className="hover:underline hover:text-black uppercase tracking-widest font-black text-[10px]"
              >
                Classes
              </button>
              <span className="text-slate-300 font-black">»</span>
              <button
                onClick={() => setCurrentView('DIVISIONS')}
                className="hover:underline hover:text-black uppercase tracking-widest font-black text-[10px]"
              >
                {STANDARD_NAMES[selectedStandard] || `${selectedStandard}th Standard`}
              </button>
              <span className="text-slate-300 font-black">»</span>
              <span className="text-indigo-600 font-black uppercase tracking-widest text-[10px]">
                Division {selectedDivision}
              </span>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus size={14} />
                Add New
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowStudentDropdown(prev => !prev)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-gray-500 hover:text-black border border-gray-250 bg-white cursor-pointer"
                  title="Options"
                >
                  <MoreVertical size={16} />
                </button>
                {showStudentDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowStudentDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-150 rounded-2xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        onClick={() => {
                          setShowStudentDropdown(false);
                          setShowPromoteModal(true);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-black uppercase text-slate-700 hover:text-black transition-colors"
                      >
                        Promote Students
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-xs font-black text-black uppercase tracking-wider">Division Roster ({selectedStandard}{selectedDivision})</span>
                <span className="text-[10px] uppercase font-bold text-gray-400">Active dataset: {filteredStudents.length} candidates found</span>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Bulk Medium:</span>
                  <Dropdown
                    value={bulkMedium}
                    onChange={(v) => {
                      setBulkMedium(v);
                      if (v) {
                        const p01Opts = getLanguageOptions(v, 'P01');
                        const p02Opts = getLanguageOptions(v, 'P02');
                        const p03Opts = getLanguageOptions(v, 'P03');
                        const p04Opts = getLanguageOptions(v, 'P04');
                        
                        const p03Eng = p03Opts.find((o: any) => o.name.toUpperCase().includes('ENGLISH'));
                        const p04Hin = p04Opts.find((o: any) => o.name.toUpperCase().includes('HINDI'));

                        setBulkFirstLangPaper1(p01Opts.length > 0 ? p01Opts[0].name : '');
                        setBulkFirstLangPaper2(p02Opts.length > 0 ? p02Opts[0].name : '');
                        setBulkSecondLang(p03Eng ? p03Eng.name : (p03Opts.length > 0 ? p03Opts[0].name : ""));
                        setBulkThirdLang(p04Hin ? p04Hin.name : (p04Opts.length > 0 ? p04Opts[0].name : ""));
                      } else {
                        setBulkFirstLangPaper1('');
                        setBulkFirstLangPaper2('');
                        setBulkSecondLang("");
                        setBulkThirdLang("");
                      }
                    }}
                    placeholder="Select..."
                    options={allMediumNames.map(m => ({ value: m, label: m }))}
                  />
                </div>
                {bulkMedium && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Dropdown
                      size="sm"
                      value={bulkFirstLangPaper1}
                      onChange={setBulkFirstLangPaper1}
                      options={getLanguageOptions(bulkMedium, 'P01').map((s: any) => ({ value: s.name, label: s.name }))}
                      placeholder="Paper I"
                      minWidth={110}
                    />
                    <Dropdown
                      size="sm"
                      value={bulkFirstLangPaper2}
                      onChange={setBulkFirstLangPaper2}
                      options={getLanguageOptions(bulkMedium, 'P02').map((s: any) => ({ value: s.name, label: s.name }))}
                      placeholder="Paper II"
                      minWidth={110}
                    />
                    <Dropdown
                      size="sm"
                      value={bulkSecondLang}
                      onChange={setBulkSecondLang}
                      options={getLanguageOptions(bulkMedium, 'P03').map((s: any) => ({ value: s.name, label: s.name }))}
                      placeholder="Second Lang"
                      minWidth={110}
                    />
                    <Dropdown
                      size="sm"
                      value={bulkThirdLang}
                      onChange={setBulkThirdLang}
                      options={getLanguageOptions(bulkMedium, 'P04').map((s: any) => ({ value: s.name, label: s.name }))}
                      placeholder="Third Lang"
                      minWidth={110}
                    />
                  </div>
                )}
                {bulkMedium && (
                  <button
                    onClick={() => {
                      handleBulkMediumUpdate(bulkMedium, bulkFirstLangPaper1, bulkFirstLangPaper2, bulkSecondLang, bulkThirdLang);
                      setBulkMedium('');
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Apply
                  </button>
                )}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search student name or register no..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-4 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-black focus:ring-1 focus:ring-black outline-none w-full transition-all text-black"
                  />
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Roster Summary Bar */}
            {currentView === 'STUDENTS' && filteredStudents.length > 0 && (
              <div className="px-6 pt-4 pb-2 space-y-3">
                {/* Medium Counts + Gender + Lang Distribution */}
                <div className="flex flex-wrap gap-3">
                  {Object.entries(rosterStats.mediumCounts).map(([med, count]) => (
                    <div key={med} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{med}</span>
                      <span className="text-sm font-black text-black bg-white px-2 py-0.5 rounded-lg border border-gray-100">{count}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                    <User size={12} className="text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Male</span>
                    <span className="text-sm font-black text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-100">{rosterStats.maleCount}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-pink-50 border border-pink-100 rounded-xl">
                    <User size={12} className="text-pink-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-pink-600">Female</span>
                    <span className="text-sm font-black text-pink-700 bg-white px-2 py-0.5 rounded-lg border border-pink-100">{rosterStats.femaleCount}</span>
                  </div>
                </div>

                {/* Language Distribution per student */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-xl">
                    <Languages size={12} className="text-violet-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-violet-600">Language Distribution</span>
                  </div>
                  {Object.entries(rosterStats.langCounts).sort((a, b) => {
                      const getOrder = (lang: string) => {
                        if (lang.includes(' - P01')) return 1;
                        if (lang.includes(' - P02')) return 2;
                        if (lang.includes(' - P03')) return 3;
                        if (lang.includes(' - P04')) return 4;
                        return 99;
                      };
                      return getOrder(a[0]) - getOrder(b[0]);
                    }).map(([lang, count]) => (
                    <div key={lang} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg">
                      <span className="text-[10px] font-bold text-gray-600">{lang}</span>
                      <span className="text-[10px] font-black text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">{count}</span>
                    </div>
                  ))}
                </div>

                {/* Validation Alert Banner */}
                {rosterStats.invalidCount > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-black text-red-800 uppercase tracking-wider">
                          {rosterStats.invalidCount} Student{rosterStats.invalidCount > 1 ? 's' : ''} with Invalid Medium-Language Combo{rosterStats.invalidCount > 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rosterStats.invalidRules.map((rule) => (
                            <span key={rule} className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-lg border border-red-200 uppercase">
                              {rule}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-red-600 font-bold mt-2">
                          Affected: {rosterStats.invalidStudents.slice(0, 6).join(', ')}{rosterStats.invalidStudents.length > 6 ? ` + ${rosterStats.invalidStudents.length - 6} more` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLoading ? (
              <PageLoader label="Loading Student Management..." />
            ) : filteredStudents.length === 0 ? (
              <div className="p-20 text-center text-gray-400 bg-white">
                <Users size={48} className="mx-auto text-gray-200 mb-3 animate-pulse" />
                <p className="text-xs font-black uppercase tracking-wider text-black">No candidates match records</p>
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">Register students using "Add New" or run spreadsheet import.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <th className="py-2.5 px-1 w-8 text-center">S.No</th>
                      <th className="py-2.5 px-2 w-32 truncate" title="Reg. No / Name">Reg. No / Name</th>
                      <th className="py-2.5 px-1 text-center w-12">Class</th>
                      <th className="py-2.5 px-1 text-center w-20">Medium</th>
                      <th className="py-2.5 px-1 text-center w-28">First Lang P1 (P01)</th>
                      <th className="py-2.5 px-1 text-center w-28">First Lang P2 (P02)</th>
                      <th className="py-2.5 px-1 text-center w-24">Second Lang (P03)</th>
                      <th className="py-2.5 px-1 text-center w-24">Third Lang (P04)</th>
                      <th className="py-2.5 px-2 text-right w-16 sticky right-0 bg-slate-50 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.03)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {filteredStudents.map((stud, index) => {
                      const isInvalid = isStudentInvalid(stud);
                      return (
                        <tr key={stud.id} className={`transition-colors ${isInvalid ? 'bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
                          <td className="py-2.5 px-1 text-center font-bold text-gray-500 text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-2 w-32 overflow-hidden">
                            <div className="font-bold text-black font-mono text-[11px] truncate">{stud.regNo || (stud as any).globalId || '—'}</div>
                            {stud.sslcRegNo && (
                              <div className="text-[8px] text-emerald-600 dark:text-emerald-400 font-sans font-black uppercase tracking-tight bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.2 rounded truncate inline-block max-w-full">
                                SSLC: {stud.sslcRegNo}
                              </div>
                            )}
                            <div className="font-black text-black uppercase mt-0.5 truncate text-[11px]" title={stud.name}>{stud.name}</div>
                          </td>
                          <td className="py-2.5 px-1 font-bold text-indigo-600 font-mono text-center bg-indigo-50/10 text-[11px]">
                            {(stud.classStandard || '10')}{(stud.division ? stud.division : '-')}
                          </td>
                          <td className="py-2.5 px-1 text-center">
                            <Dropdown
                              size="sm"
                              minWidth={75}
                              className="w-full"
                              value={resolveMediumShortName(stud.medium || '', mediums) || stud.medium || ''}
                              onChange={(v) => updateStudentLanguage(stud, 'medium', v)}
                              placeholder="Select"
                              options={allMediumNames.map(m => ({ value: m, label: m }))}
                            />
                          </td>
                          <td className="py-2.5 px-1 text-center">
                            <Dropdown
                              size="sm"
                              minWidth={105}
                              className="w-full"
                              value={stud.firstLangPaper1 || ''}
                              onChange={(v) => updateStudentLanguage(stud, 'firstLangPaper1', v)}
                              placeholder="Select"
                              options={getLanguageOptions(stud.medium || '', 'P01').map((s: any) => ({
                                value: s.name, label: s.name
                              }))}
                            />
                          </td>
                          <td className="py-2.5 px-1 text-center">
                            <Dropdown
                              size="sm"
                              minWidth={105}
                              className="w-full"
                              value={stud.firstLangPaper2 || ''}
                              onChange={(v) => updateStudentLanguage(stud, 'firstLangPaper2', v)}
                              placeholder="Select"
                              options={getLanguageOptions(stud.medium || '', 'P02').map((s: any) => ({
                                value: s.name, label: s.name
                              }))}
                            />
                          </td>
                          <td className="py-2.5 px-1 text-center">
                            <Dropdown
                              size="sm"
                              minWidth={85}
                              className="w-full"
                              value={normalizeSecondLang(stud.secondLang)}
                              onChange={(v) => updateStudentLanguage(stud, 'secondLang', v)}
                              options={getLanguageOptions(stud.medium || '', 'P03').map((s: any) => ({
                                value: s.name, label: s.name
                              }))}
                            />
                          </td>
                          <td className="py-2.5 px-1 text-center">
                            <Dropdown
                              size="sm"
                              minWidth={85}
                              className="w-full"
                              value={normalizeThirdLang(stud.thirdLang)}
                              onChange={(v) => updateStudentLanguage(stud, 'thirdLang', v)}
                              options={getLanguageOptions(stud.medium || '', 'P04').map((s: any) => ({
                                value: s.name, label: s.name
                              }))}
                            />
                          </td>
                          <td className={`py-2.5 px-2 text-right sticky right-0 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] ${isInvalid ? 'bg-red-50' : 'bg-white'}`}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEditStudent(stud)}
                                className="p-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 rounded-lg transition-all shadow-sm active:scale-95"
                                title="Edit Profile"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(stud)}
                                className="p-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 rounded-lg transition-all shadow-sm active:scale-95"
                                title="Delete Permanently"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Case 4: FORMER STUDENTS SEARCH VIEW */}
      {currentView === 'FORMER_SEARCH' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
              <button
                onClick={() => setCurrentView('STANDARDS')}
                className="hover:underline hover:text-black uppercase tracking-widest font-black text-[10px]"
              >
                Classes
              </button>
              <span className="text-slate-300 font-black">»</span>
              <span className="text-indigo-600 font-black uppercase tracking-widest text-[10px]">
                Former Students Search
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowClassDropdown(prev => !prev)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-gray-500 hover:text-black border border-gray-250 bg-white"
                title="Options"
              >
                <MoreVertical size={16} />
              </button>
              {showClassDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowClassDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-150 rounded-2xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                      onClick={() => {
                        setShowClassDropdown(false);
                        setCurrentView('FORMER_SEARCH');
                        setIsFormerSearchExecuted(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-black uppercase text-slate-700 hover:text-black transition-colors"
                    >
                      Search Former Students
                    </button>
                    <button
                      onClick={() => {
                        setShowClassDropdown(false);
                        setShowPromoteModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-black uppercase text-slate-700 hover:text-black transition-colors"
                    >
                      Student Promotion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>


          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 space-y-6">
            <div className="space-y-4 max-w-xl">
              {/* School */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-xs font-extrabold text-slate-700 uppercase">School</label>
                <span className="col-span-2 text-xs font-extrabold text-slate-900 uppercase">
                  {schools.find(s => s.id === activeSchoolId)?.name || user?.name || "Active School"}
                </span>
              </div>

              {/* Select a Class */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-xs font-extrabold text-slate-700 uppercase">Select a Class</label>
                <select
                  value={formerSearchClass}
                  onChange={e => setFormerSearchClass(e.target.value)}
                  className="col-span-2 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-white outline-none focus:border-black"
                >
                  <option value="ALL">Select a Classes</option>
                  <option value="8">Class 8</option>
                  <option value="9">Class 9</option>
                  <option value="10">Class 10</option>
                </select>
              </div>

              {/* Select a Division */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-xs font-extrabold text-slate-700 uppercase">Select a Division</label>
                <select
                  value={formerSearchDiv}
                  onChange={e => setFormerSearchDiv(e.target.value)}
                  className="col-span-2 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-white outline-none focus:border-black"
                >
                  <option value="ALL">All</option>
                  {Array.from(new Set(students.map(s => s.division).filter(Boolean)))
                    .sort()
                    .map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                </select>
              </div>


              {/* Student Name */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-xs font-extrabold text-slate-700 uppercase">Student Name</label>
                <input
                  type="text"
                  value={formerSearchName}
                  onChange={e => setFormerSearchName(e.target.value)}
                  className="col-span-2 px-3 py-2 rounded-xl border border-gray-250 text-xs font-medium outline-none focus:border-black"
                />
              </div>

              {/* Admission Number */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-xs font-extrabold text-slate-700 uppercase">Admission Number</label>
                <input
                  type="text"
                  value={formerSearchAdmissionNo}
                  onChange={e => setFormerSearchAdmissionNo(e.target.value)}
                  className="col-span-2 px-3 py-2 rounded-xl border border-gray-250 text-xs font-medium outline-none focus:border-black"
                />
              </div>

              {/* Student Code */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-xs font-extrabold text-slate-700 uppercase">Student Code</label>
                <input
                  type="text"
                  value={formerSearchStudentCode}
                  onChange={e => setFormerSearchStudentCode(e.target.value)}
                  className="col-span-2 px-3 py-2 rounded-xl border border-gray-250 text-xs font-medium outline-none focus:border-black"
                />
              </div>

              {/* Academic Year */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-xs font-extrabold text-slate-700 uppercase">Academic Year</label>
                <input
                  type="text"
                  value={formerSearchAcademicYear}
                  onChange={e => setFormerSearchAcademicYear(e.target.value)}
                  placeholder="e.g. 2024-25"
                  className="col-span-2 px-3 py-2 rounded-xl border border-gray-250 text-xs font-medium outline-none focus:border-black"
                />
              </div>

              {/* Search Button */}
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div></div>
                <button
                  onClick={() => setIsFormerSearchExecuted(true)}
                  className="col-span-2 py-3 bg-blue-600 text-white dark:bg-[#1f6feb] hover:bg-blue-700 dark:hover:bg-[#388bfd] rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 text-center w-28"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Former Search Results */}
            {isFormerSearchExecuted && (
              <div className="border-t border-gray-150 pt-6">
                <h4 className="text-xs font-black text-black uppercase tracking-wider mb-4">Search Results ({filteredStudents.length} candidates)</h4>
                {filteredStudents.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 font-bold text-xs uppercase">
                    No candidates matched the criteria
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-400">
                          <th className="py-3 px-4">Adm. No / Reg No</th>
                          <th className="py-3 px-4">SSLC Reg No</th>
                          <th className="py-3 px-4 text-center">Class / Div</th>
                          <th className="py-3 px-4 text-center">Academic Year</th>
                          <th className="py-3 px-4">Candidate Name</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {filteredStudents.map(stud => (
                          <tr key={stud.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold font-mono text-black text-xs">
                                {stud.globalId || stud.regNo || '—'}
                              </div>
                              {stud.uniqueId && stud.uniqueId !== (stud.globalId || stud.regNo) && (
                                <div className="text-[9px] font-bold text-gray-400 mt-0.5 font-mono">
                                  Code: {stud.uniqueId}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-500 font-bold">
                              {stud.sslcRegNo || '—'}
                            </td>
                            <td className="py-3 px-4 font-bold text-indigo-600 font-mono text-center">
                              {stud.classStandard || stud.className || '10'}{stud.division ? ` - ${stud.division}` : ''}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-center text-slate-500">
                              {stud.academicYear || 'Legacy'}
                            </td>
                            <td className="py-3 px-4 font-black uppercase text-black">{stud.name}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => startEditStudent(stud)}
                                  className="p-1.5 bg-slate-50 dark:bg-[#1f242c] hover:bg-blue-600 dark:hover:bg-[#1f6feb] hover:text-white text-gray-500 dark:text-gray-300 rounded transition-all"
                                  title="Edit Profile"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(stud)}
                                  className="p-1.5 bg-slate-50 hover:bg-rose-600 hover:text-white text-gray-450 rounded transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Single Student Profile Registration/Edition Modal Form */}
      {showAddEditModal && (
        <Modal isOpen={showAddEditModal} onClose={() => setShowAddEditModal(false)} disableOutsideClick={true}>
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="text-black" size={24} />
                <h2 className="text-lg font-black text-black uppercase tracking-tight">
                  {isEditMode ? "Modify Candidate Profile" : "Register Standard Candidate"}
                </h2>
              </div>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1.5 hover:bg-slate-100 text-gray-400 hover:text-black rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <form onSubmit={handleSaveStudent} id="student-form" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Register Number</label>
                    <input
                      type="number"
                      placeholder="e.g. 604921"
                      value={studentForm.regNo}
                      onChange={e => {
                        setStudentForm(prev => ({ ...prev, regNo: e.target.value }));
                        if (formErrors.regNo) setFormErrors(prev => ({ ...prev, regNo: '' }));
                      }}
                      className={`w-full px-4 py-2 rounded-xl border ${formErrors.regNo ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200'} text-xs font-medium focus:border-black focus:ring-1 focus:ring-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      required
                    />
                    {formErrors.regNo && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle size={10} /> {formErrors.regNo}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">SSLC Reg. No (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 392182"
                      value={studentForm.sslcRegNo || ''}
                      onChange={e => {
                        setStudentForm(prev => ({ ...prev, sslcRegNo: e.target.value }));
                        if (formErrors.sslcRegNo) setFormErrors(prev => ({ ...prev, sslcRegNo: '' }));
                      }}
                      className={`w-full px-4 py-2 rounded-xl border ${formErrors.sslcRegNo ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200'} text-xs font-medium focus:border-black focus:ring-1 focus:ring-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    />
                    {formErrors.sslcRegNo && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle size={10} /> {formErrors.sslcRegNo}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Academic Year</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-27"
                      value={studentForm.academicYear}
                      onChange={e => {
                        setStudentForm(prev => ({ ...prev, academicYear: e.target.value }));
                        if (formErrors.academicYear) setFormErrors(prev => ({ ...prev, academicYear: '' }));
                      }}
                      className={`w-full px-4 py-2 rounded-xl border ${formErrors.academicYear ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200'} text-xs font-medium focus:border-black focus:ring-1 focus:ring-black outline-none`}
                      required
                    />
                    {formErrors.academicYear && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle size={10} /> {formErrors.academicYear}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Full Student Name (Uppercase)</label>
                    <input
                      type="text"
                      placeholder="e.g. ADITHYAN P P"
                      value={studentForm.name}
                      onChange={e => {
                        setStudentForm(prev => ({ ...prev, name: e.target.value.toUpperCase() }));
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                      }}
                      className={`w-full px-4 py-2 rounded-xl border ${formErrors.name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200'} text-xs font-medium focus:border-black focus:ring-1 focus:ring-black outline-none`}
                      required
                    />
                    {formErrors.name && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle size={10} /> {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Gender</label>
                    <select
                      value={studentForm.gender}
                      onChange={e => setStudentForm(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-black"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Class (Optional)</label>
                    <select
                      value={studentForm.classStandard}
                      onChange={e => setStudentForm(prev => ({ ...prev, classStandard: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-black focus:ring-1 focus:ring-black outline-none bg-white"
                    >
                      <option value="10">Class 10</option>
                      <option value="9">Class 9</option>
                      <option value="8">Class 8</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Division (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. A"
                      value={studentForm.division}
                      onChange={e => setStudentForm(prev => ({ ...prev, division: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:border-black focus:ring-1 focus:ring-black outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Medium</label>
                    <select
                      value={studentForm.medium}
                      onChange={e => {
                        const med = e.target.value;
                        const updates: Record<string, string> = { medium: med };
                        if (med) {
                          const p01Options = getLanguageOptions(med, 'P01');
                          const p02Options = getLanguageOptions(med, 'P02');
                          const p03Options = getLanguageOptions(med, 'P03');
                          const p04Options = getLanguageOptions(med, 'P04');
                          
                          const p03Eng = p03Options.find((o: any) => o.name.toUpperCase().includes('ENGLISH'));
                          const p04Hin = p04Options.find((o: any) => o.name.toUpperCase().includes('HINDI'));

                          updates.firstLangPaper1 = p01Options.length > 0 ? p01Options[0].name : '';
                          updates.firstLangPaper2 = p02Options.length > 0 ? p02Options[0].name : '';
                          updates.secondLang = p03Eng ? p03Eng.name : (p03Options.length > 0 ? p03Options[0].name : "");
                          updates.thirdLang = p04Hin ? p04Hin.name : (p04Options.length > 0 ? p04Options[0].name : "");
                        } else {
                          updates.firstLangPaper1 = '';
                          updates.firstLangPaper2 = '';
                          updates.secondLang = "";
                          updates.thirdLang = "";
                        }
                        setStudentForm(prev => ({ ...prev, ...updates }));
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-black focus:ring-1 focus:ring-black outline-none bg-white"
                    >
                      <option value="">Select Medium</option>
                      {schoolMediums.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">First Lang. Paper I</label>
                    <select
                      value={studentForm.firstLangPaper1}
                      onChange={e => setStudentForm(prev => ({ ...prev, firstLangPaper1: e.target.value }))}
                      disabled={!studentForm.medium}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-black focus:ring-1 focus:ring-black outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">Select Paper I</option>
                      {getLanguageOptions(studentForm.medium, 'P01').map((s: any) => (
                        <option key={s._id || s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">First Lang. Paper II</label>
                    <select
                      value={studentForm.firstLangPaper2}
                      onChange={e => setStudentForm(prev => ({ ...prev, firstLangPaper2: e.target.value }))}
                      disabled={!studentForm.medium}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-black focus:ring-1 focus:ring-black outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">Select Paper II</option>
                      {getLanguageOptions(studentForm.medium, 'P02').map((s: any) => (
                        <option key={s._id || s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Second Language (P03)</label>
                    <select
                      value={normalizeSecondLang(studentForm.secondLang)}
                      onChange={e => setStudentForm(prev => ({ ...prev, secondLang: e.target.value }))}
                      disabled={!studentForm.medium}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-black focus:ring-1 focus:ring-black outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">Select P03</option>
                      {getLanguageOptions(studentForm.medium, 'P03').map((s: any) => (
                        <option key={s._id || s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Third Language (P04)</label>
                    <select
                      value={normalizeThirdLang(studentForm.thirdLang)}
                      onChange={e => setStudentForm(prev => ({ ...prev, thirdLang: e.target.value }))}
                      disabled={!studentForm.medium}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-black focus:ring-1 focus:ring-black outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">Select P04</option>
                      {getLanguageOptions(studentForm.medium, 'P04').map((s: any) => (
                        <option key={s._id || s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Date of Birth (D.O.B)</label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={studentForm.dob}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 8) val = val.slice(0, 8);
                        let formatted = val;
                        if (val.length >= 3) {
                          formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                        }
                        if (val.length >= 5) {
                          formatted = `${formatted.slice(0, 5)}/${val.slice(4)}`;
                        }
                        setStudentForm(prev => ({ ...prev, dob: formatted }));
                        if (formErrors.dob) setFormErrors(prev => ({ ...prev, dob: '' }));
                      }}
                      className={`w-full px-4 py-2 rounded-xl border ${formErrors.dob ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200'} text-xs font-medium focus:border-black outline-none`}
                    />
                    {formErrors.dob && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle size={10} /> {formErrors.dob}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Category</label>
                    <select
                      value={studentForm.category}
                      onChange={e => setStudentForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-black"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Contact Place / Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Palakkad"
                      value={studentForm.place}
                      onChange={e => setStudentForm(prev => ({ ...prev, place: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:border-black"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer p-2 border border-gray-100 rounded-xl hover:bg-slate-50 transition-colors h-[38px]">
                      <input
                        type="checkbox"
                        checked={studentForm.scribe}
                        onChange={e => setStudentForm(prev => ({ ...prev, scribe: e.target.checked }))}
                        className="rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-xs font-bold text-gray-650">Scribe Assistance Enabled</span>
                    </label>
                  </div>
                </div>

                {/* Progress percentages indicators block */}
                <div className="border-t border-gray-100 pt-4 mt-2">
                  <span className="text-[10px] font-black text-black uppercase tracking-wider block mb-3">Academic Capabilities & Assistance Percentages (%)</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-450 block mb-1">Letter Status (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={studentForm.letterStatus}
                        onChange={e => {
                          const val = e.target.value;
                          setStudentForm(prev => ({ ...prev, letterStatus: val === '' ? '' : val }));
                          if (formErrors.letterStatus) setFormErrors(prev => ({ ...prev, letterStatus: '' }));
                        }}
                        className={`w-full px-4 py-2 rounded-xl border ${formErrors.letterStatus ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200'} text-xs font-mono font-medium focus:border-black outline-none`}
                      />
                      {formErrors.letterStatus && (
                        <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          <AlertCircle size={10} /> {formErrors.letterStatus}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-450 block mb-1">Reading Status (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={studentForm.readingStatus}
                        onChange={e => {
                          const val = e.target.value;
                          setStudentForm(prev => ({ ...prev, readingStatus: val === '' ? '' : val }));
                          if (formErrors.readingStatus) setFormErrors(prev => ({ ...prev, readingStatus: '' }));
                        }}
                        className={`w-full px-4 py-2 rounded-xl border ${formErrors.readingStatus ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200'} text-xs font-mono font-medium focus:border-black outline-none`}
                      />
                      {formErrors.readingStatus && (
                        <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          <AlertCircle size={10} /> {formErrors.readingStatus}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-450 block mb-1">Writing Status (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={studentForm.writingStatus}
                        onChange={e => {
                          const val = e.target.value;
                          setStudentForm(prev => ({ ...prev, writingStatus: val === '' ? '' : val }));
                          if (formErrors.writingStatus) setFormErrors(prev => ({ ...prev, writingStatus: '' }));
                        }}
                        className={`w-full px-4 py-2 rounded-xl border ${formErrors.writingStatus ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200'} text-xs font-mono font-medium focus:border-black outline-none`}
                      />
                      {formErrors.writingStatus && (
                        <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          <AlertCircle size={10} /> {formErrors.writingStatus}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex shrink-0 justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="px-5 py-2 border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Close
              </button>
              <button
                type="submit"
                form="student-form"
                className="px-8 py-2 bg-blue-600 text-white dark:bg-[#1f6feb] hover:bg-blue-700 dark:hover:bg-[#388bfd] rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md"
              >
                {isEditMode ? "Update Profile" : "Save Student"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Bulk CSV/Text Paste spreadsheet loader */}
      {showImportModal && (
        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} disableOutsideClick={true}>
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Upload size={20} className="text-gray-500" />
                <div>
                  <h2 className="text-md font-black text-black uppercase tracking-tight">
                    {bulkOverrideDivision && selectedStandard && selectedDivision
                      ? `Import — Class ${selectedStandard}${selectedDivision}`
                      : 'Import Spreadsheet Stream'}
                  </h2>
                  {bulkOverrideDivision && selectedStandard && selectedDivision && (
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5">
                      All students will be added to Division {selectedStandard}${selectedDivision} · {bulkAcademicYear}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setBulkOverrideDivision(false);
                  setParsedImportRows([]);
                  setBulkText('');
                }}
                className="p-1 hover:bg-slate-100 rounded-full text-gray-400 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="mb-6">
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Target Academic Year (Mandatory)</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-27"
                  value={bulkAcademicYear}
                  onChange={e => setBulkAcademicYear(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:border-black focus:ring-1 focus:ring-black outline-none"
                  required
                />
              </div>

              {/* Division context indicator — shown when importing from a specific division */}
              {currentView === 'STUDENTS' && selectedStandard && selectedDivision && (
                <div className="mb-5 p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                      Importing into: Class {selectedStandard}${selectedDivision} · {bulkAcademicYear || '—'}
                    </p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkOverrideDivision}
                        onChange={e => setBulkOverrideDivision(e.target.checked)}
                        className="accent-indigo-600 w-3.5 h-3.5"
                      />
                      <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">
                        Force all rows → Class {selectedStandard}, Division {selectedDivision}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] uppercase font-bold text-gray-400">Import Format & Template</span>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  <Download size={12} />
                  Template CSV
                </button>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed font-semibold mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                You can download the template above or paste/upload a file with headers.
                Even if columns are in different orders, the system will auto-match headers:<br />
                <code className="text-[10px] text-blue-600 font-bold block mt-1">
                  Admission no, Full name, Gender, Date of birth, Class, Division, Category
                </code>
              </p>

              <div className="flex gap-2 border-b border-gray-100 pb-3 mb-4">
                <button
                  onClick={() => setBulkSourceOption('paste')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${bulkSourceOption === 'paste' ? 'bg-blue-600 text-white dark:bg-[#1f6feb]' : 'text-gray-400 hover:text-black'}`}
                >
                  📝 Direct Paste (Text)
                </button>
                <button
                  onClick={() => setBulkSourceOption('file')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${bulkSourceOption === 'file' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-black'}`}
                >
                  📁 Excel / CSV File
                </button>
              </div>

              {bulkSourceOption === 'paste' ? (
                <textarea
                  rows={5}
                  placeholder="Paste CSV records here..."
                  value={bulkText}
                  onChange={e => handleParseBulkInput(e.target.value)}
                  className="w-full text-xs font-mono p-3 border border-gray-200 rounded-xl focus:border-black focus:ring-1 focus:ring-black outline-none leading-relaxed"
                />
              ) : (
                <div className="border border-dashed border-gray-200 hover:border-black rounded-xl p-8 text-center transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    accept=".csv,.txt,.xls,.xlsx"
                    onChange={handleBulkFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileText className="mx-auto text-emerald-500 group-hover:text-emerald-700 transition-colors mb-2" size={32} />
                  <p className="text-sm font-bold uppercase text-gray-700">Upload Excel or CSV File</p>
                  <p className="text-xs text-gray-500 mt-1">.xls, .xlsx will be automatically converted to CSV.</p>
                </div>
              )}

              {/* Progress UI */}
              {importStage !== 'idle' && importStage !== 'completed' && (
                <div className="space-y-3 mt-4 pt-4 border-t border-gray-100 text-center py-6">
                  <div className="animate-spin inline-block w-8 h-8 border-[3px] border-emerald-600 border-t-transparent rounded-full mb-3" />
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-widest">
                    {importStage === 'reading' && "Reading File..."}
                    {importStage === 'cleaning' && "Cleaning Data..."}
                    {importStage === 'validating' && "Validating..."}
                    {importStage === 'saving' && "Saving Students..."}
                  </p>
                </div>
              )}

              {/* Validation Error UI */}
              {importStage === 'completed' && importValidationErrors.length > 0 && (
                <div className="mt-4 border border-rose-200 rounded-xl bg-rose-50 overflow-hidden">
                  <div className="bg-rose-100 text-rose-800 px-4 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={16} />
                    Import Validation Failed ({importValidationErrors.length} Errors Found)
                  </div>
                  <div className="max-h-[250px] overflow-y-auto p-4 space-y-4">
                    {importValidationErrors.map((err, i) => (
                      <div key={i} className="border-b border-rose-100 pb-3 last:border-0 last:pb-0 text-xs">
                        <div className="font-bold text-rose-700 mb-1">Row {err.row} : {err.field}</div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="bg-white px-2 py-1.5 rounded text-gray-600 border border-rose-100">
                            <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider">Found</span>
                            <span className="font-mono text-rose-600 break-all">{err.found}</span>
                          </div>
                          <div className="bg-white px-2 py-1.5 rounded text-gray-600 border border-emerald-100">
                            <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider">Expected</span>
                            <span className="font-mono text-emerald-600">{err.expected}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success UI before saving */}
              {importStage === 'completed' && importValidationErrors.length === 0 && parsedImportRows.length > 0 && (
                <div className="mt-4 border border-emerald-200 rounded-xl bg-emerald-50 overflow-hidden">
                  <div className="bg-emerald-100 text-emerald-800 px-4 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      All {parsedImportRows.length} Records Validated Successfully
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Action Area */}
            {importStage === 'completed' && parsedImportRows.length > 0 && (
              <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 shrink-0">
                <button
                  type="button"
                  onClick={handleExecuteBulkImport}
                  disabled={isBulkImporting || importValidationErrors.length > 0}
                  className={`w-full py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${importValidationErrors.length > 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {isBulkImporting ? "Saving..." : importValidationErrors.length > 0 ? "Fix Errors to Import" : "Import Students"}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Student Bulk Diagnostics Summary Modal */}
      {importSummary && (
        <Modal isOpen={!!importSummary} onClose={() => setImportSummary(null)} disableOutsideClick={true}>
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100">
            {/* Header */}
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-black text-black tracking-tight uppercase flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-blue-600 text-white dark:bg-[#1f6feb] text-[10px] rounded font-mono">BULK DIAGNOSTICS</span>
                  Student Import Results
                </h2>
                <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Detailed row-by-row candidate diagnostic log</p>
              </div>
              <button
                onClick={() => setImportSummary(null)}
                className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Metrics Panel */}
            <div className="p-8 pb-4 grid grid-cols-3 gap-4 border-b border-gray-100 bg-slate-50/50 shrink-0">
              <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm text-center">
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Processed</div>
                <div className="text-2xl font-black text-gray-900 mt-1">{importSummary.processed}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm text-center">
                <div className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Successful</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{importSummary.successfulCount}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm text-center">
                <div className="text-[10px] font-black uppercase text-red-500 tracking-wider">Failed / Skipped</div>
                <div className="text-2xl font-black text-red-600 mt-1">{importSummary.failedCount}</div>
              </div>
            </div>

            {/* List Detail Area */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {/* Failed Items List */}
              {importSummary.failedCount > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-red-600 tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-red-500" />
                    Failed Rows ({importSummary.failedCount})
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {importSummary.failed.map((fail, i) => (
                      <div key={i} className="bg-red-50/50 border border-red-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-red-100 text-red-800 text-[10px] font-black px-1.5 py-0.5 rounded font-mono">Row {fail.row}</span>
                            <span className="font-extrabold text-red-950 font-mono">{fail.identifier}</span>
                          </div>
                          <p className="font-bold text-red-900/90 mt-1">{fail.name}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase text-red-700 bg-red-100/50 px-2 py-1 rounded-lg self-center max-w-xs text-right leading-relaxed">
                          {fail.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Successful Items List */}
              {importSummary.successfulCount > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Successful Candidates ({importSummary.successfulCount})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {importSummary.successful.map((success, i) => (
                      <div key={i} className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded font-mono">Row {success.row}</span>
                            <span className="font-extrabold text-black font-mono">{success.identifier}</span>
                          </div>
                          <p className="font-bold text-gray-700 mt-1">{success.name}</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${success.action === 'Created'
                          ? "bg-emerald-100 text-emerald-850"
                          : "bg-amber-100 text-amber-850"
                          }`}>
                          {success.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setImportSummary(null)}
                className="bg-blue-600 text-white dark:bg-[#1f6feb] hover:bg-blue-700 dark:hover:bg-[#388bfd] px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.98]"
              >
                Close Summary
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: Bulk Promotion Modal */}
      {showPromoteModal && (
        <Modal isOpen={showPromoteModal} onClose={() => setShowPromoteModal(false)} className="items-start pt-12 sm:pt-20" disableOutsideClick={true}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="text-indigo-600" size={24} />
                <h2 className="text-lg font-black text-black uppercase tracking-tight">Bulk Student Promotion</h2>
              </div>
              <button
                onClick={() => setShowPromoteModal(false)}
                className="p-1.5 hover:bg-slate-100 text-gray-400 hover:text-black rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-5">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                <p className="text-[11px] text-amber-800 leading-relaxed font-bold">
                  Use this tool to move an entire class to the next grade level (e.g. Class 9 students moving to Class 10) for the new academic cycle.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Source Class</label>
                  <select
                    value={promotionForm.sourceClass}
                    onChange={e => setPromotionForm(prev => ({ ...prev, sourceClass: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-black outline-none bg-white"
                  >
                    <option value="10">Class 10</option>
                    <option value="9">Class 9</option>
                    <option value="8">Class 8</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Target Class</label>
                  <select
                    value={promotionForm.targetClass}
                    onChange={e => setPromotionForm(prev => ({ ...prev, targetClass: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-black outline-none bg-white"
                  >
                    <option value="TEMP">TEMP</option>
                    <option value="10">Class 10</option>
                    <option value="9">Class 9</option>
                    <option value="8">Class 8</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Select Students ({promotionForm.selectedStudentIds.length} selected)</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (promotionForm.selectedStudentIds.length === studentsInSourceClass.length && studentsInSourceClass.length > 0) {
                        setPromotionForm(prev => ({ ...prev, selectedStudentIds: [] }));
                      } else {
                        setPromotionForm(prev => ({ ...prev, selectedStudentIds: studentsInSourceClass.map(s => s.id) }));
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                  >
                    {promotionForm.selectedStudentIds.length === studentsInSourceClass.length && studentsInSourceClass.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto bg-white divide-y divide-gray-100">
                  {studentsInSourceClass.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">No students found in Class {promotionForm.sourceClass} for {selectedAcademicYearFilter === 'ALL' ? currentAcademicYear : selectedAcademicYearFilter}</div>
                  ) : (
                    studentsInSourceClass.map(student => (
                      <label key={student.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={promotionForm.selectedStudentIds.includes(student.id)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setPromotionForm(prev => {
                              const newIds = isChecked
                                ? [...prev.selectedStudentIds, student.id]
                                : prev.selectedStudentIds.filter(id => id !== student.id);
                              return { ...prev, selectedStudentIds: newIds };
                            });
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900">{student.name}</span>
                          <span className="text-[10px] font-mono text-gray-500">Reg: {student.regNo}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">New Academic Year</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-27"
                  value={promotionForm.newAcademicYear}
                  onChange={e => setPromotionForm(prev => ({ ...prev, newAcademicYear: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:border-black outline-none"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1 font-medium italic">Example: 2026-27</p>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="px-5 py-2 border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteStudents}
                disabled={isPromoting}
                className="px-8 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md"
              >
                {isPromoting ? "Promoting..." : "Execute Promotion"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudentManagementPage;
