import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Edit2, 
  Trash2,
  X, 
  Save,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { mediumNameToId } from '../../lib/mediumUtils';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import Dropdown from '../../components/common/Dropdown';
import Swal from 'sweetalert2';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'WEBMASTER' | 'DEO' | 'DIET' | 'SCHOOL' | 'SUBJECT_EXPERT';
  passwordChanged: boolean;
  password?: string;
  districtId?: string;
  mainDistrictId?: string;
  eduId?: string;
  subDistrictId?: string;
  schoolId?: string;
  mediums?: string[];
  teachingSubjects?: string[];
}

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { mediums, subjects } = useData();
  const [users, setUsers] = useState<User[]>([]);
  const [mainDistricts, setMainDistricts] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [allEduDistricts, setAllEduDistricts] = useState<any[]>([]);
  const [eduDistricts, setEduDistricts] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [eduFilter, setEduFilter] = useState('ALL');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Pagination State (Default 10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  const availableMediums = mediums.map(m => m.shortName);

  const getSubjectsForMediums = (meds: string[]) => {
    const medIds = new Set(meds.map(m => mediumNameToId(m, mediums)).filter(Boolean));
    return subjects.filter(s => s.active && medIds.has(s.mediumId));
  };

  const fetchData = async () => {
    try {
      const [mainDistRes, distRes, eduRes, schoolRes] = await Promise.all([
        apiClient.get('/management/main-districts'),
        apiClient.get('/management/districts'),
        apiClient.get('/management/educational-districts'),
        apiClient.get('/management/schools')
      ]);
      setMainDistricts(mainDistRes.data || []);
      setDistricts(distRes.data || []);
      setAllEduDistricts(eduRes.data || []);
      setEduDistricts(eduRes.data || []);
      setSchools(schoolRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let url = '/management/users';
      
      // Apply restricted scope for non-WEBMASTER roles
      if (currentUser?.role !== 'WEBMASTER') {
        if (currentUser?.schoolId) {
          url += `?schoolId=${currentUser.schoolId}`;
        } else if (currentUser?.eduId || currentUser?.subDistrictId) {
          url += `?eduId=${currentUser.eduId || currentUser?.subDistrictId}`;
        } else if (currentUser?.districtId) {
          url += `?districtId=${currentUser.districtId}`;
        }
      }
      
      const res = await apiClient.get(url);
      setUsers(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  // Sync Educational Districts when Revenue District Filter changes
  useEffect(() => {
    if (districtFilter === 'ALL') {
      setEduDistricts(allEduDistricts);
    } else {
      const selectedDist = districts.find(d => d.id === districtFilter || d.name === districtFilter);
      const targetId = selectedDist?.id || districtFilter;
      const targetName = selectedDist?.name || districtFilter;

      setEduDistricts(allEduDistricts.filter(e => 
        e.districtId === targetId || 
        e.districtId === targetName ||
        (e.districtName && e.districtName.toLowerCase() === targetName.toLowerCase())
      ));
    }
    setEduFilter('ALL');
    setSchoolFilter('ALL');
    setCurrentPage(1);
  }, [districtFilter, allEduDistricts, districts]);

  // Reset pagination on any filter / search / page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, eduFilter, schoolFilter, roleFilter, pageSize]);

  // Multi-Level Filtered Users Memo
  const filteredUsers = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    const selectedDist = districts.find(d => d.id === districtFilter || d.name === districtFilter);
    const targetDistId = selectedDist?.id || districtFilter;
    const targetDistName = selectedDist?.name || districtFilter;

    return users.filter(u => {
      const userEduId = u.eduId || u.subDistrictId;
      const userDistrictId = u.districtId;
      
      const matchesDistrict = districtFilter === 'ALL' || 
        userDistrictId === targetDistId ||
        userDistrictId === targetDistName;

      const matchesEdu = eduFilter === 'ALL' || userEduId === eduFilter;
      const matchesSchool = schoolFilter === 'ALL' || u.schoolId === schoolFilter;
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      const matchesSearch = !query || 
        (u.username || '').toLowerCase().includes(query) ||
        (u.displayName || '').toLowerCase().includes(query);

      return matchesDistrict && matchesEdu && matchesSchool && matchesRole && matchesSearch;
    });
  }, [users, searchTerm, districtFilter, eduFilter, schoolFilter, roleFilter, districts]);

  // Pagination Calculations
  const totalPages = useMemo(() => Math.ceil(filteredUsers.length / pageSize) || 1, [filteredUsers.length, pageSize]);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Filtered Schools for School Dropdown based on Edu Filter
  const availableSchoolsForFilter = useMemo(() => {
    if (eduFilter === 'ALL') return schools;
    return schools.filter(s => s.eduId === eduFilter || s.subDistrictId === eduFilter);
  }, [schools, eduFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...editingUser };
      if (payload.id && !payload.password) {
        delete payload.password;
      }
      
      // Ensure eduId is sent correctly
      if (!payload.eduId && payload.subDistrictId) {
        payload.eduId = payload.subDistrictId;
      }

      await apiClient.post('/management/users', payload);
      toast.success(editingUser?.id ? 'User updated' : 'User added');
      setIsModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to save user';
      toast.error(errMsg);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser || !editingUser.id) return;
    
    const defaultPassword = editingUser.role === 'SCHOOL' ? (editingUser.username || 'vsp123') : 'vsp123';
    
    const { value: newPassword } = await Swal.fire({
      title: 'Reset Password & Unlock',
      text: `Are you sure you want to reset the password for "${editingUser.displayName}"? This will unlock the account immediately.`,
      input: 'text',
      inputLabel: 'Enter temporary password:',
      inputValue: defaultPassword,
      showCancelButton: true,
      confirmButtonText: 'Reset & Unlock',
      confirmButtonColor: '#e0a96d',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Password is required!';
        }
        if (value.length < 2 || value.length > 8) {
          return 'Password must be between 2 and 8 characters long!';
        }
      }
    });

    if (newPassword) {
      try {
        const response = await apiClient.post(`/management/users/${editingUser.id}/reset-password`, { newPassword });
        toast.success(response.data?.message || 'Password reset successfully');
        setIsModalOpen(false);
        setEditingUser(null);
        fetchUsers();
      } catch (err: any) {
        const errMsg = err.response?.data?.message || 'Failed to reset password';
        toast.error(errMsg);
      }
    }
  };

  const handleDirectResetPassword = async (u: User) => {
    const defaultPassword = u.username || 'vsp123';
    
    const result = await Swal.fire({
      title: 'Reset Password & Unlock',
      text: `Are you sure you want to reset the password for "${u.displayName}"? The password will be set to "${defaultPassword}" by default, and they will be forced to change it on their next login.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reset',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#e0a96d',
    });

    if (result.isConfirmed) {
      try {
        const response = await apiClient.post(`/management/users/${u.id}/reset-password`, { newPassword: defaultPassword });
        toast.success(response.data?.message || 'Password reset successfully');
        fetchUsers();
      } catch (err: any) {
        const errMsg = err.response?.data?.message || 'Failed to reset password';
        toast.error(errMsg);
      }
    }
  };

  const handleDelete = async (u: User) => {
    if (u.id === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete user ${u.username}. This action cannot be undone.`,
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
        await apiClient.delete(`/management/users/${u.id}`);
        toast.success('User deleted');
        fetchUsers();
      } catch (err) {
        toast.error('Failed to delete user');
      }
    }
  };

  return (
    <div className="p-4 sm:p-8 md:p-10 space-y-8 animate-in fade-in duration-500">
      <style>{`
        .swal2-container {
          z-index: 1000000 !important;
        }
      `}</style>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-black tracking-tighter uppercase flex items-center gap-3">
              <Users size={32} className="text-gray-400" />
              User Management
            </h1>
            <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Total: {users.length} Users
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage system access for officers, DIETs, schools, and subject experts.</p>
        </div>
        <button 
          onClick={() => {
            setEditingUser({ role: 'SCHOOL', passwordChanged: false, password: '', districtId: currentUser?.districtId || 'dist-9', mediums: [], teachingSubjects: [] });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white dark:bg-[#1f6feb] px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center justify-center md:justify-start gap-2 shadow-xl shadow-black/10 w-full md:w-auto"
        >
          <Plus size={16} />
          Create User
        </button>
      </div>

      {/* Advanced Search & Multi-Level District, Edu District, School & Role Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-4 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Advanced search by username or display name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50/50 rounded-xl border border-gray-100 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent text-sm font-medium transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 p-1 text-gray-400 hover:text-black rounded-full"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-1 border-t lg:border-t-0 lg:border-l border-gray-100 pt-2 lg:pt-0">
          <div className="flex items-center gap-1 text-gray-400 px-2">
            <Filter size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Filters</span>
          </div>

          {/* Revenue District Filter */}
          {currentUser?.role === 'WEBMASTER' && (
            <Dropdown
              value={districtFilter}
              onChange={(v) => setDistrictFilter(v)}
              options={[
                { value: 'ALL', label: 'All Revenue Districts' },
                ...districts.map(d => ({ value: d.id, label: d.name })),
              ]}
            />
          )}

          {/* Educational District Filter */}
          {!currentUser?.subDistrictId && (
            <Dropdown
              value={eduFilter}
              onChange={(v) => setEduFilter(v)}
              minWidth={140}
              options={[
                { value: 'ALL', label: 'All Edu Districts' },
                ...eduDistricts.map(e => ({ value: e.id, label: e.name })),
              ]}
            />
          )}

          {/* School Based Filter */}
          <Dropdown
            value={schoolFilter}
            onChange={(v) => setSchoolFilter(v)}
            minWidth={180}
            options={[
              { value: 'ALL', label: 'All Schools' },
              ...availableSchoolsForFilter.map(s => ({ value: s.id, label: `${s.name} (${s.code})` })),
            ]}
          />

          {/* Role Filter */}
          <Dropdown
            value={roleFilter}
            onChange={(v) => setRoleFilter(v)}
            options={[
              { value: 'ALL', label: 'All Roles' },
              { value: 'WEBMASTER', label: 'Webmaster' },
              { value: 'DEO', label: 'DEO' },
              { value: 'DIET', label: 'DIET' },
              { value: 'SCHOOL', label: 'School Admin' },
              { value: 'SUBJECT_EXPERT', label: 'Subject Expert' },
            ]}
          />
        </div>
      </div>

      {/* Users Table View */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center w-12">#</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">User</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Role</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Access Scope</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center w-28">Reset</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-12 text-center text-gray-400 font-medium">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading users...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-12 text-center text-gray-400 font-medium">No users found matching your search and filter criteria.</td>
                </tr>
              ) : paginatedUsers.map((u, index) => {
                const userEduId = u.eduId || u.subDistrictId;
                const userDistrictId = u.districtId;

                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-5 text-xs font-bold text-gray-400 text-center font-mono">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-black text-black">{u.displayName}</div>
                      <div className="text-xs text-gray-400 font-mono">@{u.username}</div>
                    </td>
                    <td className="px-8 py-5">
                       <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded",
                          u.role === 'WEBMASTER' ? "bg-red-100 text-red-700" :
                          u.role === 'SCHOOL' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {u.role}
                        </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        {u.role === 'WEBMASTER' ? (
                          <span className="text-red-500">Full System Access</span>
                        ) : u.schoolId ? (
                          <div>
                            <div className="text-black">School: {schools.find(s => s.id === u.schoolId)?.name || u.schoolId}</div>
                            <div className="text-[8px] text-gray-400">Code: {schools.find(s => s.id === u.schoolId)?.code || '-'}</div>
                          </div>
                        ) : userEduId ? (
                          <span>Edu: {allEduDistricts.find(e => e.id === userEduId)?.name || userEduId}</span>
                        ) : userDistrictId ? (
                          <span>Dist: {districts.find(d => d.id === userDistrictId)?.name || userDistrictId}</span>
                        ) : (
                          <span className="text-gray-300 italic text-[8px]">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", u.passwordChanged ? "bg-emerald-500" : "bg-amber-500")} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {u.passwordChanged ? 'Active' : 'Pending Initial Login'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {currentUser?.role === 'WEBMASTER' && (
                        <button
                          onClick={() => handleDirectResetPassword(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-250 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                          title="Reset User Password to default"
                        >
                          <RotateCcw size={12} />
                          <span>Reset</span>
                        </button>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {currentUser?.role === 'WEBMASTER' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={async () => {
                              let distId = u.districtId;
                              let eduId = u.eduId || u.subDistrictId;

                              if (u.schoolId) {
                                const school = schools.find(s => s.id === u.schoolId) || 
                                              (await apiClient.get(`/management/schools?schoolId=${u.schoolId}`)).data[0];
                                if (school) {
                                  eduId = school.eduId || school.subDistrictId;
                                  const edu = allEduDistricts.find(e => e.id === eduId) || 
                                             (await apiClient.get(`/management/educational-districts?id=${eduId}`)).data[0];
                                  if (edu) distId = edu.districtId;
                                }
                              } else if (eduId) {
                                const edu = allEduDistricts.find(e => e.id === eduId) || 
                                           (await apiClient.get(`/management/educational-districts?id=${eduId}`)).data[0];
                                if (edu) distId = edu.districtId;
                              }

                              setEditingUser({ ...u, districtId: distId, eduId: eduId, password: '' });
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-gray-300 hover:text-black transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(u)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
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

        {/* Pagination Footer */}
        {filteredUsers.length > 0 && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
              <span>
                Showing <strong className="text-gray-900 font-bold">{Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)}</strong> to <strong className="text-gray-900 font-bold">{Math.min(currentPage * pageSize, filteredUsers.length)}</strong> of <strong className="text-gray-900 font-bold">{filteredUsers.length}</strong> users
              </span>
              <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Per Page:</span>
                <Dropdown
                  value={String(pageSize)}
                  onChange={(v) => setPageSize(Number(v))}
                  options={[
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                    { value: '100', label: '100' },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 px-3 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-xs font-bold shadow-sm"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              
              <span className="px-3 py-1 text-xs font-black text-gray-700 font-mono bg-gray-100 rounded-md">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="p-2 px-3 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-xs font-bold shadow-sm"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} disableOutsideClick={true}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-black tracking-tight uppercase">
                {editingUser?.id ? 'Edit User' : 'Create User'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Role</label>
                  <select 
                    required
                    value={editingUser?.role || 'SCHOOL'}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  >
                    <option value="SCHOOL">School Admin</option>
                    <option value="DEO">DEO Officer</option>
                    <option value="DIET">DIET Personnel</option>
                    <option value="SUBJECT_EXPERT">Subject Expert</option>
                    <option value="WEBMASTER">System Webmaster</option>
                  </select>
                </div>

                {editingUser?.role !== 'WEBMASTER' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Main District (State Level) Access</label>
                    {currentUser?.role === 'WEBMASTER' ? (
                      <select 
                        required
                        value={editingUser?.mainDistrictId || ''}
                        onChange={(e) => setEditingUser(prev => ({ 
                          ...prev, 
                          mainDistrictId: e.target.value,
                          districtId: '', 
                          eduId: '', 
                          schoolId: '' 
                        }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      >
                        <option value="">Select Main District</option>
                        {mainDistricts.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-500">
                        {mainDistricts.find(m => m.id === (editingUser?.mainDistrictId || currentUser?.mainDistrictId))?.name || 'Assigned Main District'}
                      </div>
                    )}
                  </div>
                )}

                {(editingUser?.role === 'DEO' || editingUser?.role === 'SCHOOL' || editingUser?.role === 'DIET') && editingUser?.mainDistrictId && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Revenue District Access</label>
                    {currentUser?.role === 'WEBMASTER' || currentUser?.role === 'DIET' ? (
                      <select 
                        required
                        value={editingUser?.districtId || ''}
                        onChange={(e) => setEditingUser(prev => ({ 
                          ...prev, 
                          districtId: e.target.value, 
                          eduId: '', 
                          schoolId: '' 
                        }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      >
                        <option value="">Select Revenue District</option>
                        {districts
                          .filter(d => d.mainDistrictId === editingUser.mainDistrictId)
                          .map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-500">
                        {districts.find(d => d.id === (editingUser?.districtId || currentUser?.districtId))?.name || 'Assigned Revenue District'}
                      </div>
                    )}
                  </div>
                )}

                {editingUser?.role === 'SCHOOL' && editingUser?.districtId && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Educational District Access</label>
                    {currentUser?.role === 'WEBMASTER' || currentUser?.role === 'DIET' || currentUser?.role === 'DEO' ? (
                      <select 
                        required
                        value={editingUser?.eduId || ''}
                        onChange={(e) => setEditingUser(prev => ({ 
                          ...prev, 
                          eduId: e.target.value, 
                          schoolId: '' 
                        }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      >
                        <option value="">Select Educational District</option>
                        {allEduDistricts
                          .filter(e => e.districtId === editingUser.districtId || e.districtId === districts.find(d=>d.id===editingUser.districtId)?.name)
                          .map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-500">
                        {allEduDistricts.find(e => e.id === (editingUser?.eduId || currentUser?.eduId || currentUser?.subDistrictId))?.name || 'Assigned Edu District'}
                      </div>
                    )}
                  </div>
                )}

                {editingUser?.role === 'SCHOOL' && editingUser?.eduId && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign School</label>
                    <select 
                      required
                      value={editingUser?.schoolId || ''}
                      onChange={(e) => setEditingUser(prev => ({ ...prev, schoolId: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    >
                      <option value="">Select School</option>
                      {schools
                        .filter(s => s.eduId === editingUser.eduId || s.subDistrictId === editingUser.eduId)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                  </div>
                )}

                {editingUser?.role === 'SUBJECT_EXPERT' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Medium(s)</label>
                      <div className="flex flex-wrap gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                        {availableMediums.map(m => (
                          <label key={m} className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-200 cursor-pointer hover:bg-gray-100 bg-white">
                            <input 
                              type="checkbox" 
                              checked={editingUser?.mediums?.includes(m) || false}
                              onChange={(e) => {
                                const currentMediums = editingUser?.mediums || [];
                                const newMeds = e.target.checked 
                                  ? [...currentMediums, m] 
                                  : currentMediums.filter(x => x !== m);
                                setEditingUser(prev => ({ ...prev, mediums: newMeds, teachingSubjects: [] }));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">{m}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject(s) Taught</label>
                      <div className="flex flex-wrap gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                        {getSubjectsForMediums(editingUser?.mediums || []).map(s => (
                          <label key={s.name} className="flex items-center gap-2 px-2 py-1 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={editingUser?.teachingSubjects?.includes(s.name) || false}
                              onChange={(e) => {
                                const currentSubs = editingUser?.teachingSubjects || [];
                                const newSubs = e.target.checked 
                                  ? [...currentSubs, s.name] 
                                  : currentSubs.filter(x => x !== s.name);
                                setEditingUser(prev => ({ ...prev, teachingSubjects: newSubs }));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">{s.name}</span>
                          </label>
                        ))}
                        {(!editingUser?.mediums || editingUser.mediums.length === 0) && (
                          <span className="text-sm text-gray-500">Select a medium first</span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Display Name</label>
                  <input 
                    type="text"
                    required
                    value={editingUser?.displayName || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    placeholder="Full name or Institution name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
                  <input 
                    type="text"
                    required
                    value={editingUser?.username || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all font-mono"
                    placeholder="Enter username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                  <input 
                    type="text"
                    required={!editingUser?.id}
                    value={editingUser?.password || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all font-mono"
                    placeholder={editingUser?.id ? "Leave empty to keep existing password" : "Enter password"}
                  />
                </div>
                {editingUser?.id && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <RotateCcw size={16} />
                      Reset Password & Unlock
                    </button>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 ml-1 leading-relaxed">
                      Resets user password, unlocks the account, and forces a password change on next login.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 text-white dark:bg-[#1f6feb] py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                  <Save size={18} />
                  {editingUser?.id ? 'Update User' : 'Save User'}
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
        </Modal>
      )}
    </div>
  );
};

export default UserManagementPage;
