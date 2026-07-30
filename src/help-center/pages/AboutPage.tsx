import React from 'react';
import { Info, Shield, CheckCircle2, Heart, Sparkles, Code, Cpu } from 'lucide-react';
import { BreadcrumbNav } from '../components/BreadcrumbNav';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <BreadcrumbNav items={[{ label: 'About & System Release Notes' }]} />

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-slate-800 shadow-xl space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/30">
            V
          </div>
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              System Specification
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              Vijayasree Palakkad Help Center
            </h1>
            <span className="text-xs font-bold text-gray-400">
              Version 2.4.0 (Offline Certified)
            </span>
          </div>
        </div>

        {/* Release Notes */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Release Notes (v2.4.0)</span>
          </h2>
          <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span><strong>100+ Error Database:</strong> Comprehensive coverage of SSLC language validation, paper I/II rules, medium missing, teacher profile, and dashboard count mismatch.</span>
            </li>
            <li className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span><strong>Fuse.js Offline Search:</strong> Instant fuzzy search with keyword indexing, keyboard navigation (Arrow Up/Down/Enter/Esc), and search history.</span>
            </li>
            <li className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span><strong>Bilingual 16-Step Guide:</strong> Interactive step-by-step walkthrough with English titles, Malayalam descriptions, zoom screenshots, warning flags, and progress bar.</span>
            </li>
            <li className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span><strong>Offline AI Assistant:</strong> Floating chat assistant searching local IndexedDB data first, generating bilingual resolution steps.</span>
            </li>
          </ul>
        </div>

        {/* Credits */}
        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-500" />
            <span>Credits & Technical Stack</span>
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Built using React 19, Vite, TailwindCSS, TypeScript, Fuse.js, IndexedDB, Service Worker PWA, Framer Motion, and Lucide Icons. Designed for School Users, Teachers, District Administrators, DIET Users, and Technical Support Staff in Palakkad District.
          </p>
        </div>

        {/* Privacy Policy */}
        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Privacy Policy & Offline Storage Assurance</span>
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Vijayasree Help Center PWA operates completely offline inside your local browser storage using IndexedDB. No personal student candidate records or school credentials are uploaded to external analytics servers.
          </p>
        </div>
      </div>
    </div>
  );
};
