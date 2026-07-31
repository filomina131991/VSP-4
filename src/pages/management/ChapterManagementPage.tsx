import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/apiClient';
import { Plus, Trash2, Settings2, Save, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { mediumNameToId } from '../../lib/mediumUtils';
import Dropdown from '../../components/common/Dropdown';

export default function ChapterManagementPage() {
  const { user } = useAuth();
  const { mediums, subjects } = useData();
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter context state
  const [medium, setMedium] = useState('Tamil');
  const [className, setClassName] = useState('10');
  const [subjectId, setSubjectId] = useState('');

  // New Chapter Form state
  const [newChapterName, setNewChapterName] = useState('');

  // Edit State
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterName, setEditChapterName] = useState('');

  // Add Subunit State per Chapter
  const [newSubUnitInputs, setNewSubUnitInputs] = useState<Record<string, string>>({});

  const CLASSES = ['8', '9', '10'];

  const getFilteredMediums = () => {
    const activeMediums = mediums.filter(m => m.active).sort((a, b) => a.displayOrder - b.displayOrder);
    if (user?.role === 'SUBJECT_EXPERT' && user.mediums && Array.isArray(user.mediums) && user.mediums.length > 0) {
      return activeMediums.filter(m => {
        const sN = (m.shortName || '').toUpperCase();
        const c = (m.code || '').toUpperCase();
        const n = (m.name || '').toUpperCase();
        return user.mediums.some((um: string) => {
          const u = um.toUpperCase();
          return sN === u || c === u || n === u;
        });
      }).map(m => m.shortName || m.name);
    }
    return activeMediums.map(m => m.shortName || m.name);
  };
  const availableMediums = getFilteredMediums();

  const getFilteredSubjects = () => {
    const activeMediumId = mediumNameToId(medium, mediums);
    let filtered = subjects.filter(s => s.active);
    if (activeMediumId) {
      filtered = filtered.filter(s => s.mediumId === activeMediumId);
    }
    
    // Role based subject filter
    if (user?.role === 'SUBJECT_EXPERT' && user.teachingSubjects && Array.isArray(user.teachingSubjects)) {
      filtered = filtered.filter((sub) => {
        const dbName = (sub.name || '').toUpperCase();
        return user.teachingSubjects.some((ts: string) => {
          const taught = ts.toUpperCase();
          if (taught === 'MATHS' && dbName.includes('MATHEMATICS')) return true;
          if (taught === 'ENGLISH' && dbName.includes('ENGLISH (SECOND')) return true;
          if (taught === 'HINDI' && (dbName.includes('HINDI (THIRD') || dbName.includes('ADDL. HINDI'))) return true;
          if (taught === 'SPECIAL ENGLISH' && dbName.includes('SPECIAL. ENGLISH')) return true;
          return dbName.includes(taught);
        });
      });
    }

    return filtered.sort((a, b) => {
      const pCodeA = a.name.match(/P\d{2}/)?.[0] || 'Z99';
      const pCodeB = b.name.match(/P\d{2}/)?.[0] || 'Z99';
      return pCodeA.localeCompare(pCodeB) || a.name.localeCompare(b.name);
    });
  };

  const filteredSubjects = getFilteredSubjects();

  useEffect(() => {
    if (availableMediums.length > 0 && !availableMediums.includes(medium)) {
      setMedium(availableMediums[0]);
    }
  }, [availableMediums, medium]);

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      const exists = filteredSubjects.find(s => (s._id || s.id) === subjectId);
      if (!exists) {
        setSubjectId(filteredSubjects[0]._id || filteredSubjects[0].id);
      }
    } else if (subjectId) {
      setSubjectId('');
    }
  }, [filteredSubjects, subjectId]);

  useEffect(() => {
    fetchChapters();
  }, [medium, className, subjectId]);

  const fetchChapters = async () => {
    if (!subjectId) {
      setChapters([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.get('/chapters', { params: { medium, className, subjectId } });
      setChapters(res.data);
    } catch (error) {
      toast.error('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !newChapterName.trim()) return toast.error('Chapter Name is required');
    try {
      const payload = {
        medium,
        className,
        subjectId,
        chapterName: newChapterName.trim(),
        subUnits: []
      };
      await apiClient.post('/chapters', payload);
      toast.success('Unit/Chapter created successfully');
      setNewChapterName('');
      fetchChapters();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add chapter');
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Unit/Chapter entirely?')) return;
    try {
      await apiClient.delete(`/chapters/${id}`);
      toast.success('Chapter deleted');
      fetchChapters();
    } catch (error) {
      toast.error('Failed to delete chapter');
    }
  };

  const handleUpdateChapterName = async (id: string) => {
    if (!editChapterName.trim()) return setEditingChapterId(null);
    try {
      await apiClient.put(`/chapters/${id}`, { chapterName: editChapterName.trim() });
      toast.success('Chapter renamed');
      setEditingChapterId(null);
      fetchChapters();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to rename chapter');
    }
  };

  const handleAddSubUnit = async (chapterId: string) => {
    const subUnitName = newSubUnitInputs[chapterId]?.trim();
    if (!subUnitName) return;

    const chapter = chapters.find(c => c._id === chapterId);
    if (!chapter) return;

    if (chapter.subUnits.includes(subUnitName)) {
      toast.error('Sub-unit already exists');
      return;
    }

    try {
      const updatedSubUnits = [...chapter.subUnits, subUnitName];
      await apiClient.put(`/chapters/${chapterId}`, { subUnits: updatedSubUnits });
      toast.success('Sub-unit added');
      setNewSubUnitInputs({ ...newSubUnitInputs, [chapterId]: '' });
      fetchChapters();
    } catch (error) {
      toast.error('Failed to add sub-unit');
    }
  };

  const handleRemoveSubUnit = async (chapterId: string, subUnitToRemove: string) => {
    if (!confirm('Remove this sub-unit?')) return;
    const chapter = chapters.find(c => c._id === chapterId);
    if (!chapter) return;

    try {
      const updatedSubUnits = chapter.subUnits.filter((su: string) => su !== subUnitToRemove);
      await apiClient.put(`/chapters/${chapterId}`, { subUnits: updatedSubUnits });
      toast.success('Sub-unit removed');
      fetchChapters();
    } catch (error) {
      toast.error('Failed to remove sub-unit');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex-1 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings2 size={24} /> Chapter & Sub-unit Configuration
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure chapters (units) once, and efficiently manage their respective sub-units.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Context & Form */}
        <div className="md:col-span-1 space-y-6 h-fit">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-bold dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Select Subject Context</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medium</label>
                <Dropdown
                  className="w-full"
                  ariaLabel="Select Medium"
                  value={medium}
                  onChange={(v) => setMedium(v)}
                  options={availableMediums.map(m => ({ value: m, label: m }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
                <Dropdown
                  className="w-full"
                  ariaLabel="Select Class"
                  value={className}
                  onChange={(v) => setClassName(v)}
                  options={CLASSES.map(c => ({ value: c, label: `Class ${c}` }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <Dropdown
                  className="w-full"
                  ariaLabel="Select Subject"
                  placeholder="Select Subject"
                  value={subjectId}
                  onChange={(v) => setSubjectId(v)}
                  options={filteredSubjects.map(s => ({ value: s._id || s.id, label: s.name }))}
                />
              </div>
            </div>
          </div>

          {subjectId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900 p-4">
              <form onSubmit={handleAddChapter} className="space-y-3">
                <h3 className="text-md font-semibold dark:text-white mb-3 flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Plus size={18}/> Create New Unit
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unit Name</label>
                  <input required type="text" placeholder="e.g. Unit 1: Laws of Motion" className="w-full border rounded px-3 py-2 text-sm bg-transparent dark:text-white dark:border-gray-600" value={newChapterName} onChange={e => setNewChapterName(e.target.value)} />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 text-sm font-medium flex justify-center items-center gap-2 transition-colors">
                  <Save size={16} /> Save Unit
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Units List */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-bold dark:text-white mb-4 border-b pb-2 dark:border-gray-700">
            Configured Units & Sub-units
            {subjectId && <span className="ml-2 text-sm font-normal text-gray-500">({subjects.find(s=>(s._id || s.id)===subjectId)?.name} - Class {className} {medium})</span>}
          </h2>

          {loading ? (
            <div className="text-center py-10 dark:text-gray-400">Loading units...</div>
          ) : !subjectId ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
              Please select a subject context to manage units.
            </div>
          ) : chapters.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
              No units configured yet. Create a new unit on the left.
            </div>
          ) : (
            <div className="space-y-4">
              {chapters.map((chap) => (
                <div key={chap._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50/50 dark:bg-[#161b22]">
                  
                  {/* Unit Header */}
                  <div className="flex justify-between items-start mb-3">
                    {editingChapterId === chap._id ? (
                      <div className="flex items-center gap-2 flex-1 mr-4">
                        <input 
                          type="text" 
                          className="flex-1 border border-blue-500 rounded px-2 py-1 text-md font-semibold bg-white dark:bg-gray-900 dark:text-white"
                          value={editChapterName} 
                          onChange={e => setEditChapterName(e.target.value)} 
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateChapterName(chap._id);
                            if (e.key === 'Escape') setEditingChapterId(null);
                          }}
                        />
                        <button onClick={() => handleUpdateChapterName(chap._id)} className="text-green-600 p-1 hover:bg-green-50 rounded"><Save size={18}/></button>
                        <button onClick={() => setEditingChapterId(null)} className="text-red-500 p-1 hover:bg-red-50 rounded"><X size={18}/></button>
                      </div>
                    ) : (
                      <div className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-3">
                        {chap.chapterName}
                        <button onClick={() => { setEditingChapterId(chap._id); setEditChapterName(chap.chapterName); }} className="text-gray-400 hover:text-blue-500 transition-colors" title="Edit Unit Name">
                          <Pencil size={16} />
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={() => handleDeleteChapter(chap._id)} 
                      className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      title="Delete Unit Completely"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Sub-units Area */}
                  <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-1">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {chap.subUnits && chap.subUnits.map((su: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm">
                          {su}
                          <button onClick={() => handleRemoveSubUnit(chap._id, su)} className="text-gray-400 hover:text-red-500 focus:outline-none">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {(!chap.subUnits || chap.subUnits.length === 0) && (
                        <span className="text-sm text-gray-400 italic">No sub-units added yet.</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 max-w-sm">
                      <input 
                        type="text" 
                        placeholder="New Sub-unit name..." 
                        className="flex-1 border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 focus:ring-1 focus:ring-blue-500"
                        value={newSubUnitInputs[chap._id] || ''} 
                        onChange={e => setNewSubUnitInputs({...newSubUnitInputs, [chap._id]: e.target.value})}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSubUnit(chap._id);
                        }}
                      />
                      <button 
                        onClick={() => handleAddSubUnit(chap._id)}
                        className="bg-gray-100 hover:bg-blue-50 text-blue-600 dark:bg-gray-700 dark:hover:bg-blue-900/30 dark:text-blue-400 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        Add Sub-unit
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
