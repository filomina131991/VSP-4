import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const StudentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.model('Student', StudentSchema);

const SubjectSchema = new mongoose.Schema({}, { strict: false });
const Subject = mongoose.model('Subject', SubjectSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  
  const allSubjects = await Subject.find().lean();
  const subjectNameMap = new Map<string, string>();
  const subjectIdMap = new Map<string, any>();
  
  allSubjects.forEach((s: any) => {
      const nm = String(s.name).trim().toUpperCase();
      const id = String(s.id || s._id);
      subjectNameMap.set(nm, id);
      subjectIdMap.set(id, s);
  });
  
  // Do NOT populate stripped names to avoid conflicts.
  // Wait, if a student has "MALAYALAM AT", we DO want it to resolve to the (MM) or (EM) version depending on their medium!
  // Since we are just fixing exact matches or totally broken matches, let's also add a fallback mapping per medium.
  
  const students = await Student.find({}).lean();
  console.log(`Found ${students.length} students to process.`);
  
  const bulkOps = [];
  
  for (const st of students) {
      let needsUpdate = false;
      const updateData: any = {};
      
      const checkAndFix = (nameField: string, idField: string) => {
          const name = st[nameField] ? String(st[nameField]).trim().toUpperCase() : '';
          const currentId = st[idField];
          
          if (!name) {
              if (currentId) {
                  updateData[idField] = '';
                  needsUpdate = true;
              }
              return;
          }
          
          // 1. Exact match
          let matchedId = subjectNameMap.get(name);
          
          // 2. Fallback: if name doesn't have bracket, append bracket based on medium
          if (!matchedId && st.medium) {
              const medCode = st.medium.toUpperCase().includes('MALAYALAM') ? 'MM' : 
                              st.medium.toUpperCase().includes('TAMIL') ? 'TM' : 
                              st.medium.toUpperCase().includes('KANNADA') ? 'KM' : 'EM';
              matchedId = subjectNameMap.get(`${name} (${medCode})`);
          }
          
          // 3. Fallback: just strip brackets from subjects and match
          if (!matchedId) {
             for (const [nm, id] of subjectNameMap.entries()) {
                 if (nm.replace(/\s*\([EMTK]M\)\s*/g, '').trim() === name.replace(/\s*\([EMTK]M\)\s*/g, '').trim()) {
                     matchedId = id;
                     break;
                 }
             }
          }
          
          if (matchedId && matchedId !== currentId) {
              // Ensure it's not a case where currentId actually has the exact same name
              const currentSubject = currentId ? subjectIdMap.get(currentId) : null;
              const currentSubjectName = currentSubject ? String(currentSubject.name).toUpperCase().trim() : '';
              
              if (currentSubjectName !== name) {
                  updateData[idField] = matchedId;
                  needsUpdate = true;
              }
          }
      };
      
      checkAndFix('firstLangPaper1', 'firstLangPaper1SubjectId');
      checkAndFix('firstLangPaper2', 'firstLangPaper2SubjectId');
      checkAndFix('secondLang', 'secondLanguageSubjectId');
      checkAndFix('thirdLang', 'thirdLanguageSubjectId');
      
      if (needsUpdate) {
          bulkOps.push({
              updateOne: {
                  filter: { _id: st._id },
                  update: { $set: updateData }
              }
          });
      }
  }
  
  if (bulkOps.length > 0) {
      console.log(`Updating ${bulkOps.length} students...`);
      const res = await Student.bulkWrite(bulkOps);
      console.log(`Modified: ${res.modifiedCount}`);
  } else {
      console.log('No students needed updates.');
  }
  
  mongoose.disconnect();
}

run().catch(console.error);
