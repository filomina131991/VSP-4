import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  Building2,
  Phone,
  Mail,
  User,
  MapPin
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Modal from '../../components/common/Modal';
import Dropdown from '../../components/common/Dropdown';

interface Institution {
  id: string;
  name: string;
  code: string;
  type: string;
  districtId: string;
  revenueDistrictId: string;
  eduDistrictId: string;
  address: string;
  phone: string;
  email: string;
  hmName: string;
  hmMobile: string;
  hmEmail: string;
  udiseCode?: string;
  districtName?: string;
  revenueDistrictName?: string;
  eduDistrictName?: string;
}

const InstitutionManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [revenueDistricts, setRevenueDistricts] = useState<any[]>([]);
  const [eduDistricts, setEduDistricts] = useState<any[]>([]);
  const [filteredEduDistricts, setFilteredEduDistricts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [revenueFilter, setRevenueFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Partial<Institution> | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [instRes, distRes, revRes, eduRes] = await Promise.all([
        apiClient.get('/management/institutions'),
        apiClient.get('/management/main-districts'),
        apiClient.get('/management/districts'),
        apiClient.get('/management/educational-districts')
      ]);
      setInstitutions(instRes.data || []);
      setDistricts(distRes.data || []);
      setRevenueDistricts(revRes.data || []);
      setEduDistricts(eduRes.data || []);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (revenueFilter === 'ALL') {
      setFilteredEduDistricts(eduDistricts);
    } else {
      setFilteredEduDistricts(eduDistricts.filter(e => e.districtId === revenueFilter));
    }
  }, [revenueFilter, eduDistricts]);

  const filteredInstitutions = institutions.filter(inst => {
    const matchesSearch = !searchTerm ||
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.code && inst.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inst.hmName && inst.hmName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDistrict = districtFilter === 'ALL' || inst.districtId === districtFilter;
    const matchesRevenue = revenueFilter === 'ALL' || inst.revenueDistrictId === revenueFilter;
    const matchesType = typeFilter === 'ALL' || inst.type === typeFilter;
    return matchesSearch && matchesDistrict && matchesRevenue && matchesType;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/management/institutions', editingInstitution);
      toast.success(editingInstitution?.id ? 'Institution updated' : 'Institution added');
      setIsModalOpen(false);
      setEditingInstitution(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save institution');
    }
  };

  const handleDelete = async (inst: Institution) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete ${inst.name}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000000',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      customClass: { popup: 'rounded-3xl shadow-xl border border-gray-150' }
    });
    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/management/institutions/${inst.id}`);
        toast.success('Institution deleted');
        fetchData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tighter uppercase flex items-center gap-3">
            <Building2 size={32} className="text-gray-400" />
            Institution Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage institutions under the district hierarchy.</p>
        </div>
        <button
          onClick={() => {
            setEditingInstitution({ type: 'Government', districtId: revenueDistricts[0]?.districtId || '', revenueDistrictId: revenueDistricts[0]?.id || '' });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white dark:bg-[#1f6feb] px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center justify-center md:justify-start gap-2 shadow-xl shadow-black/10 w-full md:w-auto"
        >
          <Plus size={16} />
          Add Institution
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-4 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search institutions by name, code, HM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 rounded-xl border border-gray-100 focus:bg-white text-sm font-medium"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Dropdown
            value={districtFilter}
            onChange={(v) => setDistrictFilter(v)}
            options={[{ value: 'ALL', label: 'All Districts' }, ...districts.map(d => ({ value: d.id, label: d.name }))]}
          />
          <Dropdown
            value={revenueFilter}
            onChange={(v) => { setRevenueFilter(v); }}
            options={[{ value: 'ALL', label: 'All Revenue Districts' }, ...revenueDistricts.map(d => ({ value: d.id, label: d.name }))]}
          />
          <Dropdown
            value={typeFilter}
            onChange={(v) => setTypeFilter(v)}
            options={[
              { value: 'ALL', label: 'All Types' },
              { value: 'Government', label: 'Government' },
              { value: 'Aided', label: 'Aided' },
              { value: 'Unaided', label: 'Unaided' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Code</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Institution Name</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">District</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Revenue Dist</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Edu Dist</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Type</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">HM</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">Loading...</td>
              </tr>
            ) : filteredInstitutions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-medium">No institutions found.</td>
              </tr>
            ) : filteredInstitutions.map((inst) => (
              <tr key={inst.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4 text-sm font-bold text-gray-900 font-mono">{inst.code || '-'}</td>
                <td className="px-6 py-4 text-sm font-black text-black">{inst.name}</td>
                <td className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">{inst.districtName || '-'}</td>
                <td className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">{inst.revenueDistrictName || '-'}</td>
                <td className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">{inst.eduDistrictName || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                    inst.type === 'Government' ? 'bg-emerald-100 text-emerald-700' :
                    inst.type === 'Aided' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {inst.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-600">{inst.hmName || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setEditingInstitution(inst); setIsModalOpen(true); }} className="p-2 text-gray-300 hover:text-black transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(inst)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} disableOutsideClick={true}>
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-black tracking-tight uppercase">
                {editingInstitution?.id ? 'Edit Institution' : 'Add New Institution'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-8">
              <form onSubmit={handleSave} className="space-y-6">
                {/* District Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">District</label>
                    <select
                      required
                      value={editingInstitution?.districtId || ''}
                      onChange={(e) => setEditingInstitution(prev => ({ ...prev, districtId: e.target.value, revenueDistrictId: '', eduDistrictId: '' }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="">Select District</option>
                      {districts.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Revenue District</label>
                    <select
                      required
                      value={editingInstitution?.revenueDistrictId || ''}
                      onChange={(e) => setEditingInstitution(prev => ({ ...prev, revenueDistrictId: e.target.value, eduDistrictId: '' }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="">Select Revenue District</option>
                      {revenueDistricts.filter(r => !editingInstitution?.districtId || r.districtId === editingInstitution?.districtId).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Educational District</label>
                    <select
                      required
                      value={editingInstitution?.eduDistrictId || ''}
                      onChange={(e) => setEditingInstitution(prev => ({ ...prev, eduDistrictId: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="">Select Edu District</option>
                      {eduDistricts.filter(e => !editingInstitution?.revenueDistrictId || e.districtId === editingInstitution?.revenueDistrictId).map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Institution Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Institution Name</label>
                    <input
                      type="text"
                      required
                      value={editingInstitution?.name || ''}
                      onChange={(e) => setEditingInstitution(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      placeholder="Enter institution name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Code</label>
                    <input
                      type="text"
                      value={editingInstitution?.code || ''}
                      onChange={(e) => setEditingInstitution(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all font-mono"
                      placeholder="e.g. 21074"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Management Type</label>
                    <select
                      value={editingInstitution?.type || 'Government'}
                      onChange={(e) => setEditingInstitution(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="Government">Government</option>
                      <option value="Aided">Aided</option>
                      <option value="Unaided">Unaided</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone</label>
                    <input
                      type="text"
                      value={editingInstitution?.phone || ''}
                      onChange={(e) => setEditingInstitution(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                    <input
                      type="email"
                      value={editingInstitution?.email || ''}
                      onChange={(e) => setEditingInstitution(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      placeholder="Email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">UDISE Code</label>
                    <input
                      type="text"
                      value={editingInstitution?.udiseCode || ''}
                      onChange={(e) => setEditingInstitution(prev => ({ ...prev, udiseCode: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all font-mono"
                      placeholder="UDISE code"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Address</label>
                  <input
                    type="text"
                    value={editingInstitution?.address || ''}
                    onChange={(e) => setEditingInstitution(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    placeholder="Full address"
                  />
                </div>

                {/* HM Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="p-1 bg-emerald-600 text-white text-[10px] rounded font-black px-2">HM</span>
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Headmaster Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">HM Name</label>
                      <input
                        type="text"
                        value={editingInstitution?.hmName || ''}
                        onChange={(e) => setEditingInstitution(prev => ({ ...prev, hmName: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="Headmaster name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">HM Mobile</label>
                      <input
                        type="text"
                        value={editingInstitution?.hmMobile || ''}
                        onChange={(e) => setEditingInstitution(prev => ({ ...prev, hmMobile: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="HM mobile"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">HM Email</label>
                      <input
                        type="email"
                        value={editingInstitution?.hmEmail || ''}
                        onChange={(e) => setEditingInstitution(prev => ({ ...prev, hmEmail: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="HM email"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white dark:bg-[#1f6feb] py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                  >
                    <Save size={18} />
                    {editingInstitution?.id ? 'Save Updates' : 'Add Institution'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 bg-gray-100 text-gray-900 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InstitutionManagementPage;
