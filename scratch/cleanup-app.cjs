const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/const EagleViewPage.*?\n/g, '');
content = content.replace(/<Route path="eagle-view".*?\n/g, '');

fs.writeFileSync(path, content, 'utf8');
console.log("Removed route from App.tsx");
