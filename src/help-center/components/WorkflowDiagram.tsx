import React, { useState } from 'react';
import { WORKFLOW_NODES_DATA } from '../data/workflowData';
import { 
  LogIn, 
  Building, 
  Users, 
  LayoutDashboard, 
  Settings, 
  FileEdit, 
  Lock, 
  CheckSquare, 
  Award, 
  FileText,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ICON_MAP: Record<string, any> = {
  LogIn,
  Building,
  Users,
  LayoutDashboard,
  Settings,
  FileEdit,
  Lock,
  CheckSquare,
  Award,
  FileText
};

interface WorkflowDiagramProps {
  inlineErrors?: boolean;
  onErrorClick?: (id: string) => void;
}

export const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ inlineErrors, onErrorClick }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('wf-1-login');

  const selectedNode = WORKFLOW_NODES_DATA.find(n => n.id === selectedNodeId) || WORKFLOW_NODES_DATA[0];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl my-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Interactive System Flow
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
            Vijayasree Complete SSLC Workflow
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Click on any step node below to inspect requirements, roles, prerequisites, and common errors.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl w-fit">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping inline-block" />
          <span>10 Key Stages</span>
        </div>
      </div>

      {/* Workflow Horizontal Node Chain */}
      <div className="overflow-x-auto pb-4 mb-8">
        <div className="flex items-center gap-3 min-w-max">
          {WORKFLOW_NODES_DATA.map((node, idx) => {
            const IconComponent = ICON_MAP[node.icon] || FileText;
            const isSelected = node.id === selectedNodeId;

            return (
              <React.Fragment key={node.id}>
                <button
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`flex flex-col items-center p-3.5 rounded-2xl border transition-all text-center w-36 ${
                    isSelected
                      ? 'bg-gradient-to-b from-blue-600 to-indigo-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700/80 hover:bg-blue-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold leading-snug line-clamp-2">{node.title}</span>
                  <span className={`text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {node.role}
                  </span>
                </button>

                {idx < WORKFLOW_NODES_DATA.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details Card */}
      {selectedNode && (
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-6 border border-blue-100 dark:border-slate-700/80 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Role: {selectedNode.role}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                {selectedNode.title} ({selectedNode.malayalamTitle})
              </h3>
            </div>


          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 mt-4 leading-relaxed">
            {selectedNode.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700/60">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Prerequisites</h4>
              <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                {selectedNode.prerequisites.map((p, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700/60">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Common Errors at this Stage</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedNode.commonErrorIds.length > 0 ? (
                  selectedNode.commonErrorIds.map(errId => (
                    inlineErrors ? (
                      <button
                        key={errId}
                        onClick={() => onErrorClick && onErrorClick(errId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>{errId}</span>
                      </button>
                    ) : (
                      <Link
                        key={errId}
                        to={`/help/errors/${errId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>{errId}</span>
                      </Link>
                    )
                  ))
                ) : (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">No high severity errors reported at this stage.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
