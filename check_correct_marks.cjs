const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Mark = mongoose.model('Mark', new Schema({}, { strict: false }), 'markentries');
  const Student = mongoose.model('Student', new Schema({}, { strict: false }));
  
  const johns = await Student.find({ name: /john/i }).lean();
  
  const studentIds = johns.map(j => j.id || j._id.toString());
  
  const marks = await Mark.find({ studentId: { $in: studentIds } }).lean();
  console.log('Marks found for Johns:', marks.length);
  if (marks.length > 0) {
    console.log('Sample mark:', marks[0]);
  }
  process.exit(0);
});
