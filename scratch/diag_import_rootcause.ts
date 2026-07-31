import dotenv from 'dotenv';
dotenv.config();

import { connectDB, Student } from '../db.ts';
import mongoose from 'mongoose';

async function main() {
  await connectDB();
  const conn = mongoose.connection;

  console.log('\n=== DIAG 1: Students collection statistics (READ-ONLY) ===');
  const total = await Student.countDocuments();
  console.log('Total students in DB:', total);

  const agg = await Student.aggregate([
    { $group: { _id: { schoolId: '$schoolId', schoolCode: '$schoolCode' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).allowDiskUse(true);
  console.log('Grouped by schoolId+schoolCode (top 15):');
  agg.slice(0, 15).forEach(g => console.log('  ', JSON.stringify(g._id), '->', g.count));

  console.log('\n=== DIAG 2: Check uniqueId vs schoolCode+globalId consistency ===');
  const mismatched = await Student.aggregate([
    { $project: {
        globalId: 1, uniqueId: 1, schoolCode: 1, schoolId: 1, academicYear: 1, id: 1,
        expectedUnique: { $concat: [{ $ifNull: ['$schoolCode', ''] }, { $ifNull: ['$globalId', ''] }] }
      }
    },
    { $match: { $expr: { $ne: ['$uniqueId', '$expectedUnique'] } } },
    { $limit: 5 }
  ]).allowDiskUse(true);
  console.log('Sample rows where uniqueId !== schoolCode+globalId:', mismatched.length, 'shown below');
  mismatched.forEach(m => console.log('  ', JSON.stringify({ id: m.id, globalId: m.globalId, uniqueId: m.uniqueId, schoolCode: m.schoolCode, schoolId: m.schoolId, ay: m.academicYear })));

  const mismatchCount = await Student.aggregate([
    { $project: { expectedUnique: { $concat: [{ $ifNull: ['$schoolCode', ''] }, { $ifNull: ['$globalId', ''] }] } } },
    { $match: { $expr: { $ne: ['$uniqueId', '$expectedUnique'] } } },
    { $count: 'n' }
  ]).allowDiskUse(true);
  console.log('Total rows where uniqueId !== schoolCode+globalId:', mismatchCount[0]?.n ?? 0);

  console.log('\n=== DIAG 3: Potential duplicate keys on compound index (globalId+schoolId+academicYear) ===');
  const dups = await Student.aggregate([
    { $group: { _id: { globalId: '$globalId', schoolId: '$schoolId', academicYear: '$academicYear' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $count: 'groups' }
  ]).allowDiskUse(true);
  console.log('Duplicate compound-index groups in DB:', dups[0]?.groups ?? 0);

  console.log('\n=== DIAG 4: unique `id` duplicates in DB ===');
  const idDups = await Student.aggregate([
    { $group: { _id: '$id', n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $count: 'groups' }
  ]).allowDiskUse(true);
  console.log('Duplicate id groups in DB:', idDups[0]?.groups ?? 0);

  console.log('\n=== DIAG 5: schoolId type distribution (ObjectId vs string) ===');
  const typeAgg = await Student.aggregate([
    { $project: { t: { $type: '$schoolId' } } },
    { $group: { _id: '$t', n: { $sum: 1 } } }
  ]).allowDiskUse(true);
  typeAgg.forEach(g => console.log('  ', g._id, '->', g.n));

  console.log('\n=== DIAG 6: PROOF of mongoose bulkWrite(ordered:false) silently swallowing write errors ===');
  const diagColName = '_import_diag_swallow_test';
  try {
    await conn.createCollection(diagColName);
  } catch (e: any) {
    if (e.code !== 48) throw e;
  }
  const col = conn.collection(diagColName);
  await col.dropIndexes().catch(() => {});
  await col.createIndex({ key: 1 }, { unique: true });

  await col.insertOne({ key: 'dup1' });
  await col.insertOne({ key: 'ok1' });

  const ops = [
    { updateOne: { filter: { key: 'dup1' }, update: { $set: { v: 'x' } }, upsert: false } },
    { updateOne: { filter: { key: 'dup1' }, update: { $set: { v: 'y' } }, upsert: false } },
    { updateOne: { filter: { key: 'new1' }, update: { $set: { v: 'new' } }, upsert: true } },
    { insertOne: { document: { key: 'dup1' } } }
  ];

  // Wait: build a REAL dup-key error. Inserting a doc whose unique `key` already exists.
  const dupOps = [
    { insertOne: { document: { key: 'dup1', val: 'a' } } },
    { insertOne: { document: { key: 'new2', val: 'b' } } }
  ];

  const M = mongoose.model('DiagSwallow', new mongoose.Schema({ key: { type: String, unique: true }, val: String }), diagColName);

  try {
    const res = await M.bulkWrite(dupOps, { ordered: false });
    console.log('bulkWrite(ordered:false) RESOLVED (no throw) ->', res === null ? 'NULL (write error swallowed!)' : `result insertedCount=${res.insertedCount} upsertedCount=${res.upsertedCount}`);
    const after = await col.countDocuments();
    console.log('Documents in temp collection after test:', after, '(expected 3 if the valid insert "new2" made it; expect 2 if swallowed result was still applied by driver)');
    console.log('NOTE: even when result is null, MongoDB driver still APPLIES the valid ops. The loss comes from backend counting chunk.length regardless.');
  } catch (e: any) {
    console.log('bulkWrite(ordered:false) THREW:', e.name, e.message?.slice(0, 200));
  }

  console.log('\n=== DIAG 7: Insert a fully duplicate row to see driver-level error shape ===');
  try {
    const res = await col.insertOne({ key: 'dup1' });
    console.log('insertOne duplicate resolved?', res.acknowledged);
  } catch (e: any) {
    console.log('insertOne duplicate threw:', e.name, 'code=', e.code, 'writeErrors=', Array.isArray(e.writeErrors) ? e.writeErrors.length : e.writeErrors);
  }

  await col.drop().catch(() => {});
  console.log('Temp collection dropped.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Diag error:', err);
  process.exit(1);
});
