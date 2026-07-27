import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/vsp';

async function clearLanguagesForSchool21063() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const Student = mongoose.connection.collection('students');

  const filter = { schoolCode: '21063' };
  const studentsBefore = await Student.find(filter).toArray();
  console.log(`Found ${studentsBefore.length} students for School 21063 before update.`);

  let updatedCount = 0;

  for (const student of studentsBefore) {
    // Filter subjects array to remove P03 (Second Language) and P04 (Third Language) entries
    const existingSubjects: string[] = student.subjects || [];
    const updatedSubjects = existingSubjects.filter(subj => {
      if (!subj) return false;
      const upper = subj.toUpperCase();
      // Remove second language (P03) and third language (P04)
      if (upper.includes('P03') || upper.includes('P04') || upper.includes('ENGLISH') || upper.includes('HINDI')) {
        return false;
      }
      return true;
    });

    const updateResult = await Student.updateOne(
      { _id: student._id },
      {
        $set: {
          secondLang: '',
          thirdLang: '',
          secondLanguageSubjectId: '',
          thirdLanguageSubjectId: '',
          subjects: updatedSubjects,
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount > 0) {
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} / ${studentsBefore.length} students for School 21063.`);

  // Verify updates
  const studentsAfter = await Student.find(filter).toArray();
  console.log('\n--- VERIFICATION AFTER UPDATE ---');
  let hasSecondLang = 0;
  let hasThirdLang = 0;
  
  studentsAfter.forEach(s => {
    if (s.secondLang && s.secondLang.trim() !== '') hasSecondLang++;
    if (s.thirdLang && s.thirdLang.trim() !== '') hasThirdLang++;
  });

  console.log(`Students with secondLang remaining: ${hasSecondLang}`);
  console.log(`Students with thirdLang remaining: ${hasThirdLang}`);

  if (studentsAfter.length > 0) {
    console.log('\nSample Student After Update:');
    console.log({
      id: studentsAfter[0]._id,
      name: studentsAfter[0].name,
      schoolCode: studentsAfter[0].schoolCode,
      medium: studentsAfter[0].medium,
      firstLangPaper1: studentsAfter[0].firstLangPaper1,
      firstLangPaper2: studentsAfter[0].firstLangPaper2,
      secondLang: studentsAfter[0].secondLang,
      thirdLang: studentsAfter[0].thirdLang,
      subjects: studentsAfter[0].subjects
    });
  }

  await mongoose.disconnect();
}

clearLanguagesForSchool21063().catch(console.error);
