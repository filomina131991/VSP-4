import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, FileText, CheckCircle, AlertCircle, Save, Trash2 } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Papa from 'papaparse';
import PageLoader from '../../components/common/PageLoader';
import { useAuth } from '../../context/AuthContext';
interface MarksEntryBulkGridProps {
  selectedExam: any;
  availableSubjects: any[];
  students: any[];
  onSave: (marksData: any[], confirm: boolean, finalConfirm: boolean) => Promise<void>;
  onConfirmSubject?: (subjectId: string, subjectMarksData: any[]) => void;
  onResetSubject?: (subjectId: string) => void;
  onDeleteStudentMarks?: (student: any) => Promise<boolean>;
  isLoading: boolean;
  lockedSubjects: string[];
  isFinalLocked: boolean;
  existingMarks: any[];
  isSubjectApplicable?: (studentId: string, subjectId: string) => boolean;
  isSchoolUser?: boolean;
  schoolCanEditSubject?: (subjectId: string) => boolean;
}
export const MarksEntryBulkGrid: React.FC<MarksEntryBulkGridProps> = ({
  selectedExam,
  availableSubjects,
  students,
  onSave,
  onConfirmSubject,
  onResetSubject,
  onDeleteStudentMarks,
  isLoading,
  lockedSubjects,
  isFinalLocked,
  existingMarks,
  isSubjectApplicable,
  isSchoolUser = false,
  schoolCanEditSubject
}) => {
  const { user } = useAuth();
  
  // state for the grid: { [studentId]: { [subjectId]: string } }
  const [gridData, setGridData] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};
    students.forEach(st => {
      initial[st.id] = {};
      availableSubjects.forEach(sub => {
        const mark = existingMarks.find(m => m.studentId === st.id && m.subjectId === sub.id);
        if (mark) {
          if (selectedExam?.marksEntryMode === 'marks' && mark.mark !== undefined && mark.mark !== null) {
            initial[st.id][sub.id] = mark.mark.toString();
          } else {
            initial[st.id][sub.id] = mark.grade || '';
          }
        } else {
          initial[st.id][sub.id] = '';
        }
      });
    });
    return initial;
  });

  const [isUploading, setIsUploading] = useState(false);

  const schoolAllSubjectsLocked = isSchoolUser && schoolCanEditSubject && availableSubjects.every(sub => !schoolCanEditSubject(sub.id));

  const isMutuallyExcluded = React.useCallback((studentId: string, subjectId: string): boolean => {
    const sub = availableSubjects.find(s => s.id === subjectId);
    if (!sub) return false;
    const val = gridData[studentId]?.[subjectId];
    if (val && val.toString().trim() !== '') return false;
    const sameCodeSubjects = availableSubjects.filter(s => s.shortName === sub.shortName && s.id !== subjectId);
    return sameCodeSubjects.some(s => {
      const otherVal = gridData[studentId]?.[s.id];
      return otherVal && otherVal.toString().trim() !== '';
    });
  }, [availableSubjects, gridData]);

  const isAllInputsCompleted = React.useMemo(() => {
    if (!students || students.length === 0 || !availableSubjects || availableSubjects.length === 0) return false;
    for (const st of students) {
      for (const sub of availableSubjects) {
        if (isSubjectApplicable && !isSubjectApplicable(st.id, sub.id)) continue;
        if (isMutuallyExcluded(st.id, sub.id)) continue;
        const val = gridData[st.id]?.[sub.id];
        if (val === undefined || val === null || val.toString().trim() === '') {
          return false;
        }
      }
    }
    return true;
  }, [gridData, students, availableSubjects, isSubjectApplicable, isMutuallyExcluded]);

  const [isSaving, setIsSaving] = useState(false);
  const [hasDeclaredFinal, setHasDeclaredFinal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isAllComplete = React.useMemo(() => {
    if (students.length === 0 || availableSubjects.length === 0) return false;
    for (const st of students) {
      for (const sub of availableSubjects) {
        if (isSubjectApplicable && !isSubjectApplicable(st.id, sub.id)) continue;
        if (isMutuallyExcluded(st.id, sub.id)) continue;
        const val = gridData[st.id]?.[sub.id];
        if (val === undefined || val === null || val === '') return false;
      }
    }
    return true;
  }, [students, availableSubjects, gridData, isSubjectApplicable, isMutuallyExcluded]);
  const isSubjectComplete = React.useCallback((subjectId: string) => {
    if (students.length === 0) return false;
    for (const st of students) {
      if (isSubjectApplicable && !isSubjectApplicable(st.id, subjectId)) continue;
      if (isMutuallyExcluded(st.id, subjectId)) continue;
      const val = gridData[st.id]?.[subjectId];
      if (val === undefined || val === null || val === '') return false;
    }
    return true;
  }, [students, gridData, isSubjectApplicable, isMutuallyExcluded]);

  const resolveMaxMark = (sub: any) => {
    if (!sub) return 100;
    
    // For Marks Entry 2.0, the admin sets max marks per paper code (e.g. P01) in the exam.
    if (selectedExam?.maxMarks && selectedExam.maxMarks[sub.id]) {
      return selectedExam.maxMarks[sub.id];
    }
    return 100;
  };

  const handleGradeChange = (studentId: string, subjectId: string, val: string, studentIdx: number, subjectIdx: number) => {
    if (lockedSubjects.includes(subjectId) || isFinalLocked) return;
    
    const sub = availableSubjects.find(s => s.id === subjectId);
    const maxMark = resolveMaxMark(sub);

    let finalVal = val;
    if (selectedExam?.marksEntryMode !== 'marks') {
      finalVal = val.toUpperCase();
      if (finalVal === 'AA') finalVal = 'A+';
      else if (finalVal === 'BB') finalVal = 'B+';
      else if (finalVal === 'CC') finalVal = 'C+';
      else if (finalVal === 'DD') finalVal = 'D+';
    } else {
      // In marks mode, only allow numbers, empty, or 'AB'/'Ab'/'ab' (Absent)
      const numericRegex = /^[0-9]*$/;
      if (!numericRegex.test(val) && val.toLowerCase() !== 'ab' && val.toLowerCase() !== 'a') {
        if (val.toLowerCase() === 'ab') finalVal = 'Ab';
        else return; // Reject invalid characters for marks
      }
      
      if (val.toLowerCase() === 'ab') finalVal = 'Ab';
      if (finalVal !== 'Ab' && finalVal !== '' && !isNaN(Number(finalVal))) {
        // Enforce max length
        if (finalVal !== '100') {
          const maxLen = 2; // Fixed 2 digits as requested
          if (finalVal.length > maxLen) {
            finalVal = finalVal.slice(0, maxLen);
          }
        }
      }
    }
    
    let isInvalid = false;
    if (selectedExam?.marksEntryMode === 'marks' && finalVal !== 'Ab' && finalVal !== '' && !isNaN(Number(finalVal))) {
      if (Number(finalVal) > maxMark) {
        isInvalid = true;
        toast.error(`Maximum allowed mark is ${maxMark}`);
      }
    }

    setGridData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: finalVal
      }
    }));
    setHasUnsavedChanges(true);

    if (isInvalid) {
      setTimeout(() => {
        const currentInputId = `input-${students[studentIdx].id}-${subjectId}`;
        const currentInput = document.getElementById(currentInputId) as HTMLInputElement;
        if (currentInput) {
          currentInput.focus();
          currentInput.select();
        }
      }, 0);
    } else if (selectedExam?.marksEntryMode === 'marks' && finalVal !== 'Ab' && finalVal !== '') {
      const maxLen = 2;
      let shouldAutoFocus = false;
      if (finalVal.length === maxLen || finalVal === '100') {
        shouldAutoFocus = true;
      }

      if (shouldAutoFocus) {
        let nextSubIdx = subjectIdx + 1;
        let nextStudentIdx = studentIdx;
        
        while (nextSubIdx < availableSubjects.length) {
          const nextSub = availableSubjects[nextSubIdx];
          if (!isSubjectApplicable || isSubjectApplicable(students[nextStudentIdx]?.id, nextSub.id)) break;
          nextSubIdx++;
        }
        
        if (nextSubIdx >= availableSubjects.length) {
          nextSubIdx = 0;
          nextStudentIdx++;
          while (nextSubIdx < availableSubjects.length && nextStudentIdx < students.length) {
            const nextSub = availableSubjects[nextSubIdx];
            if (!isSubjectApplicable || isSubjectApplicable(students[nextStudentIdx]?.id, nextSub.id)) break;
            nextSubIdx++;
          }
        }
        
        if (nextStudentIdx < students.length) {
          setTimeout(() => {
            const nextInputId = `input-${students[nextStudentIdx].id}-${availableSubjects[nextSubIdx].id}`;
            const nextInput = document.getElementById(nextInputId) as HTMLInputElement;
            if (nextInput) {
              nextInput.focus();
              nextInput.select();
            }
          }, 0);
        }
      }
    }
  };

  const toggleAbsent = (studentId: string) => {
    if (availableSubjects.some(s => lockedSubjects.includes(s.id)) || isFinalLocked) return;
    setGridData(prev => {
      const studentData = { ...prev[studentId] };
      const applicableSubjects = availableSubjects.filter(sub => !isSubjectApplicable || isSubjectApplicable(studentId, sub.id));
      const isCurrentlyAbsent = applicableSubjects.length > 0 && applicableSubjects.every(sub => studentData[sub.id]?.toLowerCase() === 'ab');
      
      applicableSubjects.forEach(sub => {
        studentData[sub.id] = isCurrentlyAbsent ? '' : 'Ab';
      });
      
      return {
        ...prev,
        [studentId]: studentData
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentIdx: number, subjectIdx: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      
      let nextSubIdx = subjectIdx + 1;
      let nextStudentIdx = studentIdx;
      
      // Skip non-applicable subjects
      while (nextSubIdx < availableSubjects.length) {
        const nextSub = availableSubjects[nextSubIdx];
        if (!isSubjectApplicable || isSubjectApplicable(students[nextStudentIdx]?.id, nextSub.id)) break;
        nextSubIdx++;
      }
      
      if (nextSubIdx >= availableSubjects.length) {
        nextSubIdx = 0;
        nextStudentIdx++;
        // Skip non-applicable subjects in next student
        while (nextSubIdx < availableSubjects.length && nextStudentIdx < students.length) {
          const nextSub = availableSubjects[nextSubIdx];
          if (!isSubjectApplicable || isSubjectApplicable(students[nextStudentIdx]?.id, nextSub.id)) break;
          nextSubIdx++;
        }
      }
      
      if (nextStudentIdx < students.length && nextSubIdx < availableSubjects.length) {
        const nextInputId = `input-${students[nextStudentIdx].id}-${availableSubjects[nextSubIdx].id}`;
        const nextInput = document.getElementById(nextInputId) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinalLocked) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedData = results.data as any[];

          // Build subject lookup maps for matching CSV column headers
          const subjectByShortName: Record<string, any> = {};
          const subjectByName: Record<string, any> = {};
          availableSubjects.forEach(sub => {
            if (sub.shortName) subjectByShortName[sub.shortName.toLowerCase().replace(/[^a-z0-9]/g, '')] = sub;
            if (sub.name) subjectByName[sub.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = sub;
          });

          // Helper: identify if a column is a grade column (not regno/name/sl/total)
          const isGradeColumn = (cleanKey: string) => {
            if (['registerno', 'regno', 'register', 'registrationno', 'rollno', 'admno', 'admissionno'].some(x => cleanKey.includes(x))) return false;
            if (['name', 'studentname'].some(x => cleanKey === x || cleanKey.includes(x))) return false;
            if (['slno', 'sno', 'serial', 'sl'].some(x => cleanKey.includes(x))) return false;
            if (['status', 'result', 'passfail', 'total', 'percentage', 'overall'].some(x => cleanKey.includes(x))) return false;
            return true;
          };

          const newGridData = { ...gridData };
          let matchesFound = 0;
          const mismatchedStudents: string[] = [];

          parsedData.forEach((row: any) => {
            const keys = Object.keys(row);
            const lowerKeys = keys.map(k => ({ original: k, clean: k.toLowerCase().replace(/[^a-z0-9]/g, '') }));

            const regNoKeyObj = lowerKeys.find(k =>
              k.clean.includes('registerno') || k.clean.includes('regno') ||
              k.clean === 'register' || k.clean === 'registrationno' ||
              k.clean.includes('rollno') || k.clean.includes('admno') || k.clean.includes('admissionno')
            );
            const nameKeyObj = lowerKeys.find(k => k.clean === 'name' || k.clean.includes('studentname'));

            if (!regNoKeyObj) return;

            const regNo = String(row[regNoKeyObj.original] || '').trim();
            const name = nameKeyObj ? String(row[nameKeyObj.original] || '').trim() : '';
            if (!regNo) return;

            // Collect grade columns: try to match each to a subject
            // Build: gradeColSubjectId → grade value (matched) and unmatched grades list (positional fallback)
            const matchedBySubject: Record<string, string> = {};  // subjectId → grade
            const unmatchedGrades: string[] = [];                  // positional fallback grades

            keys.forEach(k => {
              const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (!isGradeColumn(cleanK)) return;

              const val = String(row[k] || '').trim();

              // Try to match column header to a subject
              const matchedSub = subjectByShortName[cleanK] || subjectByName[cleanK];
              if (matchedSub) {
                matchedBySubject[matchedSub.id] = val;
              } else {
                unmatchedGrades.push(val);
              }
            });

            // Find matching student in DB by globalId or sslcRegNo
            const regNoUpper = regNo.toUpperCase();
            const matchedStudent = students.find(st => {
              const gid = String(st.globalId || '').toUpperCase();
              const sslc = String(st.sslcRegNo || '').toUpperCase();
              return gid === regNoUpper || sslc === regNoUpper;
            });

            if (!matchedStudent) return;

            let gradesAssigned = 0;
            let positionalIdx = 0;

            availableSubjects.forEach(sub => {
              if (isSubjectApplicable && !isSubjectApplicable(matchedStudent.id, sub.id)) return;
              if (matchedBySubject[sub.id] !== undefined) {
                newGridData[matchedStudent.id][sub.id] = matchedBySubject[sub.id];
                gradesAssigned++;
              } else if (positionalIdx < unmatchedGrades.length) {
                newGridData[matchedStudent.id][sub.id] = unmatchedGrades[positionalIdx];
                positionalIdx++;
                gradesAssigned++;
              }
            });

            matchesFound++;
            const applicableCount = isSubjectApplicable ? availableSubjects.filter(sub => isSubjectApplicable(matchedStudent.id, sub.id)).length : availableSubjects.length;
            if (gradesAssigned < applicableCount) {
              mismatchedStudents.push(matchedStudent.name || name || regNo);
            }
          });

          if (matchesFound === 0) {
            toast.error('No matching students found in CSV. Check register numbers.');
          } else if (mismatchedStudents.length > 0) {
            const result = await Swal.fire({
              title: 'Incomplete Grades Detected!',
              html: `Fewer grades than expected for:<br/><br/><div style="max-height:150px;overflow-y:auto;text-align:left;background:#f3f4f6;padding:10px;border-radius:8px;">${mismatchedStudents.join('<br/>')}</div><br/>Edit manually or re-upload?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Edit Manually',
              cancelButtonText: 'Re-upload File',
              confirmButtonColor: '#4f46e5',
              cancelButtonColor: '#ef4444'
            });
            if (result.isConfirmed) {
              setGridData(newGridData);
              setHasUnsavedChanges(true);
              toast.success('Please fill in the missing grades manually.');
            }
          } else {
            setGridData(newGridData);
            setHasUnsavedChanges(true);
            toast.success(`Matched ${matchesFound} students from CSV. Please verify grades before saving.`);
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to parse CSV');
        } finally {
          setIsUploading(false);
          e.target.value = '';
        }
      },
      error: () => {
        toast.error('Error reading CSV file');
        setIsUploading(false);
        e.target.value = '';
      }
    });
  };

  const confirmSingleSubject = (subjectId: string) => {
    if (!onConfirmSubject) return;
    const subjectMarksData = students.map(st => {
      const val = gridData[st.id]?.[subjectId];
      let grade = '';
      let isAbsent = false;
      let markNum = 0;
      if (val) {
        if (val.toLowerCase() === 'ab' || val.toLowerCase() === 'absent') {
           isAbsent = true;
           grade = 'AB';
        } else if (selectedExam?.marksEntryMode === 'marks') {
           markNum = parseInt(val, 10) || 0;
        } else {
           grade = val;
        }
      }
      return {
        studentId: st.id,
        className: st.className || '10',
        isAbsent,
        grade,
        totalObtained: markNum,
        isEmpty: !val
      };
    });
    onConfirmSubject(subjectId, subjectMarksData);
  };

  const save = async (confirm: boolean, finalConfirm: boolean) => {
    const subjectsToSave = isSchoolUser && schoolCanEditSubject
      ? availableSubjects.filter(sub => schoolCanEditSubject(sub.id))
      : availableSubjects;

    if (isSchoolUser && subjectsToSave.length === 0) {
      toast.error('No confirmed subjects available for mark entry');
      return;
    }

    if (confirm || finalConfirm) {
      for (const st of students) {
        for (const sub of subjectsToSave) {
          if (isSubjectApplicable && !isSubjectApplicable(st.id, sub.id)) continue;
          if (isMutuallyExcluded(st.id, sub.id)) continue;

          const val = gridData[st.id]?.[sub.id];
          const valStr = val?.trim();
          
          const focusInput = () => {
            const inputEl = document.getElementById(`input-${st.id}-${sub.id}`);
            if (inputEl) {
              inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              inputEl.focus();
              inputEl.classList.add('animate-pulse', 'border-red-500', 'ring-2', 'ring-red-500');
              setTimeout(() => inputEl.classList.remove('animate-pulse', 'border-red-500', 'ring-2', 'ring-red-500'), 3000);
            }
          };

          if (!valStr) {
            toast.error(`Missing mark for ${st.name} in ${sub.name}. Please enter a valid grade or 'Ab' before confirming.`);
            focusInput();
            return;
          }
          if (selectedExam?.marksEntryMode === 'marks') {
            if (valStr.toLowerCase() !== 'ab' && valStr.toLowerCase() !== 'absent' && isNaN(Number(valStr))) {
               toast.error(`Invalid mark for ${st.name} in ${sub.name}. Must be a number or 'Ab'.`);
               focusInput();
               return;
            }
          }
        }
      }
    }

    setIsSaving(true);
    try {
      // Validate before saving
      if (selectedExam?.marksEntryMode === 'marks') {
        let invalidCount = 0;
        students.forEach(student => {
          subjectsToSave.forEach(sub => {
            if (isSubjectApplicable && !isSubjectApplicable(student.id, sub.id)) return;
            if (isMutuallyExcluded(student.id, sub.id)) return;
            const maxMark = resolveMaxMark(sub);
            const val = gridData[student.id]?.[sub.id];
            if (val && val.toLowerCase() !== 'ab' && !isNaN(Number(val)) && Number(val) > maxMark) {
              invalidCount++;
            }
          });
        });
        if (invalidCount > 0) {
          toast.error(`Validation Failed: Marks exceed maximum allowed limits. Please fix the red inputs.`);
          return;
        }
      }

      if (finalConfirm) {
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
      }

      const confirmedSubjectIds = new Set(subjectsToSave.map(s => s.id));
      const marksData = students.map(st => {
        const filteredSubjects: Record<string, string> = {};
        Object.entries(gridData[st.id] || {}).forEach(([subId, val]) => {
          if (confirmedSubjectIds.has(subId)) {
            filteredSubjects[subId] = val;
          }
        });
        return {
          studentId: st.id,
          className: st.className,
          subjects: filteredSubjects
        };
      });
      await onSave(marksData, confirm, finalConfirm);
      if (!confirm && !finalConfirm) {
        setHasUnsavedChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#161b22] rounded-3xl border border-gray-100 dark:border-[#30363d]">
        <PageLoader label="Loading Students" />
      </div>
    );
  }

  const getBulkStudentStatus = (studentId: string): 'PASS' | 'FAIL' | 'PENDING' => {
    const applicableSubjects = availableSubjects.filter(sub => !isSubjectApplicable || isSubjectApplicable(studentId, sub.id));
    if (applicableSubjects.length === 0) return 'PENDING';

    const isStudentAbsent = applicableSubjects.every(sub => gridData[studentId]?.[sub.id]?.toLowerCase() === 'ab');
    if (isStudentAbsent) return 'FAIL';

    let hasAnyMarks = false;
    let hasIncomplete = false;

    for (const sub of applicableSubjects) {
      const val = gridData[studentId]?.[sub.id];
      if (!val || val.toString().trim() === '') {
        hasIncomplete = true;
        continue;
      }
      if (val.toString().toLowerCase() === 'ab') return 'FAIL';

      hasAnyMarks = true;
      const maxMark = resolveMaxMark(sub);
      if (selectedExam?.marksEntryMode === 'marks') {
        const numVal = Number(val);
        if (!isNaN(numVal) && maxMark > 0) {
          const pct = Math.round((numVal * 100) / maxMark);
          if (pct < 30) return 'FAIL';
        }
      } else {
        if (val.toString().trim().toUpperCase() === 'E') return 'FAIL';
      }
    }

    if (!hasAnyMarks) return 'PENDING';

    return 'PASS';
  };

  if (students.length === 0) {
    return (
      <div className="bg-white dark:bg-[#161b22] rounded-3xl p-12 text-center text-gray-400 font-bold uppercase border border-gray-100 dark:border-[#30363d]">
        No students found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section with optional CSV upload (School only) */}
      {isAllComplete && user?.role === 'SCHOOL' && (
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-[#161b22] p-6 rounded-3xl border border-gray-100 dark:border-[#30363d] shadow-sm">
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 dark:text-white">
              <FileText className="text-indigo-600" />
              Consolidated Marks Entry
            </h2>
            <p className="text-sm text-gray-500 font-bold mt-1">
              {selectedExam?.allow_csv_upload !== false
                ? "Upload CSV or enter grades manually for all subjects."
                : "Enter grades manually for all subjects."}
            </p>
          </div>
          
          {!isFinalLocked && (
            <div className="flex items-center gap-3">
              {selectedExam?.allow_csv_upload !== false && (
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all"
                  >
                    {isUploading ? (
                      <span className="animate-pulse">Parsing CSV...</span>
                    ) : (
                      <>
                        <Upload size={18} />
                        Upload CSV
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Final Confirmation panel (moved above table) ─────────────── */}
      {isAllInputsCompleted && !isFinalLocked && user?.role === 'SCHOOL' && (
        <div className="bg-white dark:bg-[#161b22] rounded-3xl border border-indigo-200 dark:border-indigo-900 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 px-6 py-4 border-b border-amber-100 dark:border-amber-900/30">
            <AlertCircle size={20} className="flex-shrink-0" />
            <p className="text-sm font-bold">Entries completed. Declare final submission below to lock permanently.</p>
          </div>
          <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <label className="flex items-start gap-3 cursor-pointer flex-1">
              <input
                type="checkbox"
                id="declareFinal"
                checked={hasDeclaredFinal}
                onChange={(e) => setHasDeclaredFinal(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-indigo-300 dark:border-indigo-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 select-none leading-relaxed">
                I assure all subjects are completed and marks are verified. Once finalized, marks cannot be edited without Admin permission.
              </span>
            </label>
            <button
              onClick={() => save(true, true)}
              disabled={!hasDeclaredFinal || isSaving}
              className="shrink-0 flex items-center gap-2 bg-indigo-600 text-white px-7 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle size={15} />
                  Submit Final
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-gray-100 dark:border-[#30363d] min-h-[400px] relative table-wrapper">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="sticky top-0 z-30 bg-gray-50 dark:bg-[#1a1f26] shadow-sm">
            <tr className="border-b-2 border-gray-100 dark:border-[#30363d] bg-gray-50 dark:bg-[#1a1f26]">
              <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 min-w-[150px] sticky top-0 bg-gray-50 dark:bg-[#1a1f26] z-30">Student Name</th>
              <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center sticky top-0 bg-gray-50 dark:bg-[#1a1f26] z-30">Abs</th>
              {availableSubjects.map((sub, idx) => {
                const isSubLocked = lockedSubjects.includes(sub.id);
                const isComplete = isSubjectComplete(sub.id);
                const maxMark = resolveMaxMark(sub);
                const fullName = sub.name || sub.shortName || 'Subject';
                const hoverTitle = maxMark > 0 ? `${fullName} (Max: ${maxMark})` : fullName;
                return (
                  <th 
                    key={sub.id} 
                    title={hoverTitle}
                    className={`px-4 py-3 text-center border-r border-gray-200 dark:border-[#30363d] cursor-help sticky top-0 bg-gray-50 dark:bg-[#1a1f26] z-30 ${isSubLocked ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}
                  >
                    <div className="flex flex-col items-center justify-center mb-0.5">
                      <span className="font-semibold text-slate-800 dark:text-white whitespace-nowrap text-xs">{sub.shortName || 'Subject'}</span>
                    </div>
                    {!isFinalLocked && (
                      <div className="mt-1 flex justify-center h-8 items-center">
                        {isSubLocked ? (
                          user?.role === 'SCHOOL' ? (
                            <button
                              onClick={() => onResetSubject && onResetSubject(sub.id)}
                              className="px-3 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
                            >
                              Reset
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                              <CheckCircle size={12} /> Locked
                            </div>
                          )
                        ) : null}
                      </div>
                    )}
                  </th>
                );
              })}
              {user?.role === 'SCHOOL' ? (
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 text-center border-r border-gray-200 dark:border-[#30363d] w-20 sticky top-0 bg-gray-50 dark:bg-[#1a1f26] z-30">
                  Status
                </th>
              ) : user?.role === 'TEACHER' ? (
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 text-center border-l border-gray-200 dark:border-[#30363d] w-14 sticky top-0 bg-gray-50 dark:bg-[#1a1f26] z-30">
                  Action
                </th>
              ) : null}
            </tr>
          </thead>
            <tbody>
              {students.map((student, sIdx) => {
                const applicableSubjects = availableSubjects.filter(sub => !isSubjectApplicable || isSubjectApplicable(student.id, sub.id));
                const isStudentAbsent = applicableSubjects.length > 0 && applicableSubjects.every(sub => gridData[student.id]?.[sub.id]?.toLowerCase() === 'ab');
                const hasAnyMarks = applicableSubjects.some(sub => gridData[student.id]?.[sub.id] && gridData[student.id]?.[sub.id]?.toLowerCase() !== 'ab');
                
                return (
                <tr key={student.id} className={`border-b border-gray-50 dark:border-[#30363d] hover:bg-indigo-50/30 dark:hover:bg-indigo-950/15 transition-colors ${isStudentAbsent ? 'opacity-70 bg-gray-50 dark:bg-[#1f242c]/30' : ''}`}>
                  <td className="px-2 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 font-mono mt-0.5 min-w-[20px] text-right">
                        {sIdx + 1}.
                      </span>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{student.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">Reg: {student.globalId} | Class {student.className}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center border-r border-gray-100 dark:border-[#30363d]">
                    <input
                      type="checkbox"
                      checked={isStudentAbsent}
                      onChange={() => toggleAbsent(student.id)}
                      disabled={availableSubjects.some(s => lockedSubjects.includes(s.id) || (isSchoolUser && !!schoolCanEditSubject && !schoolCanEditSubject(s.id))) || isFinalLocked || (hasAnyMarks && !isStudentAbsent)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title={hasAnyMarks && !isStudentAbsent ? "Clear marks first to mark as Absent" : "Mark absent for all subjects"}
                    />
                  </td>
                  {availableSubjects.map((sub, idx) => {
                    const maxMark = resolveMaxMark(sub);
                    const val = gridData[student.id]?.[sub.id];
                    const notApplicable = isSubjectApplicable && !isSubjectApplicable(student.id, sub.id);

                    const sameCodeSubjects = availableSubjects.filter(s => s.shortName === sub.shortName && s.id !== sub.id);
                    const sameCodeHasMarks = sameCodeSubjects.some(s => {
                      const otherVal = gridData[student.id]?.[s.id];
                      return otherVal && otherVal.toString().trim() !== '';
                    });
                    const mutuallyExcluded = !notApplicable && sameCodeHasMarks && (!val || val.toString().trim() === '');

                    const isInvalid = !notApplicable && !mutuallyExcluded && selectedExam?.marksEntryMode === 'marks' && val && val.toLowerCase() !== 'ab' && !isNaN(Number(val)) && Number(val) > maxMark;
                    
                    if (notApplicable || mutuallyExcluded) {
                      return (
                        <td key={sub.id} className="px-1 py-3 text-center">
                          <div className="w-12 mx-auto py-1 text-center text-xs font-bold text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-not-allowed select-none">
                            N/A
                          </div>
                        </td>
                      );
                    }
                    
                    return (
                    <td key={sub.id} className="px-1 py-3 text-center">
                      <input
                        id={`input-${student.id}-${sub.id}`}
                        type="text"
                        value={val || ''}
                        onChange={(e) => handleGradeChange(student.id, sub.id, e.target.value, sIdx, idx)}
                        onKeyDown={(e) => handleKeyDown(e, sIdx, idx)}
                        disabled={lockedSubjects.includes(sub.id) || isFinalLocked || isStudentAbsent || (isSchoolUser && !!schoolCanEditSubject && !schoolCanEditSubject(sub.id))}
                        className={`w-12 px-1 py-1 text-center text-sm font-bold border-2 rounded-lg bg-transparent text-slate-800 dark:text-white outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:opacity-60 ${
                          isInvalid
                            ? 'border-red-500 focus:border-red-600 focus:ring-red-500 text-red-600'
                            : (!val || val.toString().trim() === '')
                              ? 'border-blue-400 dark:border-blue-500 focus:border-blue-500 focus:ring-0'
                              : 'border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-0'
                        }`}
                        placeholder={isStudentAbsent ? "Ab" : "-"}
                      />
                    </td>
                  )})}
                  {user?.role === 'SCHOOL' ? (
                    <td className="px-2 py-3 text-center border-r border-gray-100 dark:border-[#30363d] w-20 whitespace-nowrap">
                      {(() => {
                        const status = getBulkStudentStatus(student.id);
                        if (status === 'PASS') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
                              Pass
                            </span>
                          );
                        }
                        if (status === 'FAIL') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                              <AlertCircle size={12} className="text-rose-600 dark:text-rose-400" />
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
                  ) : user?.role === 'TEACHER' ? (
                    <td className="px-2 py-3 text-center sticky right-0 bg-white dark:bg-[#161b22] z-10 border-l border-gray-100 dark:border-[#30363d] w-14">
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (onDeleteStudentMarks) {
                            onDeleteStudentMarks(student).then((wasDeleted) => {
                              if (wasDeleted) {
                                setGridData(prev => {
                                  const next = { ...prev };
                                  if (next[student.id]) {
                                    const cleared: Record<string, string> = {};
                                    Object.keys(next[student.id]).forEach(k => { cleared[k] = ''; });
                                    next[student.id] = cleared;
                                  }
                                  return next;
                                });
                              }
                            });
                          }
                        }}
                        disabled={isFinalLocked}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
                        title={`Delete all subject marks for ${student.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  ) : null}
                </tr>
              )})}
            </tbody>
          </table>
        </div>




    </div>
  );
};
