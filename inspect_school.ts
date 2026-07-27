import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/vsp';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const Student = db.collection('students');

  const students = await Student.find({ schoolCode: '21063' }).toArray();
  console.log(`Found ${students.length} students for School 21063`);

  const secondLangs = new Set();
  const thirdLangs = new Set();
  const first1s = new Set();
  const first2s = new Set();

  students.forEach(s => {
    secondLangs.add(s.secondLang);
    thirdLangs.add(s.thirdLang);
    first1s.add(s.firstLangPaper1);
    first2s.add(s.firstLangPaper2);
  });

  console.log('Unique firstLangPaper1 values:', Array.from(first1s));
  console.log('Unique firstLangPaper2 values:', Array.from(first2s));
  console.log('Unique secondLang values:', Array.from(secondLangs));
  console.log('Unique thirdLang values:', Array.from(thirdLangs));

  await mongoose.disconnect();
}

main().catch(console.error);
