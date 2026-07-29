import React, { useState } from 'react';
import { BookOpen, Tag, Calendar, User, ArrowRight, ZoomIn } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { RatingFeedbackCard } from '../components/RatingFeedbackCard';

export const KnowledgeBasePage: React.FC = () => {
  const { articles, setZoomedImage } = useHelpCenter();
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <BreadcrumbNav items={[{ label: 'Knowledge Base' }]} />

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Knowledge Base & Documentation
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
          Technical Reference Articles & Best Practices
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          In-depth guides on SSLC language allocation rules, teacher mark lock protocol, and HM audit checklists.
        </p>
      </div>

      {selectedArticle ? (
        /* Selected Article Detail View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6">
          <button
            onClick={() => setSelectedArticleId(null)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mb-2 block"
          >
            ← Back to Articles List
          </button>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-extrabold">
              {selectedArticle.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Updated: {selectedArticle.updatedAt}</span>
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>Author: {selectedArticle.author}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
            {selectedArticle.title}
          </h1>

          {selectedArticle.image && (
            <div className="relative rounded-2xl overflow-hidden max-h-[360px] bg-slate-950 flex items-center justify-center group">
              <img
                src={selectedArticle.image}
                alt={selectedArticle.title}
                className="max-h-[340px] w-auto object-contain"
              />
              <button
                onClick={() => setZoomedImage({ url: selectedArticle.image!, title: selectedArticle.title })}
                className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 backdrop-blur-md"
              >
                <ZoomIn className="w-4 h-4" />
                <span>Zoom Image</span>
              </button>
            </div>
          )}

          <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
            <p className="whitespace-pre-line">{selectedArticle.content}</p>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-4">
            {selectedArticle.tags.map(t => (
              <span key={t} className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-xs font-medium text-gray-600 dark:text-gray-400 rounded-md">
                #{t}
              </span>
            ))}
          </div>

          <RatingFeedbackCard
            targetId={selectedArticle.id}
            title={selectedArticle.title}
            solutionText={selectedArticle.content}
          />
        </div>
      ) : (
        /* Articles List Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((art) => (
            <div
              key={art.id}
              onClick={() => setSelectedArticleId(art.id)}
              className="group bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    {art.category}
                  </span>
                  <span className="text-xs text-gray-400">{art.updatedAt}</span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors leading-snug">
                  {art.title}
                </h3>

                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-3 leading-relaxed">
                  {art.summary}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {art.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Read Article</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
