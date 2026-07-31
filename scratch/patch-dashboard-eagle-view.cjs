const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/DashboardPage.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. In table header, remove Code, update School Name
const oldHeader = `<th className="px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-widest w-28 sticky left-[48px] bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">Code</th>
                        <th className="px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-widest min-w-[250px] sticky left-[160px] bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">School Name</th>`;

const newHeader = `<th className="px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-widest min-w-[250px] sticky left-[48px] bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">School Name (Code)</th>`;

content = content.replace(oldHeader, newHeader);

// 2. In tbody, remove Code td, update School Name td
const oldRow = `<td className="px-4 py-3 text-sm font-mono font-black text-cyan-600 sticky left-[48px] bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">{s.code}</td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 truncate max-w-[250px] sticky left-[160px] bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]" title={s.name}>{s.name}</td>`;

const newRow = `<td className="px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 truncate max-w-[250px] sticky left-[48px] bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]" title={\`\${s.name} (\${s.code})\`}>
                              {s.name} <span className="text-gray-400 font-mono text-[10px] ml-1">({s.code})</span>
                            </td>`;

content = content.replace(oldRow, newRow);

// 3. For the subjects, replace `(eagleViewData?.validSubjects || [])` with a filtered list based on maxMarks
const oldSubjectMap = `(eagleViewData?.validSubjects || []).map((p: string)`;
// We need to replace all instances of this
const newSubjectMap = `(eagleViewData?.validSubjects || []).filter((p: string) => !!exams.find(e => e.id === selectedExamId)?.maxMarks?.[p]).map((p: string)`;

content = content.split(oldSubjectMap).join(newSubjectMap);

// Also need to fix colSpan in empty state
const oldColSpan = `colSpan={4 + (eagleViewData?.validSubjects?.length || 0)}`;
const newColSpan = `colSpan={3 + ((eagleViewData?.validSubjects || []).filter((p: string) => !!exams.find(e => e.id === selectedExamId)?.maxMarks?.[p]).length)}`;
content = content.replace(oldColSpan, newColSpan);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched DashboardPage.tsx eagle view");
