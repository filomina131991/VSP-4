import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { ChevronDown, Search, Check, AlertCircle } from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  academicYear?: string;
  standard?: string;
}

interface ExamSelectProps {
  exams: Exam[];
  selectedExamId: string;
  onSelect: (examId: string) => void;
  placeholder?: string;
  className?: string;
  configuredIds?: string[];
}

const ExamSelect: React.FC<ExamSelectProps> = ({
  exams,
  selectedExamId,
  onSelect,
  placeholder = 'Select Exam',
  className = '',
  configuredIds = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredExams = useMemo(() => {
    if (!searchQuery) return exams;
    const q = searchQuery.toLowerCase();
    return exams.filter(ex =>
      ex.name.toLowerCase().includes(q) ||
      (ex.academicYear || '').toLowerCase().includes(q)
    );
  }, [exams, searchQuery]);

  const selectedExam = exams.find(e => e.id === selectedExamId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    const items = filteredExams;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIdx >= 0 && items[highlightedIdx]) {
      e.preventDefault();
      onSelect(items[highlightedIdx].id);
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIdx(-1);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIdx(-1);
    }
  }, [isOpen, filteredExams, highlightedIdx, onSelect]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => { setIsOpen(prev => !prev); setSearchQuery(''); setHighlightedIdx(-1); }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); setIsOpen(true); } }}
        className={`w-full text-left px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border-2 ${
          selectedExam
            ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-600/80 hover:border-emerald-500'
            : 'bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] hover:border-gray-300 dark:hover:border-gray-500'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight whitespace-nowrap">
              {selectedExam?.name || placeholder}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 mt-1">
            {selectedExam && (
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
            )}
            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top"
          style={{ minWidth: '320px' }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-gray-900/30">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setHighlightedIdx(0); }}
              className="w-full bg-transparent border-none text-xs font-bold text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-80 overflow-y-auto overscroll-contain divide-y divide-gray-50 dark:divide-gray-800">
            {filteredExams.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs font-bold text-gray-400">No exams match your search</div>
            ) : filteredExams.map((ex, idx) => {
              const isSelected = ex.id === selectedExamId;
              const isConfigured = configuredIds.includes(ex.id);

              return (
                <div
                  key={ex.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onSelect(ex.id); setIsOpen(false); setSearchQuery(''); setHighlightedIdx(-1); }}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  className={`px-4 py-3.5 cursor-pointer transition-all ${
                    idx === highlightedIdx
                      ? 'bg-gray-50 dark:bg-gray-800/60'
                      : isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  } ${isConfigured ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-black leading-tight whitespace-nowrap ${isSelected ? 'text-emerald-900 dark:text-emerald-200' : 'text-gray-900 dark:text-white'}`}>
                        {ex.name}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          Academic Year : {ex.academicYear || 'N/A'}
                        </span>
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          Class : {ex.standard || '10'}
                        </span>
                      </div>
                    </div>

                    {isConfigured ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-1">
                        <Check size={11} className="text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <AlertCircle size={16} className="text-amber-500 shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSelect;
