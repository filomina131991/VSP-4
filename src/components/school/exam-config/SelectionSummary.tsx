import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

interface SelectedSubject {
  id: string;
  name: string;
  code: string;
}

interface SelectionSummaryProps {
  selectedSubjects: SelectedSubject[];
  onRemove: (id: string) => void;
}

export const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  selectedSubjects,
  onRemove,
}) => {
  if (selectedSubjects.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-[#1a1f26] border border-slate-100 dark:border-[#30363d] rounded-2xl p-4 text-center text-slate-400 dark:text-gray-500 font-semibold text-xs">
        No subjects selected yet. Select subjects below to build your configuration.
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50/30 to-slate-50/50 dark:from-indigo-950/10 dark:to-slate-900/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-semibold text-xs">
        <Sparkles size={14} className="text-indigo-500 animate-pulse" />
        <span>Current Subject Selection Summary ({selectedSubjects.length})</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {selectedSubjects.map((sub) => (
            <motion.div
              key={sub.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-white dark:bg-[#161b22] border border-indigo-100 dark:border-indigo-900/40 text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 shadow-sm"
            >
              <span>{sub.name}</span>
              <span className="text-[9px] text-indigo-400 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                {sub.code}
              </span>
              <button
                onClick={() => onRemove(sub.id)}
                className="p-0.5 rounded-md text-indigo-300 dark:text-indigo-500 hover:bg-slate-100 dark:hover:bg-[#21262d] hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                title={`Remove ${sub.name}`}
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SelectionSummary;
