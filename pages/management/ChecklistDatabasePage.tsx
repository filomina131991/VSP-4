import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Save, X, Edit, Trash2, Check, CheckSquare, Square, AlertCircle, Download, Printer, Clock, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { apiClient } from '../../lib/apiClient';

interface Student {
  id: string;
  regNo: string;
  globalId?: string;
  name: string;
  className: string;
  classStandard?: string;
  division: string;
  gender: string;
  category: string;
  academicYear: string;
  medium?: string;
  firstLangPaper1?: string;
  firstLangPaper2?: string;
  secondLang?: string;
  thirdLang?: string;
}

export default function ChecklistDatabasePage() {
  const [schoolCode, setSchoolCode] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  
  // Editing state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

      const [districts, setDistricts] = useState<any[]>([]);
    const [eduDistricts, setEduDistricts] = useState<any[]>([]);
    const [filterDistrictId, setFilterDistrictId] = useState<string>('ALL');
    const [filterEduId, setFilterEduId] = useState<string>('ALL');

    const [activeCategory, setActiveCategory] = useState<'FIRST_LOGIN' | 'COMPLETED' | 'PENDING' | null>(null);

    const [studentSearch, setStudentSearch] = useState('');
    const [filterClassId, setFilterClassId] = useState<string>('ALL');

    const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      if (filterDistrictId !== 'ALL' && s.districtId !== filterDistrictId) return false;
      if (filterEduId !== 'ALL' && (s.eduId !== filterEduId && s.subDistrictId !== filterEduId)) return false;
      return true;
    });
  }, [schools, filterDistrictId, filterEduId]);

  const firstLoginSchools = useMemo(() => filteredSchools.filter(s => !s.passwordChanged), [filteredSchools]);
  const completedSchools = useMemo(() => filteredSchools.filter(s => s.passwordChanged && s.profileCompleted), [filteredSchools]);
  const pendingSchools = useMemo(() => filteredSchools.filter(s => s.passwordChanged && !s.profileCompleted), [filteredSchools]);

  const filteredStudents = useMemo(() => {
    let result = students;

    if (filterClassId !== 'ALL') {
      result = result.filter(s => {
        const effectiveClass = String(s.classStandard || s.className || '10').trim();
        return effectiveClass === filterClassId;
      });
    }

    if (!studentSearch.trim()) return result;
    const q = studentSearch.trim().toLowerCase();
    return result.filter(s => {
      const fields = [
        s.regNo, s.globalId, s.name, s.className, s.division,
        s.gender, s.category, s.academicYear,
        s.medium, s.firstLangPaper1, s.firstLangPaper2, s.secondLang, s.thirdLang
      ].filter(Boolean).map(f => String(f).toLowerCase());
      return fields.some(f => f.includes(q));
    });
  }, [students, studentSearch, filterClassId]);

  const handlePrint = (categoryName: string, schoolList: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Swal.fire('Error', 'Popup blocked! Please allow popups to print.', 'error');
      return;
    }

    const htmlContent = `
      <html>
      <head>
        <title>Schools List - ${categoryName}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; color: black; }
          h2 { text-align: center; text-transform: uppercase; margin-bottom: 20px; font-size: 18px; }
          .info { text-align: center; margin-bottom: 30px; font-size: 12px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid black; padding: 8px 12px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; text-transform: uppercase; }
          .sl-no { width: 8%; text-align: center; }
          .school-code { width: 20%; text-align: center; }
          @media print {
            @page { size: A4; margin: 15mm; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h2>Schools List - ${categoryName}</h2>
        <div class="info">Generated on ${new Date().toLocaleDateString('en-IN')} | Total Schools: ${schoolList.length}</div>
        <table>
          <thead>
            <tr>
              <th class="sl-no">Sl No</th>
              <th class="school-code">School Code</th>
              <th>School Name</th>
            </tr>
          </thead>
          <tbody>
            ${schoolList.map((school, index) => `
              <tr>
                <td class="sl-no">${index + 1}</td>
                <td class="school-code">${school.schoolCode || school.username || '-'}</td>
                <td>${school.name || school.displayName || 'Unnamed School'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dRes, eRes, sRes] = await Promise.all([
          apiClient.get('/management/districts'),
          apiClient.get('/management/educational-districts'),
          apiClient.get('/management/schools')
        ]);
        setDistricts(dRes.data);
        setEduDistricts(eRes.data);
        setSchools(sRes.data);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!schoolCode.trim()) {
      setErrorMsg('Please enter a School Code');
      return;
    }
    setErrorMsg('');
    setStudents([]);
    setSelectedStudentIds(new Set());
    setFilterClassId('ALL');
    setIsSearching(true);

    try {
      const targetSchool = schools.find(
        s => String(s.schoolCode || '').toUpperCase() === String(schoolCode).toUpperCase() ||
             String(s.username || '').toUpperCase() === String(schoolCode).toUpperCase()
      );

      if (!targetSchool) {
        setErrorMsg(`School not found with code: ${schoolCode}`);
        setIsSearching(false);
        return;
      }

      const schoolId = targetSchool.id;
      const res = await apiClient.get(`/management/students?schoolId=${schoolId}`);
      
      const sortedStudents = (res.data || []).sort((a: Student, b: Student) => {
        const classA = a.classStandard || a.className || '10';
        const classB = b.classStandard || b.className || '10';
        if (classA !== classB) return classA.localeCompare(classB);
        const divA = a.division || '';
        const divB = b.division || '';
        if (divA !== divB) return divA.localeCompare(divB);
        return a.name.localeCompare(b.name);
      });
      
      setStudents(sortedStudents);
      if (sortedStudents.length === 0) {
        setErrorMsg('No students found for this school.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch students. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const handleSelectStudent = (id: string, checked: boolean) => {
    const newSet = new Set(selectedStudentIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedStudentIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.size === 0) return;
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedStudentIds.size} students. This cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!'
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        await apiClient.post('/management/students/bulk-delete', {
          ids: Array.from(selectedStudentIds)
        });
        setStudents(prev => prev.filter(s => !selectedStudentIds.has(s.id)));
        setSelectedStudentIds(new Set());
        Swal.fire('Deleted!', 'The selected students have been deleted.', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to delete students.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteSingle = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this student deletion!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete!'
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        await apiClient.delete(`/management/students/${id}`);
        setStudents(prev => prev.filter(s => s.id !== id));
        Swal.fire('Deleted!', 'Student has been deleted.', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to delete student.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startEdit = (student: Student) => {
    setEditingStudentId(student.id);
    setEditForm({
      name: student.name,
      className: student.className,
      classStandard: student.classStandard,
      division: student.division,
      regNo: student.regNo || student.globalId,
      academicYear: student.academicYear,
      gender: student.gender,
      category: student.category
    });
  };

  const cancelEdit = () => {
    setEditingStudentId(null);
    setEditForm({});
  };

  const saveEdit = async (studentId: string) => {
    setIsLoading(true);
    try {
      const studentToUpdate = students.find(s => s.id === studentId);
      if (!studentToUpdate) return;
      
      const payload = {
        ...studentToUpdate,
        ...editForm,
      };

      const res = await apiClient.post('/management/students', payload);
      setStudents(prev => prev.map(s => s.id === studentId ? res.data : s));
      setEditingStudentId(null);
      Swal.fire('Saved!', 'Student updated successfully.', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to update student.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    const exportList = filteredStudents.length > 0 ? filteredStudents : students;
    if (exportList.length === 0) return;
    
    const headers = ['Register No', 'Name', 'Class', 'Division', 'Academic Year', 'Gender', 'Category', 'Medium', 'First Lang (P01)', 'First Lang (P02)', 'Second Lang (P03)', 'Third Lang (P04)'];
    
    const rows = exportList.map(s => {
      const effectiveClass = s.classStandard || s.className || '10';
      return [
        s.regNo || s.globalId || '',
        s.name || '',
        effectiveClass,
        s.division || '',
        s.academicYear || '',
        s.gender || '',
        s.category || '',
        s.medium || '',
        s.firstLangPaper1 || '',
        s.firstLangPaper2 || '',
        s.secondLang || '',
        s.thirdLang || ''
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `checklist_export_${schoolCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearSingleField = async (student: Student, fieldKey: 'medium' | 'firstLangPaper1' | 'firstLangPaper2' | 'secondLang' | 'thirdLang', fieldLabel: string) => {
    const result = await Swal.fire({
      title: `Delete ${fieldLabel}?`,
      text: `Are you sure you want to delete ${fieldLabel} for "${student.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: `Yes, delete ${fieldLabel}`
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        const res = await apiClient.post(`/management/students/${student.id}/clear-field`, {
          field: fieldKey
        });
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, ...res.data } : s));
        Swal.fire('Deleted!', `${fieldLabel} has been deleted for ${student.name}.`, 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', `Failed to delete ${fieldLabel}.`, 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBulkClearFields = async (fieldKey: string, fieldLabel: string) => {
    if (selectedStudentIds.size === 0) return;

    const fieldsToClear = fieldKey === 'all' 
      ? ['medium', 'firstLangPaper1', 'firstLangPaper2', 'secondLang', 'thirdLang'] 
      : [fieldKey];

    const result = await Swal.fire({
      title: `Clear ${fieldLabel}?`,
      text: `Are you sure you want to clear ${fieldLabel} for ${selectedStudentIds.size} selected students?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: `Yes, clear for all ${selectedStudentIds.size} students`
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        await apiClient.post('/management/students/bulk-clear-fields', {
          studentIds: Array.from(selectedStudentIds),
          fields: fieldsToClear
        });

        setStudents(prev => prev.map(s => {
          if (!selectedStudentIds.has(s.id)) return s;
          const updated = { ...s };
          fieldsToClear.forEach(f => {
            if (f === 'medium') updated.medium = '';
            if (f === 'firstLangPaper1') updated.firstLangPaper1 = '';
            if (f === 'firstLangPaper2') updated.firstLangPaper2 = '';
            if (f === 'secondLang') updated.secondLang = '';
            if (f === 'thirdLang') updated.thirdLang = '';
          });
          return updated;
        }));

        Swal.fire('Cleared!', `Successfully cleared ${fieldLabel} for ${selectedStudentIds.size} students.`, 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', `Failed to clear ${fieldLabel}.`, 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6 border-b border-gray-100 dark:border-[#30363d] pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Checklist Database</h1>
          <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-wider">Manage student directory and school status</p>
        </div>
      </div>

            {/* School Filters */}
      <div className="bg-white dark:bg-[#161b22] p-4 rounded-2xl border border-gray-200 dark:border-[#30363d] shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Revenue District</label>
          <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
            <select
              value={filterDistrictId}
              onChange={(e) => { setFilterDistrictId(e.target.value); setFilterEduId('ALL'); }}
              className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
            >
              <option value="ALL" className="px-3 py-1.5 text-xs font-bold">All Revenue Districts</option>
              {districts.map(d => <option key={d.id} value={d.id} className="px-3 py-1.5 text-xs font-bold">{d.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Educational District</label>
          <div className="flex items-center bg-white dark:bg-[#161b22] border-l-2 border-l-indigo-500 px-3.5 py-2.5 rounded-2xl shadow-sm min-w-[140px]">
            <select
              value={filterEduId}
              onChange={(e) => setFilterEduId(e.target.value)}
              className="bg-transparent border-none text-xs font-black uppercase text-black dark:text-white focus:ring-0 cursor-pointer outline-none w-full native-select single-line-label"
            >
              <option value="ALL" className="px-3 py-1.5 text-xs font-bold">All Educational Districts</option>
              {eduDistricts.filter(e => filterDistrictId === 'ALL' || e.districtId === filterDistrictId).map(e => (
                <option key={e.id} value={e.id} className="px-3 py-1.5 text-xs font-bold">{e.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schools Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: First-time Login */}
        <div 
          onClick={() => setActiveCategory(activeCategory === 'FIRST_LOGIN' ? null : 'FIRST_LOGIN')}
          className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1 relative overflow-hidden ${
            activeCategory === 'FIRST_LOGIN' 
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-300 dark:bg-amber-950/20 dark:border-amber-800' 
              : 'bg-white border-gray-100 dark:bg-[#161b22] dark:border-[#30363d] border-slate-200/60'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">Pending Initial Login</span>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mt-2">{firstLoginSchools.length}</h2>
            </div>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
              <Clock size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 font-medium">Schools that haven't logged in or changed default password.</p>
        </div>

        {/* Card 2: Completed Profile */}
        <div 
          onClick={() => setActiveCategory(activeCategory === 'COMPLETED' ? null : 'COMPLETED')}
          className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1 relative overflow-hidden ${
            activeCategory === 'COMPLETED' 
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800' 
              : 'bg-white border-gray-100 dark:bg-[#161b22] dark:border-[#30363d] border-slate-200/60'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Completed Profile</span>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mt-2">{completedSchools.length}</h2>
            </div>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 font-medium">Schools that completed their registration and profile details.</p>
        </div>

        {/* Card 3: Pending Profile */}
        <div 
          onClick={() => setActiveCategory(activeCategory === 'PENDING' ? null : 'PENDING')}
          className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1 relative overflow-hidden ${
            activeCategory === 'PENDING' 
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-300 dark:bg-blue-950/20 dark:border-blue-800' 
              : 'bg-white border-gray-100 dark:bg-[#161b22] dark:border-[#30363d] border-slate-200/60'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">Pending Profile</span>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mt-2">{pendingSchools.length}</h2>
            </div>
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
              <AlertCircle size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 font-medium">Schools that logged in but haven't completed their profile info.</p>
        </div>
      </div>

      {/* Expanded Schools List */}
      {activeCategory && (
        <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] shadow-md overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="p-5 border-b border-gray-100 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#1f242c] flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                {activeCategory === 'FIRST_LOGIN' && 'First-Time Login Schools'}
                {activeCategory === 'COMPLETED' && 'Profile Completed Schools'}
                {activeCategory === 'PENDING' && 'Pending Profile Completion Schools (Not First Login)'}
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-0.5 uppercase tracking-wide">
                Total: {
                  activeCategory === 'FIRST_LOGIN' ? firstLoginSchools.length :
                  activeCategory === 'COMPLETED' ? completedSchools.length :
                  pendingSchools.length
                } Schools
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const title = activeCategory === 'FIRST_LOGIN' ? 'First-Time Login Schools' :
                                activeCategory === 'COMPLETED' ? 'Profile Completed Schools' :
                                'Pending Profile Completion Schools (Not First Login)';
                  const list = activeCategory === 'FIRST_LOGIN' ? firstLoginSchools :
                               activeCategory === 'COMPLETED' ? completedSchools :
                               pendingSchools;
                  handlePrint(title, list);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl border border-indigo-500 shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Printer size={14} />
                Print List
              </button>
              <button
                onClick={() => setActiveCategory(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <th className="p-4 w-16 text-center">Sl No</th>
                  <th className="p-4 w-44">School Code</th>
                  <th className="p-4">School Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
                {(() => {
                  const list = activeCategory === 'FIRST_LOGIN' ? firstLoginSchools :
                               activeCategory === 'COMPLETED' ? completedSchools :
                               pendingSchools;
                  
                  if (list.length === 0) {
                    return (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-sm font-bold text-gray-400 uppercase">
                          No schools in this category.
                        </td>
                      </tr>
                    );
                  }

                  return list.map((school, idx) => (
                    <tr key={school.id || school._id} className="hover:bg-slate-50 dark:hover:bg-[#1f242c]/50 transition-colors">
                      <td className="p-4 text-center text-xs font-bold text-gray-400">{idx + 1}</td>
                      <td className="p-4 font-mono text-xs font-bold text-indigo-600 dark:text-blue-400">
                        {school.schoolCode || school.username || '-'}
                      </td>
                      <td className="p-4 text-xs font-black text-gray-800 dark:text-gray-200 uppercase">
                        {school.name || school.displayName || 'Unnamed School'}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#161b22] rounded-xl border border-gray-100 dark:border-[#30363d] shadow-sm p-4">
        <div className="flex gap-3 max-w-xl">
          <input
            type="text"
            placeholder="Enter School Code (e.g. 21043)"
            value={schoolCode}
            onChange={(e) => setSchoolCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70"
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>
        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 text-rose-600 text-sm font-bold bg-rose-50 p-2 rounded-lg border border-rose-100 max-w-xl">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}
      </div>

      {students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, reg no, medium, P01, P02, P03, P04..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="px-3 py-1 bg-white text-gray-700 font-bold text-xs uppercase tracking-wider rounded-md border border-gray-200 cursor-pointer outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="ALL">All Classes</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>
            <span className="text-xs font-black text-slate-700 uppercase px-3 py-1 bg-white rounded-md border border-gray-200 shadow-sm">
              Total: {filteredStudents.length}{(studentSearch || filterClassId !== 'ALL') ? ` / ${students.length}` : ''}
            </span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100 uppercase tracking-wider">
              Selected: {selectedStudentIds.size}
            </span>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-black text-xs uppercase tracking-wider rounded-md border border-emerald-200 flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
            {selectedStudentIds.size > 0 && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const val = e.target.value;
                      const labelMap: Record<string, string> = {
                        medium: 'Medium',
                        firstLangPaper1: 'P01 (1st Lang)',
                        firstLangPaper2: 'P02 (1st Lang)',
                        secondLang: 'P03 (2nd Lang)',
                        thirdLang: 'P04 (3rd Lang)',
                        all: 'All Languages & Medium'
                      };
                      handleBulkClearFields(val, labelMap[val] || val);
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 font-black text-xs uppercase tracking-wider rounded-md border border-amber-200 cursor-pointer outline-none"
                >
                  <option value="">Clear Medium/Language...</option>
                  <option value="medium">Clear Medium</option>
                  <option value="firstLangPaper1">Clear P01 (1st Lang)</option>
                  <option value="firstLangPaper2">Clear P02 (1st Lang)</option>
                  <option value="secondLang">Clear P03 (2nd Lang)</option>
                  <option value="thirdLang">Clear P04 (3rd Lang)</option>
                  <option value="all">Clear All Languages & Medium</option>
                </select>

                <button
                  onClick={handleBulkDelete}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-black text-xs uppercase tracking-wider rounded-md border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete Selected
                </button>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <th className="p-4 w-12 text-center">
                    <button onClick={() => handleSelectAll(selectedStudentIds.size !== filteredStudents.length)}>
                      {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                        <CheckSquare size={16} className="text-indigo-600" />
                      ) : (
                        <Square size={16} className="text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Reg No</th>
                  <th className="p-4">Candidate Name</th>
                  <th className="p-4">Gender</th>
                  <th className="p-4 text-center">Class</th>
                  <th className="p-4 text-center">Div</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Academic Yr</th>
                  <th className="p-4 text-center">Medium</th>
                  <th className="p-4">P01 (1st Lang)</th>
                  <th className="p-4">P02 (1st Lang)</th>
                  <th className="p-4">P03 (2nd Lang)</th>
                  <th className="p-4">P04 (3rd Lang)</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map(student => {
                  const isEditing = editingStudentId === student.id;
                  const isSelected = selectedStudentIds.has(student.id);
                  const effectiveClass = student.classStandard || student.className || '10';

                  return (
                    <tr key={student.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                      <td className="p-4 text-center align-middle">
                        <button onClick={() => handleSelectStudent(student.id, !isSelected)}>
                          {isSelected ? (
                            <CheckSquare size={16} className="text-indigo-600" />
                          ) : (
                            <Square size={16} className="text-gray-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.regNo || ''}
                            onChange={e => setEditForm({ ...editForm, regNo: e.target.value })}
                            className="w-24 px-2 py-1 text-xs font-mono border rounded outline-none"
                          />
                        ) : (
                          <span className="font-mono text-xs font-bold text-gray-500">{student.regNo || student.globalId || '-'}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value.toUpperCase() })}
                            className="w-full px-2 py-1 text-xs font-bold uppercase border rounded outline-none"
                          />
                        ) : (
                          <span className="font-black text-gray-800 uppercase text-xs">{student.name}</span>
                        )}
                      </td>
                      <td className="p-4 text-xs">
                        {isEditing ? (
                          <select
                            value={editForm.gender || ''}
                            onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                            className="w-20 px-3 py-2.5 border rounded outline-none"
                          >
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          <span className="uppercase text-gray-600 font-medium">{student.gender || '-'}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.classStandard || editForm.className || ''}
                            onChange={e => setEditForm({ ...editForm, classStandard: e.target.value, className: e.target.value })}
                            className="w-16 text-center px-2 py-1 text-xs font-mono border rounded outline-none"
                          />
                        ) : (
                          <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">
                            {effectiveClass}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.division || ''}
                            onChange={e => setEditForm({ ...editForm, division: e.target.value.toUpperCase() })}
                            className="w-16 text-center px-2 py-1 text-xs font-mono border rounded outline-none"
                          />
                        ) : (
                          <span className="font-black text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs">
                            {student.division || '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.category || ''}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value.toUpperCase() })}
                            className="w-24 px-2 py-1 border rounded outline-none uppercase"
                          />
                        ) : (
                          <span className="font-medium text-gray-600 uppercase">{student.category || '-'}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.academicYear || ''}
                            onChange={e => setEditForm({ ...editForm, academicYear: e.target.value })}
                            className="w-24 px-2 py-1 text-xs border rounded outline-none"
                          />
                        ) : (
                          <span className="font-bold text-gray-500 text-[10px] uppercase bg-gray-100 px-2 py-1 rounded">
                            {student.academicYear || '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {student.medium ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <span>{student.medium}</span>
                            <button
                              onClick={() => handleClearSingleField(student, 'medium', 'Medium')}
                              className="text-indigo-400 hover:text-rose-600 transition-colors cursor-pointer p-0.5 hover:bg-rose-50 rounded ml-0.5"
                              title="Delete Medium"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs font-bold">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {student.firstLangPaper1 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            <span>{student.firstLangPaper1}</span>
                            <button
                              onClick={() => handleClearSingleField(student, 'firstLangPaper1', 'P01 (1st Lang)')}
                              className="text-red-400 hover:text-rose-700 transition-colors cursor-pointer p-0.5 hover:bg-red-100 rounded ml-0.5"
                              title="Delete P01 Language"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs font-bold">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {student.firstLangPaper2 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            <span>{student.firstLangPaper2}</span>
                            <button
                              onClick={() => handleClearSingleField(student, 'firstLangPaper2', 'P02 (1st Lang)')}
                              className="text-red-400 hover:text-rose-700 transition-colors cursor-pointer p-0.5 hover:bg-red-100 rounded ml-0.5"
                              title="Delete P02 Language"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs font-bold">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {student.secondLang ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            <span>{student.secondLang}</span>
                            <button
                              onClick={() => handleClearSingleField(student, 'secondLang', 'P03 (2nd Lang)')}
                              className="text-blue-400 hover:text-rose-700 transition-colors cursor-pointer p-0.5 hover:bg-blue-100 rounded ml-0.5"
                              title="Delete P03 Language"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs font-bold">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {student.thirdLang ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            <span>{student.thirdLang}</span>
                            <button
                              onClick={() => handleClearSingleField(student, 'thirdLang', 'P04 (3rd Lang)')}
                              className="text-amber-500 hover:text-rose-700 transition-colors cursor-pointer p-0.5 hover:bg-amber-100 rounded ml-0.5"
                              title="Delete P04 Language"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs font-bold">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveEdit(student.id)}
                              disabled={isLoading}
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                              title="Save"
                            >
                              <Save size={14} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={isLoading}
                              className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(student)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSingle(student.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
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
        </div>
      )}
    </div>
  );
}
