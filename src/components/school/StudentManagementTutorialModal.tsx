import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, ChevronRight } from 'lucide-react';

interface StudentManagementTutorialModalProps {
  onClose: () => void;
}

const StudentManagementTutorialModal: React.FC<StudentManagementTutorialModalProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [canClose, setCanClose] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setCanClose(true);
      }
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      if (contentRef.current.scrollHeight <= contentRef.current.clientHeight + 50) {
        setCanClose(true);
      }
    }
    
    const timer = setTimeout(() => {
      setCanClose(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleRedirect = () => {
    navigate('/dashboard/students-manage');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6">
      <div className="bg-white dark:bg-[#1a1f26] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-indigo-900 dark:text-indigo-100">Student Management Guide</h2>
            <p className="text-sm text-indigo-600/80 dark:text-indigo-400/80 mt-1">Please review these important steps before proceeding</p>
          </div>
        </div>

        {/* Content Body */}
        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="p-6 overflow-y-auto flex-1 space-y-8 bg-slate-50/30 dark:bg-slate-900/10"
        >
          <div className="prose dark:prose-invert max-w-none">
            <div className="flex items-start gap-4 bg-white dark:bg-[#161b22] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0 mt-1">
                1
              </div>
              <div className="flex-1 space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 m-0">Select the Student Division</h3>
                <p className="text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                  When adding or updating students, first make sure you select the correct Division (e.g., A, B, C) from the dropdown. This is crucial for properly grouping students in your school.
                </p>
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                  <img 
                    src="/assets/sm_division_select.png" 
                    alt="Division Selection Step" 
                    className="w-full h-auto object-cover object-center max-h-[300px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white dark:bg-[#161b22] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mt-6">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-1">
                2
              </div>
              <div className="flex-1 space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 m-0">Set Medium and First Language</h3>
                <p className="text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                  Carefully select the Medium of Instruction and the correct First Language papers for the student. The Exam Configuration and Marks Entry pages dynamically depend on these values!
                </p>
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800 p-2 flex justify-center">
                  <img 
                    src="/assets/sm_lang_select.png" 
                    alt="Language and Medium Selection Step" 
                    className="w-full h-auto object-cover object-center max-h-[350px] rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5 mt-6 flex items-start gap-3 text-amber-800 dark:text-amber-200">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
              <p className="text-sm m-0 leading-relaxed font-medium">
                Once you complete these configurations, the Exam Configuration dashboard will automatically adapt to show only the selected Mediums and Languages for that class.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#1a1f26]">
          <button
            onClick={onClose}
            disabled={!canClose}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              canClose 
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer' 
                : 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <X size={18} />
            Close Guide
          </button>

          <button
            onClick={handleRedirect}
            className="px-6 py-2.5 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            Go to Student Management
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StudentManagementTutorialModal;
