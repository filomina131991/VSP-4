const fs = require('fs');

function patchMarksEntry(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  // Find all instances of `=== 0` or `!== 0` for subjectMaxMarks
  content = content.replace(/subjectMaxMarks === 0/g, '!subjectMaxMarks');
  content = content.replace(/subjectMaxMarks !== 0/g, '!!subjectMaxMarks');

  fs.writeFileSync(path, content, 'utf8');
  console.log("Patched " + path);
}

function patchSchoolConfig(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  
  // Find all instances of `=== 0` or `!== 0` for eMarks and examMaxMarks
  content = content.replace(/eMarks !== 0/g, '!!eMarks');
  content = content.replace(/examMaxMarks === 0/g, '!examMaxMarks');

  fs.writeFileSync(path, content, 'utf8');
  console.log("Patched " + path);
}

patchMarksEntry('d:/Tamil Vizuthukal App/VSP 4/src/pages/school/MarksEntry2Page2.tsx');
patchMarksEntry('d:/Tamil Vizuthukal App/VSP 4/src/pages/school/MarksEntry2Page.tsx');
patchSchoolConfig('d:/Tamil Vizuthukal App/VSP 4/src/components/school/SchoolExamConfigModal.tsx');
