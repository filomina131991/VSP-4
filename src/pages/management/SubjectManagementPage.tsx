import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Edit2, Trash2, Plus, X, Settings2, GripVertical } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useData } from '../../context/DataContext';
import { emitRefresh } from '../../lib/eventBus';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Modal from '../../components/common/Modal';
import { Medium, Subject } from '../../types';
import { resolveMediumId as resolveMediumIdFromStr, getMediumColor, resolveMediumShortName } from '../../lib/mediumUtils';

interface MarkGroup {
  name: string;
  maxMarks: number;
  maxQuestions: number;
  total: number;
}

const SubjectManagementPage: React.FC = () => {
  const { refreshSubjects, refreshMediums } = useData();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mediums, setMediums] = useState<Medium[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [activeMediumTab, setActiveMediumTab] = useState('');
  const [markGroupsMap, setMarkGroupsMap] = useState<Record<string, MarkGroup[]>>({});
  const [isMarkGroupModalOpen, setIsMarkGroupModalOpen] = useState(false);
  const [editingMarkGroupSubject, setEditingMarkGroupSubject] = useState<Subject | null>(null);
  const [editingGroups, setEditingGroups] = useState<MarkGroup[]>([]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const [subRes, mgRes, medRes] = await Promise.all([
        apiClient.get('/management/subjects'),
        apiClient.get('/management/mark-groups'),
        apiClient.get('/management/mediums')
      ]);
      setSubjects(subRes.data);
      setMediums(medRes.data);
      const mgMap: Record<string, MarkGroup[]> = {};
      (mgRes.data || []).forEach((cfg: any) => {
        mgMap[cfg.subjectId] = cfg.groups || [];
      });
      setMarkGroupsMap(mgMap);
    } catch (err) {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const resolveSubjectMediumId = (sub: any): string => {
    if (sub.mediumId) return sub.mediumId;
    if (mediums.length > 0 && sub.medium) {
      const resolved = resolveMediumIdFromStr(sub.medium, mediums);
      if (resolved) return resolved;
    }
    const name = (sub.name || '').toUpperCase();
    if (name.includes('TAMIL')) return 'medium-tm';
    if (name.includes('ENGLISH') && !name.includes('ADDL')) return 'medium-em';
    if (name.includes('MALAYALAM')) return 'medium-mm';
    if (name.includes('KANNADA')) return 'medium-km';
    return '';
  };

  const effectiveMediums = useMemo(() => {
    if (mediums.length > 0) return mediums;
    const derived = new Map<string, Medium>();
    subjects.forEach(sub => {
      if (sub.mediumId && mediums.length > 0) {
        const m = mediums.find(med => med.id === sub.mediumId);
        if (m) { derived.set(m.id, m); return; }
      }
    });
    return Array.from(derived.values());
  }, [subjects, mediums]);

  useEffect(() => {
    if (effectiveMediums.length > 0 && !activeMediumTab) {
      setActiveMediumTab(effectiveMediums[0].id);
    }
  }, [effectiveMediums, activeMediumTab]);

  const groupedSubjects = useMemo(() => {
    type GroupCategory = { medium: Medium; p01: Subject[]; p02: Subject[]; p03: Subject[]; p04: Subject[]; core: Subject[] };
    const groups: Record<string, GroupCategory> = {};

    effectiveMediums.forEach(m => {
      groups[m.id] = { medium: m, p01: [], p02: [], p03: [], p04: [], core: [] };
    });

    subjects.forEach(sub => {
      const category = (sub.category || '').toUpperCase();
      const paperType = (sub.paperType || sub.code || sub.shortName || '').toUpperCase();
      const name = (sub.name || '').toUpperCase();

      // Determine target medium IDs for this subject
      let targetMediumIds: string[] = [];

      if (sub.mediumId) {
        const matchingMed = effectiveMediums.find(m => m.id === sub.mediumId || m.code === sub.mediumId);
        if (matchingMed) targetMediumIds = [matchingMed.id];
      }
      
      if (targetMediumIds.length === 0 && mediums.length > 0) {
        const resolvedId = resolveSubjectMediumId(sub);
        if (resolvedId) {
          const matchingMed = effectiveMediums.find(m => m.id === resolvedId);
          if (matchingMed) targetMediumIds = [matchingMed.id];
        }
      }

      if (targetMediumIds.length === 0) {
        // P01/P02 (FIRST_LANGUAGE) must be medium-specific — skip if no medium resolved.
        if (category === 'FIRST_LANGUAGE' || paperType === 'P01' || paperType === 'P02') return;
        // Core / Common subject or unrecognized -> applies to ALL mediums
        targetMediumIds = effectiveMediums.map(m => m.id);
      }

      targetMediumIds.forEach(medId => {
        if (!groups[medId]) return;

        if (paperType === 'P01' || name.includes('P01') || (category === 'FIRST_LANGUAGE' && (name.includes(' AT') || name.includes('PAPER I')))) {
          if (!groups[medId].p01.some(s => s.id === sub.id || s.name === sub.name)) {
            groups[medId].p01.push(sub);
          }
        } else if (paperType === 'P02' || name.includes('P02') || (category === 'FIRST_LANGUAGE' && (name.includes(' BT') || name.includes('PAPER II')))) {
          if (!groups[medId].p02.some(s => s.id === sub.id || s.name === sub.name)) {
            groups[medId].p02.push(sub);
          }
        } else if (paperType === 'P03' || name.includes('P03') || category === 'SECOND_LANGUAGE') {
          if (!groups[medId].p03.some(s => s.id === sub.id || s.name === sub.name)) {
            groups[medId].p03.push(sub);
          }
        } else if (paperType === 'P04' || name.includes('P04') || category === 'THIRD_LANGUAGE') {
          if (!groups[medId].p04.some(s => s.id === sub.id || s.name === sub.name)) {
            groups[medId].p04.push(sub);
          }
        } else {
          if (!groups[medId].core.some(s => s.id === sub.id || s.name === sub.name)) {
            groups[medId].core.push(sub);
          }
        }
      });
    });

    const extractPCode = (sub: any): string => {
      const fields = [sub.paperType, sub.code, sub.shortName, sub.name];
      for (const f of fields) {
        if (!f) continue;
        const m = String(f).toUpperCase().match(/\b(P\d{2})\b/);
        if (m) return m[1];
      }
      return '';
    };

    const sortSubjectsByCode = (a: any, b: any) => {
      if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      }
      const pA = extractPCode(a);
      const pB = extractPCode(b);
      const numA = pA ? parseInt(pA.slice(1), 10) : 999;
      const numB = pB ? parseInt(pB.slice(1), 10) : 999;
      if (numA !== numB) return numA - numB;
      return (a.shortName || a.code || a.name || '').localeCompare(b.shortName || b.code || b.name || '');
    };

    return Object.values(groups)
      .sort((a, b) => (a.medium.displayOrder || 0) - (b.medium.displayOrder || 0))
      .map(g => ({
        ...g,
        mediumName: g.medium.name,
        mediumCode: g.medium.code,
        p01: g.p01.sort(sortSubjectsByCode),
        p02: g.p02.sort(sortSubjectsByCode),
        p03: g.p03.sort(sortSubjectsByCode),
        p04: g.p04.sort(sortSubjectsByCode),
        core: g.core.sort(sortSubjectsByCode)
      }));
  }, [subjects, effectiveMediums]);

  const handleAdd = (mediumId?: string) => {
    let defaultMediumCode = '';
    if (mediumId) {
      const med = mediums.find(m => m.id === mediumId);
      if (med) defaultMediumCode = med.code;
    }
    
    setEditingSubject({ name: '', shortName: '', code: '', medium: defaultMediumCode, mediumId: mediumId || '', mediumName: '', category: '', paperType: '', languageType: '', displayOrder: 0, active: true });
    setIsModalOpen(true);
  };

  const handleEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/management/subjects/${id}`);
        toast.success('Subject deleted');
        fetchSubjects();
        refreshSubjects();
        emitRefresh('subjects-updated');
        emitRefresh('data-updated');
      } catch (err) {
        toast.error('Failed to delete subject');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    const nameTrimmed = editingSubject.name.trim().toUpperCase();
    const editingId = editingSubject._id || editingSubject.id;

    const duplicateName = subjects.find(s => {
      const sid = s._id || s.id;
      return s.name.trim().toUpperCase() === nameTrimmed && sid !== editingId;
    });
    if (duplicateName) {
      toast.error(`Subject "${duplicateName.name}" already exists!`);
      return;
    }

    try {
      await apiClient.post('/management/subjects', editingSubject);
      toast.success(editingSubject._id || editingSubject.id ? 'Subject updated' : 'Subject added');
      setIsModalOpen(false);
      fetchSubjects();
      refreshSubjects();
      emitRefresh('subjects-updated');
      emitRefresh('data-updated');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save subject';
      toast.error(msg);
    }
  };

  const handleConfigureMarks = (sub: Subject) => {
    const subId = sub._id || sub.id || '';
    setEditingMarkGroupSubject(sub);
    const existing = markGroupsMap[subId];
    if (existing && existing.length > 0) {
      setEditingGroups(existing.map(g => ({ ...g })));
    } else {
      setEditingGroups([{ name: 'Written', maxMarks: 100, maxQuestions: 1, total: 100 }]);
    }
    setIsMarkGroupModalOpen(true);
  };

  const handleAddGroup = () => {
    setEditingGroups([...editingGroups, { name: '', maxMarks: 0, maxQuestions: 1, total: 0 }]);
  };

  const handleRemoveGroup = (index: number) => {
    setEditingGroups(editingGroups.filter((_, idx) => idx !== index));
  };

  const handleGroupChange = (idx: number, field: keyof MarkGroup, value: any) => {
    setEditingGroups(prev => {
      const updated = [...prev];
      const grp = { ...updated[idx], [field]: value };
      if (field === 'maxMarks') {
        grp.total = typeof value === 'number' ? value : parseInt(value) || 0;
      }
      updated[idx] = grp;
      return updated;
    });
  };

  const handleSaveMarkGroups = async () => {
    if (!editingMarkGroupSubject) return;
    const subjectId = editingMarkGroupSubject._id || editingMarkGroupSubject.id;
    try {
      await apiClient.post('/management/mark-groups', {
        subjectId,
        groups: editingGroups
      });
      toast.success('Mark groups configured successfully');
      setIsMarkGroupModalOpen(false);
      fetchSubjects();
      refreshSubjects();
      emitRefresh('subjects-updated');
      emitRefresh('data-updated');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save mark groups';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="text-indigo-500" />
            Subject Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Manage the master list of subjects.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading subjects...</div>
      ) : (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-700">
            {groupedSubjects.map(g => (
              <button
                key={g.medium.id}
                onClick={() => setActiveMediumTab(g.medium.id)}
                className={`px-5 py-2.5 rounded-t-xl font-bold text-sm whitespace-nowrap transition-colors uppercase tracking-widest ${
                  activeMediumTab === g.medium.id
                    ? 'bg-white dark:bg-[#161b22] text-indigo-600 border-t-2 border-l border-r border-gray-200 dark:border-[#30363d] border-t-indigo-600'
                    : 'bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {g.medium.name}
              </button>
            ))}
          </div>

          {/* Active Tab Content */}
          {groupedSubjects.map(group => {
            if (group.medium.id !== activeMediumTab) return null;
            return (
              <div key={group.medium.id} className="bg-white/50 dark:bg-[#161b22]/50 rounded-b-2xl rounded-tr-2xl p-6 border border-gray-100 dark:border-[#30363d] min-h-[400px]">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-[#30363d] pb-4">
                  <h3 className="text-xl font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                    {group.medium.name} Subjects
                  </h3>
                  <button 
                    onClick={() => handleAdd(group.medium.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 uppercase tracking-widest"
                  >
                    <Plus size={16} /> Add Subject
                  </button>
                </div>

                <div className="space-y-8">
                  {/* P01 Section */}
                  {group.p01.length > 0 && (
                    <SubjectSection title="First Language Paper I (P01)" subjects={group.p01} onEdit={handleEdit} onDelete={handleDelete} onConfigureMarks={handleConfigureMarks} markGroupsMap={markGroupsMap} mediums={effectiveMediums} />
                  )}
                  {/* P02 Section */}
                  {group.p02.length > 0 && (
                    <SubjectSection title="First Language Paper II (P02)" subjects={group.p02} onEdit={handleEdit} onDelete={handleDelete} onConfigureMarks={handleConfigureMarks} markGroupsMap={markGroupsMap} mediums={effectiveMediums} />
                  )}
                  {/* P03 Section - Second Language */}
                  {group.p03.length > 0 && (
                    <SubjectSection title="Second Language (P03)" subjects={group.p03} onEdit={handleEdit} onDelete={handleDelete} onConfigureMarks={handleConfigureMarks} markGroupsMap={markGroupsMap} mediums={effectiveMediums} />
                  )}
                  {/* P04 Section - Third Language */}
                  {group.p04.length > 0 && (
                    <SubjectSection title="Third Language (P04)" subjects={group.p04} onEdit={handleEdit} onDelete={handleDelete} onConfigureMarks={handleConfigureMarks} markGroupsMap={markGroupsMap} mediums={effectiveMediums} />
                  )}
                  {/* Core Section */}
                  {group.core.length > 0 && (
                    <SubjectSection title="Core Subjects (P05–P10)" subjects={group.core} onEdit={handleEdit} onDelete={handleDelete} onConfigureMarks={handleConfigureMarks} markGroupsMap={markGroupsMap} mediums={effectiveMediums} />
                  )}

                  {group.p01.length === 0 && group.p02.length === 0 && group.p03.length === 0 && group.p04.length === 0 && group.core.length === 0 && (
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/30 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                      <BookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">No subjects found for this medium.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - rendered at body root level (top center) */}
      <Modal
        isOpen={isModalOpen && Boolean(editingSubject)}
        onClose={() => setIsModalOpen(false)}
        className="flex items-start justify-center pt-8 sm:pt-14 p-4"
      >
        {editingSubject && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                <BookOpen className="text-indigo-500" size={20} />
                {editingSubject._id || editingSubject.id ? 'Edit Subject' : 'Add Subject'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={editingSubject.name}
                    onChange={e => setEditingSubject({...editingSubject, name: e.target.value.toUpperCase()})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all uppercase"
                    placeholder="e.g. TAMIL AT"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Code (P01-P10)</label>
                  <select
                    value={editingSubject.code || ''}
                    onChange={e => {
                      const code = e.target.value;
                      setEditingSubject({...editingSubject, code});
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="">Select Code</option>
                    <option value="P01">P01 - First Language Paper I</option>
                    <option value="P02">P02 - First Language Paper II</option>
                    <option value="P03">P03 - Second Language (English)</option>
                    <option value="P04">P04 - Third Language (Hindi)</option>
                    <option value="P05">P05 - Social Science</option>
                    <option value="P06">P06 - Physics</option>
                    <option value="P07">P07 - Chemistry</option>
                    <option value="P08">P08 - Biology</option>
                    <option value="P09">P09 - Mathematics</option>
                    <option value="P10">P10 - ICT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Medium</label>
                  <select
                    value={editingSubject.medium || ''}
                    onChange={e => setEditingSubject({...editingSubject, medium: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="">Common</option>
                    {effectiveMediums.map(m => (
                      <option key={m.id} value={m.code}>{m.code} - {m.shortName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Short Name</label>
                  <input
                    type="text"
                    required
                    value={editingSubject.shortName}
                    onChange={e => setEditingSubject({...editingSubject, shortName: e.target.value.toUpperCase()})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all uppercase"
                    placeholder="e.g. TAMIL AT P01 TM"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Display Order</label>
                  <input
                    type="number"
                    value={editingSubject.displayOrder}
                    onChange={e => setEditingSubject({...editingSubject, displayOrder: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors uppercase tracking-wide cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all uppercase tracking-wide cursor-pointer"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Mark Groups Modal */}
      <Modal
        isOpen={isMarkGroupModalOpen && Boolean(editingMarkGroupSubject)}
        onClose={() => setIsMarkGroupModalOpen(false)}
        className="flex items-start justify-center pt-8 sm:pt-14 p-4"
      >
        {editingMarkGroupSubject && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                <Settings2 className="text-emerald-500" size={20} />
                Configure Marks
              </h3>
              <button onClick={() => setIsMarkGroupModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-2 bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/30">
              <p className="text-[12px] text-emerald-700 dark:text-emerald-400 font-bold">{editingMarkGroupSubject.name} ({editingMarkGroupSubject.shortName})</p>
            </div>
            
            <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {editingGroups.map((group, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Group {idx + 1}</span>
                    {editingGroups.length > 1 && (
                      <button onClick={() => handleRemoveGroup(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Group Name</label>
                      <select
                        value={group.name}
                        onChange={e => handleGroupChange(idx, 'name', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      >
                        <option value="">Select...</option>
                        <option value="Written">Written</option>
                        <option value="Oral">Oral</option>
                        <option value="BT">BT (Book Back)</option>
                        <option value="Internal">Internal</option>
                        <option value="Practical">Practical</option>
                        <option value="Assignment">Assignment</option>
                        <option value="Project">Project</option>
                        <option value="Activity">Activity</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Max Marks</label>
                      <input
                        type="number"
                        min={0}
                        value={group.maxMarks}
                        onChange={e => handleGroupChange(idx, 'maxMarks', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Questions</label>
                      <input
                        type="number"
                        min={1}
                        value={group.maxQuestions}
                        onChange={e => handleGroupChange(idx, 'maxQuestions', parseInt(e.target.value) || 1)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Total:</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{group.total}</span>
                  </div>
                </div>
              ))}
              <button
                onClick={handleAddGroup}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Mark Group
              </button>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div className="text-sm font-bold text-gray-600">
                Total: <span className="text-emerald-700 dark:text-emerald-400 text-lg">{editingGroups.reduce((s, g) => s + g.total, 0)}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsMarkGroupModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors uppercase tracking-wide"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMarkGroups}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md hover:shadow-lg transition-all uppercase tracking-wide"
                >
                  Save Marks
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const SubjectSection: React.FC<{
  title: string;
  subjects: Subject[];
  onEdit: (sub: Subject) => void;
  onDelete: (id: string) => void;
  onConfigureMarks: (sub: Subject) => void;
  mediums: Medium[];
  markGroupsMap: Record<string, MarkGroup[]>;
}> = ({ title, subjects, onEdit, onDelete, onConfigureMarks, mediums, markGroupsMap }) => (
  <div>
    <h4 className="text-[11px] font-black text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-widest pl-1">{title}</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {subjects.map(sub => {
        const subId = sub._id || sub.id || '';
        const groups = markGroupsMap[subId] || [];
        return (
          <div key={subId} className="bg-white dark:bg-[#161b22] p-3.5 rounded-xl border border-gray-200 dark:border-[#30363d] shadow-sm flex items-center justify-between group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                <BookOpen size={16} />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-gray-800 dark:text-gray-200 text-[13px] block leading-tight truncate">{sub.name}</span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Code: {sub.code || sub.shortName}</span>
                  {sub.medium && (() => {
                    const medShortName = resolveMediumShortName(sub.medium, mediums) || sub.medium;
                    const colors = getMediumColor(medShortName);
                    return (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {medShortName}
                      </span>
                    );
                  })()}
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Order: {sub.displayOrder}</span>
                </div>
                {groups.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {groups.map((g, i) => (
                      <span key={i} className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold border border-emerald-100">
                        {g.name}: {g.total}
                      </span>
                    ))}
                  </div>
                )}
                {groups.length === 0 && (
                  <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-bold border border-amber-100 mt-1 inline-block">
                    Default: Written 100
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => onConfigureMarks(sub)} title="Configure Marks" className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                <Settings2 size={14} />
              </button>
              <button onClick={() => onEdit(sub)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                <Edit2 size={14} />
              </button>
              <button onClick={() => onDelete(subId)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default SubjectManagementPage;
