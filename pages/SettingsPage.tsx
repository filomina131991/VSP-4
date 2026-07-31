import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/apiClient';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Bell, 
  Shield, 
  Eye, 
  Save,
  CheckCircle2,
  Lock,
  KeyRound,
  EyeOff
} from 'lucide-react';
import { cn } from '../lib/utils';
import Dropdown from '../components/common/Dropdown';
import toast from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    theme: 'light',
    notifications: true,
    compactView: false,
    showSummary: true,
    autoSave: true,
    academicYear: '2025-2026'
  });
  const [isSaving, setIsSaving] = useState(false);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    apiClient.get('/preferences')
      .then(res => {
        const localTheme = localStorage.getItem('dashboard_theme');
        const finalTheme = localTheme || res.data?.theme || 'light';
        
        if (res.data && Object.keys(res.data).length > 0) {
          setPreferences(prev => ({ 
            ...prev, 
            ...res.data,
            theme: finalTheme 
          }));
        } else {
          setPreferences(prev => ({ ...prev, theme: finalTheme }));
        }
        
        localStorage.setItem('dashboard_theme', finalTheme);
        document.documentElement.classList.toggle('dark', finalTheme === 'dark');
      })
      .catch(err => {
        console.error('Failed to load preferences', err);
        const localTheme = localStorage.getItem('dashboard_theme') || 'light';
        setPreferences(prev => ({ ...prev, theme: localTheme }));
        document.documentElement.classList.toggle('dark', localTheme === 'dark');
      });
  }, []);

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.post('/preferences', preferences);
      localStorage.setItem('dashboard_theme', preferences.theme);
      document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
      toast.success('Preferences saved successfully');
    } catch (err) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
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
      await apiClient.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-950 dark:text-white tracking-tighter uppercase flex items-center gap-3">
            <SettingsIcon size={32} className="text-gray-400" />
            Dashboard Preferences
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">Customize your analysis workspace and notification settings.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-6 py-3 md:py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:bg-[#1f6feb] dark:hover:bg-[#388bfd] transition-all flex items-center justify-center md:justify-start gap-2 shadow-xl shadow-blue-600/10 disabled:opacity-50 w-full md:w-auto"
        >
          {isSaving ? 'Saving...' : (
            <>
              <Save size={16} />
              Save Preferences
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        {/* Appearance Section */}
        <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Eye size={20} />
            </div>
            <h2 className="text-lg font-black text-gray-950 dark:text-white tracking-tight">General & Appearance</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex flex-col gap-2 border-b border-gray-100 dark:border-[#30363d] pb-6">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Current Academic Year</p>
                <p className="text-xs text-gray-400 font-medium tracking-tight mb-3">Set the default academic year across the application.</p>
              </div>
              <Dropdown
                className="w-full"
                value={preferences.academicYear || '2025-2026'}
                onChange={(v) => setPreferences(p => ({ ...p, academicYear: v }))}
                options={[
                  { value: '2023-2024', label: '2023-2024' },
                  { value: '2024-2025', label: '2024-2025' },
                  { value: '2025-2026', label: '2025-2026' },
                  { value: '2026-2027', label: '2026-2027' },
                  { value: '2027-2028', label: '2027-2028' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Compact View</p>
                <p className="text-xs text-gray-400 font-medium tracking-tight">Reduce vertical spacing in tables and lists.</p>
              </div>
              <button 
                onClick={() => handleToggle('compactView')}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  preferences.compactView ? "bg-blue-600 dark:bg-[#1f6feb]" : "bg-gray-200 dark:bg-[#30363d]"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                  preferences.compactView ? "right-1" : "left-1"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Show Summary Panel</p>
                <p className="text-xs text-gray-400 font-medium tracking-tight">Display total statistics at the top of result pages.</p>
              </div>
              <button 
                onClick={() => handleToggle('showSummary')}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  preferences.showSummary ? "bg-blue-600 dark:bg-[#1f6feb]" : "bg-gray-200 dark:bg-[#30363d]"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                  preferences.showSummary ? "right-1" : "left-1"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Theme Mode</p>
                <p className="text-xs text-gray-400 font-medium tracking-tight">Switch between light and dark visual styles.</p>
              </div>
              <div className="flex bg-gray-100 dark:bg-[#1f242c] p-1 rounded-lg">
                <button 
                  onClick={() => {
                    setPreferences(p => ({ ...p, theme: 'light' }));
                    document.documentElement.classList.toggle('dark', false);
                    localStorage.setItem('dashboard_theme', 'light');
                  }}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    preferences.theme === 'light' ? "bg-white text-gray-950 shadow-sm" : "text-gray-400 dark:text-gray-300"
                  )}
                >
                  <Sun size={16} />
                </button>
                <button 
                   onClick={() => {
                     setPreferences(p => ({ ...p, theme: 'dark' }));
                     document.documentElement.classList.toggle('dark', true);
                     localStorage.setItem('dashboard_theme', 'dark');
                   }}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    preferences.theme === 'dark' ? "bg-[#1f6feb] text-white shadow-sm" : "text-gray-400 dark:text-gray-300"
                  )}
                >
                  <Moon size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* System & Notifications Section */}
        <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Bell size={20} />
            </div>
            <h2 className="text-lg font-black text-gray-950 dark:text-white tracking-tight">Notifications</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Email Notifications</p>
                <p className="text-xs text-gray-400 font-medium tracking-tight">Receive alerts for important data updates.</p>
              </div>
              <button 
                 onClick={() => handleToggle('notifications')}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  preferences.notifications ? "bg-blue-600 dark:bg-[#1f6feb]" : "bg-gray-200 dark:bg-[#30363d]"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                  preferences.notifications ? "right-1" : "left-1"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Auto-Save Drafts</p>
                <p className="text-xs text-gray-400 font-medium tracking-tight">Automatically save index entries during mark entry.</p>
              </div>
              <button 
                onClick={() => handleToggle('autoSave')}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  preferences.autoSave ? "bg-blue-600 dark:bg-[#1f6feb]" : "bg-gray-200 dark:bg-[#30363d]"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                  preferences.autoSave ? "right-1" : "left-1"
                )} />
              </button>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#1f242c] rounded-xl border border-gray-100 dark:border-[#30363d] mt-4 flex items-start gap-3">
              <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                Your settings are synced to the local JSON database for cross-device consistency.
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        {user?.role !== 'SCHOOL' && (
          <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] p-8 shadow-sm md:col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-red-50 rounded-lg text-red-600">
                <Shield size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-950 dark:text-white tracking-tight">Security & Credentials</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="max-w-xl space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                        className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-12 pr-12 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 dark:hover:text-white transition-colors"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                      <div className="relative">
                        <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                          placeholder="New password"
                          className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-12 pr-12 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 dark:hover:text-white transition-colors"
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
                          onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                          placeholder="Confirm password"
                          className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-12 pr-12 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 dark:hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isChangingPassword}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:bg-[#1f6feb] dark:hover:bg-[#388bfd] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
