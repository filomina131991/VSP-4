const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/management/ExamManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// The <input type="number" min="1" max="200" ... for maxMarks appears multiple times
// we should replace all min="1" that are near max="200" and newExamMaxMarks with min="0"

content = content.replace(/min="1"(\s+)max="200"/g, 'min="0"$1max="200"');

fs.writeFileSync(path, content, 'utf8');
console.log("Patched ExamManagementPage.tsx");
