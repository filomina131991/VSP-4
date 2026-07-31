import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vsp4');
  const db = mongoose.connection.db;

  const sampleMark = await db.collection('marks').findOne({});
  console.log("Sample Mark:");
  console.log(JSON.stringify(sampleMark, null, 2));

  process.exit(0);
}

main().catch(console.error);
