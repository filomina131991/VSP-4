import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, FileText, Settings, Target, CheckCircle2, FileDown, Plus, Trash2, Eye, Calendar, BookOpen, Clock, X, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { renderLatex } from '../../lib/renderLatex';
import { mediumNameToId } from '../../lib/mediumUtils';
import { filterSubjectsByMedium } from '../../lib/subjectUtils';
import QuestionSelectorModal from '../../components/repository/QuestionSelectorModal';
import Dropdown from '../../components/common/Dropdown';
import tamilFontUrl from '../../assets/fonts/TAU-Paalai.ttf';
import malayalamFontUrl from '../../assets/fonts/THUMBA.ttf';
import hindiFontUrl from '../../assets/fonts/Kruti Dev 051.TTF';
import arabicFontUrl from '../../assets/fonts/Noto Sans Arabic Thin.ttf';
import sanskritFontUrl from '../../assets/fonts/Sanskrit 2003.ttf';
import englishFontUrl from '../../assets/fonts/Times New Roman.ttf';

const getBase64Font = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert font to base64:', error);
    return '';
  }
};

interface Section {
  id: string;
  title: string;
  instruction: string;
  markValue: number;
  questions: any[];
}

export default function PaperGeneratorPage() {
  const { user } = useAuth();
  const { mediums, subjects: dataSubjects } = useData();

  const [currentView, setCurrentView] = useState<'list' | 'create'>('list');
  const [savedPapers, setSavedPapers] = useState<any[]>([]);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [examConfig, setExamConfig] = useState({
    className: '',
    subjectId: '',
    subjectName: '',
    medium: '',
    selectedChapters: [] as string[],
    selectedSubUnits: [] as string[],
    examTitle: 'UNIT / CLASS EVALUATION : JUNE 2026',
    timeMinutes: 40,
    totalMarks: 20,
    enableInternalChoiceSplit: true,
  });

  const [availableChapters, setAvailableChapters] = useState<any[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  const getSubjectFont = (subjectName: string, medium: string) => {
    const upperName = (subjectName || '').toUpperCase();
    const upperMedium = (medium || '').toUpperCase();

    // 1. Language-specific overrides
    if (upperName.includes('TAMIL')) {
      return { url: tamilFontUrl, family: 'TAU-Paalai', alternativeFamily: 'Tamil' };
    }
    if (upperName.includes('MALAYALAM')) {
      return { url: malayalamFontUrl, family: 'THUMBA', alternativeFamily: 'Malayalam' };
    }
    if (upperName.includes('ARABIC')) {
      return { url: arabicFontUrl, family: 'Noto Sans Arabic Thin' };
    }
    if (upperName.includes('SANSKRIT')) {
      return { url: sanskritFontUrl, family: 'Sanskrit 2003' };
    }
    if (upperName.includes('HINDI')) {
      return { url: hindiFontUrl, family: 'Kruti Dev 051', alternativeFamily: 'Hindi' };
    }

    // 2. Medium-based overrides
    if (upperMedium.includes('TAMIL')) {
      return { url: tamilFontUrl, family: 'TAU-Paalai', alternativeFamily: 'Tamil' };
    }
    if (upperMedium.includes('MALAYALAM')) {
      return { url: malayalamFontUrl, family: 'THUMBA', alternativeFamily: 'Malayalam' };
    }
    if (upperMedium.includes('HINDI')) {
      return { url: hindiFontUrl, family: 'Kruti Dev 051', alternativeFamily: 'Hindi' };
    }

    // 3. Purely English (English subject or English medium for general subjects)
    if (upperName.includes('ENGLISH') || upperMedium === 'ENGLISH') {
      return { url: englishFontUrl, family: 'Times New Roman' };
    }

    // 4. "all other is Tamil" -> default fallback
    return { url: tamilFontUrl, family: 'TAU-Paalai', alternativeFamily: 'Tamil' };
  };

  const selectedFont = getSubjectFont(examConfig.subjectName, examConfig.medium);

  useEffect(() => {
    if (examConfig.className && examConfig.subjectId && examConfig.medium) {
      const fetchAvailableChapters = async () => {
        setIsLoadingChapters(true);
        try {
          const res = await apiClient.get('/chapters', {
            params: {
              className: examConfig.className,
              subjectId: examConfig.subjectId,
              medium: examConfig.medium
            }
          });
          setAvailableChapters(res.data);
        } catch (err) {
          console.error('Failed to fetch chapters', err);
        } finally {
          setIsLoadingChapters(false);
        }
      };
      fetchAvailableChapters();
    } else {
      setAvailableChapters([]);
    }
  }, [examConfig.className, examConfig.subjectId, examConfig.medium]);

  const toggleChapterSelection = (chapterName: string) => {
    setExamConfig(prev => {
      const selected = prev.selectedChapters.includes(chapterName)
        ? prev.selectedChapters.filter(c => c !== chapterName)
        : [...prev.selectedChapters, chapterName];
      return { ...prev, selectedChapters: selected };
    });
  };

  const toggleSubUnitSelection = (subUnitName: string) => {
    setExamConfig(prev => {
      const selected = prev.selectedSubUnits.includes(subUnitName)
        ? prev.selectedSubUnits.filter(su => su !== subUnitName)
        : [...prev.selectedSubUnits, subUnitName];
      return { ...prev, selectedSubUnits: selected };
    });
  };

  const TAMIL_VOWELS = ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'];

  const [sections, setSections] = useState<Section[]>([
    { id: 'sec-1', title: 'Part A', instruction: '', markValue: 1, questions: [] }
  ]);

  const [selectorState, setSelectorState] = useState<{ isOpen: boolean; sectionId: string; marks: number; targetQuestionId?: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchSubjects();
    fetchSavedPapers();
  }, [user]);

  const fetchSavedPapers = async () => {
    setIsLoadingPapers(true);
    try {
      const res = await apiClient.get('/question-papers');
      setSavedPapers(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load saved papers');
    } finally {
      setIsLoadingPapers(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get('/management/subjects');
      let fetchedSubjects = res.data;
      
      // Role based subject filter for SUBJECT_EXPERT
      if (user?.role === 'SUBJECT_EXPERT' && user.teachingSubjects && Array.isArray(user.teachingSubjects)) {
        fetchedSubjects = fetchedSubjects.filter((s: any) => {
          const upperName = String(s.name).toUpperCase();
          return user.teachingSubjects.some((ts: string) => {
            const taught = ts.toUpperCase();
            if (taught === 'MATHS' && upperName.includes('MATHEMATICS')) return true;
            if (taught === 'ENGLISH' && upperName.includes('ENGLISH (SECOND')) return true;
            if (taught === 'HINDI' && (upperName.includes('HINDI (THIRD') || upperName.includes('ADDL. HINDI'))) return true;
            if (taught === 'SPECIAL ENGLISH' && upperName.includes('SPECIAL. ENGLISH')) return true;
            return upperName.includes(taught);
          });
        });
      }
      
      // Sort subjects naturally by shortName (P01 to P10)
      fetchedSubjects.sort((a: any, b: any) => {
        const codeA = String(a.shortName || a.name || '').toUpperCase();
        const codeB = String(b.shortName || b.name || '').toUpperCase();
        const numA = parseInt(codeA.replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt(codeB.replace(/[^0-9]/g, ''), 10) || 0;
        return numA - numB;
      });

      setSubjects(fetchedSubjects);
    } catch (err) {
      console.error(err);
    }
  };

  const steps = [
    { num: 1, title: 'Basic Details', icon: FileText },
    { num: 2, title: 'Questions', icon: HelpCircle },
    { num: 3, title: 'Blueprint', icon: Target },
    { num: 4, title: 'Export', icon: FileDown },
  ];

  const handleNext = async () => {
    if (step === 1) {
      if (!examConfig.className || !examConfig.subjectId || !examConfig.medium) {
        toast.error('Please fill all basic details');
        return;
      }
      if (examConfig.selectedChapters.length === 0 && examConfig.selectedSubUnits.length === 0) {
        toast.error('Please select at least one Chapter or Subunit');
        return;
      }
      const subj = subjects.find(s => s._id === examConfig.subjectId);
      if (subj) setExamConfig(prev => ({ ...prev, subjectName: subj.name }));
    }

    if (step === 2) {
      const currentMarks = calculateTotalMarks();
      if (currentMarks !== examConfig.totalMarks) {
        toast.error(`Mark mismatch! Expected ${examConfig.totalMarks}, but got ${currentMarks}.`);
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      // Save Blueprint Template (just structure)
      try {
        const blueprintData = sections.map(s => ({
          title: s.title,
          instruction: s.instruction,
          markValue: s.markValue
        }));
        await apiClient.post('/blueprint-templates', {
          subjectId: examConfig.subjectId,
          className: examConfig.className,
          sections: blueprintData
        });
      } catch (err) {
        console.error('Failed to save blueprint', err);
      }

      // Save Full Question Paper
      try {
        const allQuestionIds = sections.flatMap(s => s.questions.map(q => q.id));
        await apiClient.post('/question-papers', {
          name: examConfig.examTitle,
          className: examConfig.className,
          subjectId: examConfig.subjectId,
          medium: examConfig.medium,
          totalMarks: examConfig.totalMarks,
          questionIds: allQuestionIds,
          config: {
            examConfig: examConfig,
            sections: sections.map(s => ({
              title: s.title,
              instruction: s.instruction,
              markValue: s.markValue,
              questions: s.questions
            }))
          }
        });
        toast.success("Question paper saved to library!");
        fetchSavedPapers();
      } catch (err) {
        console.error('Failed to save question paper', err);
        toast.error('Failed to save question paper');
      }
      setStep(4);
      return;
    }
    
    if (step < 4) setStep(step + 1);
  };

  const calculateTotalMarks = () => {
    return sections.reduce((sum, sec) => sum + (sec.questions.length * sec.markValue), 0);
  };

  const addSection = () => {
    const nextMarkValue = sections.length > 0
      ? sections[sections.length - 1].markValue + 1
      : 1;

    setSections([...sections, {
      id: `sec-${Date.now()}`,
      title: `Part ${String.fromCharCode(65 + sections.length)}`,
      instruction: '',
      markValue: nextMarkValue,
      questions: []
    }]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id: string, field: keyof Section, value: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSelectQuestion = (sectionId: string, question: any) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        if (selectorState?.targetQuestionId) {
          return {
            ...s,
            questions: s.questions.map(q =>
              q.id === selectorState.targetQuestionId ? { ...q, orQuestion: question } : q
            )
          };
        } else {
          // Avoid duplicate
          if (!s.questions.find(q => q.id === question.id)) {
            return { ...s, questions: [...s.questions, question] };
          }
        }
      }
      return s;
    }));
    setSelectorState(null);
    toast.success('Question added!');
  };

  const togglePaperInternalChoice = (sectionId: string, questionId: string, checked: boolean) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map(q =>
            q.id === questionId ? { ...q, isPaperInternalChoice: checked, orQuestion: checked ? q.orQuestion : undefined } : q
          )
        };
      }
      return s;
    }));
  };

  const removeOrQuestion = (sectionId: string, questionId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map(q =>
            q.id === questionId ? { ...q, orQuestion: undefined } : q
          )
        };
      }
      return s;
    }));
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, questions: s.questions.filter(q => q.id !== questionId) };
      }
      return s;
    }));
  };

  const generatePdf = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Generating PDF...');
    let newTab: Window | null = null;
    try {
      newTab = window.open('', '_blank');
      if (newTab) {
        newTab.document.write('<html><body style="font-family: sans-serif; padding: 20px; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9fafb;"><h2>Generating your Question Paper PDF... Please wait up to 10 seconds.</h2></body></html>');
      }

      // Convert fonts to base64 to ensure 100% reliable loading in Puppeteer
      let fontBase64 = '';
      let timesNewRomanBase64 = '';
      try {
        fontBase64 = await getBase64Font(selectedFont.url);
        if (selectedFont.family !== 'Times New Roman') {
          timesNewRomanBase64 = await getBase64Font(englishFontUrl);
        }
      } catch (err) {
        console.error("Error loading fonts for base64 injection:", err);
      }

      const fontSrc = fontBase64 || `${window.location.origin}${selectedFont.url}`;
      const englishFontSrc = timesNewRomanBase64 || `${window.location.origin}${englishFontUrl}`;

      const htmlContent = printRef.current.innerHTML;

      const theadHeaderHtml = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; font-family: 'Times New Roman', serif; color: black; border-bottom: 2px solid black; padding-bottom: 12px; margin-bottom: 20px; margin-top: 10px; position: relative; z-index: 1;">
          <div>Munnott - Vijayasree PKD</div>
          <div>${examConfig.subjectName.split(' - ')[0]}</div>
        </div>
      `;

      const footerTemplate = `
        <style>
          .footer-box {
            display: flex;
            justify-content: flex-end;
            width: 100%;
            font-size: 11px;
            font-weight: bold;
            font-family: 'Times New Roman', serif;
            color: black;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid black;
            margin-bottom: 10px;
          }
        </style>
        <div class="footer-box" style="padding-left: 12mm; padding-right: 12mm;">
          <div><span class="pageNumber"></span> / <span class="totalPages"></span></div>
        </div>
      `;

      const pageCss = `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
        <style>
          /* 1. Custom font (e.g. Tamil) for all characters */
          @font-face {
            font-family: 'PaperFont';
            src: url('${fontSrc}') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          /* 2. Times New Roman override for ASCII range (English letters, numbers, symbols) */
          ${selectedFont.family !== 'Times New Roman' ? `
          @font-face {
            font-family: 'PaperFont';
            src: url('${englishFontSrc}') format('truetype');
            unicode-range: U+0020-007F, U+20B9;
            font-weight: normal;
            font-style: normal;
          }
          ` : ''}

          @page { margin: 15mm 12mm 25mm 12mm; }
          @page :first { margin-top: 0mm !important; }
          
          /* Prevent faux italics on entire document */
          * {
            font-style: normal;
          }
          
          body, .font-custom {
            font-family: 'PaperFont', 'Times New Roman', serif !important;
            font-style: normal !important;
            font-size: ${selectedFont.family === 'TAU-Paalai' ? '14pt' : '13pt'} !important;
            line-height: 1.5 !important;
          }
          
          /* Base text size override for PDF content elements */
          .text-\\[12pt\\], [class*="text-[12pt]"] {
            font-size: ${selectedFont.family === 'TAU-Paalai' ? '14pt' : '13pt'} !important;
          }

          /* Ensure paragraphs and spans inside prose are normal and use PaperFont */
          .prose, .prose p, .prose span, .prose div {
            font-style: normal !important;
            font-family: 'PaperFont', 'Times New Roman', serif !important;
          }
          .prose em, .prose i, em, i {
            font-style: italic !important;
          }
          
          /* Prevent overriding KaTeX styles and fonts */
          .katex, .katex * {
            font-style: initial !important;
            font-family: KaTeX_Main, Times New Roman, serif !important;
            font-size: initial !important;
          }
          
          /* Make LaTeX formulas more readable and slightly larger in PDF */
          .katex {
            font-size: 1.25em !important;
          }
          
          /* Alignment and image classes */
          img { max-width: 100%; height: auto; }
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .text-left { text-align: left !important; }
          .text-justify { text-align: justify !important; }
          
          /* Fix excessive indentation for lists */
          .prose ul, .prose ol {
            padding-left: 1.5em !important;
            margin-top: 0.25em !important;
            margin-bottom: 0.25em !important;
          }
          .prose li {
            padding-left: 0 !important;
            margin-top: 0.25em !important;
            margin-bottom: 0.25em !important;
          }
          .prose li p {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }

          /* Image alignment support */
          .ql-align-center { text-align: center !important; }
          .ql-align-right { text-align: right !important; }
          .ql-align-justify { text-align: justify !important; }
          .prose img {
            display: inline-block !important;
            margin: 0.5em 0 !important;
            max-width: 100%;
          }
        </style>
      `;

      const fullHtmlPayload = `
        ${pageCss}
        <div style="background: white;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <td>${theadHeaderHtml}</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="bg-white text-black text-[12pt] leading-snug text-justify font-custom" style="margin-top: -55px; background: white; position: relative; z-index: 10; padding-top: 10px;">
                    ${htmlContent}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      const response = await apiClient.post('/pdf/generate', {
        html: fullHtmlPayload,
        baseUrl: window.location.origin,
        title: examConfig.examTitle,
        footerTemplate: footerTemplate,
        headerTemplate: '<span></span>',
        useCssMargins: true,
        marginTop: '15mm',
        marginBottom: '25mm',
        marginLeft: '12mm',
        marginRight: '12mm'
      }, {
        responseType: 'blob',
        timeout: 300000
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      if (newTab) {
        newTab.location.href = url;
      } else {
        window.open(url, '_blank');
      }
      
      toast.success('PDF generated successfully!', { id: toastId });
      // Removed revokeObjectURL to allow downloading the PDF from the new tab
      // setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF', { id: toastId });
      if (newTab) newTab.close();
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeletePaper = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this generated question paper?")) return;
    try {
      await apiClient.delete(`/question-papers/${id}`);
      toast.success("Paper deleted successfully");
      fetchSavedPapers();
    } catch (err) {
      toast.error("Failed to delete paper");
    }
  };

  const handleViewPaper = (paper: any) => {
    if (paper.config && paper.config.examConfig && paper.config.sections) {
      setExamConfig({
        ...paper.config.examConfig,
        selectedChapters: paper.config.examConfig.selectedChapters || [],
        selectedSubUnits: paper.config.examConfig.selectedSubUnits || [],
        enableInternalChoiceSplit: paper.config.examConfig.enableInternalChoiceSplit !== undefined ? paper.config.examConfig.enableInternalChoiceSplit : true,
      });
      setSections(paper.config.sections);
      setStep(4);
      setCurrentView('create');
    } else {
      toast.error("Invalid paper data format.");
    }
  };

  const startNewPaper = () => {
    setExamConfig({
      className: '',
      subjectId: '',
      subjectName: '',
      medium: '',
      selectedChapters: [],
      selectedSubUnits: [],
      examTitle: 'UNIT / CLASS EVALUATION : JUNE 2026',
      timeMinutes: 40,
      totalMarks: 20,
      enableInternalChoiceSplit: true,
    });
    setSections([
      { id: 'sec-1', title: 'Part A', instruction: '', markValue: 1, questions: [] }
    ]);
    setStep(1);
    setCurrentView('create');
  };

  let globalQuestionIndex = 1;

  if (currentView === 'list') {
    return (
      <div className="p-6 max-w-6xl mx-auto h-full flex flex-col animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generated Exam Papers</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and reprint your generated question papers</p>
          </div>
          <button
            onClick={startNewPaper}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} /> Add New Exam
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex-1">
          {isLoadingPapers ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading your saved papers...</div>
          ) : savedPapers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Papers Generated Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first question paper using our advanced generator tool.</p>
              <button
                onClick={startNewPaper}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 font-semibold px-6 py-2.5 rounded-lg inline-flex items-center gap-2 transition-colors"
              >
                Start Generating <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Exam Title</th>
                    <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Class & Medium</th>
                    <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Subject</th>
                    <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Marks</th>
                    <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Date Created</th>
                    <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {savedPapers.map((paper, paperIdx) => (
                    <tr key={paper.id || paper._id || paperIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <FileText size={16} className="text-blue-500" />
                          {paper.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: {paper.id || paper._id}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          Class {paper.className} - {paper.medium}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium dark:text-gray-200">
                          {subjects.find(s => s._id === paper.subjectId)?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{paper.totalMarks}</span>
                      </td>
                      <td className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {new Date(paper.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleViewPaper(paper)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium"
                          title="View & Print"
                        >
                          <Eye size={16} /> View
                        </button>
                        <button
                          onClick={() => handleDeletePaper(paper.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium"
                          title="Delete"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto flex-1 h-full flex flex-col print:p-0 print:max-w-none">
      <style dangerouslySetInnerHTML={{
        __html: `
          @font-face {
            font-family: 'PreviewFont';
            src: url('${selectedFont.url}') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          .preview-font, .preview-font p, .preview-font span, .preview-font div, .preview-font .prose {
            font-family: 'PreviewFont', '${selectedFont.family}', 'Times New Roman', serif !important;
          }
        `
      }} />
      <div className="print:hidden">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setCurrentView('list')}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Back to Library"
          >
            <ChevronRight className="rotate-180" size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paper Generator</h1>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          {steps.map((s, idx) => (
            <div key={s.num || idx} className="flex items-center flex-1">
              <div className={`flex flex-col items-center gap-2 flex-1 ${step >= s.num ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step > s.num ? 'bg-blue-600 border-blue-600 text-white' :
                  step === s.num ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' :
                    'border-gray-300 dark:border-gray-600'
                  }`}>
                  {step > s.num ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                </div>
                <span className="text-sm font-medium hidden sm:block">{s.title}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-2 rounded ${step > s.num ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 print:hidden">
        {step === 1 && (
          <div className="max-w-xl mx-auto space-y-5 animate-in fade-in">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Step 1: Exam Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
                <Dropdown
                  className="w-full"
                  value={examConfig.className}
                  onChange={(v) => setExamConfig({ ...examConfig, className: v })}
                  placeholder="Select Class"
                  options={[
                    { value: '8', label: 'Class 8' },
                    { value: '9', label: 'Class 9' },
                    { value: '10', label: 'Class 10' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medium</label>
                <Dropdown
                  className="w-full"
                  value={examConfig.medium}
                  onChange={(v) => setExamConfig({ ...examConfig, medium: v })}
                  placeholder="Select Medium"
                  options={[
                    { value: 'Tamil', label: 'Tamil' },
                    { value: 'Malayalam', label: 'Malayalam' },
                    { value: 'English', label: 'English' },
                  ]}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <Dropdown
                  className="w-full"
                  value={examConfig.subjectId}
                  onChange={(v) => setExamConfig({ ...examConfig, subjectId: v })}
                  placeholder="Select Subject"
                  options={filterSubjectsByMedium(dataSubjects.filter(s => s.active !== false), examConfig.medium, mediums).map((s, sIdx) => (
                    { value: s._id || s.id || String(sIdx), label: s.name }
                  ))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Title</label>
                <input
                  type="text" className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-transparent dark:text-white"
                  value={examConfig.examTitle} onChange={e => setExamConfig({ ...examConfig, examTitle: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time (Minutes)</label>
                <input
                  type="number" className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-transparent dark:text-white"
                  value={examConfig.timeMinutes} onChange={e => setExamConfig({ ...examConfig, timeMinutes: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">Total Expected Marks</label>
                <input
                  type="number" className="w-full border-2 border-blue-500 rounded-md px-3 py-2 bg-blue-50 dark:bg-blue-900/20 font-bold dark:text-white"
                  value={examConfig.totalMarks} onChange={e => setExamConfig({ ...examConfig, totalMarks: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2 flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 mt-2">
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-white">Enable Internal Choice Split Across Pages</label>
                  <span className="text-xs text-gray-500">Allows A) and B) options to split across pages to avoid blank space at page bottom.</span>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  checked={examConfig.enableInternalChoiceSplit}
                  onChange={(e) => setExamConfig(prev => ({ ...prev, enableInternalChoiceSplit: e.target.checked }))}
                />
              </div>
            </div>

            {/* Chapter Selection */}
            {examConfig.className && examConfig.subjectId && examConfig.medium && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6 animate-in fade-in">
                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                  Select Units / Chapters (Mandatory)
                </label>
                <input
                  type="text"
                  placeholder="Enter customized unit name (e.g. Unit 1)"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-transparent dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={examConfig.selectedChapters[0] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExamConfig(prev => ({
                      ...prev,
                      selectedChapters: val ? [val] : []
                    }));
                  }}
                  required
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in h-full flex flex-col">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Step 2: Questions</h2>
                <p className="text-sm text-gray-500">Create sections, define marks, and add questions.</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 font-bold uppercase">Current Marks / Expected</div>
                <div className={`text-2xl font-black ${calculateTotalMarks() === examConfig.totalMarks ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {calculateTotalMarks()} / {examConfig.totalMarks}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {sections.map((sec, idx) => (
                <div key={sec.id || idx} className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center flex-1 min-w-[300px]">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => updateSection(sec.id, 'title', e.target.value)}
                        placeholder="e.g. Part A"
                        className="font-bold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md w-32 dark:text-white"
                      />
                      <input
                        type="text"
                        value={sec.instruction}
                        onChange={(e) => updateSection(sec.id, 'instruction', e.target.value)}
                        placeholder="Instructions (e.g. Answer any 5 questions)"
                        className="flex-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Marks/Q:</span>
                        <input
                          type="number" min="1"
                          value={sec.markValue}
                          onChange={(e) => updateSection(sec.id, 'markValue', Number(e.target.value))}
                          className="w-16 text-center font-bold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 px-2 py-1.5 rounded-md dark:text-white"
                        />
                      </div>
                      <button
                        onClick={() => removeSection(sec.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-md transition-colors"
                        title="Remove Section"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 preview-font text-[14px]">
                    {sec.questions.map((q, qIdx) => {
                      const parsedOptions = Array.isArray(q.options) && q.questionType !== 'MCQ' ? q.options[0] : q.options;
                      return (
                        <div key={q.id || q._id || qIdx} className="group relative border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg pr-12">
                          <div className="absolute top-2 right-12 z-10">
                            <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-gray-500 hover:text-blue-600 transition-colors bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                              <input
                                type="checkbox"
                                className="rounded text-blue-600 focus:ring-blue-500"
                                checked={!!q.isPaperInternalChoice}
                                onChange={(e) => togglePaperInternalChoice(sec.id, q.id, e.target.checked)}
                              />
                              Internal Choice
                            </label>
                          </div>
                          {q.isPaperInternalChoice ? (
                            <div className="flex gap-2 flex-col">
                              <div className="flex gap-2">
                                <span className="font-bold text-gray-500">{qIdx + 1}.</span>
                                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">ஏதேனும் ஒன்றிற்கு விடையளிக்கவும்.</span>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <span className="font-semibold text-sm">அ)</span>
                                <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: renderLatex(q.content) }} />
                              </div>
                              <div className="text-center font-bold text-gray-500 text-sm my-2">(அல்லது)</div>
                              <div className="flex gap-2 ml-4 relative">
                                <span className="font-semibold text-sm">ஆ)</span>
                                {q.orQuestion ? (
                                  <div className="w-full relative pr-8">
                                    <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: q.orQuestion.content }} />
                                    {q.orQuestion.questionType === 'MCQ' && q.orQuestion.options && (
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        {(Array.isArray(q.orQuestion.options) ? q.orQuestion.options : []).map((opt: any, i: number) => (
                                          <div key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-semibold">{String.fromCharCode(65 + i)})</span>
                                            <span dangerouslySetInnerHTML={{ __html: renderLatex(opt.text || opt) }} />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <button onClick={() => removeOrQuestion(sec.id, q.id)} className="absolute -top-1 -right-2 text-red-400 hover:text-red-600">
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setSelectorState({ isOpen: true, sectionId: sec.id, marks: sec.markValue, targetQuestionId: q.id })}
                                    className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                  >
                                    + Select OR Question
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : parsedOptions?.isInternalChoice ? (
                            <div className="flex gap-2 flex-col">
                              <div className="flex gap-2">
                                <span className="font-bold text-gray-500">{qIdx + 1}.</span>
                                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">ஏதேனும் ஒன்றிற்கு விடையளிக்கவும்.</span>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <span className="font-semibold text-sm">அ)</span>
                                <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: renderLatex(q.content) }} />
                              </div>
                              <div className="text-center font-bold text-gray-500 text-sm my-2">(அல்லது)</div>
                              <div className="flex gap-2 ml-4">
                                <span className="font-semibold text-sm">ஆ)</span>
                                <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: parsedOptions.orContent }} />
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <span className="font-bold text-gray-500">{qIdx + 1}.</span>
                              <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: renderLatex(q.content) }} />
                            </div>
                          )}
                          {q.questionType === 'MCQ' && q.options && q.options.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2 pl-6">
                              {(Array.isArray(q.options) ? q.options : []).map((opt: any, i: number) => (
                                <div key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-semibold">{String.fromCharCode(65 + i)})</span>
                                  <span dangerouslySetInnerHTML={{ __html: renderLatex(opt.text || opt) }} />
                                </div>
                              ))}
                            </div>
                          )}
                          {q.questionType === 'MCI' && parsedOptions && (parsedOptions.rows || parsedOptions.left) && (
                            <div className="mt-3 pl-6 space-y-2">
                              {(parsedOptions.rows || (parsedOptions.left && parsedOptions.left.map((l: string, i: number) => ({ col1: l, symbol1: '-', col2: parsedOptions.right?.[i] || '' })))).map((row: any, i: number) => (
                                <div key={i} className={`grid ${parsedOptions.columns === 3 ? 'grid-cols-[auto_auto_auto_auto_1fr]' : 'grid-cols-[auto_auto_1fr]'} gap-3 items-center`}>
                                  <div dangerouslySetInnerHTML={{ __html: renderLatex(row.col1) }} className="prose text-sm" />
                                  <div className="font-bold text-center">{row.symbol1 || '-'}</div>
                                  <div dangerouslySetInnerHTML={{ __html: renderLatex(row.col2) }} className="prose text-sm" />
                                  {parsedOptions.columns === 3 && (
                                    <>
                                      <div className="font-bold text-center">{row.symbol2 || '-'}</div>
                                      <div dangerouslySetInnerHTML={{ __html: renderLatex(row.col3) }} className="prose text-sm" />
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => removeQuestion(sec.id, q.id)}
                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 dark:bg-red-900/20 p-2 rounded-md"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}

                    <button
                      onClick={() => setSelectorState({ isOpen: true, sectionId: sec.id, marks: sec.markValue })}
                      className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus size={18} /> Add {sec.markValue}-Mark Question Here
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addSection}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Add New Section (Part)
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Blueprint Summary Table */}
        {step === 3 && (
          <div className="animate-in fade-in space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">Question Paper Design Layout (Blueprint Summary)</h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                  <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Part / Section</th>
                      <th className="px-6 py-3 font-semibold text-center text-xs uppercase tracking-wider">Marks per Question</th>
                      <th className="px-6 py-3 font-semibold text-center text-xs uppercase tracking-wider">No. of Questions</th>
                      <th className="px-6 py-3 font-semibold text-right text-xs uppercase tracking-wider">Total Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sections.map((sec, idx) => (
                      <tr key={sec.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{sec.title || '-'}</td>
                        <td className="px-6 py-4 text-center">{sec.markValue}</td>
                        <td className="px-6 py-4 text-center">{sec.questions.length}</td>
                        <td className="px-6 py-4 text-right font-medium">{sec.questions.length * sec.markValue}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 dark:bg-gray-900/50">
                      <td colSpan={3} className="px-6 py-4 font-bold text-right text-gray-900 dark:text-white">Grand Total</td>
                      <td className="px-6 py-4 font-bold text-right text-blue-600 dark:text-blue-400 text-lg">
                        {sections.reduce((sum, sec) => sum + (sec.questions.length * sec.markValue), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Export PDF */}
        {step === 4 && (
          <div className="animate-in fade-in space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between bg-blue-50 dark:bg-blue-950/20 p-5 rounded-xl border border-blue-100 dark:border-blue-900/50 gap-4">
              <div>
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200">Question Paper Ready for Export</h3>
                <p className="text-sm text-blue-600 dark:text-blue-300">Review the live question paper preview below, then export to PDF.</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={generatePdf}
                  disabled={isExporting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-transform hover:scale-105 shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:hover:scale-100 shrink-0 cursor-pointer text-sm"
                >
                  {isExporting ? <span className="animate-pulse">Generating PDF...</span> : <><FileDown size={18} /> Export to PDF</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {step < 4 && (
            <div className="mt-8 flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow flex items-center gap-2"
                >
                    {step === 2 ? 'Verify & Continue' : step === 3 ? 'Proceed to Export' : 'Next Step'} <ChevronRight size={18} />
                </button>
            </div>
        )}
      </div>

      {/* 
        PRINT LAYOUT
        This section is completely hidden in screen view and only visible during printing.
      */}
      <div
        ref={printRef}
        className={`${step === 4 ? 'p-12 block mt-12 mb-12 shadow-2xl border border-gray-200' : 'hidden'} print:block print:border-none print:shadow-none w-full max-w-[210mm] mx-auto bg-white text-black text-[12pt] leading-snug`}
        style={{ fontFamily: `'PaperFont', '${selectedFont.family}', '${selectedFont.alternativeFamily || ''}', 'Times New Roman', serif` }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
          /* 1. Custom font (e.g. Tamil) for all characters */
          @font-face {
            font-family: 'PaperFont';
            src: url('${window.location.origin}${selectedFont.url}') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          /* 2. Times New Roman override for ASCII range (English letters, numbers, symbols) */
          ${selectedFont.family !== 'Times New Roman' ? `
          @font-face {
            font-family: 'PaperFont';
            src: local('Times New Roman'), url('${window.location.origin}${englishFontUrl}') format('truetype');
            unicode-range: U+0020-007F, U+20B9;
            font-weight: normal;
            font-style: normal;
          }
          ` : ''}
          .prose p { margin: 0; padding: 0; }
          .prose > :first-child { margin-top: 0 !important; }
          img { max-width: 100%; height: auto; }
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .text-left { text-align: left !important; }
          .text-justify { text-align: justify !important; }
          @media print {
            body { background: white; }
            .page-break-after-always { page-break-after: always; }
          }`
        }} />

        {/* Header Block */}
        <div className="text-center mb-6">
          <h1 className="text-[20pt] font-bold mb-1 tracking-wider" style={{ fontFamily: "'Times New Roman', Times, serif" }}>'VIJAYASREE' Palakkad</h1>
          <h2 className="text-[12pt] font-bold mb-3 uppercase" style={{ fontFamily: "'Times New Roman', Times, serif" }}>'MUNNOTT' - PALAKKAD EDUCATIONAL DISTRICT</h2>

          <div className="border-[1.5px] border-black rounded-[16px] py-3 px-4 mb-4 relative flex flex-col items-center">
            <h3 className="text-[14pt] font-bold uppercase mb-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{examConfig.examTitle}</h3>
            <h4 className="text-[12pt] font-semibold uppercase mb-1" style={{ fontFamily: "'Times New Roman', Times, serif" }}>STD {examConfig.className} - {examConfig.subjectName.split(' - ')[0]}</h4>
            <h4 className="text-[12pt] font-semibold uppercase mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>UNIT : {(examConfig.selectedChapters || []).join(', ') || (examConfig.selectedSubUnits || []).join(', ') || (examConfig as any).unitName || ''}</h4>

            <div className="absolute bottom-2 left-4 text-[11pt]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
              Time : {examConfig.timeMinutes} Minutes
            </div>
            <div className="absolute bottom-2 right-4 text-[11pt]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
              Total Score: {examConfig.totalMarks}
            </div>
          </div>
        </div>

        {/* Questions Body */}
        <div className="space-y-6">
          {sections.map((sec, secIdx) => {
            if (sec.questions.length === 0) return null;
            return (
              <div key={sec.id || secIdx} className="space-y-4">
                {sec.title || sec.instruction ? (
                  <div className="font-bold text-left mb-2 ml-4">
                    {sec.title && !/^part\b/i.test(sec.title.trim()) && <div>{sec.title}</div>}
                    {sec.instruction && <div className="italic">({sec.instruction})</div>}
                  </div>
                ) : null}

                {sec.questions.map((q, qIdx) => {
                  const currentQNum = globalQuestionIndex++;
                  const parsedOptions = Array.isArray(q.options) && q.questionType !== 'MCQ' ? q.options[0] : q.options;
                  const isInternalChoice = q.isPaperInternalChoice || parsedOptions?.isInternalChoice;
                  const shouldSplit = isInternalChoice && examConfig.enableInternalChoiceSplit;

                  if (shouldSplit) {
                    const optAContent = q.content;
                    const optBContent = q.isPaperInternalChoice ? (q.orQuestion?.content || '') : (parsedOptions?.orContent || '');

                    return (
                      <div key={q.id || q._id || qIdx} className="w-full mb-4">
                        {/* Option A Block */}
                        <div className="relative flex items-start gap-3 w-full break-inside-avoid mb-2">
                          <div className="font-bold min-w-[24px] shrink-0 text-right">{currentQNum}.</div>
                          <div className="flex-1 w-full relative pr-12">
                            <div className="font-bold text-[12pt] mb-2">ஏதேனும் ஒன்றிற்கு விடையளிக்கவும்.</div>
                            <div className="flex gap-2 ml-4">
                              <span className="font-semibold text-[12pt] pt-[2px]">A)</span>
                              <div className="prose text-black max-w-none text-[12pt]" dangerouslySetInnerHTML={{ __html: renderLatex(optAContent) }} />
                            </div>
                            {/* Absolute positioned marks */}
                            <div className="absolute top-0 right-0 font-bold whitespace-nowrap">
                              ({sec.markValue})
                            </div>
                          </div>
                        </div>

                        {/* OR Separator Block */}
                        <div className="w-full flex items-center justify-center my-3 break-inside-avoid">
                          <div className="text-center font-bold text-[12pt] text-black">
                            (அல்லது)
                          </div>
                        </div>

                        {/* Option B Block */}
                        <div className="relative flex items-start gap-3 w-full break-inside-avoid mt-2">
                          <div className="min-w-[24px] shrink-0"></div>
                          <div className="flex-1 w-full relative pr-12">
                            <div className="flex gap-2 ml-4">
                              <span className="font-semibold text-[12pt] pt-[2px]">B)</span>
                              <div className="w-full font-normal">
                                <div className="prose text-black max-w-none text-[12pt]" dangerouslySetInnerHTML={{ __html: renderLatex(optBContent) }} />
                                {q.isPaperInternalChoice && q.orQuestion?.questionType === 'MCQ' && q.orQuestion.options && (
                                  <div className="mt-2 grid grid-cols-2 gap-y-2 gap-x-8 w-5/6">
                                    {(Array.isArray(q.orQuestion.options) ? q.orQuestion.options : []).map((opt: any, i: number) => (
                                      <div key={i} className="flex gap-2">
                                        <span className="font-semibold">{String.fromCharCode(65 + i)})</span>
                                        <span dangerouslySetInnerHTML={{ __html: renderLatex(opt.text || opt) }} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Standard (non-split / non-internal choice) questions
                  return (
                    <div key={q.id || q._id || qIdx} className="relative flex items-start gap-3 w-full break-inside-avoid mb-4">
                      <div className="font-bold min-w-[24px] shrink-0 text-right">{currentQNum}.</div>
                      <div className="flex-1 w-full relative pr-12">
                        {isInternalChoice ? (
                          <div className="flex flex-col gap-2">
                            <div className="font-bold text-[12pt]">ஏதேனும் ஒன்றிற்கு விடையளிக்கவும்.</div>
                            <div className="flex gap-2 ml-4">
                              <span className="font-semibold text-[12pt] pt-[2px]">A)</span>
                              <div className="prose text-black max-w-none text-[12pt]" dangerouslySetInnerHTML={{ __html: renderLatex(q.content) }} />
                            </div>
                            <div className="text-center font-bold my-2 text-[12pt]">(அல்லது)</div>
                            <div className="flex gap-2 ml-4">
                              <span className="font-semibold text-[12pt] pt-[2px]">B)</span>
                              <div className="w-full font-normal">
                                <div className="prose text-black max-w-none text-[12pt]" dangerouslySetInnerHTML={{ __html: renderLatex(q.isPaperInternalChoice ? (q.orQuestion?.content || '') : (parsedOptions?.orContent || '')) }} />
                                {q.isPaperInternalChoice && q.orQuestion?.questionType === 'MCQ' && q.orQuestion.options && (
                                  <div className="mt-2 grid grid-cols-2 gap-y-2 gap-x-8 w-5/6">
                                    {(Array.isArray(q.orQuestion.options) ? q.orQuestion.options : []).map((opt: any, i: number) => (
                                      <div key={i} className="flex gap-2">
                                        <span className="font-semibold">{String.fromCharCode(65 + i)})</span>
                                        <span dangerouslySetInnerHTML={{ __html: renderLatex(opt.text || opt) }} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="prose text-black max-w-none text-[12pt]" dangerouslySetInnerHTML={{ __html: renderLatex(q.content) }} />
                        )}

                        {/* Options */}
                        {q.questionType === 'MCQ' && q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-y-2 gap-x-8 mt-2 ml-4 w-5/6">
                            {(Array.isArray(q.options) ? q.options : []).map((opt: any, optIdx: number) => (
                              <div key={optIdx} className="flex gap-2">
                                <span className="font-semibold">{String.fromCharCode(65 + optIdx)})</span>
                                <span dangerouslySetInnerHTML={{ __html: renderLatex(opt.text || opt) }} />
                              </div>
                            ))}
                          </div>
                        )}
                        {q.questionType === 'MCI' && parsedOptions && (parsedOptions.rows || parsedOptions.left) && (
                          <div className="mt-3 ml-6 space-y-2 w-5/6">
                            {(parsedOptions.rows || (parsedOptions.left && parsedOptions.left.map((l: string, i: number) => ({ col1: l, symbol1: '-', col2: parsedOptions.right?.[i] || '' })))).map((row: any, i: number) => (
                              <div key={i} className={`grid ${parsedOptions.columns === 3 ? 'grid-cols-[auto_auto_auto_auto_1fr]' : 'grid-cols-[auto_auto_1fr]'} gap-3 items-center`}>
                                <div dangerouslySetInnerHTML={{ __html: renderLatex(row.col1) }} className="prose text-[12pt] text-black" />
                                <div className="font-bold text-[12pt] text-center">{row.symbol1 || '-'}</div>
                                <div dangerouslySetInnerHTML={{ __html: renderLatex(row.col2) }} className="prose text-[12pt] text-black" />
                                {parsedOptions.columns === 3 && (
                                  <>
                                    <div className="font-bold text-[12pt] text-center">{row.symbol2 || '-'}</div>
                                    <div dangerouslySetInnerHTML={{ __html: renderLatex(row.col3) }} className="prose text-[12pt] text-black" />
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Absolute positioned marks */}
                        <div className="absolute top-0 right-0 font-bold whitespace-nowrap">
                          ({sec.markValue})
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {selectorState && (
        <QuestionSelectorModal
          className={examConfig.className}
          medium={examConfig.medium}
          subjectId={examConfig.subjectId}
          marks={selectorState.marks}
          selectedChapters={examConfig.selectedChapters}
          selectedSubUnits={examConfig.selectedSubUnits}
          excludeIds={sections.flatMap(s => s.questions.flatMap(q => q.orQuestion ? [q.id, q.orQuestion.id] : [q.id]))}
          onClose={() => setSelectorState(null)}
          onSelect={(q) => handleSelectQuestion(selectorState.sectionId, q)}
        />
      )}
    </div>
  );
}
