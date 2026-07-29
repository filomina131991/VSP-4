const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Mark = mongoose.model('Mark', new Schema({}, { strict: false }));
  const Student = mongoose.model('Student', new Schema({}, { strict: false }));
  const School = mongoose.model('School', new Schema({}, { strict: false }));
  
  const testSchools = await School.find({ name: /Test School/i }).lean();
  console.log('Test Schools found:', testSchools.map(s => ({ id: s._id, code: s.schoolCode })));
  
  const testSchoolIds = testSchools.map(s => s._id.toString());
  testSchools.forEach(s => {
    if (s.schoolCode) testSchoolIds.push(s.schoolCode);
    if (s.id) testSchoolIds.push(s.id);
  });
  
  const students = await Student.find({ schoolId: { $in: testSchoolIds } }).lean();
  console.log('Students found in Test Schools:', students.map(s => s.name));
  
  if (students.length > 0) {
    const marks = await Mark.find({ studentId: { $in: students.map(s => s._id.toString()) } }).lean();
    console.log('Marks found for these students:', marks.length);
    if (marks.length > 0) {
      console.log('Sample mark:', marks[0]);
    }
  }
  process.exit(0);
});
