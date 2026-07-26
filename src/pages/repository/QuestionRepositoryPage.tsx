import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData, useSubjects, useMediums } from '../../context/DataContext';
import { apiClient } from '../../lib/apiClient';
import { Plus, Search, CheckCircle, XCircle, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { renderLatex } from '../../lib/renderLatex';
import { mediumNameToId } from '../../lib/mediumUtils';
import { filterSubjectsByMedium } from '../../lib/subjectUtils';
import NewQuestionModal from '../../components/repository/NewQuestionModal';
import ViewQuestionModal from '../../components/repository/ViewQuestionModal';
import Dropdown from '../../components/common/Dropdown';

const getMarkColor = (marks: number) => {
  switch (Number(marks)) {
    case 1: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case 2: return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case 3: return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case 5: return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case 10: return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
    default: return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
  }
};
export default function QuestionRepositoryPage() {
  const { user } = useAuth();
  const { mediums: allMediums, subjects: allSubjects } = useData();
  const isManager = ['WEBMASTER', 'DEO', 'DIET', 'SUBJECT_EXPERT'].includes(user?.role || '');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [viewingQuestion, setViewingQuestion] = useState<any>(null);
  
  // Filter states
  const [filterClass, setFilterClass] = useState('');
  const [filterMedium, setFilterMedium] = useState(() => {
    if (user?.mediums && Array.isArray(user.mediums) && user.mediums.length > 0) {
      return user.mediums[0];
    }
    return '';
  });

  useEffect(() => {
    if (user?.mediums && Array.isArray(user.mediums) && user.mediums.length > 0) {
      if (!user.mediums.includes(filterMedium)) {
        setFilterMedium(user.mediums[0]);
      }
    }
  }, [user]);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMarks, setFilterMarks] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterSubUnit, setFilterSubUnit] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'SUBJECT_EXPERT') {
      apiClient.get('/subject-expert/teachers').then(res => setTeachers(res.data));
    }
  }, [user]);

  const mediumIdToName = (id: string): string => {
    const m = allMediums.find(med => med.id === id);
    return m ? m.shortName : '';
  };

  const getFilteredSubjects = () => {
    let filtered = allSubjects.filter(s => s.active !== false);

    if (filterMedium) {
      filtered = filterSubjectsByMedium(filtered, filterMedium, allMediums);
    }
    
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

  const availableMediums = allMediums
    .filter(m => {
      if (user?.mediums && Array.isArray(user.mediums) && user.mediums.length > 0) {
        return user.mediums.includes(m.shortName) || user.mediums.includes(m.code);
      }
      return true;
    })
    .map(m => m.shortName);

  useEffect(() => {
    fetchQuestions();
  }, [filterClass, filterMedium, filterSubject, filterStatus, filterTeacher, filterMarks]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/questions', {
        params: {
          className: filterClass,
          medium: filterMedium,
          subjectId: filterSubject,
          status: filterStatus,
          createdBy: filterTeacher,
          marks: filterMarks
        }
      });
      setQuestions(res.data);
    } catch (error: any) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    let remarks = '';
    if (newStatus === 'Rejected' || newStatus === 'Returned for Modification') {
      const reason = window.prompt(`Please provide a reason for ${newStatus}:`);
      if (reason === null) return; // User cancelled
      remarks = reason;
    }
    
    try {
      await apiClient.patch(`/questions/${id}/status`, { status: newStatus, remarks });
      toast.success(`Question marked as ${newStatus}`);
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string, status: string) => {
    if (status === 'Approved' && !isManager) {
      return toast.error("Cannot delete an approved question. Contact Administrator or Subject Expert.");
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/questions/${id}`);
        toast.success("Question deleted");
        fetchQuestions();
      } catch (error) {
        toast.error("Failed to delete question");
      }
    }
  };

  const handleEdit = (q: any) => {
    if (q.status === 'Approved' && !isManager) {
      return toast.error("Cannot edit an approved question. Contact Administrator or Subject Expert.");
    }
    setEditingQuestion(q);
  };

  const uniqueUnits = Array.from(new Set(questions.map(q => q.unit || q.chapter).filter(Boolean))).sort();
  const uniqueSubUnits = Array.from(new Set(
    questions
      .filter(q => !filterUnit || (q.unit || q.chapter) === filterUnit)
      .map(q => q.subUnit)
      .filter(Boolean)
  )).sort();

  const displayedQuestions = questions.filter(q => {
    let match = true;
    if (filterUnit && (q.unit || q.chapter) !== filterUnit) match = false;
    if (filterSubUnit && q.subUnit !== filterSubUnit) match = false;
    return match;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto flex-1 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Question Repository</h1>
        {(user?.role === 'RESOURCE_PERSON' || user?.role === 'TEACHER') && (
          <button 
            onClick={() => setShowNewModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow transition-colors"
          >
            <Plus size={18} /> New Question
          </button>
        )}
      </div>

      {showNewModal && (
        <NewQuestionModal 
          onClose={() => setShowNewModal(false)} 
          onSuccess={() => {
            setShowNewModal(false);
            fetchQuestions();
          }}
        />
      )}
      {editingQuestion && (
        <NewQuestionModal 
          initialData={editingQuestion}
          onClose={() => setEditingQuestion(null)} 
          onSuccess={() => {
            setEditingQuestion(null);
            fetchQuestions();
          }}
        />
      )}
      {viewingQuestion && (
        <ViewQuestionModal 
          question={viewingQuestion}
          onClose={() => setViewingQuestion(null)}
        />
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm mb-6 flex gap-4 flex-wrap items-center">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Search size={18} />
          <span className="font-medium">Filter:</span>
        </div>
        <Dropdown
          value={filterMedium}
          onChange={(v) => setFilterMedium(v)}
          placeholder="All Mediums"
          options={availableMediums.map(m => ({ value: m, label: m }))}
        />
        <Dropdown
          minWidth={200}
          value={filterSubject}
          onChange={(v) => setFilterSubject(v)}
          placeholder="All Subjects"
          options={filteredSubjects.map(s => ({ value: s._id || s.id, label: s.name }))}
        />
        <Dropdown
          value={filterClass}
          onChange={(v) => setFilterClass(v)}
          placeholder="All Classes"
          options={[
            { value: '8', label: 'Class 8' },
            { value: '9', label: 'Class 9' },
            { value: '10', label: 'Class 10' },
          ]}
        />
        <Dropdown
          value={filterMarks}
          onChange={(v) => setFilterMarks(v)}
          placeholder="All Marks"
          options={[
            { value: '1', label: '1 Mark' },
            { value: '2', label: '2 Marks' },
            { value: '3', label: '3 Marks' },
            { value: '5', label: '5 Marks' },
            { value: '10', label: '10 Marks' },
          ]}
        />
        <Dropdown
          value={filterStatus}
          onChange={(v) => setFilterStatus(v)}
          placeholder="All Statuses"
          options={[
            ...(isManager ? [] : [{ value: 'Draft', label: 'Draft' }]),
            { value: 'Submitted', label: 'Submitted' },
            { value: 'Under Review', label: 'Under Review' },
            { value: 'Approved', label: 'Approved' },
            { value: 'Returned for Modification', label: 'Returned for Modification' },
            { value: 'Rejected', label: 'Rejected' },
          ]}
        />
        {user?.role === 'SUBJECT_EXPERT' && (
          <Dropdown
            minWidth={200}
            value={filterTeacher}
            onChange={(v) => setFilterTeacher(v)}
            placeholder="All Teachers"
            options={teachers.map(t => ({ value: t.username, label: `${t.name} (${t.username || 'N/A'})` }))}
          />
        )}
        
        {uniqueUnits.length > 0 && (
          <Dropdown
            minWidth={200}
            value={filterUnit}
            onChange={(v) => {
              setFilterUnit(v);
              setFilterSubUnit('');
            }}
            placeholder="All Units"
            options={uniqueUnits.map((u: any) => ({ value: u, label: u }))}
          />
        )}

        {uniqueSubUnits.length > 0 && (
          <Dropdown
            minWidth={200}
            value={filterSubUnit}
            onChange={(v) => setFilterSubUnit(v)}
            placeholder="All Subunits"
            options={uniqueSubUnits.map((su: any) => ({ value: su, label: su }))}
          />
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-10 dark:text-white">Loading...</div>
      ) : displayedQuestions.length === 0 ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">No questions found.</div>
      ) : (
        <div className="grid gap-4">
          {displayedQuestions.map((q, qIdx) => (
            <div key={q.id || q._id || qIdx} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-blue-300 transition-colors">
              <div className="flex-1">
                <div className="flex gap-2 items-center mb-3">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    Class {q.className}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getMarkColor(q.marks)}`}>
                    {q.marks} Marks
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                    q.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                    q.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                    'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                  }`}>
                    {q.status}
                  </span>
                </div>
                <div 
                  className="prose dark:prose-invert max-w-full text-sm line-clamp-3 mb-2"
                  dangerouslySetInnerHTML={{ __html: renderLatex(q.content) }}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Created By: <span className="font-medium text-gray-700 dark:text-gray-300">{q.createdBy}</span> | ID: {q.id}
                  {q.remarks && <div className="mt-1 text-red-500 font-medium">Remarks: {q.remarks}</div>}
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-stretch md:items-center whitespace-nowrap">
                {isManager && ['Submitted', 'Under Review'].includes(q.status) && (
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStatusChange(q.id, 'Approved')}
                        className="flex-1 flex items-center justify-center gap-1 text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/50 px-2 py-1.5 rounded text-sm transition-colors"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button 
                        onClick={() => handleStatusChange(q.id, 'Rejected')}
                        className="flex-1 flex items-center justify-center gap-1 text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 dark:bg-green-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-2 py-1.5 rounded text-sm transition-colors"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                    <button 
                      onClick={() => handleStatusChange(q.id, 'Returned for Modification')}
                      className="w-full text-orange-700 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    >
                      Return for Modification
                    </button>
                  </div>
                )}
                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => setViewingQuestion(q)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800/50"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => handleEdit(q)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(q.id, q.status)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
