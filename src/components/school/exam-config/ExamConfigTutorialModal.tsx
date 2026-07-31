import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';

interface ExamConfigTutorialModalProps {
  onClose: () => void;
}

const ExamConfigTutorialModal: React.FC<ExamConfigTutorialModalProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [canClose, setCanClose] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      // If user scrolls near the bottom, allow closing
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setCanClose(true);
      }
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      if (contentRef.current.scrollHeight <= contentRef.current.clientHeight) {
        setCanClose(true);
      }
    }
  }, []);

  const handleRedirect = () => {
    navigate('/dashboard/students-manage');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6">
      <div className="bg-white dark:bg-[#1a1f26] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header - Intentionally no close button as per request */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Exam Configuration Tutorial</h2>
          <span className="text-sm text-slate-500">Please view the complete tutorial</span>
        </div>

        {/* Content Body */}
        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="p-6 overflow-y-auto flex-1 space-y-6"
        >
          {/* Dummy HTML Tutorial Content */}
          <div className="prose dark:prose-invert max-w-none">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Welcome to Exam Configuration</h3>
            <p>
              In this section, you will learn how to properly configure exams for your school. 
              The exam configuration determines which subjects are assigned to which medium and division.
            </p>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 my-6">
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Step 1: Verify Mediums</h4>
              <p className="text-sm">Ensure that all your school's operating mediums (Tamil, English, Malayalam) are correctly selected for each division.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 my-6">
              <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Step 2: Assign First Languages</h4>
              <p className="text-sm">Based on the selected medium, ensure the correct First Language papers (e.g., TAMIL AT, MALAYALAM AT) are assigned.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 my-6">
              <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">Step 3: Save Configuration</h4>
              <p className="text-sm">Once you have verified all details, save your configuration. You can then proceed to Student Management or Teacher Management.</p>
            </div>
            
            {/* Make it tall enough to require scrolling */}
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl my-6">
              <span className="text-slate-400">Video Placeholder</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#1a1f26]/80">
          <button
            onClick={onClose}
            disabled={!canClose}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              canClose 
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 cursor-pointer' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <X size={18} />
            Close
          </button>

          <button
            onClick={handleRedirect}
            className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md flex items-center gap-2"
          >
            எக்ஸாம் காண்பிக்
            <ExternalLink size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamConfigTutorialModal;
