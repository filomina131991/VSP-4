import React from 'react';
import Modal from '../common/Modal';
import { Database, AlertTriangle, RotateCcw, Trash2, Clock, BookOpen, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { DraftMetadata } from '../../lib/draftStore';

interface DraftRecoveryModalProps {
  isOpen: boolean;
  onClose?: () => void;
  metadata: DraftMetadata | null;
  onRestore: () => void;
  onDiscard: () => void;
  recordCount: number;
}

export const DraftRecoveryModal: React.FC<DraftRecoveryModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onRestore,
  onDiscard,
  recordCount,
}) => {
  if (!isOpen || !metadata) return null;

  const savedTimeFormatted = new Date(metadata.lastSavedTime).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      disableOutsideClick={true}
      className="flex items-center justify-center p-4 z-[99999]"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-scale-in p-6 sm:p-7 relative space-y-6 text-gray-800 dark:text-gray-200">
        {/* Banner */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 shadow-inner">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 rounded-xl flex-shrink-0 shadow-sm">
            <Database size={26} className="animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-base text-amber-900 dark:text-amber-300">
              Unsaved Local Draft Detected
            </h4>
            <p className="text-xs text-amber-800/80 dark:text-amber-400/90 mt-1 leading-relaxed">
              We found unsaved marks stored locally on your device from an earlier session (such as before an unexpected browser close, power disconnect, or network failure). Your entered marks are safely preserved!
            </p>
          </div>
        </div>

        {/* Draft Details Table */}
        <div className="bg-gray-50 dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-[#30363d] flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <BookOpen size={14} /> Draft Details
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/50">
              {recordCount} Student Records
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
            <div className="grid grid-cols-3 px-4 py-2.5">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Exam</span>
              <span className="col-span-2 font-semibold text-gray-900 dark:text-white">{metadata.examName || metadata.examId}</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-2.5">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Class & Div</span>
              <span className="col-span-2 font-semibold text-gray-900 dark:text-white">
                Class {metadata.className} {metadata.division && metadata.division !== 'ALL' ? `• Div ${metadata.division}` : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 px-4 py-2.5">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Subject</span>
              <span className="col-span-2 font-semibold text-indigo-600 dark:text-indigo-400">{metadata.subjectName || metadata.subjectId}</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-2.5 bg-indigo-50/30 dark:bg-indigo-950/10">
              <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                <Clock size={14} className="text-gray-400" /> Last Saved
              </span>
              <span className="col-span-2 font-bold text-gray-900 dark:text-emerald-400">{savedTimeFormatted}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onDiscard}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Discard Draft
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95"
          >
            <RotateCcw size={16} />
            Restore Draft
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DraftRecoveryModal;
