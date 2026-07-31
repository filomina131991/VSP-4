const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/DashboardPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Headers
content = content.replace(
  `<th className="px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center w-12 sticky left-0 bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">#</th>`,
  `<th className="px-2 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-8 sticky left-0 bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">#</th>`
);

content = content.replace(
  `<th className="px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-widest min-w-[250px] sticky left-[48px] bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">School Name (Code)</th>`,
  `<th className="px-2 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[180px] sticky left-[32px] bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">School Name (Code)</th>`
);

content = content.replace(
  `<th className="px-4 py-4 text-xs font-black text-indigo-600 uppercase tracking-widest text-center w-32 border-r border-gray-200 dark:border-[#30363d] bg-slate-100 dark:bg-[#1f242c]">Total Students</th>`,
  `<th className="px-2 py-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wider text-center w-20 border-r border-gray-200 dark:border-[#30363d] bg-slate-100 dark:bg-[#1f242c]">Total</th>`
);

content = content.replace(
  `<th key={p} className="px-3 py-4 text-[11px] font-black text-cyan-600 uppercase tracking-widest text-center min-w-[80px]">{p}</th>`,
  `<th key={p} className="px-1 py-2 text-[10px] font-bold text-cyan-600 uppercase tracking-wider text-center min-w-[50px]">{p}</th>`
);

// 2. Data Rows
content = content.replace(
  `<td className="px-4 py-3 text-center text-sm text-gray-400 sticky left-0 bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">{idx + 1}</td>`,
  `<td className="px-2 py-2 text-center text-xs text-gray-400 sticky left-0 bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">{idx + 1}</td>`
);

content = content.replace(
  `<td className="px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 truncate max-w-[250px] sticky left-[48px] bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]" title={\`\${s.name} (\${s.code})\`}>
                              {s.name} <span className="text-gray-400 font-mono text-[10px] ml-1">({s.code})</span>
                            </td>`,
  `<td className="px-2 py-2 text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px] sticky left-[32px] bg-white group-hover:bg-slate-50 dark:bg-[#161b22] dark:group-hover:bg-[#1f242c]/50 transition-colors z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]" title={\`\${s.name} (\${s.code})\`}>
                              {s.name} <span className="text-gray-400 font-mono text-[9px] ml-1">({s.code})</span>
                            </td>`
);

content = content.replace(
  `<td className="px-4 py-3 text-center text-base font-black text-indigo-600 border-r border-gray-100 dark:border-[#30363d]">{s.totalStudents}</td>`,
  `<td className="px-2 py-2 text-center text-[11px] font-bold text-indigo-600 border-r border-gray-100 dark:border-[#30363d]">{s.totalStudents}</td>`
);

// Subject Columns
content = content.replace(
  `<td key={p} className="px-3 py-3 text-center border-r border-gray-50 dark:border-[#30363d]/30 last:border-0">`,
  `<td key={p} className="px-1 py-1 text-center border-r border-gray-50 dark:border-[#30363d]/30 last:border-0">`
);

content = content.replace(
  `<div className="flex flex-col items-center justify-center gap-1.5" title={\`\${entered} / \${total} marks entered\`}>`,
  `<div className="flex flex-col items-center justify-center gap-0.5" title={\`\${entered} / \${total} marks entered\`}>`
);

content = content.replace(
  `span className={\`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shadow-sm \${`,
  `span className={\`text-[9px] font-bold uppercase px-1 py-[1px] rounded-[4px] border shadow-sm leading-none \${`
);

content = content.replace(
  `<span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{entered}/{total}</span>`,
  `<span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none">{entered}/{total}</span>`
);

fs.writeFileSync(path, content, 'utf8');
console.log("Eagle View formatting has been made compact.");
