const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/DashboardPage.tsx';

let content = fs.readFileSync(path, 'utf8');

const targetStr = `      {isDistrictStudentsModalOpen && (`;

const insertStr = `
      {isEagleViewModalOpen && (
        <Modal 
          isOpen={isEagleViewModalOpen} 
          onClose={() => setIsEagleViewModalOpen(false)}
          title="ENTRY RATE BREAKDOWN (EAGLE VIEW)"
          subtitle="MONITOR MARKS ENTRY PROGRESS PER SCHOOL AND SUBJECT"
          icon={<BookOpen size={20} />}
          fullWidth
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Search/Filter Bar */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-md p-3 border border-gray-200 dark:border-[#30363d] rounded-2xl shadow-sm mb-4">
              <div className="flex items-center gap-3">
                <Filter size={14} className="text-cyan-500" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Filter Schools</span>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by school name or code..."
                    value={eagleViewSearch}
                    onChange={(e) => setEagleViewSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1f242c] border border-gray-200 dark:border-[#30363d] rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 dark:border-[#30363d] rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-[#161b22]">
              {isEagleViewLoading ? (
                <div className="p-12 text-center text-xs font-bold text-gray-500">Loading eagle view data...</div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-[#1f242c] border-b border-gray-200 dark:border-[#30363d]">
                        <th className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-10">#</th>
                        <th className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest w-24">Code</th>
                        <th className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest min-w-[200px]">School Name</th>
                        <th className="px-3 py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">Total Students</th>
                        {['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'].map(p => (
                          <th key={p} className="px-2 py-3 text-[10px] font-black text-cyan-600 uppercase tracking-widest text-center w-20">{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#30363d]">
                      {(!eagleViewData?.schools || eagleViewData.schools.length === 0) ? (
                         <tr><td colSpan={14} className="p-8 text-center text-xs text-gray-400 font-bold uppercase">No data available</td></tr>
                      ) : (
                        eagleViewData.schools
                          .filter((s: any) => !eagleViewSearch || s.name.toLowerCase().includes(eagleViewSearch.toLowerCase()) || s.code.includes(eagleViewSearch))
                          .map((s: any, idx: number) => (
                          <tr key={s.code} className="hover:bg-slate-50 dark:hover:bg-[#1f242c]/50 transition-colors">
                            <td className="px-3 py-2 text-center text-xs text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-2 text-xs font-mono font-black text-cyan-600">{s.code}</td>
                            <td className="px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[250px]" title={s.name}>{s.name}</td>
                            <td className="px-3 py-2 text-center text-sm font-black text-indigo-600">{s.totalStudents}</td>
                            {['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'].map(p => {
                              const entered = s.subjects[p] || 0;
                              const total = s.totalStudents;
                              const isComplete = entered >= total;
                              const isPending = entered > 0 && entered < total;
                              const isNotStarted = entered === 0;
                              return (
                                <td key={p} className="px-2 py-2 text-center">
                                  <div className="flex flex-col items-center justify-center gap-1" title={\`\${entered} / \${total} marks entered\`}>
                                    <span className={\`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border \${
                                      isComplete ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30' :
                                      isPending ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30' :
                                      'bg-red-50 text-red-500 border-red-200 dark:bg-red-900/30'
                                    }\`}>
                                      {isComplete ? 'Done' : isPending ? 'Pend' : 'None'}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400">{entered}/{total}</span>
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
            <div className="flex justify-end pt-2">
               <button onClick={() => setIsEagleViewModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-black rounded-lg transition-colors">Close View</button>
            </div>
          </div>
        </Modal>
      )}

`;

if (content.includes(targetStr) && !content.includes("isEagleViewModalOpen && (")) {
    content = content.replace(targetStr, insertStr + targetStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Patched successfully!");
} else {
    console.log("Could not find target string or already patched.");
}
