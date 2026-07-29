import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  X, 
  Filter, 
  Award, 
  Users, 
  TrendingUp,
  CheckCircle2,
  Building,
  School as SchoolIcon,
  BookOpen
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { getStudentResult } from '../../lib/resultClassification';
import Modal from './Modal';
import ExamSelect from './ExamSelect';
import Dropdown from './Dropdown';
import { School, District, EducationalDistrict, Exam } from '../../types';
import toast from 'react-hot-toast';

const PCODE_CANONICAL_TITLES_MODAL: Record<string, string> = {
  P01: 'P01 - First Language Paper I',
  P02: 'P02 - First Language Paper II',
  P03: 'P03 - English (Second Language)',
  P04: 'P04 - Hindi (Third Language)',
  P05: 'P05 - Social Science',
  P06: 'P06 - Physics',
  P07: 'P07 - Chemistry',
  P08: 'P08 - Biology',
  P09: 'P09 - Mathematics',
  P10: 'P10 - Information Technology'
};

const getSubjectPCodeModal = (sub: any): string => {
  if (!sub) return '';
  const str = String(sub.pCode || sub.code || sub.shortCode || sub.paperType || sub.shortName || sub.name || sub.subjectName || sub.subject || '').toUpperCase();
  const match = str.match(/\bP(0?[1-9]|10)\b/) || str.match(/P(0?[1-9]|10)/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 10) return num <= 9 ? `P0${num}` : `P${num}`;
  }
  return '';
};

const buildMediumSubjectTablesModal = (rawDataList: any[]) => {
  const normalizeMedKey = (med: string) => {
    const lower = (med || '').toLowerCase().trim();
    if (lower.includes('english') || lower === 'em') return 'EM';
    if (lower.includes('malayalam') || lower === 'mm') return 'MM';
    if (lower.includes('tamil') || lower === 'tm') return 'TM';
    return 'EM';
  };

  const mediumNames: Record<string, string> = {
    EM: 'English Medium (EM)',
    MM: 'Malayalam Medium (MM)',
    TM: 'Tamil Medium (TM)',
    OVERALL: 'Overall (All Mediums)'
  };

  const groupedByMed: Record<string, any[]> = {
    EM: [],
    MM: [],
    TM: []
  };

  const overallMap = new Map<string, any>();

  rawDataList.forEach((sub: any) => {
    const medKey = normalizeMedKey(sub.medium);
    const passed = (sub.aPlus || 0) + (sub.a || 0) + (sub.bPlus || 0) + (sub.b || 0) + (sub.cPlus || 0) + (sub.c || 0) + (sub.dPlus || 0);
    const appeared = passed + (sub.d || 0) + (sub.e || 0);
    const rawAbsents = sub.absents || 0;

    // Ensure Total Students = Appeared + Absents with 100% mathematical precision
    const totalStudents = sub.totalStudents && sub.totalStudents >= (appeared + rawAbsents)
      ? sub.totalStudents
      : (appeared + rawAbsents);
    const absents = Math.max(rawAbsents, totalStudents - appeared);
    const reconciledTotalStudents = appeared + absents;

    const passPercentage = appeared > 0 ? (passed / appeared) * 100 : 0;
    const below30 = sub.below30 || 0;
    const below55 = (sub.pct45 || 0) + (sub.pct55 || 0);
    const below85 = (sub.pct65 || 0) + (sub.pct75 || 0) + (sub.pct85 || 0);
    const below100 = sub.pct100 || 0;

    // Resolve canonical pCode
    let pCode = getSubjectPCodeModal(sub);
    if (!pCode && sub.shortCode) {
      const match = sub.shortCode.match(/P(0?[1-9]|10)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        pCode = num <= 9 ? `P0${num}` : `P${num}`;
      }
    }

    const rowItem = {
      pCode,
      subjectName: sub.subject || sub.name || '',
      totalStudents: reconciledTotalStudents,
      appeared,
      passed,
      failed: Math.max(0, appeared - passed),
      absents,
      fullAPlus: sub.aPlus || 0,
      aPlus: sub.aPlus || 0,
      a: sub.a || 0,
      bPlus: sub.bPlus || 0,
      b: sub.b || 0,
      cPlus: sub.cPlus || 0,
      c: sub.c || 0,
      dPlus: sub.dPlus || 0,
      d: sub.d || 0,
      e: sub.e || 0,
      passPercentage
    };

    groupedByMed[medKey].push(rowItem);

    // Group for OVERALL by P-Code (or by Subject Name if no P-code)
    const overallKey = pCode || rowItem.subjectName.toUpperCase().trim();
    const canonicalTitle = PCODE_CANONICAL_TITLES_MODAL[pCode] || (pCode ? `${pCode} - ${rowItem.subjectName}` : rowItem.subjectName);

    if (!overallMap.has(overallKey)) {
      overallMap.set(overallKey, {
        pCode,
        subjectName: canonicalTitle,
        totalStudents: reconciledTotalStudents,
        appeared,
        passed,
        failed: Math.max(0, appeared - passed),
        absents,
        fullAPlus: sub.aPlus || 0,
        aPlus: sub.aPlus || 0,
        a: sub.a || 0,
        bPlus: sub.bPlus || 0,
        b: sub.b || 0,
        cPlus: sub.cPlus || 0,
        c: sub.c || 0,
        dPlus: sub.dPlus || 0,
        d: sub.d || 0,
        e: sub.e || 0,
        passPercentage
      });
    } else {
      const existing = overallMap.get(overallKey);
      existing.totalStudents += reconciledTotalStudents;
      existing.appeared += appeared;
      existing.passed += passed;
      existing.failed += Math.max(0, appeared - passed);
      existing.absents += absents;
      existing.fullAPlus += (sub.aPlus || 0);
      existing.aPlus += (sub.aPlus || 0);
      existing.a += (sub.a || 0);
      existing.bPlus += (sub.bPlus || 0);
      existing.b += (sub.b || 0);
      existing.cPlus += (sub.cPlus || 0);
      existing.c += (sub.c || 0);
      existing.dPlus += (sub.dPlus || 0);
      existing.d += (sub.d || 0);
      existing.e += (sub.e || 0);
      existing.passPercentage = existing.appeared > 0 ? (existing.passed / existing.appeared) * 100 : 0;
    }
  });

  const mediumOrder = ['EM', 'MM', 'TM', 'OVERALL'];
  
  return mediumOrder.map(code => {
    let subjects = code === 'OVERALL' ? Array.from(overallMap.values()) : (groupedByMed[code] || []);
    
    subjects.sort((a, b) => {
      const numA = parseInt((a.pCode || '').replace(/\D/g, '') || '99', 10);
      const numB = parseInt((b.pCode || '').replace(/\D/g, '') || '99', 10);
      if (numA !== numB) return numA - numB;
      return a.subjectName.localeCompare(b.subjectName);
    });

    const totalStudents = subjects.reduce((sum, s) => sum + (s.totalStudents || 0), 0);
    const appeared = subjects.reduce((sum, s) => sum + (s.appeared || 0), 0);
    const passed = subjects.reduce((sum, s) => sum + (s.passed || 0), 0);
    const failed = subjects.reduce((sum, s) => sum + (s.failed || 0), 0);
    const absents = subjects.reduce((sum, s) => sum + (s.absents || 0), 0);
    const fullAPlus = subjects.reduce((sum, s) => sum + (s.fullAPlus || 0), 0);
    const passPercentage = appeared > 0 ? (passed / appeared) * 100 : 0;

    return {
      code,
      title: mediumNames[code],
      summary: {
        totalStudents,
        appeared,
        passed,
        failed,
        absents,
        fullAPlus,
        passPercentage
      },
      subjects
    };
  });
};
import logoUrl from '../../assets/logo.png';

