const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const School = mongoose.model('School', new Schema({}, { strict: false }));
  const Student = mongoose.model('Student', new Schema({}, { strict: false }));
  const Mark = mongoose.model('Mark', new Schema({}, { strict: false }));
  
  const schools = await School.find({ $or: [{ schoolCode: '12345' }, { schoolCode: 12345 }] }).lean();
  console.log('Schools with 12345:', schools.map(s => s.name));
  
  if (schools.length > 0) {
    const students = await Student.find({ schoolId: schools[0]._id.toString() }).lean();
    console.log('Students:', students.map(s => s.name));
    
    if (students.length > 0) {
      const marks = await Mark.find({ studentId: { $in: students.map(s => s._id.toString()) } }).lean();
      console.log('Marks found:', marks.length);
      if (marks.length > 0) {
        console.log('Sample mark:', marks[0]);
      }
    }
  }
  process.exit(0);
});
