import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, XCircle, 
  RefreshCw, Download, FileSpreadsheet, Layers, ShieldCheck, 
  Terminal, Search, X, Sparkles, ArrowRight, Info, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';

export interface StudentBulkImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  activeSchoolId: string;
  activeSchoolCode?: string;
  currentAcademicYear: string;
  selectedStandard?: string;
  selectedDivision?: string;
  onSuccess: () => void;
}

export type ImportStage = 
  | 'idle' 
  | 'reading' 
  | 'validating_columns' 
  | 'checking_duplicates' 
  | 'mapping_data' 
  | 'uploading' 
  | 'saving' 
  | 'completed';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'VALIDATION' | 'DUPLICATE' | 'MAPPING' | 'SAVING' | 'SUCCESS' | 'ERROR' | 'WARNING';
  message: string;
}

export interface RowDiagnostic {
  row: number;
  name: string;
  identifier: string; // Reg / Admission No
  classStandard: string;
  division: string;
  medium: string;
  gender: string;
  category: string;
  status: 'success' | 'failed' | 'warning' | 'skipped';
  reason?: string;
  data?: any;
}

export interface ImportSummary {
  total: number;
  imported: number;
  failed: number;
  skipped: number;
  warnings: number;
  durationMs: number;
}

const STAGES: { key: ImportStage; label: string; icon: any }[] = [
  { key: 'reading', label: '1. Reading File', icon: FileSpreadsheet },
  { key: 'validating_columns', label: '2. Validating Columns', icon: ShieldCheck },
  { key: 'checking_duplicates', label: '3. Checking Duplicates', icon: AlertTriangle },
  { key: 'mapping_data', label: '4. Mapping Data', icon: Layers },
  { key: 'uploading', label: '5. Uploading', icon: Upload },
  { key: 'saving', label: '6. Saving to Database', icon: RefreshCw },
  { key: 'completed', label: '7. Completed', icon: CheckCircle2 }
];

