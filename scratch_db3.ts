import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const SubjectSchema = new mongoose.Schema({}, { strict: false });
const Subject = mongoose.model('Subject', SubjectSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  
  const allSubjects = await Subject.find().lean();
  const subjectNameMap = new Map<string, string>();
  
  allSubjects.forEach((s: any) => {
      const nm = String(s.name).trim().toUpperCase();
      const id = String(s.id || s._id);
      subjectNameMap.set(nm, id);
      subjectNameMap.set(nm.replace(/\s*\([EMTK]M\)\s*/g, '').trim(), id);
  });
  
  console.log('MALAYALAM AT (EM) ->', subjectNameMap.get('MALAYALAM AT (EM)'));
  console.log('MALAYALAM BT (EM) ->', subjectNameMap.get('MALAYALAM BT (EM)'));
  console.log('MALAYALAM AT (MM) ->', subjectNameMap.get('MALAYALAM AT (MM)'));
  console.log('MALAYALAM BT (MM) ->', subjectNameMap.get('MALAYALAM BT (MM)'));
  console.log('TAMIL AT (TM) ->', subjectNameMap.get('TAMIL AT (TM)'));
  
  mongoose.disconnect();
}

run();
