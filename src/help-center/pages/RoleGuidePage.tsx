import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, CheckCircle, AlertTriangle, ArrowRight, UserCheck, Building, LayoutDashboard, Lock, FileEdit, Settings } from 'lucide-react';
import { ROLE_GUIDES } from '../data/guidesData';
import { BreadcrumbNav } from '../components/BreadcrumbNav';

const ICON_MAP: Record<string, any> = {
  UserCheck,
  Building,
  LayoutDashboard,
  Lock,
  FileEdit,
  Settings,
  BookOpen
};

export const RoleGuidePage: React.FC = () => {
  const { roleId } = useParams<{ roleId: string }>();
  const guide = ROLE_GUIDES[roleId || 'teacher'] || ROLE_GUIDES.teacher;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <BreadcrumbNav items={[
        { label: 'Role Guides' },
        { label: guide.title }
      ]} />

      {/* Role Navigation Bar */}
      <div className="flex items-center gap-2">
        {['teacher', 'school', 'dashboard'].map(r => (
          <Link
            key={r}
            to={`/help/guides/${r}`}
            className={`px-4 py-2 text-xs font-bold rounded-2xl capitalize transition-all ${
              (roleId || 'teacher') === r
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-100'
            }`}
          >
            {r} Guide
          </Link>
        ))}
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Role-Specific User Guide
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
          {guide.title} ({guide.malayalamTitle})
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
          {guide.description}
        </p>
      </div>

      {/* Sections List */}
      <div className="space-y-6">
        {guide.sections.map((sec) => {
          const IconComp = ICON_MAP[sec.icon] || BookOpen;

          return (
            <div
              key={sec.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <IconComp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {sec.title}
                  </h3>
                  <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {sec.malayalamTitle}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs">
                <div>
                  <h5 className="font-bold text-gray-400 uppercase tracking-wider mb-1">English</h5>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{sec.content}</p>
                </div>
                <div>
                  <h5 className="font-bold text-gray-400 uppercase tracking-wider mb-1">മലയാളം</h5>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{sec.malayalamContent}</p>
                </div>
              </div>

              {sec.errorIds && sec.errorIds.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase block mb-1.5">Common Errors at this Step:</span>
                  <div className="flex flex-wrap gap-2">
                    {sec.errorIds.map(errId => (
                      <Link
                        key={errId}
                        to={`/help/errors/${errId}`}
                        className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold inline-flex items-center gap-1 hover:bg-amber-100"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>{errId}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
