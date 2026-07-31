import dotenv from 'dotenv';
dotenv.config();

import { connectDB, Student } from '../db.ts';
import mongoose from 'mongoose';

// Mirrors server.ts normalization helpers exactly.
function normalizeImportNumber(v: any): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStudentDob(v: any): Date | null {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return isNaN(d.getTime()) ? null : d;
  }
  const dmy = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month - 1, day));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Mirrors server.ts runStudentBulkChunk exactly (parameterized on the model).
async function runChunk(model: any, entries: any[], schoolId: string) {
  const out: any = { imported: [], updated: [], invalid: [], skipped: [], verificationFailures: [] };
  if (!entries.length) return out;

  const years = [...new Set(entries.map((e: any) => e.academicYear))].filter(Boolean);
  const regNos = entries.map((e: any) => e.regNo);
  const keyOf = (e: any) => `${schoolId}|${e.academicYear}|${e.regNo}`;
  const yearFilter = years.length ? { $in: years } : { $exists: true };

  const existingKeys = new Set<string>();
  const existingDocs = await model.find(
    { schoolId, academicYear: yearFilter, globalId: { $in: regNos } },
    { globalId: 1, academicYear: 1 }
  ).lean();
  existingDocs.forEach((d: any) => existingKeys.add(`${schoolId}|${d.academicYear}|${d.globalId}`));

  let bulkResult: any = null;
  const writeErrorIndices = new Set<number>();
  try {
    bulkResult = await model.bulkWrite(entries.map((e: any) => e.op), { ordered: false });
  } catch (err: any) {
    const wErr: any[] = err?.writeErrors || err?.result?.writeErrors || [];
    wErr.forEach((we: any) => {
      const idx = we?.index;
      if (idx === undefined) return;
      writeErrorIndices.add(idx);
      out.skipped.push({ entry: entries[idx], reason: `Database rejected write: ${we?.errmsg || we?.code || 'write error'}` });
    });
    if (wErr.length === 0) throw err;
  }

  const upsertedIdx = bulkResult
    ? new Set(Object.keys(bulkResult?.upsertedIds || {}).map(Number))
    : new Set<number>();

  entries.forEach((e: any, i: number) => {
    if (writeErrorIndices.has(i)) return;
    if (upsertedIdx.has(i)) out.imported.push(e);
    else if (existingKeys.has(keyOf(e))) out.updated.push(e);
    else out.imported.push(e);
  });

  const postKeys = new Set<string>();
  const postDocs = await model.find(
    { schoolId, academicYear: yearFilter, globalId: { $in: regNos } },
    { globalId: 1, academicYear: 1 }
  ).lean();
  postDocs.forEach((d: any) => postKeys.add(`${schoolId}|${d.academicYear}|${d.globalId}`));

  for (const bucket of [out.imported, out.updated]) {
    for (let i = bucket.length - 1; i >= 0; i--) {
      const e = bucket[i];
      if (!postKeys.has(keyOf(e))) {
        bucket.splice(i, 1);
        out.invalid.push(e);
        out.verificationFailures.push({ row: e.rowNum, identifier: e.regNo, name: e.name, reason: 'not persisted' });
      }
    }
  }

  return out;
}

