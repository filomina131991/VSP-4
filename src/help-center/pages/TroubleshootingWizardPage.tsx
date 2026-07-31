import React, { useState } from 'react';
import { Layers, CheckCircle2, RotateCcw, AlertTriangle, ArrowRight, HelpCircle, ShieldCheck } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { Link } from 'react-router-dom';

interface WizardOption {
  label: string;
  nextStepId?: string;
  matchedErrorId?: string;
}

interface WizardStep {
  id: string;
  question: string;
  malayalamQuestion?: string;
  options: WizardOption[];
}

export const TroubleshootingWizardPage: React.FC = () => {
  const { errors } = useHelpCenter();
  const [currentStepId, setCurrentStepId] = useState<string>('wiz-1');
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);

  const wizardTree: Record<string, WizardStep> = {
    'wiz-1': {
      id: 'wiz-1',
      question: 'Where are you experiencing the issue in Vijayasree Portal?',
      malayalamQuestion: 'പോർട്ടലിൽ ഏത് വിഭാഗത്തിലാണ് പ്രശ്നം നേരിടുന്നത്?',
      options: [
        { label: 'Language Selection / Paper 1 & Paper 2 Validation Mismatch', nextStepId: 'wiz-lang' },
        { label: 'Medium Selection / Dropdown Empty in Marks Entry', matchedErrorId: 'medium-missing' },
        { label: 'Teacher Marks Entry / Subject Missing / Locked Grid', nextStepId: 'wiz-teacher' },
        { label: 'School Final Confirmation / Submit Button Disabled', matchedErrorId: 'final-confirmation-hidden' },
        { label: 'Dashboard Registered vs Appeared Count Mismatch', matchedErrorId: 'dashboard-count-wrong' }
      ]
    },
    'wiz-lang': {
      id: 'wiz-lang',
      question: 'What message is displayed during language configuration?',
      malayalamQuestion: 'ഭാഷാ കോൺഫിഗറേഷനിൽ ഏത് മെസ്സേജ് ആണ് കാണിക്കുന്നത്?',
      options: [
        { label: 'Paper I and Paper II stream mismatch error', matchedErrorId: 'language-validation' },
        { label: 'Paper I (Malayalam AT) is missing', matchedErrorId: 'paper-1-missing' },
        { label: 'Paper II (Malayalam BT) is unassigned', matchedErrorId: 'paper-2-missing' }
      ]
    },
    'wiz-teacher': {
      id: 'wiz-teacher',
      question: 'What specific problem is the subject teacher experiencing?',
      malayalamQuestion: 'അധ്യാപകന് എന്താണ് തടസ്സം?',
      options: [
        { label: 'No assigned subjects appearing in dropdown', matchedErrorId: 'subject-missing' },
        { label: 'Grades not saving or disappearing after refresh', matchedErrorId: 'marks-entry-empty' },
        { label: 'Teacher Profile incomplete or missing PEN number', matchedErrorId: 'teacher-profile-incomplete' },
        { label: 'Yellow "Pending Teacher Lock" status on Dashboard', matchedErrorId: 'pending-subject-confirmation' }
      ]
    }
  };

  const activeStep = wizardTree[currentStepId];
  const matchedError = selectedErrorId ? errors.find(e => e.id === selectedErrorId) : null;

  const handleSelectOption = (opt: WizardOption) => {
    if (opt.matchedErrorId) {
      setSelectedErrorId(opt.matchedErrorId);
    } else if (opt.nextStepId) {
      setCurrentStepId(opt.nextStepId);
    }
  };

  const handleReset = () => {
    setCurrentStepId('wiz-1');
    setSelectedErrorId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <BreadcrumbNav items={[{ label: 'Troubleshooting Wizard' }]} />

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Interactive Decision Tree
          </span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Wizard</span>
          </button>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
          Vijayasree Guided Troubleshooting Wizard
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Answer 2-3 quick questions to pinpoint the exact root cause and recommended solution.
        </p>
      </div>

      {matchedError ? (
        /* Matched Resolution Result Card */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-emerald-200 dark:border-emerald-900/80 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Diagnosis Complete
              </span>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                Recommended Solution: {matchedError.title}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 text-xs">
            <div>
              <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2">
                Possible Causes:
              </h4>
              <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                {matchedError.causes.map((c, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2">
                How to Fix:
              </h4>
              <ol className="space-y-1.5 text-slate-700 dark:text-slate-300">
                {matchedError.solution.map((s, i) => (
                  <li key={i} className="font-medium">
                    {i + 1}. {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-200"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start Over</span>
            </button>

            <Link
              to={`/help/errors/${matchedError.id}`}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <span>View Full Detailed Error Page</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : activeStep ? (
        /* Question Step Card */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6">
          <div>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Diagnostic Question
            </span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1">
              {activeStep.question}
            </h2>
            {activeStep.malayalamQuestion && (
              <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                {activeStep.malayalamQuestion}
              </h3>
            )}
          </div>

          <div className="space-y-3">
            {activeStep.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectOption(opt)}
                className="w-full p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/60 hover:border-purple-300 text-left transition-all flex items-center justify-between group"
              >
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                  {opt.label}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
