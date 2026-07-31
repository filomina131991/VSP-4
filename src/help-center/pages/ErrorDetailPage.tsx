import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Bookmark, ArrowLeft, ChevronRight, MessageSquare, ThumbsUp, ThumbsDown, ExternalLink, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useHelpCenter } from '../context/HelpCenterContext';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { trackErrorView } from '../lib/analyticsTracker';
import { useAuth } from '../../context/AuthContext';

export const ErrorDetailPage: React.FC = () => {
  const { errorId } = useParams<{ errorId: string }>();
  const { errors, isBookmarked, handleToggleBookmark, setZoomedImage } = useHelpCenter();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const errorData = errors.find(e => e.id === errorId);
  const bookmarked = errorData ? isBookmarked(errorData.id) : false;

  React.useEffect(() => {
    if (errorData) {
      trackErrorView({
        schoolCode: user?.schoolCode,
        schoolName: user?.displayName,
        errorName: errorData.title,
        errorId: errorData.id,
        userQuery: errorData.title,
        user: user?.username,
        category: errorData.category
      });
    }
  }, [errorData?.id]);

  if (!errorData) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Error Record Not Found</h2>
        <Link to="/help/errors" className="text-blue-600 font-bold text-sm underline mt-2 block">
          Back to Error Library
        </Link>
      </div>
    );
  }

  const copySteps = () => {
    const text = errorData.solution.map((s, i) => `${i + 1}. ${s}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Steps copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BreadcrumbNav items={[
        { label: 'Error Library', path: '/help/errors' },
        { label: errorData.title }
      ]} />

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 sm:p-8 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-5 h-5 ${
                  errorData.severity === 'HIGH' ? 'text-rose-500' : errorData.severity === 'MEDIUM' ? 'text-amber-500' : 'text-blue-500'
                }`} />
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  errorData.severity === 'HIGH' 
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    : errorData.severity === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }`}>
                  {errorData.severity}
                </span>
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {errorData.category.replace(/_/g, ' ')}
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
                {errorData.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Error ID: {errorData.id}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleToggleBookmark(errorData.id, 'error')}
                className={`p-2 rounded-xl transition-colors ${
                  bookmarked ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/60' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
              {errorData.symptoms[0]}
            </p>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Steps to Fix</h2>
                </div>
                <button
                  onClick={copySteps}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <ol className="space-y-2">
                {errorData.solution.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {errorData.malayalamSolution && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">മലയാളത്തിൽ പരിഹാരം</span>
                <ul className="mt-2 space-y-1">
                  {errorData.malayalamSolution.map((ml, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-xs text-blue-900 dark:text-blue-200">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{ml}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {errorData.screenshot && (
              <div>
                <button
                  onClick={() => setZoomedImage({ url: errorData.screenshot!, title: errorData.title })}
                  className="w-full relative rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800 group"
                >
                  <img src={errorData.screenshot} alt={errorData.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-3 py-1.5 rounded-xl">
                      Click to Zoom
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-slate-800 px-5 sm:px-8 py-4 bg-gray-50/50 dark:bg-slate-800/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Was this helpful?</span>
              <button className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/60 hover:text-emerald-600 transition-colors">
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 transition-colors">
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
            <Link
              to="/help/tickets"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Still Problem? Create Ticket</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {errorData.relatedErrorIds && errorData.relatedErrorIds.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Related Errors</h3>
          <div className="flex flex-wrap gap-2">
            {errorData.relatedErrorIds.map(relId => {
              const rel = errors.find(e => e.id === relId);
              return (
                <Link
                  key={relId}
                  to={`/help/errors/${relId}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 transition-colors"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>{rel?.title || relId}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
