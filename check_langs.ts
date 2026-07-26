import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/vsp';

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  
  const Student = mongoose.connection.collection('students');
  const Subject = mongoose.connection.collection('subjects');
  
  const students = await Student.find({ active: { $ne: false } }).toArray();
  console.log(`Found ${students.length} students`);
  
  const langs = new Map();
  students.forEach(s => {
    ['firstLangPaper1', 'firstLangPaper2', 'secondLang', 'thirdLang'].forEach(f => {
      if (s[f]) langs.set(s[f], (langs.get(s[f]) || 0) + 1);
    });
  });
  console.log('Student language counts in DB:', Object.fromEntries(langs));
  
  const subjects = await Subject.find({ active: { $ne: false } }).toArray();
  const langSubs = subjects.filter(s => {
    const c = (s.code || s.shortName || s.name || '').toUpperCase();
    return c.match(/\bP0[1-4]\b/) || s.category?.includes('LANGUAGE') || s.paperType?.includes('LANGUAGE');
  });
  
  console.log('\nLanguage subjects in DB:');
  langSubs.forEach(s => {
    console.log(`ID: ${s._id}, Name: "${s.name}", Short: "${s.shortName}", Code: "${s.code}", Cat: "${s.category}", Medium: "${s.medium}"`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
