import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vijayasree_palakkad';

async function checkUnboundSchools() {
  try {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db!;
    const students = await db.collection('students').find({ active: { $ne: false } }).toArray();
    
    let totalUnboundP1 = 0;
    let totalUnboundP2 = 0;
    let totalUnboundP3 = 0;
    let totalUnboundP4 = 0;
    
    const schoolsWithMissingIDs = new Set<string>();

    students.forEach(st => {
      const p1Id = st.firstLangPaper1SubjectId || st.firstLangPaper1Id;
      const p2Id = st.firstLangPaper2SubjectId || st.firstLangPaper2Id;
      const p3Id = st.secondLanguageSubjectId || st.secondLangId;
      const p4Id = st.thirdLanguageSubjectId || st.thirdLangId;

      const sch = (st.schoolId || 'UNKNOWN').toString();

      if (!p1Id && st.firstLangPaper1) { totalUnboundP1++; schoolsWithMissingIDs.add(sch); }
      if (!p2Id && st.firstLangPaper2) { totalUnboundP2++; schoolsWithMissingIDs.add(sch); }
      if (!p3Id && st.secondLang) { totalUnboundP3++; schoolsWithMissingIDs.add(sch); }
      if (!p4Id && st.thirdLang) { totalUnboundP4++; schoolsWithMissingIDs.add(sch); }
    });

    console.log(`Total students missing Subject IDs despite having text language names:`);
    console.log(`  P01: ${totalUnboundP1}`);
    console.log(`  P02: ${totalUnboundP2}`);
    console.log(`  P03: ${totalUnboundP3}`);
    console.log(`  P04: ${totalUnboundP4}`);
    console.log(`Number of schools affected: ${schoolsWithMissingIDs.size}`);
    
    if (schoolsWithMissingIDs.size > 0) {
      console.log('Affected School IDs (first 10):', Array.from(schoolsWithMissingIDs).slice(0, 10));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUnboundSchools();
