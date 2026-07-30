import React from 'react';
import { Outlet } from 'react-router-dom';
import { HelpCenterProvider } from '../context/HelpCenterContext';
import { HelpHeader } from '../components/HelpHeader';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { ChatBot } from '../components/ChatBot';

export const HelpCenterLayout: React.FC = () => {
  return (
    <HelpCenterProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-blue-500 selection:text-white">
        <HelpHeader />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <Outlet />
        </main>

        <footer className="bg-slate-100 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-4 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-gray-500 dark:text-gray-400">
            © 2026 Vijayasree Palakkad SSLC Help Center
          </div>
        </footer>

        <ImageViewerModal />
        <ChatBot />
      </div>
    </HelpCenterProvider>
  );
};

export default HelpCenterLayout;
