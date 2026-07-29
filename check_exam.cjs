const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Exam = mongoose.model('Exam', new Schema({}, { strict: false }));
  const exam = await Exam.findOne({ id: 'exam-1784220162797' }).lean();
  console.log('Exam:', exam);
  process.exit(0);
});
