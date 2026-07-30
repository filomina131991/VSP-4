import React, { useState, useEffect } from 'react';
import { Settings, Bot, Database, BarChart3, MessageSquare, Globe, Upload, Download, RefreshCw, CheckCircle, X, Eye, EyeOff, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { helpDb } from '../db/indexedDb';
import { GeminiConfig, ErrorAnalyticsEntry, SearchAnalyticsEntry, EnhancedTicket, QnAItem } from '../types';
import { getGeminiConfig, saveGeminiConfig, isGeminiEnabled } from '../lib/geminiService';
import { getMostSearchedErrors, getErrorStats } from '../lib/analyticsTracker';
import { QNA_DATABASE } from '../data/qnaData';

type AdminTab = 'gemini' | 'analytics' | 'tickets' | 'qna' | 'suggestions';

export const AdminHelpPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('gemini');
  const [geminiConfig, setGeminiConfig] = useState<GeminiConfig>(getGeminiConfig());
  const [showApiKey, setShowApiKey] = useState(false);
  const [mostSearched, setMostSearched] = useState<{ errorName: string; errorId: string; count: number }[]>([]);
  const [stats, setStats] = useState({ totalSearches: 0, resolved: 0, unresolved: 0, avgResolutionTime: 0 });
  const [tickets, setTickets] = useState<EnhancedTicket[]>([]);
  const [qnaItems, setQnaItems] = useState<QnAItem[]>(QNA_DATABASE);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'analytics') {
        setMostSearched(await getMostSearchedErrors());
        setStats(await getErrorStats());
      }
      if (activeTab === 'tickets') {
        const all = await helpDb.getAll<EnhancedTicket>('supportTickets');
        setTickets(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
      if (activeTab === 'suggestions') {
        const all = await helpDb.getAll<any>('suggestions');
        setSuggestions(all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    } catch {}
  };

  const handleGeminiSave = () => {
    saveGeminiConfig(geminiConfig);
    toast.success(geminiConfig.enabled ? 'Gemini AI enabled successfully!' : 'Gemini AI disabled');
  };

  const handleTicketStatus = async (ticketId: string, status: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = status as any;
      await helpDb.put('supportTickets', ticket);
      toast.success(`Ticket marked as ${status}`);
      await loadData();
    }
  };

  const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: 'gemini', label: 'AI Settings', icon: Bot },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'tickets', label: 'Tickets', icon: MessageSquare },
    { key: 'qna', label: 'Q&A Database', icon: Database },
    { key: 'suggestions', label: 'Suggestions', icon: Globe }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-5 h-5 text-gray-500" />
        <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">Help Center Management</h1>
      </div>

      <div className="flex overflow-x-auto gap-1 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'gemini' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white">Gemini AI Configuration</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure Google Gemini AI for enhanced chatbot responses</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">Enable AI Chatbot</span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">When OFF, only local help database is used</p>
            </div>
            <button
              onClick={() => setGeminiConfig({ ...geminiConfig, enabled: !geminiConfig.enabled })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                geminiConfig.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                geminiConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">GEMINI_API_KEY</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="Enter your Gemini API key"
                value={geminiConfig.apiKey}
                onChange={e => setGeminiConfig({ ...geminiConfig, apiKey: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white pr-10"
              />
              <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              Get your API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Google AI Studio</a>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Model</label>
              <select value={geminiConfig.model} onChange={e => setGeminiConfig({ ...geminiConfig, model: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Temperature</label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="1" step="0.1" value={geminiConfig.temperature} onChange={e => setGeminiConfig({ ...geminiConfig, temperature: parseFloat(e.target.value) })}
                  className="flex-1 accent-blue-600" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-8">{geminiConfig.temperature}</span>
              </div>
            </div>
          </div>

          <button onClick={handleGeminiSave}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>

          <div className={`p-3 rounded-xl text-xs ${
            isGeminiEnabled() ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
          }`}>
            <p className="font-semibold">
              Status: {isGeminiEnabled() ? 'AI Chatbot is ACTIVE' : 'AI Chatbot is DISABLED (using local database only)'}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Searches', value: stats.totalSearches, color: 'text-blue-600' },
              { label: 'Resolved', value: stats.resolved, color: 'text-emerald-600' },
              { label: 'Unresolved', value: stats.unresolved, color: 'text-rose-600' },
              { label: 'Avg Time (s)', value: stats.avgResolutionTime, color: 'text-amber-600' }
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Most Searched Errors</h3>
            {mostSearched.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No data yet. Start searching errors to see analytics.</p>
            ) : (
              <div className="space-y-2">
                {mostSearched.slice(0, 10).map((item, i) => (
                  <div key={item.errorId} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[9px] font-black flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">{item.errorName}</span>
                      <span className="text-[9px] text-gray-500">{item.errorId}</span>
                    </div>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">All Tickets ({tickets.length})</h3>
          {tickets.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">No tickets submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map(t => (
                <div key={t.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">{t.schoolName} {t.schoolCode && `(${t.schoolCode})`}</span>
                    <div className="flex items-center gap-1">
                      {['PENDING', 'IN_PROGRESS', 'RESOLVED'].map(s => (
                        <button
                          key={s}
                          onClick={() => handleTicketStatus(t.id, s)}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                            t.status === s
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                          }`}
                        >
                          {s.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400">{t.description}</p>
                  <div className="flex flex-wrap gap-2 text-[9px] text-gray-400">
                    <span>{t.category}</span>
                    <span>{t.priority} Priority</span>
                    <span>{new Date(t.createdAt).toLocaleString()}</span>
                    {t.device && <span>{t.device}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'qna' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Q&A Database ({qnaItems.length} items)</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(QNA_DATABASE, null, 2));
                toast.success('Q&A data copied to clipboard!');
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
            >
              <Download className="w-3 h-3" /> Export JSON
            </button>
          </div>
          <div className="space-y-2">
            {qnaItems.map(qna => (
              <details key={qna.id} className="group">
                <summary className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-xs">
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-gray-900 dark:text-white">{qna.question}</span>
                    <span className="text-[9px] text-gray-500 ml-2">({qna.intent})</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                </summary>
                <div className="p-3 ml-3 space-y-2">
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Keywords</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {qna.keywords.map((kw, i) => (
                        <span key={i} className="px-1.5 py-0.5 text-[9px] rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Steps</span>
                    <ol className="mt-1 space-y-0.5">
                      {qna.steps.map((step, i) => (
                        <li key={i} className="text-[10px] text-gray-700 dark:text-gray-300 flex items-start gap-1">
                          <span className="text-blue-600 font-bold">{i + 1}.</span> {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">User Suggestions ({suggestions.length})</h3>
          {suggestions.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">No suggestions yet.</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s: any) => (
                <div key={s.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs">
                  <p className="text-gray-900 dark:text-white font-medium">{s.text}</p>
                  <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
                    {s.schoolName && <span>{s.schoolName}</span>}
                    <span>{new Date(s.timestamp).toLocaleString()}</span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      s.status === 'NEW' ? 'bg-amber-50 text-amber-700' : s.status === 'REVIEWED' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