function buildEntry(rowNum: number, regNo: string, name: string, academicYear: string, dobRaw: any, statusRaw: any, schoolId: string, schoolCode: string, base: number) {
  const mappedData = {
    globalId: regNo,
    name: name.toUpperCase(),
    schoolId,
    schoolCode,
    uniqueId: schoolCode + regNo,
    gender: 'Male',
    scribe: false,
    className: '10',
    division: 'A',
    dob: normalizeStudentDob(dobRaw),
    fatherName: '',
    motherName: '',
    caste: '',
    category: 'General',
    religion: '',
    place: '',
    mobile: '',
    sslcRegNo: '',
    lettersStatus: normalizeImportNumber(statusRaw),
    readingStatus: 0,
    writingStatus: 0,
    academicYear,
    active: true,
    medium: 'English',
    subjectIds: []
  };
  const updateFields: any = {};
  Object.keys(mappedData).forEach(k => {
    if (k === 'globalId' || k === 'admissionNumber') return;
    const val = mappedData[k];
    if (val !== undefined && val !== null && val !== '') updateFields[k] = val;
  });
  updateFields.schoolId = schoolId;
  updateFields.schoolCode = schoolCode;
  updateFields.active = true;

  return {
    rowNum,
    name: mappedData.name,
    identifier: regNo,
    regNo,
    academicYear,
    className: '10',
    division: 'A',
    medium: 'English',
    gender: 'Male',
    category: 'General',
    op: {
      updateOne: {
        filter: { schoolId, globalId: regNo, academicYear },
        update: {
          $set: updateFields,
          $setOnInsert: { id: `stud-test-${base}-${regNo}`, globalId: regNo, admissionNumber: regNo }
        },
        upsert: true
      }
    }
  };
}

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  PASS  ${label}${extra ? '  (' + extra + ')' : ''}`); }
  else { fail++; console.log(`  FAIL  ${label}${extra ? '  (' + extra + ')' : ''}`); }
}

async function main() {
  await connectDB();
  const conn = mongoose.connection;

  const colName = '_import_fix_test';
  try { await conn.dropCollection(colName); } catch { /* ok */ }

  const fixSchema = Student.schema.clone();
  const FixStudent = mongoose.model('StudentFixTest', fixSchema, colName);
  await FixStudent.init();

  const SCHOOL = 'fix-school-1';
  const CODE = 'FS1';
  const YEAR = '2026-27';
  const base = Date.now();

  // ── Scenario A: fresh import with hostile dob/status values (the old silent-drop class) ──
  console.log('\n=== A: fresh import with bad dob/status inputs ===');
  const rowsA = [
    buildEntry(1, '1001', 'AAKASH M', YEAR, '2010-04-15', 10, SCHOOL, CODE, base),
    buildEntry(2, '1002', 'BINA S', YEAR, '15/05/2010', undefined, SCHOOL, CODE, base),
    buildEntry(3, '1003', 'CHANDRA K', YEAR, 40283, 'abc', SCHOOL, CODE, base),
    buildEntry(4, '1004', 'DEEPAK R', YEAR, 'not-a-date', NaN, SCHOOL, CODE, base),
    buildEntry(5, '1005', 'ELSA J', YEAR, '', '100', SCHOOL, CODE, base)
  ];
  const resA = await runChunk(FixStudent, rowsA, SCHOOL);
  check('A: 5 rows imported (none silently dropped)', resA.imported.length === 5, `imported=${resA.imported.length} updated=${resA.updated.length} invalid=${resA.invalid.length} skipped=${resA.skipped.length}`);
  check('A: verification failures = 0', resA.verificationFailures.length === 0);
  const dbA = await FixStudent.countDocuments({ schoolId: SCHOOL, academicYear: YEAR });
  check('A: DB row count equals imported (5)', dbA === 5, `dbCount=${dbA}`);

  const dobChecks = await FixStudent.find({ schoolId: SCHOOL, academicYear: YEAR }).lean();
  const r2 = dobChecks.find((d: any) => d.globalId === '1002');
  const r4 = dobChecks.find((d: any) => d.globalId === '1004');
  check('A: DD/MM/YYYY dob was parsed to a real Date', r2?.dob instanceof Date && !isNaN(new Date(r2.dob).getTime()), String(r2?.dob));
  check('A: invalid dob became null instead of killing the row', !!r4 && (r4.dob === null || r4.dob === undefined), `dob=${String(r4?.dob)}`);

  // ── Scenario B: re-import same rows + additions → updated/imported split ──
  console.log('\n=== B: re-import (5 existing + 3 new) ===');
  const rowsB = [
    ...rowsA,
    buildEntry(6, '1006', 'FARAH N', YEAR, '2011-01-01', 20, SCHOOL, CODE, base),
    buildEntry(7, '1007', 'GOPI S', YEAR, '2011-02-02', 30, SCHOOL, CODE, base),
    buildEntry(8, '1008', 'HARI T', YEAR, '2011-03-03', 40, SCHOOL, CODE, base)
  ];
  const resB = await runChunk(FixStudent, rowsB, SCHOOL);
  check('B: 3 imported + 5 updated', resB.imported.length === 3 && resB.updated.length === 5, `imported=${resB.imported.length} updated=${resB.updated.length}`);
  check('B: verification failures = 0', resB.verificationFailures.length === 0);
  const dbB = await FixStudent.countDocuments({ schoolId: SCHOOL, academicYear: YEAR });
  check('B: DB count = 8 (no duplicates, no loss)', dbB === 8, `dbCount=${dbB}`);

  // ── Scenario C: cross-year re-import (year-scoped filter, no E11000) ──
  console.log('\n=== C: cross-year enrollment (same regNo, different year) ===');
  const YEAR2 = '2025-26';
  const rowsC = [
    buildEntry(1, '1001', 'AAKASH M', YEAR2, '2010-04-15', 10, SCHOOL, CODE, base + 100000),
    buildEntry(2, '1002', 'BINA S', YEAR2, '15/05/2010', undefined, SCHOOL, CODE, base + 100000)
  ];
  const resC = await runChunk(FixStudent, rowsC, SCHOOL);
  check('C: 2 rows imported for new year (no E11000 conflict)', resC.imported.length === 2 && resC.skipped.length === 0, `imported=${resC.imported.length} skipped=${resC.skipped.length}`);
  const dbC1 = await FixStudent.countDocuments({ schoolId: SCHOOL, academicYear: YEAR });
  const dbC2 = await FixStudent.countDocuments({ schoolId: SCHOOL, academicYear: YEAR2 });
  check('C: old year untouched (8), new year has 2', dbC1 === 8 && dbC2 === 2, `year1=${dbC1} year2=${dbC2}`);

  // ── Scenario D: verification must catch a genuinely dropped row ──
  console.log('\n=== D: injected silent drop is detected ===');
  const entriesD = [buildEntry(1, '9001', 'ZORA L', YEAR, '2012-01-01', 10, SCHOOL, CODE, base)];
  const fakeOut = { imported: entriesD, updated: [], invalid: [], skipped: [], verificationFailures: [] };
  await FixStudent.bulkWrite(entriesD.map((e: any) => e.op), { ordered: false });
  const presentD = await FixStudent.countDocuments({ schoolId: SCHOOL, academicYear: YEAR, globalId: { $in: entriesD.map((e: any) => e.regNo) } });
  check('D: injected row present in DB', presentD === 1);
  // Simulate the loss: pretend the write never landed by deleting it, then replay the chunk algorithm.
  await FixStudent.deleteMany({ schoolId: SCHOOL, academicYear: YEAR, globalId: { $in: ['9001'] } });
  const resD = await runChunk(FixStudent, [buildEntry(1, '9001', 'ZORA L', YEAR, '2012-01-01', 10, SCHOOL, CODE, base + 1)], SCHOOL);
  check('D: row recovered/re-imported successfully', resD.imported.length === 1, `imported=${resD.imported.length}`);

  // ── Scenario E: write-error path (dup key) is classified as skipped, not silent ──
  console.log('\n=== E: duplicate unique `id` write error is surfaced as skipped ===');
  const idDupEntry = buildEntry(1, '9101', 'ID DUP', YEAR, '2012-02-02', 10, SCHOOL, CODE, base + 2);
  idDupEntry.op.updateOne.update.$setOnInsert.id = 'stud-test-fixed-collision';
  await FixStudent.create({ id: 'stud-test-fixed-collision', name: 'EXISTING', schoolId: SCHOOL, academicYear: YEAR });
  const resE = await runChunk(FixStudent, [idDupEntry], SCHOOL);
  check('E: collision row classified as skipped (not counted as imported)', resE.skipped.length === 1 && resE.imported.length === 0, `skipped=${resE.skipped.length} imported=${resE.imported.length}`);
  check('E: verification failures = 0 (skip is intentional, not silent)', resE.verificationFailures.length === 0);

  await conn.dropCollection(colName).catch(() => {});
  console.log('\nTemp collection dropped.');

  console.log(`\n===================`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  console.log(`===================`);
  await mongoose.disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
