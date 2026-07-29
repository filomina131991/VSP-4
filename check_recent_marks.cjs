const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Mark = mongoose.model('Mark', new Schema({}, { strict: false }));
  
  const marks = await Mark.find({}).sort({ updatedAt: -1 }).limit(10).lean();
  console.log('Recent 10 marks:', marks.map(m => ({
    studentId: m.studentId,
    examId: m.examId,
    subjectId: m.subjectId,
    grade: m.grade,
    updatedAt: m.updatedAt
  })));
  process.exit(0);
});
