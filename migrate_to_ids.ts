import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const { ObjectId } = mongoose.Types;

async function runMigration() {
  console.log("Connecting to database...");
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected.");

  const db = mongoose.connection.db;
  if (!db) throw new Error("No db connection");

  console.log("Fetching Subjects and Mediums...");
  const subjects = await db.collection('subjects').find({}).toArray();
  const mediums = await db.collection('mediums').find({}).toArray();

  const getMediumId = (nameOrCode: string) => {
    if (!nameOrCode) return '';
    const upper = nameOrCode.toUpperCase().trim();
    const matched = mediums.find(m => 
      m.id === nameOrCode ||
      (m.name || '').toUpperCase() === upper ||
      (m.shortName || '').toUpperCase() === upper ||
      (m.code || '').toUpperCase() === upper
    );
    if (matched) return matched.id;
    
    // Partial match
    const partial = mediums.find(m => (m.name || '').toUpperCase().includes(upper) || upper.includes((m.name || '').toUpperCase()));
    return partial ? partial.id : '';
  };

  const getSubjectId = (nameOrCode: string) => {
    if (!nameOrCode) return '';
    
    // Check if it's already an ID
    if (mongoose.isValidObjectId(nameOrCode) || nameOrCode.startsWith('sub_') || nameOrCode.length === 24) {
      const isActualId = subjects.find(s => s._id.toString() === nameOrCode || s.id === nameOrCode);
      if (isActualId) return isActualId._id.toString(); 
    }

    let upper = nameOrCode.toUpperCase().trim();
    // Strip out (EM), (MM) etc to match correctly
    upper = upper.replace(/\s*\([EMTK]M\)\s*/g, '').trim();
    upper = upper.replace(/\s*-\s*P0[1-9].*$/i, '').trim();

    const matched = subjects.find(s => 
      s._id.toString() === nameOrCode ||
      (s.name || '').toUpperCase() === upper ||
      (s.shortName || '').toUpperCase() === upper ||
      (s.code || '').toUpperCase() === upper
    );
    if (matched) return matched._id.toString();

    // Partial match
    const partial = subjects.find(s => (s.name || '').toUpperCase().includes(upper) || upper.includes((s.name || '').toUpperCase()));
    return partial ? partial._id.toString() : '';
  };

  console.log("Migrating Teachers...");
  let teacherUpdates = 0;
  const teacherCursor = db.collection('users').find({ role: { $in: ['TEACHER', 'RESOURCE_PERSON'] } });
  while (await teacherCursor.hasNext()) {
    const t = await teacherCursor.next();
    if (!t) continue;
    let changed = false;
    const updatePayload: any = { $set: {}, $unset: {} };

    // Migrate mediums array
    if (t.mediums && Array.isArray(t.mediums)) {
      const mediumIds = Array.from(new Set(t.mediums.map((m: string) => getMediumId(m)).filter(Boolean)));
      updatePayload.$set.mediumIds = mediumIds;
      updatePayload.$unset.mediums = "";
      changed = true;
    }

    // Migrate teachingSubjects
    if (t.teachingSubjects && Array.isArray(t.teachingSubjects)) {
      const teachingSubjectIds = Array.from(new Set(t.teachingSubjects.map((s: string) => getSubjectId(s)).filter(Boolean)));
      updatePayload.$set.teachingSubjectIds = teachingSubjectIds;
      updatePayload.$unset.teachingSubjects = "";
      changed = true;
    }

    // Migrate teacherAssignments
    if (t.teacherAssignments && Array.isArray(t.teacherAssignments)) {
      const newAssignments = t.teacherAssignments.map((a: any) => ({
        className: a.className,
        mediumId: a.mediumId || getMediumId(a.medium),
        subjectId: a.subjectId || getSubjectId(a.subject)
      }));
      updatePayload.$set.teacherAssignments = newAssignments;
      changed = true;
    }

    if (changed) {
      if (Object.keys(updatePayload.$unset).length === 0) delete updatePayload.$unset;
      await db.collection('users').updateOne({ _id: t._id }, updatePayload);
      teacherUpdates++;
    }
  }
  console.log(`Updated ${teacherUpdates} teachers.`);

  console.log("Migrating Students...");
  let studentUpdates = 0;
  const studentCursor = db.collection('students').find({});
  while (await studentCursor.hasNext()) {
    const st = await studentCursor.next();
    if (!st) continue;
    let changed = false;
    const updatePayload: any = { $set: {}, $unset: {} };

    if (st.medium && !st.mediumId) {
      updatePayload.$set.mediumId = getMediumId(st.medium);
      changed = true;
    }
    
    if (st.firstLangPaper1 && !st.firstLangPaper1SubjectId) {
      updatePayload.$set.firstLangPaper1SubjectId = getSubjectId(st.firstLangPaper1);
      changed = true;
    }
    
    if (st.firstLangPaper2 && !st.firstLangPaper2SubjectId) {
      updatePayload.$set.firstLangPaper2SubjectId = getSubjectId(st.firstLangPaper2);
      changed = true;
    }
    
    if (st.secondLang && !st.secondLanguageSubjectId) {
      updatePayload.$set.secondLanguageSubjectId = getSubjectId(st.secondLang);
      changed = true;
    }
    
    if (st.thirdLang && !st.thirdLanguageSubjectId) {
      updatePayload.$set.thirdLanguageSubjectId = getSubjectId(st.thirdLang);
      changed = true;
    }
    
    if (st.subjects && Array.isArray(st.subjects) && st.subjects.length > 0) {
      const subjectIds = Array.from(new Set(st.subjects.map((s: string) => getSubjectId(s)).filter(Boolean)));
      updatePayload.$set.subjectIds = subjectIds;
      updatePayload.$unset.subjects = "";
      changed = true;
    }

    if (changed) {
      if (Object.keys(updatePayload.$unset).length === 0) delete updatePayload.$unset;
      await db.collection('students').updateOne({ _id: st._id }, updatePayload);
      studentUpdates++;
      if (studentUpdates % 1000 === 0) {
         console.log(`Updated ${studentUpdates} students...`);
      }
    }
  }
  console.log(`Updated ${studentUpdates} students total.`);

  console.log("Migrating SchoolExamConfigs...");
  let configUpdates = 0;
  const configCursor = db.collection('schoolexamconfigs').find({});
  while (await configCursor.hasNext()) {
    const c = await configCursor.next();
    if (!c) continue;
    let changed = false;
    const updatePayload: any = { $set: {}, $unset: {} };

    if (c.firstLanguages && Array.isArray(c.firstLanguages)) {
      updatePayload.$set.firstLanguageIds = c.firstLanguages.map((l: string) => getSubjectId(l)).filter(Boolean);
      updatePayload.$unset.firstLanguages = "";
      changed = true;
    }

    if (c.papers && Array.isArray(c.papers)) {
      const newPapers = c.papers.map((p: any) => ({
        ...p,
        subjectIds: p.subjectIds || (p.subjects ? p.subjects.map((s: string) => getSubjectId(s)).filter(Boolean) : [])
      }));
      // Remove string subjects array
      newPapers.forEach((p: any) => { delete p.subjects; });
      updatePayload.$set.papers = newPapers;
      changed = true;
    }

    if (changed) {
      if (Object.keys(updatePayload.$unset).length === 0) delete updatePayload.$unset;
      await db.collection('schoolexamconfigs').updateOne({ _id: c._id }, updatePayload);
      configUpdates++;
    }
  }
  console.log(`Updated ${configUpdates} exam configs.`);

  console.log("Migration Complete.");
  mongoose.disconnect();
}

runMigration().catch(console.error);
