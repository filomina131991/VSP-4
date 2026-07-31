import React, { useState } from 'react';
import { Globe, Database, Map } from 'lucide-react';
import MainDistrictManagementPage from './MainDistrictManagementPage';
import DistrictManagementPage from './DistrictManagementPage';
import EduDistrictManagementPage from './EduDistrictManagementPage';
import { cn } from '../../lib/utils';

type SubTab = 'MAIN_DISTRICT' | 'REVENUE_DISTRICT' | 'EDU_DISTRICT';

const DistrictTabHubPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('REVENUE_DISTRICT');

  const subTabs = [
    { id: 'MAIN_DISTRICT', label: '1. District', icon: Globe },
    { id: 'REVENUE_DISTRICT', label: '2. Revenue District', icon: Database },
    { id: 'EDU_DISTRICT', label: '3. Educational District', icon: Map },
  ] as const;

  return (
    <div className="space-y-6">
      {/* 4-Tier District Sub-Tabs Navigation */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[#161b22] dark:to-[#0d1117] p-2 rounded-2xl border border-blue-100 dark:border-[#30363d] shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 px-3 py-1 mb-1 single-line-label w-full">
          District Hierarchy Structure (District → Revenue District → Educational District)
        </div>
        <div className="flex overflow-x-auto gap-2 pb-1 mobile-scroll-table">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 native-touch-target active-tap",
                activeSubTab === tab.id
                  ? "bg-blue-600 dark:bg-[#1f6feb] text-white shadow-md shadow-blue-600/20 scale-[1.02]"
                  : "bg-white dark:bg-[#21262d] text-blue-700 dark:text-blue-300 hover:bg-blue-100/80 border border-blue-200/70 dark:border-blue-800/60"
              )}
            >
              <tab.icon size={16} className="shrink-0" />
              <span className="single-line-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Tab Content */}
      <div className="mt-4">
        {activeSubTab === 'MAIN_DISTRICT' && <MainDistrictManagementPage />}
        {activeSubTab === 'REVENUE_DISTRICT' && <DistrictManagementPage />}
        {activeSubTab === 'EDU_DISTRICT' && <EduDistrictManagementPage />}
      </div>
    </div>
  );
};

export default DistrictTabHubPage;
