const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Subject = mongoose.model('Subject', new Schema({}, { strict: false }));
  
  const sub = await Subject.findOne({ _id: new mongoose.Types.ObjectId('6a469978d18ee670bd5ea53f') }).lean();
  console.log('Subject 1:', sub);
  process.exit(0);
});
