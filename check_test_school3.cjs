const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const School = mongoose.model('School', new Schema({}, { strict: false }));
  const Student = mongoose.model('Student', new Schema({}, { strict: false }));
  const Mark = mongoose.model('Mark', new Schema({}, { strict: false }));
  const Exam = mongoose.model('Exam', new Schema({}, { strict: false }));
  
  // Find school by name
  const schools = await School.find({ name: /Test School/i }).lean();
  console.log('Schools:', schools.map(s => ({ id: s._id, code: s.schoolCode, name: s.name })));
  
  if (schools.length === 0) {
    // maybe try to find any student named JOHN
    const johns = await Student.find({ name: /john/i }).lean();
    console.log('Found Johns:', johns.length);
    if(johns.length > 0) {
      console.log('Sample John:', johns[0]);
    }
  } else {
    // Find students for this school
    const sId = schools[0]._id.toString();
    const students = await Student.find({ schoolId: sId }).lean();
    console.log('Students in Test School:', students.length);
    
    // Check marks
    if (students.length > 0) {
      const marks = await Mark.find({ studentId: { $in: students.map(s => s._id.toString()) } }).lean();
      console.log('Marks found for Test School students:', marks.length);
    }
  }
  process.exit(0);
});
