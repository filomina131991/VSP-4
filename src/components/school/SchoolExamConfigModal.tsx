import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings2, 
  X,
  BookOpen, 
  CheckSquare,
  Hash,
  RotateCcw
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import PageLoader from '../common/PageLoader';
import Modal from '../common/Modal';

interface Subject {
  id: string;
  _id?: string;
  name: string;
  shortName: string;
  code?: string;
  medium?: string;
  mediumId?: string;
  mediumName?: string;
  category?: string;
  paperType?: string;
}

interface CodeMarksEntry {
  code: string;
  label: string;
  maxMarks: number;
}

const PAPER_CODE_LABELS: Record<string, string> = {
  P01: 'Language Paper I',
  P02: 'Language Paper II',
  P03: 'Second Language',
  P04: 'Third Language',
  P05: 'Social Science',
  P06: 'Physics',
  P07: 'Chemistry',
  P08: 'Biology',
  P09: 'Mathematics',
  P10: 'ICT',
};

const DEFAULT_CODE_MARKS: Record<string, number> = {
  P01: 40, P02: 40, P03: 80, P04: 40, P05: 80,
  P06: 40, P07: 40, P08: 40, P09: 80, P10: 40,
};

const getMediumKey = (medium: string) => {
  const med = medium.toLowerCase();
  if (med.includes('tamil')) return ' TM';
  if (med.includes('english')) return ' EM';
  if (med.includes('malayalam')) return ' MM';
  if (med.includes('kannada')) return ' KM';
  return '';
};

interface SchoolExamConfigModalProps {
  onClose: () => void;
  initialExamId?: string;
}

