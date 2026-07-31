import React, { useState, useEffect } from 'react';
import {
  Plus,
  Save,
  X,
  Trash2,
  Edit2,
  Languages,
  CheckCircle2,
  XCircle,
  GripVertical,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useData } from '../../context/DataContext';
import { emitRefresh } from '../../lib/eventBus';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import PageLoader from '../../components/common/PageLoader';

interface Medium {
  _id?: string;
  id: string;
  name: string;
  code: string;
  shortName: string;
  active: boolean;
  displayOrder: number;
}

const EMPTY_FORM = {
  name: '',
  code: '',
  shortName: '',
  active: true,
  displayOrder: 99,
};

const DOT_COLORS = [
  'bg-orange-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
];

const MediumManagementPage: React.FC = () => {
  const { refreshMediums } = useData();
  const [mediums, setMediums] = useState<Medium[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Medium>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const fetchMediums = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/management/mediums');
      setMediums(res.data.sort((a: Medium, b: Medium) => a.displayOrder - b.displayOrder));
    } catch {
      toast.error('Failed to fetch mediums');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMediums(); }, []);

  const handleAdd = async () => {
    if (!addForm.name.trim()) { toast.error('Medium name is required'); return; }
    if (!addForm.code.trim()) { toast.error('Code is required'); return; }
    if (!addForm.shortName.trim()) { toast.error('Short name is required'); return; }
    setSaving(true);
    try {
      await apiClient.post('/management/mediums', {
        ...addForm,
        code: addForm.code.toUpperCase(),
        displayOrder: mediums.length + 1,
      });
      toast.success(`"${addForm.name}" medium added!`);
      setAddForm({ ...EMPTY_FORM });
      setShowAddForm(false);
      await fetchMediums();
      refreshMediums();
      emitRefresh('mediums-updated');
      emitRefresh('data-updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add medium');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (m: Medium) => {
    setEditingId(m._id || m.id);
    setEditForm({ ...m });
    setShowAddForm(false);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const handleSaveEdit = async () => {
    if (!editForm.name?.trim()) { toast.error('Name is required'); return; }
    if (!editForm.code?.trim()) { toast.error('Code is required'); return; }
    if (!editForm.shortName?.trim()) { toast.error('Short name is required'); return; }
    setSaving(true);
    try {
      await apiClient.post('/management/mediums', {
        _id: editForm._id,
        name: editForm.name?.trim(),
        code: editForm.code?.toUpperCase().trim(),
        shortName: editForm.shortName?.trim(),
        active: editForm.active,
        displayOrder: editForm.displayOrder,
      });
      toast.success('Medium updated!');
      cancelEdit();
      await fetchMediums();
      refreshMediums();
      emitRefresh('mediums-updated');
      emitRefresh('data-updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update medium');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (m: Medium) => {
    try {
      await apiClient.post('/management/mediums', {
        _id: m._id,
        name: m.name,
        code: m.code,
        shortName: m.shortName,
        active: !m.active,
        displayOrder: m.displayOrder,
      });
      toast.success(`"${m.name}" ${!m.active ? 'activated' : 'deactivated'}`);
      await fetchMediums();
      refreshMediums();
      emitRefresh('mediums-updated');
      emitRefresh('data-updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (m: Medium) => {
    const result = await Swal.fire({
      title: `Delete "${m.name}"?`,
      text: 'This medium will be permanently removed. Students using this medium may be affected.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      customClass: { popup: 'rounded-3xl shadow-xl' },
    });
    if (!result.isConfirmed) return;
    try {
      await apiClient.delete(`/management/mediums/${m._id || m.id}`);
      toast.success(`"${m.name}" deleted`);
      await fetchMediums();
      refreshMediums();
      emitRefresh('mediums-updated');
      emitRefresh('data-updated');
    } catch {
      toast.error('Failed to delete medium');
    }
  };

  if (isLoading) return <PageLoader label="Loading Medium Management..." />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tighter uppercase flex items-center gap-3">
            <Languages size={30} className="text-indigo-500 shrink-0" />
            Medium Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
            Add, edit and manage teaching mediums used across the system.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMediums}
            className="p-2.5 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1f242c] transition-all"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => { setShowAddForm(v => !v); cancelEdit(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Plus size={15} />
            Add Medium
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-[#161b22] border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
            <Plus size={14} /> New Medium
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                Medium Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Tamil"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#30363d] dark:bg-[#0d1117] text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. TM"
                value={addForm.code}
                onChange={e => setAddForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                maxLength={5}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#30363d] dark:bg-[#0d1117] text-sm font-bold font-mono uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                Short Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Tamil"
                value={addForm.shortName}
                onChange={e => setAddForm(f => ({ ...f, shortName: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#30363d] dark:bg-[#0d1117] text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                Display Order
              </label>
              <input
                type="number"
                min={1}
                value={addForm.displayOrder}
                onChange={e => setAddForm(f => ({ ...f, displayOrder: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#30363d] dark:bg-[#0d1117] text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-60 active:scale-95"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Medium'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-[#1f242c] hover:bg-gray-200 dark:hover:bg-[#2d333b] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-[#0d1117] flex items-center gap-3">
          <Languages size={16} className="text-indigo-500" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">All Mediums</span>
          <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-full">
            {mediums.length}
          </span>
        </div>

        {mediums.length === 0 ? (
          <div className="py-20 text-center text-gray-400 dark:text-gray-600">
            <Languages size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-black uppercase tracking-wider">No mediums found</p>
            <p className="text-xs mt-1">Click "Add Medium" to create the first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-[#0d1117] border-b border-gray-100 dark:border-[#30363d]">
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 w-10">#</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Medium Name</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Code</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Short Name</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Order</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#30363d]">
                {mediums.map((m, i) => {
                  const isEditing = editingId === (m._id || m.id);
                  return (
                    <tr
                      key={m._id || m.id}
                      className={`group transition-colors ${isEditing ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : 'hover:bg-gray-50/60 dark:hover:bg-[#1f242c]'}`}
                    >
                      <td className="py-3 px-4 text-gray-400 dark:text-gray-600 text-xs font-black">
                        <div className="flex items-center gap-1">
                          <GripVertical size={12} className="opacity-30" />
                          {i + 1}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 dark:bg-[#0d1117] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                          />
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT_COLORS[i % DOT_COLORS.length]}`} />
                            <span className="text-sm font-black text-gray-900 dark:text-white">{m.name}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.code || ''}
                            onChange={e => setEditForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                            maxLength={5}
                            className="w-20 px-2 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 dark:bg-[#0d1117] text-sm font-mono font-bold text-center focus:outline-none dark:text-white mx-auto block uppercase"
                          />
                        ) : (
                          <span className="inline-block px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-black font-mono rounded-lg tracking-wider">
                            {m.code}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.shortName || ''}
                            onChange={e => setEditForm(f => ({ ...f, shortName: e.target.value }))}
                            className="w-28 px-2 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 dark:bg-[#0d1117] text-sm font-bold text-center focus:outline-none dark:text-white mx-auto block"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{m.shortName}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editForm.displayOrder ?? m.displayOrder}
                            onChange={e => setEditForm(f => ({ ...f, displayOrder: Number(e.target.value) }))}
                            className="w-16 px-2 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 dark:bg-[#0d1117] text-sm font-bold text-center focus:outline-none dark:text-white mx-auto block"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{m.displayOrder}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(m)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                            m.active
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100'
                          }`}
                          title={m.active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {m.active
                            ? <><CheckCircle2 size={11} /> Active</>
                            : <><XCircle size={11} /> Inactive</>
                          }
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-60 active:scale-95"
                            >
                              <Save size={12} />
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-[#1f242c] hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                            >
                              <X size={12} /> Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(m)}
                              className="p-2 bg-white dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] hover:border-indigo-300 rounded-lg text-gray-500 hover:text-indigo-600 transition-all active:scale-95"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(m)}
                              className="p-2 bg-white dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] hover:border-red-300 rounded-lg text-gray-500 hover:text-red-500 transition-all active:scale-95"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warning Note */}
      <div className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/50 flex items-start gap-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div>
          <h3 className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-[0.15em]">Important Note</h3>
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1.5 leading-relaxed">
            Mediums are used across students, subjects, marks entry, and reports. Deleting or renaming a medium
            may affect existing student records. Deactivating hides it from new assignments without deleting it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MediumManagementPage;
