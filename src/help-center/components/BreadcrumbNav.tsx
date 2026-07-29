import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

export const BreadcrumbNav: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  const location = useLocation();

  return (
    <div className="flex items-center justify-between py-3 mb-4 border-b border-gray-100 dark:border-slate-800 text-xs">
      <nav className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 overflow-x-auto">
        <Link to="/help" className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
          <Home className="w-3.5 h-3.5" />
          <span>Help Center</span>
        </Link>
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
            {item.path ? (
              <Link to={item.path} className="hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap">
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      <button
        onClick={() => window.history.back()}
        className="hidden sm:flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>
    </div>
  );
};
