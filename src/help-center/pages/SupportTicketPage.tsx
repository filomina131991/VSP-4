import React, { useState, useEffect } from 'react';
import { MessageSquare, Upload, CheckCircle2, AlertTriangle, Send, Clock, Filter, Search, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { helpDb } from '../db/indexedDb';
import { EnhancedTicket } from '../types';

const TICKET_CATEGORIES = [
  'LANGUAGE_VALIDATION', 'MEDIUM_SELECTION', 'SUBJECT_ASSIGNMENT', 'MARKS_ENTRY',
  'TEACHER_PROFILE', 'DASHBOARD_COUNT', 'EXAM_CONFIG', 'ICT_OPTION',
  'FINAL_CONFIRMATION', 'STUDENT_MANAGEMENT', 'SYSTEM_NETWORK', 'OTHER'
];

export const SupportTicketPage: React.FC = () => {
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [errorName, setErrorName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [submittedTickets, setSubmittedTickets] = useState<EnhancedTicket[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const tickets = await helpDb.getAll<EnhancedTicket>('supportTickets');
      setSubmittedTickets(tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !mobileNumber || !description) {
      toast.error('Please fill School Name, Mobile Number, and Description');
      return;
    }

    const ticket: EnhancedTicket = {
      id: `ticket-${Date.now()}`,
      schoolName,
      schoolCode,
      district: 'Palakkad',
      mobileNumber,
      description,
      errorName,
      category,
      priority,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      browser: navigator.userAgent.slice(0, 100),
      device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      appVersion: '1.0.0',
      currentPage: window.location.pathname
    };

    await helpDb.put('supportTickets', ticket);
    toast.success('Support Ticket created successfully!');
    setSchoolName('');
    setSchoolCode('');
    setMobileNumber('');
    setErrorName('');
    setDescription('');
    setCategory('OTHER');
    await loadTickets();
  };

  const filteredTickets = submittedTickets.filter(t => {
    if (filter !== 'ALL' && t.status !== filter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return t.schoolName?.toLowerCase().includes(s) || t.description?.toLowerCase().includes(s) || t.errorName?.toLowerCase().includes(s);
    }
    return true;
  });

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">Create Support Ticket</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Still have a problem? Create a ticket for help.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">School Code</label>
              <input type="text" placeholder="e.g. 21045" value={schoolCode} onChange={e => setSchoolCode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">School Name *</label>
              <input type="text" required placeholder="e.g. GHSS Chittur" value={schoolName} onChange={e => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Mobile Number *</label>
              <input type="tel" required placeholder="10-digit mobile" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Error Name</label>
              <input type="text" placeholder="e.g. Medium Validation Error" value={errorName} onChange={e => setErrorName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                {TICKET_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                <option value="LOW">Low - General Inquiry</option>
                <option value="MEDIUM">Medium - Marks Entry Issue</option>
                <option value="HIGH">High - Validation Error Blocking</option>
                <option value="CRITICAL">Critical - System Offline / Crash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea required rows={3} placeholder="Describe the issue in detail..." value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
          </div>

          <button type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            <span>Submit Ticket</span>
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            My Tickets ({submittedTickets.length})
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search tickets..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-40 pl-8 pr-2 py-1.5 text-[10px] rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="px-2 py-1.5 text-[10px] rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No tickets found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTickets.map(t => (
              <div key={t.id} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">{t.schoolName}</span>
                    {t.schoolCode && <span className="text-[10px] text-gray-500">({t.schoolCode})</span>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColors[t.status] || statusColors.PENDING}`}>
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {t.errorName && <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">Error: {t.errorName}</p>}
                <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2">{t.description}</p>
                <div className="flex items-center gap-3 text-[9px] text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(t.createdAt).toLocaleString()}</span>
                  <span>{t.priority} Priority</span>
                  {t.device && <span>{t.device}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
