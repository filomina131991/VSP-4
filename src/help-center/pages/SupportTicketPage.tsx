import React, { useState, useEffect } from 'react';
import { MessageSquare, Upload, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { saveSupportTicket, fetchSupportTickets } from '../db/helpCenterStore';
import { SupportTicket } from '../types';
import { BreadcrumbNav } from '../components/BreadcrumbNav';

export const SupportTicketPage: React.FC = () => {
  const [schoolName, setSchoolName] = useState('');
  const [district, setDistrict] = useState('Palakkad');
  const [mobileNumber, setMobileNumber] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [screenshotUrl, setScreenshotUrl] = useState('');

  const [submittedTickets, setSubmittedTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    fetchSupportTickets().then(setSubmittedTickets);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !mobileNumber || !description) {
      toast.error('Please fill all required fields');
      return;
    }

    const ticket = await saveSupportTicket({
      schoolName,
      district,
      mobileNumber,
      description,
      priority,
      screenshotUrl: screenshotUrl || undefined
    });

    toast.success('Support Ticket created & saved to Offline IndexedDB!');
    setSchoolName('');
    setMobileNumber('');
    setDescription('');
    setScreenshotUrl('');

    const updated = await fetchSupportTickets();
    setSubmittedTickets(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <BreadcrumbNav items={[{ label: 'Submit DEO Support Ticket' }]} />

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Technical Support Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
            Create Technical Support Ticket
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tickets submitted while offline are stored safely in local IndexedDB and automatically synchronized when online.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                School Name & Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. GHSS Chittur (21045)"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Educational District *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
              >
                <option value="Palakkad">Palakkad District</option>
                <option value="Ottapalam">Ottapalam Sub-District</option>
                <option value="Mannarkkad">Mannarkkad Sub-District</option>
                <option value="Chittur">Chittur Sub-District</option>
                <option value="Alathur">Alathur Sub-District</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                HM / Mobile Number *
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Issue Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
              >
                <option value="LOW">Low - General Inquiry</option>
                <option value="MEDIUM">Medium - Marks Entry Issue</option>
                <option value="HIGH">High - Validation Error Blocking Final Lock</option>
                <option value="CRITICAL">Critical - System Offline / Crash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Issue Description & Symptoms *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the exact error message, candidate admission number, or module affected..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Screenshot URL or File Mock
            </label>
            <input
              type="text"
              placeholder="Paste screenshot URL or image link (optional)"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Support Ticket (Saved to IndexedDB)</span>
          </button>
        </form>
      </div>

      {/* Submitted Offline Tickets List */}
      {submittedTickets.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Saved Local Support Tickets ({submittedTickets.length})
          </h3>
          <div className="space-y-3">
            {submittedTickets.map(t => (
              <div key={t.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">{t.schoolName}</span>
                  <span className="text-gray-500 block">{t.description}</span>
                  <span className="text-[10px] text-gray-400 mt-1 block">Created: {new Date(t.createdAt).toLocaleString()}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
