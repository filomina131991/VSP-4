import React from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  Layers, 
  BookOpen, 
  MessageSquare,
  Sparkles
} from 'lucide-react';

export const QuickActionsGrid: React.FC = () => {
  const actions = [
    {
      title: "Language Validation Fix",
      description: "Resolve First Language Paper 1 & Paper 2 mismatch errors.",
      link: "/help/errors/language-validation",
      icon: AlertTriangle,
      color: "from-amber-500 to-rose-500"
    },
    {
      title: "Medium Not Showing",
      description: "Fix unassigned Malayalam / English medium dropdown issue.",
      link: "/help/errors/medium-missing",
      icon: CheckCircle,
      color: "from-blue-600 to-indigo-600"
    },
    {
      title: "Troubleshooting Wizard",
      description: "Interactive decision tree for diagnosing school issues.",
      link: "/help/wizard",
      icon: Layers,
      color: "from-purple-600 to-indigo-600"
    },
    {
      title: "Teacher Marks Lock Guide",
      description: "How teachers can lock subject marks & clear pending status.",
      link: "/help/guides/teacher",
      icon: BookOpen,
      color: "from-sky-500 to-blue-600"
    },
    {
      title: "DEO Support Desk",
      description: "Create an offline support ticket for technical staff.",
      link: "/help/tickets",
      icon: MessageSquare,
      color: "from-rose-500 to-red-600"
    }
  ];

  return (
    <div className="my-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Quick Actions
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5">
            Popular Problem Resolutions
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((act, idx) => {
          const Icon = act.icon;
          return (
            <Link
              key={idx}
              to={act.link}
              className="group bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex items-start gap-4"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${act.color} text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {act.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {act.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
