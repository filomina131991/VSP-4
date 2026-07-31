import dotenv from 'dotenv';
dotenv.config();

import { connectDB, Student, User } from '../db.ts';
import mongoose from 'mongoose';

async function main() {
  await connectDB();

  console.log('\n--- INSPECTING SCHOOL USERS ---');
  const schoolUsers = await User.find({ role: 'SCHOOL' }).lean();
  console.log(`Total School Users in DB: ${schoolUsers.length}`);
  schoolUsers.forEach(u => {
    console.log(`School User: id=${u.id || u._id}, username=${u.username}, schoolCode=${u.schoolCode}, name=${u.name}`);
  });

  console.log('\n--- INSPECTING ALL STUDENTS ---');
  const allStudents = await Student.find({}).lean();
  console.log(`Total Students in DB: ${allStudents.length}`);

  const schoolIdCounts: Record<string, number> = {};
  const schoolCodeCounts: Record<string, number> = {};

  allStudents.forEach(s => {
    const sId = String(s.schoolId || 'NONE');
    const sCode = String(s.schoolCode || 'NONE');
    schoolIdCounts[sId] = (schoolIdCounts[sId] || 0) + 1;
    schoolCodeCounts[sCode] = (schoolCodeCounts[sCode] || 0) + 1;
  });

  console.log('Students grouped by schoolId:', JSON.stringify(schoolIdCounts, null, 2));
  console.log('Students grouped by schoolCode:', JSON.stringify(schoolCodeCounts, null, 2));

  if (allStudents.length > 0) {
    console.log('\nSample Student Record:', {
      id: allStudents[0].id,
      globalId: allStudents[0].globalId,
      name: allStudents[0].name,
      schoolId: allStudents[0].schoolId,
      schoolCode: allStudents[0].schoolCode,
      className: allStudents[0].className,
      division: allStudents[0].division
    });
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});
