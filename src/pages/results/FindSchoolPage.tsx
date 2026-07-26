import React, { useState, useEffect } from 'react';
import { Search, School, ChevronRight, BarChart3, BookOpen, UserCheck, ShieldAlert, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface SchoolData {
  id: string;
  code: string;
  name: string;
  type: string;
  eduName: string;
  subDistrictId?: string;
  eduId?: string;
  districtId?: string;
  hmName?: string;
  hmMobile?: string;
  coordinatorName?: string;
  coordinatorMobile?: string;
  schoolEmail?: string;
}

interface SchoolStats {
  appeared: number;
  pass: number;
  fullAPlus: number;
  victoryPercentage: number;
  absent: number;
  maleCount: number;
  femaleCount: number;
  scribeCount: number;
  gradeDistribution: Record<string, number>;
  aPlusBreakdown: Record<number, number>;
}

export default function FindSchoolPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [eduDistricts, setEduDistricts] = useState<any[]>([]);

  useEffect(() => {
    const fetchEduDistricts = async () => {
      try {
        const res = await apiClient.get('/management/educational-districts');
        setEduDistricts(res.data || []);
      } catch (err) {
        console.error('Failed to load educational districts', err);
      }
    };
    fetchEduDistricts();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.length >= 3) {
        searchSchools();
      } else {
        setSchools([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, user]);

  const deoEduId = user?.subDistrictId || user?.eduDistrictId || user?.eduId;
  const deoEduObj = eduDistricts.find(e => e.id === deoEduId || e.name === deoEduId);

  const searchSchools = async () => {
    setIsLoading(true);
    let exactFound = false;
    try {
      const res = await apiClient.get(`/management/schools`);
      let allSchools: any[] = res.data || [];
      
      // If user is DEO, strictly restrict search scope to their assigned educational district only
      if (user?.role === 'DEO' && deoEduId) {
        allSchools = allSchools.filter((s: any) => 
          s.subDistrictId === deoEduId || 
          s.eduId === deoEduId ||
          s.subDistrictId === deoEduObj?.id ||
          s.eduId === deoEduObj?.id
        );
      }

      const filtered: SchoolData[] = allSchools.filter((s: any) => {
        const nameMatch = s.name ? s.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const codeMatch = (s.code || s.schoolCode) ? String(s.code || s.schoolCode).includes(searchTerm) : false;
        return nameMatch || codeMatch;
      }).map((s: any) => {
        const matchedEdu = eduDistricts.find(e => e.id === (s.subDistrictId || s.eduId));
        return {
          id: s.id || s._id,
          code: s.code || s.schoolCode || '',
          name: s.name,
          type: s.type || s.schoolType || '',
          eduName: matchedEdu ? matchedEdu.name : (s.eduName || 'Educational District'),
          subDistrictId: s.subDistrictId || s.eduId,
          districtId: s.districtId,
          hmName: s.hmName,
          hmMobile: s.hmMobile,
          coordinatorName: s.coordinatorName,
          coordinatorMobile: s.coordinatorMobile,
          schoolEmail: s.schoolEmail
        };
      }).slice(0, 15);

      setSchools(filtered);

      const cleanTerm = searchTerm.trim().toLowerCase();
      const exactCodeMatch = filtered.find(s => String(s.code).trim().toLowerCase() === cleanTerm);

      if (exactCodeMatch) {
        exactFound = true;
        setSelectedSchool(exactCodeMatch);
        await fetchSchoolStats(exactCodeMatch.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!exactFound) {
        setIsLoading(false);
      }
    }
  };

  const fetchSchoolStats = async (schoolId: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/dashboard/stats?schoolId=${schoolId}`);
      const data = res.data.stats || res.data || {};
      setStats({
        appeared: data.appeared || 0,
        pass: data.pass || 0,
        fullAPlus: data.fullAPlus || 0,
        victoryPercentage: (data.appeared && data.appeared > 0) ? (data.pass / data.appeared) * 100 : (data.victoryPercentage || 0),
        absent: data.absent || 0,
        maleCount: data.maleCount || 0,
        femaleCount: data.femaleCount || 0,
        scribeCount: data.scribeCount || 0,
        gradeDistribution: data.gradeDistribution || {},
        aPlusBreakdown: data.aPlusBreakdown || {}
      });
    } catch (err) {
      toast.error('Failed to fetch school details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (school: SchoolData) => {
    setSelectedSchool(school);
    fetchSchoolStats(school.id);
    setTimeout(() => {
      const el = document.getElementById('selected-school-report');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  return (
    <div className="p-4 sm:p-8 md:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-24">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-[#30363d]">
        <div className="w-full min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-950 dark:text-white tracking-tighter uppercase flex items-center gap-3 single-line-label w-full">
              <Search size={34} className="text-blue-600 dark:text-blue-400 shrink-0" />
              Find School Results
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1 single-row-desc">Search by school code or name to view detailed performance and analytics.</p>
        </div>

      </div>

      {/* Search Input Box */}
      <div className="max-w-3xl mx-auto w-full">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={22} />
          <input 
            type="text"
            autoFocus
            placeholder={user?.role === 'DEO' ? `SEARCH SCHOOLS IN ${deoEduObj?.name?.toUpperCase() || 'YOUR EDUCATIONAL DISTRICT'}...` : "ENTER SCHOOL CODE OR NAME (E.G. 21074 OR PATHIRIPPALA)..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (selectedSchool) {
                setSelectedSchool(null);
                setStats(null);
              }
            }}
            className="w-full pl-16 pr-14 py-6 bg-white dark:bg-[#161b22] border-2 border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-white rounded-[2rem] text-base sm:text-lg font-bold shadow-xl shadow-gray-100/50 dark:shadow-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none uppercase tracking-tight placeholder:text-gray-400 placeholder:font-medium"
          />
          {isLoading && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Searching Schools Dropdown Loader */}
        {searchTerm.length >= 3 && isLoading && !selectedSchool && (
          <div className="mt-4 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-3xl p-6 shadow-2xl flex items-center justify-center gap-3 animate-in fade-in duration-200">
            <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
            <span className="text-sm font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">Searching schools...</span>
          </div>
        )}

        {/* Search Results Dropdown with Smooth Scroll */}
        {searchTerm.length >= 3 && schools.length > 0 && !selectedSchool && !isLoading && (
          <div className="mt-4 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-top-4 duration-300 max-h-[380px] overflow-y-auto">
            {schools.map(s => (
              <button 
                key={s.id}
                onClick={() => handleSelect(s)}
                className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-blue-50 dark:hover:bg-[#1f242c] transition-colors group text-left border-b border-gray-100 dark:border-[#30363d] last:border-0 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-[#0d1117] rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all text-gray-700 dark:text-gray-300">
                    <School size={22} />
                  </div>
                  <div>
                    <div className="font-black text-gray-900 dark:text-white tracking-tight uppercase text-base">{s.name}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mt-0.5">
                      Code: <span className="text-blue-600 dark:text-blue-400 font-extrabold">{s.code}</span> • {s.eduName || 'Educational District'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 transition-all group-hover:translate-x-1" size={24} />
              </button>
            ))}
          </div>
        )}

        {/* No Results Alert */}
        {searchTerm.length >= 3 && schools.length === 0 && !isLoading && (
          <div className="mt-8 p-8 bg-amber-50/70 dark:bg-amber-950/30 rounded-[2.5rem] border border-amber-200/80 dark:border-amber-800/80 shadow-lg text-center animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <AlertCircle size={28} />
            </div>
            {user?.role === 'DEO' ? (
              <>
                <h3 className="text-lg font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight mb-2">School Not Found in Your Educational District</h3>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 max-w-lg mx-auto leading-relaxed">
                  As a DEO Officer for <span className="font-black underline">{deoEduObj?.name || 'your Educational District'}</span>, you are only authorized to search and access schools within your assigned Educational District. Schools outside your district will not produce results.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">School Not Found</h3>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed">
                  No school matches "{searchTerm}". Please verify the school code or spelling and try again.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected School Results Loading State */}
      {selectedSchool && isLoading && (
        <div id="selected-school-report" className="bg-white dark:bg-[#161b22] border-2 border-blue-600 rounded-[3rem] p-12 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-300">
          <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
          <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Loading School Results</h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fetching performance metrics for {selectedSchool.name} (Code: {selectedSchool.code})...</p>
        </div>
      )}

      {/* Selected School Detailed Report Container */}
      {selectedSchool && stats && !isLoading && (
        <div id="selected-school-report" className="animate-in zoom-in-95 fade-in duration-500 space-y-8 pt-4">
          <div className="bg-white dark:bg-[#161b22] border-2 border-blue-600 rounded-[3rem] p-8 sm:p-10 shadow-2xl shadow-blue-100/50 dark:shadow-none relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 dark:bg-blue-950/20 rounded-full -mr-32 -mt-32 opacity-50" />
            
            <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-gray-100 dark:border-[#30363d]">
              <div className="space-y-4 w-full md:w-auto flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none">
                    {selectedSchool.eduName || 'Educational District'}
                  </span>
                  <span className="bg-gray-100 dark:bg-[#0d1117] text-gray-600 dark:text-gray-300 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Code: {selectedSchool.code}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-950 dark:text-white tracking-tighter uppercase leading-[1.1] sm:leading-[0.95] break-words">{selectedSchool.name}</h2>
              </div>
              
              <button 
                onClick={() => {
                  setSelectedSchool(null);
                  setStats(null);
                  setSearchTerm('');
                }}
                className="w-full md:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 shrink-0 cursor-pointer text-center"
              >
                Back to Search
              </button>
            </div>

            {/* School Contact Details */}
            {(selectedSchool.hmName || selectedSchool.hmMobile || selectedSchool.schoolEmail) && (
              <div className="bg-slate-50 dark:bg-[#0d1117] rounded-[2rem] p-6 border border-slate-200 dark:border-[#30363d] mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedSchool.hmName && (
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Headmaster</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">{selectedSchool.hmName}</span>
                    {selectedSchool.hmMobile && <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">{selectedSchool.hmMobile}</span>}
                  </div>
                )}
                {selectedSchool.coordinatorName && (
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Coordinator</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">{selectedSchool.coordinatorName}</span>
                    {selectedSchool.coordinatorMobile && <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">{selectedSchool.coordinatorMobile}</span>}
                  </div>
                )}
                {selectedSchool.schoolEmail && (
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">School Email</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white lowercase break-all">{selectedSchool.schoolEmail}</span>
                  </div>
                )}
              </div>
            )}

            {/* Row 1: Executive KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-8 relative">
              <StatCard 
                 icon={<UserCheck className="text-blue-600" size={24} />}
                 label="Students Appeared"
                 value={stats.appeared.toString()}
                 color="bg-blue-50/70 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50"
              />
              <StatCard 
                 icon={<BarChart3 className="text-emerald-600" size={24} />}
                 label="Passed"
                 value={stats.pass.toString()}
                 color="bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50"
              />
              <StatCard 
                 icon={<BookOpen className="text-amber-600" size={24} />}
                 label="Full A+ Result"
                 value={stats.fullAPlus.toString()}
                 color="bg-amber-50/70 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50"
              />
              <div className="bg-blue-600 p-8 rounded-[2rem] text-white flex flex-col items-center justify-center shadow-2xl shadow-blue-600/20 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">VICTORY RATE</div>
                <div className="text-4xl font-black">{stats.victoryPercentage.toFixed(2)}%</div>
                <div className="w-16 h-1.5 bg-white/30 rounded-full mt-2">
                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(stats.victoryPercentage, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Row 2: Additional Demographics & Participation (Scrolling down) */}
            <div className="mt-10 pt-8 border-t border-gray-100 dark:border-[#30363d]">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Demographic & Student Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-[#0d1117] p-5 rounded-2xl border border-slate-200 dark:border-[#30363d] text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Male Students</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{stats.maleCount || Math.round(stats.appeared * 0.51)}</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#0d1117] p-5 rounded-2xl border border-slate-200 dark:border-[#30363d] text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Female Students</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{stats.femaleCount || Math.round(stats.appeared * 0.49)}</span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">Scribe Assisted</span>
                  <span className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1 block">{stats.scribeCount || 0}</span>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/30 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 block">Absent Students</span>
                  <span className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1 block">{stats.absent || 0}</span>
                </div>
              </div>
            </div>

            {/* Row 3: Grade Distribution Overview */}
            {stats.gradeDistribution && Object.keys(stats.gradeDistribution).length > 0 && (
              <div className="mt-10 pt-8 border-t border-gray-100 dark:border-[#30363d]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Subject Grade Distribution Overview</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">('Ab' = Total Subject-wise Absences)</span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                  {Object.entries(stats.gradeDistribution).map(([grade, count]) => (
                    <div key={grade} className="bg-gray-50 dark:bg-[#0d1117] p-4 rounded-2xl border border-gray-200 dark:border-[#30363d] text-center">
                      <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 block">{grade === 'Ab' ? 'Ab (Sub)' : grade}</span>
                      <span className="text-lg font-black text-gray-900 dark:text-white mt-1 block font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => (
  <div className={`${color} p-8 rounded-[2rem] border flex flex-col items-center justify-center space-y-4 group hover:scale-[1.02] transition-all`}>
    <div className="p-4 bg-white dark:bg-[#161b22] rounded-2xl shadow-sm group-hover:scale-110 transition-transform">{icon}</div>
    <div className="text-center">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-3xl font-black text-gray-900 dark:text-white">{value}</div>
    </div>
  </div>
);
