import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import { Building2, Save, KeyRound, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2, Check } from 'lucide-react';

const SchoolProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { mediums } = useData();
  const navigate = useNavigate();
  const availableMediums = mediums.filter(m => m.active !== false).map(m => m.shortName);

  // Resolve any stored medium value (slug/id/code/name) → canonical shortName
  const normalizeMediums = (raw: string[]): string[] => {
    if (!raw || raw.length === 0) return [];
    return raw.map(val => {
      if (!val) return null;
      const v = val.trim();
      // Match by shortName (already correct)
      const byShort = mediums.find(m => m.shortName && m.shortName.toLowerCase() === v.toLowerCase());
      if (byShort) return byShort.shortName;
      // Match by id/slug e.g. "medium-tamil"
      const byId = mediums.find(m => (m as any).id && (m as any).id.toLowerCase() === v.toLowerCase());
      if (byId) return byId.shortName;
      // Match by code e.g. "TM"
      const byCode = mediums.find(m => m.code && m.code.toUpperCase() === v.toUpperCase());
      if (byCode) return byCode.shortName;
      // Match by full name e.g. "Tamil Medium"
      const byName = mediums.find(m => m.name && m.name.toLowerCase() === v.toLowerCase());
      if (byName) return byName.shortName;
      return null;
    }).filter(Boolean) as string[];
  };

  const [profileData, setProfileData] = useState({
    hmName: user?.hmName || '',
    hmMobile: user?.hmMobile || '',
    udiseCode: user?.udiseCode || '',
    coordinatorName: user?.coordinatorName || '',
    coordinatorMobile: user?.coordinatorMobile || '',
    coordinatorEmail: user?.coordinatorEmail || '',
    schoolEmail: user?.schoolEmail || '',
    schoolTelephone: user?.schoolTelephone || '',
    mediums: normalizeMediums((user?.mediums || []) as string[])
  });

  // Sync profile data when user object updates
  useEffect(() => {
    if (user) {
      setProfileData({
        hmName: user.hmName || '',
        hmMobile: user.hmMobile || '',
        udiseCode: user.udiseCode || '',
        coordinatorName: user.coordinatorName || '',
        coordinatorMobile: user.coordinatorMobile || '',
        coordinatorEmail: user.coordinatorEmail || '',
        schoolEmail: user.schoolEmail || '',
        schoolTelephone: user.schoolTelephone || '',
        mediums: normalizeMediums(user.mediums || [])
      });
    }
  }, [user, mediums]);
  
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

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await apiClient.put('/auth/profile', profileData);
      const updatedUser = res.data.user;
      updateUser(updatedUser);
      toast.success('Institution profile saved successfully!');

      if (updatedUser?.profileCompleted && updatedUser?.passwordChanged) {
        toast.success('Setup completed! Redirecting to Dashboard...');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
      }
    } catch (err) {
      toast.error('Failed to update profile');
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

      const isComp = updatedUser ? updatedUser.profileCompleted : user?.profileCompleted;
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

  const isComplete = user?.profileCompleted && user?.passwordChanged;

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-4 sm:px-6 md:px-0">
      <div className="pt-2 pb-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-950 dark:text-white tracking-tight uppercase flex items-center gap-2.5 single-line-label w-full">
          <Building2 size={28} className="text-blue-600 dark:text-[#1f6feb] shrink-0" />
          School Profile
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1.5 single-row-desc">
          {!isComplete 
            ? "Welcome! Complete your institutional details and update your password to unlock full access to the dashboard."
            : "Manage your school's information, contact details, and account security."}
        </p>
      </div>

      {!isComplete && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start gap-3.5 sm:gap-4 shadow-sm w-full">
          <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1 w-full">
            <h3 className="text-sm font-black uppercase text-amber-900 dark:text-amber-200 tracking-wider">Initial Setup Required</h3>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
              To unlock full access to Student Management, Marks Entry, and Reports, please complete both steps below:
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1 text-xs font-black uppercase tracking-wider w-full">
              <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border w-full sm:w-auto justify-between sm:justify-start ${user?.profileCompleted ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300'}`}>
                <div className="flex items-center gap-2">
                  {user?.profileCompleted ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                  <span>1. Institution Details</span>
                </div>
                <span className="text-[10px] opacity-80">{user?.profileCompleted ? '✓ Done' : 'Pending'}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Info Section */}
        <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-black text-gray-950 dark:text-white tracking-tight mb-6">Institution Details</h2>
          
          <div className="bg-gray-50 dark:bg-[#0d1117] p-4 rounded-xl border border-gray-100 dark:border-[#30363d] mb-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase">School Code</span>
              <span className="text-sm font-black text-gray-900 dark:text-white">{user?.schoolCode || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase">School Name</span>
              <span className="text-sm font-black text-gray-900 dark:text-white">{user?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase">School Type</span>
              <span className="text-sm font-black text-gray-900 dark:text-white">{user?.schoolType || 'N/A'}</span>
            </div>
          </div>

          {/* Mediums Selection */}
          <div className="space-y-3 mb-6">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">School Mediums</label>
            <p className="text-[10px] text-gray-400 font-bold -mt-1 ml-1">Select the mediums available in this school. These will be used across Exam Configuration, Student Management, and Teacher Management.</p>
            <div className="flex flex-wrap gap-2">
              {availableMediums.map(medium => {
                const isSelected = profileData.mediums.includes(medium);
                return (
                  <button
                    key={medium}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? profileData.mediums.filter(m => m !== medium)
                        : [...profileData.mediums, medium];
                      setProfileData(p => ({ ...p, mediums: updated }));
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#0d1117] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 dark:bg-[#0d1117] dark:border-gray-600'
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    {medium}
                  </button>
                );
              })}
              {availableMediums.length === 0 && (
                <div className="px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-[#30363d] text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  No active mediums available. Add mediums in master data first.
                </div>
              )}
            </div>
            {profileData.mediums.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profileData.mediums.map(m => (
                  <span key={m} className="text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                    {m} Medium
                  </span>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">HM Name</label>
                <input 
                  type="text" required
                  value={profileData.hmName}
                  onChange={e => setProfileData(p => ({...p, hmName: e.target.value}))}
                  className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">HM Mobile</label>
                <input 
                  type="text" required
                  value={profileData.hmMobile}
                  onChange={e => setProfileData(p => ({...p, hmMobile: e.target.value}))}
                  className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">School Email</label>
              <input 
                type="email" required
                value={profileData.schoolEmail}
                onChange={e => setProfileData(p => ({...p, schoolEmail: e.target.value}))}
                className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vijayasree Coordinator Name</label>
              <input 
                type="text" required
                value={profileData.coordinatorName}
                onChange={e => setProfileData(p => ({...p, coordinatorName: e.target.value}))}
                className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Coordinator Mobile</label>
                <input 
                  type="text" required
                  value={profileData.coordinatorMobile}
                  onChange={e => setProfileData(p => ({...p, coordinatorMobile: e.target.value}))}
                  className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Coordinator Email</label>
                <input 
                  type="email" required
                  value={profileData.coordinatorEmail}
                  onChange={e => setProfileData(p => ({...p, coordinatorEmail: e.target.value}))}
                  className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSavingProfile}
              className="mt-4 w-full bg-blue-600 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:bg-[#1f6feb] dark:hover:bg-[#388bfd] transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/10 disabled:opacity-50"
            >
              {isSavingProfile ? 'Saving...' : (
                <><Save size={16} /> {user?.profileCompleted ? 'Update Profile' : 'Complete Profile'}</>
              )}
            </button>
          </form>
        </div>

        {/* Change Password & Region Section */}
        <div className="space-y-6">
          {/* Region Details */}
          <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-black text-gray-950 dark:text-white tracking-tight mb-6">Region Details</h2>
            <div className="bg-blue-50/50 dark:bg-[#0d1117] p-4 rounded-xl border border-blue-100 dark:border-[#30363d] space-y-3">
              <div className="flex justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">District</span>
                <span className="text-sm font-black text-gray-900 dark:text-white">{regionNames.mainDistrict}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Revenue District</span>
                <span className="text-sm font-black text-gray-900 dark:text-white">{regionNames.revenueDistrict}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">AEO</span>
                <span className="text-sm font-black text-gray-900 dark:text-white">{regionNames.eduDistrict}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] p-6 md:p-8 shadow-sm h-fit">
            <h2 className="text-lg font-black text-gray-950 dark:text-white tracking-tight mb-6">Security & Credentials</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData(p => ({...p, currentPassword: e.target.value}))}
                  placeholder="Enter current password"
                  className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-12 pr-12 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <button 
                  type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 dark:hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData(p => ({...p, newPassword: e.target.value}))}
                  placeholder="New password"
                  className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-12 pr-12 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <button 
                  type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 dark:hover:text-white"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={e => setPasswordData(p => ({...p, confirmPassword: e.target.value}))}
                  placeholder="Confirm password"
                  className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-12 pr-12 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <button 
                  type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 dark:hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isChangingPassword}
              className="mt-4 w-full bg-blue-600 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:bg-[#1f6feb] dark:hover:bg-[#388bfd] transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/10 disabled:opacity-50"
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

export default SchoolProfilePage;