const SchoolExamConfigModal: React.FC<SchoolExamConfigModalProps> = ({ onClose, initialExamId }) => {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || '');
  const [globalExam, setGlobalExam] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [availableMediums, setAvailableMediums] = useState<string[]>([]);
  const [activeMediumTab, setActiveMediumTab] = useState<string>('');
  const [languagesByMedium, setLanguagesByMedium] = useState<Record<string, string[]>>({});
  const [globalSubjects, setGlobalSubjects] = useState<Subject[]>([]);
  const [markGroupMap, setMarkGroupMap] = useState<Record<string, any[]>>({});
  const [totalStudentsByMedium, setTotalStudentsByMedium] = useState<Record<string, number>>({});
  
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [codeMarks, setCodeMarks] = useState<Record<string, number>>({ ...DEFAULT_CODE_MARKS });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [examsRes, subjectsRes, mgRes] = await Promise.all([
        apiClient.get('/management/exams'),
        apiClient.get('/management/subjects'),
        apiClient.get('/management/mark-groups')
      ]);
      setExams(examsRes.data);
      setGlobalSubjects(subjectsRes.data);
      const mgMap: Record<string, any[]> = {};
      (mgRes.data || []).forEach((cfg: any) => {
        mgMap[cfg.subjectId] = cfg.groups || [];
      });
      setMarkGroupMap(mgMap);

      if (examsRes.data.length > 0) {
        if (initialExamId && examsRes.data.find((e: any) => e.id === initialExamId)) {
          setSelectedExamId(initialExamId);
        } else {
          const defaultExam = examsRes.data.find((e: any) => e.isDefault) || examsRes.data[0];
          setSelectedExamId(defaultExam.id);
        }
      }
    } catch (err) {
      toast.error('Failed to load initial data');
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      const exam = exams.find(e => e.id === selectedExamId);
      setGlobalExam(exam);
      loadConfigAndDynamicData(selectedExamId);
    }
  }, [selectedExamId, exams]);

  const getSubjectsForMedium = (medium: string, langMap = languagesByMedium) => {
    const mediumUpper = medium.toUpperCase();
    const langs = (langMap[medium] || []).map(l => l.toUpperCase());

    return globalSubjects.filter(sub => {
      const name = (sub.name || '').toUpperCase();
      const short = (sub.shortName || '').toUpperCase();
      const subMedium = (sub.medium || '').toUpperCase();
      const subMediumName = (sub.mediumName || '').toUpperCase();
      const category = (sub.category || '').toUpperCase();

      if (sub.mediumId && subMediumName === mediumUpper) return true;

      if (subMedium === mediumUpper) return true;
      if (subMediumName === mediumUpper || subMediumName.includes(mediumUpper)) return true;

      if (langs.some(l => name === l || name.includes(l))) return true;

      if (name.includes(mediumUpper) && !name.includes('ADDL')) return true;

      if (category === 'SECOND_LANGUAGE' || category === 'THIRD_LANGUAGE' || category === 'CORE') {
        const paperType = (sub.paperType || sub.code || sub.shortName || '').toUpperCase();
        if (['P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'].includes(paperType)) return true;
        if (/^P\d{2}$/i.test(short)) return true;
      }

      return false;
    });
  };

  const loadConfigAndDynamicData = async (examId: string) => {
    setIsLoading(true);
    try {
      const [configRes, dynamicRes] = await Promise.all([
        apiClient.get(`/school/exam-config/${examId}`),
        apiClient.get(`/school/exam-config/${examId}/dynamic-data`)
      ]);

      const data = dynamicRes.data;
      const mediums = data.mediums || [];
      setAvailableMediums(mediums);
      setLanguagesByMedium(data.languagesByMedium || {});
      
      const totStudents = data.totalStudentsByMedium || {};
      setTotalStudentsByMedium(totStudents);
      
      const firstValidMed = mediums.find((m: string) => (totStudents[m] || 0) > 0) || mediums[0];
      if (firstValidMed) setActiveMediumTab(firstValidMed);

      const savedConfig = configRes.data;

      let initialSelected = new Set<string>();
      if (savedConfig && savedConfig.subjects && savedConfig.subjects.length > 0) {
        savedConfig.subjects.forEach((s: any) => initialSelected.add(s.subjectId));

        const savedMarks: Record<string, number> = { ...DEFAULT_CODE_MARKS };
        savedConfig.subjects.forEach((s: any) => {
          const sub = globalSubjects.find(gs => gs.id === s.subjectId);
          const code = (sub?.code || sub?.paperType || sub?.shortName || '').toUpperCase();
          if (code && s.groups && s.groups.length > 0) {
            const writtenGroup = s.groups.find((g: any) => g.name === 'Written');
            if (writtenGroup && writtenGroup.maxMarks > 0) {
              savedMarks[code] = writtenGroup.maxMarks;
            }
          }
        });
        setCodeMarks(savedMarks);
      } else {
        const currentExam = exams.find(e => e.id === examId);
        mediums.forEach((medium: string) => {
          getSubjectsForMedium(medium, data.languagesByMedium || {}).forEach(s => {
            const pType = (s.paperType || s.code || s.shortName || '').toUpperCase();
            const eMarks = currentExam?.maxMarks?.[s.id] ?? currentExam?.maxMarks?.[pType];
            if (!!eMarks) {
              initialSelected.add(s.id);
            }
          });
        });
        [...(data.commonSubjects?.p03 || []), ...(data.commonSubjects?.p04 || []), ...(data.commonSubjects?.core || [])].forEach((s: any) => {
          const sId = s._id || s.id;
          const pType = (s.paperType || s.code || s.shortName || '').toUpperCase();
          const eMarks = currentExam?.maxMarks?.[sId] ?? currentExam?.maxMarks?.[pType];
          if (!!eMarks) {
            initialSelected.add(sId);
          }
        });
        setCodeMarks({ ...DEFAULT_CODE_MARKS });
      }

      // Auto-select P01/P02 for Malayalam medium
      mediums.forEach((medium: string) => {
        if (medium === 'Malayalam' && (totStudents[medium] || 0) > 0) {
          getSubjectsForMedium(medium, data.languagesByMedium || {}).forEach(s => {
            const category = (s.category || '').toUpperCase();
            const paperType = (s.paperType || s.code || s.shortName || '').toUpperCase();
            if (paperType === 'P01' || paperType === 'P02' || category === 'FIRST_LANGUAGE') {
              initialSelected.add(s.id);
            }
          });
        }
      });
      setSelectedSubjectIds(initialSelected);
    } catch (err) {
      toast.error('Failed to load exam configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const activeTabSubjects = useMemo(() => {
    if (!activeMediumTab) return [];
    return getSubjectsForMedium(activeMediumTab);
  }, [activeMediumTab, globalSubjects, languagesByMedium]);

  const availableCodes = useMemo(() => {
    const codeSet = new Set<string>();
    availableMediums.forEach(medium => {
      getSubjectsForMedium(medium).forEach(sub => {
        const code = (sub.code || sub.paperType || sub.shortName || '').toUpperCase().trim();
        if (code && /^P\d{2}$/i.test(code)) codeSet.add(code);
      });
    });
    return Array.from(codeSet).sort((a, b) => parseInt(a.replace('P', '')) - parseInt(b.replace('P', '')));
  }, [globalSubjects, availableMediums, languagesByMedium]);

  const codeMarksList: CodeMarksEntry[] = useMemo(() => {
    return availableCodes.map(code => ({
      code,
      label: PAPER_CODE_LABELS[code] || code,
      maxMarks: codeMarks[code] || 100,
    }));
  }, [availableCodes, codeMarks]);

  const handleCodeMarksChange = (code: string, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0 || num > 999) return;
    setCodeMarks(prev => ({ ...prev, [code]: num }));
  };

  const applyMarksToAll = () => {
    const firstCode = availableCodes[0];
    if (!firstCode) return;
    const marks = codeMarks[firstCode] || 100;
    const updated: Record<string, number> = {};
    availableCodes.forEach(code => { updated[code] = marks; });
    setCodeMarks(updated);
    toast.success(`Applied ${marks} marks to all codes`);
  };

  const resetMarks = () => {
    setCodeMarks({ ...DEFAULT_CODE_MARKS });
    toast.success('Reset to default (100 marks per code)');
  };

  const toggleSubject = (subjectId: string) => {
    const newSet = new Set(selectedSubjectIds);
    if (newSet.has(subjectId)) newSet.delete(subjectId);
    else newSet.add(subjectId);
    setSelectedSubjectIds(newSet);
  };

  const handleSave = async () => {
    if (selectedSubjectIds.size === 0) {
      toast.error('Please select at least one subject');
      return;
    }
    setIsSaving(true);
    try {
      const subjectsArray = Array.from(selectedSubjectIds).map(subId => {
        const sub = globalSubjects.find(s => s.id === subId);
        const code = (sub?.code || sub?.paperType || sub?.shortName || '').toUpperCase();
        const configuredMarks = codeMarks[code] || 100;
        const baseGroups = markGroupMap[subId] || [];
        const groups = baseGroups;
        return { subjectId: subId, groups };
      });

      await apiClient.post('/school/exam-config', {
        examId: selectedExamId,
        subjects: subjectsArray
      });
      toast.success('Exam configuration saved successfully');
      onClose();
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} disableOutsideClick={true}>
      <div className="flex flex-col h-[85vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase flex items-center gap-2">
              <Settings2 className="text-indigo-600" /> Exam Configuration
            </h2>
            <p className="text-xs text-gray-500 font-bold mt-1">Set subject codes & select subjects per medium</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#30363d] rounded-xl transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0d1117]">
          {isLoading ? (
            <div className="py-20 flex justify-center"><PageLoader /></div>
          ) : availableMediums.length === 0 ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 p-8 rounded-3xl border border-amber-200 dark:border-amber-800/40 text-center text-amber-700 dark:text-amber-400 font-bold">
              No students or mediums found for this exam's academic year.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Subject Code Maximum Marks */}
              <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 border border-gray-100 dark:border-[#30363d] shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-[#30363d] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-xl">
                      <Hash className="text-amber-600 dark:text-amber-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">Subject Code Maximum Marks</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">Set marks per code - applies to all subjects with that code</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={applyMarksToAll} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1">
                      <RotateCcw size={12} /> Apply to All
                    </button>
                    <button onClick={resetMarks} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      Reset
                    </button>
                  </div>
                </div>

                {availableCodes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-gray-100 dark:border-[#30363d] rounded-xl">
                    No subject codes found. Add subjects in Subject Management first.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {codeMarksList.map(entry => (
                      <div key={entry.code} className="bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl p-3 text-center space-y-2 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
                        <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 tracking-widest block">{entry.code}</span>
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold block leading-tight min-h-[24px]">{entry.label}</span>
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={entry.maxMarks}
                          onChange={e => handleCodeMarksChange(entry.code, e.target.value)}
                          className="w-full text-center text-lg font-black text-amber-700 dark:text-amber-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg py-1.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                        />
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Max Marks</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medium Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-700">
                {availableMediums.map(medium => {
                  const medStudents = totalStudentsByMedium[medium] || 0;
                  return (
                  <button
                    key={medium}
                    disabled={medStudents === 0}
                    onClick={() => setActiveMediumTab(medium)}
                    className={`px-6 py-3 rounded-t-xl font-black text-sm whitespace-nowrap transition-all uppercase tracking-widest ${
                      medStudents === 0
                        ? 'text-gray-400 opacity-50 cursor-not-allowed'
                        : activeMediumTab === medium
                          ? 'bg-white dark:bg-[#161b22] text-indigo-600 border-t-2 border-l border-r border-gray-200 dark:border-[#30363d] border-t-indigo-600 shadow-sm'
                          : 'bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    {medium}
                  </button>
                )})}
              </div>

              {/* Active Tab Content */}
              <div className="bg-white dark:bg-[#161b22] rounded-b-3xl rounded-tr-3xl p-6 border border-gray-100 dark:border-[#30363d] shadow-sm min-h-[300px]">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-[#30363d] pb-4">
                  <h3 className="text-xl font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="text-indigo-600" size={24} />
                    {activeMediumTab} Subjects
                  </h3>
                </div>
                
                {activeTabSubjects.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest border-2 border-dashed border-gray-100 dark:border-[#30363d] rounded-2xl">
                    No subjects mapped for this medium
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{activeTabSubjects.map(sub => {
                        const isSelected = selectedSubjectIds.has(sub.id);
                        const isMalayalamMedium = activeMediumTab === 'Malayalam';
                        const paperType = (sub.paperType || sub.code || sub.shortName || '').toUpperCase();
                        const category = (sub.category || '').toUpperCase();
                        const isP01P02 = paperType === 'P01' || paperType === 'P02' || category === 'FIRST_LANGUAGE';
                        const isCore = ['P05', 'P06', 'P07', 'P08', 'P09', 'P10'].includes(paperType) || category === 'CORE';
                        const isP03P04 = paperType === 'P03' || paperType === 'P04' || category === 'SECOND_LANGUAGE' || category === 'THIRD_LANGUAGE';
                        // For Malayalam medium: only P01, P02, and Core (P05-P10) allowed. P03/P04 disabled (managed from student side)
                        const examMaxMarks = globalExam?.maxMarks?.[sub.id] ?? globalExam?.maxMarks?.[paperType];
                        const isZeroMarksInExam = !examMaxMarks;
                        const isDisabled = (isMalayalamMedium && isP03P04) || isZeroMarksInExam;

                      return (
                        <div 
                          key={sub.id}
                          onClick={() => { 
                            if (isZeroMarksInExam) {
                              toast.error('Concerned subject is not allowed for this exam configuration');
                              return;
                            }
                            if (!isDisabled) toggleSubject(sub.id); 
                          }}
                          className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                            isDisabled 
                              ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed dark:border-gray-800 dark:bg-gray-900'
                              : isSelected 
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 cursor-pointer' 
                                : 'border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#0d1117] hover:border-indigo-300 cursor-pointer'
                          }`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 dark:bg-[#0d1117] dark:border-gray-600'
                          }`}>
                            {isSelected && <CheckSquare size={14} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-black uppercase ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                              {sub.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {sub.shortName || sub.id}
                              </p>
                              {(sub.code || sub.paperType) && (
                                <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                                  {sub.code || sub.paperType} &middot; {codeMarks[(sub.code || sub.paperType || '').toUpperCase()] ?? 100} marks
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] flex justify-between items-center sticky bottom-0 z-10">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
            Selected Subjects: {selectedSubjectIds.size}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#30363d] transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || !selectedExamId || selectedSubjectIds.size === 0}
              className="px-6 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SchoolExamConfigModal;
