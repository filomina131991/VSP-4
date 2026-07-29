import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Bookmark, 
  ZoomIn, 
  HelpCircle, 
  ArrowRight,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { RatingFeedbackCard } from '../components/RatingFeedbackCard';

export const ErrorDetailPage: React.FC = () => {
  const { errorId } = useParams<{ errorId: string }>();
  const { errors, faqs, isBookmarked, handleToggleBookmark, setZoomedImage } = useHelpCenter();

  const errorData = errors.find(e => e.id === errorId) || errors[0];
  const bookmarked = errorData ? isBookmarked(errorData.id) : false;

  if (!errorData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Error Record Not Found</h2>
        <Link to="/help/errors" className="text-blue-600 font-bold underline mt-2 block">
          Back to Error Library
        </Link>
      </div>
    );
  }

  const solutionTextFormatted = errorData.solution.map((step, idx) => `${idx + 1}. ${step}`).join('\n');

  // Related FAQs
  const relatedFaqs = faqs.filter(f => f.relatedErrorId === errorData.id || f.category === errorData.category);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <BreadcrumbNav items={[
        { label: 'Error Library', path: '/help/errors' },
        { label: errorData.title }
      ]} />

      {/* Main Error Detail Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-slate-800 shadow-xl space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold text-xs rounded-full border border-rose-200 dark:border-rose-800">
              {errorData.severity} SEVERITY
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-xs rounded-full">
              Category: {errorData.category.replace(/_/g, ' ')}
            </span>
          </div>

          <button
            onClick={() => handleToggleBookmark(errorData.id, 'error')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              bookmarked
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
            <span>{bookmarked ? 'Saved in Bookmarks' : 'Bookmark Solution'}</span>
          </button>
        </div>

        {/* Title */}
        <div>
          <span className="text-xs font-bold text-gray-400">Error Code ID: {errorData.id}</span>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white mt-1 leading-tight">
            {errorData.title}
          </h1>
        </div>

        {/* Symptoms Section */}
        <div className="bg-rose-50/60 dark:bg-rose-950/30 p-6 rounded-2xl border border-rose-100 dark:border-rose-900/60 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3>Symptoms (നിരീക്ഷണങ്ങൾ)</h3>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-rose-900 dark:text-rose-200">
            {errorData.symptoms.map((sym, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 flex-shrink-0" />
                <span>{sym}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Causes Section */}
        <div className="bg-amber-50/60 dark:bg-amber-950/30 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/60 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold text-sm">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3>Possible Causes (കാരണങ്ങൾ)</h3>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
            {errorData.causes.map((c, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How to Fix Section */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-6 sm:p-8 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 space-y-4">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-extrabold text-base">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <h3>Step-by-Step Resolution (പരിഹാരമാർഗ്ഗം)</h3>
          </div>

          <ol className="space-y-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
            {errorData.solution.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-sm font-medium">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="mt-0.5 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {/* Malayalam Translation Box */}
          {errorData.malayalamSolution && (
            <div className="mt-4 p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-emerald-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium space-y-2">
              <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                മലയാളത്തിൽ ലളിതമായ പരിഹാരം:
              </h4>
              <ul className="space-y-1 text-xs sm:text-sm">
                {errorData.malayalamSolution.map((ml, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{ml}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Screenshot if available */}
        {errorData.screenshot && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Reference Screenshot</h3>
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-gray-200 dark:border-slate-800 max-h-[360px] flex items-center justify-center group">
              <img
                src={errorData.screenshot}
                alt={errorData.title}
                className="max-h-[340px] w-auto object-contain"
              />
              <button
                onClick={() => setZoomedImage({ url: errorData.screenshot!, title: errorData.title })}
                className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md flex items-center gap-1"
              >
                <ZoomIn className="w-4 h-4" />
                <span>Zoom Image</span>
              </button>
            </div>
          </div>
        )}

        {/* Related Errors Section */}
        {errorData.relatedErrorIds && errorData.relatedErrorIds.length > 0 && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Related Error Pages</h3>
            <div className="flex flex-wrap gap-2">
              {errorData.relatedErrorIds.map(relId => (
                <Link
                  key={relId}
                  to={`/help/errors/${relId}`}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl transition-colors inline-flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>{relId}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related FAQs */}
        {relatedFaqs.length > 0 && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Related Frequently Asked Questions</h3>
            <div className="space-y-2">
              {relatedFaqs.slice(0, 3).map(faq => (
                <div key={faq.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs">
                  <span className="font-bold text-gray-900 dark:text-white">{faq.question}</span>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating & Copy/Share/Print Card */}
        <RatingFeedbackCard
          targetId={errorData.id}
          title={errorData.title}
          solutionText={solutionTextFormatted}
        />
      </div>
    </div>
  );
};
