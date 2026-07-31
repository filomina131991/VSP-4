import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Filter, 
  Award, 
  Users, 
  TrendingUp,
  Building,
  School as SchoolIcon,
  BookOpen,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import ExamSelect from '../../components/common/ExamSelect';
import { SearchableSelect, Option } from '../../components/common/SearchableSelect';
import Dropdown from '../../components/common/Dropdown';
import { getStudentResult } from '../../lib/resultClassification';
import { sortSubjects, getSubjectPCode } from '../../lib/subjectUtils';
import toast from 'react-hot-toast';
import logoUrl from '../../assets/logo.png';

export type ReportLevel = 'DISTRICT' | 'EDUCATIONAL' | 'SCHOOL' | 'SUBJECT';

export default function PdfReportPage() {
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const rankedRequestIdRef = useRef(0);

  const [reportLevel, setReportLevel] = useState<ReportLevel>('DISTRICT');
  const [exams, setExams] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [eduDistricts, setEduDistricts] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState(user?.districtId || 'dist-9');
  const [selectedEduId, setSelectedEduId] = useState('ALL');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(user?.role === 'SCHOOL' ? user.schoolId || user.id : '');
  const [schoolType, setSchoolType] = useState('ALL');

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingRanked, setIsLoadingRanked] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [rankedSchools, setRankedSchools] = useState<any[]>([]);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [eduSearchQuery, setEduSearchQuery] = useState('');
  const [eduSortField, setEduSortField] = useState<'name' | 'studentsAppeared' | 'pass' | 'victoryPercentage'>('victoryPercentage');
  const [eduSortDir, setEduSortDir] = useState<'asc' | 'desc'>('desc');
  const [eduPage, setEduPage] = useState(1);
  const EDU_PAGE_SIZE = 20;

  const availableSchools = React.useMemo(() => {
    let filtered = schools;
    if (user?.role === 'DEO') {
      const deoDistrictId = user.districtId || 'dist-9';
      const validEduIds = eduDistricts.filter(e => e.districtId === deoDistrictId).map(e => e.id);
      filtered = filtered.filter((s: any) => s.districtId === deoDistrictId || validEduIds.includes(s.subDistrictId) || validEduIds.includes(s.eduId));
    } else if (selectedDistrictId && selectedDistrictId !== 'ALL') {
      const validEduIds = eduDistricts.filter(e => e.districtId === selectedDistrictId).map(e => e.id);
      filtered = filtered.filter((s: any) => s.districtId === selectedDistrictId || validEduIds.includes(s.subDistrictId) || validEduIds.includes(s.eduId));
    }
    
    if (selectedEduId && selectedEduId !== 'ALL') {
      filtered = filtered.filter((s: any) => s.subDistrictId === selectedEduId || s.eduId === selectedEduId);
    }
    return filtered;
  }, [user, schools, selectedDistrictId, selectedEduId, eduDistricts]);

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

  // Load Metadata Dropdowns
  useEffect(() => {
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
  }, []);

  // Set DEO default district
  useEffect(() => {
    if (user?.role === 'DEO') {
      const deoDistrict = user.districtId || 'dist-9';
      setSelectedDistrictId(deoDistrict);
    }
  }, [user]);

  // Sync selected school for DEO/ADMIN (any role except SCHOOL)
  useEffect(() => {
    if (user?.role !== 'SCHOOL' && availableSchools.length > 0) {
      if (reportLevel === 'SUBJECT') {
        if (!selectedSchoolId || (selectedSchoolId !== 'ALL' && !availableSchools.some(s => (s.id || s._id) === selectedSchoolId))) {
          setSelectedSchoolId('ALL');
        }
      } else {
        if (!selectedSchoolId || !availableSchools.some(s => (s.id || s._id) === selectedSchoolId)) {
          setSelectedSchoolId(availableSchools[0].id || availableSchools[0]._id);
        }
      }
    }
  }, [user, availableSchools, selectedSchoolId, reportLevel]);

  // Fetch Report Analytics based on Level
  const fetchReportAnalytics = async () => {
    if (!selectedExamId) return;
    setIsLoadingData(true);
    setRankedSchools([]);
    setEduPage(1);
    const reqId = ++rankedRequestIdRef.current;
    try {
      const isDeo = user?.role === 'DEO';
      const targetDeoDistrict = user?.districtId || 'dist-9';

      // 1. Fetch main report dataset
      if (reportLevel === 'DISTRICT') {
        if (isDeo) {
          const res = await apiClient.get(`/results/district/${targetDeoDistrict}?schoolType=${schoolType}&examId=${selectedExamId}`);
          setReportData({ type: 'DISTRICT', rows: res.data || [] });
        } else {
          const res = await apiClient.get(`/results/state?schoolType=${schoolType}&examId=${selectedExamId}`);
          setReportData({ type: 'DISTRICT', rows: res.data || [] });
        }
      } else if (reportLevel === 'EDUCATIONAL') {
        const distId = isDeo ? targetDeoDistrict : (selectedDistrictId || 'ALL');
        const res = await apiClient.get(`/results/district/${distId}?schoolType=${schoolType}&examId=${selectedExamId}`);
        let rows = res.data || [];
        
        if (selectedEduId && selectedEduId !== 'ALL') {
          rows = rows.filter((r: any) => r.id === selectedEduId);
        }
        
        setReportData({ type: 'EDUCATIONAL', rows });
      } else if (reportLevel === 'SCHOOL') {
        const targetSchool = (selectedSchoolId && selectedSchoolId !== 'ALL') ? selectedSchoolId : (isDeo ? availableSchools[0]?.id : (user?.role === 'SCHOOL' ? user.schoolId || user.id : schools[0]?.id || 'sch-1'));
        if (targetSchool) {
          const res = await apiClient.get(`/reports/detailed-school/${targetSchool}/${selectedExamId}`);
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
        }
      } else if (reportLevel === 'SUBJECT') {
        const params = new URLSearchParams({
          examId: selectedExamId,
          districtId: selectedDistrictId || user?.districtId || 'dist-9',
          schoolType
        });
        const targetEdu = selectedEduId;
        if (targetEdu && targetEdu !== 'ALL') params.append('eduId', targetEdu);
        
        const targetSchoolForSubject = (selectedSchoolId && selectedSchoolId !== 'ALL') ? selectedSchoolId : (user?.role === 'SCHOOL' ? user.schoolId || user.id : null);
        if (targetSchoolForSubject) params.append('schoolId', targetSchoolForSubject);

        const res = await apiClient.get(`/results/subject-analysis?${params.toString()}`);
        const rawSubjectData = res.data?.data || [];
        const mediumTables = buildMediumSubjectTables(rawSubjectData);

        const overallSummary: any = mediumTables.find(m => m.code === 'OVERALL')?.summary || {};

        setReportData({
          type: 'SUBJECT',
          mediumTables,
          summary: {
            totalStudents: overallSummary.totalStudents || 0,
            totalPassed: overallSummary.passed || 0,
            totalPass: overallSummary.passed || 0,
            totalFullAPlus: overallSummary.fullAPlus || 0,
            overallPassPercentage: overallSummary.passPercentage || 0
          }
        });
      }

      // Phase 2: Ranked schools
      if (reportLevel === 'DISTRICT' || reportLevel === 'EDUCATIONAL') {
        let fetchLevel = '';
        let targetId = '';
        
        if (reportLevel === 'DISTRICT') {
          fetchLevel = 'district-schools';
          targetId = (selectedDistrictId && selectedDistrictId !== 'ALL') ? selectedDistrictId : (user?.districtId || 'ALL');
        } else if (reportLevel === 'EDUCATIONAL') {
          if (selectedEduId && selectedEduId !== 'ALL') {
            fetchLevel = 'educational';
            targetId = selectedEduId;
          } else {
            fetchLevel = 'district-schools';
            targetId = (selectedDistrictId && selectedDistrictId !== 'ALL') ? selectedDistrictId : 'ALL';
          }
        }
        
        if (fetchLevel && targetId) {
          setIsLoadingRanked(true);
          try {
            const resRanked = await apiClient.get(`/results/${fetchLevel}/${targetId}?schoolType=${schoolType}&examId=${selectedExamId}`);
            if (reqId === rankedRequestIdRef.current) setRankedSchools(resRanked.data || []);
          } catch (e) {
            console.error("Ranked schools fetch error:", e);
          } finally {
            if (reqId === rankedRequestIdRef.current) setIsLoadingRanked(false);
          }
        }
      }
      setIsLoadingData(false);
    } catch (err) {
      console.error("Fetch Analytics Error:", err);
      toast.error("Failed to load analytics report data");
      setIsLoadingData(false);
    }
  };

