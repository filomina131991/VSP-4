import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/vsp';

async function test() {
  await mongoose.connect(MONGODB_URI);
  const Student = mongoose.connection.collection('students');
  const Subject = mongoose.connection.collection('subjects');
  
  const students = await Student.find({ active: { $ne: false } }).toArray();
  const allSubjects = await Subject.find({ active: { $ne: false } }).toArray();
  
  const mediums = ['Tamil', 'English', 'Malayalam'];

  const countStudentsForLanguageSub = (sub: any, med: string): number => {
    const subId = (sub._id || sub.id || '').toString();
    const subName = ((sub.name || '') as string).toUpperCase().trim();
    const subShort = ((sub.shortName || '') as string).toUpperCase().trim();

    let count = 0;
    students.forEach((st: any) => {
      const stMed = st.medium || '';
      if (med && stMed !== med) return;

      const ids = [st.firstLangPaper1Id, st.firstLangPaper2Id, st.secondLangId, st.thirdLangId].filter(Boolean).map(String);
      if (subId && ids.includes(subId)) {
        count++;
        return;
      }

      const names = [st.firstLangPaper1, st.firstLangPaper2, st.secondLang, st.thirdLang].filter(Boolean).map(s => String(s).toUpperCase().trim());
      if (names.includes(subName) || (subShort && names.includes(subShort))) {
        count++;
        return;
      }
    });
    return count;
  };

  const subjectIdCounts: Record<string, Record<string, number>> = {};
  for (const med of mediums) {
    subjectIdCounts[med] = {};
    allSubjects.forEach((s: any) => {
      const sid = (s._id || s.id || '').toString();
      if (!sid) return;
      const c = (s.code || s.shortName || s.name || '').toUpperCase();
      const isLang = c.match(/\bP0[1-4]\b/) || s.category?.includes('LANGUAGE') || s.paperType?.includes('LANGUAGE');
      if (isLang) {
        subjectIdCounts[med][sid] = countStudentsForLanguageSub(s, med);
      }
    });
  }

  mediums.forEach(med => {
    console.log(`\n--- Non-zero languages for Medium: ${med} ---`);
    allSubjects.forEach((s: any) => {
      const sid = (s._id || s.id || '').toString();
      const cnt = subjectIdCounts[med][sid];
      if (cnt > 0) {
        console.log(`[${cnt}] -> Name: "${s.name}", Short: "${s.shortName}", Code: "${s.code}", Cat: "${s.category}"`);
      }
    });
  });

  await mongoose.disconnect();
}

test().catch(console.error);
