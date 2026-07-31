const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/server.ts';
let content = fs.readFileSync(path, 'utf8');

const endpoints = [
  'app.post("/api/management/exams", requireRole(\'WEBMASTER\')',
  'app.put("/api/management/exams/:id", requireRole(\'WEBMASTER\')',
  'app.delete("/api/management/exams/:id", requireRole(\'WEBMASTER\')',
  'app.post("/api/management/exams/:id/reset-school", requireRole(\'WEBMASTER\')'
];

endpoints.forEach(endpoint => {
  const newEndpoint = endpoint.replace("requireRole('WEBMASTER')", "requireRole('WEBMASTER', 'DEO', 'DIET')");
  content = content.replace(endpoint, newEndpoint);
});

fs.writeFileSync(path, content, 'utf8');
console.log("Patched server.ts exam endpoints");
