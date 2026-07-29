import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData, useSchoolMediums, useSchoolSubjects } from '../../context/DataContext';
import { apiClient } from '../../lib/apiClient';
import { resolveMediumId } from '../../lib/mediumUtils';
import toast from 'react-hot-toast';
import { Building2, Save, KeyRound, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2, Plus, Trash2, User as UserIcon, Phone, Mail, Award, BookOpen, Layers } from 'lucide-react';

const DESIGNATIONS = [
  'HST English',
  'HST Hindi',
  'HST Malayalam',
  'HST Tamil',
  'HST Physical Science',
  'HST Natural Science',
  'HST Mathematics',
  'HST Social Science',
  'HST Arabic',
  'HST Urdu',
  'HST Sanskrit'
];

const isSubjectEligibleForDesignation = (designation: string, subjectName: string) => {
  if (!designation || !subjectName) return true;
  const des = designation.toLowerCase().trim();
  const sub = subjectName.toLowerCase().trim();

  if (des.includes('english')) {
    return sub.includes('english') || sub === 'p01' || sub === 'p02';
  }
  if (des.includes('hindi')) {
    return sub.includes('hindi') || sub.includes('second language') || sub.includes('third language') || sub === 'p03' || sub === 'p04';
  }
  if (des.includes('malayalam') || des.includes('tamil') || des.includes('arabic') || des.includes('urdu') || des.includes('sanskrit') || des.includes('kannada') || des.includes('telugu') || des.includes('marathi') || des.includes('gujarati')) {
    return sub.includes('first language') || sub.includes('second language') || sub.includes('third language') || 
           sub.includes(des.replace('hst ', '').trim()) || sub === 'p01' || sub === 'p02' || sub === 'p03' || sub === 'p04';
  }
  if (des.includes('physical science')) {
    return sub.includes('physics') || sub.includes('chemistry') || sub.includes('physical science') || sub === 'p06' || sub === 'p07';
  }
  if (des.includes('natural science')) {
    return sub.includes('biology') || sub.includes('botany') || sub.includes('zoology') || sub.includes('natural science') || sub === 'p08';
  }
  if (des.includes('mathematics') || des.includes('maths')) {
    return sub.includes('math') || sub.includes('ganitham') || sub === 'p05';
  }
  if (des.includes('social science') || des.includes('social')) {
    return sub.includes('social') || sub.includes('history') || sub.includes('geography') || sub.includes('civics') || sub.includes('economics') || sub === 'p09';
  }

  return true;
};

const TeacherProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { subjects: dmSubjects, mediums: dmMediums } = useData();
  const schoolMediums = useSchoolMediums();
  const schoolSubjects = useSchoolSubjects();
  
  const [profileData, setProfileData] = useState({
    name: user?.name || user?.displayName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    qualification: (user as any)?.qualification || '',
    designation: (user as any)?.designation || 'HST Mathematics',
    penNumber: user?.username || (user as any)?.penNumber || ''
  });

  const [teacherAssignments, setTeacherAssignments] = useState<Array<{ medium: string; className: string; subject: string }>>(() => {
    const assignments = (user as any)?.teacherAssignments;
    if (Array.isArray(assignments) && assignments.length > 0) {
      return assignments;
    }
    return [];
  });

  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [classDivisionsData, setClassDivisionsData] = useState<any[]>([]);

  const activeMediums = useMemo(() => {
    return (schoolMediums && schoolMediums.length > 0) ? schoolMediums : dmMediums.filter(m => m.active);
  }, [schoolMediums, dmMediums]);

  // Sync profile data when user object updates
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || user.displayName || '',
        email: user.email || '',
        phone: user.phone || '',
        qualification: (user as any).qualification || '',
        designation: (user as any).designation || 'HST Mathematics',
        penNumber: user.username || (user as any).penNumber || ''
      });
      if ((user as any)?.teacherAssignments && Array.isArray((user as any).teacherAssignments)) {
        setTeacherAssignments((user as any).teacherAssignments);
      }
    }
  }, [user]);

  const [classHierarchy, setClassHierarchy] = useState<any>({});

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const [cdRes, hRes] = await Promise.all([
          apiClient.get('/school/classes-divisions'),
          apiClient.get('/school/class-hierarchy')
        ]);
        
        if (hRes?.data) {
          setClassHierarchy(hRes.data);
        }

        if (Array.isArray(cdRes.data) && cdRes.data.length > 0) {
          setClassDivisionsData(cdRes.data);
          const formatted = cdRes.data.map((item: any) => `${item.className}${item.division || ''}`);
          setAvailableClasses(formatted);
        } else {
          setAvailableClasses(['8A', '8B', '9A', '9B', '10A', '10B', '10C', '10D', '10E']);
        }
      } catch (err) {
        console.error('Failed to load school classes:', err);
        setAvailableClasses(['8A', '8B', '9A', '9B', '10A', '10B', '10C', '10D', '10E']);
      }
    };
    if (user) {
      fetchClasses();
    }
  }, [user]);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [regionNames, setRegionNames] = useState({
    mainDistrict: 'Loading...',
    revenueDistrict: 'Loading...',
    eduDistrict: 'Loading...'
  });

  useEffect(() => {
    const fetchRegionNames = async () => {
      try {
        const [mainRes, distRes, eduRes] = await Promise.all([
          apiClient.get('/management/main-districts'),
          apiClient.get('/management/districts'),
          apiClient.get('/management/educational-districts')
        ]);
        
        const eduObj = eduRes.data.find((d: any) => d.id === user?.subDistrictId || d.id === user?.eduId);
        const distObj = distRes.data.find((d: any) => d.id === eduObj?.districtId || d.id === user?.districtId);
        const mainObj = mainRes.data.find((d: any) => d.id === distObj?.mainDistrictId || d.id === user?.mainDistrictId);

        const main = mainObj?.name || 'N/A';
        const dist = distObj?.name || 'N/A';
        const edu = eduObj?.name || 'N/A';

        setRegionNames({
          mainDistrict: main,
          revenueDistrict: dist,
          eduDistrict: edu
        });
      } catch (err) {
        console.error('Failed to fetch region names', err);
        setRegionNames({
          mainDistrict: 'N/A',
          revenueDistrict: 'N/A',
          eduDistrict: 'N/A'
        });
      }
    };
    if (user) {
      fetchRegionNames();
    }
  }, [user]);

  const handleAddAssignment = () => {
    setTeacherAssignments(prev => [...prev, { medium: '', className: '', subject: '' }]);
  };

  const handleAssignmentChange = (index: number, field: 'medium' | 'className' | 'subject', value: string) => {
    setTeacherAssignments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'className') {
        const cData = classDivisionsData.find(cd => `${cd.className}${cd.division || ''}` === value);
        if (cData && cData.mediums && cData.mediums.length === 1) {
          const mId = resolveMediumId(cData.mediums[0], dmMediums);
          const matchedMed = dmMediums.find(m => m.id === mId || (m as any)._id === mId);
          if (matchedMed) {
            updated[index].medium = matchedMed.name;
          } else {
            updated[index].medium = '';
          }
        } else {
          updated[index].medium = '';
        }
        updated[index].subject = '';
      } else if (field === 'medium') {
        updated[index].subject = '';
      }

      return updated;
    });
  };

  const handleRemoveAssignment = (index: number) => {
    setTeacherAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name.trim()) {
      toast.error('Teacher Name is required');
      return;
    }
    if (!profileData.phone.trim() || !profileData.email.trim()) {
      toast.error('Mobile Number and Email Address are required');
      return;
    }

    setIsSavingProfile(true);
    try {
      const mediumsList = Array.from(new Set(teacherAssignments.map(a => a.medium).filter(Boolean)));
      const assignedSubjectsList = Array.from(new Set(teacherAssignments.map(a => a.className).filter(Boolean)));
      const teachingSubjectsList = Array.from(new Set(teacherAssignments.map(a => a.subject).filter(Boolean)));

      const payload = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        qualification: profileData.qualification,
        designation: profileData.designation,
        teacherAssignments: teacherAssignments,
        assignedSubjects: assignedSubjectsList,
        teachingSubjects: teachingSubjectsList,
        mediums: mediumsList.length > 0 ? mediumsList : undefined
      };

      const res = await apiClient.put('/auth/profile', payload);
      const updatedUser = res.data.user;
      updateUser(updatedUser);
      toast.success('Teacher profile & class assignments saved successfully!');

      if (updatedUser?.profileCompleted && updatedUser?.passwordChanged && updatedUser?.phone && updatedUser?.email) {
        toast.success('Setup completed! Redirecting to Dashboard...');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
      }
    } catch (err) {
      toast.error('Failed to update teacher profile & assignments');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 2) {
      toast.error('Password must be at least 2 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiClient.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      const updatedUser = res.data.user;
      if (updatedUser) {
        updateUser(updatedUser);
      } else {
        updateUser({ ...user!, passwordChanged: true });
      }
      toast.success('Security password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

      const isComp = updatedUser ? (updatedUser.profileCompleted && updatedUser.phone && updatedUser.email) : (user?.profileCompleted && user?.phone && user?.email);
      if (isComp) {
        toast.success('Setup completed! Redirecting to Dashboard...');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isComplete = user?.profileCompleted && user?.passwordChanged && user?.phone && user?.email;

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-4 sm:px-6 md:px-0">
      <div className="pt-2 pb-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-950 dark:text-white tracking-tight uppercase flex items-center gap-2.5 single-line-label w-full">
          <Building2 size={28} className="text-indigo-600 dark:text-[#1f6feb] shrink-0" />
          Teacher Profile & Class Management
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1.5 single-row-desc">
          {!isComplete 
            ? "Welcome! Complete your contact details (Mobile & Email), verify assigned classes, and update your password to unlock dashboard access."
            : "Manage your personal credentials, contact information, and teaching class assignments."}
        </p>
      </div>

      {!isComplete && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start gap-3.5 sm:gap-4 shadow-sm w-full">
          <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1 w-full">
            <h3 className="text-sm font-black uppercase text-amber-900 dark:text-amber-200 tracking-wider">Initial Setup & Contact Verification Required</h3>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
              To unlock full access to Marks Entry, Student Records, and Reports, please ensure both steps below are completed:
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1 text-xs font-black uppercase tracking-wider w-full">
              <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border w-full sm:w-auto justify-between sm:justify-start ${(user?.profileCompleted && user?.phone && user?.email) ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300'}`}>
                <div className="flex items-center gap-2">
                  {(user?.profileCompleted && user?.phone && user?.email) ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                  <span>1. Personal & Contact Details (Mobile & Email)</span>
                </div>
                <span className="text-[10px] opacity-80">{(user?.profileCompleted && user?.phone && user?.email) ? '✓ Done' : 'Pending'}</span>
              </div>
              <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border w-full sm:w-auto justify-between sm:justify-start ${user?.passwordChanged ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300'}`}>
                <div className="flex items-center gap-2">
                  {user?.passwordChanged ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                  <span>2. Password Update</span>
                </div>
                <span className="text-[10px] opacity-80">{user?.passwordChanged ? '✓ Done' : 'Pending'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Form Area (Profile & Class Assignments) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-black text-gray-950 dark:text-white tracking-tight mb-6 flex items-center gap-2">
              <UserIcon size={20} className="text-indigo-600" />
              <span>Personal Details</span>
            </h2>

            <form onSubmit={handleProfileSave} className="space-y-5">
              
              {/* PEN Number (Disabled) & Name (Editable) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <span>PEN Number (Username)</span>
                    <span className="text-[9px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded font-bold">Disabled</span>
                  </label>
                  <input 
                    type="text"
                    disabled
                    value={profileData.penNumber}
                    className="w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-[#30363d] rounded-xl py-3 px-4 text-sm font-bold text-gray-500 cursor-not-allowed select-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                    <span>Teacher Name <span className="text-red-500">*</span></span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">Editable</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={profileData.name}
                    onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Enter full name"
                    className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Designation (Editable) & Qualification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                    <span>Designation <span className="text-red-500">*</span></span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">Editable</span>
                  </label>
                  <select 
                    value={profileData.designation}
                    onChange={e => setProfileData(p => ({ ...p, designation: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    {DESIGNATIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    {!DESIGNATIONS.includes(profileData.designation) && profileData.designation && (
                      <option value={profileData.designation}>{profileData.designation}</option>
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qualification</label>
                  <input 
                    type="text"
                    value={profileData.qualification}
                    onChange={e => setProfileData(p => ({ ...p, qualification: e.target.value }))}
                    placeholder="e.g., M.Sc, B.Ed"
                    className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Contact Information: Mobile & Email */}
              <div className="pt-2">
                <div className="bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                    <Award size={16} className="text-indigo-600" />
                    <span>Essential Contact Details (Required for Access)</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1 ml-1">
                        <Phone size={12} className="text-indigo-500" />
                        <span>Mobile Number <span className="text-red-500">*</span></span>
                      </label>
                      <input 
                        type="tel"
                        required
                        value={profileData.phone}
                        onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 px-3.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1 ml-1">
                        <Mail size={12} className="text-indigo-500" />
                        <span>Email Address <span className="text-red-500">*</span></span>
                      </label>
                      <input 
                        type="email"
                        required
                        value={profileData.email}
                        onChange={e => setProfileData(p => ({ ...p, email: e.target.value }))}
                        placeholder="Enter official/personal email"
                        className="w-full bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 px-3.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Assign My Class Section */}
              <div className="pt-4 border-t border-gray-100 dark:border-[#30363d]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase text-gray-900 dark:text-white tracking-wider flex items-center gap-2">
                      <BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <span>Assign My Class & Subjects</span>
                    </h3>
                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                      Select your assigned classes, medium, and teaching subjects. Saving will automatically update your school teacher record.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAssignment}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20"
                  >
                    <Plus size={15} />
                    <span>Add New</span>
                  </button>
                </div>

                {teacherAssignments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-[#0d1117] rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                    <Layers size={28} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs font-bold text-gray-400 uppercase">No classes or subjects assigned yet</p>
                    <button
                      type="button"
                      onClick={handleAddAssignment}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <Plus size={14} /> Click to assign your first class
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teacherAssignments.map((assignment, idx) => {
                      // Filter subjects based on school subjects and medium
                      const availableSubjectsForMedium = dmSubjects.filter(s => s.active !== false);
                      
                      const matchedMediumObj = activeMediums.find(m => m.shortName.toLowerCase() === assignment.medium?.toLowerCase() || m.name.toLowerCase() === assignment.medium?.toLowerCase());
                      const finalMediumSubjects = matchedMediumObj
                        ? availableSubjectsForMedium.filter(s => {
                            const matchId = matchedMediumObj.id || (matchedMediumObj as any)._id;
                            const sMedId = resolveMediumId(s.mediumId || s.medium || (s as any).mediumName || '', dmMediums);
                            
                            const isSmartSuggestion = isSubjectEligibleForDesignation(profileData.designation, s.name);
                            const desLower = (profileData.designation || '').toLowerCase();
                            const isLangDes = desLower.includes('english') || desLower.includes('hindi') || desLower.includes('malayalam') || desLower.includes('tamil') || desLower.includes('arabic') || desLower.includes('urdu') || desLower.includes('sanskrit');

                            let extractedMedName = '';
                            const upperSubName = (s.name || '').toUpperCase();
                            if (upperSubName.includes('(EM)')) extractedMedName = 'English';
                            else if (upperSubName.includes('(TM)')) extractedMedName = 'Tamil';
                            else if (upperSubName.includes('(MM)')) extractedMedName = 'Malayalam';
                            else if (upperSubName.includes('(KM)')) extractedMedName = 'Kannada';
                            else if (upperSubName.includes('(HM)')) extractedMedName = 'Hindi';

                            const effectiveSMedId = extractedMedName ? resolveMediumId(extractedMedName, dmMediums) : sMedId;

                            const isCoreSubject = (s as any).isCore || (s.code || '').startsWith('P');
                            const isLanguageSubject = ['TAMIL', 'ENGLISH', 'MALAYALAM', 'ARABIC', 'URDU', 'SANSKRIT', 'HINDI'].some(lang => (s.name || '').toUpperCase().includes(lang));
                            
                            const meetsDesignationCriteria = desLower.includes('language') || desLower.includes('pet')
                              ? isSmartSuggestion 
                              : (isSmartSuggestion || isLanguageSubject || isCoreSubject);

                            if (effectiveSMedId && matchId && effectiveSMedId !== matchId) {
                              if (extractedMedName) return false;
                              if (!isSmartSuggestion || !isLangDes) return false;
                            }
                            return meetsDesignationCriteria;
                          })
                        : availableSubjectsForMedium;
                      const uniqueSubjects: any[] = [];
                      const seen = new Set();
                      for (const s of finalMediumSubjects) {
                        if (s.name && !seen.has(s.name)) {
                          seen.add(s.name);
                          uniqueSubjects.push(s);
                        }
                      }
                      
                      uniqueSubjects.sort((a, b) => {
                        const codeA = a.code || a.paperType || '';
                        const codeB = b.code || b.paperType || '';
                        if (codeA && codeB && codeA !== codeB) {
                          return codeA.localeCompare(codeB);
                        }
                        return (a.name || '').localeCompare(b.name || '');
                      });

                      const allSubNames = uniqueSubjects.map(s => s.name);

                      const eligible = uniqueSubjects.filter(sub => isSubjectEligibleForDesignation(profileData.designation, sub.name)).map(s => s.name);
                      const others = uniqueSubjects.filter(sub => !isSubjectEligibleForDesignation(profileData.designation, sub.name)).map(s => s.name);

                      let isSubjectIneligible = false;
                      if (assignment.subject) {
                        isSubjectIneligible = !isSubjectEligibleForDesignation(profileData.designation, assignment.subject);
                      }

                      return (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-[#0d1117] rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-stretch md:items-center gap-3 relative">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                            {/* Class & Division Select (First) */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Class & Div</label>
                              <select
                                value={assignment.className || ''}
                                onChange={e => handleAssignmentChange(idx, 'className', e.target.value)}
                                className="w-full bg-white dark:bg-[#161b22] border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-2.5 text-xs font-bold text-gray-900 dark:text-white"
                              >
                                <option value="" disabled>Select Class</option>
                                {(() => {
                                  const assignMedName = dmMediums.find(m => m.id === assignment.medium)?.name || '';
                                  const filteredClassesForDropdown = availableClasses.filter(c => {
                                    if (!assignMedName) return true;
                                    const cData = classDivisionsData.find(cd => `${cd.className}${cd.division || ''}` === c);
                                    if (!cData || !cData.mediums || cData.mediums.length === 0) return true;
                                    return cData.mediums.includes(assignMedName);
                                  });
                                  return filteredClassesForDropdown.map(cls => (
                                    <option key={cls} value={cls}>Class {cls}</option>
                                  ));
                                })()}
                                {!availableClasses.includes(assignment.className) && assignment.className && (
                                  <option value={assignment.className}>Class {assignment.className}</option>
                                )}
                              </select>
                            </div>

                            {/* Medium Select (Second) */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Medium</label>
                              {(() => {
                                const selectedClassDiv = classDivisionsData.find(c => `${c.className}${c.division || ''}` === assignment.className);
                                const availableMediumsForClass = activeMediums.filter(m => {
                                  if (!selectedClassDiv || !selectedClassDiv.mediums || selectedClassDiv.mediums.length === 0) return true;
                                  const mId = m.id || (m as any)._id;
                                  return selectedClassDiv.mediums.some((cm: string) => {
                                    const cmId = resolveMediumId(cm, dmMediums);
                                    return (cmId && mId && cmId === mId) || cm.toLowerCase().includes((m.name || '').toLowerCase()) || (m.name || '').toLowerCase().includes(cm.toLowerCase());
                                  });
                                });
                                
                                return (
                                  <select
                                    value={assignment.medium || ''}
                                    onChange={e => handleAssignmentChange(idx, 'medium', e.target.value)}
                                    disabled={!assignment.className}
                                    className="w-full bg-white dark:bg-[#161b22] border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-2.5 text-xs font-bold text-gray-900 dark:text-white disabled:opacity-50"
                                  >
                                    <option value="" disabled>Select Medium</option>
                                    {availableMediumsForClass.map(m => (
                                      <option key={m.id || (m as any)._id || m.name} value={m.name}>{m.name}</option>
                                    ))}
                                    {!availableMediumsForClass.some(m => m.name === assignment.medium) && assignment.medium && (
                                      <option value={assignment.medium}>{assignment.medium}</option>
                                    )}
                                  </select>
                                );
                              })()}
                            </div>

                            {/* Subject Select with Eligible Suggestions (Third) */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Subject</label>
                              <select
                                value={assignment.subject || ''}
                                onChange={e => handleAssignmentChange(idx, 'subject', e.target.value)}
                                disabled={!assignment.medium}
                                className={`w-full bg-white dark:bg-[#161b22] border rounded-lg py-2 px-2.5 text-xs font-bold dark:text-white disabled:opacity-50 ${
                                  isSubjectIneligible 
                                    ? 'border-red-500 text-red-700 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                                    : 'border-gray-300 dark:border-gray-700 text-gray-900'
                                }`}
                              >
                                <option value="" disabled>Select Subject</option>
                                <optgroup label="Eligible Subject Suggestions">
                                  {eligible.length > 0 ? (
                                    eligible.map(s => (
                                      <option key={s} value={s} className="font-bold text-indigo-700 dark:text-indigo-400">★ {s}</option>
                                    ))
                                  ) : (
                                    <option disabled>{others.length > 0 ? 'None matching this designation' : 'No subjects available for this medium'}</option>
                                  )}
                                </optgroup>
                                {others.length > 0 && (
                                  <optgroup label="Other Subjects">
                                    {others.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {!allSubNames.includes(assignment.subject) && assignment.subject && (
                                  <option value={assignment.subject}>{assignment.subject}</option>
                                )}
                              </select>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignment(idx)}
                            className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 rounded-lg transition-colors flex items-center justify-center self-end md:self-center mt-1 md:mt-0"
                            title="Remove assignment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={isSavingProfile}
                className="mt-6 w-full bg-indigo-600 text-white px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 dark:bg-[#1f6feb] dark:hover:bg-[#388bfd] transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving Changes...' : (
                  <><Save size={18} /> Save Teacher Profile & Assignments</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Security & Credentials & Region Info */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Region Details */}
          <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] p-6 shadow-sm">
            <h2 className="text-base font-black text-gray-950 dark:text-white tracking-tight mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-indigo-600" />
              <span>Region Details</span>
            </h2>
            <div className="bg-slate-50 dark:bg-[#0d1117] p-4 rounded-xl border border-gray-200/80 dark:border-[#30363d] space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-500 uppercase">District</span>
                <span className="font-black text-gray-900 dark:text-white">{regionNames.mainDistrict}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200/60 dark:border-gray-800 pt-2">
                <span className="font-bold text-gray-500 uppercase">Revenue District</span>
                <span className="font-black text-gray-900 dark:text-white">{regionNames.revenueDistrict}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200/60 dark:border-gray-800 pt-2">
                <span className="font-bold text-gray-500 uppercase">AEO / Sub District</span>
                <span className="font-black text-gray-900 dark:text-white">{regionNames.eduDistrict}</span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] p-6 md:p-8 shadow-sm h-fit">
            <h2 className="text-base font-black text-gray-950 dark:text-white tracking-tight mb-4 flex items-center gap-2">
              <KeyRound size={18} className="text-indigo-600" />
              <span>Security & Password</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-4">
              Keep your teacher account secure by periodically updating your password.
            </p>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={e => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-11 pr-11 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                  <button 
                    type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 dark:hover:text-white p-1"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="New password"
                    className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-11 pr-11 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                  <button 
                    type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 dark:hover:text-white p-1"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Confirm password"
                    className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-11 pr-11 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                  <button 
                    type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 dark:hover:text-white p-1"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isChangingPassword}
                className="mt-4 w-full bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfilePage;
