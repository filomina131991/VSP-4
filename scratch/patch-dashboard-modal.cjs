const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/DashboardPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state back
const stateInsert = `
  const [isEagleViewModalOpen, setIsEagleViewModalOpen] = useState(false);
  const [eagleViewData, setEagleViewData] = useState<any>(null);
  const [isEagleViewLoading, setIsEagleViewLoading] = useState(false);
  const [eagleViewSearch, setEagleViewSearch] = useState('');
`;

const stateTarget = `const [districtModalGender, setDistrictModalGender] = useState('ALL');`;
if (!content.includes('isEagleViewModalOpen')) {
  content = content.replace(stateTarget, stateTarget + '\\n' + stateInsert);
}

// 2. Add useEffect back
const effectInsert = `
  useEffect(() => {
    if (!isEagleViewModalOpen || !selectedExamId) return;
    const fetchEagleViewData = async () => {
      setIsEagleViewLoading(true);
      try {
        const params = new URLSearchParams({ examId: selectedExamId });
        if (selectedDistrict && selectedDistrict !== 'ALL') params.append('districtId', selectedDistrict);
        if (selectedEduId && selectedEduId !== 'ALL') params.append('eduId', selectedEduId);
        const res = await apiClient.get(\`/dashboard/entry-eagle-view?\${params.toString()}\`);
        setEagleViewData(res.data);
      } catch (err) {
        console.error("Error fetching eagle view data:", err);
      } finally {
        setIsEagleViewLoading(false);
      }
    };
    fetchEagleViewData();
  }, [isEagleViewModalOpen, selectedExamId, selectedDistrict, selectedEduId, refreshKey]);
`;

const effectTarget = `fetchDistrictStudents();
  }, [isDistrictStudentsModalOpen, selectedExamId, selectedDistrict, selectedEduId, refreshKey]);`;

if (!content.includes('fetchEagleViewData = async')) {
  content = content.replace(effectTarget, effectTarget + '\\n' + effectInsert);
}

// 3. Revert onClick on the card
const onClickTarget = `onClick={() => navigate(\`/dashboard/eagle-view?examId=\${selectedExamId}&districtId=\${selectedDistrict}&eduId=\${selectedEduId}\`)}`;
const onClickReplace = `onClick={() => setIsEagleViewModalOpen(true)}`;
if (content.includes(onClickTarget)) {
  content = content.replace(onClickTarget, onClickReplace);
}

// 4. Add full-page overlay modal
const overlayJSX = `
      {isEagleViewModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-[#0d1117] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsEagleViewModalOpen(false)}
                className="p-2 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl text-gray-500 hover:text-cyan-600 hover:border-cyan-200 transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 rounded-xl">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h1 className="text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white leading-tight">ENTRY RATE BREAKDOWN (EAGLE VIEW)</h1>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">MONITOR MARKS ENTRY PROGRESS PER SCHOOL AND SUBJECT</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search schools..."
                  value={eagleViewSearch}
                  onChange={(e) => setEagleViewSearch(e.target.value)}
                  className="w-64 bg-slate-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
              <button onClick={() => setIsEagleViewModalOpen(false)} className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white text-xs font-black rounded-lg hover:bg-gray-700 transition-colors">Close</button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 custom-scrollbar">
            <div className="max-w-[1400px] mx-auto bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl overflow-hidden shadow-sm">
              {isEagleViewLoading ? (
                <div className="p-20 text-center text-sm font-bold text-gray-500 flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  Loading eagle view data...
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-[#1f242c] border-b border-gray-200 dark:border-[#30363d]">
                        <th className="px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center w-12 sticky left-0 bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">#</th>
                        <th className="px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-widest w-28 sticky left-[48px] bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">Code</th>
                        <th className="px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-widest min-w-[250px] sticky left-[160px] bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">School Name</th>
                        <th className="px-4 py-4 text-xs font-black text-indigo-600 uppercase tracking-widest text-center w-32 border-r border-gray-200 dark:border-[#30363d] bg-slate-100 dark:bg-[#1f242c]">Total Students</th>
                        {(eagleViewData?.validSubjects || []).map((p: string) => (
                          <th key={p} className="px-3 py-4 text-[11px] font-black text-cyan-600 uppercase tracking-widest text-center min-w-[80px]">{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
                      {(!eagleViewData?.schools || eagleViewData.schools.length === 0) ? (
                          <tr><td colSpan={4 + (eagleViewData?.validSubjects?.length || 0)} className="p-12 text-center text-sm text-gray-400 font-bold uppercase tracking-widest">No data available for this selection</td></tr>
                      ) : (
                        eagleViewData.schools
                          .filter((s: any) => !eagleViewSearch || s.name.toLowerCase().includes(eagleViewSearch.toLowerCase()) || s.code.includes(eagleViewSearch))
                          .map((s: any, idx: number) => (
                          <tr key={s.code} className="hover:bg-slate-50 dark:hover:bg-[#1f242c]/50 transition-colors group">
                            <td className="px-4 py-3 text-center text-sm text-gray-400 sticky left-0 bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm font-mono font-black text-cyan-600 sticky left-[48px] bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">{s.code}</td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 truncate max-w-[250px] sticky left-[160px] bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]" title={s.name}>{s.name}</td>
                            <td className="px-4 py-3 text-center text-base font-black text-indigo-600 border-r border-gray-100 dark:border-[#30363d]">{s.totalStudents}</td>
                            {(eagleViewData?.validSubjects || []).map((p: string) => {
                              const entered = s.subjects[p] || 0;
                              const total = s.totalStudents;
                              const isComplete = entered >= total;
                              const isPending = entered > 0 && entered < total;
                              
                              return (
                                <td key={p} className="px-3 py-3 text-center border-r border-gray-50 dark:border-[#30363d]/30 last:border-0">
                                  <div className="flex flex-col items-center justify-center gap-1.5" title={\`\${entered} / \${total} marks entered\`}>
                                    <span className={\`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shadow-sm \${
                                      isComplete ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700/50' :
                                      isPending ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/50' :
                                      'bg-red-50 text-red-500 border-red-200 dark:bg-red-900/30 dark:border-red-700/50'
                                    }\`}>
                                      {isComplete ? 'Done' : isPending ? 'Pend' : 'None'}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{entered}/{total}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
`;

const insertionPoint = `      {isDistrictStudentsModalOpen && (`;
if (!content.includes('isEagleViewModalOpen && (')) {
  content = content.replace(insertionPoint, overlayJSX + '\\n' + insertionPoint);
}

fs.writeFileSync(path, content, 'utf8');
console.log("Restored Eagle View Modal to DashboardPage.tsx");
