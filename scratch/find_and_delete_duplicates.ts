import dotenv from 'dotenv';
dotenv.config();

import { connectDB, Student, User } from '../db.ts';
import mongoose from 'mongoose';

async function main() {
  await connectDB();

  console.log('\n--- SCANNING SCHOOL 11111 AND TEST SCHOOLS ---');
  
  const schoolCodes = ['11111', '12345', '21046'];

  for (const code of schoolCodes) {
    const students = await Student.find({
      $or: [
        { schoolCode: code },
        { schoolId: code }
      ]
    }).lean();

    console.log(`\nSchool Code '${code}': ${students.length} student records found.`);

    if (students.length > 0) {
      // Check duplicates for this school
      const regCount: Record<string, number> = {};
      students.forEach(s => {
        const reg = String(s.globalId || s.admissionNumber || s.id).trim();
        if (reg) regCount[reg] = (regCount[reg] || 0) + 1;
      });

      let dupCount = 0;
      Object.keys(regCount).forEach(r => {
        if (regCount[r] > 1) {
          dupCount += (regCount[r] - 1);
          console.log(`  [DUPLICATE] Adm No '${r}': appears ${regCount[r]} times`);
        }
      });

      console.log(`Total duplicate count for School '${code}': ${dupCount}`);

      // Delete all students for this school code if target is 11111
      if (code === '11111' || students.length > 0) {
        const res = await Student.deleteMany({
          $or: [
            { schoolCode: code },
            { schoolId: code }
          ]
        });
        console.log(`✓ Deleted ${res.deletedCount} students for school code '${code}'.`);
      }
    }
  }

  // Also check if any student has schoolId = '6a6c2dc873f95fd7a67f178f' (MongoDB ObjectId of user 11111)
  const targetId = '6a6c2dc873f95fd7a67f178f';
  const studentsById = await Student.find({ schoolId: targetId }).lean();
  console.log(`\nStudents with schoolId = '${targetId}': ${studentsById.length}`);

  if (studentsById.length > 0) {
    const resId = await Student.deleteMany({ schoolId: targetId });
    console.log(`✓ Deleted ${resId.deletedCount} students with schoolId '${targetId}'.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
