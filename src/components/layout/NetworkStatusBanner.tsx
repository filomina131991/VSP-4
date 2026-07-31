import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlow, setIsSlow] = useState(false);
  const [showConnected, setShowConnected] = useState(false);
  const [showSlowBanner, setShowSlowBanner] = useState(false);

  useEffect(() => {
    let intervalId: number;
    let timeoutId: number;

    const triggerSlowBanner = () => {
      setShowSlowBanner(true);
      timeoutId = window.setTimeout(() => {
        setShowSlowBanner(false);
      }, 5000); // Hide after 5 seconds
    };

    if (isOnline && isSlow) {
      // Trigger immediately when it becomes slow
      triggerSlowBanner();
      // Then trigger every 3 minutes (180000 ms)
      intervalId = window.setInterval(() => {
        triggerSlowBanner();
      }, 180000);
    } else {
      setShowSlowBanner(false);
    }

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [isOnline, isSlow]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowConnected(true);
      setTimeout(() => setShowConnected(false), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API for slow connection
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const checkConnectionSpeed = () => {
      if (connection) {
        // effectiveType can be 'slow-2g', '2g', '3g', or '4g'
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          setIsSlow(true);
        } else {
          setIsSlow(false);
        }
      }
    };

    if (connection) {
      checkConnectionSpeed();
      connection.addEventListener('change', checkConnectionSpeed);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', checkConnectionSpeed);
      }
    };
  }, []);

  // If online, not slow (or slow banner is hidden), and the "connected" animation is done, don't render the wrapper
  if (isOnline && !showConnected && !showSlowBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center pb-6 pointer-events-none overflow-hidden">
      <div 
        className={cn(
          "px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 transform transition-all duration-500 ease-in-out font-bold text-sm tracking-tight",
          !isOnline 
            ? "bg-red-500 text-white translate-y-0 opacity-100 scale-100" 
            : showConnected 
              ? "bg-emerald-500 text-white translate-y-0 opacity-100 scale-100" 
              : showSlowBanner 
                ? "bg-amber-500 text-white translate-y-0 opacity-100 scale-100" 
                : "translate-y-16 opacity-0 scale-95"
        )}
      >
        {!isOnline && (
          <>
            <WifiOff size={18} className="animate-pulse" />
            <span>No Internet Connection</span>
          </>
        )}
        {isOnline && showConnected && (
          <>
            <Wifi size={18} className="animate-bounce" />
            <span>Internet Connected</span>
          </>
        )}
        {isOnline && showSlowBanner && !showConnected && (
          <>
            <AlertTriangle size={18} className="animate-pulse" />
            <span>Slow Internet Connection. Page loading speed is slow.</span>
          </>
        )}
      </div>
    </div>
  );
}
