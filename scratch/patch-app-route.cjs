const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetImport = `const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));`;
const insertImport = `const EagleViewPage = React.lazy(() => import('./pages/EagleViewPage'));\n`;

if (!content.includes('EagleViewPage')) {
  content = content.replace(targetImport, targetImport + '\n' + insertImport);
}

const targetRoute = `<Route path="home" element={<DashboardPage />} />`;
const insertRoute = `\n                <Route path="eagle-view" element={<EagleViewPage />} />`;

if (!content.includes('path="eagle-view"')) {
  content = content.replace(targetRoute, targetRoute + insertRoute);
}

fs.writeFileSync(path, content, 'utf8');
console.log("Patched App.tsx");
