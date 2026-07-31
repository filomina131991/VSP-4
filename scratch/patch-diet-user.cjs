const fs = require('fs');

const path = 'd:/Tamil Vizuthukal App/VSP 4/src/pages/management/UserManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the condition to allow DIET to select Revenue District
const oldCondition = `{(editingUser?.role === 'DEO' || editingUser?.role === 'SCHOOL') && editingUser?.mainDistrictId && (`;
const newCondition = `{(editingUser?.role === 'DEO' || editingUser?.role === 'SCHOOL' || editingUser?.role === 'DIET') && editingUser?.mainDistrictId && (`;

content = content.replace(oldCondition, newCondition);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated UserManagementPage.tsx");
