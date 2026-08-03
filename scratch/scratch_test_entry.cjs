const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://filomina131991:KQ4C4aexfx5mwIUY@ac-l9ryjno-shard-00-00.xud2thb.mongodb.net:27017,ac-l9ryjno-shard-00-01.xud2thb.mongodb.net:27017,ac-l9ryjno-shard-00-02.xud2thb.mongodb.net:27017/vijayasree_palakkad?ssl=true&replicaSet=atlas-5bg85g-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0');
  
  const SubjectSchema = new mongoose.Schema({}, { strict: false });
  const Subject = mongoose.model('Subject', SubjectSchema, 'subjects');
  const MarkSchema = new mongoose.Schema({}, { strict: false });
  const Mark = mongoose.model('Mark', MarkSchema, 'markentries');
  const ExamSchema = new mongoose.Schema({}, { strict: false });
  const Exam = mongoose.model('Exam', ExamSchema, 'exams');

  const activeSubjects = await Subject.find({ active: { $ne: false } }).lean();
  const exam = await Exam.findOne({ name: /Munnott/i }).lean();
  
  const examMaxMarks = exam?.maxMarks || {};
  const uniqueSubjectCodes = new Set();
  const validSubjectIds = [];
  
  for (const subject of activeSubjects) {
    let maxM = 0;
    if (examMaxMarks instanceof Map) {
      maxM = examMaxMarks.get(subject.id) || examMaxMarks.get(subject._id?.toString()) || examMaxMarks.get(subject.code) || 0;
    } else if (typeof examMaxMarks === 'object') {
      maxM = (examMaxMarks as any)[subject.id] || (examMaxMarks as any)[subject._id?.toString()] || (examMaxMarks as any)[subject.code] || 0;
    }
    if (maxM > 0) {
      if (subject.code) uniqueSubjectCodes.add(subject.code);
      validSubjectIds.push(subject.id);
      if (subject._id) validSubjectIds.push(subject._id.toString());
    }
  }
  
  const validSubjectsCount = uniqueSubjectCodes.size;
  console.log('Unique valid subject codes length:', validSubjectsCount, Array.from(uniqueSubjectCodes));
  
  const markFilter = { examId: exam.id, subjectId: { $in: validSubjectIds } };
  const totalMarkEntries = await Mark.countDocuments(markFilter);
  console.log('total marks:', totalMarkEntries);
  console.log('calculated students:', Math.round(totalMarkEntries / validSubjectsCount));
  
  mongoose.connection.close();
}
test().catch(console.error);
