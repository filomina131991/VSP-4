const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/DashboardPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update the layout wrappers for Eagle View Content
const oldWrappers = `{/* Content */}
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
                      <tr className="bg-slate-100 dark:bg-[#1f242c] border-b border-gray-200 dark:border-[#30363d]">`;

const newWrappers = `{/* Content */}
          <div className="flex-1 p-6 flex flex-col min-h-0">
            <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col min-h-0 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl shadow-sm">
              {isEagleViewLoading ? (
                <div className="p-20 text-center text-sm font-bold text-gray-500 flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  Loading eagle view data...
                </div>
              ) : (
                <div className="overflow-auto custom-scrollbar flex-1 rounded-2xl relative">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-slate-100 dark:bg-[#1f242c] border-b border-gray-200 dark:border-[#30363d] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">`;

content = content.replace(oldWrappers, newWrappers);

// 2. Update the TH elements to have appropriate z-index for the top-left intersection
const oldTh1 = `<th className="px-2 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-8 sticky left-0 bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">#</th>`;
const newTh1 = `<th className="px-2 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-8 sticky left-0 top-0 bg-slate-100 dark:bg-[#1f242c] z-30 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">#</th>`;
content = content.replace(oldTh1, newTh1);

const oldTh2 = `<th className="px-2 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[180px] sticky left-[32px] bg-slate-100 dark:bg-[#1f242c] z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">School Name (Code)</th>`;
const newTh2 = `<th className="px-2 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[180px] sticky left-[32px] top-0 bg-slate-100 dark:bg-[#1f242c] z-30 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[#30363d]">School Name (Code)</th>`;
content = content.replace(oldTh2, newTh2);

const oldTh3 = `<th className="px-2 py-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wider text-center w-20 border-r border-gray-200 dark:border-[#30363d] bg-slate-100 dark:bg-[#1f242c]">Total</th>`;
const newTh3 = `<th className="px-2 py-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wider text-center w-20 sticky top-0 border-r border-gray-200 dark:border-[#30363d] bg-slate-100 dark:bg-[#1f242c] z-20">Total</th>`;
content = content.replace(oldTh3, newTh3);

const oldTh4 = `<th key={p} className="px-1 py-2 text-[10px] font-bold text-cyan-600 uppercase tracking-wider text-center min-w-[50px]">{p}</th>`;
const newTh4 = `<th key={p} className="px-1 py-2 text-[10px] font-bold text-cyan-600 uppercase tracking-wider text-center min-w-[50px] sticky top-0 bg-slate-100 dark:bg-[#1f242c] z-20">{p}</th>`;
content = content.replace(oldTh4, newTh4);


fs.writeFileSync(path, content, 'utf8');
console.log("Patched Eagle View for sticky header");
