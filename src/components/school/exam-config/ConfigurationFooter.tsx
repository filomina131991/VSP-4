import React from 'react';
import { Save, Check, Loader2 } from 'lucide-react';

interface ConfigurationFooterProps {
  selectedCount: number;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  saveDisabled: boolean;
  saveSuccess?: boolean;
}

export const ConfigurationFooter: React.FC<ConfigurationFooterProps> = ({
  selectedCount,
  onCancel,
  onSave,
  isSaving,
  saveDisabled,
  saveSuccess = false,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-md border-t border-slate-100 dark:border-[#30363d] py-4 px-6 md:px-8 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Selected Count Indicator */}
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">
            Selected Subjects :{' '}
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              {selectedCount}
            </span>
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#21262d] text-slate-600 dark:text-gray-300 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            disabled={saveDisabled || isSaving}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all duration-300 active:scale-95 cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/55 dark:shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/55 dark:shadow-none'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Configuration...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check size={16} strokeWidth={3} className="animate-bounce" />
                <span>Configuration Saved!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationFooter;
