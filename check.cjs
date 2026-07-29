const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb://127.0.0.1:27017/vsp').then(async () => {
  const Mark = mongoose.model('Mark', new Schema({}, { strict: false }));
  const Student = mongoose.model('Student', new Schema({}, { strict: false }));
  const Subject = mongoose.model('Subject', new Schema({}, { strict: false }));
  
  const students = await Student.find({ name: /john/i }).lean();
  console.log('Found students:', students.map(s => ({ id: s._id, name: s.name, schoolId: s.schoolId })));
  
  if (students.length > 0) {
    const marks = await Mark.find({ studentId: students[0]._id.toString() }).lean();
    console.log('Marks for', students[0].name, marks.map(m => ({ subjectId: m.subjectId, grade: m.grade, mark: m.mark })));
    
    const subIds = marks.map(m => m.subjectId).filter(Boolean);
    const subs = await Subject.find({ _id: { $in: subIds } }).lean();
    console.log('Subjects:', subs.map(s => ({ id: s._id, shortName: s.shortName, name: s.name })));
  }
  process.exit(0);
});
