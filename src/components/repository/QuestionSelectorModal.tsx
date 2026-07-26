import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import Modal from '../common/Modal';
import Dropdown from '../common/Dropdown';
import { renderLatex } from '../../lib/renderLatex';

interface QuestionSelectorModalProps {
  className: string;
  medium: string;
  subjectId: string;
  marks: number;
  selectedChapters?: string[];
  selectedSubUnits?: string[];
  excludeIds?: string[];
  onClose: () => void;
  onSelect: (question: any) => void;
}

export default function QuestionSelectorModal({ className, medium, subjectId, marks, selectedChapters = [], selectedSubUnits = [], excludeIds = [], onClose, onSelect }: QuestionSelectorModalProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/questions', {
          params: {
            className,
            subjectId,
            status: 'Approved',
            marks: marks
          }
        });
        
        // Filter by medium on client if backend doesn't support it
        let filtered = res.data.filter((q: any) => q.medium === medium);

        // Filter by selected chapters/subunits if provided
        if (selectedChapters.length > 0 || selectedSubUnits.length > 0) {
          const hasExactMatch = filtered.some((q: any) => 
            selectedChapters.includes(q.chapter) || 
            selectedChapters.includes(q.unit) || 
            (q.subUnit && selectedSubUnits.includes(q.subUnit))
          );
          if (hasExactMatch) {
            filtered = filtered.filter((q: any) => {
              const matchesChapter = selectedChapters.includes(q.chapter) || selectedChapters.includes(q.unit);
              const matchesSubUnit = q.subUnit && selectedSubUnits.includes(q.subUnit);
              return matchesChapter || matchesSubUnit;
            });
          }
        }

        if (excludeIds.length > 0) {
          filtered = filtered.filter((q: any) => !excludeIds.includes(q.id));
        }
        setQuestions(filtered);
      } catch (error) {
        console.error("Failed to load questions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [className, subjectId, marks, medium]);

  const [filterUnit, setFilterUnit] = useState('');
  const [filterSubUnit, setFilterSubUnit] = useState('');

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
    <Modal isOpen={true} onClose={onClose} className="p-4 md:p-6" disableOutsideClick={true}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Question</h2>
            <p className="text-sm text-gray-500">Class {className} | {medium} Medium | {marks} Marks</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {(!loading && questions.length > 0 && (uniqueUnits.length > 0 || uniqueSubUnits.length > 0)) && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by:</span>
            
            {uniqueUnits.length > 0 && (
              <Dropdown
                value={filterUnit}
                onChange={(v) => {
                  setFilterUnit(v);
                  setFilterSubUnit(''); // Reset subunit when unit changes
                }}
                placeholder="All Units"
                options={uniqueUnits.map(u => ({ value: u as string, label: u as string }))}
              />
            )}

            {uniqueSubUnits.length > 0 && (
              <Dropdown
                value={filterSubUnit}
                onChange={(v) => setFilterSubUnit(v)}
                placeholder="All Subunits"
                options={uniqueSubUnits.map(su => ({ value: su as string, label: su as string }))}
              />
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/50">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No approved questions found for these criteria.</div>
          ) : (
            <div className="space-y-4">
              {displayedQuestions.map((q, qIdx) => (
                <div key={q.id || q._id || qIdx} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex gap-4 items-center">
                  <div className="flex-1 overflow-hidden">
                    <div className="prose dark:prose-invert max-w-none text-sm mb-2 max-h-[150px] overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: renderLatex(q.content) }} />
                    <div className="text-xs text-gray-500 font-medium">Unit: {q.unit || 'N/A'} | Bloom's: {q.bloomLevel || 'N/A'}</div>
                  </div>
                  <button 
                    onClick={() => onSelect(q)}
                    className="shrink-0 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 px-4 py-2 rounded-md text-sm font-bold transition-colors"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
