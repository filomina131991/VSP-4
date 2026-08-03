const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://filomina131991:KQ4C4aexfx5mwIUY@ac-l9ryjno-shard-00-00.xud2thb.mongodb.net:27017,ac-l9ryjno-shard-00-01.xud2thb.mongodb.net:27017,ac-l9ryjno-shard-00-02.xud2thb.mongodb.net:27017/vijayasree_palakkad?ssl=true&replicaSet=atlas-5bg85g-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0');
  
  const SubjectSchema = new mongoose.Schema({}, { strict: false });
  const Subject = mongoose.model('Subject', SubjectSchema, 'subjects');
  
  const MarkSchema = new mongoose.Schema({}, { strict: false });
  const Mark = mongoose.model('Mark', MarkSchema, 'markentries');
  
  const ExamSchema = new mongoose.Schema({}, { strict: false });
  const Exam = mongoose.model('Exam', ExamSchema, 'exams');

  const activeSubjects = await Subject.find({ active: true }).lean();
  console.log('Total Subject docs (active):', activeSubjects.length);
  
  const uniqueCodes = new Set();
  const exam = await Exam.findOne({ status: 'active' }).lean(); // or whatever exam
  let validCount = 0;
  
  const examMaxMarks = exam?.maxMarks || {};
  activeSubjects.forEach(s => {
      uniqueCodes.add(s.code);
      let maxM = 0;
      if (examMaxMarks instanceof Map) {
         maxM = examMaxMarks.get(s.id) || examMaxMarks.get(s._id?.toString()) || 0;
      } else {
         maxM = examMaxMarks[s.id] || examMaxMarks[s._id?.toString()] || 0;
      }
      if (maxM > 0) validCount++;
  });
  
  console.log('Valid subjects count (unique codes):', uniqueCodes.size);
  console.log('Exam max marks keys length:', Object.keys(examMaxMarks).length);
  
  const totalMarks = await Mark.countDocuments();
  console.log('Total mark entries:', totalMarks);

  mongoose.connection.close();
}
test().catch(console.error);
