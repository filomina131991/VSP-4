import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface SubjectSectionProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  countText: string;
  selectedCountText?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const SubjectSection: React.FC<SubjectSectionProps> = ({
  title,
  icon,
  description,
  countText,
  selectedCountText,
  children,
  collapsible = true,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    if (collapsible) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-3xl border border-slate-100 dark:border-[#30363d] shadow-sm shadow-slate-100/40 overflow-hidden transition-all duration-300">
      {/* Header Container */}
      <div
        onClick={toggleOpen}
        className={`flex items-start justify-between p-6 ${
          collapsible ? 'cursor-pointer select-none hover:bg-slate-50/40 dark:hover:bg-[#21262d]/45' : ''
        } transition-colors duration-200`}
      >
        <div className="flex gap-4 items-start min-w-0">
          {/* Icon Badge */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
            {icon}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">
                {title}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-[#21262d] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#30363d]">
                {countText}
              </span>
              {selectedCountText && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                  {selectedCountText}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium leading-relaxed max-w-2xl">
              {description}
            </p>
          </div>
        </div>

        {collapsible && (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="p-1 rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-[#21262d] transition-all ml-4 shrink-0"
          >
            <ChevronDown size={18} />
          </motion.div>
        )}
      </div>

      {/* Children list */}
      <AnimatePresence initial={false}>
        {(!collapsible || isOpen) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-6 pb-6 border-t border-slate-50 dark:border-[#30363d] pt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubjectSection;
