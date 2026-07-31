const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/server.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace the return res.json({ schools: resultSchools });
// with a version that includes validSubjects
const searchStr = `    return res.json({ schools: resultSchools });`;
const replaceStr = `    let validSubjects = [];
    if (exam && exam.maxMarks) {
      const examSubjectIds = Object.keys(exam.maxMarks);
      validSubjects = examSubjectIds.map(id => idToCode[id] || id).filter(Boolean);
      validSubjects = [...new Set(validSubjects)].sort();
    } else {
      // Fallback
      validSubjects = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'];
    }

    return res.json({ schools: resultSchools, validSubjects });`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully patched validSubjects");
} else {
    console.log("Could not find search string");
}
