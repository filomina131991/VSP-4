const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://filomina131991:KQ4C4aexfx5mwIUY@ac-l9ryjno-shard-00-00.xud2thb.mongodb.net:27017,ac-l9ryjno-shard-00-01.xud2thb.mongodb.net:27017,ac-l9ryjno-shard-00-02.xud2thb.mongodb.net:27017/vijayasree_palakkad?ssl=true&replicaSet=atlas-5bg85g-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0');
  
  const SubjectSchema = new mongoose.Schema({}, { strict: false });
  const Subject = mongoose.model('Subject', SubjectSchema, 'subjects');
  
  const ExamSchema = new mongoose.Schema({}, { strict: false });
  const Exam = mongoose.model('Exam', ExamSchema, 'exams');

  const activeSubjects = await Subject.find({ active: { $ne: false } }).lean();
  const exams = await Exam.find().lean();
  
  for (const exam of exams) {
      const examMaxMarks = exam.maxMarks || {};
      const uniqueCodes = new Set();
      
      activeSubjects.forEach(s => {
          let maxM = 0;
          if (examMaxMarks instanceof Map) {
             maxM = examMaxMarks.get(s.id) || examMaxMarks.get(s._id?.toString()) || 0;
          } else {
             maxM = examMaxMarks[s.id] || examMaxMarks[s._id?.toString()] || 0;
          }
          if (maxM > 0 && s.code) uniqueCodes.add(s.code);
      });
      if (uniqueCodes.size > 0) {
         console.log(`Exam: ${exam.name}, Unique Codes: ${uniqueCodes.size}`, Array.from(uniqueCodes));
      }
  }
  
  mongoose.connection.close();
}
test().catch(console.error);
