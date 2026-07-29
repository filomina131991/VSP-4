import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const SubjectSchema = new mongoose.Schema({}, { strict: false });
const Subject = mongoose.model('Subject', SubjectSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  
  const ids = [
    '6a469978d18ee670bd5ea53f',
    '6a469978d18ee670bd5ea546',
    '6a5f756be4f7e0b8ec39fb3e',
    '6a469978d18ee670bd5ea545',
    '6a699cf179e18f19240acbe4'
  ];
  
  const subjects = await Subject.find({ _id: { $in: ids } });
  
  subjects.forEach(s => {
    console.log(`ID: ${s._id}, Name: ${s.get('name')}, ShortName: ${s.get('shortName')}`);
  });
  
  mongoose.disconnect();
}

run();
