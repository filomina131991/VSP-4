import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BarChart2,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import ExamSelect from '../../components/common/ExamSelect';
import Dropdown from '../../components/common/Dropdown';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import PageLoader from '../../components/common/PageLoader';

type ViewMode = 'eduDistricts' | 'schools';
type SchoolType = 'ALL' | 'Government' | 'Aided' | 'Unaided';

interface District {
  id: string;
  name: string;
}

interface EduDistrictResult {
  slNo: number;
  id: string;
  name: string;
  studentsAppeared: number;
  totalStudents?: number;
  pass: number;
  absent?: number;
  fullAPlus: number;
  victoryPercentage: number;
}

interface SchoolResult {
  slNo: number;
  id: string;
  code: string;
  name: string;
  type: string;
  studentsAppeared: number;
  totalStudents?: number;
  pass: number;
  absent?: number;
  fullAPlus: number;
  victoryPercentage: number;
}

interface DrillDownPageProps {
  isEmbedded?: boolean;
  examId?: string;
}

const DrillDownPage: React.FC<DrillDownPageProps> = ({ isEmbedded = false, examId }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('eduDistricts');
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedEduDistrict, setSelectedEduDistrict] = useState<{ id: string; name: string } | null>(null);
  const [schoolType, setSchoolType] = useState<SchoolType>('ALL');

  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState(examId || '');

  const [eduResults, setEduResults] = useState<EduDistrictResult[]>([]);
  const [schoolResults, setSchoolResults] = useState<SchoolResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync selected exam from parent
  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId);
    }
  }, [examId]);

  // Initial data load with strict DEO role scoping
  useEffect(() => {
    const init = async () => {
      try {
        const [distRes, examsRes] = await Promise.all([
          apiClient.get('/management/districts'),
          apiClient.get('/management/exams')
        ]);

        let districtsData = distRes.data || [];
        if (user?.role === 'DEO') {
          const userDist = user?.districtId || 'dist-9';
          districtsData = districtsData.filter((d: any) => d.id === userDist);
        } else {
          districtsData = [{ id: 'ALL', name: 'All Revenue Districts' }, ...districtsData];
        }
        setDistricts(districtsData);

        setExams(examsRes.data || []);
        if (examsRes.data?.length > 0) {
          setSelectedExamId(examId || examsRes.data[0].id);
        }

        const defaultDist = districtsData[0];
        if (defaultDist) {
          setSelectedDistrict(defaultDist);
        } else {
          setIsLoading(false);
        }

        if (examsRes.data?.length === 0) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    };
    init();
  }, [user]);

  const fetchEduDistricts = async (distId: string, examIdParam = selectedExamId, type = schoolType) => {
    if (!examIdParam) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/results/district/${distId}?examId=${examIdParam}&schoolType=${type}`);
      setEduResults(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch educational districts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchools = async (eduId: string, eduName: string, examIdParam = selectedExamId, type = schoolType) => {
    if (!examIdParam) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/results/educational/${eduId}?examId=${examIdParam}&schoolType=${type}`);
      setSchoolResults(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch school results');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDistrict && selectedExamId) {
      if (viewMode === 'eduDistricts') {
        fetchEduDistricts(selectedDistrict.id, selectedExamId, schoolType);
      } else if (selectedEduDistrict) {
        fetchSchools(selectedEduDistrict.id, selectedEduDistrict.name, selectedExamId, schoolType);
      }
    } else {
      setIsLoading(false);
    }
  }, [selectedExamId, schoolType, selectedDistrict?.id]);

  const handleEduDistrictClick = (eduId: string, eduName: string) => {
    setSelectedEduDistrict({ id: eduId, name: eduName });
    setViewMode('schools');
    fetchSchools(eduId, eduName);
  };

  const handleBack = () => {
    if (viewMode === 'schools') {
      setViewMode('eduDistricts');
      setSelectedEduDistrict(null);
      if (selectedDistrict) {
        fetchEduDistricts(selectedDistrict.id);
      }
    }
  };

  const filteredResults = useMemo(() => {
    if (viewMode === 'eduDistricts') {
      return eduResults;
    }
    return schoolResults;
  }, [viewMode, eduResults, schoolResults]);

  const totals = useMemo(() => {
    return filteredResults.reduce((acc, curr) => ({
      appeared: acc.appeared + curr.studentsAppeared,
      totalStudents: acc.totalStudents + (curr.totalStudents ?? curr.studentsAppeared),
      pass: acc.pass + curr.pass,
      absent: acc.absent + (curr.absent || 0),
      fullAPlus: acc.fullAPlus + curr.fullAPlus,
    }), { appeared: 0, totalStudents: 0, pass: 0, absent: 0, fullAPlus: 0 });
  }, [filteredResults]);

  const averageVictory = totals.appeared > 0
    ? ((totals.pass / totals.appeared) * 100).toFixed(2)
    : '0';

  if (isLoading) {
    return <PageLoader label="Loading Result Analysis..." />;
  }

  return (
    <div className={cn("space-y-8 animate-in fade-in duration-500", !isEmbedded && "p-5")}>
      {!isEmbedded ? (
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tighter uppercase flex items-center gap-3">
              <BarChart2 size={32} className="text-indigo-500" />
              Result Analysis
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Revenue District: <span className="font-black text-black dark:text-white uppercase">{selectedDistrict?.name}</span>
              {selectedEduDistrict && (
                <> | Educational District: <span className="font-black text-black dark:text-white uppercase">{selectedEduDistrict.name}</span></>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user?.role !== 'DEO' && districts.length > 1 && !selectedEduDistrict && (
              <Dropdown
                minWidth={140}
                ariaLabel="Select District"
                value={selectedDistrict?.id || ''}
                onChange={(v) => {
                  const dist = districts.find(d => d.id === v);
                  if (dist) setSelectedDistrict(dist);
                }}
                options={districts.map(d => ({ value: d.id, label: d.name }))}
              />
            )}

            <ExamSelect
              exams={exams}
              selectedExamId={selectedExamId}
              onSelect={(id) => setSelectedExamId(id)}
              className="min-w-[160px]"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-[#30363d] pb-4">
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Revenue District: <span className="font-black text-black dark:text-white uppercase">{selectedDistrict?.name}</span>
              {selectedEduDistrict && (
                <> | Educational District: <span className="font-black text-black dark:text-white uppercase">{selectedEduDistrict.name}</span></>
              )}
            </p>
          </div>
          {user?.role !== 'DEO' && !selectedEduDistrict && (
            <Dropdown
              minWidth={140}
              ariaLabel="Select District"
              value={selectedDistrict?.id || 'ALL'}
              onChange={(v) => {
                const dist = districts.find(d => d.id === v);
                if (dist) setSelectedDistrict(dist);
              }}
              options={districts.map(d => ({ value: d.id, label: d.name }))}
            />
          )}
        </div>
      )}

      <div className={cn(
        "min-h-[600px] text-gray-900 dark:text-gray-100",
        !isEmbedded && "bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl overflow-hidden shadow-sm"
      )}>
        {/* Results Section */}
        <div className={cn("space-y-6", !isEmbedded ? "p-6" : "pt-6")}>
          {/* Stats Cards Row - Strict 2 per row count on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-slate-50 dark:bg-[#1f242c]/65 p-4 border border-gray-100 dark:border-[#30363d] rounded-2xl shadow-sm active-tap">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-wider single-line-label">Total Appeared</p>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 single-line-label">{totals.appeared.toLocaleString()}</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl shadow-sm active-tap">
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider single-line-label">Pass</p>
              <div className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-400 mt-1 single-line-label">{totals.pass.toLocaleString()}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 p-4 border border-red-100 dark:border-red-900/40 rounded-2xl shadow-sm active-tap">
              <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider single-line-label">Fail</p>
              <div className="text-xl sm:text-2xl font-black text-red-800 dark:text-red-400 mt-1 single-line-label">{(totals.appeared - totals.pass).toLocaleString()}</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-100 dark:border-amber-900/40 rounded-2xl shadow-sm active-tap">
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider single-line-label">Full A+</p>
              <div className="text-xl sm:text-2xl font-black text-amber-800 dark:text-amber-400 mt-1 single-line-label">{totals.fullAPlus.toLocaleString()}</div>
            </div>
            <div className="bg-sky-50 dark:bg-sky-950/20 p-4 border border-sky-100 dark:border-sky-900/40 rounded-2xl shadow-sm active-tap col-span-2 md:col-span-1">
              <p className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider font-mono single-line-label">Victory Rate</p>
              <div className="text-xl sm:text-2xl font-black text-sky-800 dark:text-sky-400 mt-1 single-line-label">{averageVictory}%</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {viewMode === 'schools' && (
                <button
                  onClick={handleBack}
                  className="border border-gray-200 dark:border-[#30363d] px-3 py-1.5 rounded bg-white dark:bg-[#21262d] text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#30363d] transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  ← Back
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 w-full">
              <div className="flex items-center gap-4 w-full flex-1">
                <div className="h-px bg-blue-500 grow max-w-[40px]" />
                <span className="text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest text-xs whitespace-nowrap">
                  {viewMode === 'eduDistricts' ? 'EDUCATIONAL DISTRICT RESULT' : 'SCHOOL WISE RESULT'}
                </span>
                <div className="h-px bg-blue-500 grow" />
              </div>

              <div className="flex justify-end w-full sm:w-auto">
                <Dropdown
                  minWidth={150}
                  ariaLabel="Select School Type"
                  value={schoolType}
                  onChange={(v) => setSchoolType(v as SchoolType)}
                  options={[
                    { value: 'ALL', label: 'ALL' },
                    { value: 'Government', label: 'Government' },
                    { value: 'Aided', label: 'Aided' },
                    { value: 'Unaided', label: 'Unaided' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-[#30363d] overflow-x-auto rounded-lg">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-[#F8F9FA] dark:bg-[#1a1f26] border-b border-gray-200 dark:border-[#30363d]">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#30363d] w-16">SL No</th>
                  {viewMode === 'eduDistricts' ? (
                    <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#30363d] min-w-[200px]">Educational District</th>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#30363d]">School Code</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#30363d] min-w-[250px]">School Name</th>
                    </>
                  )}
                   <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#30363d]">Students Appeared</th>
                   <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#30363d]">Total Students</th>
                   <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#30363d]">Pass</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#30363d]">Fail</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#30363d]">Absent</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#30363d]">No of Students with Full A+</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300">Victory Percentage (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#30363d]">
                {isLoading ? (
                  <tr>
                    <td colSpan={viewMode === 'eduDistricts' ? 9 : 10} className="px-4 py-8">
                      <PageLoader label="Loading Results" className="min-h-[180px]" />
                    </td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={viewMode === 'eduDistricts' ? 9 : 10} className="px-4 py-8 text-center text-gray-400">No results found</td>
                  </tr>
                ) : (
                  <>
                    {filteredResults.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1f242c]/50">
                        <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-gray-600 dark:text-gray-400">{row.slNo}</td>
                        {viewMode === 'eduDistricts' ? (
                          <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d]">
                            <button
                              onClick={() => handleEduDistrictClick(row.id, row.name)}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-left cursor-pointer"
                            >
                              {row.name}
                            </button>
                          </td>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] font-mono text-gray-700 dark:text-gray-300">{(row as any).code}</td>
                            <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d]">
                              <button className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-left cursor-pointer">
                                {row.name}
                              </button>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-gray-300">{row.studentsAppeared.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-gray-300 font-semibold">{(row.totalStudents ?? row.studentsAppeared).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-gray-300">{row.pass.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-red-600 dark:text-red-400 font-semibold">{(row.studentsAppeared - row.pass).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-orange-600 dark:text-orange-400 font-semibold">{(row.absent || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-gray-300">{row.fullAPlus.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-gray-100">{Number(row.victoryPercentage || 0).toFixed(2)}%</td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-[#f0f2f5] dark:bg-[#1a1f26] font-bold text-gray-900 dark:text-gray-100">
                      <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d]">Totals</td>
                      {viewMode === 'eduDistricts' ? (
                        <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] font-black uppercase tracking-wider text-gray-800 dark:text-gray-200">District Total</td>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d]"></td>
                          <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] font-black uppercase tracking-wider text-gray-800 dark:text-gray-200">School Total</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-gray-100">{totals.appeared.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-gray-100 font-black">{totals.totalStudents.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-gray-100">{totals.pass.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-red-600 dark:text-red-400 font-black">{(totals.appeared - totals.pass).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-orange-600 dark:text-orange-400 font-black">{totals.absent.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs border-r border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-gray-100">{totals.fullAPlus.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-900 dark:text-gray-100 font-black">{averageVictory}%</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrillDownPage;
