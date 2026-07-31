import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/apiClient';
import { ClipboardList, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { mediumNameToId } from '../../lib/mediumUtils';
import { filterSubjectsByMedium } from '../../lib/subjectUtils';
import Dropdown from '../../components/common/Dropdown';

export default function TaskAssignmentPage() {
  const { user } = useAuth();
  const { mediums, subjects } = useData();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  
  const [selectedMedium, setSelectedMedium] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [markDistribution, setMarkDistribution] = useState<{ mark: number, count: number }[]>([{ mark: 1, count: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
    fetchTasks();
  }, []);

  const fetchInitialData = async () => {
    try {
      const chapterRes = await apiClient.get('/chapters');
      setChapters(chapterRes.data);

      const teachersRes = await apiClient.get('/subject-expert/teachers');
      setTeachers(teachersRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/subject-expert/tasks');
      setTasks(res.data);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !selectedUnit || selectedTeachers.length === 0 || markDistribution.reduce((sum, item) => sum + item.count, 0) < 1) {
      toast.error('Please fill in all fields and select at least one teacher');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/subject-expert/tasks', {
        subjectId: selectedSubject,
        unit: selectedUnit,
        teacherIds: selectedTeachers,
        markDistribution
      });
      toast.success('Tasks assigned successfully!');
      fetchTasks();
      // Reset form
      setSelectedUnit('');
      setSelectedTeachers([]);
      setMarkDistribution([{ mark: 1, count: 1 }]);
    } catch (error) {
      toast.error('Failed to assign tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeacherToggle = (teacherId: string) => {
    setSelectedTeachers(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const getFilteredMediums = () => {
    const activeMediums = mediums.filter(m => m.active);
    if (user?.role === 'SUBJECT_EXPERT' && user.mediums && Array.isArray(user.mediums) && user.mediums.length > 0) {
      return activeMediums.filter(m => {
        const mShort = (m.shortName || '').toUpperCase().trim();
        const mCode = (m.code || '').toUpperCase().trim();
        return user.mediums.some((um: string) => {
          const umUpper = (um || '').toUpperCase().trim();
          return mShort === umUpper || mCode === umUpper || m.name.toUpperCase().trim() === umUpper;
        });
      });
    }
    return activeMediums;
  };
  const availableMediums = getFilteredMediums();

  const getFilteredSubjects = () => {
    let allBaseSubjects = subjects.filter(s => s.active !== false);
    if (selectedMedium) {
      allBaseSubjects = filterSubjectsByMedium(allBaseSubjects, selectedMedium, mediums);
    }

    return allBaseSubjects.filter(sub => {
      const dbName = (sub.name || '').toUpperCase();

      if (user?.role === 'SUBJECT_EXPERT' && user.teachingSubjects && Array.isArray(user.teachingSubjects)) {
        const isAssigned = user.teachingSubjects.some((ts: string) => {
          const taught = ts.toUpperCase();
          if (taught === 'MATHS' && dbName.includes('MATHEMATICS')) return true;
          if (taught === 'ENGLISH' && dbName.includes('ENGLISH (SECOND')) return true;
          if (taught === 'HINDI' && (dbName.includes('HINDI (THIRD') || dbName.includes('ADDL. HINDI'))) return true;
          if (taught === 'SPECIAL ENGLISH' && dbName.includes('SPECIAL. ENGLISH')) return true;
          return dbName.includes(taught);
        });
        if (!isAssigned) return false;
      }
      return true;
    });
  };

  const filteredSubjects = getFilteredSubjects();

  useEffect(() => {
    if (availableMediums.length === 1 && !selectedMedium) {
      setSelectedMedium(availableMediums[0].shortName || availableMediums[0].name);
    }
  }, [availableMediums, selectedMedium]);

  useEffect(() => {
    if (filteredSubjects.length === 1 && !selectedSubject) {
      setSelectedSubject(filteredSubjects[0]._id || filteredSubjects[0].id);
    }
  }, [filteredSubjects, selectedSubject]);

  const filteredChapters = chapters.filter(c => c.subjectId === selectedSubject);

  const getFilteredTeachers = () => {
    return teachers.filter(t => {
      let matchesMedium = true;
      let matchesSubject = true;

      if (selectedMedium) {
        matchesMedium = t.mediums && t.mediums.includes(selectedMedium);
      }

      if (selectedSubject) {
        const subjObj = subjects.find(s => s._id === selectedSubject || s.id === selectedSubject);
        if (subjObj) {
          const subNameUpper = (subjObj.name || '').toUpperCase();
          const tSubjects = [...(t.teachingSubjects || []), ...(t.assignedSubjects || [])];
          matchesSubject = tSubjects.some((ts: string) => {
            const taught = ts.toUpperCase();
            if (taught === 'MATHS' && subNameUpper.includes('MATHEMATICS')) return true;
            if (taught === 'ENGLISH' && subNameUpper.includes('ENGLISH (SECOND')) return true;
            if (taught === 'HINDI' && (subNameUpper.includes('HINDI (THIRD') || subNameUpper.includes('ADDL. HINDI'))) return true;
            if (taught === 'SPECIAL ENGLISH' && subNameUpper.includes('SPECIAL. ENGLISH')) return true;
            return subNameUpper.includes(taught);
          });
        }
      }

      return matchesMedium && matchesSubject;
    });
  };

  const filteredTeachers = getFilteredTeachers();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Assignment</h1>
          <p className="text-gray-500">Assign question targets to teachers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-indigo-600" />
            New Assignment
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medium</label>
              <Dropdown
                className="w-full"
                value={selectedMedium}
                onChange={(v) => { setSelectedMedium(v); setSelectedSubject(''); setSelectedUnit(''); setSelectedTeachers([]); }}
                placeholder="Select Medium"
                options={availableMediums.map(m => ({ value: m.shortName || m.name, label: m.shortName || m.name }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <Dropdown
                className="w-full"
                value={selectedSubject}
                onChange={(v) => { setSelectedSubject(v); setSelectedUnit(''); setSelectedTeachers([]); }}
                placeholder="Select Subject"
                required
                options={filteredSubjects.map(s => ({ value: s._id || s.id, label: s.name }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit / Chapter</label>
              <Dropdown
                className="w-full"
                value={selectedUnit}
                onChange={(v) => setSelectedUnit(v)}
                placeholder="Select Unit"
                required
                disabled={!selectedSubject}
                options={filteredChapters.map(c => ({ value: c.chapterName, label: c.chapterName }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mark Distribution Target</label>
              <div className="space-y-2 border border-gray-200 rounded-md p-3 bg-gray-50">
                {markDistribution.map((md, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Mark:</label>
                      <Dropdown
                        value={String(md.mark)}
                        onChange={(v) => {
                          const newMd = [...markDistribution];
                          newMd[idx].mark = Number(v);
                          setMarkDistribution(newMd);
                        }}
                        options={[1, 2, 3, 4, 5, 8, 10].map(m => ({ value: String(m), label: `${m} Mark` }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Count:</label>
                      <input 
                        type="number" min="1" value={md.count}
                        onChange={e => {
                          const newMd = [...markDistribution];
                          newMd[idx].count = Number(e.target.value) || 1;
                          setMarkDistribution(newMd);
                        }}
                        className="px-2 py-1 border rounded w-20"
                      />
                    </div>
                    {markDistribution.length > 1 && (
                      <button type="button" onClick={() => setMarkDistribution(markDistribution.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1">
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setMarkDistribution([...markDistribution, { mark: 2, count: 1 }])} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center gap-1 mt-2">
                  <Plus size={14} /> Add Mark Target
                </button>
                <div className="text-xs text-gray-600 font-bold mt-2 border-t pt-2">
                  Total Target Questions: {markDistribution.reduce((sum, item) => sum + item.count, 0)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Teachers</label>
              <div className="border rounded-md max-h-48 overflow-y-auto p-2 bg-gray-50">
                {filteredTeachers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic p-2">No teachers found for selected criteria.</p>
                ) : (
                  filteredTeachers.map(t => (
                    <label key={t._id || t.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded">
                      <input 
                        type="checkbox"
                        checked={selectedTeachers.includes(t._id || t.id)}
                        onChange={() => handleTeacherToggle(t._id || t.id)}
                        className="rounded text-indigo-600"
                      />
                      <span className="text-sm">{t.name} ({t.username || 'N/A'}) - {t.schoolCode}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Tasks'}
            </button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-indigo-600" />
            Assigned Tasks
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No tasks assigned yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Target</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map(task => (
                    <tr key={task._id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {task.teacherName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {task.subjectName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {task.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.progress && task.progress.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {task.progress.map((p: any, i: number) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {p.mark === 'Total' ? '' : `${p.mark}m: `}{p.current}/{p.target}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-bold">{task.questionsCount}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
