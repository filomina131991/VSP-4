const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const School = mongoose.model('School', new Schema({}, { strict: false }));
  const school = await School.findOne({ name: /Test School/i }).lean();
  console.log('School:', school ? school._id : 'Not found');
  
  const Student = mongoose.model('Student', new Schema({}, { strict: false }));
  const students = await Student.find({ schoolId: school._id.toString() }).lean();
  
  const Exam = mongoose.model('Exam', new Schema({}, { strict: false }));
  const exam = await Exam.findOne({ id: 'exam-1784220162797' }).lean();
  
  const Mark = mongoose.model('Mark', new Schema({}, { strict: false }), 'markentries');
  const marks = await Mark.find({ examId: exam.id, studentId: { $in: students.map(s => s.id) } }).lean();
  console.log('Marks found for Test School in Exam:', marks.length);
  
  process.exit(0);
});
