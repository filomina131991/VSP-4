import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, Users, BookOpen, BarChart3, Loader2, Eye, Phone, Mail, BadgeCheck, Briefcase } from 'lucide-react';
import Modal from '../common/Modal';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { sortSubjects, getSubjectShortLabel, getSubjectPCode } from '../../lib/subjectUtils';

interface TeacherInfo {
  name: string;
  penNumber: string;
  designation: string;
  phone: string;
  email: string;
}

interface SubjectStatus {
  subjectId: string;
  subjectName: string;
  shortName: string;
  code?: string;
  paperType?: string;
  displayOrder?: number;
  totalStudents: number;
  marksEntered: number;
  remaining: number;
  percentage: number;
  status: string;
  isSubjectConfirmed: boolean;
  workflowStatus: string;
  assignedTeachers: TeacherInfo[];
}

interface OverallStatus {
  totalStudents: number;
  totalMarksEntered: number;
  totalSubjects: number;
  confirmedSubjects: number;
  percentage: number;
  status: string;
}

interface MarkEntryStatusData {
  subjects: SubjectStatus[];
  overall: OverallStatus;
}

interface MarkEntryStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  examName: string;
}

const statusStyles: Record<string, { dot: string; text: string; bg: string; badge: string }> = {
  'Not Yet Started': {
    dot: 'bg-gray-400',
    text: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    badge: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
  'Pending': {
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  'Completed': {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
};

const MarkEntryStatusModal: React.FC<MarkEntryStatusModalProps> = ({ isOpen, onClose, examId, examName }) => {
  const { user } = useAuth();
  const [data, setData] = useState<MarkEntryStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailSubject, setDetailSubject] = useState<SubjectStatus | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const schoolId = user?.schoolId || user?.id;
      const res = await apiClient.get(`/marks/entry-status`, {
        params: { examId, schoolId }
      });
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load mark entry status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && examId) {
      fetchStatus();
    }
  }, [isOpen, examId]);

  const overall = data?.overall;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="items-start pt-4 sm:pt-8" disableOutsideClick={true}>
      <div className="bg-white dark:bg-[#161b22] rounded-3xl w-full max-w-5xl max-h-[88vh] shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-[#30363d] animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-[#30363d] bg-gradient-to-r from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
              <BarChart3 size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Mark Entry Status</h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                Exam: {examName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1a1f26] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="text-indigo-500 animate-spin" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading Status...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchStatus}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline"
              >
                Retry
              </button>
            </div>
          ) : !data || data.subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <BookOpen size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No subjects configured for this exam.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Overall Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-3 text-center">
                  <div className="text-[9px] font-black text-indigo-400 uppercase tracking-wider mb-1">Total Students</div>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{overall?.totalStudents || 0}</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 text-center">
                  <div className="text-[9px] font-black text-emerald-400 uppercase tracking-wider mb-1">Marks Entered</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{overall?.totalMarksEntered || 0}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 text-center">
                  <div className="text-[9px] font-black text-amber-400 uppercase tracking-wider mb-1">Remaining</div>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400">{(overall?.totalStudents || 0) - (overall?.totalMarksEntered || 0)}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 text-center">
                  <div className="text-[9px] font-black text-purple-400 uppercase tracking-wider mb-1">Confirmed</div>
                  <div className="text-xl font-black text-purple-600 dark:text-purple-400">{overall?.confirmedSubjects || 0}<span className="text-sm text-gray-400">/{overall?.totalSubjects || 0}</span></div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Overall %</div>
                  <div className="text-xl font-black text-gray-900 dark:text-white">{overall?.percentage || 0}%</div>
                </div>
              </div>

              {/* Overall Progress Bar */}
              <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Overall Completion</span>
                  <span className={`text-xs font-black uppercase tracking-wider ${
                    overall?.status === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' :
                    overall?.status === 'Pending' ? 'text-amber-600 dark:text-amber-400' :
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {overall?.status || 'Not Yet Started'}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      (overall?.percentage || 0) === 100 ? 'bg-emerald-500' :
                      (overall?.percentage || 0) > 0 ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                    style={{ width: `${overall?.percentage || 0}%` }}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-200 dark:border-[#30363d] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#1a1f26] border-b border-gray-200 dark:border-[#30363d]">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-8">#</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Subject</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Total Students</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Entered</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Remaining</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Percentage</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Status</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">View Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
                      {sortSubjects(data.subjects as any).map((subject: any, idx: number) => {
                        const st = statusStyles[subject.status] || statusStyles['Not Yet Started'];
                        return (
                          <tr
                            key={subject.subjectId}
                            className="hover:bg-gray-50/80 dark:hover:bg-[#1a1f26]/50 transition-colors"
                          >
                            <td className="px-4 py-3 text-[11px] font-bold text-gray-400">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="inline-flex items-center justify-center min-w-[32px] px-1.5 py-1 text-[10px] font-black uppercase rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs shrink-0">
                                  {getSubjectPCode(subject) || `P${String(idx + 1).padStart(2, '0')}`}
                                </span>
                                <div className="min-w-0">
                                  <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase block truncate">{getSubjectShortLabel(subject)}</span>
                                  <div className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-0.5 truncate max-w-[200px]">{subject.subjectName}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-black text-gray-900 dark:text-white">{subject.totalStudents}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{subject.marksEntered}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-black text-amber-600 dark:text-amber-400">{subject.remaining}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      subject.status === 'Completed' ? 'bg-emerald-500' :
                                      subject.status === 'Pending' ? 'bg-amber-500' : 'bg-gray-300'
                                    }`}
                                    style={{ width: `${subject.percentage}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 w-10 text-right">{subject.percentage}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${st.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {subject.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setDetailSubject(subject)}
                                className="inline-flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase tracking-wider"
                              >
                                <Eye size={12} />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-[#1a1f26] border-t-2 border-gray-200 dark:border-[#30363d]">
                        <td className="px-4 py-3" colSpan={2}>
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">TOTAL ({data.subjects.length} Subjects)</span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-black text-gray-900 dark:text-white">{overall?.totalStudents || 0}</td>
                        <td className="px-4 py-3 text-center text-sm font-black text-emerald-600 dark:text-emerald-400">{overall?.totalMarksEntered || 0}</td>
                        <td className="px-4 py-3 text-center text-sm font-black text-amber-600 dark:text-amber-400">{(overall?.totalStudents || 0) - (overall?.totalMarksEntered || 0)}</td>
                        <td className="px-4 py-3 text-center text-sm font-black text-indigo-600 dark:text-indigo-400">{overall?.percentage || 0}%</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            overall?.status === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' :
                            overall?.status === 'Pending' ? 'text-amber-600 dark:text-amber-400' :
                            'text-gray-500'
                          }`}>
                            {overall?.status}
                          </span>
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-gray-900/30">
          <button
            onClick={fetchStatus}
            disabled={isLoading}
            className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Status'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 dark:bg-[#30363d] hover:bg-gray-300 dark:hover:bg-indigo-600 dark:hover:text-white text-gray-800 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>

      {/* View Details Popup (Inner Modal) */}
      {detailSubject && (
        <Modal isOpen={!!detailSubject} onClose={() => setDetailSubject(null)} className="items-center" disableOutsideClick={true}>
          <div className="bg-white dark:bg-[#161b22] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 dark:border-[#30363d] animate-in fade-in zoom-in-95 duration-150">
            
            {/* Popup Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#30363d] bg-indigo-50/40 dark:bg-indigo-950/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Assigned Teachers</h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{detailSubject.shortName} — {detailSubject.subjectName}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailSubject(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1f26] text-gray-400 hover:text-gray-600 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Popup Body */}
            <div className="p-5">
              {detailSubject.assignedTeachers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle size={20} className="text-gray-400" />
                  </div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">No teachers assigned to this subject.</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Contact admin to assign a teacher.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detailSubject.assignedTeachers.map((teacher, tIdx) => (
                    <div
                      key={tIdx}
                      className="border border-gray-200 dark:border-[#30363d] rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/30"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-[11px] font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                          {teacher.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-gray-900 dark:text-white uppercase truncate">{teacher.name || 'N/A'}</div>
                          <div className="text-[9px] text-gray-400 font-bold uppercase">{teacher.designation || 'Teacher'}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BadgeCheck size={13} className="text-indigo-500 shrink-0" />
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">PEN Number</span>
                            <div className="text-[11px] font-bold text-gray-900 dark:text-white">{teacher.penNumber || '—'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Briefcase size={13} className="text-indigo-500 shrink-0" />
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Designation</span>
                            <div className="text-[11px] font-bold text-gray-900 dark:text-white">{teacher.designation || '—'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-indigo-500 shrink-0" />
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Mobile</span>
                            <div className="text-[11px] font-bold text-gray-900 dark:text-white">{teacher.phone || '—'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-indigo-500 shrink-0" />
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Email</span>
                            <div className="text-[11px] font-bold text-gray-900 dark:text-white">{teacher.email || '—'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popup Footer */}
            <div className="flex justify-end px-5 py-3 border-t border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-gray-900/30">
              <button
                onClick={() => setDetailSubject(null)}
                className="px-5 py-2 bg-gray-200 dark:bg-[#30363d] hover:bg-gray-300 dark:hover:bg-indigo-600 dark:hover:text-white text-gray-800 dark:text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default MarkEntryStatusModal;
