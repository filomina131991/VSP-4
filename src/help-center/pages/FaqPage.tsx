import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Search, Filter, Link as LinkIcon } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { Link } from 'react-router-dom';

export const FaqPage: React.FC = () => {
  const { faqs } = useHelpCenter();
  const [openFaqId, setOpenFaqId] = useState<string | null>(faqs[0]?.id || null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterQuery, setFilterQuery] = useState('');

  const categories = ['ALL', 'LANGUAGE_VALIDATION', 'MEDIUM_SELECTION', 'SUBJECT_ASSIGNMENT', 'FINAL_CONFIRMATION', 'ICT_OPTION', 'SYSTEM_NETWORK'];

  const filteredFaqs = faqs.filter(f => {
    const matchesCat = selectedCategory === 'ALL' || f.category === selectedCategory;
    const matchesSearch = !filterQuery.trim() || 
      f.question.toLowerCase().includes(filterQuery.toLowerCase()) || 
      f.answer.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (f.malayalamQuestion && f.malayalamQuestion.includes(filterQuery));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <BreadcrumbNav items={[{ label: 'Frequently Asked Questions' }]} />

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Categorized Accordion Database
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
            Frequently Asked Questions (FAQ)
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Browse commonly raised queries regarding Vijayasree SSLC mark entry, medium mapping, and language validation.
          </p>
        </div>

        {/* Search Bar & Category Filter Pills */}
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter FAQs by query or keyword..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                  selectedCategory === c
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                {c.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQs Accordion Listing */}
      <div className="space-y-4">
        {filteredFaqs.map((faq) => {
          const isOpen = openFaqId === faq.id;

          return (
            <div
              key={faq.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                      {faq.question}
                    </h3>
                    {faq.malayalamQuestion && (
                      <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                        {faq.malayalamQuestion}
                      </h4>
                    )}
                  </div>
                </div>

                <div className="p-1 rounded-full text-gray-400">
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-slate-800/80 space-y-3 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
                    {faq.answer}
                  </p>

                  {faq.malayalamAnswer && (
                    <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-blue-950 dark:text-blue-200 font-medium">
                      <p className="leading-relaxed">{faq.malayalamAnswer}</p>
                    </div>
                  )}

                  {faq.relatedErrorId && (
                    <div className="pt-2">
                      <Link
                        to={`/help/errors/${faq.relatedErrorId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>View Related Error Page ({faq.relatedErrorId})</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
