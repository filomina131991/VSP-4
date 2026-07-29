import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  BookOpen, 
  HelpCircle, 
  Layers, 
  MessageSquare, 
  ChevronRight, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Download
} from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { QuickActionsGrid } from '../components/QuickActionsGrid';
import { WorkflowDiagram } from '../components/WorkflowDiagram';
import { ErrorCard } from '../components/ErrorCard';

export const HelpHomePage: React.FC = () => {
  const { errors, isOnline } = useHelpCenter();
  const [heroSearch, setHeroSearch] = useState('');
  const navigate = useNavigate();

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/help/search?q=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  const topCategories = [
    { title: "Language Validation", count: "12 Errors", link: "/help/errors?cat=LANGUAGE_VALIDATION", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" },
    { title: "Medium Selection", count: "10 Errors", link: "/help/errors?cat=MEDIUM_SELECTION", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
    { title: "Teacher Assignment", count: "14 Errors", link: "/help/errors?cat=SUBJECT_ASSIGNMENT", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
    { title: "Marks Entry & Lock", count: "18 Errors", link: "/help/errors?cat=MARKS_ENTRY", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
    { title: "Final Confirmation", count: "15 Errors", link: "/help/errors?cat=FINAL_CONFIRMATION", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" }
  ];

  const popularErrors = errors.slice(0, 6);

  return (
    <div className="space-y-12">
      
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-tr from-blue-700 via-indigo-700 to-slate-900 text-white p-6 sm:p-12 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Vijayasree Palakkad Offline Help Engine (PWA)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            How can we help you solve your SSLC portal issues?
          </h1>

          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal">
            Search 100+ error codes, language validation rules, teacher mark lock issues, and interactive guides. Works 100% offline.
          </p>

          {/* Hero Search Box */}
          <form onSubmit={handleHeroSearch} className="pt-2">
            <div className="relative max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-2xl flex items-center gap-2 border border-blue-400/30">
              <Search className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="Try typing 'Language Validation', 'Medium Missing', 'Paper 1', or error code..."
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                className="w-full bg-transparent px-2 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/30 flex-shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Popular Tag Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
            <span className="text-blue-200 font-medium">Popular:</span>
            {['Language Validation Error', 'Teacher Subject Missing', 'Medium Not Showing', 'Final Confirmation Hidden', 'Dashboard Wrong Count'].map((tag, idx) => (
              <Link
                key={idx}
                to={`/help/search?q=${encodeURIComponent(tag)}`}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-[11px]"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 16-Step Banner */}
      <section className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full w-fit">
            Interactive Walkthrough
          </span>
          <h2 className="text-2xl font-black">Master the 16-Step Vijayasree Workflow</h2>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed max-w-2xl">
            Complete step-by-step interactive guide with English titles, Malayalam descriptions, zoom screenshots, warning flags, and completion tracking.
          </p>
        </div>

        <Link
          to="/help/guide"
          className="px-6 py-3 bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <span>Start 16-Step Guide</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Categories Bar */}
      <section>
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-4">
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {topCategories.map((c, idx) => (
            <Link
              key={idx}
              to={c.link}
              className={`p-4 rounded-2xl border transition-all text-center hover:scale-105 ${c.color}`}
            >
              <h3 className="text-xs font-bold">{c.title}</h3>
              <span className="text-[10px] opacity-80 mt-1 block">{c.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Actions Grid */}
      <QuickActionsGrid />

      {/* Interactive Workflow Diagram */}
      <WorkflowDiagram />

      {/* Popular 100+ Errors Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Error Resolution Database
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5">
              Top Reported Error Pages (100+ Total Records)
            </h2>
          </div>

          <Link
            to="/help/errors"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>View All 100+ Errors</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularErrors.map((err) => (
            <ErrorCard key={err.id} error={err} />
          ))}
        </div>
      </section>

    </div>
  );
};
