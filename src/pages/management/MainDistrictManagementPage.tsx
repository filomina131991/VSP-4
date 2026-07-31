import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Globe, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Layers
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import Swal from 'sweetalert2';

interface MainDistrict {
  id: string;
  name: string;
  code?: string;
}

const MainDistrictManagementPage: React.FC = () => {
  const [mainDistricts, setMainDistricts] = useState<MainDistrict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<Partial<MainDistrict> | null>(null);

  const fetchMainDistricts = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/management/main-districts');
      setMainDistricts(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch main districts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMainDistricts();
  }, []);

  const filteredDistricts = mainDistricts.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.code && d.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/management/main-districts', editingDistrict);
      toast.success(editingDistrict?.id ? 'District updated' : 'District added');
      setIsModalOpen(false);
      setEditingDistrict(null);
      fetchMainDistricts();
    } catch (err) {
      toast.error('Failed to save district');
    }
  };

  const handleDelete = async (dist: MainDistrict) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Deleting ${dist.name} will also affect related revenue districts and educational districts.`,
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
        await apiClient.delete(`/management/main-districts/${dist.id}`);
        toast.success('Main District deleted');
        fetchMainDistricts();
      } catch (err) {
        toast.error('Failed to delete main district');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tighter uppercase flex items-center gap-3">
            <Globe size={32} className="text-gray-400" />
            District Management (State / Main Level)
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Configure primary top-level districts across the state.</p>
        </div>
        <button 
          onClick={() => {
            setEditingDistrict({});
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white dark:bg-[#1f6feb] px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center justify-center md:justify-start gap-2 shadow-xl shadow-black/10 w-full md:w-auto"
        >
          <Plus size={16} />
          Add Main District
        </button>
      </div>

      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex items-center">
        <Search className="ml-4 text-gray-400" size={16} />
        <input 
          type="text" 
          placeholder="Search main districts by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 text-sm font-medium"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Code</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Main District Name</th>
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
                <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-medium">No main districts found.</td>
              </tr>
            ) : filteredDistricts.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-8 py-5 text-sm font-mono font-bold text-gray-900">{d.code || '-'}</td>
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
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} disableOutsideClick={true}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-black tracking-tight uppercase">
                {editingDistrict?.id ? 'Edit Main District' : 'Add Main District'}
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
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Main District Name</label>
                  <input 
                    type="text"
                    required
                    value={editingDistrict?.name || ''}
                    onChange={(e) => setEditingDistrict(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    placeholder="e.g. Palakkad District Zone"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">District Code</label>
                  <input 
                    type="text"
                    value={editingDistrict?.code || ''}
                    onChange={(e) => setEditingDistrict(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    placeholder="e.g. PKD"
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

export default MainDistrictManagementPage;
