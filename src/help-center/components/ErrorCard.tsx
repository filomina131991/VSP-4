import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Bookmark, X, CheckCircle, ExternalLink } from 'lucide-react';
import { ErrorRecord } from '../types';
import { useHelpCenter } from '../context/HelpCenterContext';

export const ErrorCard: React.FC<{ error: ErrorRecord }> = ({ error }) => {
  const { isBookmarked, handleToggleBookmark } = useHelpCenter();
  const [showSteps, setShowSteps] = useState(false);
  const bookmarked = isBookmarked(error.id);

  return (
    <>
      <div className="group bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer active-tap" onClick={() => setShowSteps(true)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                error.severity === 'HIGH' 
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : error.severity === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}>
                {error.severity}
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
              {error.title}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              {error.symptoms[0]}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500">
                {error.category.replace(/_/g, ' ')}
              </span>
              <span className="text-[9px] text-gray-300 dark:text-gray-600">•</span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500">
                {error.solution.length} steps
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleBookmark(error.id, 'error'); }}
              className={`p-1.5 rounded-lg transition-colors ${
                bookmarked ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/60' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {showSteps && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setShowSteps(false)}>
          <div className="relative w-full sm:max-w-lg max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{error.title}</h3>
              </div>
              <button
                onClick={() => setShowSteps(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 max-h-[calc(85vh-130px)]">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  error.severity === 'HIGH' 
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    : error.severity === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }`}>
                  {error.severity} SEVERITY
                </span>
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {error.category.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Step-by-Step Resolution
                  </span>
                </div>
                <ol className="space-y-2">
                  {error.solution.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {error.malayalamSolution && (
                <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">മലയാളം</span>
                  <ul className="mt-1.5 space-y-1">
                    {error.malayalamSolution.map((ml, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[11px] text-blue-900 dark:text-blue-200">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{ml}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Link
                  to={`/help/errors/${error.id}`}
                  onClick={() => setShowSteps(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Full Error Page</span>
                </Link>
                <Link
                  to="/help/tickets"
                  onClick={() => setShowSteps(false)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors"
                >
                  <span>Still Problem?</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
