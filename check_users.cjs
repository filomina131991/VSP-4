const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const School = mongoose.model('School', new Schema({}, { strict: false }));
  const User = mongoose.model('User', new Schema({}, { strict: false }));
  
  const users = await User.find({ role: 'SCHOOL' }).lean();
  console.log('School users:', users.map(u => ({ username: u.username, schoolId: u.schoolId })));
  
  const Exam = mongoose.model('Exam', new Schema({}, { strict: false }));
  const exam = await Exam.findOne({ id: 'exam-1784220162797' }).lean();
  console.log('Confirmed subjects keys:', Object.keys(exam.confirmedSubjects || {}));
  
  process.exit(0);
});
