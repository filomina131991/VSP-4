const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Subject = mongoose.model('Subject', new Schema({}, { strict: false }));
  
  const sub = await Subject.find({ name: /MALAYALAM AT/i }).lean();
  console.log('Subjects:', sub.map(s => s.shortName));
  process.exit(0);
});
