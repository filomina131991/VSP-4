import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../db.ts';
import mongoose from 'mongoose';

async function main() {
  await connectDB();
  const conn = mongoose.connection;
  const colName = '_import_diag_cast_test';

  try {
    await conn.createCollection(colName);
  } catch (e: any) {
    if (e.code !== 48) throw e;
  }

  const schema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    globalId: { type: String },
    name: { type: String, required: true },
    schoolId: { type: String, required: true },
    schoolCode: { type: String, default: '' },
    uniqueId: { type: String },
    dob: { type: Date },
    lettersStatus: { type: Number, default: 0 },
    readingStatus: { type: Number, default: 0 },
    writingStatus: { type: Number, default: 0 },
    academicYear: { type: String, required: true },
    category: { type: String, default: 'General' }
  });
  schema.index({ globalId: 1, schoolId: 1, academicYear: 1 }, { unique: true });
  const M = mongoose.model('DiagCast', schema, colName);
  await M.syncIndexes();
  const col = conn.collection(colName);

  console.log('=== TEST A: backend-style upsert ops with INVALID dob (non-ISO string) ===');
  const opsA = [
    { updateOne: { filter: { $or: [{ uniqueId: 'SCH1' }, { schoolId: 'S1', globalId: '1' }] }, update: { $set: { dob: '15/05/2010', lettersStatus: 100 }, $setOnInsert: { id: 'a1', globalId: '1', admissionNumber: '1' } }, upsert: true } },
    { updateOne: { filter: { $or: [{ uniqueId: 'SCH2' }, { schoolId: 'S1', globalId: '2' }] }, update: { $set: { dob: '2010-05-15', lettersStatus: 100 }, $setOnInsert: { id: 'a2', globalId: '2', admissionNumber: '2' } }, upsert: true } }
  ];
  try {
    const res: any = await M.bulkWrite(opsA, { ordered: false });
    console.log('  RESOLVED. result =', res && { insertedCount: res.insertedCount, matchedCount: res.matchedCount, upsertedCount: res.upsertedCount });
  } catch (e: any) {
    console.log('  THREW:', e.name, (e.message || '').slice(0, 160), '| writeErrors:', Array.isArray(e.writeErrors) ? e.writeErrors.length : '-');
  }
  let docs = await col.find({}, { projection: { _id: 0, id: 1, dob: 1 } }).toArray();
  console.log('  Docs after Test A:', JSON.stringify(docs));

  console.log('\n=== TEST B: backend-style upsert ops with NaN number (lettersStatus = "ABC" -> NaN) ===');
  const opsB = [
    { updateOne: { filter: { $or: [{ uniqueId: 'SCH3' }, { schoolId: 'S1', globalId: '3' }] }, update: { $set: { dob: '2010-05-15', lettersStatus: Number('ABC') }, $setOnInsert: { id: 'a3', globalId: '3', admissionNumber: '3' } }, upsert: true } },
    { updateOne: { filter: { $or: [{ uniqueId: 'SCH4' }, { schoolId: 'S1', globalId: '4' }] }, update: { $set: { dob: '2010-05-15', lettersStatus: 200 }, $setOnInsert: { id: 'a4', globalId: '4', admissionNumber: '4' } }, upsert: true } }
  ];
  try {
    const res: any = await M.bulkWrite(opsB, { ordered: false });
    console.log('  RESOLVED. result =', res && { insertedCount: res.insertedCount, matchedCount: res.matchedCount, upsertedCount: res.upsertedCount });
  } catch (e: any) {
    console.log('  THREW:', e.name, (e.message || '').slice(0, 160), '| writeErrors:', Array.isArray(e.writeErrors) ? e.writeErrors.length : '-');
  }
  docs = await col.find({}, { projection: { _id: 0, id: 1, lettersStatus: 1 } }).toArray();
  console.log('  Docs after Test B:', JSON.stringify(docs));

  console.log('\n=== TEST C: duplicate compound index key (globalId=1, S1, same year) via upsert that does NOT match existing ===');
  // existing doc from Test A has globalId=1 schoolId=S1 academicYear? (none set -> default missing; academicYear is required!)
  const opsC = [
    { updateOne: { filter: { $or: [{ uniqueId: 'SCH9' }, { schoolId: 'S2', globalId: '9' }] }, update: { $set: { academicYear: '2026-27' }, $setOnInsert: { id: 'a9', globalId: '9', admissionNumber: '9' } }, upsert: true } },
    { updateOne: { filter: { $or: [{ uniqueId: 'SCH1' }, { schoolId: 'S1', globalId: '1' }] }, update: { $set: { academicYear: '2026-27' }, $setOnInsert: { id: 'a1b', globalId: '1', admissionNumber: '1' } }, upsert: true } }
  ];
  try {
    const res: any = await M.bulkWrite(opsC, { ordered: false });
    console.log('  RESOLVED. result =', res && { insertedCount: res.insertedCount, matchedCount: res.matchedCount, upsertedCount: res.upsertedCount });
  } catch (e: any) {
    console.log('  THREW:', e.name, (e.message || '').slice(0, 200));
    console.log('  error.writeErrors:', e.writeErrors ? JSON.stringify(e.writeErrors.map((w: any) => ({ index: w.index, code: w.code, msg: (w.errmsg || w.err.message || '').slice(0, 120) }))) : 'none');
  }
  docs = await col.find({}, { projection: { _id: 0, id: 1, globalId: 1, schoolId: 1, academicYear: 1 } }).toArray();
  console.log('  Docs after Test C:', JSON.stringify(docs));

  console.log('\n=== TEST D: RESULT SHAPE when NO errors (to understand counts available) ===');
  const opsD = [
    { updateOne: { filter: { $or: [{ uniqueId: 'SCH50' }, { schoolId: 'S1', globalId: '50' }] }, update: { $set: { academicYear: '2026-27', dob: '2010-05-15' }, $setOnInsert: { id: 'a50', globalId: '50', admissionNumber: '50' } }, upsert: true } }
  ];
  try {
    const res: any = await M.bulkWrite(opsD, { ordered: false });
    console.log('  RESOLVED. keys:', Object.keys(res || {}));
    console.log('  insertedCount=%s upsertedCount=%s matchedCount=%s modifiedCount=%s deletedCount=%s',
      res.insertedCount, res.upsertedCount, res.matchedCount, res.modifiedCount, res.deletedCount);
    console.log('  getInsertedIds()=', res.getInsertedIds ? JSON.stringify(res.getInsertedIds()) : 'n/a');
    console.log('  getUpsertedIds()=', res.getUpsertedIds ? JSON.stringify(res.getUpsertedIds()) : 'n/a');
    console.log('  getUpsertedIdAt(0)=', res.getUpsertedIdAt ? JSON.stringify(res.getUpsertedIdAt(0)) : 'n/a');
  } catch (e: any) {
    console.log('  THREW:', e.name, (e.message || '').slice(0, 160));
  }

  await col.drop().catch(() => {});
  console.log('\nTemp collection dropped.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Diag error:', err);
  process.exit(1);
});
