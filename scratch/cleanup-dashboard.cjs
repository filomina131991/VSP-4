const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/DashboardPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove state
content = content.replace(/const \[isEagleViewModalOpen.*?\n/g, '');
content = content.replace(/const \[eagleViewData.*?\n/g, '');
content = content.replace(/const \[isEagleViewLoading.*?\n/g, '');
content = content.replace(/const \[eagleViewSearch.*?\n/g, '');

// Remove useEffect
const effectStart = `useEffect(() => {
    if (!isEagleViewModalOpen || !selectedExamId) return;`;
const effectEnd = `}, [isEagleViewModalOpen, selectedExamId, selectedDistrict, selectedEduId, refreshKey]);`;

const startIndex = content.indexOf(effectStart);
if (startIndex !== -1) {
  // Find the exact effect end
  const subContent = content.substring(startIndex);
  const endIdx = subContent.indexOf(effectEnd) + effectEnd.length;
  content = content.substring(0, startIndex) + subContent.substring(endIdx);
}

fs.writeFileSync(path, content, 'utf8');
console.log("Cleaned up DashboardPage.tsx");
