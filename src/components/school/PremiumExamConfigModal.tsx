import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Settings2, BookOpen, X, Search, ChevronDown, ChevronUp, ChevronRight,
  Users, Check, Trash2, Landmark, ClipboardList, BarChart3, Filter,
  GraduationCap, Target, Settings, Plus
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';

interface Subject {
  _id?: string;
  id?: string;
  name: string;
  shortName: string;
  code?: string;
  medium?: string;
  category?: string;
  paperType?: string;
  displayOrder?: number;
  groups?: { name: string; maxMarks: number; maxQuestions: number; total: number }[];
}

interface MediumSubjectGroup {
  p01: Subject[];
  p02: Subject[];
  p03: Subject[];
  p04: Subject[];
  core: Subject[];
  practical?: Subject[];
  optional?: Subject[];
}

interface PremiumExamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  examName: string;
  onSave: (subjects: { subjectId: string; groups: any[] }[]) => void;
  headerContent?: React.ReactNode;
}

const getMediumIconColorClass = (med: string) => {
  const map: Record<string, string> = {
    'Tamil': 'text-indigo-600',
    'English': 'text-emerald-600',
    'Malayalam': 'text-blue-500',
    'Kannada': 'text-orange-500',
    'Urdu': 'text-teal-600',
    'Arabic': 'text-pink-600',
  };
  return map[med] || 'text-indigo-600';
};

const getMediumActiveClasses = (med: string) => {
  const map: Record<string, { text: string, border: string, badgeBg: string, badgeText: string }> = {
    'Tamil': { text: 'text-indigo-600', border: 'border-indigo-100 shadow-md', badgeBg: 'bg-indigo-600', badgeText: 'text-white' },
    'English': { text: 'text-emerald-600', border: 'border-emerald-100 shadow-md', badgeBg: 'bg-emerald-600', badgeText: 'text-white' },
    'Malayalam': { text: 'text-blue-600', border: 'border-blue-100 shadow-md', badgeBg: 'bg-blue-600', badgeText: 'text-white' },
    'Kannada': { text: 'text-orange-600', border: 'border-orange-100 shadow-md', badgeBg: 'bg-orange-600', badgeText: 'text-white' },
    'Urdu': { text: 'text-teal-600', border: 'border-teal-100 shadow-md', badgeBg: 'bg-teal-600', badgeText: 'text-white' },
    'Arabic': { text: 'text-pink-600', border: 'border-pink-100 shadow-md', badgeBg: 'bg-pink-600', badgeText: 'text-white' },
  };
  return map[med] || map['Tamil'];
};

const filterOptions = ['All', 'Selected', 'Unselected', 'Paper I', 'Paper II', 'Sec & Third Lang', 'Core'];

