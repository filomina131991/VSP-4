import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  History, 
  Sparkles, 
  ArrowRight, 
  CornerDownLeft, 
  AlertTriangle, 
  HelpCircle, 
  BookOpen, 
  X,
  Trash2
} from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { createHelpSearchEngine, SearchResultItem } from '../lib/fuseSearch';
import { saveRecentSearch, getRecentSearches } from '../db/helpCenterStore';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { ErrorCard } from '../components/ErrorCard';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const { errors, faqs, articles } = useHelpCenter();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const searchEngine = useMemo(() => {
    return createHelpSearchEngine(errors, faqs, articles);
  }, [errors, faqs, articles]);

  const results: SearchResultItem[] = useMemo(() => {
    return searchEngine.search(query);
  }, [query, searchEngine]);

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
  }, []);

  useEffect(() => {
    if (initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleSearchExecute = (searchQueryStr: string) => {
    const trimmed = searchQueryStr.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed });
      saveRecentSearch(trimmed);
      getRecentSearches().then(setRecentSearches);
    }
  };

  // Keyboard Navigation: ArrowDown, ArrowUp, Enter, Esc
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected.type === 'error') {
          window.location.href = `/help/errors/${selected.id}`;
        } else if (selected.type === 'faq') {
          window.location.href = `/help/faq`;
        } else {
          window.location.href = `/help/kb`;
        }
      } else {
        handleSearchExecute(query);
      }
    } else if (e.key === 'Escape') {
      setSelectedIndex(-1);
    }
  };

  const popularKeywords = [
    'language', 'validation', 'medium', 'subject', 'teacher', 'dashboard', 'pending', 'ICT', 'confirm', 'student', 'paper', 'profile'
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <BreadcrumbNav items={[{ label: 'Smart Offline Search' }]} />

      {/* Main Search Input Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Fuse.js Offline Search Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
            Search Vijayasree Knowledge Base & Error Library
          </h1>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSearchExecute(query); }}>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by error title, symptom, cause, Malayalam term, or keyword..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1); }}
              onKeyDown={handleKeyDown}
              className="w-full pl-12 pr-28 py-3.5 text-sm rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/80 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setSearchParams({}); }}
                className="absolute right-24 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Keyboard Navigation Tip */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="w-3.5 h-3.5 text-blue-500" />
            <span>Use <strong>Arrow Up/Down</strong> to navigate, <strong>Enter</strong> to open, <strong>Esc</strong> to dismiss</span>
          </span>
          <span>{results.length} Matches Found</span>
        </div>

        {/* Popular Keywords Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <span className="text-xs font-semibold text-gray-500">Popular Keywords:</span>
          {popularKeywords.map((kw, idx) => (
            <button
              key={idx}
              onClick={() => { setQuery(kw); handleSearchExecute(kw); }}
              className="px-2 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>

        {/* Recent Search History */}
        {recentSearches.length > 0 && !query && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Recent Search History</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => { setQuery(s); handleSearchExecute(s); }}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Listing */}
      {query && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">
            Search Results for "{query}"
          </h2>

          {results.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No direct matches found</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Try searching for broad terms like "language", "medium", "teacher", "subject", "final submit", or try our Interactive Troubleshooting Wizard.
              </p>
              <Link
                to="/help/wizard"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 transition-colors"
              >
                <span>Launch Troubleshooting Wizard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((res, idx) => {
                const isKeyboardSelected = idx === selectedIndex;

                if (res.type === 'error') {
                  return (
                    <div
                      key={res.id}
                      className={isKeyboardSelected ? 'ring-2 ring-blue-500 rounded-3xl' : ''}
                    >
                      <ErrorCard error={res.item as any} />
                    </div>
                  );
                }

                return (
                  <div
                    key={res.id}
                    className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-sm transition-all ${
                      isKeyboardSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/30'
                        : 'border-gray-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        {res.type.toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-gray-500">Category: {res.category}</span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{res.title}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{res.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
