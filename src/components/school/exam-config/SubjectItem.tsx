import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface SubjectItemProps {
  id: string;
  name: string;
  code: string;
  category: string;
  isSelected: boolean;
  onToggle: () => void;
}

export const SubjectItem: React.FC<SubjectItemProps> = ({
  name,
  code,
  category,
  isSelected,
  onToggle,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <motion.div
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`Select ${name}`}
      className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all duration-300 outline-none cursor-pointer select-none ${
        isSelected
          ? 'bg-indigo-55/60 dark:bg-indigo-950/20 border-indigo-500 dark:border-indigo-500 shadow-sm shadow-indigo-100/30'
          : 'bg-white dark:bg-[#161b22] border-slate-100 dark:border-[#30363d] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-[#21262d]/50'
      }`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Custom Checkbox */}
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-300 ${
            isSelected
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#21262d] group-hover:border-slate-400'
          }`}
        >
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <Check size={11} strokeWidth={3} />
            </motion.div>
          )}
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex-1 flex items-center justify-between pr-1">
          <span
            className={`font-semibold text-xs truncate transition-colors duration-200 ${
              isSelected ? 'text-indigo-950 dark:text-indigo-200 font-bold' : 'text-slate-700 dark:text-slate-200'
            }`}
            title={name}
          >
            {name}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#21262d] text-slate-500 dark:text-slate-400 text-[10px] font-bold border border-slate-200/50 dark:border-transparent shrink-0 ml-2">
            {code}
          </span>
        </div>
      </div>

      {/* Selected Indicator Checkmark */}
      {isSelected && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 mr-1"
        >
          ✓
        </motion.span>
      )}
    </motion.div>
  );
};

export default SubjectItem;
