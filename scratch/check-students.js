import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vsp4');
  const db = mongoose.connection.db;

  const sampleStudent = await db.collection('students').findOne({});
  console.log("Sample Student:");
  console.log(JSON.stringify(sampleStudent, null, 2));

  const totalCount = await db.collection('students').countDocuments({});
  console.log("Total Students in DB:", totalCount);

  // Check how many have schoolId as ObjectId vs string
  const objectIdCount = await db.collection('students').countDocuments({ schoolId: { $type: "objectId" } });
  const stringCount = await db.collection('students').countDocuments({ schoolId: { $type: "string" } });
  console.log("schoolId as ObjectId:", objectIdCount);
  console.log("schoolId as String:", stringCount);

  process.exit(0);
}

main().catch(console.error);
