import React from 'react';
import { AlertTriangle, CheckCircle, Eye } from 'lucide-react';

interface DuplicateMatch {
  question: any;
  similarity: number;
}

interface DuplicateWarningPanelProps {
  similarity: number;
  duplicates: DuplicateMatch[];
  onViewDifference?: (q: any) => void;
}

export default function DuplicateWarningPanel({ similarity, duplicates, onViewDifference }: DuplicateWarningPanelProps) {
  if (similarity === 0) return null;

  let colorClass = 'bg-gray-100 text-gray-800';
  let Icon = CheckCircle;
  let message = 'Question looks unique.';

  if (similarity >= 95) {
    colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    Icon = AlertTriangle;
    message = 'Exact or Near-Exact Duplicate Detected! Saving is disabled.';
  } else if (similarity >= 90) {
    colorClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    Icon = AlertTriangle;
    message = 'Highly Similar Question Detected! Please review carefully.';
  } else if (similarity >= 80) {
    colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
    Icon = AlertTriangle;
    message = 'Possible Similar Question exists.';
  } else {
    colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
  }

  return (
    <div className={`mt-4 p-4 rounded-md border ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={20} />
        <h4 className="font-semibold">{message}</h4>
        <span className="ml-auto font-bold">{similarity}% Match</span>
      </div>
      
      {duplicates.length > 0 && similarity >= 80 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium">Top Matches:</p>
          {duplicates.map((match, i) => (
            <div key={i} className="flex items-center justify-between bg-white/50 dark:bg-black/20 p-2 rounded text-sm">
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[300px]">
                  {match.question.content.replace(/<[^>]*>?/gm, '').substring(0, 50)}...
                </span>
                <span className="text-xs opacity-75">
                  ID: {match.question.id} | By: {match.question.createdBy}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{match.similarity}%</span>
                {onViewDifference && (
                  <button 
                    type="button" 
                    onClick={() => onViewDifference(match.question)}
                    className="p-1 hover:bg-black/10 rounded flex items-center gap-1"
                  >
                    <Eye size={14} /> View
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