export type ReportLevel = 'DISTRICT' | 'EDUCATIONAL' | 'SCHOOL' | 'SUBJECT';

interface PdfReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLevel?: ReportLevel;
  initialExamId?: string;
  initialDistrictId?: string;
  initialEduId?: string;
  initialSchoolId?: string;
}

const PdfReportGeneratorModal: React.FC<PdfReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialLevel = 'DISTRICT',
  initialExamId = '',
  initialDistrictId = '',
  initialEduId = 'ALL',
  initialSchoolId = ''
}) => {
  const { user } = useAuth();
  const [logoBase64, setLogoBase64] = useState<string>('');

  const reportRef = useRef<HTMLDivElement>(null);

  // Convert logo to base64 for reliable PDF rendering
  useEffect(() => {
    fetch(logoUrl)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(err => console.error('Failed to load logo as base64', err));
  }, []);

  const [reportLevel, setReportLevel] = useState<ReportLevel>(initialLevel);
  const [exams, setExams] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [eduDistricts, setEduDistricts] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);

  const [selectedExamId, setSelectedExamId] = useState(initialExamId);
  const [selectedDistrictId, setSelectedDistrictId] = useState(initialDistrictId || user?.districtId || 'dist-9');
  const [selectedEduId, setSelectedEduId] = useState(initialEduId);
  const [selectedSchoolId, setSelectedSchoolId] = useState(initialSchoolId || (user?.role === 'SCHOOL' ? user.schoolId || user.id : 'ALL'));
  const [schoolType, setSchoolType] = useState('ALL');

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const deoEduId = user?.subDistrictId || user?.eduDistrictId || user?.eduId;
  const deoEduObj = React.useMemo(() => {
    return eduDistricts.find(e => e.id === deoEduId || e.name === deoEduId);
  }, [eduDistricts, deoEduId]);

  const availableSchools = React.useMemo(() => {
    if (user?.role === 'DEO' && deoEduId) {
      return schools.filter((s: any) => 
        s.subDistrictId === deoEduId || 
        s.eduId === deoEduId ||
        s.subDistrictId === deoEduObj?.id ||
        s.eduId === deoEduObj?.id
      );
    }
    return schools;
  }, [user, deoEduId, deoEduObj, schools]);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      if (initialLevel) setReportLevel(initialLevel);
      if (initialExamId) setSelectedExamId(initialExamId);
      if (initialDistrictId) setSelectedDistrictId(initialDistrictId);
      if (initialEduId) setSelectedEduId(initialEduId);
      if (initialSchoolId) setSelectedSchoolId(initialSchoolId);
    }
  }, [isOpen, initialLevel, initialExamId, initialDistrictId, initialEduId, initialSchoolId]);

  // Load Metadata Dropdowns
  useEffect(() => {
    if (!isOpen) return;
    const loadMetadata = async () => {
      try {
        const [examsRes, distRes, eduRes, schoolsRes] = await Promise.all([
          apiClient.get('/management/exams'),
          apiClient.get('/management/districts'),
          apiClient.get('/management/educational-districts'),
          apiClient.get('/management/schools')
        ]);
        setExams(examsRes.data || []);
        if (examsRes.data?.length > 0 && !selectedExamId) {
          setSelectedExamId(examsRes.data[0].id);
        }
        setDistricts(distRes.data || []);
        setEduDistricts(eduRes.data || []);
        setSchools(schoolsRes.data || []);
      } catch (err) {
        console.error("Failed to load PDF metadata:", err);
      }
    };
    loadMetadata();
  }, [isOpen]);

  // Sync DEO assigned Educational District and District
  useEffect(() => {
    if (isOpen && user?.role === 'DEO' && deoEduId && eduDistricts.length > 0) {
      const matchedEdu = eduDistricts.find(e => e.id === deoEduId || e.name === deoEduId);
      if (matchedEdu) {
        setSelectedEduId(matchedEdu.id);
        if (matchedEdu.districtId) {
          setSelectedDistrictId(matchedEdu.districtId);
        }
      }
    }
  }, [isOpen, user, deoEduId, eduDistricts]);

  // Sync selected school for DEO/ADMIN (any role except SCHOOL)
  useEffect(() => {
    if (isOpen && user?.role !== 'SCHOOL' && availableSchools.length > 0) {
      if (!selectedSchoolId || (selectedSchoolId !== 'ALL' && !availableSchools.some(s => (s.id || s._id) === selectedSchoolId))) {
        setSelectedSchoolId('ALL');
      }
    }
  }, [isOpen, user, availableSchools, selectedSchoolId]);

  // Fetch Report Analytics based on Level
  const fetchReportAnalytics = async () => {
    if (!selectedExamId) return;
    setIsLoadingData(true);
    try {
      const isDeo = user?.role === 'DEO';
      const targetDeoEdu = deoEduObj?.id || deoEduId;

      if (reportLevel === 'DISTRICT') {
        if (isDeo && targetDeoEdu) {
          const res = await apiClient.get(`/results/educational/${targetDeoEdu}?schoolType=${schoolType}&examId=${selectedExamId}`);
          setReportData({ type: 'EDUCATIONAL', eduId: targetDeoEdu, rows: res.data });
        } else {
          const distId = selectedDistrictId || user?.districtId || 'dist-9';
          const res = await apiClient.get(`/results/district/${distId}?schoolType=${schoolType}&examId=${selectedExamId}`);
          setReportData({ type: 'DISTRICT', rows: res.data });
        }
      } else if (reportLevel === 'EDUCATIONAL') {
        const targetEdu = (isDeo && targetDeoEdu) ? targetDeoEdu : ((selectedEduId && selectedEduId !== 'ALL') ? selectedEduId : (eduDistricts[0]?.id || 'edu-alat'));
        const res = await apiClient.get(`/results/educational/${targetEdu}?schoolType=${schoolType}&examId=${selectedExamId}`);
        setReportData({ type: 'EDUCATIONAL', eduId: targetEdu, rows: res.data });
      } else if (reportLevel === 'SCHOOL') {
        const targetSch = selectedSchoolId || (user?.role === 'SCHOOL' ? user.schoolId || user.id : 'ALL');
        if (!targetSch) {
          toast.error('Please select a school first');
          setIsLoadingData(false);
          return;
        }
        const res = await apiClient.get(`/reports/detailed-school/${targetSch}/${selectedExamId}`);
        const students = res.data.results || [];
        const appeared = students.filter((st: any) => {
          const status = getStudentResult(Object.values(st.grades || {}));
          return status !== 'INCOMPLETE';
        }).length;
        const passedStudents = students.filter((st: any) => {
          const status = getStudentResult(Object.values(st.grades || {}));
          return status === 'PASS';
        }).length;
        const fullAPlusStudents = students.filter((st: any) => {
          const grades = Object.values(st.grades || {});
          return grades.length > 0 && grades.every(g => String(g).trim().toUpperCase() === 'A+');
        }).length;
        const passPercentage = appeared > 0 ? (passedStudents / appeared) * 100 : 0;
        const fullAPlusPct = appeared > 0 ? (fullAPlusStudents / appeared) * 100 : 0;
        const performanceScore = ((passPercentage * 0.6) + (fullAPlusPct * 0.4)).toFixed(2);

        const gradeCounts: Record<string, number> = {
          'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D+': 0, 'D': 0, 'E': 0
        };
        students.forEach((st: any) => {
          if (st.grades) {
            Object.values(st.grades).forEach(grade => {
              const g = String(grade).trim().toUpperCase();
              if (gradeCounts[g] !== undefined) {
                gradeCounts[g]++;
              }
            });
          }
        });

        setReportData({
          type: 'SCHOOL',
          school: res.data.school,
          exam: res.data.exam,
          students: students,
          stats: {
            totalStudents: appeared || students.length,
            passedStudents,
            fullAPlusStudents,
            passPercentage,
            performanceScore,
            gradeCounts
          }
        });
      } else if (reportLevel === 'SUBJECT') {
        const params = new URLSearchParams({
          examId: selectedExamId,
          districtId: selectedDistrictId || user?.districtId || 'dist-9',
          schoolType
        });
        const targetEdu = (isDeo && targetDeoEdu) ? targetDeoEdu : selectedEduId;
        if (targetEdu && targetEdu !== 'ALL') params.append('eduId', targetEdu);
        
        const targetSchoolForSubject = (selectedSchoolId && selectedSchoolId !== 'ALL') ? selectedSchoolId : (user?.role === 'SCHOOL' ? user.schoolId || user.id : null);
        if (targetSchoolForSubject) params.append('schoolId', targetSchoolForSubject);

        const res = await apiClient.get(`/results/subject-analysis?${params.toString()}`);
        const rawSubjectData = res.data?.data || [];
        const mediumTables = buildMediumSubjectTablesModal(rawSubjectData);

        setReportData({
          type: 'SUBJECT',
          mediumTables
        });
      }
    } catch (err) {
      console.error("Fetch Analytics Error:", err);
      toast.error('Failed to generate analysis report');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedExamId) {
      fetchReportAnalytics();
    }
  }, [isOpen, reportLevel, selectedExamId, selectedDistrictId, selectedEduId, selectedSchoolId, schoolType]);

  if (!isOpen) return null;

  // Selected Names for Header Display
  const currentExamObj = exams.find(e => e.id === selectedExamId);
  const currentDistObj = districts.find(d => d.id === selectedDistrictId);
  const currentEduObj = eduDistricts.find(e => e.id === selectedEduId);
  const currentSchoolObj = schools.find(s => s.id === selectedSchoolId);

  // PDF Download Handler cleanly converting preview DOM to PDF
  const handleDownloadPdf = async () => {
    if (!reportRef.current) {
      toast.error('Report preview not ready');
      return;
    }
    setIsGeneratingPdf(true);
    const pdfToast = toast.loading('Converting report preview to PDF...');

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, { 
        scale: 3, 
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        removeContainer: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const safeTitle = getReportTitle().replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;

      let totalPages = Math.ceil(imgHeight / pageHeight);
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.text('CONFIDENTIAL ACADEMIC EVALUATION SHEET  |  VIJAYASREE ANALYTICS SYSTEM © 2026', 10, pageHeight - 10);
        pdf.text(`Page ${i} / ${totalPages}`, imgWidth - 25, pageHeight - 10);
      }

      pdf.save(fileName);
      toast.success('PDF generated successfully!', { id: pdfToast });
    } catch (err) {
      console.error("PDF Generation Error:", err);
      toast.error('Failed to convert preview to PDF', { id: pdfToast });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Dynamic titles
  const getReportTitle = () => {
    switch (reportLevel) {
      case 'DISTRICT': return 'REVENUE DISTRICT PERFORMANCE SUMMARY (REVENUE DISTRICTS SCOPE)';
      case 'EDUCATIONAL': return 'EDUCATIONAL DISTRICT LEVEL ANALYTICAL PERFORMANCE REPORT';
      case 'SCHOOL': return 'INSTITUTIONAL SCHOOL LEVEL ACADEMIC EVALUATION SHEET';
      case 'SUBJECT': return 'DEEP SUBJECT-WISE ACADEMIC BREAKDOWN ANALYSIS';
      default: return 'ANALYTICS REPORT';
    }
  };

  // Browser Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Helper aggregated stats calculation
  const calculateAggregateStats = () => {
    if (!reportData) return { totalStudents: 0, appeared: 0, passed: 0, failed: 0, fullAPlus: 0, passPct: '0.00', failPct: '0.00' };
    if (reportData.type === 'DISTRICT' || reportData.type === 'EDUCATIONAL') {
      const rows: any[] = reportData.rows || [];
      const appeared = rows.reduce((acc, r) => acc + (r.studentsAppeared ?? 0), 0);
      const passed = rows.reduce((acc, r) => acc + (r.pass ?? 0), 0);
      const fullAPlus = rows.reduce((acc, r) => acc + (r.fullAPlus ?? 0), 0);
      const totalStudents = rows.reduce((acc, r) => acc + (r.totalStudents ?? r.studentsAppeared ?? 0), 0);
      const failed = appeared - passed;
      const passPct = appeared > 0 ? ((passed / appeared) * 100).toFixed(2) : '0.00';
      const failPct = appeared > 0 ? ((failed / appeared) * 100).toFixed(2) : '0.00';
      return { totalStudents: totalStudents || appeared, appeared, passed, failed, fullAPlus, passPct, failPct };
    }
    if (reportData.type === 'SCHOOL') {
      const stats = reportData.stats || {};
      const appeared = stats.appeared || 0;
      const passed = stats.passed || 0;
      const fullAPlus = stats.fullAPlus || 0;
      const failed = appeared - passed;
      const passPct = stats.passPercentage ? Number(stats.passPercentage).toFixed(2) : '0.00';
      const failPct = appeared > 0 ? ((failed / appeared) * 100).toFixed(2) : '0.00';
      return { totalStudents: appeared, appeared, passed, failed, fullAPlus, passPct, failPct };
    }
    if (reportData.type === 'SUBJECT') {
      const overall = reportData.mediumTables?.find((m: any) => m.code === 'OVERALL')?.summary || {};
      return {
        totalStudents: overall.totalStudents || 0,
        appeared: overall.appeared || 0,
        passed: overall.passed || 0,
        failed: overall.failed || 0,
        fullAPlus: overall.fullAPlus || 0,
        passPct: overall.passPercentage ? overall.passPercentage.toFixed(2) : '0.00',
        failPct: overall.appeared > 0 ? (((overall.appeared - overall.passed) / overall.appeared) * 100).toFixed(2) : '0.00'
      };
    }
    return { totalStudents: 0, appeared: 0, passed: 0, failed: 0, fullAPlus: 0, passPct: '0.00', failPct: '0.00' };
  };

  const aggStats = calculateAggregateStats();

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-2 sm:p-4" disableOutsideClick={true}>
      
      {/* Print Specific CSS Styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #a4-printable-report, #a4-printable-report * {
            visibility: visible !important;
          }
          #a4-printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      <div className="bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col border border-slate-800 text-white">
        
        {/* Top Control Bar (No Print) */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                Professional PDF Analytics Engine
              </h2>
              <p className="text-xs text-slate-400 font-medium">Generate A4 standardized report sheets with verified institutional metadata.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 active:scale-95"
            >
              <Printer size={16} />
              Print A4
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isLoadingData}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 active:scale-95"
            >
              <Download size={16} />
              {isGeneratingPdf ? 'Generating PDF...' : 'Export PDF'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Dynamic Controls & Filter Selection Bar (No Print) */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center gap-3 no-print shrink-0 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-black uppercase tracking-widest mr-2">
            <Filter size={14} />
            Scope:
          </div>

          {/* Level Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'DISTRICT', label: '1. District Level', icon: Building },
              { id: 'EDUCATIONAL', label: '2. Edu District', icon: Building },
              { id: 'SCHOOL', label: '3. School Level', icon: SchoolIcon },
              { id: 'SUBJECT', label: '4. Subject Analysis', icon: BookOpen }
            ].map(lvl => (
              <button
                key={lvl.id}
                onClick={() => setReportLevel(lvl.id as ReportLevel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black uppercase tracking-wider transition-all ${
                  reportLevel === lvl.id ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <lvl.icon size={12} />
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Exam Filter */}
          <ExamSelect
            exams={exams}
            selectedExamId={selectedExamId}
            onSelect={(id) => setSelectedExamId(id)}
            placeholder="Select Exam"
            className="min-w-[160px]"
          />

          {/* Revenue District Filter */}
          {user?.role !== 'DEO' && (
            <Dropdown
              minWidth={140}
              value={selectedDistrictId}
              onChange={(v) => setSelectedDistrictId(v)}
              options={districts.map(d => ({ value: d.id, label: d.name }))}
            />
          )}

          {/* Educational District Filter */}
          {(reportLevel === 'EDUCATIONAL' || reportLevel === 'SUBJECT' || reportLevel === 'SCHOOL') && (
            <Dropdown
              minWidth={140}
              value={selectedEduId}
              disabled={user?.role === 'DEO'}
              onChange={(v) => setSelectedEduId(v)}
              placeholder="All Educational Districts"
              options={eduDistricts
                .filter(e => user?.role === 'DEO' || !selectedDistrictId || selectedDistrictId === 'ALL' || e.districtId === selectedDistrictId)
                .map(e => ({ value: e.id, label: e.name }))}
            />
          )}

          {/* School Filter */}
          {(reportLevel === 'SCHOOL' || reportLevel === 'SUBJECT') && user?.role !== 'SCHOOL' && (
            <Dropdown
              minWidth={200}
              value={selectedSchoolId}
              onChange={(v) => setSelectedSchoolId(v)}
              placeholder="All Schools"
              options={availableSchools.map((s: any) => ({ value: s.id || s._id, label: `${s.name} (${s.code || s.schoolCode})` }))}
            />
          )}
        </div>

        {/* Main Content Viewer (Scrollable area containing A4 Preview Sheet) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex justify-center force-light-theme">
          
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold uppercase tracking-widest">Compiling Analytical Records...</p>
            </div>
          ) : (
            
            /* A4 Sheet Container (Standardized 210mm Printable Box) */
            <div 
              ref={reportRef}
              id="a4-printable-report"
              spellCheck={false}
              className="w-full max-w-[210mm] bg-white text-slate-900 p-8 sm:p-10 font-sans flex flex-col justify-between min-h-[297mm] force-light-theme"
              style={{ colorScheme: 'light' }}
            >
              <div>
                
                {/* 1. Header (Left logo, Project Name, Exam Info) */}
                <div className="border-b-2 border-slate-900 pb-5 mb-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={logoBase64 || logoUrl} 
                      alt="Project Logo" 
                      className="w-14 h-14 object-contain"
                    />
                    <div>
                      <h1 className="text-base font-black text-slate-950 tracking-tight uppercase leading-tight">
                        VIJAYASREE ANALYTICS PORTAL
                      </h1>
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mt-0.5">
                        {getReportTitle()}
                      </p>
                      <p className="text-[9px] font-medium text-slate-500 mt-1">
                        Exam: <strong>{currentExamObj?.name || 'Academic Examination'}</strong>
                        {reportLevel === 'DISTRICT' ? (
                          <> | Scope: <strong>Consolidated State-level</strong></>
                        ) : (
                          <> | District: <strong>{currentDistObj?.name || 'Palakkad'}</strong></>
                        )}
                        {(reportLevel === 'EDUCATIONAL' || reportLevel === 'SCHOOL' || reportLevel === 'SUBJECT') && selectedEduId !== 'ALL' && currentEduObj && ` | Edu Dist: ${currentEduObj.name}`}
                        {(reportLevel === 'SCHOOL' || (reportLevel === 'SUBJECT' && selectedSchoolId)) && selectedSchoolId && currentSchoolObj && ` | School: ${currentSchoolObj.name} (${currentSchoolObj.code || currentSchoolObj.schoolCode})`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[9px] font-bold text-slate-400 font-mono">
                      Generated: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>

                {/* 2. Executive Summary Metrics Cards */}
                <div className="grid grid-cols-7 gap-3 mb-8">
                  <div className="bg-slate-50 p-3 border border-slate-200 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Total Students</span>
                    <span className="text-xl font-black text-slate-900 mt-1 block font-mono">{aggStats.totalStudents}</span>
                  </div>
                  <div className="bg-sky-50 p-3 border border-sky-200 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-sky-600 block">Total Appeared</span>
                    <span className="text-xl font-black text-sky-800 mt-1 block font-mono">{aggStats.appeared}</span>
                  </div>
                  <div className="bg-emerald-50 p-3 border border-emerald-200 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-700 block">Passed</span>
                    <span className="text-xl font-black text-emerald-800 mt-1 block font-mono">{aggStats.passed}</span>
                  </div>
                  <div className="bg-blue-50 p-3 border border-blue-200 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-blue-700 block">Pass %</span>
                    <span className="text-xl font-black text-blue-800 mt-1 block font-mono">{aggStats.passPct}%</span>
                  </div>
                  <div className="bg-red-50 p-3 border border-red-200 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-red-600 block">Failed</span>
                    <span className="text-xl font-black text-red-700 mt-1 block font-mono">{aggStats.failed}</span>
                  </div>
                  <div className="bg-rose-50 p-3 border border-rose-200 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 block">Fail %</span>
                    <span className="text-xl font-black text-rose-700 mt-1 block font-mono">{aggStats.failPct}%</span>
                  </div>
                  <div className="bg-amber-50 p-3 border border-amber-200 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-700 block">Full A+ Count</span>
                    <span className="text-xl font-black text-amber-800 mt-1 block font-mono">{aggStats.fullAPlus}</span>
                  </div>
                </div>

                {/* 3. Level-Specific Detailed Data Tables */}

                {/* LEVEL 1 & 2: DISTRICT & EDUCATIONAL DISTRICT TABLE */}
                {(reportLevel === 'DISTRICT' || reportLevel === 'EDUCATIONAL') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span className="text-blue-600 font-bold">🏛️</span>
                        Institutional Performance Directory ({reportData?.rows?.length || 0} Entities)
                      </h3>
                    </div>
                    <table className="w-full text-left border-collapse text-xs border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300">
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest w-10 text-center">#</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest">Institution / Sub-District</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Appeared</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Passed</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Full A+</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Pass %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {reportData?.rows?.map((row: any, idx: number) => (
                          <tr key={row.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="p-2.5 border border-slate-300 text-[10px] font-bold text-slate-400 text-center font-mono">{idx + 1}</td>
                            <td className="p-2.5 border border-slate-300 font-bold text-slate-900">
                              {row.name}
                              {row.code && <span className="text-[9px] text-slate-400 font-mono ml-2">({row.code})</span>}
                            </td>
                            <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-slate-700">{row.studentsAppeared}</td>
                            <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-emerald-700">{row.pass}</td>
                            <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-amber-700">{row.fullAPlus}</td>
                            <td className="p-2.5 border border-slate-300 text-right font-mono font-black text-blue-700">{Number(row.victoryPercentage || 0).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* LEVEL 3: SCHOOL LEVEL DETAILED EVALUATION */}
                {reportLevel === 'SCHOOL' && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-black text-slate-900 uppercase">{reportData?.school?.name || currentSchoolObj?.name || 'School Report'}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">UDISE Code: {reportData?.school?.code || currentSchoolObj?.code || '-'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-blue-700 uppercase bg-blue-100 px-2.5 py-1 rounded-full">
                          Grade Performance Score: {reportData?.stats?.performanceScore || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Grade Count Summary */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Overall Grade Cumulative Summary</h4>
                      <div className="grid grid-cols-9 gap-2 text-center text-xs font-mono">
                        {['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E'].map(g => (
                          <div key={g} className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                            <span className="text-[9px] font-black text-slate-500 block">{g}</span>
                            <span className="font-bold text-slate-900 mt-1 block">{reportData?.stats?.gradeCounts?.[g] || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Student Result List snippet */}
                    {(() => {
                      const studentsList = reportData?.students || [];
                      const uniqueSubjectCodes = Array.from(new Set(
                        studentsList.flatMap((st: any) => Object.keys(st.grades || {}))
                      )).sort() as string[];

                      const sortedStudents = [...studentsList].sort((a: any, b: any) => {
                        const divA = a.division || 'Z';
                        const divB = b.division || 'Z';
                        if (divA < divB) return -1;
                        if (divA > divB) return 1;

                        const genderA = (a.gender || '').toLowerCase();
                        const genderB = (b.gender || '').toLowerCase();
                        if (genderA === 'female' && genderB !== 'female') return -1;
                        if (genderA !== 'female' && genderB === 'female') return 1;

                        const regA = a.regNo || '';
                        const regB = b.regNo || '';
                        if (regA > regB) return -1;
                        if (regA < regB) return 1;
                        
                        return 0;
                      });

                      return (
                      <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Enrolled Student Results ({reportData?.students?.length || 0} Students)</h4>
                      <table className="w-full text-left border-collapse text-[11px] border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300">
                            <th className="p-2 border border-slate-300 text-[9px] font-black text-slate-600 uppercase text-center w-8">#</th>
                            <th className="p-2 border border-slate-300 text-[9px] font-black text-slate-600 uppercase">Reg No / Student Name</th>
                            <th className="p-2 border border-slate-300 text-[9px] font-black text-slate-600 uppercase text-center">Gender</th>
                            <th className="p-2 border border-slate-300 text-[9px] font-black text-slate-600 uppercase text-center">Div</th>
                            {uniqueSubjectCodes.map(code => (
                              <th key={code} className="p-2 border border-slate-300 text-[9px] font-black text-slate-600 uppercase text-center">{code}</th>
                            ))}
                            <th className="p-2 border border-slate-300 text-[9px] font-black text-slate-600 uppercase text-right">Result Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {sortedStudents.slice(0, 15).map((st: any, idx: number) => {
                            const studentGrades = Object.values(st.grades || {}) as string[];
                            const status = getStudentResult(studentGrades);
                            return (
                              <tr key={st.studentId || idx}>
                                <td className="p-2 border border-slate-300 text-center font-mono text-slate-400">{idx + 1}</td>
                                <td className="p-2 border border-slate-300">
                                  <span className="font-bold text-slate-900 block">{st.name}</span>
                                  <span className="text-[9px] font-mono text-slate-400">{st.regNo}</span>
                                </td>
                                <td className="p-2 border border-slate-300 text-center uppercase font-bold text-slate-600">{st.gender || '-'}</td>
                                <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-700">{st.division || '-'}</td>
                                {uniqueSubjectCodes.map(code => (
                                  <td key={code} className="p-2 border border-slate-300 text-center font-bold text-slate-800">
                                    {st.grades?.[code as string] || '-'}
                                  </td>
                                ))}
                                <td className="p-2 border border-slate-300 text-right">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                    status === 'PASS' 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : status === 'FAIL' 
                                      ? 'bg-rose-100 text-rose-800' 
                                      : status === 'ABSENT' 
                                      ? 'bg-slate-100 text-slate-800' 
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {status === 'PASS' ? 'Passed' : status === 'FAIL' ? 'Failed' : status === 'ABSENT' ? 'Absent' : 'Incomplete'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {studentsList.length > 15 && (
                        <p className="text-[9px] text-slate-400 italic text-center mt-2">... and {studentsList.length - 15} additional student records included in master ledger.</p>
                      )}
                    </div>
                    );
                  })()}
                  </div>
                )}

                {/* LEVEL 4: SUBJECT-WISE DEEP ANALYSIS (MEDIUM-WISE 4 TABLES WITH SUMMARY CARDS) */}
                {reportLevel === 'SUBJECT' && reportData?.mediumTables && (
                  <div className="space-y-8">
                    {reportData.mediumTables.map((medTable: any) => (
                      <div key={medTable.code} className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <span className="text-blue-600 font-bold">📚</span>
                            {medTable.title} - Subject-Wise Pass & Grade Distribution Table
                          </h3>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {medTable.subjects.length} Subjects
                          </span>
                        </div>

                        {/* Single-Row Summary Card Bar */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center divide-x divide-slate-200">
                            <div className="px-2">
                              <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Total Students</div>
                              <div className="text-xs font-black text-slate-900 mt-0.5">{(medTable.summary.totalStudents || 0).toLocaleString()}</div>
                            </div>
                            <div className="px-2">
                              <div className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">Appeared</div>
                              <div className="text-xs font-black text-blue-700 mt-0.5">{(medTable.summary.appeared || 0).toLocaleString()}</div>
                            </div>
                            <div className="px-2">
                              <div className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider">Passed</div>
                              <div className="text-xs font-black text-emerald-700 mt-0.5">{(medTable.summary.passed || 0).toLocaleString()}</div>
                            </div>
                            <div className="px-2">
                              <div className="text-[9px] font-extrabold text-rose-600 uppercase tracking-wider">Failed</div>
                              <div className="text-xs font-black text-rose-700 mt-0.5">{(medTable.summary.failed || 0).toLocaleString()}</div>
                            </div>
                            <div className="px-2">
                              <div className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wider">Absent</div>
                              <div className="text-xs font-black text-amber-700 mt-0.5">{(medTable.summary.absents || 0).toLocaleString()}</div>
                            </div>
                            <div className="px-2">
                              <div className="text-[9px] font-extrabold text-purple-600 uppercase tracking-wider">Full A+</div>
                              <div className="text-xs font-black text-purple-700 mt-0.5">{(medTable.summary.fullAPlus || 0).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>

                        {/* Medium Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest w-8 text-center">#</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest">Subject Name</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Total</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Appeared</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-red-600 uppercase tracking-widest text-center">Absent</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-center">Passed</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-purple-600 uppercase tracking-widest text-center">A+</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-indigo-600 uppercase tracking-widest text-center">A</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-blue-600 uppercase tracking-widest text-center">B+</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-cyan-600 uppercase tracking-widest text-center">B</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-teal-600 uppercase tracking-widest text-center">C+</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-center">C</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-amber-600 uppercase tracking-widest text-center">D+</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-orange-600 uppercase tracking-widest text-center">D</th>
                                <th className="p-2 border border-slate-300 text-[9px] font-black text-rose-600 uppercase tracking-widest text-center">E</th>
                                <th className="p-2 border border-slate-300 text-right font-mono font-black text-blue-700">Pass %</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                              {medTable.subjects?.map((sub: any, idx: number) => (
                                <tr key={sub.subjectId || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                  <td className="p-2 border border-slate-300 text-[10px] font-bold text-slate-400 text-center font-mono">{idx + 1}</td>
                                  <td className="p-2 border border-slate-300 font-bold text-slate-900">{sub.subjectName || sub.name}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-800">{sub.totalStudents || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-700">{sub.appeared || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-red-600">{sub.absents || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-emerald-700">{sub.passed || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-purple-700">{sub.aPlus || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-indigo-700">{sub.a || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-blue-700">{sub.bPlus || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-cyan-700">{sub.b || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-teal-700">{sub.cPlus || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-emerald-700">{sub.c || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-amber-700">{sub.dPlus || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-orange-700">{sub.d || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-rose-700">{sub.e || 0}</td>
                                  <td className="p-2 border border-slate-300 text-right font-mono font-black text-blue-700">{Number(sub.passPercentage || 0).toFixed(2)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* 4. Footer (Proper Header/Footer Page Numbers & Confidentiality) */}
              <div className="border-t border-slate-300 pt-4 mt-8 flex items-center justify-between text-[9px] text-slate-500 uppercase font-bold">
                <div>
                  <span>CONFIDENTIAL ACADEMIC EVALUATION SHEET</span>
                  <span className="mx-2">|</span>
                  <span>VIJAYASREE ANALYTICS SYSTEM &copy; 2026</span>
                </div>
                <div className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                  OFFICIAL ACADEMIC EVALUATION REPORT
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </Modal>
  );
};

export default PdfReportGeneratorModal;
