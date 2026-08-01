const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://filomina131991:KQ4C4aexfx5mwIUY@ac-l9ryjno-shard-00-00.xud2thb.mongodb.net:27017,ac-l9ryjno-shard-00-01.xud2thb.mongodb.net:27017,ac-l9ryjno-shard-00-02.xud2thb.mongodb.net:27017/vijayasree_palakkad?ssl=true&replicaSet=atlas-5bg85g-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0');
  
  const ExamSchema = new mongoose.Schema({}, { strict: false });
  const Exam = mongoose.model('Exam', ExamSchema, 'exams');

  const exam = await Exam.findOne({ status: 'active' }).lean();
  console.log('Exam Name:', exam?.name);
  console.log('maxMarks keys:', Object.keys(exam?.maxMarks || {}));
  console.log('maxMarks values:', exam?.maxMarks);
  
  mongoose.connection.close();
}
test().catch(console.error);
