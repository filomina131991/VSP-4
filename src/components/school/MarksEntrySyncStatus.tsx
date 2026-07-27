import React, { useState, useEffect } from 'react';
import { Cloud, CloudCheck, CloudOff, RefreshCw, AlertCircle, CheckCircle2, Save, WifiOff } from 'lucide-react';
import { SyncStatusState } from '../../lib/draftStore';

interface MarksEntrySyncStatusProps {
  status: SyncStatusState;
  lastSavedTime?: number | null;
  className?: string;
}

export const MarksEntrySyncStatus: React.FC<MarksEntrySyncStatusProps> = ({
  status,
  lastSavedTime,
  className = '',
}) => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveStatus: SyncStatusState = isOffline ? 'OFFLINE' : status;

  const renderContent = () => {
    switch (effectiveStatus) {
      case 'OFFLINE':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 font-semibold text-xs shadow-sm transition-all duration-300">
            <WifiOff size={15} className="animate-pulse text-rose-600 dark:text-rose-400" />
            <span>Offline</span>
            {status === 'DRAFT_SAVED_LOCALLY' && (
              <span className="text-[10px] font-normal opacity-80 border-l border-rose-300 dark:border-rose-700 pl-1.5 ml-0.5">
                Draft Saved Locally
              </span>
            )}
          </div>
        );

      case 'UPLOADING':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs shadow-sm transition-all duration-300">
            <RefreshCw size={15} className="animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Uploading...</span>
          </div>
        );

      case 'UPLOAD_SUCCESSFUL':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs shadow-sm transition-all duration-300">
            <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Upload Successful</span>
          </div>
        );

      case 'DRAFT_SAVED_LOCALLY':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-teal-700 dark:text-teal-300 font-semibold text-xs shadow-sm transition-all duration-300">
            <Save size={15} className="text-teal-600 dark:text-teal-400" />
            <span>Draft Saved Locally</span>
            {lastSavedTime && (
              <span className="text-[10px] font-normal text-teal-600/80 dark:text-teal-400/80 hidden sm:inline border-l border-teal-200 dark:border-teal-800 pl-1.5 ml-0.5">
                {new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        );

      case 'SYNC_PENDING':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 font-semibold text-xs shadow-sm transition-all duration-300">
            <Cloud size={15} className="text-amber-600 dark:text-amber-400 animate-bounce" />
            <span>Sync Pending</span>
          </div>
        );

      case 'UNSAVED_CHANGES':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 font-semibold text-xs shadow-sm transition-all duration-300">
            <AlertCircle size={15} className="text-amber-600 dark:text-amber-400" />
            <span>Unsaved Changes</span>
          </div>
        );
    }
  };

  return (
    <div className={`flex items-center justify-end ${className}`}>
      {renderContent()}
    </div>
  );
};

export default MarksEntrySyncStatus;
