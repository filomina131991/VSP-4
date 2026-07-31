import mongoose from 'mongoose';
import { Student } from './db.js';

async function fixXDivisions() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vsp';
  await mongoose.connect(uri);

  const initialCount = await Student.countDocuments({ active: { $ne: false } });
  console.log('Current Active Student Count BEFORE fix:', initialCount);

  const xDivisions = ['XA', 'XB', 'XC', 'XD', 'XE', 'XF', 'XG', 'XH', 'XI', 'XJ', 'XK', 'XL'];

  let totalModified = 0;
  for (const xDiv of xDivisions) {
    const targetDiv = xDiv.substring(1); // 'XA' -> 'A'
    const res = await Student.updateMany(
      { active: { $ne: false }, division: xDiv },
      { $set: { division: targetDiv } }
    );
    console.log(`Updated ${xDiv} -> ${targetDiv}: modified ${res.modifiedCount} records.`);
    totalModified += res.modifiedCount;
  }

  const finalCount = await Student.countDocuments({ active: { $ne: false } });
  
  const divisionAgg = await Student.aggregate([
    { $match: { active: { $ne: false } } },
    { $group: { _id: { $ifNull: [ "$division", "MISSING" ] }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  console.log('\n--- UPDATE COMPLETE ---');
  console.log('Total Records Modified:', totalModified);
  console.log('Current Active Student Count AFTER fix:', finalCount);
  console.log('Updated Division Distribution:', JSON.stringify(divisionAgg, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

fixXDivisions().catch(err => {
  console.error(err);
  process.exit(1);
});
