import dotenv from 'dotenv';
dotenv.config();

import { connectDB, Student, User } from '../db.ts';
import mongoose from 'mongoose';

async function main() {
  await connectDB();

  const schoolCodeTarget = '11111';
  console.log(`Searching for school with code '${schoolCodeTarget}'...`);

  // Find school user or school ID
  const schoolUser = await User.findOne({ 
    $or: [
      { schoolCode: schoolCodeTarget },
      { username: schoolCodeTarget }
    ] 
  }).lean();

  const schoolId = schoolUser ? String(schoolUser.id || schoolUser._id) : null;
  console.log(`School User found:`, schoolUser ? { id: schoolId, name: schoolUser.name, schoolCode: schoolUser.schoolCode } : 'None');

  // Query filter for students
  const queryFilter: any = {
    $or: [
      { schoolCode: schoolCodeTarget },
      { schoolId: schoolCodeTarget }
    ]
  };
  if (schoolId) {
    queryFilter.$or.push({ schoolId });
  }

  const allStudents = await Student.find(queryFilter).lean();
  console.log(`Total students found for School ${schoolCodeTarget}: ${allStudents.length}`);

  // Count duplicates by globalId / regNo / admissionNumber
  const regNoCountMap: Record<string, number> = {};
  const duplicateRegNos: Record<string, number> = {};

  allStudents.forEach(s => {
    const regNo = String(s.globalId || s.admissionNumber || s.id).trim().toUpperCase();
    if (regNo) {
      regNoCountMap[regNo] = (regNoCountMap[regNo] || 0) + 1;
    }
  });

  let duplicateCountTotal = 0;
  let uniqueRegNosWithDuplicates = 0;

  Object.keys(regNoCountMap).forEach(regNo => {
    const cnt = regNoCountMap[regNo];
    if (cnt > 1) {
      duplicateRegNos[regNo] = cnt;
      duplicateCountTotal += (cnt - 1);
      uniqueRegNosWithDuplicates++;
    }
  });

  console.log('\n--- DUPLICATE REPORT ---');
  console.log(`Total Unique Admission Numbers with Duplicates: ${uniqueRegNosWithDuplicates}`);
  console.log(`Total Excess Duplicate Records: ${duplicateCountTotal}`);
  console.log('Duplicate RegNo Breakdown:', JSON.stringify(duplicateRegNos, null, 2));

  // Perform Delete
  const deleteResult = await Student.deleteMany(queryFilter);
  console.log(`\n✓ Successfully removed ALL ${deleteResult.deletedCount} student records for School ${schoolCodeTarget}.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
