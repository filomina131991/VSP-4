import React, { useState, useEffect } from 'react';
import { CheckCheck, RotateCcw, CheckSquare, Square, School, MapPin, BookOpen, FileText, AlertTriangle, ChevronDown } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import ExamSelect from '../../components/common/ExamSelect';

interface District {
  id: string;
  name: string;
}

interface EduDistrict {
  id: string;
  name: string;
  districtId: string;
}

interface SchoolItem {
  _id: string;
  id?: string;
  name: string;
  schoolCode: string;
  schoolType: string;
}

interface ExamItem {
  id: string;
  name: string;
  confirmedSchools: string[];
  academicYear?: string;
}

const BulkConfirmPage: React.FC = () => {
  const { user } = useAuth();
  const [districts, setDistricts] = useState<District[]>([]);
  const [eduDistricts, setEduDistricts] = useState<EduDistrict[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedEduId, setSelectedEduId] = useState('ALL');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.get('/management/districts').then(r => setDistricts(r.data)).catch(() => {});
    apiClient.get('/management/educational-districts').then(r => setEduDistricts(r.data)).catch(() => {});
    apiClient.get('/management/exams').then(r => {
      setExams(r.data);
      if (r.data.length > 0) setSelectedExamId(r.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDistrict) { setSchools([]); return; }
    setLoading(true);
    const params: any = {};
    if (selectedDistrict !== 'ALL') params.districtId = selectedDistrict;
    if (selectedEduId) params.eduId = selectedEduId;
    apiClient.get('/management/schools', { params })
      .then(r => setSchools(r.data))
      .catch(() => toast.error('Failed to load schools'))
      .finally(() => setLoading(false));
  }, [selectedDistrict, selectedEduId]);

  const filteredEduDistricts = eduDistricts.filter(e =>
    !selectedDistrict || selectedDistrict === 'ALL' || e.districtId === selectedDistrict
  );

  const exam = exams.find(e => e.id === selectedExamId);
  const confirmedSet = new Set(exam?.confirmedSchools || []);

  const isSchoolConfirmed = (schoolId?: string) => {
    if (!schoolId) return false;
    return confirmedSet.has(schoolId);
  };

  const getSchoolId = (s: SchoolItem) => s.id || s._id;

  const toggleSelect = (schoolId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(schoolId)) next.delete(schoolId);
      else next.add(schoolId);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = schools.map(s => getSchoolId(s)).filter(Boolean);
    setSelectedIds(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkConfirm = async () => {
    if (!selectedExamId || selectedIds.size === 0) return;
    const schoolIds = Array.from(selectedIds);
    const result = await Swal.fire({
      title: 'Confirm Schools?',
      text: `Mark ${schoolIds.length} school(s) as confirmed for "${exam?.name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Confirm',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post('/management/exams/bulk-confirm', {
        examId: selectedExamId,
        schoolIds,
        action: 'confirm'
      });
      toast.success(res.data.message);
      setSelectedIds(new Set());
      const updated = await apiClient.get('/management/exams');
      setExams(updated.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to confirm');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkReset = async () => {
    if (!selectedExamId || selectedIds.size === 0) return;
    const schoolIds = Array.from(selectedIds);
    const result = await Swal.fire({
      title: 'Reset Schools?',
      text: `Reset ${schoolIds.length} school(s) confirmation for "${exam?.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Reset',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post('/management/exams/bulk-confirm', {
        examId: selectedExamId,
        schoolIds,
        action: 'reset'
      });
      toast.success(res.data.message);
      setSelectedIds(new Set());
      const updated = await apiClient.get('/management/exams');
      setExams(updated.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reset');
    } finally {
      setSubmitting(false);
    }
  };

  const unconfirmedSchools = schools.filter(s => !isSchoolConfirmed(getSchoolId(s)));
  const confirmedSchoolsList = schools.filter(s => isSchoolConfirmed(getSchoolId(s)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <CheckCheck className="text-emerald-500" />
            Bulk Confirm
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Confirm or reset school submissions for an exam.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white dark:bg-[#161b22] rounded-xl border border-gray-100 dark:border-[#30363d] shadow-sm">
        {/* Exam */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5 block">Exam</label>
          <ExamSelect
            exams={exams}
            selectedExamId={selectedExamId}
            onSelect={(id) => { setSelectedExamId(id); setSelectedIds(new Set()); }}
            placeholder="Select Exam"
            className="min-w-[160px]"
          />
        </div>

        {/* District */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5 block">District</label>
          <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
            <select
              value={selectedDistrict}
              onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedEduId('ALL'); setSelectedIds(new Set()); }}
              className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
            >
              <option value="ALL" className="px-3 py-1.5 text-xs font-bold">All Districts</option>
              {districts.map(d => (
                <option key={d.id} value={d.id} className="px-3 py-1.5 text-xs font-bold">{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Edu District */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5 block">Sub District</label>
          <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
            <select
              value={selectedEduId}
              onChange={(e) => { setSelectedEduId(e.target.value); setSelectedIds(new Set()); }}
              className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
            >
              <option value="ALL" className="px-3 py-1.5 text-xs font-bold">All Sub Districts</option>
              {filteredEduDistricts.map(e => (
                <option key={e.id} value={e.id} className="px-3 py-1.5 text-xs font-bold">{e.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Count badge */}
        <div className="flex items-end">
          <div className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-[#30363d] flex items-center gap-2">
            <School size={16} className="text-gray-400" />
            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
              {schools.length} schools
            </span>
            <span className="text-xs font-bold text-emerald-600 ml-auto">
              {confirmedSchoolsList.length} confirmed
            </span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      {schools.length > 0 && selectedExamId && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-[#161b22] rounded-xl border border-gray-100 dark:border-[#30363d] shadow-sm">
          <button
            onClick={() => setSelectedIds(new Set(schools.filter(s => !isSchoolConfirmed(getSchoolId(s))).map(s => getSchoolId(s)).filter(Boolean)))}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
          >
            <CheckSquare size={14} /> Select Unconfirmed
          </button>
          <button
            onClick={selectAll}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
          >
            <CheckSquare size={14} /> Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Square size={14} /> Deselect All
          </button>

          <div className="flex-1" />

          <span className="text-xs font-bold text-gray-500 mr-2">{selectedIds.size} selected</span>

          <button
            onClick={handleBulkConfirm}
            disabled={selectedIds.size === 0 || submitting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white disabled:text-gray-500 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
          >
            <CheckCheck size={14} /> {submitting ? 'Processing...' : 'Confirm Selected'}
          </button>
          <button
            onClick={handleBulkReset}
            disabled={selectedIds.size === 0 || submitting}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white disabled:text-gray-500 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
          >
            <RotateCcw size={14} /> {submitting ? 'Processing...' : 'Reset Selected'}
          </button>
        </div>
      )}

      {/* School List */}
      {!selectedExamId ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">Select an exam to begin</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500 font-bold">Loading schools...</div>
      ) : schools.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <MapPin size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">No schools match your filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-[#30363d] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-[#30363d]">
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={schools.length > 0 && selectedIds.size === schools.length}
                    onChange={() => selectedIds.size === schools.length ? deselectAll() : selectAll()}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">School Code</th>
                <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">School Name</th>
                <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {schools.map(s => {
                const schoolId = getSchoolId(s);
                const confirmed = isSchoolConfirmed(schoolId);
                return (
                  <tr
                    key={schoolId}
                    className={cn(
                      'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30',
                      confirmed ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''
                    )}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(schoolId)}
                        onChange={() => toggleSelect(schoolId)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{s.schoolCode || '-'}</td>
                    <td className="px-3 py-3 font-bold text-gray-800 dark:text-gray-200">{s.name}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 uppercase">{s.schoolType || '-'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        'inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full',
                        confirmed
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                      )}>
                        {confirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmed summary */}
      {confirmedSchoolsList.length > 0 && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          <CheckCheck size={16} />
          {confirmedSchoolsList.length} of {schools.length} schools confirmed for this exam
        </div>
      )}
    </div>
  );
};

export default BulkConfirmPage;
