const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/server.ts';

let content = fs.readFileSync(path, 'utf8');

const targetStr = `    if (!statsData) {
      statsData = {
        totalStudents: 0, appeared: 0, pass: 0, fullAPlus: 0, absent: 0, fail: 0, notEntered: 0,
        maleCount: 0, femaleCount: 0, scribeCount: 0,
        basicLevel: 0, averageLevel: 0, profoundLevel: 0,
        gradeDistribution: {}, aPlusBreakdown: {}, victoryPercentage: 0
      };
    }

    const finalResponse = {`;

const newStr = `    if (!statsData) {
      statsData = {
        totalStudents: 0, appeared: 0, pass: 0, fullAPlus: 0, absent: 0, fail: 0, notEntered: 0,
        maleCount: 0, femaleCount: 0, scribeCount: 0,
        basicLevel: 0, averageLevel: 0, profoundLevel: 0,
        gradeDistribution: {}, aPlusBreakdown: {}, victoryPercentage: 0
      };
    }

    try {
      let liveFilter: any = { class: examClass };
      if (effectiveSchoolId) {
        liveFilter.$or = [{ schoolId: effectiveSchoolId }, { schoolCode: effectiveSchoolId }, { schoolId: effectiveSchoolId.toString() }];
      } else if (effectiveEduId) {
        const schoolsInEdu = await School.find({ subDistrictId: effectiveEduId, role: "SCHOOL" }).lean();
        const sIds = schoolsInEdu.map((s: any) => s._id.toString());
        liveFilter.$or = [{ schoolId: { $in: sIds } }, { schoolCode: { $in: sIds } }];
      } else if (effectiveDistrictId && effectiveDistrictId !== 'ALL') {
        const rawEdus = await EducationalDistrict.find({ districtId: effectiveDistrictId }).lean();
        const eduIds = rawEdus.map((e: any) => e.id);
        const schoolsInDist = await School.find({ subDistrictId: { $in: eduIds }, role: "SCHOOL" }).lean();
        const sIds = schoolsInDist.map((s: any) => s._id.toString());
        liveFilter.$or = [{ schoolId: { $in: sIds } }, { schoolCode: { $in: sIds } }];
      }
      
      const actualTotalStudents = await Student.countDocuments(liveFilter);
      if (actualTotalStudents > 0 || effectiveSchoolId) {
        statsData.totalStudents = actualTotalStudents;
      }
    } catch (err) {
      console.error("Error fetching live total students count:", err);
    }

    const finalResponse = {`;

// Normalize line endings to be safe
content = content.replace(/\r\n/g, '\n');
const targetStrNorm = targetStr.replace(/\r\n/g, '\n');

if (content.includes(targetStrNorm)) {
    content = content.replace(targetStrNorm, newStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Patched successfully!");
} else {
    console.log("Could not find target string.");
}
