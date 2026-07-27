import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vijayasree_palakkad';

async function auditAndFixLoophole() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoose.connection.db?.databaseName);
    const db = mongoose.connection.db!;

    const studentsCol = db.collection('students');
    const subjectsCol = db.collection('subjects');
    const configCol = db.collection('schoolexamconfigs');
    const mediumsCol = db.collection('mediums');

    // Load all mediums
    const allMediums = await mediumsCol.find({}).toArray();
    const medMap: Record<string, string> = {};
    allMediums.forEach(m => {
      const short = (m.shortName || m.code || '').toUpperCase().trim();
      if (m._id) medMap[m._id.toString()] = short;
      if (m.id) medMap[m.id.toString()] = short;
    });

    // Load all subjects and index them by ID and also by (pCode/shortName/category + medium)
    const allSubjects = await subjectsCol.find({ active: { $ne: false } }).toArray();
    const subById: Record<string, any> = {};
    allSubjects.forEach(s => {
      const id = (s._id || s.id || '').toString();
      if (id) subById[id] = s;
    });

    console.log('\n--- Auditing Language Subject Assignments Across All Students ---');
    const students = await studentsCol.find({ active: { $ne: false } }).toArray();
    console.log(`Total active students scanned: ${students.length}`);

    let fixedCount = 0;
    let mismatchDetails: Record<string, number> = {};

    // Helper to extract canonical medium code (TM, EM, MM, KM, UR, AR) from a medium string/id
    const getMediumCode = (med: string, medId: string): string => {
      let val = (med || '').toUpperCase().trim();
      if (!val && medId && medMap[medId.toString()]) {
        val = medMap[medId.toString()];
      }
      if (val === 'TAMIL' || val === 'TM' || val.includes('TAMIL')) return 'TM';
      if (val === 'MALAYALAM' || val === 'MM' || val.includes('MALAYALAM')) return 'MM';
      if (val === 'ENGLISH' || val === 'EM' || val.includes('ENGLISH')) return 'EM';
      if (val === 'KANNADA' || val === 'KM' || val.includes('KANNADA')) return 'KM';
      if (val === 'URDU' || val === 'UR' || val.includes('URDU')) return 'UR';
      if (val === 'ARABIC' || val === 'AR' || val.includes('ARABIC')) return 'AR';
      return val;
    };

    // Helper to find correct subject ID for a student's medium
    const findCorrectSubject = (targetPCode: string, keyword: string, medCode: string) => {
      return allSubjects.find(s => {
        const sName = (s.name || '').toUpperCase();
        const sShort = (s.shortName || '').toUpperCase();
        const sCode = (s.code || '').toUpperCase();
        const sMed = getMediumCode(s.medium || '', (s.mediumId || '').toString());
        
        // Match P-code
        const matchP = sName.includes(targetPCode) || sShort.includes(targetPCode) || sCode === targetPCode || s.paperType === targetPCode;
        if (!matchP) return false;

        // Match keyword (e.g. HINDI, ENGLISH) if provided
        if (keyword && !sName.includes(keyword) && !sShort.includes(keyword)) return false;

        // Must match medium exactly
        return sMed === medCode || sName.endsWith(` ${medCode}`) || sName.includes(`-${medCode}`) || sName.includes(` ${medCode} `);
      });
    };

    for (const st of students) {
      const stMedCode = getMediumCode(st.medium || '', (st.mediumId || '').toString());
      if (!stMedCode) continue;

      let studentNeedsUpdate = false;
      const updates: any = {};

      const checkSlot = (slotIdField: string, slotStrField: string, expectedPCode: string, label: string) => {
        const currentId = (st[slotIdField] || '').toString();
        const currentStr = (st[slotStrField] || '').toUpperCase();
        
        if (currentId && subById[currentId]) {
          const sub = subById[currentId];
          const subMedCode = getMediumCode(sub.medium || '', (sub.mediumId || '').toString());
          
          // Check if subject has an explicit medium that contradicts student's medium
          if (subMedCode && subMedCode !== stMedCode && ['TM', 'EM', 'MM', 'KM', 'UR', 'AR'].includes(subMedCode)) {
            const errKey = `Student (${stMedCode}) had ${label}: "${sub.name}" (${subMedCode})`;
            mismatchDetails[errKey] = (mismatchDetails[errKey] || 0) + 1;

            // Extract core name keyword (e.g. ENGLISH or HINDI)
            let keyword = '';
            if (sub.name.toUpperCase().includes('ENGLISH')) keyword = 'ENGLISH';
            else if (sub.name.toUpperCase().includes('HINDI')) keyword = 'HINDI';
            else if (sub.name.toUpperCase().includes('TAMIL')) keyword = 'TAMIL';
            else if (sub.name.toUpperCase().includes('MALAYALAM')) keyword = 'MALAYALAM';

            const correctSub = findCorrectSubject(expectedPCode, keyword, stMedCode);
            if (correctSub) {
              const newId = correctSub._id || correctSub.id;
              updates[slotIdField] = newId.toString();
              // Also correct the string representation if it has wrong medium
              if (currentStr && currentStr.includes(subMedCode) && !currentStr.includes(stMedCode)) {
                updates[slotStrField] = `${correctSub.name} - ${expectedPCode} ${stMedCode}`;
              }
              studentNeedsUpdate = true;
            }
          }
        }
      };

      checkSlot('firstLangPaper1SubjectId', 'firstLangPaper1', 'P01', 'P01 (First Lang I)');
      checkSlot('firstLangPaper2SubjectId', 'firstLangPaper2', 'P02', 'P02 (First Lang II)');
      checkSlot('secondLanguageSubjectId', 'secondLang', 'P03', 'P03 (Second Lang)');
      checkSlot('thirdLanguageSubjectId', 'thirdLang', 'P04', 'P04 (Third Lang)');

      // Check alternative legacy fields too
      checkSlot('secondLangId', 'secondLang', 'P03', 'P03 (Second Lang)');
      checkSlot('thirdLangId', 'thirdLang', 'P04', 'P04 (Third Lang)');

      if (studentNeedsUpdate) {
        await studentsCol.updateOne({ _id: st._id }, { $set: updates });
        fixedCount++;
      }
    }

    console.log('\n=== Loophole Mismatch Discovery Report ===');
    const entries = Object.entries(mismatchDetails);
    if (entries.length === 0) {
      console.log('No medium mismatched subject assignments found!');
    } else {
      entries.forEach(([msg, count]) => {
        console.log(`  [Found ${count} students] -> ${msg}`);
      });
      console.log(`\nSuccessfully fixed and re-aligned subject IDs for ${fixedCount} student records across the database!`);
    }

    // Now clean up SchoolExamConfigs that have subjects not valid for any student in that school
    console.log('\n--- Auditing SchoolExamConfig Mappings ---');
    const configs = await configCol.find({}).toArray();
    for (const cfg of configs) {
      const schId = (cfg.schoolId || '').toString();
      const cfgSubs = cfg.subjects || [];
      const validSubs: any[] = [];
      let cfgModified = false;

      for (const item of cfgSubs) {
        const sid = (item.subjectId || '').toString();
        const sub = subById[sid];
        if (!sub) {
          console.log(`Removing deleted/non-existent subject ID ${sid} from School ${schId} exam config.`);
          cfgModified = true;
          continue;
        }
        validSubs.push(item);
      }

      if (cfgModified) {
        await configCol.updateOne({ _id: cfg._id }, { $set: { subjects: validSubs } });
        console.log(`Updated exam config for School ${schId}.`);
      }
    }

    await mongoose.disconnect();
    console.log('Audit and fix completed successfully.');
  } catch (err) {
    console.error('Error in auditAndFixLoophole:', err);
    process.exit(1);
  }
}

auditAndFixLoophole();
