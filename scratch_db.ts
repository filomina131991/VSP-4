import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const StudentSchema = new mongoose.Schema({
  schoolCode: String,
  schoolId: String,
  medium: String,
  firstLangPaper1: String,
  firstLangPaper2: String,
  firstLangPaper1SubjectId: String,
  firstLangPaper2SubjectId: String,
}, { strict: false });

const Student = mongoose.model('Student', StudentSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  
  const students = await Student.find({ $or: [{ schoolCode: '21026' }, { schoolId: '21026' }] });
  
  console.log(`Found ${students.length} students for school 21026`);
  
  const counts: any = {};
  students.forEach(s => {
    const key = `Medium: ${s.medium}, P1: ${s.firstLangPaper1} (ID: ${s.firstLangPaper1SubjectId}), P2: ${s.firstLangPaper2} (ID: ${s.firstLangPaper2SubjectId})`;
    counts[key] = (counts[key] || 0) + 1;
  });
  
  console.log(counts);
  
  mongoose.disconnect();
}

run();
