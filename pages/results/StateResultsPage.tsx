import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  ArrowRight,
  LayoutGrid,
  List,
  ArrowLeft,
  FileText,
  Printer,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import logoUrl from '../../assets/logo.png';
import ExamSelect from '../../components/common/ExamSelect';
import Dropdown from '../../components/common/Dropdown';

type ViewLevel = 'STATE' | 'DISTRICT' | 'EDUCATIONAL';

interface ResultRow {
  slNo: number;
  id: string;
  name: string;
  code?: string;
  type?: string;
  studentsAppeared: number;
  pass: number;
  fullAPlus: number;
  victoryPercentage: number;
}

interface Breadcrumb {
  level: ViewLevel;
  id: string;
  name: string;
}

const StateResultsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolType, setSchoolType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentLevel, setCurrentLevel] = useState<ViewLevel>('DISTRICT');
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { level: 'STATE', id: user?.districtId || 'dist-9', name: 'Palakkad' }
  ]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');

  useEffect(() => {
    if (user?.districtId) {
      setBreadcrumbs([{ level: 'STATE', id: user.districtId, name: 'My District' }]);
    }
  }, [user]);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await apiClient.get('/management/exams');
        setExams(res.data);
        if (res.data.length > 0) {
          setSelectedExamId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchExams();
  }, []);
  
  const fetchResults = async (level: ViewLevel, id?: string) => {
    setIsLoading(true);
    try {
      let url = `/results/district/${user?.districtId || id || 'dist-9'}`;
      if (level === 'EDUCATIONAL' && id) {
        url = `/results/educational/${id}`;
      }
      
      const res = await apiClient.get(`${url}?schoolType=${schoolType}&examId=${selectedExamId}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const parent = breadcrumbs[breadcrumbs.length - 1];
    fetchResults(currentLevel, parent?.id);
  }, [schoolType, currentLevel, breadcrumbs, selectedExamId]);

  const filteredResults = useMemo(() => {
    return results.filter(row => 
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.code && row.code.includes(searchTerm))
    );
  }, [results, searchTerm]);

  const totals = results.reduce((acc, curr) => ({
    appeared: acc.appeared + curr.studentsAppeared,
    pass: acc.pass + curr.pass,
    fullA: acc.fullA + curr.fullAPlus
  }), { appeared: 0, pass: 0, fullA: 0 });

  const avgVictory = totals.appeared > 0 ? (totals.pass / totals.appeared) * 100 : 0;

  const handleRowClick = (row: ResultRow) => {
    if (currentLevel === 'DISTRICT') {
      setBreadcrumbs(prev => [...prev, { level: 'DISTRICT', id: row.id, name: row.name }]);
      setCurrentLevel('EDUCATIONAL');
    }
  };

  const handleBack = () => {
    if (currentLevel === 'EDUCATIONAL') {
      setBreadcrumbs([{ level: 'STATE', id: 'dist-9', name: 'Palakkad' }]);
      setCurrentLevel('DISTRICT');
    }
  };

  const getLevelTitle = () => {
    if (currentLevel === 'STATE') return 'State Result';
    if (currentLevel === 'DISTRICT') return 'Palakkad';
    if (currentLevel === 'EDUCATIONAL') return `Educational District: ${breadcrumbs[1]?.name}`;
    return 'Results';
  };

  const getTableHead = () => {
    const nameLabel = currentLevel === 'STATE' ? 'Revenue District' : 
                      currentLevel === 'DISTRICT' ? 'Educational District' : 'School Name';
    
    return (
      <tr className="bg-white border-b border-gray-200">
        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sl</th>
        {currentLevel === 'EDUCATIONAL' && (
          <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Code</th>
        )}
        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{nameLabel}</th>
        {currentLevel === 'EDUCATIONAL' && (
          <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Type</th>
        )}
        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Appeared</th>
        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Pass</th>
        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Fail</th>
        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Full A+</th>
        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Victory %</th>
        <th className="px-8 py-5"></th>
      </tr>
    );
  };

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      {/* Header Panel */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 md:py-0 md:h-20 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center space-x-3 w-full md:w-auto justify-start">
            <div className="shrink-0 flex items-center justify-center p-1 bg-white rounded-lg shadow-sm border border-gray-100">
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter text-black uppercase">VIJAYASREE ANALYSIS</h1>
              <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">VIJAYASREE • {breadcrumbs[0]?.name || 'Palakkad'}</p>
            </div>
          </div>
          <div className="flex justify-end w-full md:w-auto">
            <div className="flex items-center space-x-4 md:space-x-6 text-[10px] md:text-[11px] font-bold uppercase tracking-widest bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-lg">
              <Link to="/login" className="text-gray-400 hover:text-black transition-colors">
                <span className="md:hidden">Login</span>
                <span className="hidden md:inline">Officer Login</span>
              </Link>
              <div className="h-4 w-px bg-gray-300 md:bg-gray-200" />
              <span className="text-black">Public Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 md:p-12 mb-12">
        <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              {currentLevel === 'EDUCATIONAL' && (
                <button 
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <h2 className="text-2xl md:text-4xl font-black text-black tracking-tighter uppercase break-words">{getLevelTitle()}</h2>
            </div>
            <p className="text-sm text-gray-500 font-medium tracking-tight">
              {currentLevel === 'STATE' ? 'Consolidated performance analysis across all revenue districts.' : 
               currentLevel === 'DISTRICT' ? `Performance analysis for educational districts in ${breadcrumbs[0]?.name}.` :
               `Performance analysis for schools in ${breadcrumbs[1]?.name}.`}
            </p>
          </div>

          {user?.role !== 'SCHOOL' && (
            <button
              onClick={() => navigate('/dashboard/pdf-report')}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 shrink-0 cursor-pointer"
            >
              <FileText size={18} />
              PDF Analysis Engine
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-2 rounded-lg border border-gray-200 mb-12 flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder={`Search ${currentLevel === 'STATE' ? 'revenue districts' : currentLevel === 'DISTRICT' ? 'educational districts' : 'schools'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-transparent border-none rounded-md focus:ring-0 text-sm font-medium"
            />
          </div>
          <Dropdown
            ariaLabel="Select School Type"
            value={schoolType}
            onChange={(v) => setSchoolType(v)}
            options={[
              { value: 'ALL', label: 'All Types' },
              { value: 'Government', label: 'Government' },
              { value: 'Aided', label: 'Aided' },
              { value: 'Unaided', label: 'Unaided' },
            ]}
          />
          {exams.length > 0 && (
            <ExamSelect
              exams={exams}
              selectedExamId={selectedExamId}
              onSelect={(id) => setSelectedExamId(id)}
              className="min-w-[160px]"
            />
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
             <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
             {/* Stats Cards */}
             <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <StatCard label="Appeared" value={totals.appeared.toLocaleString()} />
                <StatCard label="Pass" value={totals.pass.toLocaleString()} />
                <StatCard label="Fail" value={(totals.appeared - totals.pass).toLocaleString()} />
                <StatCard label="Full A+" value={totals.fullA.toLocaleString()} />
                <StatCard label="Victory Rate" value={`${avgVictory.toFixed(2)}%`} isPercent />
             </div>

             {/* Table */}
             <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        {getTableHead()}
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredResults.map((row) => (
                          <tr 
                            key={row.id} 
                            onClick={() => handleRowClick(row)}
                            className={cn(
                              "hover:bg-gray-50 transition-colors group",
                              currentLevel !== 'EDUCATIONAL' && "cursor-pointer"
                            )}
                          >
                            <td className="px-8 py-5 text-sm font-medium text-gray-300">{row.slNo}</td>
                            {currentLevel === 'EDUCATIONAL' && (
                              <td className="px-8 py-5 text-sm font-bold text-gray-900 font-mono tracking-tight">{row.code}</td>
                            )}
                            <td className="px-8 py-5 text-sm font-bold text-black group-hover:underline decoration-gray-300 underline-offset-4">{row.name}</td>
                            {currentLevel === 'EDUCATIONAL' && (
                              <td className="px-8 py-5 text-sm font-bold text-gray-400">{row.type?.[0]}</td>
                            )}
                            <td className="px-8 py-5 text-sm font-medium text-gray-600 text-right font-mono tracking-tighter">{row.studentsAppeared.toLocaleString()}</td>
                            <td className="px-8 py-5 text-sm font-medium text-gray-600 text-right font-mono tracking-tighter">{row.pass.toLocaleString()}</td>
                            <td className="px-8 py-5 text-sm font-medium text-red-600 text-right font-mono tracking-tighter">{(row.studentsAppeared - row.pass).toLocaleString()}</td>
                            <td className="px-8 py-5 text-sm font-bold text-black text-right font-mono tracking-tighter">{row.fullAPlus.toLocaleString()}</td>
                            <td className="px-8 py-5 text-right">
                               <span className={cn(
                                 "text-sm font-black font-mono tracking-tighter",
                                 row.victoryPercentage >= 99 ? "text-emerald-600" : 
                                 row.victoryPercentage >= 95 ? "text-slate-900" : "text-amber-600"
                               )}>
                                 {Number(row.victoryPercentage || 0).toFixed(2)}%
                               </span>
                            </td>
                            <td className="px-8 py-5 text-right w-10">
                              {currentLevel !== 'EDUCATIONAL' && (
                                <ArrowRight size={14} className="text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-600 text-white dark:bg-[#1f6feb] font-bold">
                          <td colSpan={currentLevel === 'EDUCATIONAL' ? 4 : 2} className="px-8 py-5 text-[10px] uppercase tracking-[0.2em]">State Total</td>
                          <td className="px-8 py-5 text-sm font-mono tracking-tighter text-right">{totals.appeared.toLocaleString()}</td>
                          <td className="px-8 py-5 text-sm font-mono tracking-tighter text-right">{totals.pass.toLocaleString()}</td>
                          <td className="px-8 py-5 text-sm font-mono tracking-tighter text-right text-red-400">{(totals.appeared - totals.pass).toLocaleString()}</td>
                          <td className="px-8 py-5 text-sm font-mono tracking-tighter text-right">{totals.fullA.toLocaleString()}</td>
                          <td className="px-8 py-5 text-sm font-mono tracking-tighter text-right">{avgVictory.toFixed(2)}%</td>
                          <td></td>
                        </tr>
                      </tfoot>
                   </table>
                </div>
             </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-12 shrink-0">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">2026 © All Rights Recived</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 px-5 py-2 rounded text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50" />
            Live Data Feed from Vijayasree {breadcrumbs[0]?.name || 'Palakkad'}
          </div>
        </div>
      </footer>

    </div>
  );
};

const StatCard = ({ label, value, isPercent }: { label: string, value: string, isPercent?: boolean }) => {
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] transition-all hover:border-black active:scale-[0.98]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400 mb-3">{label}</p>
      <h3 className={cn("text-4xl font-black text-black tracking-tighter", isPercent && "text-black")}>{value}</h3>
    </div>
  );
};

export default StateResultsPage;
