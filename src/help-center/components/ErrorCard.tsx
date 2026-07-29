import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Bookmark, CheckCircle, ShieldAlert } from 'lucide-react';
import { ErrorRecord } from '../types';
import { useHelpCenter } from '../context/HelpCenterContext';

export const ErrorCard: React.FC<{ error: ErrorRecord }> = ({ error }) => {
  const { isBookmarked, handleToggleBookmark } = useHelpCenter();
  const bookmarked = isBookmarked(error.id);

  const severityBadges = {
    HIGH: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    LOW: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
  };

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between relative overflow-hidden">
      <div>
        {/* Header row: Severity badge & bookmark */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${severityBadges[error.severity]}`}>
              {error.severity} SEVERITY
            </span>
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {error.category.replace(/_/g, ' ')}
            </span>
          </div>

          <button
            onClick={() => handleToggleBookmark(error.id, 'error')}
            className={`p-1.5 rounded-xl transition-colors ${
              bookmarked 
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/60' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            title={bookmarked ? 'Saved in Bookmarks' : 'Bookmark this error'}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
          {error.title}
        </h3>

        {/* Symptoms preview */}
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2 leading-relaxed">
          {error.symptoms[0]}
        </p>

        {/* Roles tags */}
        <div className="flex flex-wrap gap-1 mt-3">
          {error.roles.map(r => (
            <span key={r} className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
              Role: {r}
            </span>
          ))}
        </div>
      </div>

      {/* Footer link button */}
      <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-400">
          ID: {error.id}
        </span>
        <Link
          to={`/help/errors/${error.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform"
        >
          <span>View How to Fix</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
