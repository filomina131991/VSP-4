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
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Modal from '../../components/common/Modal';

interface EduDistrict {
  id: string;
  name: string;
  districtId: string;
}

interface RevenueDistrict {
  id: string;
  name: string;
}

const EduDistrictManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [eduDistricts, setEduDistricts] = useState<EduDistrict[]>([]);
  const [districts, setDistricts] = useState<RevenueDistrict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEduDistrict, setEditingEduDistrict] = useState<Partial<EduDistrict> | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Determine filter based on user role
      let eduParams = '';
      if (user?.role === 'DIET' && (user as any).districtId) {
        eduParams = `?districtId=${(user as any).districtId}`;
      }

      const [eduRes, distRes] = await Promise.all([
        apiClient.get(`/management/educational-districts${eduParams}`),
        apiClient.get('/management/districts')
      ]);
      setEduDistricts(eduRes.data);
      setDistricts(distRes.data);
      
      if (user?.role === 'DIET' && (user as any).districtId) {
        setSelectedDistrictId((user as any).districtId);
      }
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const filteredEduDistricts = eduDistricts.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = selectedDistrictId === 'ALL' || e.districtId === selectedDistrictId;
    return matchesSearch && matchesDistrict;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/management/educational-districts', editingEduDistrict);
      toast.success(editingEduDistrict?.id ? 'Educational District updated' : 'Educational District added');
      setIsModalOpen(false);
      setEditingEduDistrict(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save educational district');
    }
  };

  const handleDelete = async (edu: EduDistrict) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${edu.name}. This action cannot be undone.`,
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
        await apiClient.delete(`/management/educational-districts/${edu.id}`);
        toast.success('Educational District deleted');
        fetchData();
      } catch (err) {
        toast.error('Failed to delete educational district');
      }
    }
  };

  const canAdd = user?.role === 'WEBMASTER' || user?.role === 'DIET';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tighter uppercase flex items-center gap-3">
            <Database size={32} className="text-gray-400" />
            Edu District Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage educational districts and their parent revenue districts.</p>
        </div>
        {canAdd && (
          <button 
            onClick={() => {
              setEditingEduDistrict({ districtId: selectedDistrictId !== 'ALL' ? selectedDistrictId : districts[0]?.id });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white dark:bg-[#1f6feb] px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center justify-center md:justify-start gap-2 shadow-xl shadow-black/10 w-full md:w-auto"
          >
            <Plus size={16} />
            Add Edu District
          </button>
        )}
      </div>

      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="flex-1 flex items-center">
          <Search className="ml-4 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search educational districts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 text-sm font-medium"
          />
        </div>
        <div className="h-full w-px bg-gray-100 hidden md:block" />
        <div className="flex items-center px-4 py-2 md:py-0 border-t md:border-t-0 border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-3">Revenue District:</label>
          <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
            <select 
              value={selectedDistrictId}
              disabled={user?.role === 'DIET'}
              onChange={(e) => setSelectedDistrictId(e.target.value)}
              className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
            >
              <option value="ALL" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">All Districts</option>
              {districts.map(d => (
                <option key={d.id} value={d.id} className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Edu District</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Revenue District</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-8 py-12 text-center text-gray-400">Loading...</td>
              </tr>
            ) : filteredEduDistricts.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-8 py-5 text-sm font-black text-black uppercase tracking-tight">{e.name}</td>
                <td className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest">
                  {districts.find(d => d.id === e.districtId)?.name || 'Unknown'}
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => {
                        setEditingEduDistrict(e);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-gray-300 hover:text-black transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(e)}
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
                {editingEduDistrict?.id ? 'Edit Edu District' : 'Add Edu District'}
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
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Edu District Name</label>
                  <input 
                    type="text"
                    required
                    value={editingEduDistrict?.name || ''}
                    onChange={(e) => setEditingEduDistrict(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Parent Revenue District</label>
                  <select 
                    required
                    value={editingEduDistrict?.districtId || ''}
                    onChange={(e) => setEditingEduDistrict(prev => ({ ...prev, districtId: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  >
                    <option value="" className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">Select District</option>
                    {districts.map(d => (
                      <option key={d.id} value={d.id} className="bg-white dark:bg-[#161b22] text-black dark:text-white px-3 py-1.5 text-xs font-bold">{d.name}</option>
                    ))}
                  </select>
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

export default EduDistrictManagementPage;
