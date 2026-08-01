import React, { useState } from 'react';
import { X, ArrowLeft, AlertTriangle } from 'lucide-react';
import { WorkflowDiagram } from '../../help-center/components/WorkflowDiagram';
import { ERRORS_DATABASE } from '../../help-center/data/errorsData';

interface SchoolWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchoolWorkflowModal: React.FC<SchoolWorkflowModalProps> = ({ isOpen, onClose }) => {
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);

  if (!isOpen) return null;

  const errorData = selectedErrorId ? ERRORS_DATABASE.find(e => e.id === selectedErrorId) : null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {selectedErrorId ? "Error Details" : "System Workflow"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {selectedErrorId && errorData ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-200">
              <button 
                onClick={() => setSelectedErrorId(null)} 
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-6 hover:underline font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Workflow
              </button>
              
              <div className="space-y-6 max-w-4xl mx-auto pb-8">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl flex-shrink-0 ${
                    errorData.severity === 'HIGH' ? 'bg-rose-100 text-rose-600' :
                    errorData.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{errorData.title}</h3>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        errorData.severity === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:border-rose-900' :
                        errorData.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:border-amber-900' : 
                        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:border-blue-900'
                      }`}>
                        {errorData.severity} Severity
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-slate-800 dark:text-gray-400 px-2 py-0.5 rounded-md">
                        {errorData.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700">
                      <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">Symptoms</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {errorData.symptoms.map((sym, i) => <li key={i}>{sym}</li>)}
                      </ul>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700">
                      <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">Common Causes</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {errorData.causes.map((cause, i) => <li key={i}>{cause}</li>)}
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">Solutions & Steps</h4>
                    <div className="space-y-3">
                      {errorData.solution.map((sol, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{sol}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-left-4 duration-200 h-full">
              <WorkflowDiagram 
                inlineErrors={true} 
                onErrorClick={(errId) => setSelectedErrorId(errId)} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
