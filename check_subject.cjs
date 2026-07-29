const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Subject = mongoose.model('Subject', new Schema({}, { strict: false }));
  
  const sub = await Subject.findOne({ _id: new mongoose.Types.ObjectId('6a5f757ee4f7e0b8ec39fb3f') }).lean();
  console.log('Subject:', sub);
  process.exit(0);
});
