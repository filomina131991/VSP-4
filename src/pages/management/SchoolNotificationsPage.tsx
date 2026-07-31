import React, { useState, useEffect } from 'react';
import { Megaphone, AlertCircle, Info, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import PageLoader from '../../components/common/PageLoader';

interface Alert {
  id: string;
  title: string;
  content: string;
  target: 'ALL' | 'UNCONFIRMED';
  active: boolean;
  createdAt: string;
}

export const SchoolNotificationsPage = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const url = user?.role === 'SCHOOL' ? `/alerts/active?schoolId=${user?.id}` : `/alerts/active`;
        const res = await apiClient.get(url);
        setAlerts(res.data);
      } catch (err) {
        toast.error('Failed to load notifications');
      } finally {
        setIsLoading(false);
      }
    };
    if (user?.id) {
      loadAlerts();
    }
  }, [user]);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-6">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <Megaphone size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Important messages and alerts from the administrative office</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoading ? (
          <PageLoader label="Loading School Notifications..." />
        ) : alerts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <Info className="text-gray-400" size={32} />
            </div>
            <div>
              <p className="text-gray-900 font-bold text-lg">You're all caught up!</p>
              <p className="text-gray-500 text-sm mt-1">There are no active notifications at the moment.</p>
            </div>
          </div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`p-6 rounded-3xl border transition-all shadow-sm flex items-start gap-5 ${
                alert.target === 'UNCONFIRMED' 
                  ? 'bg-amber-50 border-amber-200 shadow-amber-100/50' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className={`p-3 rounded-2xl shrink-0 mt-1 ${
                alert.target === 'UNCONFIRMED' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {alert.target === 'UNCONFIRMED' ? <AlertCircle size={24} /> : <Info size={24} />}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h3 className={`font-black text-lg tracking-tight ${
                    alert.target === 'UNCONFIRMED' ? 'text-amber-900' : 'text-gray-900'
                  }`}>
                    {alert.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 bg-white/60 px-2.5 py-1 rounded-full uppercase tracking-wider w-fit">
                    <Clock size={12} />
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div 
                  className={`text-sm leading-relaxed html-content ${
                    alert.target === 'UNCONFIRMED' ? 'text-amber-800' : 'text-gray-600'
                  }`}
                  dangerouslySetInnerHTML={{ __html: alert.content }}
                />
                
                {alert.target === 'UNCONFIRMED' && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-100/50 p-3 rounded-xl border border-amber-200/50">
                    <AlertCircle size={16} className="shrink-0" />
                    This is an urgent alert regarding pending marks or confirmations. Please resolve this to clear the alert.
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
