const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/DashboardPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Replace the onClick logic
const searchOnClick = `onClick={() => setIsEagleViewModalOpen(true)}`;
const replaceOnClick = `onClick={() => navigate(\`/dashboard/eagle-view?examId=\${selectedExamId}&districtId=\${selectedDistrict}&eduId=\${selectedEduId}\`)}`;
if (content.includes(searchOnClick)) {
  content = content.replace(searchOnClick, replaceOnClick);
}

// 2. Remove the modal JSX
const modalStart = `{isEagleViewModalOpen && (`
const modalEnd = `</Modal>
      )}`;

const startIndex = content.indexOf(modalStart);
if (startIndex !== -1) {
  const endIndex = content.indexOf(modalEnd, startIndex);
  if (endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex + modalEnd.length);
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log("Patched DashboardPage.tsx");
