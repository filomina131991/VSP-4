import React from 'react';
import ReactDOM from 'react-dom';
import { X, BookOpen, Clock, BarChart, FileText } from 'lucide-react';
import Modal from '../common/Modal';
import { renderLatex } from '../../lib/renderLatex';

interface ViewQuestionModalProps {
  question: any;
  onClose: () => void;
}

export default function ViewQuestionModal({ question, onClose }: ViewQuestionModalProps) {
  if (!question) return null;
  const parsedOptions = Array.isArray(question.options) && question.questionType !== 'MCQ' ? question.options[0] : question.options;
  const TAMIL_VOWELS = ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'];

  const modalContent = (
    <Modal isOpen={true} onClose={onClose} disableOutsideClick={true}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-blue-600 dark:text-blue-400" /> Question Details
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">Class</div>
              <div className="font-bold text-gray-900 dark:text-white">{question.className}</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800/30">
              <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase mb-1">Marks</div>
              <div className="font-bold text-gray-900 dark:text-white">{question.marks}</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800/30">
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase mb-1">Difficulty</div>
              <div className="font-bold text-gray-900 dark:text-white">{question.difficulty || 'Medium'}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800/30">
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">Bloom's Level</div>
              <div className="font-bold text-gray-900 dark:text-white">{question.bloomLevel || 'Understand'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
             <div><span className="text-gray-500 font-semibold mr-2">Subject:</span> <span className="dark:text-gray-200 capitalize">{question.subjectId}</span></div>
             <div><span className="text-gray-500 font-semibold mr-2">Medium:</span> <span className="dark:text-gray-200">{question.medium}</span></div>
             {question.unit && <div><span className="text-gray-500 font-semibold mr-2">Unit:</span> <span className="dark:text-gray-200">{question.unit}</span></div>}
             {question.chapter && <div><span className="text-gray-500 font-semibold mr-2">Chapter:</span> <span className="dark:text-gray-200">{question.chapter}</span></div>}
             {question.subUnit && <div><span className="text-gray-500 font-semibold mr-2">Sub Unit:</span> <span className="dark:text-gray-200">{question.subUnit}</span></div>}
             {question.questionType && <div><span className="text-gray-500 font-semibold mr-2">Type:</span> <span className="dark:text-gray-200">{question.questionType}</span></div>}
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
             <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300">
               Question Content
             </div>
             <div className="p-4 bg-white dark:bg-[#161b22]">
               {parsedOptions?.isInternalChoice ? (
                 <div>
                   <div className="font-bold mb-3 text-sm">ஏதேனும் ஒன்றிற்கு விடையளிக்கவும்.</div>
                   <div className="ml-4 flex gap-2">
                     <span className="font-semibold text-sm pt-[2px]">அ)</span> 
                     <div className="prose dark:prose-invert max-w-none flex-1 text-sm" dangerouslySetInnerHTML={{ __html: renderLatex(question.content) }} />
                   </div>
                   <div className="text-center font-bold text-gray-600 dark:text-gray-400 my-4 text-sm">(அல்லது)</div>
                   <div className="ml-4 flex gap-2">
                     <span className="font-semibold text-sm pt-[2px]">ஆ)</span> 
                     <div className="prose dark:prose-invert max-w-none flex-1 text-sm" dangerouslySetInnerHTML={{ __html: renderLatex(parsedOptions.orContent) }} />
                   </div>
                 </div>
               ) : (
                 <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderLatex(question.content) }} />
               )}
               
               {question.questionType === 'MCI' && parsedOptions && (parsedOptions.rows || parsedOptions.left) && (
                 <div className="mt-4 ml-6 space-y-2">
                   {(parsedOptions.rows || (parsedOptions.left && parsedOptions.left.map((l: string, i: number) => ({ col1: l, symbol1: '-', col2: parsedOptions.right?.[i] || '' })))).map((row: any, i: number) => (
                      <div key={i} className={`grid ${parsedOptions.columns === 3 ? 'grid-cols-[auto_auto_auto_auto_1fr]' : 'grid-cols-[auto_auto_1fr]'} gap-3 items-center`}>
                        <div dangerouslySetInnerHTML={{ __html: renderLatex(row.col1) }} className="prose text-sm" />
                        <div className="font-bold text-center">{row.symbol1 || '-'}</div>
                        <div dangerouslySetInnerHTML={{ __html: renderLatex(row.col2) }} className="prose text-sm" />
                        {parsedOptions.columns === 3 && (
                          <>
                            <div className="font-bold text-center">{row.symbol2 || '-'}</div>
                            <div dangerouslySetInnerHTML={{ __html: renderLatex(row.col3) }} className="prose text-sm" />
                          </>
                        )}
                      </div>
                   ))}
                 </div>
               )}
             </div>
          </div>

          {question.questionType === 'MCQ' && question.options && question.options.length > 0 && (
             <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mt-4">
               <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300">
                 Options
               </div>
               <div className="p-4 bg-white dark:bg-[#161b22] space-y-2">
                 {question.options.map((opt: any, i: number) => (
                   <div key={i} className="flex items-start gap-3 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                     <span className="flex-shrink-0 w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                       {String.fromCharCode(65 + i)}
                     </span>
                     <div className="prose dark:prose-invert max-w-none text-sm flex-1" dangerouslySetInnerHTML={{ __html: renderLatex(opt.text || opt) }} />
                   </div>
                 ))}
               </div>
             </div>
          )}


          {question.explanation && (
             <div className="border border-green-200 dark:border-green-800 rounded-lg overflow-hidden mt-4">
               <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 border-b border-green-200 dark:border-green-800 font-bold text-green-800 dark:text-green-400">
                 Answer / Explanation
               </div>
               <div className="p-4 prose dark:prose-invert max-w-none bg-white dark:bg-[#161b22]" dangerouslySetInnerHTML={{ __html: renderLatex(question.explanation) }} />
             </div>
          )}

        </div>
      </div>
    </Modal>
  );

  return modalContent;
}
