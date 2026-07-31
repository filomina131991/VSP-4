import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Heart, Wifi, CheckCircle2 } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { useAuth } from '../../context/AuthContext';

export const HelpFooter: React.FC = () => {
  const { isOnline } = useHelpCenter();
  const { user } = useAuth();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                V
              </div>
              <span className="font-bold text-white text-base">Vijayasree Help Center</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official Progressive Web Application (PWA) Help Center & Error Resolution System for SSLC Analysis, Palakkad District.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg w-fit">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PWA Offline Certified</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Quick Modules</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/help/errors" className="hover:text-blue-400 transition-colors">100+ Error Library</Link></li>
              <li><Link to="/help/wizard" className="hover:text-blue-400 transition-colors">Troubleshooting Wizard</Link></li>
              <li><Link to="/help/workflow" className="hover:text-blue-400 transition-colors">Interactive Workflow</Link></li>
              {!user ? (
                <li><Link to="/login" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">Back to Main Login</Link></li>
              ) : (
                <li><Link to="/dashboard" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Go to Dashboard</Link></li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Role Guides</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/help/guides/teacher" className="hover:text-blue-400 transition-colors">Teacher Guide</Link></li>
              <li><Link to="/help/guides/school" className="hover:text-blue-400 transition-colors">School User Guide</Link></li>
              <li><Link to="/help/guides/dashboard" className="hover:text-blue-400 transition-colors">Dashboard & Analytics</Link></li>
              <li><Link to="/help/tickets" className="hover:text-blue-400 transition-colors">Submit Support Ticket</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Offline Status</h4>
            <p className="text-xs text-slate-400 mb-3">
              {isOnline 
                ? 'Connected to Internet. Offline database synced in IndexedDB.' 
                : 'Offline Mode Active. All 100+ error solutions, guide steps, and search work seamlessly locally.'}
            </p>
            <Link to="/help/about" className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-semibold hover:underline">
              <span>View System Version & Privacy Policy</span>
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 Vijayasree Palakkad SSLC Help Center (PWA). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/help/about" className="hover:text-slate-300">Privacy Policy</Link>
            <Link to="/help/about" className="hover:text-slate-300">Release Notes</Link>
            <Link to="/help/tickets" className="hover:text-slate-300">DEO Support Desk</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
