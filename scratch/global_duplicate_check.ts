import dotenv from 'dotenv';
dotenv.config();

import { connectDB, Student } from '../db.ts';
import mongoose from 'mongoose';

async function main() {
  await connectDB();

  console.log('\n--- GLOBAL DUPLICATE ADMISSION NUMBER CHECK ---');
  const allStudents = await Student.find({}).lean();
  console.log(`Total active students across database: ${allStudents.length}`);

  const schoolRegMap: Record<string, Record<string, number>> = {};

  allStudents.forEach(s => {
    const sc = String(s.schoolCode || s.schoolId || 'UNKNOWN');
    const reg = String(s.globalId || s.admissionNumber || '').trim();
    if (reg) {
      if (!schoolRegMap[sc]) schoolRegMap[sc] = {};
      schoolRegMap[sc][reg] = (schoolRegMap[sc][reg] || 0) + 1;
    }
  });

  let totalDuplicateRecordsFound = 0;

  Object.keys(schoolRegMap).forEach(sc => {
    let dupCountForSchool = 0;
    Object.keys(schoolRegMap[sc]).forEach(reg => {
      const cnt = schoolRegMap[sc][reg];
      if (cnt > 1) {
        dupCountForSchool += (cnt - 1);
        console.log(`  School '${sc}': Adm No '${reg}' appears ${cnt} times`);
      }
    });
    if (dupCountForSchool > 0) {
      console.log(`School '${sc}' Total Duplicates: ${dupCountForSchool}`);
      totalDuplicateRecordsFound += dupCountForSchool;
    }
  });

  console.log(`\nOverall Duplicate Records across all schools: ${totalDuplicateRecordsFound}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
