const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Exam = mongoose.model('Exam', new Schema({}, { strict: false }));
  const exam = await Exam.findOne({ id: 'exam-1784220162797' }).lean();
  
  const Mark = mongoose.model('Mark', new Schema({}, { strict: false }), 'markentries');
  const marks = await Mark.find({ examId: exam.id }).limit(1).lean();
  if (marks.length === 0) { console.log('No marks'); process.exit(0); }
  
  const Student = mongoose.model('Student', new Schema({}, { strict: false }));
  const student = await Student.findOne({ id: marks[0].studentId }).lean();
  
  const School = mongoose.model('School', new Schema({}, { strict: false }));
  const school = await School.findOne({ _id: new mongoose.Types.ObjectId(student.schoolId) }).lean();
  
  console.log('School Name:', school.name);
  process.exit(0);
});
