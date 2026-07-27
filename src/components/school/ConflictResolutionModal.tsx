import React from 'react';
import Modal from '../common/Modal';
import { AlertTriangle, ShieldAlert, GitMerge, Upload, RefreshCcw, User, Clock, FileWarning } from 'lucide-react';
import { ConflictedRow } from '../../lib/draftStore';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose?: () => void;
  conflicts: ConflictedRow[];
  onKeepLocal: () => void;
  onReloadServer: () => void;
  onMerge: () => void;
  subjectName?: string;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onKeepLocal,
  onReloadServer,
  onMerge,
  subjectName = 'this subject',
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      disableOutsideClick={true}
      className="flex items-center justify-center p-4 z-[99999]"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-800 animate-scale-in p-6 sm:p-7 relative space-y-6 text-gray-800 dark:text-gray-200">
        {/* Warning Banner */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 shadow-sm">
          <div className="p-3 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl flex-shrink-0 shadow-sm">
            <ShieldAlert size={26} className="animate-bounce" />
          </div>
          <div>
            <h4 className="font-bold text-base text-rose-900 dark:text-rose-300">
              Newer Server Version Detected
            </h4>
            <p className="text-xs text-rose-800/80 dark:text-rose-400/90 mt-1 leading-relaxed">
              While you were entering marks for <strong className="font-semibold">{subjectName}</strong>, another session or user saved updated marks to the database. To protect data consistency, please select how to reconcile your local draft with the server version. We never overwrite server records silently.
            </p>
          </div>
        </div>

        {/* Conflicted Rows Preview Table */}
        {conflicts.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <FileWarning size={14} /> Conflicting Records ({conflicts.length})
            </span>
            <div className="max-h-56 overflow-y-auto rounded-2xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-inner text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-100 dark:bg-[#1f242d] border-b border-gray-200 dark:border-gray-800 z-10 font-semibold text-gray-600 dark:text-gray-400">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3 text-center">Your Draft</th>
                    <th className="py-2.5 px-3 text-center">Server Version</th>
                    <th className="py-2.5 px-3 text-right">Server Updated By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                  {conflicts.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-200">
                        {row.studentName || row.studentId}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-amber-600 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20">
                        {row.localGrade || row.localMarks !== undefined ? `${row.localMarks ?? ''} ${row.localGrade ? `(${row.localGrade})` : ''}` : 'Changed'}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20">
                        {row.serverGrade || row.serverMarks !== undefined ? `${row.serverMarks ?? ''} ${row.serverGrade ? `(${row.serverGrade})` : ''}` : 'Existing'}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500 dark:text-gray-400 text-[11px]">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{row.serverEditedBy || 'Another User'}</span>
                          {row.serverEditedAt && (
                            <span className="opacity-70 text-[10px]">
                              {new Date(row.serverEditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resolution Action Explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Reload Server */}
          <button
            type="button"
            onClick={onReloadServer}
            className="flex flex-col items-center justify-center text-center p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 bg-gray-50 dark:bg-[#1a1f26] hover:bg-gray-100 dark:hover:bg-gray-800/70 text-gray-800 dark:text-gray-200 transition-all duration-200 group cursor-pointer"
          >
            <div className="p-2.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 group-hover:bg-gray-300 dark:group-hover:bg-gray-700 mb-2 transition-colors">
              <RefreshCcw size={20} />
            </div>
            <span className="font-bold text-sm">Reload Server</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
              Discard local draft changes and reload the latest server marks.
            </span>
          </button>

          {/* Merge */}
          <button
            type="button"
            onClick={onMerge}
            className="flex flex-col items-center justify-center text-center p-4 rounded-2xl border-2 border-purple-200 dark:border-purple-800/60 hover:border-purple-500 dark:hover:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-950/40 text-purple-950 dark:text-purple-200 transition-all duration-200 group cursor-pointer shadow-sm relative overflow-hidden"
          >
            <span className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl uppercase tracking-wider">
              Recommended
            </span>
            <div className="p-2.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 group-hover:bg-purple-200 dark:group-hover:bg-purple-800 mb-2 transition-colors">
              <GitMerge size={20} />
            </div>
            <span className="font-bold text-sm text-purple-900 dark:text-purple-300">Merge Changes</span>
            <span className="text-[11px] text-purple-700/80 dark:text-purple-400/90 mt-1 leading-normal">
              Keep your locally edited records while accepting server updates for untouched records.
            </span>
          </button>

          {/* Keep Local */}
          <button
            type="button"
            onClick={onKeepLocal}
            className="flex flex-col items-center justify-center text-center p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-500 dark:hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 transition-all duration-200 group cursor-pointer shadow-sm"
          >
            <div className="p-2.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 mb-2 transition-colors">
              <Upload size={20} />
            </div>
            <span className="font-bold text-sm text-indigo-900 dark:text-indigo-300">Keep Local (Overwrite)</span>
            <span className="text-[11px] text-indigo-700/80 dark:text-indigo-400/90 mt-1 leading-normal">
              Overwrite the server version with your current local draft.
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConflictResolutionModal;
