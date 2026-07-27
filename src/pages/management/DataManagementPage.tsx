import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Map, 
  School, 
  Users, 
  PenLine,
  ListTodo,
  BookOpen,
  CheckCheck,
  Languages
} from 'lucide-react';
import DistrictTabHubPage from './DistrictTabHubPage';
import SchoolManagementPage from './SchoolManagementPage';
import GradeManagementPage from './GradeManagementPage';
import ChecklistDatabasePage from './ChecklistDatabasePage';
import SubjectManagementPage from './SubjectManagementPage';
import BulkConfirmPage from './BulkConfirmPage';
import MediumManagementPage from './MediumManagementPage';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

type TabType = 'DISTRICT_HUB' | 'SCHOOLS' | 'GRADES' | 'CHECKLIST' | 'SUBJECTS' | 'BULK_CONFIRM' | 'MEDIUM';

const DataManagementPage: React.FC = () => {
  const { user } = useAuth();
  
  const allTabs = [
    { id: 'DISTRICT_HUB', label: 'District Management', icon: Map, roles: ['WEBMASTER'] },
    { id: 'SCHOOLS', label: 'Schools', icon: School, roles: ['WEBMASTER', 'DIET', 'DEO', 'SCHOOL'] },
    { id: 'GRADES', label: 'Grades', icon: PenLine, roles: ['WEBMASTER', 'DIET', 'DEO'] },
    { id: 'CHECKLIST', label: 'Checklist DB', icon: Database, roles: ['WEBMASTER'] },
    { id: 'SUBJECTS', label: 'Subjects', icon: BookOpen, roles: ['WEBMASTER', 'DIET', 'DEO'] },
    { id: 'MEDIUM', label: 'Mediums', icon: Languages, roles: ['WEBMASTER'] },
    { id: 'BULK_CONFIRM', label: 'Bulk Confirm', icon: CheckCheck, roles: ['WEBMASTER', 'DIET', 'DEO'] },
  ] as const;

  const availableTabs = useMemo(() => {
    return allTabs.filter(tab => (tab.roles as readonly string[]).includes(user?.role || ''));
  }, [user]);

  const [activeTab, setActiveTab] = useState<TabType>(availableTabs[0]?.id as TabType || 'SCHOOLS');

  const renderContent = () => {
    switch (activeTab) {
      case 'DISTRICT_HUB': return <DistrictTabHubPage />;
      case 'SCHOOLS': return <SchoolManagementPage />;
      case 'GRADES': return <GradeManagementPage />;
      case 'CHECKLIST': return <ChecklistDatabasePage />;
      case 'SUBJECTS': return <SubjectManagementPage />;
      case 'MEDIUM': return <MediumManagementPage />;
      case 'BULK_CONFIRM': return <BulkConfirmPage />;
      default: return null;
    }
  };

  return (
    <div className="p-4 sm:p-8 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase flex items-center gap-3 sm:gap-4 single-line-label">
            <Database size={36} className="text-gray-300 shrink-0" />
            Data Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1 single-row-desc">Centralized control for institutional data, users, and academic scales.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-blue-50/50 dark:bg-[#161b22] p-1.5 rounded-2xl border border-blue-100 dark:border-[#30363d] shadow-sm flex overflow-x-auto gap-2 mobile-scroll-table">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap native-touch-target active-tap shrink-0",
              activeTab === tab.id 
                ? "bg-blue-600 dark:bg-[#1f6feb] text-white shadow-md shadow-blue-600/20" 
                : "bg-blue-50/80 dark:bg-[#1f242c] text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/70 dark:border-blue-800/60"
            )}
          >
            <tab.icon size={16} className="shrink-0" />
            <span className="single-line-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default DataManagementPage;
