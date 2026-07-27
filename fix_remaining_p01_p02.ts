import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vijayasree_palakkad';

async function run() {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db!;
  const studentsCol = db.collection('students');
  const subjectsCol = db.collection('subjects');
  const mediumsCol = db.collection('mediums');

  const allMediums = await mediumsCol.find({}).toArray();
  const medMap: Record<string, string> = {};
  allMediums.forEach(m => {
    const short = (m.shortName || m.code || '').toUpperCase().trim();
    if (m._id) medMap[m._id.toString()] = short;
    if (m.id) medMap[m.id.toString()] = short;
  });

  const getMediumCode = (med: string, medId: string): string => {
    let val = (med || '').toUpperCase().trim();
    if (!val && medId && medMap[medId.toString()]) val = medMap[medId.toString()];
    if (val === 'TAMIL' || val === 'TM' || val.includes('TAMIL')) return 'TM';
    if (val === 'MALAYALAM' || val === 'MM' || val.includes('MALAYALAM')) return 'MM';
    if (val === 'ENGLISH' || val === 'EM' || val.includes('ENGLISH')) return 'EM';
    if (val === 'KANNADA' || val === 'KM' || val.includes('KANNADA')) return 'KM';
    if (val === 'URDU' || val === 'UR' || val.includes('URDU')) return 'UR';
    if (val === 'ARABIC' || val === 'AR' || val.includes('ARABIC')) return 'AR';
    return val || 'TM'; // fallback default to TM if unassigned
  };

  const allSubjects = await subjectsCol.find({ active: { $ne: false } }).toArray();
  
  // Classify P01 and P02 subjects explicitly
  const p01Subs = allSubjects.filter(s => {
    const str = JSON.stringify(s).toUpperCase();
    return str.includes('P01') || str.includes('PAPER I') || str.includes(' AT');
  });
  const p02Subs = allSubjects.filter(s => {
    const str = JSON.stringify(s).toUpperCase();
    return str.includes('P02') || str.includes('PAPER II') || str.includes(' BT');
  });

  console.log('Available P01 Subjects in DB:', p01Subs.map(s => ({ id: (s._id || s.id).toString(), name: s.name, med: s.medium })));
  console.log('Available P02 Subjects in DB:', p02Subs.map(s => ({ id: (s._id || s.id).toString(), name: s.name, med: s.medium })));

  const students = await studentsCol.find({ active: { $ne: false }, $or: [{ firstLangPaper1SubjectId: { $exists: false } }, { firstLangPaper1SubjectId: "" }, { firstLangPaper1SubjectId: null }] }).toArray();
  console.log(`\nRemaining students with unbound P01/P02: ${students.length}`);

  const sampleStrings: Record<string, number> = {};
  students.slice(0, 5000).forEach(st => {
    const k = `P1: "${st.firstLangPaper1}", Med: "${st.medium}" (${getMediumCode(st.medium || '', (st.mediumId || '').toString())})`;
    sampleStrings[k] = (sampleStrings[k] || 0) + 1;
  });
  console.log('Sample unbound combinations:', Object.entries(sampleStrings).slice(0, 10));

  const bulkOps: any[] = [];
  let boundCount = 0;

  for (const st of students) {
    const medCode = getMediumCode(st.medium || '', (st.mediumId || '').toString());
    const p1Str = (st.firstLangPaper1 || '').toUpperCase();
    const p2Str = (st.firstLangPaper2 || '').toUpperCase();

    let p1Match = p01Subs.find(s => {
      const sName = (s.name || '').toUpperCase();
      if (p1Str && (sName.includes(p1Str) || p1Str.includes(sName))) return true;
      // Match by medium keyword
      if (p1Str.includes('TAMIL') && sName.includes('TAMIL') && (sName.includes(medCode) || (s.medium && s.medium.toUpperCase() === medCode))) return true;
      if (p1Str.includes('MALAYALAM') && sName.includes('MALAYALAM') && (sName.includes(medCode) || (s.medium && s.medium.toUpperCase() === medCode))) return true;
      if (p1Str.includes('ARABIC') && sName.includes('ARABIC')) return true;
      if (p1Str.includes('SANSKRIT') && sName.includes('SANSKRIT')) return true;
      if (p1Str.includes('URDU') && sName.includes('URDU')) return true;
      return false;
    }) || p01Subs.find(s => {
      // Fallback match just by language keyword without strict medium code if only one exists
      const sName = (s.name || '').toUpperCase();
      if (p1Str.includes('TAMIL') && sName.includes('TAMIL')) return true;
      if (p1Str.includes('MALAYALAM') && sName.includes('MALAYALAM')) return true;
      if (p1Str.includes('ARABIC') && sName.includes('ARABIC')) return true;
      if (p1Str.includes('SANSKRIT') && sName.includes('SANSKRIT')) return true;
      if (p1Str.includes('URDU') && sName.includes('URDU')) return true;
      return false;
    });

    let p2Match = p02Subs.find(s => {
      const sName = (s.name || '').toUpperCase();
      if (p2Str && (sName.includes(p2Str) || p2Str.includes(sName))) return true;
      if (p2Str.includes('TAMIL') && sName.includes('TAMIL') && (sName.includes(medCode) || (s.medium && s.medium.toUpperCase() === medCode))) return true;
      if (p2Str.includes('MALAYALAM') && sName.includes('MALAYALAM') && (sName.includes(medCode) || (s.medium && s.medium.toUpperCase() === medCode))) return true;
      if (p2Str.includes('ARABIC') && sName.includes('ARABIC')) return true;
      if (p2Str.includes('SANSKRIT') && sName.includes('SANSKRIT')) return true;
      if (p2Str.includes('URDU') && sName.includes('URDU')) return true;
      return false;
    }) || p02Subs.find(s => {
      const sName = (s.name || '').toUpperCase();
      if (p2Str.includes('TAMIL') && sName.includes('TAMIL')) return true;
      if (p2Str.includes('MALAYALAM') && sName.includes('MALAYALAM')) return true;
      if (p2Str.includes('ARABIC') && sName.includes('ARABIC')) return true;
      if (p2Str.includes('SANSKRIT') && sName.includes('SANSKRIT')) return true;
      if (p2Str.includes('URDU') && sName.includes('URDU')) return true;
      return false;
    });

    if (p1Match || p2Match) {
      const updates: any = {};
      if (p1Match && !st.firstLangPaper1SubjectId) {
        updates.firstLangPaper1SubjectId = (p1Match._id || p1Match.id).toString();
        updates.firstLangPaper1Id = (p1Match._id || p1Match.id).toString();
      }
      if (p2Match && (!st.firstLangPaper2SubjectId || !st.firstLangPaper2SubjectId.toString())) {
        updates.firstLangPaper2SubjectId = (p2Match._id || p2Match.id).toString();
        updates.firstLangPaper2Id = (p2Match._id || p2Match.id).toString();
      }
      if (Object.keys(updates).length > 0) {
        bulkOps.push({ updateOne: { filter: { _id: st._id }, update: { $set: updates } } });
        boundCount++;
      }
    }
  }

  console.log(`\nPrepared bulk updates for ${boundCount} students' P01 & P02.`);
  if (bulkOps.length > 0) {
    for (let i = 0; i < bulkOps.length; i += 1000) {
      await studentsCol.bulkWrite(bulkOps.slice(i, i + 1000), { ordered: false });
    }
    console.log('All remaining P01/P02 records bound cleanly!');
  }
  await mongoose.disconnect();
}

run();