const PremiumExamConfigModal: React.FC<PremiumExamConfigModalProps> = ({
  isOpen, onClose, examId, examName, onSave, headerContent
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availableMediums, setAvailableMediums] = useState<string[]>([]);
  const [activeMediumTab, setActiveMediumTab] = useState('');
  const [subjectsByMedium, setSubjectsByMedium] = useState<Record<string, MediumSubjectGroup>>({});
  const [commonSubjects, setCommonSubjects] = useState<{ p03: Subject[]; p04: Subject[]; core: Subject[] }>({ p03: [], p04: [], core: [] });
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [subjectStudentCounts, setSubjectStudentCounts] = useState<Record<string, Record<string, number>>>({});
  const [subjectIdCounts, setSubjectIdCounts] = useState<Record<string, Record<string, number>>>({});
  const [adminMaxMarks, setAdminMaxMarks] = useState<Record<string, number>>({});
  const [markGroupConfigs, setMarkGroupConfigs] = useState<Record<string, any[]>>({});
  const [editingMarkGroupSubject, setEditingMarkGroupSubject] = useState<any>(null);
  const [editingGroups, setEditingGroups] = useState<any[]>([]);
  const [isMarkGroupModalOpen, setIsMarkGroupModalOpen] = useState(false);
  const [divisionCounts, setDivisionCounts] = useState<Record<string, number>>({});
  const [totalStudentsByMedium, setTotalStudentsByMedium] = useState<Record<string, number>>({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialSelected, setInitialSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const [hasMarkGroups, setHasMarkGroups] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && examId) loadData();
  }, [isOpen, examId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [configRes, dynamicRes] = await Promise.all([
        apiClient.get(`/school/exam-config/${examId}`),
        apiClient.get(`/school/exam-config/${examId}/dynamic-data`)
      ]);
      const data = dynamicRes.data;
      if (data.exam && typeof data.exam.hasMarkGroups !== 'undefined') setHasMarkGroups(data.exam.hasMarkGroups);
      
      const allMediums = data.mediums?.length > 0 ? data.mediums : [];
      const totStudents = data.totalStudentsByMedium || {};
      const validMediums = allMediums.filter(m => (totStudents[m] || 0) > 0);
      setAvailableMediums(validMediums);
      
      // Ensure we have structure for all categories
      const procSubjects = data.subjectsByMedium || {};
      Object.keys(procSubjects).forEach(m => {
        if (!procSubjects[m].practical) procSubjects[m].practical = [];
        if (!procSubjects[m].optional) procSubjects[m].optional = [];
      });
      setSubjectsByMedium(procSubjects);
      
      const commSubs = data.commonSubjects || { p03: [], p04: [], core: [] };
      setCommonSubjects(commSubs);
      setStudentCounts(data.studentCounts || {});
      setSubjectStudentCounts(data.subjectStudentCounts || {});
      setSubjectIdCounts(data.subjectIdCounts || {});
      setMarkGroupConfigs(data.markGroupMap || {});
      setAdminMaxMarks(data.adminMaxMarks || {});
      setDivisionCounts(data.divisionCounts || {});
      setTotalStudentsByMedium(totStudents);
      setTotalStudents(data.totalStudents || 0);
      
      if (validMediums.length > 0) setActiveMediumTab(validMediums[0]);
      else setActiveMediumTab('');

      const saved = configRes.data;
      const initSel = new Set<string>();
      if (saved?.subjects?.length > 0) {
        saved.subjects.forEach((s: any) => initSel.add(s.subjectId));
      } else {
        allMediums.forEach((med: string) => {
          const group = procSubjects[med];
          if (group) {
            [...(group.p01 || []), ...(group.p02 || [])].forEach((s: Subject) => {
              const id = s._id || s.id;
              if (id) initSel.add(id);
            });
          }
        });
        [...(commSubs.p03 || []), ...(commSubs.p04 || []), ...(commSubs.core || [])].forEach((s: Subject) => {
          const id = s._id || s.id;
          if (id) initSel.add(id);
        });
      }

      // Ensure all subjects for any medium with 0 students are unchecked
      allMediums.forEach((med: string) => {
        if ((totStudents[med] || 0) === 0) {
          const group = procSubjects[med];
          if (group) {
            const medSubjects = [
              ...(group.p01 || []),
              ...(group.p02 || []),
              ...(group.p03 || []),
              ...(group.p04 || []),
              ...(group.core || []),
              ...(group.practical || []),
              ...(group.optional || [])
            ];
            medSubjects.forEach((s: Subject) => {
              const id = s._id || s.id;
              if (id) initSel.delete(id);
            });
          }
        }
      });

      const checkAndUncheck0CountLangs = (list: Subject[]) => {
        list.forEach((s: Subject) => {
          const id = (s._id || s.id || '').toString();
          if (!id) return;
          const pCodeMatch = String(s.code || s.shortName || s.name || '').toUpperCase().match(/\bP0[1-4]\b/);
          const isLang = s.category === 'FIRST_LANGUAGE' || s.category === 'SECOND_LANGUAGE' || s.category === 'THIRD_LANGUAGE' || pCodeMatch || s.paperType === 'FIRST_LANGUAGE' || s.paperType === 'SECOND_LANGUAGE' || s.paperType === 'THIRD_LANGUAGE';
          if (isLang) {
            let totalLangStudents = 0;
            allMediums.forEach((med: string) => {
              const medMap = data.subjectIdCounts?.[med] || {};
              if (medMap[id] !== undefined) {
                totalLangStudents += medMap[id];
              }
            });
            if (totalLangStudents === 0) {
              initSel.delete(id);
            }
          }
        });
      };

      allMediums.forEach((med: string) => {
        const group = procSubjects[med];
        if (group) {
          checkAndUncheck0CountLangs([...(group.p01 || []), ...(group.p02 || []), ...(group.p03 || []), ...(group.p04 || []), ...(group.core || [])]);
        }
      });
      checkAndUncheck0CountLangs([...(commSubs.p03 || []), ...(commSubs.p04 || []), ...(commSubs.core || [])]);

      setSelectedIds(initSel);
      setInitialSelected(new Set(initSel));
    } catch {
      toast.error('Failed to load exam data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubject = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const getSubjectStudentCount = (sub: Subject, mediumTab: string): number => {
    const subId = (sub._id || sub.id || '').toString();
    const medIdCounts = subjectIdCounts[mediumTab];
    if (medIdCounts && subId && medIdCounts[subId] !== undefined) return medIdCounts[subId];

    const short = (sub.shortName || '').toUpperCase();
    const name = (sub.name || '').toUpperCase();
    const combined = (short + ' ' + name).trim();

    const codeMatch = combined.match(/\bP(\d{2})\b/);
    if (codeMatch) {
      const pNum = parseInt(codeMatch[1], 10);
      const isCore = pNum >= 5 && pNum <= 10;
      if (isCore) {
        const pCode = `P${codeMatch[1]}`;
        const medCounts = subjectStudentCounts[mediumTab];
        if (medCounts && medCounts[pCode] !== undefined) return medCounts[pCode];
        return totalStudentsByMedium[mediumTab] || 0;
      }
    }

    let count = 0;
    Object.entries(studentCounts).forEach(([k, v]) => {
      const kUp = k.toUpperCase().trim();
      if (kUp === name || (short && kUp === short)) count += v;
    });
    return count;
  };

  const handleOpenMarkGroups = (e: React.MouseEvent, sub: any) => {
    e.stopPropagation();
    const subId = sub._id || sub.id || '';
    let existing = markGroupConfigs[subId] || [];
    if (existing.length === 1 && ((existing[0].name === 'Written' && Number(existing[0].maxMarks) === 100) || (existing[0].name === '1 Marks' && Number(existing[0].maxMarks) === 1)) && !existing[0].isConfigured) {
      existing = [];
    }
    setEditingMarkGroupSubject(sub);
    setEditingGroups(existing.length > 0 ? [...existing.map((g: any) => ({...g}))] : [{ name: '1 Marks', maxMarks: 1, maxQuestions: 1, total: 1 }]);
    setIsMarkGroupModalOpen(true);
  };

  const handleAddGroup = () => setEditingGroups(prev => {
    const nextMark = prev.length > 0 ? prev.length + 1 : 1;
    return [...prev, { name: `${nextMark} Marks`, maxMarks: nextMark, maxQuestions: 1, total: nextMark }];
  });
  const handleRemoveGroup = (idx: number) => setEditingGroups(prev => prev.filter((_, i) => i !== idx));

  const handleGroupChange = (idx: number, field: string, val: string | number | boolean) => {
    setEditingGroups(prev => {
      const next = [...prev];
      const grp = { ...next[idx], [field]: val };
      if (field === 'maxMarks' || field === 'maxQuestions') {
        const m = Number(field === 'maxMarks' ? val : grp.maxMarks) || 0;
        const q = Number(field === 'maxQuestions' ? val : grp.maxQuestions) || 0;
        grp.total = m * q;
      }
      next[idx] = grp;
      return next;
    });
  };

  const handleSaveMarkGroups = async () => {
    if (!editingMarkGroupSubject) return;
    const subId = editingMarkGroupSubject._id || editingMarkGroupSubject.id;
    const validGroups = editingGroups.filter(g => g.name.trim() && g.maxMarks > 0).map(g => ({
      ...g,
      isConfigured: true
    }));
    if (validGroups.length === 0) {
      toast.error('Add at least one mark group with marks > 0');
      return;
    }

    const adminMax = adminMaxMarks[subId] || 50;
    const configuredTotal = validGroups.reduce((sum, g) => sum + (Number(g.total) || 0), 0);
    if (configuredTotal !== adminMax) {
      toast.error(`Please set the maximum marks correctly. Allowed marks: ${adminMax}, Configured marks: ${configuredTotal}`);
      return;
    }

    try {
      if (examId) {
        await apiClient.post('/school/exam-config/mark-groups', {
          examId,
          subjectId: subId,
          groups: validGroups
        });
      }
      setMarkGroupConfigs(prev => ({ ...prev, [subId]: validGroups }));
      toast.success('Marks group configured successfully');
      setIsMarkGroupModalOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save mark group');
    }
  };

  const handleClearAll = async () => {
    if (!examId) return;
    setIsSaving(true);
    try {
      await apiClient.post('/school/exam-config', { examId, subjects: [] });
      setSelectedIds(new Set());
      setMarkGroupConfigs({});
      toast.success('Subjects cleared successfully');
      onSave([]);
    } catch {
      toast.error('Failed to clear subjects');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one subject');
      return;
    }
    setIsSaving(true);
    try {
      const subjectsArray = Array.from(selectedIds).map(subId => {
        let groups = markGroupConfigs[subId] || [{ name: '1 Marks', maxMarks: 1, maxQuestions: 1, total: 1 }];
        return { subjectId: subId, groups };
      });
      await apiClient.post('/school/exam-config', { examId, subjects: subjectsArray });
      toast.success('Configuration saved');
      onSave(subjectsArray);
      onClose();
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const sortSubjectsByShortName = (list: Subject[]): Subject[] => {
    return [...list].sort((a, b) => {
      const aMatch = (a.shortName || '').match(/P(\d+)/i);
      const bMatch = (b.shortName || '').match(/P(\d+)/i);
      if (aMatch && bMatch) return parseInt(aMatch[1]) - parseInt(bMatch[1]);
      if (aMatch) return -1;
      if (bMatch) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  const activeTabData = useMemo(() => {
    if (!activeMediumTab || !subjectsByMedium[activeMediumTab]) {
      return { p01: [], p02: [], p03: commonSubjects.p03 || [], p04: commonSubjects.p04 || [], core: commonSubjects.core || [], practical: [], optional: [] };
    }
    const group = subjectsByMedium[activeMediumTab];
    return {
      p01: sortSubjectsByShortName(group.p01 || []),
      p02: sortSubjectsByShortName(group.p02 || []),
      p03: sortSubjectsByShortName([...(group.p03 || []), ...(commonSubjects.p03 || [])]),
      p04: sortSubjectsByShortName([...(group.p04 || []), ...(commonSubjects.p04 || [])]),
      core: sortSubjectsByShortName([...(group.core || []), ...(commonSubjects.core || [])]),
      practical: sortSubjectsByShortName(group.practical || []),
      optional: sortSubjectsByShortName(group.optional || [])
    };
  }, [activeMediumTab, subjectsByMedium, commonSubjects]);

  const filterSubjectList = (list: Subject[]) => {
    return sortSubjectsByShortName(list.filter(s => {
      const name = (s.name || '').toUpperCase();
      const short = (s.shortName || '').toUpperCase();
      if (searchQuery && !name.includes(searchQuery.toUpperCase()) && !short.includes(searchQuery.toUpperCase())) return false;
      if (activeFilter === 'Selected' && !selectedIds.has(s._id || s.id || '')) return false;
      if (activeFilter === 'Unselected' && selectedIds.has(s._id || s.id || '')) return false;
      return true;
    }));
  };

  const filteredP01 = useMemo(() => filterSubjectList(activeTabData.p01), [activeTabData, searchQuery, activeFilter, selectedIds]);
  const filteredP02 = useMemo(() => filterSubjectList(activeTabData.p02), [activeTabData, searchQuery, activeFilter, selectedIds]);
  const filteredP03 = useMemo(() => filterSubjectList(activeTabData.p03), [activeTabData, searchQuery, activeFilter, selectedIds]);
  const filteredP04 = useMemo(() => filterSubjectList(activeTabData.p04), [activeTabData, searchQuery, activeFilter, selectedIds]);
  const filteredCore = useMemo(() => filterSubjectList(activeTabData.core), [activeTabData, searchQuery, activeFilter, selectedIds]);

  const getMediumTabCount = (med: string): number => {
    const g = subjectsByMedium[med];
    const mediumCount = g ? (g.p01?.length || 0) + (g.p02?.length || 0) + (g.p03?.length || 0) + (g.p04?.length || 0) + (g.core?.length || 0) + (g.practical?.length || 0) + (g.optional?.length || 0) : 0;
    return mediumCount + (commonSubjects.p03?.length || 0) + (commonSubjects.p04?.length || 0) + (commonSubjects.core?.length || 0);
  };

  const getDivisionsForMedium = (): number => {
    return divisionCounts[activeMediumTab] || 0;
  };

  const activeMediumStudents = totalStudentsByMedium[activeMediumTab] || 0;

  const selectedP01Count = useMemo(() => {
    const g = subjectsByMedium[activeMediumTab];
    return g ? (g.p01 || []).filter(s => selectedIds.has(s._id || s.id || '')).length : 0;
  }, [activeMediumTab, subjectsByMedium, selectedIds]);

  const selectedP02Count = useMemo(() => {
    const g = subjectsByMedium[activeMediumTab];
    return g ? (g.p02 || []).filter(s => selectedIds.has(s._id || s.id || '')).length : 0;
  }, [activeMediumTab, subjectsByMedium, selectedIds]);

  const selectedP03Count = useMemo(() => {
    const g = subjectsByMedium[activeMediumTab];
    return g ? (g.p03 || []).filter(s => selectedIds.has(s._id || s.id || '')).length : 0;
  }, [activeMediumTab, subjectsByMedium, selectedIds]);

  const selectedP04Count = useMemo(() => {
    const g = subjectsByMedium[activeMediumTab];
    return g ? (g.p04 || []).filter(s => selectedIds.has(s._id || s.id || '')).length : 0;
  }, [activeMediumTab, subjectsByMedium, selectedIds]);

  const selectedCoreCount = useMemo(() => {
    const g = subjectsByMedium[activeMediumTab];
    return g ? (g.core || []).filter(s => selectedIds.has(s._id || s.id || '')).length : 0;
  }, [activeMediumTab, subjectsByMedium, selectedIds]);

  const p01EligibleStudents = useMemo(() => {
    return activeTabData.p01.reduce((sum, s) => sum + getSubjectStudentCount(s, activeMediumTab), 0);
  }, [activeTabData, activeMediumTab, subjectIdCounts, subjectStudentCounts, totalStudentsByMedium, studentCounts]);

  const p02EligibleStudents = useMemo(() => {
    return activeTabData.p02.reduce((sum, s) => sum + getSubjectStudentCount(s, activeMediumTab), 0);
  }, [activeTabData, activeMediumTab, subjectIdCounts, subjectStudentCounts, totalStudentsByMedium, studentCounts]);

  const p03EligibleStudents = useMemo(() => {
    return activeTabData.p03.reduce((sum, s) => sum + getSubjectStudentCount(s, activeMediumTab), 0);
  }, [activeTabData, activeMediumTab, subjectIdCounts, subjectStudentCounts, totalStudentsByMedium, studentCounts]);

  const p04EligibleStudents = useMemo(() => {
    return activeTabData.p04.reduce((sum, s) => sum + getSubjectStudentCount(s, activeMediumTab), 0);
  }, [activeTabData, activeMediumTab, subjectIdCounts, subjectStudentCounts, totalStudentsByMedium, studentCounts]);

  const coreEligibleStudents = useMemo(() => {
    return activeTabData.core.reduce((sum, s) => sum + getSubjectStudentCount(s, activeMediumTab), 0);
  }, [activeTabData, activeMediumTab, subjectIdCounts, subjectStudentCounts, totalStudentsByMedium, studentCounts]);

  const stats = useMemo(() => {
    let coveredStudents = 0;
    const group = subjectsByMedium[activeMediumTab];
    if (group) {
      const all = [...(group.p01 || []), ...(group.p02 || []), ...(group.p03 || []), ...(group.p04 || []), ...(group.core || []), ...(group.practical || []), ...(group.optional || [])];
      all.forEach(s => {
        const id = s._id || s.id || '';
        if (selectedIds.has(id)) {
          coveredStudents += getSubjectStudentCount(s, activeMediumTab);
        }
      });
    }
    return { coveredStudents };
  }, [selectedIds, activeMediumTab, subjectsByMedium, subjectIdCounts, subjectStudentCounts, totalStudentsByMedium, studentCounts]);

  if (!isOpen) return null;

  // Only Malayalam medium is restricted (P01, P02 only + Core)
  const isMalayalamMedium = activeMediumTab === 'Malayalam';

  const isMarkGroupConfigured = (subId: string) => {
    const groups = markGroupConfigs[subId];
    if (!groups || !Array.isArray(groups) || groups.length === 0) return false;
    if (groups.length === 1) {
      const g = groups[0];
      if (((g.name === 'Written' && Number(g.maxMarks) === 100) || (g.name === '1 Marks' && Number(g.maxMarks) === 1)) && !g.isConfigured) {
        return false;
      }
    }
    return true;
  };

  const SubjectCard: React.FC<{ sub: Subject; category: string }> = ({ sub, category }) => {
    const subId = sub._id || sub.id || '';
    const isSelected = selectedIds.has(subId);
    const sCount = getSubjectStudentCount(sub, activeMediumTab);
    const dCount = getDivisionsForMedium();
    const isZeroStudentMedium = (totalStudentsByMedium[activeMediumTab] || 0) === 0;
    const pCodeMatch = String(sub.code || sub.shortName || sub.name || '').toUpperCase().match(/\bP0[1-4]\b/);
    const isCoreSubject = category === 'core';
    const isLangCat = category === 'p01' || category === 'p02' || category === 'p03' || category === 'p04' || sub.category === 'FIRST_LANGUAGE' || sub.category === 'SECOND_LANGUAGE' || sub.category === 'THIRD_LANGUAGE' || pCodeMatch || sub.paperType === 'FIRST_LANGUAGE' || sub.paperType === 'SECOND_LANGUAGE' || sub.paperType === 'THIRD_LANGUAGE';
    // For Malayalam medium: only P01 and P02 enabled. P03, P04 disabled (managed from student side). P05-P10 (Core) always enabled.
    const isDisabled = (isMalayalamMedium && (category === 'p03' || category === 'p04')) || isZeroStudentMedium || (isLangCat && sCount === 0);

    return (
      <div
        
        className={`p-4 rounded-xl border-2 flex flex-col gap-3 transition-all duration-200 ${
          isDisabled 
            ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
            : isSelected 
              ? 'border-indigo-600 bg-indigo-50/30 shadow-sm' 
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer'
        }`}
      >
        <div className="flex justify-between items-start">
        <div className="flex gap-3 min-w-0">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (!isDisabled) toggleSubject(subId);
            }}
            className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
            isDisabled
              ? 'border-2 border-gray-200 bg-gray-100 text-gray-400'
              : isSelected 
                ? 'bg-indigo-600 border-indigo-600 text-white cursor-pointer' 
                : 'border-2 border-gray-300 bg-white cursor-pointer hover:border-gray-400'
          }`}>
             {(isSelected && !isDisabled) && <Check size={14} strokeWidth={3} />}
          </div>
          
          <div className="flex flex-col min-w-0">
             <span className="font-bold text-gray-900 text-[14px] leading-tight truncate">{sub.name}</span>
             <span className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide font-medium">
               {sub.shortName || subId.slice(-4)} &bull; {activeMediumTab}
             </span>
             <span className="text-[10px] text-gray-400 mt-0.5 font-medium capitalize">
               {category === 'p01' ? 'Paper I' : category === 'p02' ? 'Paper II' : category === 'p03' ? '2nd Language' : category === 'p04' ? '3rd Language' : 'Core Subject'}
             </span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5 items-end flex-shrink-0 ml-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
            sCount > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <Users size={12} strokeWidth={2.5} /> {sCount}
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold">
            <Landmark size={12} strokeWidth={2.5} /> {dCount}
          </div>
        </div>
        </div>
        {isSelected && hasMarkGroups && (
           <button type="button" onClick={(e) => handleOpenMarkGroups(e, sub)} className={`w-full py-2 text-xs font-bold rounded-lg border shadow-sm transition-colors ${isMarkGroupConfigured(subId) ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`} title="Configure Marks">
             Configure Marks
           </button>
        )}
      </div>
    );
  };

  const modalContent = (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-[#0b1c30]/70 backdrop-blur-md p-0 sm:p-4 md:p-6 transition-all">
      <div className="w-full h-full sm:h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] max-w-[1100px] bg-[#f8f9ff] sm:rounded-3xl shadow-[0_20px_60px_rgba(11,_28,_48,_0.5)] flex flex-col font-sans animate-in slide-in-from-top-4 zoom-in-95 duration-300 relative border border-white/40 ring-1 ring-indigo-500/10 mt-0 sm:mt-6 overflow-hidden">
        {/* Header */}
      <header className="bg-white border-b border-gray-200 flex items-center justify-between px-6 py-4 w-full z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Settings2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight uppercase">EXAM CONFIGURATION</h1>
              <p className="text-sm text-gray-500 font-medium">Select subjects per medium &bull; {examName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {headerContent}
          <button onClick={onClose} className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors bg-white shadow-sm">
            <X size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      {/* Tabs Row */}
      <div className="bg-white border-b border-gray-100 px-8 py-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar relative z-40 shadow-sm">
        {availableMediums.map(med => {
          const count = getMediumTabCount(med);
          const isActive = activeMediumTab === med;
          const activeStyle = getMediumActiveClasses(med);
          const iconColor = getMediumIconColorClass(med);
          const medStudents = totalStudentsByMedium[med] || 0;
          
          return (
            <button
              key={med}
              type="button"
              onClick={() => setActiveMediumTab(med)}
              className={`flex items-center gap-3 px-5 py-2 rounded-2xl text-[14px] font-bold transition-all border ${
                isActive 
                  ? `${activeStyle.border} bg-white ${activeStyle.text} shadow-sm ring-1 ring-indigo-50/50` 
                  : medStudents === 0
                    ? 'border-gray-200 text-gray-400 bg-gray-50/80 hover:bg-gray-100'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <BookOpen size={17} className={isActive ? activeStyle.text : iconColor} />
              <span className="tracking-wide">{med}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                isActive ? `${activeStyle.badgeBg} ${activeStyle.badgeText}` : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
              {medStudents > 0 && (
                <span className="text-[10px] text-gray-400 font-medium ml-0.5">{medStudents}st</span>
              )}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search subjects..."
              className="w-52 pl-8 pr-3 py-2 bg-gray-50 rounded-full border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none text-xs shadow-sm transition-all placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-gray-50 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 z-30 flex-shrink-0 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {filterOptions.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                activeFilter === f
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          <button className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 bg-white transition-all text-gray-600 shadow-sm">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <aside className="w-[240px] flex-shrink-0 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-2.5 overflow-y-auto custom-scrollbar">
          <div className="mb-1">
            <h2 className="text-[11px] font-black text-indigo-700 tracking-widest uppercase">Selection Summary</h2>
          </div>

          {/* Card 1: Subjects Selected */}
          <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-3 relative">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
              <ClipboardList size={22} strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-indigo-700 leading-none">{selectedIds.size}</span>
                <span className="text-[12px] font-bold text-gray-500">/ {getMediumTabCount(activeMediumTab)} subjects</span>
              </div>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {selectedP01Count > 0 && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">P01:{selectedP01Count}</span>}
                {selectedP02Count > 0 && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">P02:{selectedP02Count}</span>}
                {selectedP03Count > 0 && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">P03:{selectedP03Count}</span>}
                {selectedP04Count > 0 && <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-bold">P04:{selectedP04Count}</span>}
                {selectedCoreCount > 0 && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Core:{selectedCoreCount}</span>}
              </div>
            </div>
          </div>

          {/* Card 2: Total Students */}
          <div className="bg-green-50/50 p-3 rounded-2xl border border-green-100 flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-xl text-green-700 flex-shrink-0">
              <Users size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-extrabold text-green-800 leading-none">{totalStudents}</span>
              <span className="text-[10px] font-semibold text-green-600 mt-0.5">Total Students</span>
            </div>
          </div>

          {/* Card 3: Medium Students */}
          <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-700 flex-shrink-0">
              <GraduationCap size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-extrabold text-blue-800 leading-none">{activeMediumStudents}</span>
              <span className="text-[10px] font-semibold text-blue-600 mt-0.5 truncate">{activeMediumTab} Students</span>
            </div>
          </div>

          {/* Card 4: Divisions */}
          <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100 flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-700 flex-shrink-0">
              <Landmark size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-extrabold text-orange-800 leading-none">{getDivisionsForMedium()}</span>
              <span className="text-[10px] font-semibold text-orange-600 mt-0.5">Divisions</span>
            </div>
          </div>

          {/* Card 5: Medium Subjects */}
          <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100 flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl text-purple-700 flex-shrink-0">
              <BookOpen size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-extrabold text-purple-800 leading-none">{getMediumTabCount(activeMediumTab)}</span>
              <span className="text-[10px] font-semibold text-purple-600 mt-0.5 truncate">{activeMediumTab} Subjects</span>
            </div>
          </div>

          {/* Card 6: Coverage */}
          <div className="bg-teal-50/50 p-3 rounded-2xl border border-teal-100 flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-xl text-teal-700 flex-shrink-0">
              <Target size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-extrabold text-teal-800 leading-none">
                {getMediumTabCount(activeMediumTab) > 0 ? Math.round((selectedIds.size / getMediumTabCount(activeMediumTab)) * 100) : 0}%
              </span>
              <span className="text-[10px] font-semibold text-teal-600 mt-0.5">Coverage</span>
            </div>
          </div>

          <div className="flex-1 min-h-[4px]"></div>

          {/* Clear All Button */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isSaving}
              className="w-full py-2.5 px-4 border border-red-200 text-red-600 bg-white hover:bg-red-50 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <Trash2 size={16} />
              {isSaving ? 'Clearing...' : 'Clear All'}
            </button>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 pb-6 custom-scrollbar bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500 font-medium">Loading subjects...</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              {/* Paper I Section */}
              {(activeFilter === 'All' || activeFilter === 'Paper I') && (filteredP01.length > 0 || Object.keys(subjectsByMedium).length === 0) && (
                <section>
                  <div 
                    onClick={() => toggleCategory('p01')}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center cursor-pointer mb-4 shadow-sm hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-indigo-600" size={20} strokeWidth={2.5} />
                      <h3 className="font-bold text-gray-900 tracking-wide uppercase">1. First Language Paper I <span className="text-gray-500 font-medium ml-1">({filteredP01.length})</span></h3>
                      {p01EligibleStudents > 0 && <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{p01EligibleStudents} eligible</span>}
                    </div>
                    {collapsedCategories.has('p01') ? <ChevronDown className="text-gray-500" size={20} /> : <ChevronUp className="text-gray-500" size={20} />}
                  </div>

                  {!collapsedCategories.has('p01') && filteredP01.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredP01.map(sub => (
                        <SubjectCard key={sub._id || sub.id} sub={sub} category="p01" />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Paper II Section */}
              {(activeFilter === 'All' || activeFilter === 'Paper II') && (filteredP02.length > 0 || Object.keys(subjectsByMedium).length === 0) && (
                <section>
                  <div 
                    onClick={() => toggleCategory('p02')}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center cursor-pointer mb-4 shadow-sm hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-emerald-600" size={20} strokeWidth={2.5} />
                      <h3 className="font-bold text-gray-900 tracking-wide uppercase">2. First Language Paper II <span className="text-gray-500 font-medium ml-1">({filteredP02.length})</span></h3>
                      {p02EligibleStudents > 0 && <span className="text-[11px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">{p02EligibleStudents} eligible</span>}
                    </div>
                    {collapsedCategories.has('p02') ? <ChevronDown className="text-gray-500" size={20} /> : <ChevronUp className="text-gray-500" size={20} />}
                  </div>

                  {!collapsedCategories.has('p02') && filteredP02.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredP02.map(sub => (
                        <SubjectCard key={sub._id || sub.id} sub={sub} category="p02" />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Second Language Section (P03) */}
              {(activeFilter === 'All' || activeFilter === 'Sec & Third Lang') && (filteredP03.length > 0 || Object.keys(subjectsByMedium).length === 0) && (
                <section>
                  <div 
                    onClick={() => toggleCategory('p03')}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center cursor-pointer mb-4 shadow-sm hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-blue-500" size={20} strokeWidth={2.5} />
                      <h3 className="font-bold text-gray-900 tracking-wide uppercase">3. Second Language (P03) <span className="text-gray-500 font-medium ml-1">({filteredP03.length})</span></h3>
                      {p03EligibleStudents > 0 && <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{p03EligibleStudents} eligible</span>}
                    </div>
                    {collapsedCategories.has('p03') ? <ChevronDown className="text-gray-500" size={20} /> : <ChevronUp className="text-gray-500" size={20} />}
                  </div>

                  {!collapsedCategories.has('p03') && filteredP03.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredP03.map(sub => (
                        <SubjectCard key={sub._id || sub.id} sub={sub} category="p03" />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Third Language Section (P04) */}
              {(activeFilter === 'All' || activeFilter === 'Sec & Third Lang') && (filteredP04.length > 0 || Object.keys(subjectsByMedium).length === 0) && (
                <section>
                  <div 
                    onClick={() => toggleCategory('p04')}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center cursor-pointer mb-4 shadow-sm hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-teal-500" size={20} strokeWidth={2.5} />
                      <h3 className="font-bold text-gray-900 tracking-wide uppercase">4. Third Language (P04) <span className="text-gray-500 font-medium ml-1">({filteredP04.length})</span></h3>
                      {p04EligibleStudents > 0 && <span className="text-[11px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-bold">{p04EligibleStudents} eligible</span>}
                    </div>
                    {collapsedCategories.has('p04') ? <ChevronDown className="text-gray-500" size={20} /> : <ChevronUp className="text-gray-500" size={20} />}
                  </div>

                  {!collapsedCategories.has('p04') && filteredP04.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredP04.map(sub => (
                        <SubjectCard key={sub._id || sub.id} sub={sub} category="p04" />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Core Subjects Section */}
              {(activeFilter === 'All' || activeFilter === 'Core') && (filteredCore.length > 0 || Object.keys(subjectsByMedium).length === 0) && (
                <section>
                  <div 
                    onClick={() => toggleCategory('core')}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center cursor-pointer mb-4 shadow-sm hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center bg-green-100 rounded text-green-700"><Check size={14} strokeWidth={3} /></div>
                      <h3 className="font-bold text-gray-900 tracking-wide uppercase">5. Core Subjects (P05–P10) <span className="text-gray-500 font-medium ml-1">({filteredCore.length})</span></h3>
                      {coreEligibleStudents > 0 && <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">{coreEligibleStudents} eligible</span>}
                    </div>
                    {collapsedCategories.has('core') ? <ChevronDown className="text-gray-500" size={20} /> : <ChevronUp className="text-gray-500" size={20} />}
                  </div>
                  
                  {!collapsedCategories.has('core') && filteredCore.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredCore.map(sub => (
                        <SubjectCard key={sub._id || sub.id} sub={sub} category="core" />
                      ))}
                    </div>
                  )}
                </section>
              )}

            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-8 py-4 flex items-center justify-between z-[100] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-extrabold text-indigo-700">{selectedIds.size}</span>
          <span className="text-[14px] text-gray-600">
            of <span className="font-bold text-gray-900">{getMediumTabCount(activeMediumTab)}</span> selected
          </span>
          <div className="h-5 w-px bg-gray-300 mx-1"></div>
          <span className="text-[13px] text-gray-500">
            <span className="font-bold text-green-700">{stats.coveredStudents}</span> students covered
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || selectedIds.size === 0}
            className="px-6 py-2.5 rounded-lg text-white font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"
          >
            <div className="bg-white rounded-full p-0.5 text-indigo-600">
               <Check size={14} strokeWidth={4} />
            </div>
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </footer>
      </div>
      
      {isMarkGroupModalOpen && editingMarkGroupSubject && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-900/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Configure Marks: {editingMarkGroupSubject.name}</h3>
            <div className="flex gap-2 items-center px-1 pb-2 border-b border-gray-100 mb-3">
              <span className="flex-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</span>
              <span className="w-20 text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-1">Marks</span>
              <span className="w-16 text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-1">Question</span>
              <span className="w-12 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total</span>
              <span className="w-8"></span>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {editingGroups.map((g, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input type="text" placeholder="Name" value={g.name} onChange={e => handleGroupChange(idx, 'name', e.target.value)} className="border border-gray-300 p-2 rounded-lg flex-1 text-sm outline-none focus:border-indigo-500" />
                  <input type="number" placeholder="Marks" value={g.maxMarks || ''} onChange={e => handleGroupChange(idx, 'maxMarks', Number(e.target.value))} className="border border-gray-300 p-2 rounded-lg w-20 text-sm outline-none focus:border-indigo-500" />
                  <input type="number" placeholder="Q's" value={g.maxQuestions || ''} onChange={e => handleGroupChange(idx, 'maxQuestions', Number(e.target.value))} className="border border-gray-300 p-2 rounded-lg w-16 text-sm outline-none focus:border-indigo-500" />
                  <span className="font-bold w-12 text-center text-sm text-gray-700">{g.total || 0}</span>
                  <button onClick={() => handleRemoveGroup(idx)} className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center px-1 pt-3 border-t border-gray-100 mt-3">
              <span className="flex-1 text-sm font-bold text-gray-700 text-right uppercase tracking-wider">Overall Total:</span>
              <span className="w-20"></span>
              <span className="w-16"></span>
              <span className="font-bold w-12 text-center text-base text-indigo-700">{editingGroups.reduce((acc, g) => acc + (Number(g.total) || 0), 0)}</span>
              <span className="w-8"></span>
            </div>
            <button onClick={handleAddGroup} className="mt-4 flex items-center gap-1 text-indigo-600 text-sm font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
               <Plus size={16} /> Add Group
            </button>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setIsMarkGroupModalOpen(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200">Cancel</button>
              <button onClick={handleSaveMarkGroups} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PremiumExamConfigModal;
