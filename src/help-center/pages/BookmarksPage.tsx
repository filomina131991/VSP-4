import React from 'react';
import { Bookmark, AlertTriangle, ArrowRight } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { ErrorCard } from '../components/ErrorCard';

export const BookmarksPage: React.FC = () => {
  const { bookmarks, errors } = useHelpCenter();

  const bookmarkedErrors = errors.filter(e => bookmarks.some(b => b.id === e.id));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <BreadcrumbNav items={[{ label: 'Saved Bookmarks' }]} />

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Saved Items ({bookmarks.length})
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
          Bookmarked Solutions & Offline Error Guides
        </h1>
      </div>

      {bookmarkedErrors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-slate-800 space-y-3">
          <Bookmark className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No bookmarked items yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Click the bookmark icon on any error card or article to save it for quick offline access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarkedErrors.map(err => (
            <ErrorCard key={err.id} error={err} />
          ))}
        </div>
      )}
    </div>
  );
};
