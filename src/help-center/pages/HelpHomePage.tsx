import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, AlertTriangle, BookOpen, MessageSquare, TrendingUp, ShieldAlert, Users, FileText, HelpCircle, ChevronRight, Star, Wifi, WifiOff, Sparkles } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { ErrorCard } from '../components/ErrorCard';

export const HelpHomePage: React.FC = () => {
  const { errors, isOnline } = useHelpCenter();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/help/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const topErrors = errors.slice(0, 6);

  const quickCategories = [
    { label: 'Student', icon: '👤', count: 12, color: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
    { label: 'Teacher', icon: '👨‍🏫', count: 8, color: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
    { label: 'Medium', icon: '📚', count: 6, color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
    { label: 'Language', icon: '🔤', count: 10, color: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
    { label: 'Marks', icon: '📝', count: 14, color: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
    { label: 'Exam', icon: '📋', count: 5, color: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800' },
    { label: 'Sync', icon: '🔄', count: 3, color: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800' },
    { label: 'Login', icon: '🔑', count: 4, color: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' }
  ];

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
        }`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{isOnline ? 'Online' : 'Offline Help Active'}</span>
        </div>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">100+ Errors in Database</span>
      </div>

      <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="text-[11px] font-semibold text-blue-200">Vijayasree Help Center</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-2">
          How can we help you?
        </h1>
        <p className="text-xs sm:text-sm text-blue-100/80 mb-4">
          Search errors, get step-by-step solutions
        </p>

        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search error or question..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-white/15 border border-white/20 text-white placeholder-blue-200/70 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all backdrop-blur-sm"
            />
          </div>
        </form>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-[10px] text-blue-200 font-medium">Popular:</span>
          {['Language Validation', 'Medium Issue', 'Add Student', 'Login Problem'].map((t, i) => (
            <button
              key={i}
              onClick={() => navigate(`/help/search?q=${encodeURIComponent(t)}`)}
              className="px-2.5 py-1 text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Quick Categories</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {quickCategories.map((cat, i) => (
            <button
              key={i}
              onClick={() => navigate(`/help/search?q=${encodeURIComponent(cat.label)}`)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl border ${cat.color} hover:scale-105 transition-transform active-tap`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 text-center leading-tight">{cat.label}</span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400">{cat.count} errors</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Most Searched Errors</h2>
          <Link to="/help/errors" className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {topErrors.slice(0, 4).map((err, i) => (
            <div
              key={err.id}
              onClick={() => navigate(`/help/errors/${err.id}`)}
              className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer active-tap"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{err.title}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{err.symptoms[0]}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Common Questions</h2>
        </div>
        <div className="space-y-1.5">
          {[
            { q: 'How to add students?', icon: '👤' },
            { q: 'How to delete student?', icon: '🗑️' },
            { q: 'How to add teacher?', icon: '👨‍🏫' },
            { q: 'How to reset password?', icon: '🔑' }
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(`/help/search?q=${encodeURIComponent(item.q)}`)}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-all text-left active-tap"
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.q}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/help/errors"
          className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all"
        >
          <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Error Library</span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400">100+ Errors</span>
        </Link>
        <Link
          to="/help/tickets"
          className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-950/40 dark:to-rose-950/40 border border-amber-200 dark:border-amber-800 hover:shadow-md transition-all"
        >
          <MessageSquare className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Support Ticket</span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400">Get Help</span>
        </Link>
        <Link
          to="/help/faq"
          className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-all"
        >
          <HelpCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">FAQs</span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400">Quick Answers</span>
        </Link>
        <Link
          to="/help/kb"
          className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 border border-purple-200 dark:border-purple-800 hover:shadow-md transition-all"
        >
          <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Knowledge Base</span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400">Articles</span>
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-extrabold text-gray-900 dark:text-white mb-3">Error Solutions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topErrors.map(err => (
            <ErrorCard key={err.id} error={err} />
          ))}
        </div>
      </div>
    </div>
  );
};