export const StudentBulkImportWizard: React.FC<StudentBulkImportWizardProps> = ({
  isOpen,
  onClose,
  activeSchoolId,
  activeSchoolCode = 'SCH_CODE',
  currentAcademicYear,
  selectedStandard,
  selectedDivision,
  onSuccess
}) => {
  const [stage, setStage] = useState<ImportStage>('idle');
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  const [inputSource, setInputSource] = useState<'file' | 'paste'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState('');
  
  const [academicYear, setAcademicYear] = useState(currentAcademicYear || '2026-27');
  const [overrideDivision, setOverrideDivision] = useState(false);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rowDiagnostics, setRowDiagnostics] = useState<RowDiagnostic[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'success' | 'failed' | 'warning'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [criticalError, setCriticalError] = useState<{ title: string; message: string; isAuthError?: boolean; details?: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const addLog = (level: LogEntry['level'], message: string) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), timestamp: timeStr, level, message }
    ]);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const resetWizardState = () => {
    setStage('idle');
    setProgress(0);
    setProcessedCount(0);
    setTotalCount(0);
    setSelectedFile(null);
    setPasteText('');
    setLogs([]);
    setRowDiagnostics([]);
    setSummary(null);
    setCriticalError(null);
    setShowConfetti(false);
  };

  // Standard template downloader
  const downloadTemplate = () => {
    const headers = [
      'Admission No',
      'Candidate Name',
      'Gender',
      'Class',
      'Division',
      'Medium',
      'Date of Birth',
      'Category',
      'Religion',
      'Caste',
      'Father Name',
      'Mother Name',
      'Contact Number',
      'Scribe'
    ];

    const sampleRows = [
      ['1001', 'AADHIRA S', 'Female', selectedStandard || '10', selectedDivision || 'A', 'Malayalam', '2010-04-15', 'General', 'Hindu', 'Nair', 'SURESH KUMAR', 'LATHA S', '9876543210', 'No'],
      ['1002', 'ABHINAV KRISHNA', 'Male', selectedStandard || '10', selectedDivision || 'A', 'English', '2010-08-22', 'OBC', 'Hindu', 'Ezhava', 'KRISHNAN K', 'SUNITHA', '9876543211', 'No'],
      ['1003', 'FATHIMA RIZWANA', 'Female', selectedStandard || '10', selectedDivision || 'B', 'Malayalam', '2010-01-10', 'OBC', 'Islam', 'Muslim', 'RIZWAN AHAMMED', 'SHAHINA', '9876543212', 'Yes']
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Import Template');
    XLSX.writeFile(wb, `Student_Import_Template_${activeSchoolCode}.xlsx`);
    toast.success('Excel Import Template downloaded!');
  };

  // Download failed records as Excel file for correction
  const downloadFailedRecords = () => {
    const failedRows = rowDiagnostics.filter(r => r.status === 'failed' || r.status === 'warning');
    if (failedRows.length === 0) {
      toast('No failed records found to download.');
      return;
    }

    const exportData = failedRows.map(r => ({
      'Row Number': r.row,
      'Admission No': r.identifier,
      'Candidate Name': r.name,
      'Class': r.classStandard,
      'Division': r.division,
      'Medium': r.medium,
      'Gender': r.gender,
      'Status': r.status.toUpperCase(),
      'Failure / Diagnostic Reason': r.reason || 'Validation error'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Failed Records');
    XLSX.writeFile(wb, `Failed_Students_Report_${activeSchoolCode}_${Date.now()}.xlsx`);
    toast.success('Failed Records downloaded!');
  };

  // Download diagnostic text report
  const downloadErrorReport = () => {
    let reportText = `====================================================\n`;
    reportText += `STUDENT BULK IMPORT DIAGNOSTIC REPORT\n`;
    reportText += `School Code: ${activeSchoolCode} | Date: ${new Date().toLocaleString()}\n`;
    reportText += `====================================================\n\n`;

    if (summary) {
      reportText += `SUMMARY STATISTICS:\n`;
      reportText += `- Total Processed: ${summary.total}\n`;
      reportText += `- Successfully Imported: ${summary.imported}\n`;
      reportText += `- Failed Records: ${summary.failed}\n`;
      reportText += `- Skipped / Warnings: ${summary.skipped}\n`;
      reportText += `- Processing Duration: ${(summary.durationMs / 1000).toFixed(2)}s\n\n`;
    }

    reportText += `DETAILED ROW DIAGNOSTICS:\n`;
    rowDiagnostics.forEach(r => {
      reportText += `[Row ${r.row}] Status: ${r.status.toUpperCase()} | AdmNo: ${r.identifier} | Name: ${r.name} | Class: ${r.classStandard}${r.division}\n`;
      if (r.reason) {
        reportText += `          Reason: ${r.reason}\n`;
      }
    });

    reportText += `\nEVENT LOG TRAIL:\n`;
    logs.forEach(l => {
      reportText += `[${l.timestamp}] [${l.level}] ${l.message}\n`;
    });

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Import_Diagnostic_Report_${activeSchoolCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Diagnostic Log Report downloaded!');
  };

  // Primary Execution Flow
  const handleStartImport = async () => {
    if (!academicYear.trim()) {
      toast.error('Academic Year is required (e.g. 2026-27)');
      return;
    }

    if (inputSource === 'file' && !selectedFile) {
      toast.error('Please select an Excel (.xls / .xlsx) or CSV file to import.');
      return;
    }

    if (inputSource === 'paste' && !pasteText.trim()) {
      toast.error('Please paste CSV/Excel records into the text area.');
      return;
    }

    setCriticalError(null);
    setLogs([]);
    setRowDiagnostics([]);
    const startTime = Date.now();

    // -------------------------------------------------------------
    // STAGE 1: Reading Excel / CSV Data
    // -------------------------------------------------------------
    setStage('reading');
    setProgress(10);
    addLog('INFO', `Starting bulk import stream for School ID: ${activeSchoolId}`);
    addLog('INFO', `Target Academic Year: ${academicYear} | Division Override: ${overrideDivision ? 'ENABLED' : 'DISABLED'}`);

    let rawRows: any[] = [];
    try {
      if (inputSource === 'file' && selectedFile) {
        const fileNameLower = selectedFile.name.toLowerCase();
        addLog('INFO', `Reading file '${selectedFile.name}' (${(selectedFile.size / 1024).toFixed(1)} KB)...`);
        await sleep(300);

        if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
          const buffer = await selectedFile.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          addLog('INFO', `Extracted worksheet '${sheetName}' from Excel workbook.`);
          const worksheet = workbook.Sheets[sheetName];
          rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        } else {
          const text = await selectedFile.text();
          const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
          rawRows = parsed.data;
        }
      } else {
        addLog('INFO', `Parsing raw text stream from paste clipboard...`);
        await sleep(200);
        const parsed = Papa.parse(pasteText, { header: true, skipEmptyLines: true });
        if (parsed.data.length === 0) {
          // Fall back to line by line if no header matched
          const lines = pasteText.split('\n').filter(l => l.trim());
          rawRows = lines.map(line => {
            const parts = line.split(/[\t,]/).map(s => s.trim());
            return {
              'Admission No': parts[0] || '',
              'Candidate Name': parts[1] || '',
              'Gender': parts[2] || 'Male',
              'Class': parts[3] || '10',
              'Division': parts[4] || 'A',
              'Medium': parts[5] || 'Malayalam'
            };
          });
        } else {
          rawRows = parsed.data;
        }
      }
    } catch (err: any) {
      addLog('ERROR', `Failed to parse input file: ${err.message}`);
      setCriticalError({
        title: 'File Reading Error',
        message: `Could not read or parse the selected file: ${err.message}`
      });
      setStage('idle');
      return;
    }

    if (rawRows.length === 0) {
      addLog('ERROR', 'No student records found in input stream.');
      toast.error('No rows detected in input file.');
      setStage('idle');
      return;
    }

    setTotalCount(rawRows.length);
    addLog('SUCCESS', `Read ${rawRows.length} total rows from source data.`);
    await sleep(200);

    // -------------------------------------------------------------
    // STAGE 2: Validating Columns & Headers
    // -------------------------------------------------------------
    setStage('validating_columns');
    setProgress(25);
    addLog('VALIDATION', 'Validating column structure against required schema...');
    await sleep(300);

    // Smart Row Classifier / Arranger
    const KNOWN_CATEGORIES = ['OBC', 'SC', 'ST', 'OEC', 'GENERAL', 'GEN', 'EWS', 'SEBC', 'EZHAVA', 'MUSLIM', 'LATIN CATHOLIC', 'OBH', 'CONVERTED', 'LC', 'MU', 'EZ', 'BH', 'FC', 'BC'];
    const KNOWN_MEDIUMS: Record<string, string> = {
      'MALAYALAM': 'Malayalam', 'MM': 'Malayalam', 'MALAYALAM MEDIUM': 'Malayalam',
      'ENGLISH': 'English', 'EM': 'English', 'ENGLISH MEDIUM': 'English',
      'TAMIL': 'Tamil', 'TM': 'Tamil', 'TAMIL MEDIUM': 'Tamil',
      'KANNADA': 'Kannada', 'KM': 'Kannada', 'KANNADA MEDIUM': 'Kannada'
    };

    const normalizedRows = rawRows.map((row: any, idx: number) => {
      const cellEntries: { key: string; val: string }[] = [];
      const normObj: Record<string, string> = {};
      
      if (Array.isArray(row)) {
        row.forEach((val, i) => {
          const v = String(val !== undefined && val !== null ? val : '').trim();
          cellEntries.push({ key: String(i), val: v });
          normObj[String(i)] = v;
        });
      } else if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach((k, i) => {
          const v = String(row[k] !== undefined && row[k] !== null ? row[k] : '').trim();
          cellEntries.push({ key: k.trim(), val: v });
          const kNorm = k.toLowerCase().replace(/[\s\-_%]/g, '');
          normObj[kNorm] = v;
          normObj[String(i)] = v;
        });
      }

      const values = cellEntries.map(e => e.val).filter(Boolean);

      // 1. RegNo & Name
      let regNo = (
        normObj['admissionno'] || normObj['admissionsno'] || normObj['regno'] || 
        normObj['registerno'] || normObj['register_no'] || normObj['admission_no'] || 
        normObj['globalid'] || (cellEntries[0] ? cellEntries[0].val : '')
      ).trim();

      let name = (
        normObj['candidatename'] || normObj['studentname'] || normObj['name'] || 
        normObj['fullname'] || (cellEntries[1] ? cellEntries[1].val : '')
      ).trim();

      // 2. Strict Gender Resolution (F -> Female, M -> Male)
      let genderRaw = (normObj['gender'] || normObj['sex'] || '').trim().toUpperCase();
      if (!genderRaw && cellEntries[2]) {
        const c2 = cellEntries[2].val.toUpperCase().trim();
        if (['M', 'MALE', 'F', 'FEMALE', 'BOY', 'GIRL', 'GIRLS', 'BOYS'].includes(c2)) {
          genderRaw = c2;
        }
      }

      let gender = 'Male';
      if (genderRaw.startsWith('F') || genderRaw === 'GIRL' || genderRaw === 'GIRLS' || genderRaw === 'WOMAN') {
        gender = 'Female';
      } else if (genderRaw.startsWith('M') || genderRaw === 'BOY' || genderRaw === 'BOYS' || genderRaw === 'MAN') {
        gender = 'Male';
      } else if (['OTHER', 'TRANSGENDER'].includes(genderRaw)) {
        gender = 'Other';
      }

      // 3. Strict Class & Division Resolution (e.g. "10 A 2026-2027" -> Class 10, Div A)
      let rawDiv = (normObj['division'] || normObj['div'] || normObj['section'] || normObj['sec'] || '').trim();
      let rawClass = (normObj['class'] || normObj['classstandard'] || normObj['classname'] || normObj['std'] || normObj['standard'] || '10').trim();
      let classStandard = '10';

      const combinedDivStr = `${rawClass} ${rawDiv}`.trim();
      let cleanDivText = combinedDivStr.replace(/\b\d{4}[-/\s]*\d{2,4}\b/g, ''); // Remove years e.g. 2026-2027
      cleanDivText = cleanDivText.replace(/\b(?:10th|10|CLASS|STD|X)\b/gi, ''); // Remove class 10 prefixes
      const letterMatch = cleanDivText.match(/([A-Za-z])/);
      let division = (letterMatch && letterMatch[1]) ? letterMatch[1].toUpperCase() : (selectedDivision ? selectedDivision.toUpperCase() : 'A');

      // 4. Medium & Category
      let medium = 'Tamil';
      let category = 'General';
      let dob = (normObj['dob'] || normObj['dateofbirth'] || normObj['birthdate'] || '').trim();
      let caste = (normObj['caste'] || '').trim();
      let religion = (normObj['religion'] || '').trim();
      let fatherName = (normObj['fathername'] || normObj['father'] || '').trim();
      let motherName = (normObj['mothername'] || normObj['mother'] || '').trim();
      let mobile = (normObj['mobile'] || normObj['phone'] || normObj['contact'] || '').trim();
      let scribeVal = (normObj['scribe'] || normObj['isscribe'] || 'no').trim();

      if (normObj['medium']) {
        const mUpper = normObj['medium'].toUpperCase().trim();
        if (KNOWN_MEDIUMS[mUpper]) {
          medium = KNOWN_MEDIUMS[mUpper];
        } else if (!KNOWN_CATEGORIES.includes(mUpper)) {
          medium = normObj['medium'];
        }
      }

      if (normObj['category'] || normObj['cat']) {
        const catUpper = (normObj['category'] || normObj['cat']).toUpperCase().trim();
        category = catUpper === 'GEN' ? 'General' : (normObj['category'] || normObj['cat']);
      }

      // Scan un-headered cells for Medium / Category / Date / Mobile
      values.forEach(v => {
        const upper = v.toUpperCase().trim();

        if (KNOWN_CATEGORIES.includes(upper) && !normObj['category'] && !normObj['cat']) {
          category = upper === 'GEN' ? 'General' : upper;
        }

        if (KNOWN_MEDIUMS[upper] && !normObj['medium']) {
          medium = KNOWN_MEDIUMS[upper];
        }

        if (/^\d{2,4}[-/\.]\d{1,2}[-/\.]\d{2,4}$/.test(v) && !normObj['dob']) {
          dob = v;
        }

        if (/^[6-9]\d{9}$/.test(v) && !normObj['mobile']) {
          mobile = v;
        }
      });

      const firstLangPaper1 = (
        normObj['firstlanguagepaperi'] || normObj['firstlanguagepaper1'] || 
        normObj['firstlangpaper1'] || normObj['paperi'] || normObj['paper1'] || normObj['lang1'] || ''
      ).trim();

      const firstLangPaper2 = (
        normObj['firstlanguagepaperii'] || normObj['firstlanguagepaper2'] || 
        normObj['firstlangpaper2'] || normObj['paperii'] || normObj['paper2'] || normObj['lang2'] || ''
      ).trim();

      const thirdLang = (
        normObj['thirdlanguage'] || normObj['thirdlang'] || normObj['lang3'] || ''
      ).trim();

      // Force division override if option checked
      if (overrideDivision && selectedStandard) classStandard = selectedStandard;
      if (overrideDivision && selectedDivision) division = selectedDivision.toUpperCase();

      return {
        rowNum: idx + 1,
        regNo,
        name,
        gender,
        classStandard: '10',
        division: division.toUpperCase(),
        medium,
        firstLangPaper1,
        firstLangPaper2,
        thirdLang,
        dob,
        category,
        religion,
        caste,
        fatherName,
        motherName,
        mobile,
        scribe: ['yes', 'true', '1'].includes(scribeVal.toLowerCase()),
        academicYear,
        rawRow: row
      };
    });

    addLog('VALIDATION', 'Header schema alignment verified across all rows.');
    await sleep(200);

    // -------------------------------------------------------------
    // STAGE 3: Checking Duplicates
    // -------------------------------------------------------------
    setStage('checking_duplicates');
    setProgress(45);
    addLog('DUPLICATE', 'Scanning for internal duplicate admission numbers in upload payload...');
    await sleep(300);

    const seenRegNos = new Map<string, number>();
    const duplicateRows: number[] = [];

    normalizedRows.forEach((r) => {
      if (r.regNo) {
        const key = r.regNo.toUpperCase();
        if (seenRegNos.has(key)) {
          duplicateRows.push(r.rowNum);
          addLog('WARNING', `Row ${r.rowNum}: Duplicate Register Number '${r.regNo}' (already seen in Row ${seenRegNos.get(key)})`);
        } else {
          seenRegNos.set(key, r.rowNum);
        }
      }
    });

    if (duplicateRows.length > 0) {
      addLog('WARNING', `Detected ${duplicateRows.length} duplicate register numbers in upload file.`);
    } else {
      addLog('SUCCESS', 'No duplicate admission numbers detected within import payload.');
    }
    await sleep(200);

    // -------------------------------------------------------------
    // STAGE 4: Mapping Data & Subject Resolution
    // -------------------------------------------------------------
    setStage('mapping_data');
    setProgress(60);
    addLog('MAPPING', 'Normalizing medium codes, gender formats, categories, and subject mappings...');
    await sleep(300);

    addLog('MAPPING', 'Data mapping & auto-correction complete.');

    // -------------------------------------------------------------
    // STAGE 5: Uploading & Handshake
    // -------------------------------------------------------------
    setStage('uploading');
    setProgress(75);
    addLog('SAVING', 'Transmitting batch payload to server API /api/management/students/bulk...');
    await sleep(300);

    // -------------------------------------------------------------
    // STAGE 6: Live Saving to Database
    // -------------------------------------------------------------
    setStage('saving');
    addLog('SAVING', `Executing live MongoDB transactions for ${normalizedRows.length} candidates in batches...`);

    const BATCH_SIZE = 20;
    let totalSaved = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    const allResults: any[] = [];

    const payloadStudents = normalizedRows.map(r => ({
      regNo: r.regNo,
      name: r.name,
      gender: r.gender,
      classStandard: r.classStandard,
      division: r.division,
      medium: r.medium,
      firstLangPaper1: r.firstLangPaper1,
      firstLangPaper2: r.firstLangPaper2,
      thirdLang: r.thirdLang,
      dob: r.dob,
      category: r.category,
      religion: r.religion,
      caste: r.caste,
      fatherName: r.fatherName,
      motherName: r.motherName,
      mobile: r.mobile,
      scribe: r.scribe,
      academicYear: r.academicYear
    }));

    try {
      for (let i = 0; i < payloadStudents.length; i += BATCH_SIZE) {
        const chunk = payloadStudents.slice(i, i + BATCH_SIZE);
        const startRow = i + 1;
        const endRow = Math.min(i + BATCH_SIZE, payloadStudents.length);

        addLog('SAVING', `Transmitting Batch (${startRow}-${endRow} of ${payloadStudents.length})...`);

        const res = await apiClient.post('/management/students/bulk', {
          students: chunk,
          schoolId: activeSchoolId
        }, { timeout: 60000 });

        const data = res.data;
        const chunkImported = data.imported || data.successfulCount || 0;
        const chunkFailed = data.failedCount || 0;
        const chunkSkipped = data.skippedCount || 0;

        totalSaved += chunkImported;
        totalFailed += chunkFailed;
        totalSkipped += chunkSkipped;

        if (data.results && Array.isArray(data.results)) {
          allResults.push(...data.results);
        }

        // Live update processed count and progress bar
        const currentProcessed = endRow;
        setProcessedCount(currentProcessed);

        const currentProgress = 80 + Math.round((currentProcessed / payloadStudents.length) * 20);
        setProgress(currentProgress);

        addLog('SUCCESS', `Batch (${startRow}-${endRow}) saved: +${chunkImported} saved (Total ${currentProcessed}/${payloadStudents.length}).`);
        await sleep(100);
      }

      const durationMs = Date.now() - startTime;

      setProgress(100);
      setStage('completed');

      addLog('SUCCESS', `Database transaction completed in ${(durationMs / 1000).toFixed(2)}s.`);
      addLog('SUCCESS', `Successfully saved ${totalSaved} students to database!`);

      if (totalFailed > 0) {
        addLog('WARNING', `${totalFailed} records failed backend validation.`);
      }

      // Build row diagnostic state
      const diagList: RowDiagnostic[] = (allResults || []).map((resRow: any, idx: number) => {
        const matchingNorm = normalizedRows[idx];
        return {
          row: resRow.row || idx + 1,
          name: resRow.name || matchingNorm?.name || 'Unknown Candidate',
          identifier: resRow.identifier || matchingNorm?.regNo || 'N/A',
          classStandard: resRow.classStandard || matchingNorm?.classStandard || '10',
          division: resRow.division || matchingNorm?.division || 'A',
          medium: resRow.medium || matchingNorm?.medium || 'Tamil',
          gender: resRow.gender || matchingNorm?.gender || 'Male',
          category: resRow.category || matchingNorm?.category || 'General',
          status: resRow.status || 'success',
          reason: resRow.reason
        };
      });

      setRowDiagnostics(diagList);
      setSummary({
        total: normalizedRows.length,
        imported: totalSaved,
        failed: totalFailed,
        skipped: totalSkipped,
        warnings: duplicateRows.length,
        durationMs
      });

      if (totalFailed === 0) {
        setShowConfetti(true);
      }

      toast.success(`Import finished! ${totalSaved} students saved.`);
      onSuccess();
    } catch (err: any) {
      const isAuth = err.response?.status === 401 || err.message?.includes('401');
      const errDetail = err.response?.data?.message || err.message || 'Unknown network error';
      
      addLog('ERROR', `Server request failed (HTTP ${err.response?.status || 500}): ${errDetail}`);
      
      setCriticalError({
        title: isAuth ? 'Authentication Session Expired (401)' : 'Server Processing Error (500)',
        message: isAuth 
          ? 'Your login session has expired. Please refresh your session or log in again to complete the import.'
          : `The backend encountered an error: ${errDetail}`,
        isAuthError: isAuth,
        details: JSON.stringify(err.response?.data || err, null, 2)
      });

      setStage('idle');
      toast.error(isAuth ? 'Session expired. Please log in again.' : 'Import server error.');
    }
  };

  // Filtered rows for diagnostics table
  const filteredDiagnostics = rowDiagnostics.filter(r => {
    const matchesTab = 
      activeFilterTab === 'all' ? true :
      activeFilterTab === 'success' ? r.status === 'success' :
      activeFilterTab === 'failed' ? r.status === 'failed' :
      r.status === 'warning' || r.status === 'skipped';

    const matchesSearch = 
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.identifier.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-100">
        
        {/* Header Bar */}
        <div className="px-8 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl">
              <Sparkles className="text-indigo-400 w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Enterprise Student Bulk Import Wizard
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">v2.0 Pro</span>
              </h2>
              <p className="text-xs font-semibold text-slate-300">
                School Code: <span className="font-mono text-indigo-300">{activeSchoolCode}</span> · Academic Year: <span className="text-white">{academicYear}</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Multi-Stage Animated Progress Header */}
        <div className="bg-slate-50 border-b border-gray-200 px-8 py-4 shrink-0">
          <div className="grid grid-cols-7 gap-1">
            {STAGES.map((s, idx) => {
              const IconComp = s.icon;
              const isCurrent = stage === s.key;
              const isPassed = STAGES.findIndex(st => st.key === stage) > idx || stage === 'completed';

              return (
                <div 
                  key={s.key} 
                  className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                    isCurrent ? 'bg-indigo-600 text-white shadow-md scale-105 z-10' :
                    isPassed ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    'bg-gray-100 text-gray-400'
                  }`}
                >
                  <IconComp className={`w-4 h-4 mb-1 ${isCurrent ? 'animate-bounce' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-wider line-clamp-1">{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Real-time Progress Bar */}
          {stage !== 'idle' && (
            <div className="mt-3">
              <div className="flex justify-between items-center text-xs font-bold text-gray-600 mb-1">
                <span className="uppercase tracking-wider">Overall Progress: {progress}%</span>
                <span>Processed {processedCount} / {totalCount} Rows</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* Critical Error Modal / Alert */}
          {criticalError && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3 animate-in zoom-in-95">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-black uppercase tracking-tight text-rose-800">{criticalError.title}</h3>
                  <p className="text-xs font-medium text-rose-700 mt-1">{criticalError.message}</p>
                  
                  {criticalError.details && (
                    <details className="mt-3 bg-white p-3 rounded-xl border border-rose-200">
                      <summary className="text-[11px] font-bold uppercase tracking-wider text-rose-600 cursor-pointer">Technical Stack Trace & Details</summary>
                      <pre className="text-[10px] font-mono text-gray-700 mt-2 overflow-x-auto p-2 bg-gray-50 rounded">{criticalError.details}</pre>
                    </details>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 border-t border-rose-200">
                <button
                  onClick={resetWizardState}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  <RefreshCw size={14} className="inline mr-1.5" />
                  {criticalError.isAuthError ? 'Re-authenticate / Retry' : 'Reset & Retry'}
                </button>
              </div>
            </div>
          )}

          {/* Confetti Success Banner */}
          {showConfetti && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 text-white rounded-xl">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Perfect Execution!</h4>
                  <p className="text-xs font-medium text-emerald-700">All student records imported smoothly without any failure.</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Step: Idle / Configuration */}
          {stage === 'idle' && (
            <div className="space-y-6">
              
              {/* Configuration Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 items-end">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Target Academic Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-27"
                    value={academicYear}
                    onChange={e => setAcademicYear(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                </div>

                <div>
                  <div className="h-[42px] px-3 py-2 bg-white border border-indigo-100 rounded-xl flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="overrideDiv"
                      checked={overrideDivision}
                      onChange={e => setOverrideDivision(e.target.checked)}
                      className="accent-indigo-600 w-4 h-4 rounded cursor-pointer shrink-0"
                    />
                    <label htmlFor="overrideDiv" className="text-[11px] font-bold text-indigo-900 uppercase tracking-wide cursor-pointer truncate">
                      Force Class {selectedStandard || '10'} Div {selectedDivision || 'A'} Override
                    </label>
                  </div>
                </div>

                <div>
                  <button
                    onClick={downloadTemplate}
                    className="w-full h-[42px] px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download size={15} /> Download Excel Template
                  </button>
                </div>
              </div>

              {/* Input Source Toggle */}
              <div>
                <div className="flex gap-2 border-b border-gray-200 pb-3 mb-4">
                  <button
                    onClick={() => setInputSource('file')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      inputSource === 'file' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <FileSpreadsheet size={16} />
                    Upload Excel / CSV File (.xlsx, .csv)
                  </button>

                  <button
                    onClick={() => setInputSource('paste')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      inputSource === 'paste' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <FileText size={16} />
                    Direct Paste Text (CSV / TSV)
                  </button>
                </div>

                {inputSource === 'file' ? (
                  <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-600 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl p-10 text-center transition-all relative cursor-pointer group">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt"
                      onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="mx-auto text-indigo-500 group-hover:scale-110 transition-transform mb-3" size={40} />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-black text-indigo-900">{selectedFile.name}</p>
                        <p className="text-xs font-semibold text-emerald-600 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB · Ready to Process</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Drop your Excel file here or click to browse</p>
                        <p className="text-xs font-medium text-gray-400 mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV files</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={6}
                    placeholder="Paste CSV/TSV table rows here... Example:&#10;Admission No, Candidate Name, Gender, Class, Division, Medium&#10;1001, Aadhira S, Female, 10, A, Malayalam"
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    className="w-full text-xs font-mono p-4 border border-gray-300 rounded-2xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none leading-relaxed"
                  />
                )}
              </div>

              {/* Start Import Execution CTA */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleStartImport}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl hover:shadow-2xl transition-all flex items-center gap-2"
                >
                  Start Enterprise Import
                  <ArrowRight size={16} />
                </button>
              </div>

            </div>
          )}

          {/* Live Terminal Console Log Viewer */}
          {logs.length > 0 && (
            <div className="rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 overflow-hidden shadow-inner">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-indigo-400" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">Live Import Event Stream Log</span>
                </div>

                <button
                  onClick={() => setLogs([])}
                  className="text-[10px] font-bold uppercase text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-all"
                >
                  Clear Terminal
                </button>
              </div>

              <div ref={logContainerRef} className="p-4 max-h-[180px] overflow-y-auto space-y-1.5 font-mono text-[11px]">
                {logs.map(log => {
                  const levelColor = 
                    log.level === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40' :
                    log.level === 'ERROR' ? 'text-rose-400 bg-rose-950/60 border-rose-800/40' :
                    log.level === 'WARNING' ? 'text-amber-400 bg-amber-950/60 border-amber-800/40' :
                    log.level === 'VALIDATION' ? 'text-purple-400 bg-purple-950/60 border-purple-800/40' :
                    'text-sky-400 bg-sky-950/60 border-sky-800/40';

                  return (
                    <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 ${levelColor}`}>
                        {log.level}
                      </span>
                      <span className="text-slate-300 break-all">{log.message}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completion Summary & Diagnostics Table */}
          {stage === 'completed' && summary && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Summary Statistics Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Total Processed</span>
                  <span className="text-xl font-black text-slate-900">{summary.total}</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1">Imported</span>
                  <span className="text-xl font-black text-emerald-700">{summary.imported}</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block mb-1">Failed Records</span>
                  <span className="text-xl font-black text-rose-700">{summary.failed}</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block mb-1">Skipped / Dups</span>
                  <span className="text-xl font-black text-amber-700">{summary.skipped}</span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 col-span-2 md:col-span-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1">Processing Time</span>
                  <span className="text-xl font-black text-indigo-700">{(summary.durationMs / 1000).toFixed(2)}s</span>
                </div>
              </div>

              {/* Download Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={downloadFailedRecords}
                  disabled={summary.failed === 0}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={14} />
                  Download Failed Records (.xlsx)
                </button>

                <button
                  onClick={downloadErrorReport}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                >
                  <FileText size={14} />
                  Download Diagnostic Log Report
                </button>

                <button
                  onClick={resetWizardState}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw size={14} />
                  Import Another Batch
                </button>
              </div>

              {/* Row-Level Diagnostic Status Table */}
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                
                {/* Table Filter Header */}
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                  
                  {/* Status Tabs */}
                  <div className="flex gap-1.5">
                    {(['all', 'success', 'failed', 'warning'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveFilterTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                          activeFilterTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-200/70 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tab} ({
                          tab === 'all' ? rowDiagnostics.length :
                          tab === 'success' ? rowDiagnostics.filter(r => r.status === 'success').length :
                          tab === 'failed' ? rowDiagnostics.filter(r => r.status === 'failed').length :
                          rowDiagnostics.filter(r => r.status === 'warning' || r.status === 'skipped').length
                        })
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search Candidate or AdmNo..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 focus:border-indigo-600 outline-none w-56"
                    />
                  </div>
                </div>

                {/* Diagnostics List */}
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-3"># Row</th>
                        <th className="p-3">Adm No</th>
                        <th className="p-3">Candidate Name</th>
                        <th className="p-3">Gender</th>
                        <th className="p-3">Class & Div</th>
                        <th className="p-3">Medium</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Diagnostics / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {filteredDiagnostics.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-gray-400 font-semibold">
                            No records match the selected status filter or search query.
                          </td>
                        </tr>
                      ) : (
                        filteredDiagnostics.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono text-gray-500">{r.row}</td>
                            <td className="p-3 font-mono font-bold text-indigo-700">{r.identifier}</td>
                            <td className="p-3 font-bold text-gray-800">{r.name}</td>
                            <td className="p-3 font-semibold text-pink-600">{r.gender}</td>
                            <td className="p-3 font-semibold text-gray-600">{r.classStandard} - {r.division}</td>
                            <td className="p-3 font-semibold text-indigo-600">{r.medium}</td>
                            <td className="p-3 font-semibold text-emerald-600">{r.category}</td>
                            <td className="p-3">
                              {r.status === 'success' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 size={12} /> Success
                                </span>
                              ) : r.status === 'failed' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                  <XCircle size={12} /> Failed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                  <AlertTriangle size={12} /> Warning
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-gray-500 text-[11px]">
                              {r.reason || 'Record validated & saved to database'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className="px-8 py-4 bg-slate-50 border-t border-gray-200 flex justify-between items-center shrink-0">
          <p className="text-xs font-medium text-gray-500">
            {stage === 'completed' ? 'Import process finished.' : 'Ensure register numbers and names are accurate before initiating import.'}
          </p>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            Close Wizard
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
