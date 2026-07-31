const fs = require('fs');
const path = 'd:/Tamil Vizuthukal App/VSP 4/server.ts';

let content = fs.readFileSync(path, 'utf8');

const targetStr = `app.get("/api/dashboard/district-school-students", async (req: any, res) => {`;

const insertStr = `
app.get("/api/dashboard/entry-eagle-view", async (req: any, res) => {
  try {
    const examId = (req.query.examId as string) || 'exam-1';
    const districtId = req.query.districtId as string | undefined;
    const eduId = req.query.eduId as string | undefined;

    const exam = await Exam.findOne({ id: examId }).lean();
    const examClass = exam?.standard || '10';

    const rawEduDistricts = await EducationalDistrict.find().lean();
    
    let query: any = { role: "SCHOOL" };
    if (eduId && eduId !== 'ALL') {
      query.subDistrictId = eduId;
    } else if (districtId && districtId !== 'ALL') {
      const eduIds = rawEduDistricts.filter((e: any) => e.districtId === districtId).map((e: any) => e.id);
      query.subDistrictId = { $in: eduIds };
    }

    const schoolsList = await School.find(query).lean();
    const schoolIds = schoolsList.map(s => s._id.toString());
    const schoolCodes = schoolsList.map((s: any) => s.schoolCode).filter(Boolean);
    const allIdentifiers = [...schoolIds, ...schoolCodes];
    const schoolObjectIds = schoolIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));

    if (allIdentifiers.length === 0) {
      return res.json({ schools: [] });
    }

    const students = await Student.find({
      className: examClass,
      active: { $ne: false },
      $or: [
        { schoolId: { $in: [...allIdentifiers, ...schoolObjectIds] } },
        { schoolCode: { $in: allIdentifiers } }
      ]
    }, { id: 1, _id: 1, schoolId: 1, schoolCode: 1 }).lean();

    const schoolDataMap: Record<string, any> = {};
    const studentToSchoolMap: Record<string, string> = {};

    schoolsList.forEach(s => {
      schoolDataMap[s._id.toString()] = {
        code: s.schoolCode || s.code || '',
        name: s.name,
        totalStudents: 0,
        subjects: {}
      };
    });

    students.forEach((student: any) => {
      const sid = student.schoolId?.toString() || student.schoolCode?.toString();
      if (!sid) return;
      
      let matchedSchoolId = '';
      if (schoolDataMap[sid]) matchedSchoolId = sid;
      else {
        const matched = schoolsList.find(s => s.schoolCode === sid || s.code === sid || s._id.toString() === sid);
        if (matched) matchedSchoolId = matched._id.toString();
      }

      if (matchedSchoolId) {
        schoolDataMap[matchedSchoolId].totalStudents++;
        const studentId = student.id || student._id.toString();
        studentToSchoolMap[studentId] = matchedSchoolId;
      }
    });

    const marks = await Mark.find({ examId }, { studentId: 1, subjectId: 1, mark: 1, grade: 1, isPresent: 1, isAbsent: 1 }).lean();
    const { idToCode } = await getSubjectMapping();

    marks.forEach((m: any) => {
      const schoolId = studentToSchoolMap[m.studentId];
      if (!schoolId) return;

      const subjectCode = idToCode[m.subjectId?.toString()] || m.subjectId?.toString();
      if (!subjectCode) return;

      const hasMark = m.mark !== undefined && m.mark !== null && String(m.mark).trim() !== '';
      const hasGrade = m.grade !== undefined && m.grade !== null && String(m.grade).trim() !== '';
      if (hasMark || hasGrade || m.isAbsent === true || m.isPresent === true) {
        if (!schoolDataMap[schoolId].subjects[subjectCode]) {
           schoolDataMap[schoolId].subjects[subjectCode] = 0;
        }
        schoolDataMap[schoolId].subjects[subjectCode]++;
      }
    });

    const resultSchools = Object.values(schoolDataMap).filter(s => s.totalStudents > 0);
    resultSchools.sort((a, b) => b.totalStudents - a.totalStudents);

    return res.json({ schools: resultSchools });
  } catch (err) {
    console.error("Error in entry eagle view:", err);
    res.status(500).json({ error: "Failed to fetch eagle view" });
  }
});

`;

if (content.includes(targetStr) && !content.includes("/api/dashboard/entry-eagle-view")) {
    content = content.replace(targetStr, insertStr + targetStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Patched successfully!");
} else {
    console.log("Could not find target string or already patched.");
}
