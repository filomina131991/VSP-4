import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, FileText, Search, AlertTriangle, FolderTree, Bot, Settings,
  Plus, Edit3, Trash2, Eye, EyeOff, ChevronRight, X, CheckCircle, Clock,
  TrendingUp, BookOpen, Users, Globe, Download, Upload, RefreshCw, Save,
  BarChart3, MessageSquare, Database, HelpCircle, Sparkles, ThumbsUp, ThumbsDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/apiClient';
import { cn } from '../../lib/utils';

type AdminTab = 'dashboard' | 'articles' | 'missing' | 'logs' | 'categories' | 'gemini';

interface HelpArticle {
  _id: string; title: string; category: string; keywords: string[];
  problem: string; solutionSteps: string[]; relatedErrors: string[];
  youtubeUrl?: string; isPublished: boolean; viewCount: number;
  helpfulCount: number; notHelpfulCount: number; version: number;
  createdBy?: string; createdAt: string; updatedAt: string;
}

interface ArticleForm {
  title: string; category: string; keywords: string; problem: string;
  solutionSteps: string; relatedErrors: string; youtubeUrl: string;
  isPublished: boolean;
}

const defaultForm: ArticleForm = {
  title: '', category: 'SYSTEM_NETWORK', keywords: '', problem: '',
  solutionSteps: '', relatedErrors: '', youtubeUrl: '', isPublished: true
};

const CATEGORIES = [
  'SYSTEM_NETWORK', 'STUDENT_MANAGEMENT', 'TEACHER_PROFILE', 'MARKS_ENTRY',
  'EXAM_CONFIG', 'MEDIUM_SELECTION', 'LANGUAGE_VALIDATION', 'SUBJECT_ASSIGNMENT',
  'DASHBOARD_COUNT', 'FINAL_CONFIRMATION', 'ICT_OPTION', 'PAPER_MISMATCH',
  'REPORTS_ANALYTICS', 'OTHER'
];

export const AdminHelpPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-5 h-5 text-gray-500" />
        <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">Help Center Management</h1>
      </div>

      <div className="flex overflow-x-auto gap-1 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { key: 'dashboard' as AdminTab, label: 'Dashboard', icon: LayoutDashboard },
          { key: 'articles' as AdminTab, label: 'Articles', icon: FileText },
          { key: 'missing' as AdminTab, label: 'Missing Requests', icon: AlertTriangle },
          { key: 'logs' as AdminTab, label: 'Search Logs', icon: Search },
          { key: 'categories' as AdminTab, label: 'Categories', icon: FolderTree },
          { key: 'gemini' as AdminTab, label: 'AI Settings', icon: Bot },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' && <DashboardPanel />}
      {activeTab === 'articles' && <ArticlesPanel />}
      {activeTab === 'missing' && <MissingRequestsPanel />}
      {activeTab === 'logs' && <SearchLogsPanel />}
      {activeTab === 'categories' && <CategoriesPanel />}
      {activeTab === 'gemini' && <GeminiPanel />}
    </div>
  );
};

function DashboardPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/help/analytics');
      setData(res.data);
    } catch { setData(null) }
    setLoading(false);
  }, []);

  useEffect(() => { load() }, [load]);

  if (loading) return <div className="text-center py-12 text-sm text-gray-500">Loading analytics...</div>;
  if (!data) return <div className="text-center py-12 text-sm text-gray-500">Failed to load analytics</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Searches', value: data.totalSearches, color: 'text-blue-600', icon: Search },
          { label: 'Today', value: data.todaySearches, color: 'text-emerald-600', icon: Clock },
          { label: 'Matched', value: data.matched, color: 'text-emerald-600', icon: CheckCircle },
          { label: 'Not Found', value: data.notFound, color: 'text-rose-600', icon: AlertTriangle },
          { label: 'Success Rate', value: `${data.successRate}%`, color: 'text-amber-600', icon: TrendingUp },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-500 uppercase">{s.label}</span>
              </div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Top 20 Most Searched Errors
          </h3>
          {data.topSearched?.length > 0 ? (
            <div className="space-y-1.5">
              {data.topSearched.map((item: any, i: number) => (
                <div key={item._id} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[8px] font-black flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-gray-900 dark:text-white truncate block">{item._id}</span>
                    <span className="text-[9px] text-gray-500">{item.matched} solved / {item.notMatched} unsolved</span>
                  </div>
                  <span className="text-xs font-black text-blue-600">{item.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400 py-4 text-center">No data yet</p>}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Daily Search Trend (30 days)
            </h3>
            {data.dailyTrend?.length > 0 ? (
              <div className="space-y-1">
                {data.dailyTrend.slice(0, 10).map((d: any) => (
                  <div key={d._id} className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-500 w-24 truncate">{d._id}</span>
                    <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (d.count / Math.max(...data.dailyTrend.map((x: any) => x.count))) * 100)}%` }} />
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-300 w-8 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 py-4 text-center">No data yet</p>}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Top Failed Searches
            </h3>
            {data.topFailed?.length > 0 ? (
              <div className="space-y-1.5">
                {data.topFailed.slice(0, 8).map((item: any) => (
                  <div key={item._id} className="flex items-center justify-between p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-xs">
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{item._id}</span>
                    <span className="font-black text-rose-600">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 py-4 text-center">No failed searches</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> School-wise Searches
          </h3>
          {data.schoolWise?.length > 0 ? (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {data.schoolWise.map((item: any) => (
                <div key={item._id.schoolId || item._id.schoolName} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 text-xs">
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{item._id.schoolName || 'Unknown'}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-emerald-600 font-bold">{item.matched}</span>
                    <span className="text-rose-600 font-bold">{item.notMatched}</span>
                    <span className="text-blue-600 font-bold">{item.total}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400 py-4 text-center">No data yet</p>}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <FolderTree className="w-4 h-4" /> Category-wise Articles
          </h3>
          {data.categoryWise?.length > 0 ? (
            <div className="space-y-1.5">
              {data.categoryWise.map((item: any) => (
                <div key={item._id} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 text-xs">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{item._id}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">{item.published} published</span>
                    <span className="text-gray-400">/</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{item.count} total</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400 py-4 text-center">No articles yet</p>}
        </div>
      </div>
    </div>
  );
}

function ArticlesPanel() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(defaultForm);
  const [loading, setLoading] = useState(false);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await apiClient.get(`/help/articles?${params}`);
      setArticles(res.data.articles);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load articles'); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { loadArticles() }, [loadArticles]);

  const handleSave = async () => {
    if (!form.title || !form.category) return toast.error('Title and category required');
    const payload = {
      title: form.title, category: form.category,
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      problem: form.problem,
      solutionSteps: form.solutionSteps.split('\n').filter(Boolean),
      relatedErrors: form.relatedErrors.split(',').map(k => k.trim()).filter(Boolean),
      youtubeUrl: form.youtubeUrl, isPublished: form.isPublished,
    };
    try {
      if (editing) {
        await apiClient.put(`/help/articles/${editing}`, payload);
        toast.success('Article updated');
      } else {
        await apiClient.post('/help/articles', payload);
        toast.success('Article created');
      }
      setShowForm(false); setEditing(null); setForm(defaultForm);
      loadArticles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await apiClient.get(`/help/articles/${id}`);
      const a = res.data;
      setForm({
        title: a.title, category: a.category, keywords: (a.keywords || []).join(', '),
        problem: a.problem || '', solutionSteps: (a.solutionSteps || []).join('\n'),
        relatedErrors: (a.relatedErrors || []).join(', '), youtubeUrl: a.youtubeUrl || '',
        isPublished: a.isPublished,
      });
      setEditing(id); setShowForm(true);
    } catch { toast.error('Failed to load article'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    try {
      await apiClient.delete(`/help/articles/${id}`);
      toast.success('Article deleted');
      loadArticles();
    } catch { toast.error('Failed to delete'); }
  };

  const handleTogglePublish = async (id: string, current: boolean) => {
    try {
      await apiClient.put(`/help/articles/${id}`, { isPublished: !current });
      loadArticles();
    } catch { toast.error('Failed to update'); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search articles..." className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
        </div>
        <button onClick={() => { setForm(defaultForm); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Article
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{editing ? 'Edit Article' : 'New Article'}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Published</label>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.isPublished ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublished ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-xs text-gray-500">{form.isPublished ? 'Published' : 'Draft'}</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Keywords (comma separated)</label>
              <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Problem</label>
              <textarea value={form.problem} onChange={e => setForm({ ...form, problem: e.target.value })} rows={2}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Solution Steps (one per line)</label>
              <textarea value={form.solutionSteps} onChange={e => setForm({ ...form, solutionSteps: e.target.value })} rows={4}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Related Error IDs (comma separated)</label>
              <input value={form.relatedErrors} onChange={e => setForm({ ...form, relatedErrors: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase">YouTube URL</label>
              <input value={form.youtubeUrl} onChange={e => setForm({ ...form, youtubeUrl: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <button onClick={handleSave}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2">
            <Save className="w-3.5 h-3.5" /> {editing ? 'Update Article' : 'Create Article'}
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-500">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No articles found</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {articles.map(a => (
              <div key={a._id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{a.title}</span>
                      {a.isPublished ? (
                        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Published</span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Draft</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                      <span>{a.category}</span>
                      <span>{a.viewCount || 0} views</span>
                      <span>👍 {a.helpfulCount || 0}</span>
                      <span>👎 {a.notHelpfulCount || 0}</span>
                      <span>v{a.version || 1}</span>
                    </div>
                    {a.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {a.keywords.slice(0, 5).map(k => (
                          <span key={k} className="px-1.5 py-0.5 text-[8px] rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleTogglePublish(a._id, a.isPublished)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600" title="Toggle publish">
                      {a.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleEdit(a._id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-blue-600" title="Edit">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(a._id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-rose-600" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100 dark:border-slate-800">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-colors ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MissingRequestsPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.get(`/help/missing-requests?${params}`);
      setRequests(res.data.requests);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { load() }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/help/missing-requests/${id}/status`, { status });
      toast.success(`Status updated to ${status}`);
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleCreateArticle = async (id: string) => {
    const title = prompt('Enter article title:');
    if (!title) return;
    try {
      await apiClient.post(`/help/missing-requests/${id}/create-article`, { title, category: 'SYSTEM_NETWORK' });
      toast.success('Article created from request');
      load();
    } catch { toast.error('Failed to create article'); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search missing requests..." className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Created">Created</option>
          <option value="Ignored">Ignored</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-500">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No missing requests</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {requests.map(r => (
              <div key={r._id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{r.searchText}</span>
                      <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${
                        r.status === 'Pending' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700' :
                        r.status === 'Created' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700' :
                        'bg-gray-100 dark:bg-slate-700 text-gray-500'
                      }`}>{r.status}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                      <span className="font-bold text-blue-600">{r.searchCount} searches</span>
                      <span>First: {new Date(r.firstRequested).toLocaleDateString()}</span>
                      <span>Last: {new Date(r.lastRequested).toLocaleDateString()}</span>
                    </div>
                    {r.schools?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.schools.slice(0, 3).map((s: any) => (
                          <span key={s.schoolId} className="px-1.5 py-0.5 text-[8px] rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">{s.schoolName}</span>
                        ))}
                        {r.schools.length > 3 && <span className="text-[8px] text-gray-400">+{r.schools.length - 3} more</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {r.status === 'Pending' && (
                      <>
                        <button onClick={() => handleCreateArticle(r._id)}
                          className="px-2 py-1 text-[9px] font-bold rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 hover:bg-emerald-200 transition-colors whitespace-nowrap">
                          Create Article
                        </button>
                        <button onClick={() => handleStatusChange(r._id, 'Ignored')}
                          className="px-2 py-1 text-[9px] font-bold rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 transition-colors">
                          Ignore
                        </button>
                      </>
                    )}
                    {r.status === 'Created' && r.createdHelpArticleId && (
                      <span className="px-2 py-1 text-[9px] font-bold rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700">Article #{r.createdHelpArticleId.slice(-6)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100 dark:border-slate-800">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-colors ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchLogsPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [matchedFilter, setMatchedFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (matchedFilter) params.set('matched', matchedFilter);
      const res = await apiClient.get(`/help/search-logs?${params}`);
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, [page, search, matchedFilter]);

  useEffect(() => { load() }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search logs..." className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
        </div>
        <select value={matchedFilter} onChange={e => { setMatchedFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
          <option value="">All Results</option>
          <option value="true">Matched</option>
          <option value="false">Not Found</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No search logs</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {logs.map(log => (
              <div key={log._id} className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors" onClick={() => setSelectedLog(selectedLog?._id === log._id ? null : log)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{log.searchText}</span>
                      {log.matched ? (
                        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700">Matched</span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700">Not Found</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                      <span>{log.schoolName || 'Unknown School'}</span>
                      <span>{log.userRole}</span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${selectedLog?._id === log._id ? 'rotate-90' : ''}`} />
                </div>
                {selectedLog?._id === log._id && (
                  <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 space-y-1.5 text-[10px]">
                    <div className="flex justify-between"><span className="text-gray-500">Searched By:</span><span className="font-medium">{log.searchedBy}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">School:</span><span className="font-medium">{log.schoolName} ({log.schoolCode})</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">District:</span><span className="font-medium">{log.district} / {log.educationalDistrict}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Device:</span><span className="font-medium">{log.device || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Browser:</span><span className="font-medium">{log.browser?.slice(0, 60) || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">IP:</span><span className="font-medium">{log.ip || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Time:</span><span className="font-medium">{new Date(log.createdAt).toLocaleString()}</span></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100 dark:border-slate-800">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-colors ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoriesPanel() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIcon, setNewIcon] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/help/categories');
      setCategories(res.data);
    } catch { setCategories([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load() }, [load]);

  const handleAdd = async () => {
    if (!newName.trim()) return toast.error('Name required');
    try {
      await apiClient.post('/help/categories', { name: newName.trim(), description: newDesc, icon: newIcon });
      toast.success('Category added');
      setNewName(''); setNewDesc(''); setNewIcon('');
      load();
    } catch { toast.error('Failed to add'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await apiClient.delete(`/help/categories/${id}`);
      toast.success('Category deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Add Category</h3>
        <div className="space-y-3">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Category name"
            className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description"
            className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
          <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="Icon name"
            className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white" />
          <button onClick={handleAdd}
            className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-xl">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Categories ({categories.length})</h3>
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-500">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">No categories</div>
        ) : (
          <div className="space-y-1.5">
            {categories.map(c => (
              <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{c.icon || '📁'}</span>
                  <div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{c.name}</span>
                    {c.description && <p className="text-[9px] text-gray-500">{c.description}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(c._id)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GeminiPanel() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState({ apiKey: '', enabled: false, model: 'gemini-2.0-flash', temperature: 0.7 });

  useEffect(() => {
    const saved = localStorage.getItem('geminiConfig');
    if (saved) try { setConfig(JSON.parse(saved)); } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem('geminiConfig', JSON.stringify(config));
    toast.success(config.enabled ? 'Gemini AI enabled' : 'Gemini AI disabled');
  };

  return (
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
        <button onClick={() => setConfig({ ...config, enabled: !config.enabled })}
          className={`relative w-12 h-6 rounded-full transition-colors ${config.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">GEMINI_API_KEY</label>
        <div className="relative">
          <input type={showApiKey ? 'text' : 'password'} placeholder="Enter your Gemini API key"
            value={config.apiKey} onChange={e => setConfig({ ...config, apiKey: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white pr-10" />
          <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
          Get your API key from <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-600 dark:text-blue-400 underline">Google AI Studio</a>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Model</label>
          <select value={config.model} onChange={e => setConfig({ ...config, model: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
            <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Temperature</label>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="1" step="0.1" value={config.temperature}
              onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              className="flex-1 accent-blue-600" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-8">{config.temperature}</span>
          </div>
        </div>
      </div>

      <button onClick={handleSave}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
        <CheckCircle className="w-4 h-4" /> Save Configuration
      </button>

      <div className={`p-3 rounded-xl text-xs ${config.enabled ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}>
        <p className="font-semibold">Status: {config.enabled ? 'AI Chatbot is ACTIVE' : 'AI Chatbot is DISABLED (using local database only)'}</p>
      </div>
    </div>
  );
}