useEffect(() => {
    fetchReportAnalytics();
  }, [reportLevel, selectedExamId, selectedDistrictId, selectedEduId, selectedSchoolId, schoolType]);

  // PDF Export — Vector text, A4 portrait, auto pagination
  const sanitizeSchoolName = (name: string) => {
    if (!name) return '';
    return name.replace(/\b(HS|HSS|GHSS|GHS|AHS|AHSS|THSS|VHS|VHSS)\b/gi, '').replace(/\s+/g, ' ').trim();
  };

  const PCODE_CANONICAL_TITLES: Record<string, string> = {
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

  const buildMediumSubjectTables = (rawDataList: any[]) => {
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
      let pCode = getSubjectPCode(sub);
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
      const canonicalTitle = PCODE_CANONICAL_TITLES[pCode] || (pCode ? `${pCode} - ${rowItem.subjectName}` : rowItem.subjectName);

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

  const handleDownloadPdf = async () => {
    if (!reportData) {
      toast.error('No report data to export');
      return;
    }
    setIsGeneratingPdf(true);
    const pdfToast = toast.loading('Generating vector PDF...');

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const PW = 210, PH = 297;
      const ML = 15, MR = 15, MT = 22, MB = 18;
      const CW = PW - ML - MR;
      let y = MT;
      let pageNum = 1;
      const totalPagesMarker = { current: 1 };

      const font = {
        title: () => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(15, 23, 42); },
        subtitle: () => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(71, 85, 105); },
        sectionHead: () => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(15, 23, 42); },
        body: () => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(51, 65, 85); },
        bodyBold: () => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(15, 23, 42); },
        small: () => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(100, 116, 139); },
        metricVal: () => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(15, 23, 42); },
        metricLabel: () => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(100, 116, 139); },
        cellHeader: () => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(255, 255, 255); },
        cellBody: () => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(30, 41, 59); },
        cellBodyBold: () => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(15, 23, 42); },
        cellAccent: () => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(5, 150, 105); },
        cellDanger: () => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(220, 38, 38); },
        cellMuted: () => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139); },
      };

      const addHeader = () => {
        font.title();
        pdf.text('MUNNOTT - VIJAYASREE ANALYTICS', ML, y);
        font.subtitle();
        const reportLabel = getReportTitle();
        const examLabel = currentExamObj?.name || 'N/A';
        const distLabel = reportLevel === 'DISTRICT' ? 'Consolidated State Scope' : (currentDistObj?.name || 'Palakkad');
        pdf.text(`Report: ${reportLabel}`, ML, y + 5);
        pdf.text(`Exam: ${examLabel}  |  District: ${distLabel}${(reportLevel !== 'DISTRICT' && currentEduObj) ? `  |  Edu: ${currentEduObj.name}` : ''}${(reportLevel === 'SCHOOL' && currentSchoolObj) ? `  |  School: ${currentSchoolObj.name}` : ''}`, ML, y + 9.5);
        pdf.text(`Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`, PW - MR, y + 9.5, { align: 'right' });
        y += 13;
        pdf.setDrawColor(30, 41, 59);
        pdf.setLineWidth(0.4);
        pdf.line(ML, y, PW - MR, y);
        y += 4;
      };

      const addFooter = (pg: number) => {
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.2);
        pdf.line(ML, PH - MB + 4, PW - MR, PH - MB + 4);
        font.small();
        pdf.text('CONFIDENTIAL ACADEMIC EVALUATION SHEET  |  MUNNOTT - VIJAYASREE ANALYTICS SYSTEM © 2026', ML, PH - MB + 8);
        pdf.text(`Page ${pg} of ${totalPagesMarker.current}`, PW - MR, PH - MB + 8, { align: 'right' });
      };

      const checkPage = (needed: number) => {
        if (y + needed > PH - MB) {
          addFooter(pageNum);
          pdf.addPage();
          pageNum++;
          y = MT;
          addHeader();
          return true;
        }
        return false;
      };

      const drawMetricCard = (label: string, value: string, x: number, w: number) => {
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x, y, w, 16, 1, 1, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.roundedRect(x, y, w, 16, 1, 1, 'S');
        font.metricLabel();
        pdf.text(label, x + w / 2, y + 5, { align: 'center' });
        font.metricVal();
        pdf.text(value, x + w / 2, y + 12, { align: 'center' });
      };

      const tableBaseStyle = {
        fontSize: 7 as const,
        cellPadding: 2.2,
        lineColor: [226, 232, 240] as [number, number, number],
        lineWidth: 0.15,
        textColor: [30, 41, 59] as [number, number, number],
        fontStyle: 'normal' as const,
      };

      const headStyles = {
        fillColor: [30, 41, 59] as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold' as const,
        fontSize: 6.5 as const,
        cellPadding: 2,
        halign: 'center' as const,
      };

      const alternateRowStyles = { fillColor: [248, 250, 252] as [number, number, number] };

      const CONT_HEADER_H = 17;

      const drawContinuationHeader = () => {
        font.title();
        pdf.text('MUNNOTT - VIJAYASREE ANALYTICS', ML, MT);
        font.subtitle();
        const reportLabel = getReportTitle();
        const examLabel = currentExamObj?.name || 'N/A';
        pdf.text(`${reportLabel}  |  ${examLabel}  |  (Continued)`, ML, MT + 5);
        pdf.text(`Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`, PW - MR, MT + 5, { align: 'right' });
        pdf.setDrawColor(30, 41, 59);
        pdf.setLineWidth(0.3);
        pdf.line(ML, MT + 10, PW - MR, MT + 10);
      };

      const continuationDidDrawPage = (data: any) => {
        if (data.pageNumber > 1) {
          drawContinuationHeader();
        }
        addFooter(data.pageNumber);
      };

      const commonTableOpts = (head: string[][], body: (string | number)[][], opts: Record<string, any> = {}) => ({
        startY: y,
        head,
        body,
        theme: 'grid' as const,
        styles: { ...tableBaseStyle, ...opts.styles },
        headStyles: { ...headStyles, ...opts.headStyles },
        alternateRowStyles: { ...alternateRowStyles, ...opts.alternateRowStyles },
        margin: { left: ML, right: MR, top: MT + CONT_HEADER_H },
        tableWidth: 'auto' as const,
        didDrawPage: continuationDidDrawPage,
      });

      const finishTable = (_table?: any) => {
        y = (pdf as any).lastAutoTable?.finalY || y + 8;
      };

      const drawSeparator = () => {
        y += 2;
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.line(ML, y, PW - MR, y);
        y += 4;
      };

      // ===== BUILD PDF =====
      addHeader();

      // Executive Summary
      font.sectionHead();
      pdf.text('Executive Summary', ML, y);
      y += 3;
      const statCards = [
        { label: 'TOTAL STUDENTS', value: aggStats.totalStudents.toLocaleString() },
        { label: 'APPEARED', value: aggStats.appeared.toLocaleString() },
        { label: 'PASSED', value: aggStats.passed.toLocaleString() },
        { label: 'PASS %', value: `${aggStats.passPct}%` },
        { label: 'FAILED', value: aggStats.failed.toLocaleString() },
        { label: 'ABSENT', value: aggStats.absent.toLocaleString() },
        { label: 'FULL A+', value: aggStats.fullAPlus.toLocaleString() },
        { label: 'FAIL %', value: `${aggStats.failPct}%` },
      ];
      const cardW = (CW - 14) / 8;
      statCards.forEach((c, i) => drawMetricCard(c.label, c.value, ML + i * (cardW + 2), cardW));
      y += 22;

      // ===== REPORT-SPECIFIC CONTENT =====
      if (reportLevel === 'DISTRICT') {
        const rows = reportData?.rows || [];
        if (rows.length > 0) {
          drawSeparator();
          font.sectionHead();
          pdf.text(`Revenue District Performance Directory (${rows.length} Revenue Districts)`, ML, y);
          y += 4;
          const tableData = rows.map((r: any, i: number) => [
            String(i + 1),
            r.name || '',
            (r.totalStudents ?? r.studentsAppeared ?? 0).toLocaleString(),
            (r.studentsAppeared ?? 0).toLocaleString(),
            (r.pass ?? 0).toLocaleString(),
            Math.max(0, (r.studentsAppeared || 0) - (r.pass || 0) - (r.absent || 0)).toLocaleString(),
            (r.absent ?? 0).toLocaleString(),
            (r.aPlus ?? r.fullAPlus ?? 0).toLocaleString(),
            (r.a ?? 0).toLocaleString(),
            (r.bPlus ?? 0).toLocaleString(),
            (r.b ?? 0).toLocaleString(),
            (r.cPlus ?? 0).toLocaleString(),
            (r.c ?? 0).toLocaleString(),
            (r.dPlus ?? 0).toLocaleString(),
            (r.d ?? 0).toLocaleString(),
            (r.e ?? 0).toLocaleString(),
            `${Number(r.victoryPercentage ?? 0).toFixed(2)}%`,
          ]);
          const table = autoTable(pdf, {
            ...commonTableOpts(
              [['#', 'Revenue District', 'Total', 'Appeared', 'Passed', 'Failed', 'Absent', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'Pass %']],
              tableData
            ),
            styles: {
              ...tableBaseStyle,
              fontSize: 6,
              cellPadding: 1,
              overflow: 'linebreak',
            },
            headStyles: {
              ...headStyles,
              fontSize: 6,
              cellPadding: 1.2,
              halign: 'center',
            },
            columnStyles: {
              0: { halign: 'center', cellWidth: 8 },
              1: { halign: 'left', cellWidth: 28 },
              2: { halign: 'center', cellWidth: 11 },
              3: { halign: 'center', cellWidth: 11 },
              4: { halign: 'center', cellWidth: 11, textColor: [5, 150, 105] },
              5: { halign: 'center', cellWidth: 10, textColor: [220, 38, 38] },
              6: { halign: 'center', cellWidth: 10 },
              7: { halign: 'center', cellWidth: 7.5, textColor: [147, 51, 234] },
              8: { halign: 'center', cellWidth: 7.5, textColor: [79, 70, 229] },
              9: { halign: 'center', cellWidth: 7.5, textColor: [37, 99, 235] },
              10: { halign: 'center', cellWidth: 7.5, textColor: [8, 145, 178] },
              11: { halign: 'center', cellWidth: 7.5, textColor: [13, 148, 136] },
              12: { halign: 'center', cellWidth: 7.5, textColor: [5, 150, 105] },
              13: { halign: 'center', cellWidth: 7.5, textColor: [217, 119, 6] },
              14: { halign: 'center', cellWidth: 7.5, textColor: [234, 88, 12] },
              15: { halign: 'center', cellWidth: 7.5, textColor: [225, 29, 72] },
              16: { halign: 'right', cellWidth: 14, textColor: [37, 99, 235] },
            },
          });
          finishTable(table);
        }
      } else if (reportLevel === 'EDUCATIONAL') {
        const rows = [...(reportData?.rows || [])].sort((a: any, b: any) => (b.victoryPercentage || 0) - (a.victoryPercentage || 0));
        if (rows.length > 0) {
          drawSeparator();
          font.sectionHead();
          pdf.text(`Educational District Directory (${rows.length} Sub-Districts)`, ML, y);
          y += 4;
          const tableData = rows.map((r: any, i: number) => [
            String(i + 1),
            r.districtName || r.revenueDivisionName || '',
            r.name || '',
            (r.totalStudents ?? r.studentsAppeared ?? 0).toLocaleString(),
            (r.studentsAppeared ?? 0).toLocaleString(),
            (r.pass ?? 0).toLocaleString(),
            Math.max(0, (r.studentsAppeared || 0) - (r.pass || 0) - (r.absent || 0)).toLocaleString(),
            (r.absent ?? 0).toLocaleString(),
            (r.aPlus ?? r.fullAPlus ?? 0).toLocaleString(),
            (r.a ?? 0).toLocaleString(),
            (r.bPlus ?? 0).toLocaleString(),
            (r.b ?? 0).toLocaleString(),
            (r.cPlus ?? 0).toLocaleString(),
            (r.c ?? 0).toLocaleString(),
            (r.dPlus ?? 0).toLocaleString(),
            (r.d ?? 0).toLocaleString(),
            (r.e ?? 0).toLocaleString(),
            `${Number(r.victoryPercentage ?? 0).toFixed(2)}%`,
          ]);
          const table = autoTable(pdf, {
            ...commonTableOpts(
              [['#', 'Revenue District', 'Sub-District', 'Total', 'Appeared', 'Passed', 'Failed', 'Absent', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'Pass %']],
              tableData
            ),
            styles: {
              ...tableBaseStyle,
              fontSize: 6,
              cellPadding: 1,
              overflow: 'linebreak',
            },
            headStyles: {
              ...headStyles,
              fontSize: 6,
              cellPadding: 1.2,
              halign: 'center',
            },
            columnStyles: {
              0: { halign: 'center', cellWidth: 8 },
              1: { halign: 'left', cellWidth: 22 },
              2: { halign: 'left', cellWidth: 23 },
              3: { halign: 'center', cellWidth: 10 },
              4: { halign: 'center', cellWidth: 10 },
              5: { halign: 'center', cellWidth: 10, textColor: [5, 150, 105] },
              6: { halign: 'center', cellWidth: 9, textColor: [220, 38, 38] },
              7: { halign: 'center', cellWidth: 9 },
              8: { halign: 'center', cellWidth: 7, textColor: [147, 51, 234] },
              9: { halign: 'center', cellWidth: 7, textColor: [79, 70, 229] },
              10: { halign: 'center', cellWidth: 7, textColor: [37, 99, 235] },
              11: { halign: 'center', cellWidth: 7, textColor: [8, 145, 178] },
              12: { halign: 'center', cellWidth: 7, textColor: [13, 148, 136] },
              13: { halign: 'center', cellWidth: 7, textColor: [5, 150, 105] },
              14: { halign: 'center', cellWidth: 7, textColor: [217, 119, 6] },
              15: { halign: 'center', cellWidth: 7, textColor: [234, 88, 12] },
              16: { halign: 'center', cellWidth: 7, textColor: [225, 29, 72] },
              17: { halign: 'right', cellWidth: 13, textColor: [37, 99, 235] },
            },
          });
          finishTable(table);
        }
      } else if (reportLevel === 'SCHOOL') {
        const students = reportData?.students || [];
        const stats = reportData?.stats || {};
        const schoolInfo = reportData?.school || currentSchoolObj;

        if (schoolInfo) {
          drawSeparator();
          font.sectionHead();
          pdf.text(`${schoolInfo.name || 'School Report'}  —  UDISE: ${schoolInfo.code || '-'}`, ML, y);
          font.subtitle();
          pdf.text(`Performance Score: ${stats.performanceScore || 'N/A'}  |  Pass: ${Number(stats.passPercentage || 0).toFixed(2)}%  |  Full A+: ${stats.fullAPlusStudents || 0}`, ML, y + 5);
          y += 12;
        }

        const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E'];
        const gradeValues = grades.map(g => String((stats.gradeCounts as any)?.[g] || 0));
        
        font.sectionHead();
        pdf.text('Grade Distribution Summary', ML, y);
        y += 4;
        const gTable = autoTable(pdf, {
          startY: y,
          head: [grades],
          body: [gradeValues],
          theme: 'grid' as const,
          styles: { ...tableBaseStyle, fontSize: 8, halign: 'center', cellPadding: 2 },
          headStyles: { ...headStyles, halign: 'center' },
          margin: { left: ML, right: MR, top: MT + CONT_HEADER_H },
          didDrawPage: continuationDidDrawPage,
        });
        finishTable(gTable);
        y += 2;

        if (students.length > 0) {
          checkPage(30);
          font.sectionHead();
          pdf.text(`Enrolled Student Results (${students.length} Students)`, ML, y);
          y += 4;
          const uniqueSubjects = Array.from(new Set(students.flatMap((st: any) => Object.keys(st.grades || {})))).sort((a: any, b: any) => sortSubjects({ name: a, code: a, shortName: a }, { name: b, code: b, shortName: b })) as string[];
          
          const sortedStudents = [...students].sort((a: any, b: any) => {
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

          const studentHead = ['#', 'Reg No / Student Name', 'Gender', 'Div', ...uniqueSubjects, 'Result Status'];

          const studentRows = sortedStudents.map((st: any, i: number) => {
            const gradesVals = Object.values(st.grades || {}) as string[];
            const status = getStudentResult(gradesVals);
            const row = [
              String(i + 1),
              st.regNo ? `${st.regNo} - ${st.name || ''}` : `${st.name || ''}`,
              st.gender || '-',
              st.division || '-'
            ];
            uniqueSubjects.forEach(code => {
              row.push(st.grades?.[code] || '-');
            });
            row.push(status);
            return row;
          });

          const sColStyles: Record<number, any> = {
            0: { halign: 'center', cellWidth: 6 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 8 },
            3: { halign: 'center', cellWidth: 6 },
          };
          uniqueSubjects.forEach((_, idx) => {
            sColStyles[4 + idx] = { halign: 'center', cellWidth: 7 };
          });
          sColStyles[4 + uniqueSubjects.length] = { halign: 'center', cellWidth: 14 };

          const sTable = autoTable(pdf, {
            startY: y,
            head: [studentHead],
            body: studentRows,
            theme: 'grid' as const,
            styles: { ...tableBaseStyle, fontSize: 5.5, cellPadding: 1.2, overflow: 'linebreak' },
            headStyles: { ...headStyles, fontSize: 5.5, halign: 'center' },
            margin: { left: ML, right: MR, top: MT + CONT_HEADER_H },
            columnStyles: sColStyles,
            didDrawPage: continuationDidDrawPage,
          });
          finishTable(sTable);
        }
      } else if (reportLevel === 'SUBJECT') {
        const mediumTables = reportData?.mediumTables || [];
        mediumTables.forEach((medTable: any, mIdx: number) => {
          if (mIdx > 0 || y > (PH - MB) - 60) {
            pdf.addPage();
            y = MT;
            addHeader();
          }

          font.sectionHead();
          pdf.text(`${medTable.title} - Subject-Wise Pass & Grade Distribution`, ML, y);
          y += 5;

          const sum = medTable.summary || {};
          const summaryData = [
            [
              (sum.totalStudents || 0).toLocaleString(),
              (sum.appeared || 0).toLocaleString(),
              (sum.passed || 0).toLocaleString(),
              (sum.failed || 0).toLocaleString(),
              (sum.absents || 0).toLocaleString(),
              (sum.fullAPlus || 0).toLocaleString(),
              `${Number(sum.passPercentage || 0).toFixed(2)}%`
            ]
          ];

          const sumTable = autoTable(pdf, {
            ...commonTableOpts(
              [['Total Students', 'Appeared', 'Passed', 'Failed', 'Absent', 'Full A+', 'Pass %']],
              summaryData
            ),
            startY: y,
            styles: {
              fontSize: 8,
              fontStyle: 'bold',
              halign: 'center',
              fillColor: [241, 245, 249],
              textColor: [15, 23, 42]
            },
            headStyles: {
              fillColor: [30, 41, 59],
              textColor: [255, 255, 255],
              fontSize: 7.5,
              fontStyle: 'bold',
              halign: 'center'
            },
            columnStyles: {
              1: { textColor: [37, 99, 235] },
              2: { textColor: [5, 150, 105] },
              3: { textColor: [220, 38, 38] },
              4: { textColor: [217, 119, 6] },
              5: { textColor: [124, 58, 237] },
              6: { textColor: [37, 99, 235] }
            }
          });
          finishTable(sumTable);
          y += 3;

          const subjects = medTable.subjects || [];
          if (subjects.length > 0) {
            const tableData = subjects.map((sub: any, i: number) => [
              String(i + 1),
              sub.subjectName || sub.name || '',
              (sub.totalStudents || 0).toLocaleString(),
              (sub.appeared || sub.totalStudents || 0).toLocaleString(),
              (sub.absents || 0).toLocaleString(),
              (sub.passed || sub.passCount || 0).toLocaleString(),
              (sub.aPlus || 0).toLocaleString(),
              (sub.a || 0).toLocaleString(),
              (sub.bPlus || 0).toLocaleString(),
              (sub.b || 0).toLocaleString(),
              (sub.cPlus || 0).toLocaleString(),
              (sub.c || 0).toLocaleString(),
              (sub.dPlus || 0).toLocaleString(),
              (sub.d || 0).toLocaleString(),
              (sub.e || 0).toLocaleString(),
              `${Number(sub.passPercentage || sub.victoryPercentage || 0).toFixed(2)}%`,
            ]);
            const table = autoTable(pdf, {
              ...commonTableOpts(
                [['#', 'Subject', 'Total', 'Appeared', 'Absent', 'Passed', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'Pass %']],
                tableData
              ),
              startY: y,
              styles: {
                ...tableBaseStyle,
                fontSize: 6.5,
                cellPadding: 1.5,
                overflow: 'linebreak',
              },
              columnStyles: {
                0: { halign: 'center', cellWidth: 6 },
                1: { halign: 'left', cellWidth: 'auto' },
                2: { halign: 'center', cellWidth: 9.5 },
                3: { halign: 'center', cellWidth: 9.5 },
                4: { halign: 'center', cellWidth: 8.5, textColor: [220, 38, 38] },
                5: { halign: 'center', cellWidth: 9.5, textColor: [5, 150, 105] },
                6: { halign: 'center', cellWidth: 7.5, textColor: [124, 58, 237] },
                7: { halign: 'center', cellWidth: 7.5 },
                8: { halign: 'center', cellWidth: 7.5 },
                9: { halign: 'center', cellWidth: 7.5 },
                10: { halign: 'center', cellWidth: 7.5 },
                11: { halign: 'center', cellWidth: 7.5 },
                12: { halign: 'center', cellWidth: 7.5, textColor: [217, 119, 6] },
                13: { halign: 'center', cellWidth: 7.5, textColor: [234, 88, 12] },
                14: { halign: 'center', cellWidth: 7.5, textColor: [220, 38, 38] },
                15: { halign: 'right', cellWidth: 13.5, textColor: [37, 99, 235] },
              },
            });
            finishTable(table);
          }
        });
      }

      // Top & Bottom Schools — side by side 50/50
      if ((reportLevel === 'DISTRICT' || reportLevel === 'EDUCATIONAL') && rankedSchools.length > 0) {
        pdf.addPage();
        y = MT;
        addHeader();

        font.sectionHead();
        pdf.text('Top & Low Performing Institutions', ML, y);
        y += 3;

        const halfW = (CW - 4) / 2;
        const leftX = ML;
        const rightX = ML + halfW + 4;
        const startY = y;

        if (topSchools.length > 0) {
          const topData = topSchools.map((s: any, i: number) => [
            String(i + 1), s.name || '',
            `${Number(s.victoryPercentage ?? 0).toFixed(1)}%`,
          ]);
          autoTable(pdf, {
            startY,
            startX: leftX,
            head: [['#', 'School', 'Pass %']],
            body: topData,
            theme: 'grid' as const,
            styles: { ...tableBaseStyle, fontSize: 6.5, cellPadding: 1.8 },
            headStyles: { ...headStyles, fillColor: [5, 150, 105] as [number, number, number] },
            margin: { left: leftX, right: PW - leftX - halfW, top: MT + CONT_HEADER_H },
            tableWidth: halfW,
            columnStyles: { 0: { halign: 'center', cellWidth: 7 }, 1: { cellWidth: halfW - 22 }, 2: { halign: 'right', textColor: [5, 150, 105] } },
            didDrawPage: continuationDidDrawPage,
          } as any);
        }

        if (lowSchools.length > 0) {
          const lowData = lowSchools.map((s: any, i: number) => [
            String(i + 1), s.name || '',
            `${Number(s.victoryPercentage ?? 0).toFixed(1)}%`,
          ]);
          autoTable(pdf, {
            startY,
            startX: rightX,
            head: [['#', 'School', 'Pass %']],
            body: lowData,
            theme: 'grid' as const,
            styles: { ...tableBaseStyle, fontSize: 6.5, cellPadding: 1.8 },
            headStyles: { ...headStyles, fillColor: [220, 38, 38] as [number, number, number] },
            margin: { left: rightX, right: PW - rightX - halfW, top: MT + CONT_HEADER_H },
            tableWidth: halfW,
            columnStyles: { 0: { halign: 'center', cellWidth: 7 }, 1: { cellWidth: halfW - 22 }, 2: { halign: 'right', textColor: [220, 38, 38] } },
            didDrawPage: continuationDidDrawPage,
          } as any);
        }

        y = (pdf as any).lastAutoTable?.finalY || startY + 40;
        y += 4;

        // Full School List (grouped by sub-district for EDUCATIONAL level)
        checkPage(40);
        drawSeparator();
        font.sectionHead();
        const enrichedSchools = rankedSchools.map((s: any) => {
          const schoolObj = schools.find((sc: any) => (sc.id || sc._id) === s.id);
          const eduId = s.subDistrictId || s.eduId || schoolObj?.subDistrictId || schoolObj?.eduId || '';
          const eduName = eduDistricts.find((e: any) => e.id === eduId)?.name || '';
          return { ...s, eduName };
        });
        if (reportLevel === 'EDUCATIONAL') {
          enrichedSchools.sort((a: any, b: any) => {
            const ea = (a.eduName || 'zzz').localeCompare(b.eduName || 'zzz');
            if (ea !== 0) return ea;
            return (a.name || '').localeCompare(b.name || '');
          });
        }
        pdf.text(`Comprehensive Schools Directory (${enrichedSchools.length} Schools)`, ML, y);
        y += 4;
        let schRowIdx = 0;
        const schHeader = [['#', 'School Name', 'Total', 'App', 'Pass', 'Fail', 'Abs', 'Pass%', 'Basic%', 'Avg%', 'Profound%']];
        const schRows: (string | number)[][] = enrichedSchools.map((r: any) => {
          const eduLabel = r.eduName ? `, (${r.eduName})` : '';
          const displayName = r.code ? `${r.code} - ${r.name || ''}` : (r.name || '');
          return [
            String(++schRowIdx),
            `${displayName}${eduLabel}`,
            (r.totalStudents ?? 0).toLocaleString(),
            (r.studentsAppeared ?? 0).toLocaleString(),
            (r.pass ?? 0).toLocaleString(),
            (r.failed ?? 0).toLocaleString(),
            (r.absent ?? 0).toLocaleString(),
            `${Number(r.victoryPercentage ?? 0).toFixed(1)}%`,
            `${Number(r.basicLevelPct ?? 0).toFixed(1)}%`,
            `${Number(r.averageLevelPct ?? 0).toFixed(1)}%`,
            `${Number(r.profoundLevelPct ?? 0).toFixed(1)}%`,
          ];
        });
        const schColStyles: Record<string, any> = {
          0: { halign: 'center', cellWidth: 7 },
          2: { halign: 'right' }, 3: { halign: 'right' },
          4: { halign: 'right', textColor: [5, 150, 105] },
          5: { halign: 'right', textColor: [220, 38, 38] }, 6: { halign: 'right' },
          7: { halign: 'right', textColor: [37, 99, 235] }, 8: { halign: 'right', textColor: [217, 119, 6] },
          9: { halign: 'right', textColor: [99, 102, 241] }, 10: { halign: 'right', textColor: [147, 51, 234] },
        };
        const schTable = autoTable(pdf, {
          ...commonTableOpts(schHeader, schRows),
          styles: { ...tableBaseStyle, fontSize: 5.5, cellPadding: 1.3 },
          columnStyles: schColStyles,
        });
        finishTable(schTable);
      }

      // Finalize: stamp total pages
      totalPagesMarker.current = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPagesMarker.current; i++) {
        pdf.setPage(i);
        addFooter(i);
      }

      // Open in new tab
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

      toast.success('PDF opened in new tab!', { id: pdfToast });
    } catch (err) {
      console.error('PDF Generation Error:', err);
      toast.error('Failed to generate PDF', { id: pdfToast });
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

  // Helper labels for header
  const currentExamObj = exams.find(e => e.id === selectedExamId);
  const currentDistObj = districts.find(d => d.id === selectedDistrictId);
  const currentEduObj = eduDistricts.find(e => e.id === selectedEduId);
  const currentSchoolObj = schools.find(s => s.id === selectedSchoolId);

  // Compute Summary Totals
  const aggStats = React.useMemo(() => {
    if (!reportData) return { totalStudents: 0, appeared: 0, passed: 0, failed: 0, absent: 0, fullAPlus: 0, passPct: '0.00', failPct: '0.00' };
    if (reportLevel === 'SCHOOL') {
      const stats = reportData.stats || {};
      const appeared = stats.totalStudents || 0;
      const passed = stats.passedStudents || 0;
      const failed = appeared - passed;
      return {
        totalStudents: appeared,
        appeared,
        passed,
        failed,
        absent: stats.absentCount || 0,
        fullAPlus: stats.fullAPlusStudents || 0,
        passPct: Number(stats.passPercentage || 0).toFixed(2),
        failPct: appeared > 0 ? ((failed / appeared) * 100).toFixed(2) : '0.00'
      };
    }
    if (reportLevel === 'SUBJECT') {
      const mediumTables = reportData.mediumTables || [];
      const overallMed = mediumTables.find((m: any) => m.code === 'OVERALL') || mediumTables[0];
      if (overallMed && overallMed.summary) {
        const sum = overallMed.summary;
        const total = sum.totalStudents || 0;
        const app = sum.appeared || 0;
        const pass = sum.passed || 0;
        const failed = sum.failed || 0;
        const abs = sum.absents || 0;
        const aPlus = sum.fullAPlus || 0;
        const pct = app > 0 ? ((pass / app) * 100).toFixed(2) : '0.00';
        const fpct = app > 0 ? ((failed / app) * 100).toFixed(2) : '0.00';
        return {
          totalStudents: total,
          appeared: app,
          passed: pass,
          failed: failed,
          absent: abs,
          fullAPlus: aPlus,
          passPct: pct,
          failPct: fpct
        };
      }
    }
    const rows = reportData.rows || reportData.subjects || [];
    let total = 0, app = 0, pass = 0, abs = 0, aPlus = 0;
    rows.forEach((r: any) => {
      total += (r.totalStudents ?? r.studentsAppeared ?? r.appeared ?? 0);
      app += (r.studentsAppeared ?? r.appeared ?? 0);
      pass += (r.pass ?? r.passed ?? r.passCount ?? 0);
      abs += (r.absent ?? 0);
      aPlus += (r.fullAPlus ?? r.aPlusCount ?? 0);
    });
    const failed = app - pass;
    const pct = app > 0 ? ((pass / app) * 100).toFixed(2) : '0.00';
    const fpct = app > 0 ? ((failed / app) * 100).toFixed(2) : '0.00';
    return { totalStudents: total || app, appeared: app, passed: pass, failed, absent: abs, fullAPlus: aPlus, passPct: pct, failPct: fpct };
  }, [reportData, reportLevel]);

  // Top and Low Performing School lists
  const topSchools = React.useMemo(() => rankedSchools.slice(0, 5), [rankedSchools]);
  const lowSchools = React.useMemo(() => {
    const reversed = [...rankedSchools].reverse();
    return reversed.slice(0, 5);
  }, [rankedSchools]);

  // Enrich ranked schools with sub-district name for grouped display
  const rankedSchoolsWithEdu = React.useMemo(() => {
    const eduMap = new Map<string, string>();
    eduDistricts.forEach((e: any) => eduMap.set(e.id, e.name));
    return rankedSchools.map((s: any) => {
      const eduId = s.subDistrictId || s.eduId || '';
      const schoolObj = schools.find((sc: any) => (sc.id || sc._id) === s.id);
      const resolvedEduId = eduId || schoolObj?.subDistrictId || schoolObj?.eduId || '';
      return {
        ...s,
        eduName: eduMap.get(resolvedEduId) || '',
        eduId: resolvedEduId,
      };
    });
  }, [rankedSchools, eduDistricts, schools]);

  const eduGroupedData = React.useMemo(() => {
    const rows = (reportData?.rows || []);
    let filtered = rows;
    if (eduSearchQuery) {
      const q = eduSearchQuery.toLowerCase();
      filtered = rows.filter((r: any) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.districtName || '').toLowerCase().includes(q)
      );
    }
    const sorted = [...filtered].sort((a: any, b: any) => {
      const dir = eduSortDir === 'asc' ? 1 : -1;
      if (eduSortField === 'name') return dir * (a.name || '').localeCompare(b.name || '');
      if (eduSortField === 'studentsAppeared') return dir * ((a.studentsAppeared || 0) - (b.studentsAppeared || 0));
      if (eduSortField === 'pass') return dir * ((a.pass || 0) - (b.pass || 0));
      return dir * ((a.victoryPercentage || 0) - (b.victoryPercentage || 0));
    });
    const totalCount = sorted.length;
    const totalPages = Math.ceil(totalCount / EDU_PAGE_SIZE);
    const pageStart = (eduPage - 1) * EDU_PAGE_SIZE;
    const pagedRows = sorted.slice(pageStart, pageStart + EDU_PAGE_SIZE);
    return { pagedRows, totalCount, totalPages };
  }, [reportData, eduSearchQuery, eduSortField, eduSortDir, eduPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 p-4 sm:p-6 max-w-7xl mx-auto">
      
      {/* Print-Only Style Injection */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #a4-printable-report, #a4-printable-report * { visibility: visible; }
          #a4-printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Simplified Header Card with ONLY 3 essential buttons */}
      {/* Header Card */}
      <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 dark:bg-[#1f6feb] text-white flex items-center justify-center shadow-md shrink-0">
            <FileText size={24} />
          </div>
          <div className="w-full min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase single-line-label w-full">
              Custom Analytics PDF Engine
            </h1>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1.5 w-full leading-relaxed block">
              Generate streamlined, executive academic reports with custom scope & performance metrics.
            </p>
          </div>
        </div>

        {/* Action Buttons: 2 per row on mobile */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchReportAnalytics}
            disabled={isLoadingData}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-[#21262d] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#30363d] px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer active-tap native-touch-target"
            title="Refresh analytics data"
          >
            <RefreshCw size={16} className={isLoadingData ? "animate-spin" : ""} />
            <span className="single-line-label">Refresh</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isLoadingData || isGeneratingPdf}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-[#1f6feb] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-50 cursor-pointer active-tap native-touch-target"
            title="Open report PDF in a new tab"
          >
            <Download size={16} />
            <span className="single-line-label">{isGeneratingPdf ? 'Generating...' : 'Open PDF'}</span>
          </button>
        </div>
      </div>

      {/* Control Parameters Card */}
      <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#30363d] pb-3">
          <span className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Filter size={14} className="text-blue-600 dark:text-blue-400" />
            Report Level & Scope Parameters
          </span>
        </div>

        {/* Level Switcher Grid - Icon centered first, title & desc full width */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'DISTRICT', label: 'Revenue District', icon: Building, desc: 'Revenue Districts (3 Entities)' },
            { id: 'EDUCATIONAL', label: 'Educational District', icon: SchoolIcon, desc: 'Sub-District & School List' },
            { id: 'SCHOOL', label: 'School Evaluation', icon: Users, desc: 'Institutional Evaluation' },
            { id: 'SUBJECT', label: 'Subject Analysis', icon: BookOpen, desc: 'Subject Breakdown' },
          ].map(lvl => {
            const Icon = lvl.icon;
            const isActive = reportLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                onClick={() => {
                  setReportLevel(lvl.id as ReportLevel);
                  if (lvl.id === 'SUBJECT' && user?.role !== 'SCHOOL') {
                    setSelectedSchoolId('ALL');
                  }
                }}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center text-center w-full cursor-pointer active-tap native-touch-target ${
                  isActive 
                    ? 'bg-blue-600 dark:bg-[#1f6feb] text-white border-blue-600 dark:border-[#1f6feb] shadow-md' 
                    : 'bg-white dark:bg-[#161b22] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#30363d] hover:border-blue-300 dark:hover:border-blue-800'
                }`}
              >
                <div className={`p-2.5 rounded-xl mb-2.5 flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20 dark:bg-white/20 text-white' : 'bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-gray-400'}`}>
                  <Icon size={20} />
                </div>
                <div className="w-full">
                  <div className="text-xs font-black leading-tight uppercase tracking-wide w-full single-line-label text-center">{lvl.label}</div>
                  <div className="text-[10px] opacity-80 mt-1 w-full single-row-desc text-center">{lvl.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Exam Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Examination</label>
            <ExamSelect
              exams={exams}
              selectedExamId={selectedExamId}
              onSelect={(id) => setSelectedExamId(id)}
              className="min-w-[160px]"
            />
          </div>

            {/* School Type Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">School Type</label>
            <select
              value={schoolType}
              onChange={e => setSchoolType(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white outline-none cursor-pointer"
            >
              <option value="ALL">All Management Types</option>
              <option value="Government">Government Only</option>
              <option value="Aided">Aided Only</option>
              <option value="Unaided">Unaided Only</option>
            </select>
          </div>

          {/* Revenue District Filter */}
          {(reportLevel === 'EDUCATIONAL' || reportLevel === 'SUBJECT' || reportLevel === 'SCHOOL') && user?.role !== 'DEO' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Revenue District</label>
              <Dropdown
                minWidth={140}
                value={selectedDistrictId}
                onChange={v => {
                  setSelectedDistrictId(v);
                  setSelectedEduId('ALL');
                  setSelectedSchoolId('');
                }}
                options={[
                  { value: 'ALL', label: 'All Revenue Districts' },
                  ...districts.map(d => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>
          )}

          {/* Educational District Filter */}
          {(reportLevel === 'EDUCATIONAL' || reportLevel === 'SUBJECT' || reportLevel === 'SCHOOL') && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Educational District</label>
              <Dropdown
                minWidth={140}
                value={selectedEduId}
                onChange={v => setSelectedEduId(v)}
                options={[
                  { value: 'ALL', label: 'All Educational Districts' },
                  ...eduDistricts
                    .filter(e => {
                      if (user?.role === 'DEO') {
                        return e.districtId === (user.districtId || 'dist-9');
                      }
                      return !selectedDistrictId || selectedDistrictId === 'ALL' || e.districtId === selectedDistrictId;
                    })
                    .map(e => ({ value: e.id, label: e.name })),
                ]}
              />
            </div>
          )}

          {/* Target School Filter (for SCHOOL report level) */}
          {(reportLevel === 'SCHOOL' || reportLevel === 'SUBJECT') && user?.role !== 'SCHOOL' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select School</label>
              <SearchableSelect
                value={selectedSchoolId}
                onChange={setSelectedSchoolId}
                placeholder="Search by school code, name..."
                options={[
                  ...(reportLevel === 'SUBJECT' ? [{ value: 'ALL', label: 'All Schools' }] : []),
                  ...availableSchools.map((s: any) => {
                    const isConfirmed = currentExamObj?.confirmedSchools?.includes(s.id || s._id);
                    return {
                      value: s.id || s._id,
                      label: isConfirmed ? s.name : `${s.name} (School Not Confirmed)`,
                      subLabel: s.code || s.schoolCode || '',
                      searchTerms: `${s.village || ''} ${s.place || ''} ${s.city || ''} ${s.address || ''}`
                    };
                  })
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Printable Canvas Preview Container */}
      <div className="bg-gray-100 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-2xl p-6 sm:p-10 flex justify-center shadow-inner overflow-x-auto min-h-[600px]">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500 space-y-4">
            <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
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
              <div className="grid grid-cols-8 gap-3 mb-8">
                <div className="bg-[#f8fafc] p-3 border border-slate-200 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Total Students</span>
                  <span className="text-xl font-black text-slate-900 mt-1 block font-mono">{aggStats.totalStudents}</span>
                </div>
                <div className="bg-[#f0f9ff] p-3 border border-sky-200 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-sky-600 block">Total Appeared</span>
                  <span className="text-xl font-black text-sky-800 mt-1 block font-mono">{aggStats.appeared}</span>
                </div>
                <div className="bg-[#ecfdf5] p-3 border border-emerald-200 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-700 block">Passed</span>
                  <span className="text-xl font-black text-emerald-800 mt-1 block font-mono">{aggStats.passed}</span>
                </div>
                <div className="bg-[#eff6ff] p-3 border border-blue-200 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-blue-700 block">Pass %</span>
                  <span className="text-xl font-black text-blue-800 mt-1 block font-mono">{aggStats.passPct}%</span>
                </div>
                <div className="bg-[#fef2f2] p-3 border border-red-200 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-red-600 block">Failed</span>
                  <span className="text-xl font-black text-red-700 mt-1 block font-mono">{aggStats.failed}</span>
                </div>
                <div className="bg-[#f5f5f5] p-3 border border-gray-200 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 block">Absent</span>
                  <span className="text-xl font-black text-gray-700 mt-1 block font-mono">{aggStats.absent}</span>
                </div>
                <div className="bg-[#fffbeb] p-3 border border-amber-200 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-amber-700 block">Full A+</span>
                  <span className="text-xl font-black text-amber-800 mt-1 block font-mono">{aggStats.fullAPlus}</span>
                </div>
                <div className="bg-[#fff1f2] p-3 border border-rose-200 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 block">Fail %</span>
                  <span className="text-xl font-black text-rose-700 mt-1 block font-mono">{aggStats.failPct}%</span>
                </div>
              </div>

              {/* 3. Level-Specific Detailed Data Tables */}

              {/* LEVEL 1: DISTRICT TABLE */}
              {reportLevel === 'DISTRICT' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span className="text-blue-600 font-bold">🏛️</span>
                        {`Revenue District Performance Directory (${reportData?.rows?.length || 0} Revenue Districts)`}
                      </h3>
                    </div>
                    <table className="w-full text-left border-collapse text-xs border border-slate-300">
                      <thead>
                        <tr className="bg-[#f1f5f9] border-b border-slate-300">
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest w-10 text-center">#</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest">Revenue District Name</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Total Students</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Appeared</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Passed</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Failed</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Absent</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Full A+</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Pass %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {reportData?.rows?.map((row: any, idx: number) => (
                          <tr key={row.id || idx} className={idx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fcfdfd]'}>
                            <td className="p-2.5 border border-slate-300 text-[10px] font-bold text-slate-400 text-center font-mono">{idx + 1}</td>
                            <td className="p-2.5 border border-slate-300 font-bold text-slate-900">
                              {row.name}
                              {row.code && <span className="text-[9px] text-slate-400 font-mono ml-2">({row.code})</span>}
                            </td>
                            <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-slate-800">{row.totalStudents ?? row.studentsAppeared}</td>
                            <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-slate-700">{row.studentsAppeared}</td>
                            <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-emerald-700">{row.pass}</td>
                            <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-rose-700">{Math.max(0, (row.studentsAppeared || 0) - (row.pass || 0) - (row.absent || 0))}</td>
                            <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-slate-500">{row.absent || 0}</td>
                            <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-amber-700">{row.fullAPlus}</td>
                            <td className="p-2.5 border border-slate-300 text-right font-mono font-black text-blue-700">{Number(row.victoryPercentage || 0).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LEVEL 2: EDUCATIONAL DISTRICT DIRECTORY (grouped by Revenue Division) */}
              {reportLevel === 'EDUCATIONAL' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="text-blue-600 font-bold">🏛️</span>
                      {`Educational District Directory (${eduGroupedData.totalCount} Sub-Districts)`}
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search Sub-District or District..."
                        value={eduSearchQuery}
                        onChange={e => { setEduSearchQuery(e.target.value); setEduPage(1); }}
                        className="px-3 py-1.5 text-[10px] font-bold border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-56"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-300">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#f1f5f9] border-b-2 border-slate-300">
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest w-10 text-center">#</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest cursor-pointer select-none hover:bg-slate-200 transition-colors">
                            Revenue District
                          </th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest cursor-pointer select-none hover:bg-slate-200 transition-colors" onClick={() => { setEduSortField('name'); setEduSortDir(eduSortField === 'name' && eduSortDir === 'asc' ? 'desc' : 'asc'); }}>
                            Educational Sub-District
                          </th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center cursor-pointer select-none hover:bg-slate-200 transition-colors" onClick={() => { setEduSortField('studentsAppeared'); setEduSortDir(eduSortField === 'studentsAppeared' && eduSortDir === 'desc' ? 'asc' : 'desc'); }}>
                            Total Students {eduSortField === 'studentsAppeared' ? (eduSortDir === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Appeared</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center cursor-pointer select-none hover:bg-slate-200 transition-colors" onClick={() => { setEduSortField('pass'); setEduSortDir(eduSortField === 'pass' && eduSortDir === 'desc' ? 'asc' : 'desc'); }}>
                            Passed {eduSortField === 'pass' ? (eduSortDir === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Failed</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Absent</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-purple-600 uppercase tracking-widest text-center">A+</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-indigo-600 uppercase tracking-widest text-center">A</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-blue-600 uppercase tracking-widest text-center">B+</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-cyan-600 uppercase tracking-widest text-center">B</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-teal-600 uppercase tracking-widest text-center">C+</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-center">C</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-amber-600 uppercase tracking-widest text-center">D+</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-orange-600 uppercase tracking-widest text-center">D</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-rose-600 uppercase tracking-widest text-center">E</th>
                          <th className="p-2.5 border border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center cursor-pointer select-none hover:bg-slate-200 transition-colors" onClick={() => { setEduSortField('victoryPercentage'); setEduSortDir(eduSortField === 'victoryPercentage' && eduSortDir === 'desc' ? 'asc' : 'desc'); }}>
                            Pass % {eduSortField === 'victoryPercentage' ? (eduSortDir === 'asc' ? '↑' : '↓') : ''}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {eduGroupedData.pagedRows.length === 0 ? (
                          <tr>
                            <td colSpan={18} className="p-6 text-center text-slate-400 text-[11px] font-bold">No educational districts found.</td>
                          </tr>
                        ) : (
                          eduGroupedData.pagedRows.map((row: any, ri: number) => {
                            const currentIdx = (eduPage - 1) * EDU_PAGE_SIZE + ri;
                            return (
                              <tr key={row.id || currentIdx} className={currentIdx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fcfdfd]'}>
                                <td className="p-2.5 border border-slate-300 text-[10px] font-bold text-slate-400 text-center font-mono">{currentIdx + 1}</td>
                                <td className="p-2.5 border border-slate-300 font-bold text-slate-800 bg-[#f8fafc] text-[11px]">
                                  {row.districtName || row.revenueDivisionName || 'Unassigned'}
                                </td>
                                <td className="p-2.5 border border-slate-300 font-bold text-slate-900">
                                  {row.name}
                                  {row.code && <span className="text-[9px] text-slate-400 font-mono ml-2">({row.code})</span>}
                                </td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-slate-800">{row.totalStudents ?? row.studentsAppeared}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-slate-700">{row.studentsAppeared}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-emerald-700">{row.pass}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-rose-700">{Math.max(0, (row.studentsAppeared || 0) - (row.pass || 0) - (row.absent || 0))}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-slate-500">{row.absent || 0}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-purple-700">{row.aPlus ?? row.fullAPlus ?? 0}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-indigo-700">{row.a || 0}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-blue-700">{row.bPlus || 0}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-cyan-700">{row.b || 0}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-teal-700">{row.cPlus || 0}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-emerald-700">{row.c || 0}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-amber-700">{row.dPlus || 0}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-orange-700">{row.d || 0}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-rose-700">{row.e || 0}</td>
                                <td className="p-2.5 border border-slate-300 text-center font-mono font-black text-blue-700">{Number(row.victoryPercentage || 0).toFixed(2)}%</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {eduGroupedData.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] font-bold text-slate-500">
                        Showing {(eduPage - 1) * EDU_PAGE_SIZE + 1}–{Math.min(eduPage * EDU_PAGE_SIZE, eduGroupedData.totalCount)} of {eduGroupedData.totalCount} Sub-Districts
                      </span>
                      <div className="flex items-center gap-1">
                        <button disabled={eduPage <= 1} onClick={() => setEduPage(p => p - 1)} className="px-3 py-1 text-[10px] font-black border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer disabled:cursor-default">Prev</button>
                        {Array.from({ length: eduGroupedData.totalPages }, (_, i) => i + 1).map(p => (
                          <button key={p} onClick={() => setEduPage(p)} className={`px-2.5 py-1 text-[10px] font-black border rounded-lg transition-colors cursor-pointer ${p === eduPage ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}>{p}</button>
                        ))}
                        <button disabled={eduPage >= eduGroupedData.totalPages} onClick={() => setEduPage(p => p + 1)} className="px-3 py-1 text-[10px] font-black border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer disabled:cursor-default">Next</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(reportLevel === 'DISTRICT' || reportLevel === 'EDUCATIONAL') && (rankedSchools.length > 0 || isLoadingRanked) && (
                <div className="space-y-6 mt-6">
                  {isLoadingRanked && rankedSchools.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-slate-400">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Loading School Rankings...</span>
                    </div>
                  ) : (
                  <>
                  {/* Top & Low Performing Schools Section */}
                    <div className="grid grid-cols-2 gap-6 pt-4">
                      {/* Top Performing Institutions */}
                      <div className="bg-[#f6fef9] p-4 border border-emerald-200 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          Top Performing Institutions (100% & High Pass)
                        </h4>
                        <div className="space-y-2">
                          {topSchools.map((s, i) => (
                            <div key={s.id || i} className="flex justify-between items-center text-xs bg-white p-2 border border-emerald-100 shadow-xs">
                              <span className="font-bold text-slate-800 truncate max-w-[170px]">{i + 1}. {s.name}</span>
                              <span className="font-mono font-black text-emerald-700 text-[11px] shrink-0">{Number(s.victoryPercentage || 0).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Need Support / Low Performing Institutions */}
                      <div className="bg-[#fff7f8] p-4 border border-rose-200 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-800 flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-rose-600" />
                          Need Support / Low Performing Institutions
                        </h4>
                        <div className="space-y-2">
                          {lowSchools.map((s, i) => (
                            <div key={s.id || i} className="flex justify-between items-center text-xs bg-white p-2 border border-rose-100 shadow-xs">
                              <span className="font-bold text-slate-800 truncate max-w-[170px]">{i + 1}. {s.name}</span>
                              <span className="font-mono font-black text-rose-700 text-[11px] shrink-0">{Number(s.victoryPercentage || 0).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  {/* Comprehensive Schools List with Detailed Metrics */}
                    <div className="space-y-4 pt-6 mt-6 border-t border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span className="text-blue-600 font-bold">🏫</span>
                          {reportLevel === 'EDUCATIONAL'
                            ? `Comprehensive Schools Directory (${rankedSchoolsWithEdu.length} Schools)`
                            : `Comprehensive Schools Directory (${rankedSchoolsWithEdu.length} Schools)`}
                        </h3>
                      </div>
                      <table className="w-full text-left border-collapse text-[10px] border border-slate-300">
                        <thead>
                          <tr className="bg-[#f1f5f9] border-b border-slate-300">
                            <th className="p-2 border border-slate-300 font-black text-slate-600 uppercase tracking-widest w-6 text-center">#</th>
                            <th className="p-2 border border-slate-300 font-black text-slate-600 uppercase tracking-widest">School Name</th>
                            <th className="p-2 border border-slate-300 font-black text-slate-700 uppercase tracking-widest text-center">Total</th>
                            <th className="p-2 border border-slate-300 font-black text-slate-600 uppercase tracking-widest text-center">App</th>
                            <th className="p-2 border border-slate-300 font-black text-emerald-700 uppercase tracking-widest text-center">Pass</th>
                            <th className="p-2 border border-slate-300 font-black text-rose-700 uppercase tracking-widest text-center">Fail</th>
                            <th className="p-2 border border-slate-300 font-black text-slate-500 uppercase tracking-widest text-center">Abs</th>
                            <th className="p-2 border border-slate-300 font-black text-blue-700 uppercase tracking-widest text-center">Pass %</th>
                            <th className="p-2 border border-slate-300 font-black text-amber-700 uppercase tracking-widest text-center">Basic%</th>
                            <th className="p-2 border border-slate-300 font-black text-indigo-700 uppercase tracking-widest text-center">Avg%</th>
                            <th className="p-2 border border-slate-300 font-black text-purple-700 uppercase tracking-widest text-center">Profound%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {(() => {
                            const sorted = [...rankedSchoolsWithEdu].sort((a: any, b: any) => {
                              const ea = (a.eduName || 'Unassigned').localeCompare(b.eduName || 'Unassigned');
                              if (ea !== 0) return ea;
                              return (b.victoryPercentage || 0) - (a.victoryPercentage || 0);
                            });
                            return sorted.map((row: any, idx: number) => {
                              const eduLabel = row.eduName ? ` (${row.eduName})` : '';
                              const displayName = row.code ? `${row.code} - ${row.name || ''}` : (row.name || '');
                              return (
                                <tr key={row.id || idx} className={idx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fcfdfd]'}>
                                  <td className="p-2 border border-slate-300 font-bold text-slate-400 text-center font-mono">{idx + 1}</td>
                                  <td className="p-2 border border-slate-300 font-bold text-slate-900 leading-tight">
                                    {displayName}<span className="text-[9px] font-bold text-slate-400">{eduLabel}</span>
                                  </td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-700">{row.totalStudents ?? 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-700">{row.studentsAppeared}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-emerald-700">{row.pass}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-rose-700">{row.failed || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-500">{row.absent || 0}</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-black text-blue-700 bg-[#f7fbff]">{Number(row.victoryPercentage || 0).toFixed(1)}%</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-amber-700">{Number(row.basicLevelPct || 0).toFixed(1)}%</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-indigo-700">{Number(row.averageLevelPct || 0).toFixed(1)}%</td>
                                  <td className="p-2 border border-slate-300 text-center font-mono font-bold text-purple-700">{Number(row.profoundLevelPct || 0).toFixed(1)}%</td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </>
                  )}
                </div>
              )}

              {/* LEVEL 3: SCHOOL LEVEL DETAILED EVALUATION */}
              {reportLevel === 'SCHOOL' && (() => {
                const studentsList = reportData?.students || [];
                const uniqueSubjectCodes = Array.from(new Set(
                  studentsList.flatMap((st: any) => Object.keys(st.grades || {}))
                )).sort((a: any, b: any) => sortSubjects({ name: a, code: a, shortName: a }, { name: b, code: b, shortName: b })) as string[];

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
                <div className="space-y-6">
                  <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-black text-slate-900 uppercase">{reportData?.school?.name || currentSchoolObj?.name || 'School Report'}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">UDISE Code: {reportData?.school?.code || currentSchoolObj?.code || '-'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-blue-700 uppercase bg-[#dbeafe] px-2.5 py-1 rounded-full">
                        Grade Performance Score: {reportData?.stats?.performanceScore || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Grade Count Summary */}
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Overall Grade Cumulative Summary</h4>
                    <div className="grid grid-cols-9 gap-2 text-center text-xs font-mono">
                      {['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E'].map(g => (
                        <div key={g} className="bg-[#f1f5f9] p-2 rounded-lg border border-slate-200">
                          <span className="text-[9px] font-black text-slate-500 block">{g}</span>
                          <span className="font-bold text-slate-900 mt-1 block">{reportData?.stats?.gradeCounts?.[g] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Student Result List snippet */}
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Enrolled Student Results ({studentsList.length} Students)</h4>
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
                        {sortedStudents.map((st: any, idx: number) => {
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
                  </div>
                </div>
                );
              })()}

              {/* LEVEL 4: SUBJECT-WISE DEEP ANALYSIS (MEDIUM-WISE 4 TABLES WITH SUMMARY CARDS) */}
              {reportLevel === 'SUBJECT' && (
                isLoadingData ? (
                  <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-2xl p-12 text-center shadow-xs">
                    <div className="relative inline-flex items-center justify-center mb-4">
                      <div className="w-14 h-14 rounded-full border-4 border-blue-100 dark:border-blue-950 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
                      <div className="absolute w-7 h-7 rounded-full bg-blue-500/20 dark:bg-blue-400/20 animate-ping" />
                      <span className="absolute text-blue-600 dark:text-blue-400 text-lg">📚</span>
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-1 flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      Loading Medium-wise Subject Data...
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400">
                      Generating English, Malayalam, Tamil & Overall Pass & Grade Distribution Reports...
                    </p>
                  </div>
                ) : reportData?.mediumTables && (
                  <div className="space-y-8">
                    {reportData.mediumTables.map((medTable: any) => (
                    <div key={medTable.code} className="space-y-3 bg-white dark:bg-[#161b22] p-4 rounded-xl border border-slate-200 dark:border-[#30363d] shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#30363d] pb-2">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <span className="text-blue-600 font-bold">📚</span>
                          {medTable.title} - Subject-Wise Pass & Grade Distribution Table
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {medTable.subjects.length} Subjects
                        </span>
                      </div>

                      {/* Single-Row Summary Card Bar */}
                      <div className="bg-slate-50 dark:bg-[#1f242c] border border-slate-200 dark:border-[#30363d] rounded-xl p-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center divide-x divide-slate-200 dark:divide-[#30363d]">
                          <div className="px-1.5">
                            <div className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider truncate">Total Students</div>
                            <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5 font-mono">{(medTable.summary.totalStudents || 0).toLocaleString()}</div>
                          </div>
                          <div className="px-1.5">
                            <div className="text-[8.5px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">Appeared</div>
                            <div className="text-xs font-black text-blue-700 dark:text-blue-400 mt-0.5 font-mono">{(medTable.summary.appeared || 0).toLocaleString()}</div>
                          </div>
                          <div className="px-1.5">
                            <div className="text-[8.5px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider truncate">Passed</div>
                            <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">{(medTable.summary.passed || 0).toLocaleString()}</div>
                          </div>
                          <div className="px-1.5">
                            <div className="text-[8.5px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider truncate">Failed</div>
                            <div className="text-xs font-black text-rose-700 dark:text-rose-400 mt-0.5 font-mono">{(medTable.summary.failed || 0).toLocaleString()}</div>
                          </div>
                          <div className="px-1.5">
                            <div className="text-[8.5px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">Absent</div>
                            <div className="text-xs font-black text-amber-700 dark:text-amber-400 mt-0.5 font-mono">{(medTable.summary.absents || 0).toLocaleString()}</div>
                          </div>
                          <div className="px-1.5">
                            <div className="text-[8.5px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider truncate">Full A+</div>
                            <div className="text-xs font-black text-purple-700 dark:text-purple-400 mt-0.5 font-mono">{(medTable.summary.fullAPlus || 0).toLocaleString()}</div>
                          </div>
                          <div className="px-1.5">
                            <div className="text-[8.5px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate">Pass %</div>
                            <div className="text-xs font-black text-indigo-700 dark:text-indigo-400 mt-0.5 font-mono">{Number(medTable.summary.passPercentage || 0).toFixed(2)}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Medium Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs border border-slate-300 dark:border-[#30363d]">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-[#1a1f26] border-b border-slate-300 dark:border-[#30363d]">
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest w-8 text-center">#</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Subject Name</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest text-center">Total</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest text-center">Appeared</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-red-600 uppercase tracking-widest text-center">Absent</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-emerald-600 uppercase tracking-widest text-center">Passed</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest text-center">A+</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-center">A</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest text-center">B+</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest text-center">B</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest text-center">C+</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center">C</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest text-center">D+</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest text-center">D</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest text-center">E</th>
                              <th className="p-2 border border-slate-300 dark:border-[#30363d] text-right font-mono font-black text-blue-700 dark:text-blue-400">Pass %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300 dark:divide-[#30363d]">
                            {medTable.subjects?.map((sub: any, idx: number) => (
                              <tr key={sub.subjectId || idx} className={idx % 2 === 0 ? 'bg-white dark:bg-[#161b22]' : 'bg-slate-50/50 dark:bg-[#1c2128]'}>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-[10px] font-bold text-slate-400 text-center font-mono">{idx + 1}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] font-bold text-slate-900 dark:text-white">{sub.subjectName || sub.name}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-slate-800 dark:text-slate-200">{sub.totalStudents || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-slate-700 dark:text-slate-300">{sub.appeared || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-red-600">{sub.absents || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">{sub.passed || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-purple-700 dark:text-purple-400">{sub.aPlus || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">{sub.a || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-blue-700 dark:text-blue-400">{sub.bPlus || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-cyan-700 dark:text-cyan-400">{sub.b || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-teal-700 dark:text-teal-400">{sub.cPlus || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">{sub.c || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-amber-700 dark:text-amber-400">{sub.dPlus || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-orange-700 dark:text-orange-400">{sub.d || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-center font-mono font-bold text-rose-700 dark:text-rose-400">{sub.e || 0}</td>
                                <td className="p-2 border border-slate-300 dark:border-[#30363d] text-right font-mono font-black text-blue-700 dark:text-blue-400">{Number(sub.passPercentage || 0).toFixed(2)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

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
          </div>
        )}
      </div>
    </div>
  );
}
