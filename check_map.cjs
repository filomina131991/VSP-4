const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Exam = mongoose.model('Exam', new Schema({}, { strict: false }));
  const exam = await Exam.findOne({ id: 'exam-1784220162797' }).lean();
  
  const Subject = mongoose.model('Subject', new Schema({}, { strict: false }));
  const subjects = await Subject.find({}).lean();
  const idToCode = {};
  subjects.forEach(s => {
    idToCode[s._id.toString()] = s.shortName || s.code || s.name;
  });
  
  const Mark = mongoose.model('Mark', new Schema({}, { strict: false }), 'markentries');
  const marks = await Mark.find({ examId: exam.id, studentId: 'stud-1785233788839' }).lean(); // John
  
  const studentMarksMap = {};
  marks.forEach(entry => {
    let subjectCode = idToCode[entry.subjectId?.toString()] || entry.subjectId?.toString();
    studentMarksMap[subjectCode] = entry.mark;
  });
  console.log('Student Marks Map:', studentMarksMap);
  process.exit(0);
});
