import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Plus, 
  X, 
  Search, 
  Filter,
  FileDown,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  CheckCircle2,
  Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { mediumNameToId } from '../../lib/mediumUtils';
import Modal from '../../components/common/Modal';
import Dropdown from '../../components/common/Dropdown';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import PageLoader from '../../components/common/PageLoader';

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  fileType: string;
  resourceType: string;
  originalName?: string;
  fileSize: number;
  downloadCount: number;
  uploadedBy: string;
  active: boolean;
  createdAt: string;
  medium?: string;
  subject?: string;
  className?: string;
  publishDateTime?: string;
}

const CATEGORIES = ["Question Papers", "Answer Keys", "Study Materials", "General"];

const ResourceManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'WEBMASTER' || user?.role === 'DEO' || user?.role === 'DIET' || user?.role === 'SUBJECT_EXPERT';

  const { mediums, subjects } = useData();

  const getAvailableSubjects = (medium: string) => {
    const upper = medium.toUpperCase();
    const matchedMedium = mediums.find((m: any) => m.name.toUpperCase() === upper || m.id === medium);
    
    if (matchedMedium) {
      const medId = matchedMedium.id;
      const medCode = (matchedMedium.code || '').toUpperCase();
      const byIdOrCode = subjects.filter(s => s.active && (
        s.mediumId === medId ||
        s.mediumId === matchedMedium._id ||
        (s.medium || '').toUpperCase() === medCode ||
        (s.medium || '').toUpperCase() === upper
      ));
      if (byIdOrCode.length > 0) return byIdOrCode;
    }
    
    return subjects.filter(s => s.active && (
      (s.mediumName || '').toUpperCase() === upper ||
      (s.medium || '').toUpperCase() === upper
    ));
  };

  const getFilteredSubjectsForUpload = (medium: string, user: any) => {
    let allSubjects = getAvailableSubjects(medium);
    if (user?.teachingSubjects && Array.isArray(user.teachingSubjects) && user.teachingSubjects.length > 0) {
      allSubjects = allSubjects.filter(sub => {
        const dbName = (sub.name || '').toUpperCase();
        return user.teachingSubjects.some((ts: string) => {
          const taught = ts.toUpperCase();
          if (taught === 'MATHS' && (dbName.includes('MATHEMATICS') || dbName.includes('MATH'))) return true;
          if (taught === 'MATHEMATICS' && (dbName.includes('MATHEMATICS') || dbName.includes('MATH'))) return true;
          if (taught === 'ICT' && (dbName.includes('ICT') || dbName.includes('INFORMATION TECHNOLOGY'))) return true;
          if (taught === 'MALAYALAM' && dbName.includes('MALAYALAM')) return true;
          if (taught === 'TAMIL' && dbName.includes('TAMIL')) return true;
          if (taught === 'SANSKRIT' && dbName.includes('SANSKRIT')) return true;
          if (taught === 'ARABIC' && dbName.includes('ARABIC')) return true;
          if (taught === 'URDU' && dbName.includes('URDU')) return true;
          if (taught === 'SOCIAL SCIENCE' && dbName.includes('SOCIAL SCIENCE')) return true;
          if (taught === 'PHYSICS' && dbName.includes('PHYSICS')) return true;
          if (taught === 'CHEMISTRY' && dbName.includes('CHEMISTRY')) return true;
          if (taught === 'BIOLOGY' && dbName.includes('BIOLOGY')) return true;
          if (taught === 'ENGLISH' && dbName.includes('ENGLISH')) return true;
          if (taught === 'HINDI' && dbName.includes('HINDI')) return true;
          return dbName.includes(taught);
        });
      });
    }
    return allSubjects;
  };

  const getFilteredMediums = () => {
    if (user?.mediums && Array.isArray(user.mediums) && user.mediums.length > 0) {
      return mediums.filter(m => user.mediums.includes(m.shortName) || user.mediums.includes(m.code)).map(m => m.shortName);
    }
    return mediums.map(m => m.shortName);
  };
  const availableMediums = getFilteredMediums();

  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMedium, setSelectedMedium] = useState(() => {
    // Only use user's first medium if they have mediums assigned
    if (user?.mediums && Array.isArray(user.mediums) && user.mediums.length > 0) {
      const firstMedium = user.mediums[0];
      return availableMediums.includes(firstMedium) ? firstMedium : availableMediums[0];
    }
    // For non-admin, non-teacher users, check if 'ALL' is in available mediums (not likely)
    return 'ALL';
  });
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('ALL');
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [uploadForm, setUploadForm] = useState(() => {
    const initialMedium = user?.mediums && Array.isArray(user.mediums) && user.mediums.length > 0
      ? user.mediums[0]
      : availableMediums.length > 0
        ? availableMediums[0]
        : 'English';
    const allowed = getFilteredSubjectsForUpload(initialMedium, user);
    const initialSubject = allowed.length > 0
      ? allowed[0].name
      : getAvailableSubjects(initialMedium).length > 0
        ? getAvailableSubjects(initialMedium)[0].name
        : '';

    return {
      title: '',
      description: '',
      category: 'General',
      className: '', // Class dropdown selection
      medium: initialMedium,
      subject: initialSubject,
      file: null as File | null,
      externalLink: '',
      publishDateTime: '',
      isScheduled: false
    };
  });

    const resetUploadForm = () => {
    const initialMedium = user?.mediums && Array.isArray(user.mediums) && user.mediums.length > 0
      ? user.mediums[0]
      : availableMediums.length > 0
        ? availableMediums[0]
        : 'English';
    const allowed = getFilteredSubjectsForUpload(initialMedium, user);
    const initialSubject = allowed.length > 0
      ? allowed[0].name
      : getAvailableSubjects(initialMedium).length > 0
        ? getAvailableSubjects(initialMedium)[0].name
        : '';

    setUploadForm({
      title: '',
      description: '',
      category: 'General',
      className: '',
      medium: initialMedium,
      subject: initialSubject,
      file: null,
      externalLink: '',
      publishDateTime: '',
      isScheduled: false
    });
  };

  useEffect(() => {
    if (user?.mediums && Array.isArray(user.mediums) && user.mediums.length > 0) {
      if (!user.mediums.includes(selectedMedium)) {
        setSelectedMedium(user.mediums[0]);
      }
      setUploadForm(prev => {
        let currentMedium = prev.medium;
        if (!user.mediums.includes(prev.medium)) {
          currentMedium = user.mediums[0];
        }
        const allowed = getFilteredSubjectsForUpload(currentMedium, user);
        let currentSubject = prev.subject;
        if (!allowed.some(s => s.name === currentSubject) && currentSubject !== '') {
          currentSubject = allowed.length > 0 ? allowed[0].name : ''; 
        }
        return {
          ...prev,
          medium: currentMedium,
          subject: currentSubject
        };
      });
    } else if (user?.teachingSubjects && Array.isArray(user.teachingSubjects) && user.teachingSubjects.length > 0) {
      setUploadForm(prev => {
        const allowed = getFilteredSubjectsForUpload(prev.medium, user);
        let currentSubject = prev.subject;
        if (!allowed.some(s => s.name === currentSubject) && currentSubject !== '') {
          currentSubject = allowed.length > 0 ? allowed[0].name : ''; 
        }
        return {
          ...prev,
          subject: currentSubject
        };
      });
    } else {
      setUploadForm(prev => {
        const allowed = getFilteredSubjectsForUpload(prev.medium, user);
        let currentSubject = prev.subject;
        if (!allowed.some(s => s.name === currentSubject) && currentSubject !== '') {
          currentSubject = allowed.length > 0 ? allowed[0].name : ''; 
        }
        return {
          ...prev,
          subject: currentSubject
        };
      });
    }
  }, [user, selectedMedium]);



   const handleMediumChange = (newMedium: string) => {
     const newSubjects = getFilteredSubjectsForUpload(newMedium, user);
     let newSubject = uploadForm.subject;
     if (!newSubjects.some(s => s.name === newSubject) && newSubject !== '') {
       newSubject = newSubjects.length > 0 ? newSubjects[0].name : ''; 
     }
     setUploadForm(prev => ({ ...prev, medium: newMedium, subject: newSubject }));
   };

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/resources');
      setResources(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleDownload = async (resource: Resource) => {
    if (resource.fileType === 'link') {
      try {
        await apiClient.post(`/resources/${resource.id}/download`);
        setResources(prev => prev.map(r => 
          r.id === resource.id ? { ...r, downloadCount: r.downloadCount + 1 } : r
        ));
        window.open(resource.fileUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        toast.error('Failed to open link');
      }
      return;
    }

    const downloadToast = toast.loading('Preparing download...');
    try {
      // Use apiClient to fetch the blob through our proxy route
      // This ensures Auth headers are included and CORS is handled by the server
      const response = await apiClient.get(`/download-resource/${resource.id}`, {
        responseType: 'blob'
      });
      
      // Update local state for real-time feel
      setResources(prev => prev.map(r => 
        r.id === resource.id ? { ...r, downloadCount: r.downloadCount + 1 } : r
      ));

      // Construct filename from resource data
      const filename = resource.originalName || `${resource.title}.${resource.fileType}`;
      
      // Create blob and trigger download
      const blob = new Blob([response.data], { type: response.headers['content-type'] as string });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started', { id: downloadToast });
    } catch (err) {
      console.error('Download failed', err);
      toast.error('Failed to download file. Please try again.', { id: downloadToast });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title) {
      toast.error('Title is required');
      return;
    }
    if (uploadType === 'file' && !uploadForm.file) {
      toast.error('File is required');
      return;
    }
    if (uploadType === 'link' && !uploadForm.externalLink) {
      toast.error('External link URL is required');
      return;
    }

    const formData = new FormData();
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('category', uploadForm.category);
    formData.append('className', uploadForm.className);
    formData.append('medium', uploadForm.medium);
    formData.append('subject', uploadForm.subject);
    formData.append('uploadedBy', user?.id || '');
    
    if (uploadType === 'file' && uploadForm.file) {
      formData.append('file', uploadForm.file);
    } else if (uploadType === 'link') {
      formData.append('externalLink', uploadForm.externalLink);
    }

    if (uploadForm.category === 'Question Papers' && uploadForm.isScheduled && uploadForm.publishDateTime) {
      formData.append('publishDateTime', uploadForm.publishDateTime);
    }

    setIsBulkImporting(true);
    try {
      await apiClient.post('/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Resource uploaded successfully');
      setShowUploadModal(false);
      resetUploadForm();
      loadResources();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload resource');
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleDelete = async (resource: Resource) => {
    const result = await Swal.fire({
      title: 'Delete Resource?',
      text: `Are you sure you want to delete "${resource.title}"? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/resources/${resource.id}`);
        setResources(prev => prev.filter(r => r.id !== resource.id));
        toast.success('Resource deleted');
      } catch (err) {
        toast.error('Failed to delete resource');
      }
    }
  };

  const handleToggleActive = async (resource: Resource) => {
    try {
      const res = await apiClient.patch(`/resources/${resource.id}/toggle`);
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, active: res.data.active } : r));
      toast.success(`Resource ${res.data.active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error('Failed to toggle resource status');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAvailableSubjectsForFilter = (medium: string) => {
    if (medium === 'ALL') {
      const allSubjects = subjects.filter(s => s.active);
      const seen = new Set<string>();
      return allSubjects.filter(s => {
        if (seen.has(s.name)) return false;
        seen.add(s.name);
        return true;
      }).sort((a, b) => a.name.localeCompare(b.name));
    }
    return getAvailableSubjects(medium);
  };

  useEffect(() => {
    if (selectedMedium !== 'ALL') {
      const validSubjects = getAvailableSubjects(selectedMedium);
      if (selectedSubject !== 'ALL' && !validSubjects.some(s => s.name === selectedSubject)) {
        setSelectedSubject('ALL');
      }
    }
  }, [selectedMedium]);

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          res.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || res.category === selectedCategory;
    const matchesMedium = selectedMedium === 'ALL' || res.medium === selectedMedium;
    const matchesSubject = selectedSubject === 'ALL' || res.subject === selectedSubject;
    const matchesClass = selectedClass === 'ALL' || res.className === selectedClass;
    return matchesSearch && matchesCategory && matchesMedium && matchesSubject && matchesClass && (isAdmin || res.active);
  });

  return (
    <div className="p-4 sm:p-8 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-[#30363d]">
        <div className="w-full min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tighter uppercase flex items-center gap-3 single-line-label w-full">
            <FileText size={32} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            Resource Materials
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 font-medium mt-1 single-row-desc">
            Access study materials, answer keys, and model question papers here.
          </p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white dark:bg-[#1f6feb] hover:bg-blue-700 dark:hover:bg-[#388bfd] rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 shrink-0 native-touch-target active-tap"
          >
            <Plus size={16} />
            Upload Resource
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-[#161b22] p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-[#30363d] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Search materials by title or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#1f242c] border border-gray-100 dark:border-[#30363d] rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-gray-50 dark:border-[#30363d]">
          <div className="flex items-center justify-between gap-1.5 text-gray-400 dark:text-gray-400 py-1 w-full">
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-indigo-500 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest single-line-label">Filter Resources:</span>
            </div>
            {/* Reset Filters button */}
            {(searchQuery || selectedCategory !== 'ALL' || selectedMedium !== 'ALL' || selectedClass !== 'ALL' || selectedSubject !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedMedium('ALL');
                  setSelectedClass('ALL');
                  setSelectedSubject('ALL');
                }}
                className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all flex items-center gap-1 cursor-pointer active-tap shrink-0"
              >
                <X size={12} />
                Reset Filters
              </button>
            )}
          </div>

          {/* 4 Dropdowns Grid - 1 per row on mobile (4 lines) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full">
            {/* Category Dropdown */}
            <div className="w-full flex items-center gap-2 bg-slate-50 dark:bg-[#1f242c] px-3.5 py-2.5 rounded-2xl border border-gray-100 dark:border-[#30363d] native-touch-target active-tap">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 shrink-0">Category:</span>
              <Dropdown
                className="w-full"
                value={selectedCategory}
                onChange={(v) => setSelectedCategory(v)}
                options={[
                  { value: 'ALL', label: 'All Categories' },
                  ...CATEGORIES.map(cat => ({ value: cat, label: cat })),
                ]}
              />
            </div>

            {/* Medium Dropdown */}
            <div className="w-full flex items-center gap-2 bg-slate-50 dark:bg-[#1f242c] px-3.5 py-2.5 rounded-2xl border border-gray-100 dark:border-[#30363d] native-touch-target active-tap">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 shrink-0">Medium:</span>
              <Dropdown
                key={`filter-medium-${user?.id || 'default'}`}
                className="w-full"
                value={selectedMedium}
                onChange={(v) => setSelectedMedium(v)}
                options={[
                  ...((!user?.mediums || !Array.isArray(user.mediums) || user.mediums.length === 0) ? [{ value: 'ALL', label: 'All Mediums' }] : []),
                  ...availableMediums.map(med => ({ value: med, label: med })),
                ]}
              />
            </div>

            {/* Class Dropdown */}
            <div className="w-full flex items-center gap-2 bg-slate-50 dark:bg-[#1f242c] px-3.5 py-2.5 rounded-2xl border border-gray-100 dark:border-[#30363d] native-touch-target active-tap">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 shrink-0">Class:</span>
              <Dropdown
                className="w-full"
                value={selectedClass}
                onChange={(v) => setSelectedClass(v)}
                options={[
                  { value: 'ALL', label: 'All Classes' },
                  { value: '8', label: 'Class 8' },
                  { value: '9', label: 'Class 9' },
                  { value: '10', label: 'Class 10' },
                ]}
              />
            </div>

              {/* Subject Dropdown */}
              <div className="w-full flex items-center gap-2 bg-slate-50 dark:bg-[#1f242c] px-3.5 py-2.5 rounded-2xl border border-gray-100 dark:border-[#30363d] native-touch-target active-tap">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 shrink-0">Subject:</span>
                <Dropdown
                  key={`filter-subject-${selectedMedium}`}
                  className="w-full"
                  value={selectedSubject}
                  onChange={(v) => setSelectedSubject(v)}
                  options={[
                    { value: 'ALL', label: 'All Subjects' },
                    ...getAvailableSubjectsForFilter(selectedMedium).map(sub => ({ value: sub.name, label: sub.name })),
                  ]}
                />
              </div>
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      {isLoading ? (
        <PageLoader label="Loading Resource Management..." />
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-gray-200">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No resources found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => (
            <div key={res.id} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all p-6 flex flex-col relative overflow-hidden">
              {/* Category Badge */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-full tracking-wider">
                    {res.category}
                  </span>
                  {res.className && (
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 text-[10px] font-black uppercase rounded-full tracking-wider">
                      Class {res.className}
                    </span>
                  )}
                  {res.subject && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-full tracking-wider">
                      {res.medium} - {res.subject}
                    </span>
                  )}
                  {isAdmin && (
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider ${res.active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {res.active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleToggleActive(res)}
                      title={res.active ? 'Deactivate resource' : 'Activate resource'}
                      className={`p-2 rounded-full transition-all ${res.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      {res.active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button 
                      onClick={() => handleDelete(res)}
                      title="Delete resource"
                      className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl ${res.fileType === 'pdf' ? 'bg-rose-50 text-rose-600' : res.fileType === 'link' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                    {res.fileType === 'link' ? <LinkIcon size={24} /> : <FileDown size={24} />}
                  </div>
                  <div>
                    <h3 className="text-md font-black text-gray-900 uppercase tracking-tight line-clamp-2">{res.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2 text-[10px] text-gray-400 font-bold">
                      <span className="flex items-center gap-1 uppercase bg-gray-50 px-2 py-1 rounded">
                        <Clock size={12} /> {new Date(res.createdAt).toLocaleDateString()}
                      </span>
                      <span className="uppercase bg-gray-50 px-2 py-1 rounded">{formatFileSize(res.fileSize)}</span>
                      <span className="flex items-center gap-1 uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        <Download size={12} /> {res.downloadCount || 0} Downloads
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500 leading-relaxed line-clamp-3 font-medium">
                  {res.description || 'No description available for this resource.'}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex flex-col gap-2">
                {(() => {
                  let isDownloadDisabled = false;
                  let downloadText = res.fileType === 'link' ? 'Access Link' : 'Download File';
                  let publishDateLabel = '';

                  if (!isAdmin && (res.category || '').toLowerCase() === 'question papers' && res.publishDateTime) {
                    const pubDate = new Date(res.publishDateTime);
                    const timeDiff = pubDate.getTime() - currentTime.getTime();
                    
                    if (timeDiff > 0) {
                      isDownloadDisabled = true;
                      
                      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
                      
                      let countdown = '';
                      if (days > 0) countdown += `${days}d `;
                      if (hours > 0 || days > 0) countdown += `${hours}h `;
                      if (minutes > 0 || hours > 0 || days > 0) countdown += `${minutes}m `;
                      countdown += `${seconds}s`;

                      downloadText = `Opens in ${countdown}`;
                      publishDateLabel = `Scheduled for: ${pubDate.toLocaleString()}`;
                    }
                  }

                  return (
                    <>
                      <button 
                        onClick={(e) => {
                          if (isDownloadDisabled) {
                            e.preventDefault();
                            return;
                          }
                          handleDownload(res);
                        }}
                        disabled={isDownloadDisabled}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${
                          isDownloadDisabled 
                            ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-500 cursor-not-allowed shadow-none border border-rose-100 dark:border-rose-800' 
                            : 'bg-blue-600 dark:bg-[#1f6feb] text-white hover:bg-blue-700 dark:hover:bg-[#388bfd]'
                        }`}
                      >
                        {isDownloadDisabled ? <Clock size={16} className="animate-pulse" /> : (res.fileType === 'link' ? <LinkIcon size={16} /> : <Download size={16} />)}
                        {downloadText}
                      </button>
                      {publishDateLabel && (
                        <p className="text-center text-[10px] text-rose-500 font-bold uppercase mt-1">{publishDateLabel}</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} disableOutsideClick={true}>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Upload className="text-black" size={24} />
                <h2 className="text-lg font-black text-black uppercase tracking-tight">Upload New Resource</h2>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 hover:bg-slate-100 text-gray-400 hover:text-black rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-8 space-y-5 overflow-y-auto">
              <div className="flex bg-gray-100 p-1 rounded-xl mb-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setUploadType('file')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${uploadType === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-black'}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType('link')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${uploadType === 'link' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-black'}`}
                >
                  External Link
                </button>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 tracking-wider">Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Science Model Question Paper 2026"
                  value={uploadForm.title}
                  onChange={e => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="vz-select-bare w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 tracking-wider">Category</label>
                  <Dropdown
                    className="w-full"
                    value={uploadForm.category}
                    onChange={(v) => setUploadForm(prev => ({ ...prev, category: v }))}
                    options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 tracking-wider">Class</label>
                  <Dropdown
                    className="w-full"
                    value={uploadForm.className}
                    onChange={(v) => setUploadForm(prev => ({ ...prev, className: v }))}
                    placeholder="All Classes"
                    options={[
                      { value: '8', label: 'Class 8' },
                      { value: '9', label: 'Class 9' },
                      { value: '10', label: 'Class 10' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 tracking-wider">Medium</label>
                  <Dropdown
                    key={`upload-medium-${user?.id || 'default'}`}
                    className="w-full"
                    value={uploadForm.medium}
                    onChange={(v) => handleMediumChange(v)}
                    options={availableMediums.map(med => ({ value: med, label: med }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 tracking-wider">Subject</label>
                  <Dropdown
                    key={`upload-subject-${uploadForm.medium}`}
                    className="w-full"
                    value={uploadForm.subject}
                    onChange={(v) => setUploadForm(prev => ({ ...prev, subject: v }))}
                    placeholder="Select Subject"
                    options={getFilteredSubjectsForUpload(uploadForm.medium, user).map(sub => ({ value: sub.name, label: sub.name }))}
                  />
                </div>
              </div>

              {uploadForm.category === 'Question Papers' && (
                <div className="space-y-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={uploadForm.isScheduled}
                      onChange={e => setUploadForm(prev => ({ ...prev, isScheduled: e.target.checked, publishDateTime: e.target.checked ? prev.publishDateTime : '' }))}
                      className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Schedule Publish Date & Time</span>
                  </label>
                  
                  {uploadForm.isScheduled && (
                    <div className="pt-2">
                      <input 
                        type="datetime-local" 
                        value={uploadForm.publishDateTime}
                        onChange={e => setUploadForm(prev => ({ ...prev, publishDateTime: e.target.value }))}
                        className="vz-select-bare w-full"
                      />
                      <p className="text-[10px] text-gray-400 mt-1.5 font-medium">The download button will be disabled until this date and time.</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 tracking-wider">Description (Optional)</label>
                <textarea 
                  rows={3}
                  placeholder="Provide details about this resource..."
                  value={uploadForm.description}
                  onChange={e => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  className="vz-select-bare w-full"
                />
              </div>

              {uploadType === 'file' ? (
                <div className="relative">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 tracking-wider">Select File (PDF / Word)</label>
                  <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${uploadForm.file ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-indigo-400 bg-slate-50'}`}>
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      required={uploadType === 'file' && !uploadForm.file}
                    />
                    {uploadForm.file ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-600">
                        <CheckCircle2 size={24} />
                        <span className="text-xs font-black uppercase truncate max-w-[200px]">{uploadForm.file.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileDown className="mx-auto text-gray-400" size={32} />
                        <p className="text-[10px] font-black uppercase text-gray-500">Drag & drop or click to browse</p>
                        <p className="text-[9px] text-gray-400">PDF, DOC, DOCX up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 tracking-wider">URL / Link</label>
                  <input 
                    type="url" 
                    placeholder="https://example.com/document.pdf"
                    value={uploadForm.externalLink}
                    onChange={e => setUploadForm(prev => ({ ...prev, externalLink: e.target.value }))}
                    className="vz-select-bare w-full"
                    required={uploadType === 'link'}
                  />
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isBulkImporting || (uploadType === 'file' && !uploadForm.file) || (uploadType === 'link' && !uploadForm.externalLink)}
                  className="flex-[2] py-3 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isBulkImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      Uploading to Cloud...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Confirm & Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ResourceManagementPage;
