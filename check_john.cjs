const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb://127.0.0.1:27017/vsp').then(async () => {
  const Mark = mongoose.model('Mark', new Schema({}, { strict: false }));
  const Student = mongoose.model('Student', new Schema({}, { strict: false }));
  
  const students = await Student.find({ name: /john/i, schoolCode: '12345' }).lean();
  console.log('Students in 12345 named john:', students.map(s => s.name));
  
  if (students.length > 0) {
    const marks = await Mark.find({ studentId: { $in: students.map(s => s._id.toString()) } }).lean();
    console.log('Marks found for John in 12345:', marks.length);
    if (marks.length > 0) {
      console.log('Sample mark:', marks[0]);
    }
  }
  process.exit(0);
});
