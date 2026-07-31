const fs = require('fs');

const path = 'd:/Tamil Vizuthukal App/VSP 4/server.ts';
let content = fs.readFileSync(path, 'utf8');

const oldLogic = `      if (req.user.role === 'DEO' || req.user.role === 'DIET') {
        const deoEdu = req.user.subDistrictId || req.user.eduDistrictId || req.user.eduId;
        if (deoEdu) {
          effectiveEduId = deoEdu;
        } else if (eduId && eduId !== 'ALL') {
          effectiveEduId = eduId;
        } else {
          effectiveDistrictId = req.user.districtId || 'dist-9';
          effectiveEduId = undefined;
        }
      }`;

const newLogic = `      if (req.user.role === 'DEO' || req.user.role === 'DIET') {
        const deoEdu = req.user.role === 'DEO' ? (req.user.subDistrictId || req.user.eduDistrictId || req.user.eduId) : null;
        if (deoEdu) {
          effectiveEduId = deoEdu;
        } else if (eduId && eduId !== 'ALL') {
          effectiveEduId = eduId;
        } else {
          // If DIET user doesn't have districtId, fallback to req.query.districtId
          effectiveDistrictId = req.user.districtId || districtId || 'dist-9';
          effectiveEduId = undefined;
        }
      }`;

if (content.includes(oldLogic)) {
  content = content.replace(oldLogic, newLogic);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated server.ts Dashboard stats API");
} else {
  console.log("Could not find target in server.ts");
}
