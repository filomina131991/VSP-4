import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vijayasree_palakkad';

async function runMigration() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoose.connection.db?.databaseName);
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
      return val;
    };

    const allSubjects = await subjectsCol.find({ active: { $ne: false } }).toArray();
    console.log(`Loaded ${allSubjects.length} active subjects from database.`);

    // Helper to identify subject pCode
    const getPCode = (sub: any): string => {
      const fields = [sub.paperType, sub.code, sub.shortName, sub.name];
      for (const f of fields) {
        if (!f) continue;
        const m = String(f).toUpperCase().match(/\b(P\d{2})\b/);
        if (m) return m[1];
      }
      if (sub.category === 'FIRST_LANGUAGE' && (sub.name?.toUpperCase().includes('PAPER I') || sub.name?.toUpperCase().includes(' AT'))) return 'P01';
      if (sub.category === 'FIRST_LANGUAGE' && (sub.name?.toUpperCase().includes('PAPER II') || sub.name?.toUpperCase().includes(' BT'))) return 'P02';
      if (sub.category === 'SECOND_LANGUAGE') return 'P03';
      if (sub.category === 'THIRD_LANGUAGE') return 'P04';
      return '';
    };

    const subjectPool = allSubjects.map(s => ({
      ...s,
      idStr: (s._id || s.id).toString(),
      pCode: getPCode(s),
      medCode: getMediumCode(s.medium || '', (s.mediumId || '').toString()),
      upperName: (s.name || '').toUpperCase().trim(),
      upperShort: (s.shortName || '').toUpperCase().trim()
    }));

    const findBestSubject = (targetPCode: string, textValue: string, stMedCode: string) => {
      if (!textValue && !targetPCode) return null;
      const cleanText = textValue.toUpperCase().replace(/\b(P01|P02|P03|P04|TM|EM|MM|KM|UR|AR)\b/g, '').replace(/[^\w\s]/g, '').trim();

      // Extract core language keyword from student's text string or default based on paper
      const keywords = ['TAMIL', 'MALAYALAM', 'ENGLISH', 'HINDI', 'SANSKRIT', 'ARABIC', 'URDU', 'KANNADA', 'FRENCH'];
      const foundKeyword = keywords.find(k => textValue.toUpperCase().includes(k)) || '';

      // First try: exact match on PCode, keyword, and medium code
      let match = subjectPool.find(s => {
        if (s.pCode !== targetPCode) return false;
        if (foundKeyword && !s.upperName.includes(foundKeyword) && !s.upperShort.includes(foundKeyword)) return false;
        if (s.medCode && s.medCode !== stMedCode && ['TM', 'EM', 'MM', 'KM', 'UR', 'AR'].includes(s.medCode)) return false;
        return s.medCode === stMedCode || s.upperName.endsWith(` ${stMedCode}`) || s.upperName.includes(`-${stMedCode}`);
      });

      // Second try: allow subject without explicit medium restriction if no medium-specific subject exists
      if (!match) {
        match = subjectPool.find(s => {
          if (s.pCode !== targetPCode) return false;
          if (foundKeyword && !s.upperName.includes(foundKeyword) && !s.upperShort.includes(foundKeyword)) return false;
          // Reject if subject is explicitly assigned to ANOTHER medium
          if (s.medCode && s.medCode !== stMedCode && ['TM', 'EM', 'MM', 'KM', 'UR', 'AR'].includes(s.medCode)) return false;
          return true;
        });
      }

      return match || null;
    };

    console.log('Loading active students across all schools...');
    const students = await studentsCol.find({ active: { $ne: false } }).toArray();
    console.log(`Loaded ${students.length} students. Checking bindings...`);

    const bulkOps: any[] = [];
    let updatedCount = 0;
    const stats = { p01Bound: 0, p02Bound: 0, p03Bound: 0, p04Bound: 0 };

    for (const st of students) {
      const stMedCode = getMediumCode(st.medium || '', (st.mediumId || '').toString());
      const updates: any = {};
      let modified = false;

      // Check & fix P01
      const p1Id = (st.firstLangPaper1SubjectId || st.firstLangPaper1Id || '').toString();
      const p1Str = st.firstLangPaper1 || '';
      if (!p1Id && p1Str) {
        const sub = findBestSubject('P01', p1Str, stMedCode);
        if (sub) {
          updates.firstLangPaper1SubjectId = sub.idStr;
          updates.firstLangPaper1Id = sub.idStr;
          stats.p01Bound++;
          modified = true;
        }
      }

      // Check & fix P02
      const p2Id = (st.firstLangPaper2SubjectId || st.firstLangPaper2Id || '').toString();
      const p2Str = st.firstLangPaper2 || '';
      if (!p2Id && p2Str) {
        const sub = findBestSubject('P02', p2Str, stMedCode);
        if (sub) {
          updates.firstLangPaper2SubjectId = sub.idStr;
          updates.firstLangPaper2Id = sub.idStr;
          stats.p02Bound++;
          modified = true;
        }
      }

      // Check & fix P03
      const p3Id = (st.secondLanguageSubjectId || st.secondLangId || '').toString();
      const p3Str = st.secondLang || '';
      if (!p3Id && p3Str) {
        const sub = findBestSubject('P03', p3Str, stMedCode);
        if (sub) {
          updates.secondLanguageSubjectId = sub.idStr;
          updates.secondLangId = sub.idStr;
          stats.p03Bound++;
          modified = true;
        }
      }

      // Check & fix P04
      const p4Id = (st.thirdLanguageSubjectId || st.thirdLangId || '').toString();
      const p4Str = st.thirdLang || '';
      if (!p4Id && p4Str) {
        const sub = findBestSubject('P04', p4Str, stMedCode);
        if (sub) {
          updates.thirdLanguageSubjectId = sub.idStr;
          updates.thirdLangId = sub.idStr;
          stats.p04Bound++;
          modified = true;
        }
      }

      if (modified) {
        bulkOps.push({
          updateOne: {
            filter: { _id: st._id },
            update: { $set: updates }
          }
        });
        updatedCount++;
      }
    }

    console.log(`\nPrepared bulk updates for ${updatedCount} students.`);
    console.log(`Binding breakdown -> P01: +${stats.p01Bound}, P02: +${stats.p02Bound}, P03: +${stats.p03Bound}, P04: +${stats.p04Bound}`);

    if (bulkOps.length > 0) {
      console.log('Executing batch updates in chunks of 1000...');
      for (let i = 0; i < bulkOps.length; i += 1000) {
        const chunk = bulkOps.slice(i, i + 1000);
        await studentsCol.bulkWrite(chunk, { ordered: false });
        console.log(`  Committed ${Math.min(i + 1000, bulkOps.length)} / ${bulkOps.length}`);
      }
      console.log('All student records successfully bound to canonical Subject IDs!');
    } else {
      console.log('No student records needed updates.');
    }

    await mongoose.disconnect();
    console.log('Migration completed cleanly.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

runMigration();
