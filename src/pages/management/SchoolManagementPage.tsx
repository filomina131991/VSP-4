import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  Globe,
  Phone,
  Mail,
  User,
  X,
  Save,
  GraduationCap,
  Upload,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Check
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import Modal from '../../components/common/Modal';
import Dropdown from '../../components/common/Dropdown';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

interface School {
  id: string;
  code: string;
  name: string;
  type: 'Government' | 'Aided' | 'Unaided';
  eduId: string;
  subDistrictId?: string;
  phone?: string;
  email?: string;
  hmName?: string;
  hmMobile?: string;
  hmEmail?: string;
  coordinatorName?: string;
  coordinatorMobile?: string;
  coordinatorEmail?: string;
  website?: string;
}

const SchoolManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { mediums } = useData();
  const availableMediumNames = mediums.filter((m: any) => m.active !== false).map((m: any) => m.shortName);
  const [schools, setSchools] = useState<School[]>([]);
  const [mainDistricts, setMainDistricts] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [allEduDistricts, setAllEduDistricts] = useState<any[]>([]);
  const [eduDistricts, setEduDistricts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState(user?.role === 'DEO' && user?.districtId ? user.districtId : 'ALL');
  const [eduFilter, setEduFilter] = useState(user?.role === 'DEO' && (user?.eduId || user?.subDistrictId) ? (user.eduId || user.subDistrictId) : 'ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<Partial<School> & { districtId?: string; mainDistrictId?: string } | null>(null);
  const [importSummary, setImportSummary] = useState<{
    processed: number;
    successfulCount: number;
    failedCount: number;
    successful: any[];
    failed: any[];
    type: 'school' | 'student';
  } | null>(null);

  const fetchFilters = async () => {
    try {
      const [mainRes, distRes, eduRes] = await Promise.all([
        apiClient.get('/management/main-districts'),
        apiClient.get('/management/districts'),
        apiClient.get('/management/educational-districts')
      ]);
      setMainDistricts(mainRes.data || []);
      setDistricts(distRes.data || []);
      setAllEduDistricts(eduRes.data || []);
      setEduDistricts(eduRes.data || []);
    } catch (err) {
      console.error('Fetch filters error:', err);
    }
  };

  const fetchSchools = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.role === 'DEO') {
        if (user.districtId) params.append('districtId', user.districtId);
        if (user.eduId || user.subDistrictId) params.append('eduId', user.eduId || user.subDistrictId);
      }

      const res = await apiClient.get(`/management/schools${params.toString() ? '?' + params.toString() : ''}`);
      setSchools(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch schools');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
    fetchSchools();
  }, [user]);

  // Update Educational Districts whenever Revenue District Filter changes
  useEffect(() => {
    if (districtFilter === 'ALL') {
      setEduDistricts(allEduDistricts);
    } else {
      const selectedDist = districts.find(d => d.id === districtFilter || d.name === districtFilter);
      const targetId = selectedDist?.id || districtFilter;
      const targetName = selectedDist?.name || districtFilter;

      const filtered = allEduDistricts.filter(e => {
        if (!e.districtId && !e.districtName) return true;
        return e.districtId === targetId || 
               e.districtId === targetName ||
               (e.districtName && e.districtName.toLowerCase() === targetName.toLowerCase());
      });
      setEduDistricts(filtered);
    }
    setEduFilter('ALL');
    setCurrentPage(1);
  }, [districtFilter, allEduDistricts, districts]);

  // Reset pagination on any filter / search / page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, eduFilter, pageSize]);

  // Advanced Search & Multi-level Filter Memo
  const filteredSchools = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    const selectedDist = districts.find(d => d.id === districtFilter || d.name === districtFilter);
    const targetDistId = selectedDist?.id || districtFilter;
    const targetDistName = selectedDist?.name || districtFilter;

    return schools.map(school => {
      const schoolEduId = school.eduId || school.subDistrictId;
      const dist = allEduDistricts.find(
        e => e.id === schoolEduId || 
             e.name.toLowerCase() === String(schoolEduId || '').toLowerCase()
      );
      const eduName = dist?.name || (school as any).eduName || schoolEduId || 'Unknown';
      const districtName = dist?.districtName || (school as any).districtName || 'Unknown';
      const schoolDistrictId = dist?.districtId || (school as any).districtId;
      return { ...school, schoolDistrictId, districtName, eduName };
    }).filter(school => {
      const schoolEduId = school.eduId || school.subDistrictId;
      
      const matchesDistrict = districtFilter === 'ALL' || 
        school.schoolDistrictId === targetDistId ||
        (school as any).districtId === targetDistId ||
        school.districtName.toLowerCase() === targetDistName.toLowerCase();

      const matchesEdu = eduFilter === 'ALL' || 
        schoolEduId === eduFilter ||
        school.eduName.toLowerCase() === eduFilter.toLowerCase() ||
        (school as any).subDistrictId === eduFilter;

      const matchesType = typeFilter === 'ALL' || school.type === typeFilter;
      
      const matchesSearch = !query || 
        school.name.toLowerCase().includes(query) ||
        school.code.toLowerCase().includes(query) ||
        (school.hmName && school.hmName.toLowerCase().includes(query)) ||
        (school.phone && school.phone.toLowerCase().includes(query)) ||
        (school.email && school.email.toLowerCase().includes(query)) ||
        (school.eduName && school.eduName.toLowerCase().includes(query)) ||
        (school.districtName && school.districtName.toLowerCase().includes(query));

      return matchesDistrict && matchesEdu && matchesType && matchesSearch;
    });
  }, [schools, searchTerm, districtFilter, eduFilter, typeFilter, allEduDistricts, districts]);

  // Pagination Calculations
  const totalPages = useMemo(() => Math.ceil(filteredSchools.length / pageSize) || 1, [filteredSchools.length, pageSize]);
  const paginatedSchools = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSchools.slice(start, start + pageSize);
  }, [filteredSchools, currentPage, pageSize]);

  const toggleSelect = (id: string) => {
    setSelectedSchools(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSchools.length === filteredSchools.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(filteredSchools.map(s => s.id));
    }
  };

  const handleDelete = async (ids: string[]) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${ids.length} school(s). This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000000',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete!',
      customClass: {
        popup: 'rounded-3xl shadow-xl border border-gray-150'
      }
    });

    if (result.isConfirmed) {
      try {
        await apiClient.post('/management/schools/bulk-delete', { ids }, { timeout: 120000 });
        toast.success('Deleted successfully');
        fetchSchools();
        setSelectedSchools([]);
      } catch (err: any) {
        const msg = err.response?.status === 401 ? 'Unauthorized session. Please login again.' : 'Deletion failed';
        toast.error(msg);
      }
    }
  };

  const handleBulkChangeType = async (type: string) => {
    try {
      await apiClient.post('/management/schools/bulk-update-type', { ids: selectedSchools, type }, { timeout: 120000 });
      toast.success('Types updated successfully');
      fetchSchools();
      setSelectedSchools([]);
    } catch (err: any) {
      toast.error('Update failed');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...editingSchool };
      
      // Ensure eduId is mapped for the backend
      if (!payload.eduId && payload.subDistrictId) {
        payload.eduId = payload.subDistrictId;
      }
      
      // Explicitly set districtId if missing (default to user's district)
      if (!payload.districtId) {
        payload.districtId = user?.districtId || districts[0]?.id || '';
      }

      const res = await apiClient.post('/management/schools', payload);
      if (res.data) {
        toast.success(editingSchool?.id ? 'Institution updated successfully' : 'Institution added successfully');
        setIsModalOpen(false);
        setEditingSchool(null);
        fetchSchools();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to save institution details';
      toast.error(errMsg);
      console.error("School Save Error:", err);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    const parseLine = (line: string) => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    return lines.slice(1).map(line => {
      const values = parseLine(line);
      const obj: any = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      return obj;
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        let schoolsToImport: any[] = [];

        if (file.name.endsWith('.json')) {
          schoolsToImport = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          schoolsToImport = parseCSV(content);
        }

        if (schoolsToImport.length === 0) {
          toast.error('The selected file is empty.');
          return;
        }

        // Display importing status & animation modal
        Swal.fire({
          title: 'Importing Institutions...',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px 0;">
              <div style="width: 48px; height: 48px; border: 4px solid #2563eb; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
              <p style="font-size: 14px; color: #1e293b; font-weight: 700; margin-top: 16px; margin-bottom: 4px;">Synchronizing & Validating Database Records</p>
              <p style="font-size: 12px; color: #64748b; font-weight: 500;">Please wait, processing <strong>${schoolsToImport.length}</strong> entries...</p>
            </div>
            <style>
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          `,
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-3xl shadow-2xl border border-gray-150'
          }
        });

        const res = await apiClient.post('/management/schools/bulk-import', schoolsToImport, { timeout: 120000 });
        const data = res.data;

        // Populate import summary state
        setImportSummary({
          processed: data.processed,
          successfulCount: data.successfulCount,
          failedCount: data.failedCount,
          successful: data.successful || [],
          failed: data.failed || [],
          type: 'school'
        });

        // Trigger SweetAlert2 completion alert
        Swal.fire({
          title: data.failedCount > 0 ? 'Imported with Warnings' : 'Import Successful!',
          html: `
            <div style="text-align: left; font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.6;" class="space-y-2">
              <p>Successfully processed the import file.</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Processed Rows:</span> <strong>${data.processed}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #10b981;">
                  <span>Successfully Imported:</span> <strong>${data.successfulCount}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; color: #ef4444;">
                  <span>Failed/Skipped:</span> <strong>${data.failedCount}</strong>
                </div>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-top: 8px;">A detailed row-by-row diagnostics breakdown has been loaded below.</p>
            </div>
          `,
          icon: data.failedCount > 0 ? 'warning' : 'success',
          confirmButtonText: 'Inspect Details 🔍',
          confirmButtonColor: '#000000',
          customClass: {
            popup: 'rounded-3xl shadow-xl border border-gray-150'
          }
        });

        fetchSchools();
      } catch (err: any) {
        console.error(err);
        const errMsg = err.code === 'ECONNABORTED' 
          ? 'Import timed out. The server is processing large data in the background.' 
          : 'Failed to import schools. Please double check that your file header columns match UDISE code structure.';
        Swal.fire({
          title: 'Import Failed',
          text: errMsg,
          icon: 'error',
          confirmButtonText: 'Ok',
          confirmButtonColor: '#0c0a09'
        });
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight uppercase flex items-center gap-2.5 single-line-label w-full">
              <GraduationCap size={28} className="text-gray-400 shrink-0" />
              School Management
            </h1>
            <span className="w-full sm:w-auto bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-black px-3.5 py-1.5 rounded-2xl uppercase tracking-wider flex items-center justify-between sm:justify-start gap-2 shadow-sm shrink-0">
              <span className="text-[10px] opacity-70 sm:hidden">Institutional Count:</span>
              <span>Total: {schools.length} Schools</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1 single-row-desc">Configure and manage institutions across the state.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-row sm:items-center">
          <button
            onClick={() => document.getElementById('school-import')?.click()}
            className="w-full sm:w-auto justify-center bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-black dark:text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-[#21262d] transition-all flex items-center gap-2 shadow-sm native-touch-target active-tap"
          >
            <Upload size={16} className="shrink-0" />
            <span className="single-line-label">Import</span>
          </button>
          <input
            id="school-import"
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => {
              setEditingSchool({ type: 'Government', mainDistrictId: user?.mainDistrictId || mainDistricts[0]?.id || '', districtId: user?.districtId || '' });
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto justify-center bg-blue-600 text-white dark:bg-[#1f6feb] px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center gap-2 shadow-xl shadow-black/10 native-touch-target active-tap"
          >
            <Plus size={16} className="shrink-0" />
            <span className="single-line-label">
              <span className="sm:hidden">Add School</span>
              <span className="hidden sm:inline">Add New School</span>
            </span>
          </button>
        </div>
      </div>

      {/* Advanced Search & Multi-Level District Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-4 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Advanced search by school name, code, HM name, mobile, email..."
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
          <Dropdown
            value={districtFilter}
            onChange={(v) => setDistrictFilter(v)}
            disabled={user?.role === 'DEO' || user?.role === 'DIET'}
            options={[
              { value: 'ALL', label: 'All Revenue Districts' },
              ...districts.map(d => ({ value: d.id, label: d.name })),
            ]}
          />

          {/* Educational District Filter (Filtered based on Revenue District) */}
          <Dropdown
            value={eduFilter}
            onChange={(v) => setEduFilter(v)}
            disabled={(user?.role === 'DEO' || user?.role === 'DIET') && !!(user?.eduId || user?.subDistrictId)}
            minWidth={150}
            options={[
              { value: 'ALL', label: 'All Edu Districts' },
              ...eduDistricts.map(e => ({ value: e.id, label: e.name })),
            ]}
          />

          {/* Management Type Filter */}
          <Dropdown
            value={typeFilter}
            onChange={(v) => setTypeFilter(v)}
            options={[
              { value: 'ALL', label: 'All Management Types' },
              { value: 'Government', label: 'Government' },
              { value: 'Aided', label: 'Aided' },
              { value: 'Unaided', label: 'Unaided' },
            ]}
          />
        </div>
      </div>

      {selectedSchools.length > 0 && (
        <div className="bg-blue-600 text-white dark:bg-[#1f6feb] px-6 py-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-black uppercase tracking-[0.2em]">{selectedSchools.length} Schools Selected</span>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Change Type:</span>
              {['Government', 'Aided', 'Unaided'].map(type => (
                <button
                  key={type}
                  onClick={() => handleBulkChangeType(type as any)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => handleDelete(selectedSchools)}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-xs font-black uppercase tracking-widest"
          >
            <Trash2 size={16} />
            Delete Selected
          </button>
        </div>
      )}

      {/* Schools Table View */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-4 w-10">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-black transition-colors">
                    {selectedSchools.length === filteredSchools.length && filteredSchools.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center w-12">#</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Code</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">School Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">District</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Edu Dist.</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Headmaster</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : paginatedSchools.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-400 font-medium">No schools found matching your search and filter criteria.</td>
                </tr>
              ) : paginatedSchools.map((school, index) => (
                <tr key={school.id} className={cn("hover:bg-gray-50 transition-colors group", selectedSchools.includes(school.id) && "bg-gray-50")}>
                  <td className="px-4 py-4">
                    <button onClick={() => toggleSelect(school.id)} className={cn("transition-colors", selectedSchools.includes(school.id) ? "text-black" : "text-gray-200 group-hover:text-gray-400")}>
                      {selectedSchools.includes(school.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-xs font-bold text-gray-400 text-center font-mono">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 font-mono tracking-tight">{school.code}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-black">{school.name}</div>
                    {school.website ? (
                      <a href={`https://${school.website}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-black flex items-center gap-1 mt-1 transition-colors">
                        <Globe size={10} />
                        {school.website}
                      </a>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-tight">{(school as any).districtName}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-tight">{(school as any).eduName}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded",
                      school.type === 'Government' ? "bg-emerald-100 text-emerald-700" :
                        school.type === 'Aided' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    )}>
                      {school.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-600">{school.hmName || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {school.hmMobile && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                          <Phone size={12} className="text-gray-300" />
                          {school.hmMobile}
                        </div>
                      )}
                      {school.hmEmail && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                          <Mail size={12} className="text-gray-300" />
                          {school.hmEmail}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          const schoolEduId = school.eduId || school.subDistrictId;
                          const dist = allEduDistricts.find(e => e.id === schoolEduId);
                          setEditingSchool({ ...school, eduId: schoolEduId, districtId: dist?.districtId });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-gray-300 hover:text-black transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete([school.id])}
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

        {/* Pagination Footer */}
        {filteredSchools.length > 0 && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
              <span>
                Showing <strong className="text-gray-900 font-bold">{Math.min((currentPage - 1) * pageSize + 1, filteredSchools.length)}</strong> to <strong className="text-gray-900 font-bold">{Math.min(currentPage * pageSize, filteredSchools.length)}</strong> of <strong className="text-gray-900 font-bold">{filteredSchools.length}</strong> schools
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
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden scale-in-center max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-black tracking-tight uppercase">
                {editingSchool?.id ? 'Edit School Details' : 'Add New Institution'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-8">
              <form onSubmit={handleSave} className="space-y-8">
                {/* Section 1: Institution Identity */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                    <span className="p-1 bg-blue-600 text-white dark:bg-[#1f6feb] text-[10px] rounded font-black px-2">01</span>
                    <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Institution Identity</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">1. District</label>
                      <select
                        value={editingSchool?.mainDistrictId || mainDistricts[0]?.id || ''}
                        onChange={(e) => setEditingSchool(prev => ({ ...prev, mainDistrictId: e.target.value, districtId: '', eduId: '' }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all cursor-pointer"
                      >
                        <option value="">Select District</option>
                        {mainDistricts.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">2. Revenue District</label>
                      <select
                        value={editingSchool?.districtId || ''}
                        onChange={(e) => setEditingSchool(prev => ({ ...prev, districtId: e.target.value, eduId: '' }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all cursor-pointer"
                      >
                        <option value="">Select Revenue District</option>
                        {districts.filter(d => !editingSchool?.mainDistrictId || d.mainDistrictId === editingSchool?.mainDistrictId).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">3. Educational District</label>
                      <select
                        value={editingSchool?.eduId || ''}
                        required
                        disabled={user?.role === 'DEO' || user?.role === 'DIET'}
                        onChange={(e) => setEditingSchool(prev => ({ ...prev, eduId: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="">Select Educational District</option>
                        {allEduDistricts.filter(e => !editingSchool?.districtId || e.districtId === editingSchool?.districtId).map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">School Name</label>
                      <input
                        type="text"
                        required
                        value={editingSchool?.name || ''}
                        onChange={(e) => setEditingSchool(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="Enter school name"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">School Code</label>
                      <input
                        type="text"
                        required
                        value={editingSchool?.code || ''}
                        onChange={(e) => setEditingSchool(prev => ({ ...prev, code: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all font-mono"
                        placeholder="e.g. 21074"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Management Type</label>
                      <select
                        value={editingSchool?.type || 'Government'}
                        onChange={(e) => setEditingSchool(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      >
                        <option value="Government">Government</option>
                        <option value="Aided">Aided</option>
                        <option value="Unaided">Unaided</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">School Phone</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="text"
                          value={editingSchool?.phone || ''}
                          onChange={(e) => setEditingSchool(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                          placeholder="School office phone"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">School Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="email"
                          value={editingSchool?.email || ''}
                          onChange={(e) => setEditingSchool(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                          placeholder="School official email"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: School Mediums */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                    <span className="p-1 bg-violet-600 text-white text-[10px] rounded font-black px-2">01B</span>
                    <h3 className="text-[10px] font-black text-violet-600 uppercase tracking-[0.2em]">School Mediums</h3>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Available Mediums</label>
                    <p className="text-[10px] text-gray-400 font-bold -mt-1 ml-1">Select the mediums available in this school.</p>
                    <div className="flex flex-wrap gap-2">
                      {availableMediumNames.map(medium => {
                        const currentMediums = (editingSchool as any)?.mediums || [];
                        const isSelected = currentMediums.includes(medium);
                        return (
                          <button
                            key={medium}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? currentMediums.filter((m: string) => m !== medium)
                                : [...currentMediums, medium];
                              setEditingSchool(prev => ({ ...prev, mediums: updated } as any));
                            }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all duration-200 ${
                              isSelected
                                ? 'border-violet-500 bg-violet-50 text-violet-700'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              isSelected ? 'bg-violet-600 border-violet-600' : 'bg-white border-gray-300'
                            }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            {medium}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Section 2: Headmaster Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                    <span className="p-1 bg-emerald-600 text-white text-[10px] rounded font-black px-2">02</span>
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Headmaster Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Headmaster Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="text"
                          value={editingSchool?.hmName || ''}
                          onChange={(e) => setEditingSchool(prev => ({ ...prev, hmName: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                          placeholder="Name of Headmaster"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Headmaster Mobile</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="text"
                          value={editingSchool?.hmMobile || ''}
                          onChange={(e) => setEditingSchool(prev => ({ ...prev, hmMobile: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                          placeholder="HM contact number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Headmaster Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="email"
                          value={editingSchool?.hmEmail || ''}
                          onChange={(e) => setEditingSchool(prev => ({ ...prev, hmEmail: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                          placeholder="HM official email"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Coordinator Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                    <span className="p-1 bg-blue-600 text-white text-[10px] rounded font-black px-2">03</span>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Coordinator Teacher Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Coordinator Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="text"
                          value={editingSchool?.coordinatorName || ''}
                          onChange={(e) => setEditingSchool(prev => ({ ...prev, coordinatorName: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                          placeholder="Name of Coordinator"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Coordinator Mobile</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="text"
                          value={editingSchool?.coordinatorMobile || ''}
                          onChange={(e) => setEditingSchool(prev => ({ ...prev, coordinatorMobile: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                          placeholder="Coordinator contact"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Coordinator Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="email"
                          value={editingSchool?.coordinatorEmail || ''}
                          onChange={(e) => setEditingSchool(prev => ({ ...prev, coordinatorEmail: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                          placeholder="Coordinator email"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white dark:bg-[#1f6feb] py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                  >
                    <Save size={18} />
                    {editingSchool?.id ? 'Save Updates' : 'Add Institution'}
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

      {/* Bulk Diagnostics Summary Modal */}
      {importSummary && (
        <Modal isOpen={!!importSummary} onClose={() => setImportSummary(null)} disableOutsideClick={true}>
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100">
            {/* Header */}
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-black tracking-tight uppercase flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-blue-600 text-white dark:bg-[#1f6feb] text-[10px] rounded font-mono">BULK DIAGNOSTICS</span>
                  Import Result Breakdown
                </h2>
                <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Detailed row-by-row diagnostics</p>
              </div>
              <button
                onClick={() => setImportSummary(null)}
                className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Metrics Panel */}
            <div className="p-8 pb-4 grid grid-cols-3 gap-4 border-b border-gray-100 bg-slate-50/50">
              <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm text-center">
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Processed</div>
                <div className="text-2xl font-black text-gray-900 mt-1">{importSummary.processed}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm text-center">
                <div className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Successful</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{importSummary.successfulCount}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm text-center">
                <div className="text-[10px] font-black uppercase text-red-500 tracking-wider">Failed / Skipped</div>
                <div className="text-2xl font-black text-red-600 mt-1">{importSummary.failedCount}</div>
              </div>
            </div>

            {/* List Detail Area */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {/* Failed Items List */}
              {importSummary.failedCount > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-red-600 tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-red-500" />
                    Failed Rows ({importSummary.failedCount})
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {importSummary.failed.map((fail, i) => (
                      <div key={i} className="bg-red-50/50 border border-red-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-red-100 text-red-800 text-[10px] font-black px-1.5 py-0.5 rounded font-mono">Row {fail.row}</span>
                            <span className="font-extrabold text-red-950 font-mono">{fail.identifier}</span>
                          </div>
                          <p className="font-bold text-red-900/90 mt-1">{fail.name}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase text-red-700 bg-red-100/50 px-2 py-1 rounded-lg self-center max-w-xs text-right leading-relaxed">
                          {fail.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Successful Items List */}
              {importSummary.successfulCount > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Successful Items ({importSummary.successfulCount})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {importSummary.successful.map((success, i) => (
                      <div key={i} className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded font-mono">Row {success.row}</span>
                            <span className="font-extrabold text-black font-mono">{success.identifier}</span>
                          </div>
                          <p className="font-bold text-gray-700 mt-1">{success.name}</p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg",
                          success.action === 'Created'
                            ? "bg-emerald-100 text-emerald-850"
                            : "bg-amber-100 text-amber-850"
                        )}>
                          {success.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setImportSummary(null)}
                className="bg-blue-600 text-white dark:bg-[#1f6feb] hover:bg-blue-700 dark:hover:bg-[#388bfd] px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.98]"
              >
                Close Summary
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SchoolManagementPage;
