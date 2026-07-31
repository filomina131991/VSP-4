const fs = require('fs');

function fixFrontend() {
  const path = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/DashboardPage.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');
  
  // Revert the frontend filter
  const oldStr = `(eagleViewData?.validSubjects || []).filter((p: string) => !!exams.find(e => e.id === selectedExamId)?.maxMarks?.[p])`;
  const newStr = `(eagleViewData?.validSubjects || [])`;
  
  content = content.split(oldStr).join(newStr);
  
  fs.writeFileSync(path, content, 'utf8');
  console.log("Reverted frontend filter in DashboardPage.tsx");
}

function fixBackend() {
  const path = 'd:/Tamil Vizuthukal App/VSP 4/server.ts';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');
  
  const oldBackend = `    if (exam && exam.maxMarks) {
      const examSubjectIds = Object.keys(exam.maxMarks);
      validSubjects = examSubjectIds.map(id => idToCode[id] || id).filter(Boolean);
      validSubjects = [...new Set(validSubjects)].sort();
    }`;
    
  const newBackend = `    if (exam && exam.maxMarks) {
      const examSubjectIds = Object.keys(exam.maxMarks).filter(id => exam.maxMarks[id] > 0);
      validSubjects = examSubjectIds.map(id => idToCode[id] || id).filter(Boolean);
      validSubjects = [...new Set(validSubjects)].sort();
    }`;

  if (content.includes(oldBackend)) {
    content = content.replace(oldBackend, newBackend);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Applied backend filter in server.ts");
  } else {
    console.log("Could not find backend target in server.ts");
  }
}

fixFrontend();
fixBackend();
