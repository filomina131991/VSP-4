import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Edit3, Power, AlertTriangle, Info, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/apiClient';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import PageLoader from '../../components/common/PageLoader';

interface Alert {
  id: string;
  title: string;
  content: string;
  target: 'ALL' | 'UNCONFIRMED' | 'SPECIFIC';
  targetSchools?: string[];
  active: boolean;
  createdAt: string;
}

interface School {
  id: string;
  name: string;
  code: string;
}

export const MessageAlertsPage = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [inputMode, setInputMode] = useState<'write' | 'preview'>('write');
    const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '',
    content: '',
    target: 'ALL' as 'ALL' | 'UNCONFIRMED' | 'SPECIFIC'
  });

  const loadAlerts = async () => {
    try {
      const res = await apiClient.get('/alerts');
      setAlerts(res.data);
    } catch (err) {
      toast.error('Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchools = async () => {
    try {
      const res = await apiClient.get('/management/schools');
      setSchools(res.data);
    } catch (err) {
      console.error('Failed to load schools');
    }
  };

  const insertHtmlTag = (tagOpen: string, tagClose: string) => {
    const textarea = document.getElementById('alert-content-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = tagOpen + (selectedText || '') + tagClose;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setForm(prev => ({ ...prev, content: newValue }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + (selectedText || '').length);
    }, 0);
  };

  useEffect(() => {
    loadAlerts();
    loadSchools();
  }, []);

    const handleEdit = (alert: Alert) => {
    setEditingAlertId(alert.id);
    setForm({
      title: alert.title,
      content: alert.content,
      target: alert.target
    });
    if (alert.target === 'SPECIFIC') {
      setSelectedSchools(alert.targetSchools || []);
    } else {
      setSelectedSchools([]);
    }
    setShowModal(true);
    setInputMode('write');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/alerts', {
        ...form,
        targetSchools: form.target === 'SPECIFIC' ? selectedSchools : [],
        createdBy: user?.id
      });
      toast.success('Alert broadcasted successfully');
      setShowModal(false);
      setForm({ title: '', content: '', target: 'ALL' });
      setInputMode('write');
      setSelectedSchools([]);
      loadAlerts();
    } catch (err) {
      toast.error('Failed to create alert');
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await apiClient.patch(`/alerts/${id}`, { active: !currentActive });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !currentActive } : a));
      toast.success(currentActive ? 'Alert deactivated' : 'Alert activated');
    } catch (err) {
      toast.error('Failed to update alert');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    try {
      await apiClient.patch(`/alerts/${id}`, { isDelete: true });
      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.success('Alert deleted');
    } catch (err) {
      toast.error('Failed to delete alert');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Broadcast Alerts</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage dashboard notifications for school users</p>
        </div>
        <button
          onClick={() => { setEditingAlertId(null); setForm({ title: '', content: '', target: 'ALL' }); setSelectedSchools([]); setShowModal(true); setInputMode('write'); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
        >
          <Plus size={18} />
          <span>New Alert</span>
        </button>
      </div>

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <PageLoader label="Loading Message Alerts..." />
        ) : alerts.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <Megaphone className="text-slate-400" size={32} />
            </div>
            <div>
              <p className="text-slate-900 font-bold">No active alerts</p>
              <p className="text-slate-500 text-sm mt-1">Create an alert to notify schools.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-6 transition-all ${alert.active ? 'bg-indigo-50/30' : 'bg-white opacity-60'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-2xl ${alert.active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Megaphone size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-slate-900">{alert.title}</h3>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          alert.target === 'ALL' ? 'bg-emerald-100 text-emerald-700' : 
                          alert.target === 'SPECIFIC' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {alert.target === 'ALL' ? 'All Schools' : 
                           alert.target === 'SPECIFIC' ? `${alert.targetSchools?.length || 0} Schools` : 'Unconfirmed Only'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 leading-relaxed html-content mb-3" dangerouslySetInnerHTML={{ __html: alert.content }} />
                      <p className="text-xs text-slate-400 font-medium">Created: {new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { handleEdit(alert); setShowModal(true); setInputMode('write'); }}
                      className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                      title="Edit"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleToggle(alert.id, alert.active)}
                      className={`p-2 rounded-xl transition-all ${
                        alert.active 
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                      title={alert.active ? "Deactivate" : "Activate"}
                    >
                      <Power size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <Modal 
          isOpen={showModal} 
          onClose={() => {
            setShowModal(false);
            setInputMode('write');
          }}
          className="bg-slate-900/40"
          disableOutsideClick={true}
        >
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 text-slate-800">
                <Send className="text-indigo-600" size={20} />
                New Broadcast Alert
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Alert Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Mark Entry Deadline Extension"
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message Content</label>
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setInputMode('write')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        inputMode === 'write' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('preview')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        inputMode === 'preview' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {inputMode === 'write' ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/50 border border-b-0 border-slate-200 dark:border-[#30363d] rounded-t-xl">
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<b>', '</b>')}
                        className="px-2 py-1 text-xs font-black bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-[#21262d] border border-slate-200 dark:border-[#30363d] rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Bold (<b>)"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<i>', '</i>')}
                        className="px-2 py-1 text-xs italic bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-[#21262d] border border-slate-200 dark:border-[#30363d] rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Italic (<i>)"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<u>', '</u>')}
                        className="px-2 py-1 text-xs underline bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-[#21262d] border border-slate-200 dark:border-[#30363d] rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Underline (<u>)"
                      >
                        U
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<h3>', '</h3>')}
                        className="px-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-[#21262d] border border-slate-200 dark:border-[#30363d] rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Heading 3 (<h3>)"
                      >
                        H3
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<a href="https://" target="_blank">', '</a>')}
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-[#21262d] border border-slate-200 dark:border-[#30363d] rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Link (<a>)"
                      >
                        Link
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<ul>\n  <li>', '</li>\n</ul>')}
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-[#21262d] border border-slate-200 dark:border-[#30363d] rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Bullet List"
                      >
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<code>', '</code>')}
                        className="px-2 py-1 text-xs font-mono bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-[#21262d] border border-slate-200 dark:border-[#30363d] rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Code (<code>)"
                      >
                        &lt;/&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<span style="color: #4f46e5;">', '</span>')}
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-[#21262d] border border-slate-200 dark:border-[#30363d] rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Color Span"
                      >
                        Color
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<br />', '')}
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-[#21262d] border border-slate-200 dark:border-[#30363d] rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                        title="Line Break (<br />)"
                      >
                        Break
                      </button>
                    </div>
                    <textarea
                      id="alert-content-textarea"
                      required
                      rows={5}
                      placeholder="Enter the detailed message here. HTML code is fully supported..."
                      value={form.content}
                      onChange={e => setForm({...form, content: e.target.value})}
                      className="w-full px-4 py-3 rounded-b-xl border border-slate-200 dark:border-[#30363d] dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                    />
                  </div>
                ) : (
                  <div className="w-full min-h-[144px] max-h-60 overflow-y-auto px-4 py-3 rounded-xl border border-slate-200 dark:border-[#30363d] dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 html-content">
                    {form.content ? (
                      <div dangerouslySetInnerHTML={{ __html: form.content }} />
                    ) : (
                      <span className="text-slate-400 italic font-medium">Nothing to preview. Enter some HTML code first.</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Target Audience</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`cursor-pointer flex flex-col p-4 rounded-xl border-2 transition-all ${
                    form.target === 'ALL' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'
                  }`}>
                    <input 
                      type="radio" 
                      className="sr-only" 
                      name="target" 
                      checked={form.target === 'ALL'}
                      onChange={() => setForm({...form, target: 'ALL'})}
                    />
                    <Info className={form.target === 'ALL' ? 'text-indigo-600' : 'text-slate-400'} size={24} />
                    <span className="font-bold text-slate-800 mt-2">All Schools</span>
                    <span className="text-[10px] text-slate-500 mt-1 leading-tight">Every school user will see this</span>
                  </label>
                  
                  <label className={`cursor-pointer flex flex-col p-4 rounded-xl border-2 transition-all ${
                    form.target === 'UNCONFIRMED' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-100 hover:border-slate-200'
                  }`}>
                    <input 
                      type="radio" 
                      className="sr-only" 
                      name="target" 
                      checked={form.target === 'UNCONFIRMED'}
                      onChange={() => setForm({...form, target: 'UNCONFIRMED'})}
                    />
                    <AlertTriangle className={form.target === 'UNCONFIRMED' ? 'text-amber-500' : 'text-slate-400'} size={24} />
                    <span className="font-bold text-slate-800 mt-2">Unconfirmed</span>
                    <span className="text-[10px] text-slate-500 mt-1 leading-tight">Only schools with pending marks</span>
                  </label>

                  <label className={`cursor-pointer flex flex-col p-4 rounded-xl border-2 transition-all ${
                    form.target === 'SPECIFIC' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'
                  }`}>
                    <input 
                      type="radio" 
                      className="sr-only" 
                      name="target" 
                      checked={form.target === 'SPECIFIC'}
                      onChange={() => setForm({...form, target: 'SPECIFIC'})}
                    />
                    <Megaphone className={form.target === 'SPECIFIC' ? 'text-blue-500' : 'text-slate-400'} size={24} />
                    <span className="font-bold text-slate-800 mt-2">Specific</span>
                    <span className="text-[10px] text-slate-500 mt-1 leading-tight">Select specific schools</span>
                  </label>
                </div>
              </div>

              {form.target === 'SPECIFIC' && (
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Schools</label>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {schools.map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          checked={selectedSchools.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSchools([...selectedSchools, s.id]);
                            } else {
                              setSelectedSchools(selectedSchools.filter(id => id !== s.id));
                            }
                          }}
                        />
                        <span className="text-sm font-bold text-slate-700">{s.name} ({s.code})</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">{selectedSchools.length} selected</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setInputMode('write'); }}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  Broadcast Alert
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
