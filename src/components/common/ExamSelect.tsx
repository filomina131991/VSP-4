import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { FileText, ChevronDown, Search, Check } from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  academicYear?: string;
  standard?: string;
  confirmedSchools?: string[];
}

interface ExamSelectProps {
  exams: Exam[];
  selectedExamId: string;
  onSelect: (examId: string) => void;
  placeholder?: string;
  schoolId?: string;
  className?: string;
  configuredIds?: string[];
}

const ExamSelect: React.FC<ExamSelectProps> = ({
  exams,
  selectedExamId,
  onSelect,
  placeholder = 'Select Exam',
  schoolId,
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
    return exams.filter((ex: any) =>
      ex.name.toLowerCase().includes(q) ||
      (ex.academicYear || '').toLowerCase().includes(q)
    );
  }, [exams, searchQuery]);

  const selectedExam = exams.find((e: any) => e.id === selectedExamId);

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
      onSelect((items[highlightedIdx] as any).id);
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIdx(-1);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIdx(-1);
    }
  }, [isOpen, filteredExams, highlightedIdx, onSelect]);

  const isConfigured = selectedExamId ? configuredIds.includes(selectedExamId) : false;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => { setIsOpen(prev => !prev); setSearchQuery(''); setHighlightedIdx(-1); }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); setIsOpen(true); } }}
        className="w-full text-left bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] px-3.5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
      >
        <div className="flex items-start gap-2">
          <FileText size={15} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] sm:text-xs font-black uppercase leading-tight text-black dark:text-white break-words" title={selectedExam?.name || placeholder}>
              {selectedExam?.name || placeholder}
            </div>
            {selectedExam && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-px rounded-full ${isConfigured ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'}`}>
                  {isConfigured ? 'Configured' : 'Configure'}
                </span>
                {selectedExam.academicYear && (
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500">{selectedExam.academicYear}</span>
                )}
                {selectedExam.standard && (
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500">Class {selectedExam.standard}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {selectedExamId && <Check size={14} className="text-emerald-500" />}
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-gray-900/30">
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
          <div className="max-h-64 overflow-y-auto overscroll-contain divide-y divide-gray-50 dark:divide-gray-800">
            {filteredExams.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs font-bold text-gray-400">No exams match your search</div>
            ) : (filteredExams as any[]).map((ex, idx) => {
              const isSelected = ex.id === selectedExamId;
              const isConfirmed = schoolId ? ex.confirmedSchools?.includes(schoolId) : false;
              return (
                <div
                  key={ex.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onSelect(ex.id); setIsOpen(false); setSearchQuery(''); setHighlightedIdx(-1); }}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  className={`flex items-start gap-3 px-3.5 py-3 cursor-pointer transition-all ${
                    idx === highlightedIdx ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  } ${isSelected ? 'bg-indigo-50/80 dark:bg-indigo-950/20 border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <FileText size={14} className={isSelected ? 'text-indigo-600' : 'text-gray-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-black uppercase leading-tight break-words ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                      {ex.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                        Academic Year: {ex.academicYear || 'N/A'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hidden sm:inline">
                        Class {ex.standard || '10'}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      configuredIds.includes(ex.id)
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                    }`}>
                      {configuredIds.includes(ex.id) ? 'Configured' : 'Configure'}
                    </span>
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
