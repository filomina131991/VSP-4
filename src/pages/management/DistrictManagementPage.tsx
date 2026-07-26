import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Map, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Database
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import Dropdown from '../../components/common/Dropdown';
import Swal from 'sweetalert2';

interface MainDistrict {
  id: string;
  name: string;
}

interface RevenueDistrict {
  id: string;
  name: string;
  mainDistrictId?: string;
}

const DistrictManagementPage: React.FC = () => {
  const [districts, setDistricts] = useState<RevenueDistrict[]>([]);
  const [mainDistricts, setMainDistricts] = useState<MainDistrict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMainDistrictFilter, setSelectedMainDistrictFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<Partial<RevenueDistrict> | null>(null);

  const fetchDistricts = async () => {
    setIsLoading(true);
    try {
      const [distRes, mainRes] = await Promise.all([
        apiClient.get('/management/districts'),
        apiClient.get('/management/main-districts')
      ]);
      setDistricts(distRes.data || []);
      setMainDistricts(mainRes.data || []);
    } catch (err) {
      toast.error('Failed to fetch revenue districts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
  }, []);

  const filteredDistricts = districts.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMain = selectedMainDistrictFilter === 'ALL' || d.mainDistrictId === selectedMainDistrictFilter;
    return matchesSearch && matchesMain;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/management/districts', editingDistrict);
      toast.success(editingDistrict?.id ? 'Revenue District updated' : 'Revenue District added');
      setIsModalOpen(false);
      setEditingDistrict(null);
      fetchDistricts();
    } catch (err) {
      toast.error('Failed to save revenue district');
    }
  };

  const handleDelete = async (dist: RevenueDistrict) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Deleting ${dist.name} will also affect all its educational districts and schools.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000000',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'rounded-3xl shadow-xl border border-gray-150'
      }
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/management/districts/${dist.id}`);
        toast.success('Revenue District deleted');
        fetchDistricts();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete revenue district');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tighter uppercase flex items-center gap-3">
            <Database size={32} className="text-gray-400" />
            Revenue District Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Configure revenue districts under parent Main Districts.</p>
        </div>
        <button 
          onClick={() => {
            setEditingDistrict({ mainDistrictId: mainDistricts[0]?.id || 'main-1' });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white dark:bg-[#1f6feb] px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center justify-center md:justify-start gap-2 shadow-xl shadow-black/10 w-full md:w-auto"
        >
          <Plus size={16} />
          Add Revenue District
        </button>
      </div>

      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-4 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search revenue districts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 rounded-xl border border-gray-100 focus:bg-white text-sm font-medium"
          />
        </div>

        <Dropdown
          ariaLabel="Filter Parent Main District"
          value={selectedMainDistrictFilter}
          onChange={(v) => setSelectedMainDistrictFilter(v)}
          options={[
            { value: 'ALL', label: 'All Parent Main Districts' },
            ...mainDistricts.map(m => ({ value: m.id, label: m.name })),
          ]}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Parent District</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Revenue District Name</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">ID</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center text-gray-400">Loading...</td>
              </tr>
            ) : filteredDistricts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-medium">No revenue districts found.</td>
              </tr>
            ) : filteredDistricts.map((d) => {
              const parentDist = mainDistricts.find(m => m.id === d.mainDistrictId);
              return (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-8 py-5 text-xs font-bold text-gray-600 uppercase">
                    {parentDist?.name || 'Palakkad District'}
                  </td>
                  <td className="px-8 py-5 text-sm font-black text-black uppercase tracking-tight">{d.name}</td>
                  <td className="px-8 py-5 text-xs font-mono text-gray-400">{d.id}</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingDistrict(d);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-gray-300 hover:text-black transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(d)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} disableOutsideClick={true}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-black tracking-tight uppercase">
                {editingDistrict?.id ? 'Edit Revenue District' : 'Add Revenue District'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-8">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Parent Main District</label>
                  <Dropdown
                    className="w-full"
                    ariaLabel="Parent Main District"
                    value={editingDistrict?.mainDistrictId || mainDistricts[0]?.id || 'main-1'}
                    onChange={(v) => setEditingDistrict(prev => ({ ...prev, mainDistrictId: v }))}
                    options={mainDistricts.map(m => ({ value: m.id, label: m.name }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Revenue District Name</label>
                  <input 
                    type="text"
                    required
                    value={editingDistrict?.name || ''}
                    onChange={(e) => setEditingDistrict(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    placeholder="Enter revenue district name (e.g. Palakkad)"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 text-white dark:bg-[#1f6feb] py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center justify-center gap-3"
                  >
                    <Save size={18} />
                    Save Changes
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

export default DistrictManagementPage;
