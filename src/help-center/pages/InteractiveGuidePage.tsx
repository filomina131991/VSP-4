import React, { useState } from 'react';
import { 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  ZoomIn, 
  AlertTriangle, 
  Lightbulb, 
  CheckSquare, 
  RotateCcw,
  Sparkles,
  Award
} from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { BreadcrumbNav } from '../components/BreadcrumbNav';

export const InteractiveGuidePage: React.FC = () => {
  const { steps, setZoomedImage } = useHelpCenter();
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);

  const activeStep = steps[currentStepIdx] || steps[0];

  const handleToggleCompleted = (id: string) => {
    if (completedStepIds.includes(id)) {
      setCompletedStepIds(completedStepIds.filter(item => item !== id));
    } else {
      setCompletedStepIds([...completedStepIds, id]);
    }
  };

  const isCurrentCompleted = activeStep ? completedStepIds.includes(activeStep.id) : false;
  const progressPercentage = Math.round((completedStepIds.length / (steps.length || 1)) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <BreadcrumbNav items={[{ label: '16-Step Interactive Guide' }]} />

      {/* Header & Overall Progress Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Step-by-Step Training Protocol
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
              Vijayasree 16-Step Interactive Guide
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Overall Progress</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{progressPercentage}% Completed</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-gray-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Step Navigation Pill Selector Bar */}
        <div className="overflow-x-auto pb-2 pt-2">
          <div className="flex items-center gap-2 min-w-max">
            {steps.map((step, idx) => {
              const isDone = completedStepIds.includes(step.id);
              const isActive = idx === currentStepIdx;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIdx(idx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                      : isDone
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <span>Step {step.stepNumber}</span>
                  {isDone && <CheckCircle className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Step Detail Card */}
      {activeStep && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6">
          
          {/* Step Badge & Target Module */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-extrabold rounded-full">
                Step {activeStep.stepNumber} of 16
              </span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-full">
                Target Module: {activeStep.targetModule}
              </span>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-xs font-semibold rounded-full">
                Role: {activeStep.role}
              </span>
            </div>

            {/* Mark as Completed Toggle */}
            <button
              onClick={() => handleToggleCompleted(activeStep.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                isCurrentCompleted
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>{isCurrentCompleted ? 'Step Completed ✓' : 'Mark as Completed'}</span>
            </button>
          </div>

          {/* Titles: English & Malayalam */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              {activeStep.englishTitle}
            </h2>
            <h3 className="text-base font-bold text-blue-600 dark:text-blue-400">
              {activeStep.malayalamTitle}
            </h3>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">English Overview</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
                {activeStep.englishDescription}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">മലയാളം വിവരണം</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {activeStep.malayalamDescription}
              </p>
            </div>
          </div>

          {/* Screenshot with Zoom Image Trigger */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800 group bg-slate-950 max-h-[400px] flex items-center justify-center">
            <img
              src={activeStep.screenshot}
              alt={activeStep.englishTitle}
              className="max-h-[380px] w-auto object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <button
              onClick={() => setZoomedImage({ url: activeStep.screenshot, title: activeStep.englishTitle })}
              className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white px-3.5 py-2 rounded-xl text-xs font-bold backdrop-blur-md flex items-center gap-1.5 shadow-lg transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
              <span>Zoom Screenshot</span>
            </button>
          </div>

          {/* Warning & Tip Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* Warning Card */}
            {activeStep.warning && (
              <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Important Warning / മുന്നറിയിപ്പ്</span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-200 font-medium leading-relaxed">
                  {activeStep.warning}
                </p>
                {activeStep.malayalamWarning && (
                  <p className="text-xs text-rose-900 dark:text-rose-300 font-semibold pt-1">
                    {activeStep.malayalamWarning}
                  </p>
                )}
              </div>
            )}

            {/* Tip Card */}
            {activeStep.tip && (
              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Pro Tip / സൂചന</span>
                </div>
                <p className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                  {activeStep.tip}
                </p>
                {activeStep.malayalamTip && (
                  <p className="text-xs text-amber-950 dark:text-amber-300 font-semibold pt-1">
                    {activeStep.malayalamTip}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Next / Previous Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentStepIdx(Math.max(0, currentStepIdx - 1))}
              disabled={currentStepIdx === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>

            <span className="text-xs font-semibold text-gray-500">
              {currentStepIdx + 1} / {steps.length}
            </span>

            <button
              onClick={() => setCurrentStepIdx(Math.min(steps.length - 1, currentStepIdx + 1))}
              disabled={currentStepIdx === steps.length - 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 shadow-md shadow-blue-500/20 transition-colors"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
