const fs = require('fs');

function fixFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  // Find and replace the bad line
  content = content.replace(/typeof getPCode === 'function' \? getPCode\(s\) : undefined/g,
    `(\`\${s.shortName || ''} \${s.name || ''}\`.toUpperCase().match(/P\\d{2}/)?.[0] || s.shortName)`);

  fs.writeFileSync(path, content, 'utf8');
  console.log("Fixed " + path);
}

fixFile('d:/Tamil Vizuthukal App/VSP 4/src/pages/school/MarksEntry2Page2.tsx');
fixFile('d:/Tamil Vizuthukal App/VSP 4/src/pages/school/MarksEntry2Page.tsx');
