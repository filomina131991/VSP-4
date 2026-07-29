const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Exam = mongoose.model('Exam', new mongoose.Schema({}, { strict: false }));
  const exams = await Exam.find().lean();
  console.log(exams.map(e => ({ name: e.name, status: e.status })));
  process.exit(0);
});
