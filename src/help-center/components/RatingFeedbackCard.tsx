import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2, Copy, Share2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { helpDb } from '../db/indexedDb';

export const RatingFeedbackCard: React.FC<{ targetId: string; title: string; solutionText?: string }> = ({
  targetId,
  title,
  solutionText
}) => {
  const [rated, setRated] = useState<'up' | 'down' | null>(null);

  const handleRate = async (type: 'up' | 'down') => {
    setRated(type);
    await helpDb.put('ratings', {
      id: `rating-${targetId}`,
      targetId,
      vote: type,
      timestamp: new Date().toISOString()
    });
    toast.success('Thank you for rating this solution!');
  };

  const handleCopySolution = () => {
    if (solutionText) {
      navigator.clipboard.writeText(solutionText);
      toast.success('Solution copied to clipboard!');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700/80 my-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Action Controls: Copy, Share, Print */}
        <div className="flex items-center gap-2">
          {solutionText && (
            <button
              onClick={handleCopySolution}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-650 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Solution</span>
            </button>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-650 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-650 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Article</span>
          </button>
        </div>

        {/* Thumbs Up / Down Rate */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Was this helpful?
          </span>
          {rated ? (
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Feedback Submitted</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRate('up')}
                className="flex items-center gap-1 p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 hover:text-emerald-600 transition-colors"
                title="Yes, very helpful"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRate('down')}
                className="flex items-center gap-1 p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 transition-colors"
                title="No, did not solve problem"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
