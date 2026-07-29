import React, { useState, useEffect } from 'react';
import { 
  Edit2, 
  Save, 
  X,
  PenLine,
  LayoutGrid,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import Swal from 'sweetalert2';
import PageLoader from '../../components/common/PageLoader';

interface GradeRow {
  grade: string;
  range: string;
  scores: Record<string, string>;
}

interface GradeConfig {
  std9_10: GradeRow[];
  std8: GradeRow[];
}

const GradeManagementPage: React.FC = () => {
  const [grades, setGrades] = useState<GradeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const fetchGrades = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/management/grades');
      setGrades(res.data);
    } catch (err) {
      toast.error('Failed to fetch grades');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  const handleSave = async () => {
    const result = await Swal.fire({
      title: 'Update Grading Scales?',
      text: 'This will affect all result calculations across the entire system!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000000',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, update all!',
      customClass: {
        popup: 'rounded-3xl shadow-xl border border-gray-150'
      }
    });

    if (result.isConfirmed) {
      try {
        await apiClient.post('/management/grades', grades);
        toast.success('Grades updated successfully');
        setIsEditing(false);
      } catch (err) {
        toast.error('Failed to save grades');
      }
    }
  };

  if (isLoading || !grades) {
    return (
      <PageLoader label="Loading Grade Management..." />
    );
  }

  const renderGradeTable = (title: string, subtitle: string, data: GradeRow[], columns: string[]) => (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Table Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <span className="p-1.5 px-2.5 bg-blue-600 text-white dark:bg-[#1f6feb] text-[10px] rounded-lg font-black font-mono tracking-wider">
            {subtitle}
          </span>
          <h2 className="text-sm font-black text-black tracking-tighter uppercase">{title}</h2>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white dark:bg-[#1f6feb] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Save size={13} />
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2 active:scale-95"
            >
              <X size={13} />
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-white border border-gray-200 text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Edit2 size={13} />
            Edit Scale
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Grade</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Min %</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Range (%)</th>
              {columns.map(col => (
                <th key={col} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Out of {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row, idx) => {
              const minVal = (row as any).min ?? (row.range ? parseInt(row.range.split('-')[0]) : 0);
              const isStd8 = title.toLowerCase().includes('std 8') || title.toLowerCase().includes('std8');
              const stateKey = isStd8 ? 'std8' : 'std9_10';

              return (
                <tr key={idx} className="hover:bg-gray-50/60 transition-colors group">
                  {/* Grade Label */}
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.grade || ''}
                        onChange={(e) => {
                          const newData = [...data];
                          newData[idx] = { ...newData[idx], grade: e.target.value };
                          setGrades(prev => prev ? { ...prev, [stateKey]: newData } : prev);
                        }}
                        className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm font-black focus:ring-2 focus:ring-black focus:border-transparent transition-all mx-auto block"
                      />
                    ) : (
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white dark:bg-[#1f6feb] text-sm font-black mx-auto">
                        {row.grade}
                      </span>
                    )}
                  </td>

                  {/* Min % */}
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="number"
                        value={minVal}
                        onChange={(e) => {
                          const newMin = parseInt(e.target.value) || 0;
                          const newData = [...data];
                          const newScores = { ...(newData[idx].scores || {}) };
                          columns.forEach(col => {
                            const total = parseInt(col);
                            newScores[col] = Math.round((newMin * total) / 100).toString();
                          });
                          newData[idx] = {
                            ...newData[idx],
                            min: newMin,
                            range: `${newMin}-${newMin + 9 > 100 ? 100 : newMin + 9}`,
                            scores: newScores
                          } as any;
                          setGrades(prev => prev ? { ...prev, [stateKey]: newData } : prev);
                        }}
                        className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all mx-auto block"
                      />
                    ) : (
                      <span className="text-sm font-black text-blue-600">{minVal}</span>
                    )}
                  </td>

                  {/* Range */}
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.range || ''}
                        onChange={(e) => {
                          const newData = [...data];
                          newData[idx] = { ...newData[idx], range: e.target.value };
                          setGrades(prev => prev ? { ...prev, [stateKey]: newData } : prev);
                        }}
                        className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all mx-auto block"
                      />
                    ) : (
                      <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                        {row.range || '-'}
                      </span>
                    )}
                  </td>

                  {/* Score columns */}
                  {columns.map(col => (
                    <td key={col} className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.scores?.[col] || ''}
                          onChange={(e) => {
                            const newData = [...data];
                            const currentScores = newData[idx].scores || {};
                            newData[idx] = {
                              ...newData[idx],
                              scores: { ...currentScores, [col]: e.target.value }
                            };
                            setGrades(prev => prev ? { ...prev, [stateKey]: newData } : prev);
                          }}
                          className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-black focus:border-transparent transition-all mx-auto block"
                        />
                      ) : (
                        <span className="text-sm font-bold text-gray-700">
                          {row.scores?.[col] || '-'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tighter uppercase flex items-center gap-3">
            <PenLine size={32} className="text-gray-400" />
            Grade Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Configure grading scales and percentage ranges for different standards.
          </p>
        </div>

        {isEditing && (
          <div className="flex gap-2 animate-in slide-in-from-right-4 duration-300">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white dark:bg-[#1f6feb] px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 dark:hover:bg-[#388bfd] transition-all flex items-center gap-2 shadow-xl shadow-black/10 active:scale-95"
            >
              <Save size={16} />
              Save All Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-white border border-gray-200 text-gray-800 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Grade Tables */}
      {renderGradeTable('Grading Scale — Std. 9 & 10', 'STD 9-10', grades?.std9_10 || [], ['20', '25', '30', '35', '40', '80'])}
      {renderGradeTable('Grading Scale — Std. 8', 'STD 8', grades?.std8 || [], ['20', '40', '50', '60', '80'])}

      {/* Info Note */}
      <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-start gap-5">
        <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 className="text-xs font-black text-black uppercase tracking-[0.15em]">Grading Logic Note</h3>
          <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">
            These grade definitions are used for all result analysis modules. Modifications to these scales will immediately 
            reflect in sub-regional and school-wise performance calculators. Ensure all range boundaries are inclusive 
            and correctly aligned with Pareeksha Bhavan standards.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GradeManagementPage;
