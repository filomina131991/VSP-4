import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData, useSchoolMediums, useSchoolSubjects } from '../../context/DataContext';
import { apiClient } from '../../lib/apiClient';
import { resolveMediumId } from '../../lib/mediumUtils';
import Modal from '../../components/common/Modal';
import Dropdown from '../../components/common/Dropdown';
import SearchableSelect from '../../components/common/SearchableSelect';
import { Plus, Search, Edit2, Trash2, Users, ChevronDown, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

// MultiSelectDropdown removed in favor of Assignment Builder
// -----------------------------------

const DESIGNATIONS = ['HST English', 'HST Hindi', 'HST Malayalam', 'HST Tamil', 'HST Physical Science', 'HST Natural Science', 'HST Mathematics', 'HST Social Science', 'HST Arabic', 'HST Urdu', 'HST Sanskrit'];

const isSubjectEligibleForDesignation = (subjectName: string, designation: string): boolean => {
  if (!designation || !subjectName) return true;
  const des = designation.toLowerCase().trim();
  const sub = subjectName.toLowerCase().trim();

  if (des.includes('english')) {
    return sub.includes('english') || sub === 'p01' || sub === 'p02';
  }
  if (des.includes('hindi')) {
    return sub.includes('hindi') || sub.includes('second language') || sub.includes('third language') || sub === 'p03' || sub === 'p04';
  }
  if (des.includes('malayalam') || des.includes('tamil') || des.includes('arabic') || des.includes('urdu') || des.includes('sanskrit') || des.includes('kannada') || des.includes('telugu') || des.includes('marathi') || des.includes('gujarati')) {
    return sub.includes('first language') || sub.includes('second language') || sub.includes('third language') || 
           sub.includes(des.replace('hst ', '').trim()) || sub === 'p01' || sub === 'p02' || sub === 'p03' || sub === 'p04';
  }
  if (des.includes('physical science')) {
    return sub.includes('physics') || sub.includes('chemistry') || sub.includes('physical science') || sub === 'p06' || sub === 'p07';
  }
  if (des.includes('natural science')) {
    return sub.includes('biology') || sub.includes('botany') || sub.includes('zoology') || sub.includes('natural science') || sub === 'p08';
  }
  if (des.includes('mathematics') || des.includes('maths')) {
    return sub.includes('math') || sub.includes('ganitham') || sub === 'p05';
  }
  if (des.includes('social science') || des.includes('social')) {
    return sub.includes('social') || sub.includes('history') || sub.includes('geography') || sub.includes('civics') || sub.includes('economics') || sub === 'p08';
  }

  return true;
};


export default function TeacherManagementPage() {
  const { user } = useAuth();
  const { subjects: dmSubjects, mediums: dmMediums } = useData();
  const schoolMediums = useSchoolMediums();
  const schoolSubjects = useSchoolSubjects();

  const eligibleMediums = React.useMemo(() => {
    if (schoolMediums && schoolMediums.length > 0) {
      return schoolMediums.filter(m => m.active !== false);
    }
    if (user?.mediums && user.mediums.length > 0) {
      const userMedSet = new Set(user.mediums.map((m: string) => m.toLowerCase()));
      const matched = dmMediums.filter(m => m.active !== false && (
        userMedSet.has(m.name?.toLowerCase()) ||
        userMedSet.has(m.shortName?.toLowerCase()) ||
        userMedSet.has(m.code?.toLowerCase()) ||
        userMedSet.has((m as any).id?.toLowerCase())
      ));
      if (matched.length > 0) return matched;
    }
    return dmMediums.filter(m => m.active !== false);
  }, [schoolMediums, user?.mediums, dmMediums]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [classDivisionsData, setClassDivisionsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Admin School Selector state
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchId, setSelectedSchId] = useState<string>('');

  useEffect(() => {
    if (user?.role !== 'SCHOOL') {
      apiClient.get('/management/schools').then(res => {
        setSchools(res.data);
        if (res.data && res.data.length > 0) {
          setSelectedSchId(res.data[0].id);
        }
      }).catch(err => console.error("Error fetching schools for teacher management:", err));
    }
  }, [user]);

  const activeSchoolId = user?.role === 'SCHOOL' ? (user.id || '') : selectedSchId;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeAssignTab, setActiveAssignTab] = useState<string>('All');
  
  const [formData, setFormData] = useState({
    name: '',
    penNumber: '',
    designation: DESIGNATIONS[0],
    teacherAssignments: [] as Array<{ mediumId: string, className: string, subjectId: string }>
  });

  const fetchData = React.useCallback(async () => {
    if (user?.role !== 'SCHOOL' && !activeSchoolId) return;
    try {
      setLoading(true);
      const timestamp = Date.now();
      const schoolParam = activeSchoolId ? `&schoolId=${activeSchoolId}` : '';
      const [tRes, sRes, cRes] = await Promise.all([
        apiClient.get(`/school/teachers?_t=${timestamp}${schoolParam}`),
        apiClient.get(`/school/teachers/stats?_t=${timestamp}${schoolParam}`),
        apiClient.get(`/school/classes-divisions?_t=${timestamp}${schoolParam}`)
      ]);
      setTeachers(tRes.data);
      setStats(sRes.data);
      const cData = cRes.data || [];
      setClassDivisionsData(cData);
      const formattedClasses = cData.map((c: any) => `${c.className}${c.division || ''}`);
      const filteredClasses = formattedClasses.filter((c: string) => /^(8|9|10|11|12)/.test(c));
      setAvailableClasses(filteredClasses);
    } catch (error) {
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatsForTeacher = (username: string) => {
    const s = stats.find(st => st._id === username);
    return s || { total: 0, approved: 0, draft: 0 };
  };

  const handleAddAssignment = () => {
    setFormData({
      ...formData,
      teacherAssignments: [
        ...formData.teacherAssignments,
        { mediumId: activeAssignTab !== 'All' ? resolveMediumId(activeAssignTab, dmMediums) || '' : '', className: '', subjectId: '' }
      ]
    });
  };

  const handleUpdateAssignment = (index: number, field: string, value: string) => {
    const newAssignments = [...formData.teacherAssignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    if (field === 'className') {
      if (activeAssignTab === 'All') {
        const cData = classDivisionsData.find(cd => `${cd.className}${cd.division || ''}` === value);
        if (cData && cData.mediums && cData.mediums.length === 1) {
          const mId = resolveMediumId(cData.mediums[0], dmMediums);
          if (mId) {
            newAssignments[index].mediumId = mId;
          } else {
            newAssignments[index].mediumId = '';
          }
        } else {
          newAssignments[index].mediumId = '';
        }
      }
      newAssignments[index].subjectId = '';
    } else if (field === 'mediumId') {
      newAssignments[index].subjectId = '';
    }
    setFormData({ ...formData, teacherAssignments: newAssignments });
  };

  const handleRemoveAssignment = (index: number) => {
    setFormData({
      ...formData,
      teacherAssignments: formData.teacherAssignments.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name.trim()) {
        toast.error("Teacher Name is required");
        return;
      }
      const trimmedPen = formData.penNumber.trim();
      if (!trimmedPen) {
        toast.error("PEN number is required");
        return;
      }
      if (!formData.designation) {
        toast.error("Designation is required");
        return;
      }
      
      const validAssignments = formData.teacherAssignments.filter(a => a.mediumId || a.className || a.subjectId);
      
      if (validAssignments.length === 0) {
        toast.error("At least one assignment must be added");
        return;
      }
      
      // Auto-extract arrays to preserve backend compatibility
      const mediumIds = Array.from(new Set(validAssignments.map(a => a.mediumId).filter(Boolean)));
      const assignedSubjects = Array.from(new Set(validAssignments.map(a => a.className).filter(Boolean)));
      const teachingSubjectIds = Array.from(new Set(validAssignments.map(a => a.subjectId).filter(Boolean)));

      const payload = {
        ...formData,
        teacherAssignments: validAssignments,
        penNumber: trimmedPen,
        mediumIds,
        assignedSubjects,
        teachingSubjectIds,
        schoolId: activeSchoolId
      };

      if (editingId) {
        await apiClient.put(`/school/teachers/${editingId}`, payload);
        toast.success('Teacher updated successfully');
      } else {
        await apiClient.post('/school/teachers', payload);
        toast.success('Teacher added successfully');
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error saving teacher');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await apiClient.delete(`/school/teachers/${id}`);
      toast.success('Teacher deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete teacher');
    }
  };

  const handleResetPassword = async (id?: string | React.MouseEvent) => {
    const targetId = typeof id === 'string' ? id : editingId;
    if (!targetId) return;
    const result = await Swal.fire({
      title: 'Reset Password?',
      text: 'Are you sure you want to reset the password to the PEN number?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, reset it!',
      customClass: {
        container: 'z-[999999]'
      }
    });
    
    if (!result.isConfirmed) return;

    try {
      await apiClient.put(`/school/teachers/${targetId}/reset-password`);
      toast.success('Password reset to PEN number successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error resetting password');
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', penNumber: '', designation: DESIGNATIONS[0], teacherAssignments: [] });
    setShowModal(true);
  };

  const openEditModal = (teacher: any) => {
    setEditingId(teacher._id);

    let sourceAssignments = teacher.teacherAssignments || [];
    let assignments: Array<{ mediumId: string, className: string, subjectId: string }> = [];

    if (sourceAssignments.length === 0 && teacher.mediumIds?.length) {
      assignments = [];
      teacher.mediumIds.forEach((m: string) => {
        (teacher.assignedSubjects || []).forEach((c: string) => {
          (teacher.teachingSubjectIds || []).forEach((s: string) => {
            assignments.push({ mediumId: m, className: c, subjectId: s });
          });
        });
      });
    } else {
      assignments = JSON.parse(JSON.stringify(sourceAssignments));
      // Normalize any lingering string subjects to IDs if possible
      assignments = assignments.map((a: any) => {
        let normMediumId = a.mediumId || '';
        if (!normMediumId && a.medium) {
          const matchedMed = dmMediums.find((m: any) => m.name === a.medium || m.id === a.medium);
          if (matchedMed) normMediumId = matchedMed.id;
        }
        let normSubjectId = a.subjectId || '';
        if (!normSubjectId && a.subject) {
          const matchedSub = dmSubjects.find((s: any) => s.name === a.subject || s.id === a.subject || s._id === a.subject);
          if (matchedSub) normSubjectId = matchedSub.id || matchedSub._id;
        }
        return { mediumId: normMediumId, className: a.className, subjectId: normSubjectId };
      });
    }

    setFormData({
      name: teacher.name,
      penNumber: teacher.penNumber,
      designation: teacher.designation || DESIGNATIONS[0],
      teacherAssignments: assignments
    });
    setShowModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex-1 h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={24} /> Teacher Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage teachers and supervise their question contributions.</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role !== 'SCHOOL' && (
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 shrink-0">Select School:</span>
              <SearchableSelect
                value={selectedSchId}
                onChange={(v) => setSelectedSchId(v)}
                options={schools.map(s => ({
                  value: s.id,
                  label: `${s.name} (${s.code || s.schoolCode || ''})`,
                  subLabel: `Code: ${s.code || s.schoolCode || ''}`,
                  searchTerms: `${s.name} ${s.code || s.schoolCode || ''} ${s.username || ''}`
                }))}
                placeholder="Select school..."
                searchPlaceholder="Search school by name or code..."
                minWidth={280}
              />
            </div>
          )}
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '',
                penNumber: '',
                designation: DESIGNATIONS[0],
                teacherAssignments: []
              });
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 transition-colors font-medium whitespace-nowrap"
          >
            <Plus size={18} />
            Add Teacher
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center dark:text-white">Loading teachers...</div>
        ) : teachers.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">No teachers found. Click "Add Teacher" to configure one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="p-4 font-semibold text-center w-12">#</th>
                  <th className="p-4 font-semibold">Teacher Name</th>
                  <th className="p-4 font-semibold">PEN Number</th>
                  <th className="p-4 font-semibold">Subjects & Classes</th>
                  <th className="p-4 font-semibold text-center">Questions Contributed</th>
                  <th className="p-4 font-semibold text-center">Password</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {teachers.map((t, idx) => {
                  const tStats = getStatsForTeacher(t.penNumber);
                  return (
                    <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4 text-center text-gray-500 dark:text-gray-400 text-xs font-bold">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900 dark:text-white">{t.name}</div>
                        <div className="text-xs text-gray-500">{t.designation}</div>
                      </td>
                      <td className="p-4 font-mono text-gray-600 dark:text-gray-300">{t.penNumber}</td>
                      <td className="p-4 whitespace-normal max-w-[250px] sm:max-w-[300px] md:max-w-md break-words">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {(t.teachingSubjects || []).map((sub: string) => {
                            const subUpper = sub.toUpperCase().replace(/\s*\([A-Z]*M\)\s*/g, '').trim();
                            const pillColors: Record<string, string> = {
                              'MATHEMATICS': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                              'PHYSICS': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
                              'CHEMISTRY': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800',
                              'BIOLOGY': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
                              'ENGLISH': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                              'HINDI': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
                              'TAMIL AT': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
                              'TAMIL BT': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
                              'MALAYALAM AT': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800',
                              'MALAYALAM BT': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800',
                              'SOCIAL SCIENCE': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
                              'ARABIC': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
                              'URDU': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800',
                              'SANSKRIT': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800',
                            };
                            const colorClass = pillColors[subUpper] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-700';
                            return (
                              <span key={sub} className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${colorClass}`}>
                                {sub}
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-xs text-gray-500">Classes: {t.assignedSubjects?.join(', ') || '-'} | Med: {t.mediums?.join(', ') || '-'}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold" title="Total Submitted">
                            {tStats.total} Total
                          </span>
                          <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded text-xs font-bold" title="Approved">
                            {tStats.approved} Approved
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleResetPassword(t._id)} 
                          className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded shadow-sm border border-amber-200 dark:border-amber-800 transition-colors"
                        >
                          Reset
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => openEditModal(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded mr-2">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(t._id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} disableOutsideClick={true}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">{editingId ? 'Edit Teacher' : 'Add New Teacher'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-800 dark:hover:text-white">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Teacher Name</label>
                  <input required type="text" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">PEN Number</label>
                    {editingId && (
                      <button 
                        type="button" 
                        onClick={handleResetPassword} 
                        className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded shadow-sm border border-amber-200 dark:border-amber-800 transition-colors uppercase font-bold tracking-wider"
                      >
                        Reset Pass
                      </button>
                    )}
                  </div>
                  <input required type="text" disabled={!!editingId} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={formData.penNumber} onChange={e => setFormData({...formData, penNumber: e.target.value})} placeholder="Unique PEN" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Designation</label>
                  <Dropdown
                    className="w-full"
                    value={formData.designation}
                    onChange={(v) => setFormData({...formData, designation: v})}
                    options={DESIGNATIONS.map(d => ({ value: d, label: d }))}
                  />
                </div>
              </div>

              {/* Assignment Builder */}
              <div className="bg-gray-50 dark:bg-gray-800/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Teacher Assignments</label>
                  <button 
                    type="button" 
                    onClick={handleAddAssignment}
                    className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm rounded-lg font-bold shadow-sm transition-colors"
                  >
                    <Plus size={16} /> Add Assignment
                  </button>
                </div>
                
                 {/* Medium Tabs for Assignments */}
                 <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto pb-1">
                   {['All', ...eligibleMediums.map(m => m.name)].map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveAssignTab(tab)}
                      className={`px-4 py-2 font-bold text-sm whitespace-nowrap transition-colors border-b-2 ${
                        activeAssignTab === tab
                          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                          : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      {tab === 'All' ? 'All Mediums' : `${tab} Medium`}
                    </button>
                  ))}
                </div>

                {/* List of Added Assignments */}
                {formData.teacherAssignments.length > 0 ? (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                      {formData.teacherAssignments.map((assign, idx) => {
                        const assignMedName = dmMediums.find(m => m.id === assign.mediumId)?.name || '';
                        if (activeAssignTab !== 'All' && assignMedName && assignMedName !== activeAssignTab) {
                          return null;
                        }

                        let isSubjectIneligible = false;

                        if (assign.subjectId) {
                          const sObj = dmSubjects.find(s => s.id === assign.subjectId || s._id === assign.subjectId);
                          const stateSubject = (sObj?.name || '').toUpperCase();
                          isSubjectIneligible = !isSubjectEligibleForDesignation(stateSubject, formData.designation);
                        }

                        return (
                        <li key={idx} className="p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
                            <div className="flex-1">
                              <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Class & Div</label>
                              <select 
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none"
                                value={assign.className}
                                onChange={(e) => handleUpdateAssignment(idx, 'className', e.target.value)}
                              >
                                <option value="" disabled>Select Class</option>
                                {(() => {
                                  const assignMedName = dmMediums.find(m => m.id === assign.mediumId)?.name || '';
                                  const filteredClassesForDropdown = availableClasses.filter(c => {
                                    if (!assignMedName) return true;
                                    const cData = classDivisionsData.find(cd => `${cd.className}${cd.division || ''}` === c);
                                    if (!cData || !cData.mediums || cData.mediums.length === 0) return true;
                                    return cData.mediums.includes(assignMedName);
                                  });
                                  return filteredClassesForDropdown.map(c => <option key={c} value={c}>Class {c}</option>);
                                })()}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Medium</label>
                              <select 
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none"
                                value={assign.mediumId}
                                onChange={(e) => handleUpdateAssignment(idx, 'mediumId', e.target.value)}
                                disabled={!assign.className}
                              >
                                <option value="" disabled>Select Medium</option>
                                {(() => {
                                  const selectedClassDiv = classDivisionsData.find(c => `${c.className}${c.division || ''}` === assign.className);
                                  const activeMediums = eligibleMediums;
                                  
                                  return activeMediums
                                    .filter(m => activeAssignTab === 'All' || m.name === activeAssignTab)
                                    .filter(m => {
                                      if (!selectedClassDiv || !selectedClassDiv.mediums || selectedClassDiv.mediums.length === 0) return true;
                                      const mId = m.id || (m as any)._id;
                                      return selectedClassDiv.mediums.some((cm: string) => {
                                        const cmId = resolveMediumId(cm, dmMediums);
                                        return (cmId && mId && cmId === mId) || cm.toLowerCase().includes((m.name || '').toLowerCase()) || (m.name || '').toLowerCase().includes(cm.toLowerCase());
                                      });
                                    })
                                    .map(m => <option key={m.id} value={m.id}>{m.name}</option>);
                                })()}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Subject</label>
                              <select 
                                className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none ${
                                  isSubjectIneligible 
                                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}
                                 value={assign.subjectId}
                                 onChange={(e) => handleUpdateAssignment(idx, 'subjectId', e.target.value)}
                                 disabled={!assign.mediumId}
                               >
                                <option value="" disabled>Select Subject</option>
                                {(() => {
                                  const assignMedId = assign.mediumId;
                                  const matchedMediumObj = eligibleMediums.find(m => m.id === assignMedId);
                                  
                                  const availableSubjectsForMedium = dmSubjects.filter(s => s.active !== false);
                                  
                                  const subjectsForMedium = matchedMediumObj
                                    ? availableSubjectsForMedium.filter(s => {
                                        const matchId = matchedMediumObj.id || (matchedMediumObj as any)._id;
                                        const sMedId = resolveMediumId(s.mediumId || s.medium || (s as any).mediumName || '', dmMediums);
                                        
                                        const isSmartSuggestion = isSubjectEligibleForDesignation(s.name || '', formData.designation);
                                        const desLower = (formData.designation || '').toLowerCase();
                                        const isLangDes = desLower.includes('english') || desLower.includes('hindi') || desLower.includes('malayalam') || desLower.includes('tamil') || desLower.includes('arabic') || desLower.includes('urdu') || desLower.includes('sanskrit');

                                        let extractedMedName = '';
                                        const upperSubName = (s.name || '').toUpperCase();
                                        if (upperSubName.includes('(EM)')) extractedMedName = 'English';
                                        else if (upperSubName.includes('(TM)')) extractedMedName = 'Tamil';
                                        else if (upperSubName.includes('(MM)')) extractedMedName = 'Malayalam';
                                        else if (upperSubName.includes('(KM)')) extractedMedName = 'Kannada';
                                        else if (upperSubName.includes('(HM)')) extractedMedName = 'Hindi';

                                        const effectiveSMedId = extractedMedName ? resolveMediumId(extractedMedName, dmMediums) : sMedId;

                                        if (effectiveSMedId && matchId && effectiveSMedId !== matchId) {
                                          if (extractedMedName) return false;
                                          if (!isSmartSuggestion || !isLangDes) return false;
                                        }
                                        return true;
                                      })
                                    : availableSubjectsForMedium;
                                  
                                  const uniqueSubjects: any[] = [];
                                  const seen = new Set();
                                  for (const s of subjectsForMedium) {
                                    if (!seen.has(s.name)) {
                                      seen.add(s.name);
                                      uniqueSubjects.push(s);
                                    }
                                  }

                                  uniqueSubjects.sort((a, b) => {
                                    const codeA = a.code || a.paperType || '';
                                    const codeB = b.code || b.paperType || '';
                                    if (codeA && codeB && codeA !== codeB) {
                                      return codeA.localeCompare(codeB);
                                    }
                                    return (a.name || '').localeCompare(b.name || '');
                                  });

                                  const eligible: any[] = [];
                                  const others: any[] = [];

                                  uniqueSubjects.forEach((sub: any) => {
                                    if (isSubjectEligibleForDesignation(sub.name || '', formData.designation)) {
                                      eligible.push(sub);
                                    } else {
                                      others.push(sub);
                                    }
                                  });

                                  return (
                                    <>
                                      <optgroup label="Eligible Subject Suggestions">
                                        {eligible.length > 0 ? (
                                          eligible.map((s) => <option key={s.id || s._id} value={s.id || s._id} className="font-bold text-indigo-700 dark:text-indigo-400">{s.name}</option>)
                                        ) : (
                                          <option disabled>{others.length > 0 ? 'None matching this designation' : 'No subjects available for this medium'}</option>
                                        )}
                                      </optgroup>
                                      {others.length > 0 && (
                                        <optgroup label="Other Subjects">
                                          {others.map((s) => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                                        </optgroup>
                                      )}
                                    </>
                                  );
                                })()}
                              </select>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleRemoveAssignment(idx)}
                            className="p-1.5 mt-4 md:mt-0 md:self-end text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded transition-colors flex items-center justify-center"
                            title="Remove"
                          >
                            <Trash2 size={20} />
                          </button>
                        </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm font-medium border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    Click "Add Assignment" to start building the list.
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 mt-6 pt-5">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all">Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md active:scale-95 transition-all">Save Teacher Config</button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
