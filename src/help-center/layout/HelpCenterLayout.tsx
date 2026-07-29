import React from 'react';
import { Outlet } from 'react-router-dom';
import { HelpCenterProvider } from '../context/HelpCenterContext';
import { HelpHeader } from '../components/HelpHeader';
import { HelpFooter } from '../components/HelpFooter';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { AiAssistantModal } from '../components/AiAssistantModal';

export const HelpCenterLayout: React.FC = () => {
  return (
    <HelpCenterProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-blue-500 selection:text-white">
        <HelpHeader />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>

        <HelpFooter />
        <ImageViewerModal />
        <AiAssistantModal />
      </div>
    </HelpCenterProvider>
  );
};

export default HelpCenterLayout;
