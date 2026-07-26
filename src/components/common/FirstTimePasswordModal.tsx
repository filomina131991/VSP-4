import React, { useState } from 'react';
import Modal from './Modal';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface FirstTimePasswordModalProps {
  isOpen: boolean;
}

const FirstTimePasswordModal: React.FC<FirstTimePasswordModalProps> = ({ isOpen }) => {
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If somehow not open or no user, render nothing
  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 2 || newPassword.length > 8) {
      toast.error('Password must be between 2 and 8 characters long');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      toast.success('Password updated successfully');
      
      // Update the user context to dismiss the modal globally
      updateUser({ ...user, passwordChanged: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} disableOutsideClick={true}>
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl overflow-hidden animate-scale-in p-6 relative">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">First Time Login</h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">For security reasons, please change your default password before continuing.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Current Password (PEN Number)</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all font-mono"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                minLength={2}
                maxLength={8}
                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all font-mono"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password (2-8 chars)"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Confirm New Password</label>
            <input 
              type={showPassword ? 'text' : 'password'}
              required
              minLength={2}
              maxLength={8}
              className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all font-mono"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Change Password & Continue'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default FirstTimePasswordModal;
