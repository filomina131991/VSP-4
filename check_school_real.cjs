const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://filomina131991:KQ4C4aexfx5mwIUY@cluster0.xud2thb.mongodb.net/vijayasree_palakkad?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const School = mongoose.model('School', new Schema({}, { strict: false }));
  const school = await School.findOne({ _id: new mongoose.Types.ObjectId('6a421605df4c79f6ee72410a') }).lean();
  console.log('School id:', school.id);
  console.log('School code:', school.schoolCode);
  console.log('School _id:', school._id.toString());
  process.exit(0);
});
