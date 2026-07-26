import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PageLoaderProps {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({
  label = 'Loading data',
  fullScreen = false,
  className
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        fullScreen ? 'min-h-screen bg-slate-50 dark:bg-[#0d1117]' : 'min-h-[280px]',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#30363d] dark:bg-[#161b22]" />
          <div className="absolute inset-2 rounded-xl bg-slate-950 text-white grid place-items-center dark:bg-[#1f6feb]">
            <LayoutGrid size={18} />
          </div>
          <div className="absolute -inset-1 rounded-3xl border-2 border-transparent border-t-amber-500 border-r-emerald-500 animate-spin" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-900 dark:text-slate-100">
            {label}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Vijayasree Palakkad
          </p>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
