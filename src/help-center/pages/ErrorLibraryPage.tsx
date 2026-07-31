import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, AlertTriangle, Filter, ShieldAlert } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { ErrorCard } from '../components/ErrorCard';
import { ErrorCategory, RoleCategory } from '../types';

export const ErrorLibraryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = (searchParams.get('cat') as ErrorCategory) || 'ALL';
  
  const { errors } = useHelpCenter();
  const [query, setQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleCategory>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const categories: Array<ErrorCategory | 'ALL'> = [
    'ALL',
    'LANGUAGE_VALIDATION',
    'MEDIUM_SELECTION',
    'SUBJECT_ASSIGNMENT',
    'MARKS_ENTRY',
    'TEACHER_PROFILE',
    'DASHBOARD_COUNT',
    'EXAM_CONFIG',
    'ICT_OPTION',
    'FINAL_CONFIRMATION',
    'STUDENT_MANAGEMENT',
    'PAPER_MISMATCH'
  ];

  const filteredErrors = errors.filter(err => {
    const matchesCat = catParam === 'ALL' || err.category === catParam;
    const matchesRole = selectedRole === 'ALL' || err.roles.includes(selectedRole);
    const matchesSeverity = selectedSeverity === 'ALL' || err.severity === selectedSeverity;
    const matchesQuery = !query.trim() || 
      err.title.toLowerCase().includes(query.toLowerCase()) || 
      err.id.toLowerCase().includes(query.toLowerCase()) ||
      err.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()));
    
    return matchesCat && matchesRole && matchesSeverity && matchesQuery;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <BreadcrumbNav items={[{ label: '100+ Error Library' }]} />

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              100+ Error Records Database
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
              Vijayasree Error Library & Solutions Catalog
            </h1>
          </div>

          <div className="px-4 py-2 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold text-sm rounded-2xl border border-rose-200 dark:border-rose-800 w-fit">
            {filteredErrors.length} Errors Found
          </div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by error name or code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as RoleCategory)}
            className="px-3 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
          >
            <option value="ALL">Filter by Role: All Roles</option>
            <option value="SCHOOL">School User / HM</option>
            <option value="TEACHER">Teacher</option>
            <option value="DISTRICT">District Administrator</option>
            <option value="DIET">DIET User</option>
            <option value="SUPPORT">Technical Support</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
          >
            <option value="ALL">Filter by Severity: All Severities</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </select>
        </div>

        {/* Category Pills Bar */}
        <div className="overflow-x-auto pb-2 pt-1">
          <div className="flex items-center gap-1.5 min-w-max">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSearchParams({ cat: c })}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                  catParam === c
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                {c.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Error Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredErrors.map((err) => (
          <ErrorCard key={err.id} error={err} />
        ))}
      </div>
    </div>
  );
};
