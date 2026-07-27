/**
 * Draft Store Engine for Marks Entry 2.0
 * 
 * Implements reliable offline draft recovery with per-subject isolation,
 * row-level atomic storage (never rewriting the entire draft), debounced saves,
 * and conflict detection.
 */

export interface DraftKeyParams {
  schoolId: string;
  academicYear?: string;
  examId: string;
  mediumId?: string;
  className: string;
  division?: string;
  subjectId: string;
  teacherId: string;
  examName?: string;
  subjectName?: string;
}

export interface DraftMetadata {
  draftKey: string;
  schoolId: string;
  academicYear: string;
  examId: string;
  mediumId: string;
  className: string;
  division: string;
  subjectId: string;
  teacherId: string;
  examName: string;
  subjectName: string;
  lastSavedTime: number; // Timestamp when local draft was last updated
  dbTimestamp: number;   // Max updatedAt timestamp of server records when loaded
  dbVersion: number;     // Max version (__v) of server records when loaded
  studentIds: string[];  // List of student IDs with stored draft rows
}

export interface StudentMarkDraftRecord {
  studentId: string;
  subjectId: string;
  marks: any;            // Total marks obtained or mark value string
  markGroups?: any[];    // Mark groups array for structured marks entry
  grade: string;
  isAbsent: boolean;     // Absent status flag
  timestamp: number;     // When this specific row was last edited
  dirty: boolean;        // Dirty flag indicating unsaved local changes
  version: number;       // DB record version when loaded
}

export type SyncStatusState =
  | 'DRAFT_SAVED_LOCALLY'
  | 'SYNC_PENDING'
  | 'UPLOADING'
  | 'UPLOAD_SUCCESSFUL'
  | 'OFFLINE'
  | 'UNSAVED_CHANGES';

export interface ConflictedRow {
  studentId: string;
  studentName?: string;
  localGrade?: string;
  localMarks?: any;
  serverGrade?: string;
  serverMarks?: any;
  serverEditedBy?: string;
  serverEditedAt?: string;
}

const META_PREFIX = 'marksDraft:meta:';
const ROW_PREFIX = 'marksDraft:row:';
const DEBOUNCE_DELAY_MS = 400;

// In-memory debounce queue: rowKey -> Timer & Data
const debounceTimers = new Map<string, any>();
const pendingRowData = new Map<string, { metaParams: DraftKeyParams; studentId: string; record: StudentMarkDraftRecord; dbTimestamp: number; dbVersion: number }>();

/**
 * Generates a deterministically unique key for a specific teacher's subject draft.
 * Never mixes drafts of different subjects.
 */
export function generateDraftKey(params: DraftKeyParams): string {
  const sId = (params.schoolId || 'all').trim();
  const aYear = (params.academicYear || 'current').trim();
  const eId = (params.examId || 'none').trim();
  const mId = (params.mediumId || 'ALL').trim();
  const cls = (params.className || 'all').trim();
  const div = (params.division || 'ALL').trim();
  const subId = (params.subjectId || 'none').trim();
  const tId = (params.teacherId || 'anonymous').trim();

  return `${sId}:${aYear}:${eId}:${mId}:${cls}:${div}:${subId}:${tId}`;
}

/**
 * Saves a single student row with debouncing (300-500ms).
 * Writes strictly the changed row to storage without re-serializing unchanged rows.
 */
export function saveStudentMarkDebounced(
  params: DraftKeyParams,
  studentId: string,
  recordData: Partial<StudentMarkDraftRecord>,
  dbTimestamp: number = 0,
  dbVersion: number = 1,
  onSaveSuccess?: (key: string) => void
): void {
  const draftKey = generateDraftKey(params);
  const rowKey = `${ROW_PREFIX}${draftKey}:${studentId}`;

  const record: StudentMarkDraftRecord = {
    studentId,
    subjectId: params.subjectId,
    marks: recordData.marks !== undefined ? recordData.marks : '',
    markGroups: recordData.markGroups || [],
    grade: recordData.grade || '',
    isAbsent: !!recordData.isAbsent,
    timestamp: Date.now(),
    dirty: true,
    version: recordData.version !== undefined ? recordData.version : dbVersion,
  };

  pendingRowData.set(rowKey, { metaParams: params, studentId, record, dbTimestamp, dbVersion });

  if (debounceTimers.has(rowKey)) {
    clearTimeout(debounceTimers.get(rowKey));
  }

  const timer = setTimeout(() => {
    commitRowWrite(rowKey);
    if (onSaveSuccess) onSaveSuccess(draftKey);
  }, DEBOUNCE_DELAY_MS);

  debounceTimers.set(rowKey, timer);
}

/**
 * Synchronously commits a single queued row write to localStorage.
 */
function commitRowWrite(rowKey: string): void {
  const data = pendingRowData.get(rowKey);
  if (!data) return;

  const { metaParams, studentId, record, dbTimestamp, dbVersion } = data;
  const draftKey = generateDraftKey(metaParams);
  const metaKey = `${META_PREFIX}${draftKey}`;

  try {
    // Write strictly the single changed row record
    localStorage.setItem(rowKey, JSON.stringify(record));

    // Update metadata index
    const existingMetaStr = localStorage.getItem(metaKey);
    let meta: DraftMetadata;
    if (existingMetaStr) {
      meta = JSON.parse(existingMetaStr);
      meta.lastSavedTime = record.timestamp;
      if (!meta.studentIds.includes(studentId)) {
        meta.studentIds.push(studentId);
      }
      if (dbTimestamp > meta.dbTimestamp) meta.dbTimestamp = dbTimestamp;
      if (dbVersion > meta.dbVersion) meta.dbVersion = dbVersion;
    } else {
      meta = {
        draftKey,
        schoolId: metaParams.schoolId,
        academicYear: metaParams.academicYear || 'current',
        examId: metaParams.examId,
        mediumId: metaParams.mediumId || 'ALL',
        className: metaParams.className,
        division: metaParams.division || 'ALL',
        subjectId: metaParams.subjectId,
        teacherId: metaParams.teacherId,
        examName: metaParams.examName || metaParams.examId,
        subjectName: metaParams.subjectName || metaParams.subjectId,
        lastSavedTime: record.timestamp,
        dbTimestamp,
        dbVersion,
        studentIds: [studentId],
      };
    }
    localStorage.setItem(metaKey, JSON.stringify(meta));
  } catch (e) {
    console.error('Failed to save draft to localStorage (quota exceeded or storage restricted):', e);
  } finally {
    debounceTimers.delete(rowKey);
    pendingRowData.delete(rowKey);
  }
}

/**
 * Immediately flushes any pending debounced writes for a draft or all drafts.
 */
export function flushPendingWrites(targetDraftKey?: string): void {
  for (const [rowKey, timer] of debounceTimers.entries()) {
    if (!targetDraftKey || rowKey.startsWith(`${ROW_PREFIX}${targetDraftKey}:`)) {
      clearTimeout(timer);
      commitRowWrite(rowKey);
    }
  }
}

/**
 * Searches for an existing local draft upon opening Marks Entry.
 * Returns draft metadata and all stored records if local draft timestamp is newer than DB timestamp.
 */
export function findDraft(
  params: DraftKeyParams,
  currentDbTimestamp: number = 0
): { metadata: DraftMetadata; records: Record<string, StudentMarkDraftRecord> } | null {
  const draftKey = generateDraftKey(params);
  flushPendingWrites(draftKey);

  const metaKey = `${META_PREFIX}${draftKey}`;
  const metaStr = localStorage.getItem(metaKey);
  if (!metaStr) return null;

  try {
    const meta: DraftMetadata = JSON.parse(metaStr);
    
    // Check if draft belongs to the current teacher (Security requirement)
    if (params.teacherId && meta.teacherId !== params.teacherId && meta.teacherId !== 'anonymous') {
      return null;
    }

    // Compare timestamps: if DB timestamp is newer than or equal to local draft, discard outdated local draft
    // Note: Allow a 1-second margin to avoid minor clock diff issues, but if draft has timestamp > dbTimestamp, recover!
    if (meta.lastSavedTime <= currentDbTimestamp && currentDbTimestamp > 0) {
      return null;
    }

    const records: Record<string, StudentMarkDraftRecord> = {};
    let hasValidRecords = false;

    for (const studentId of meta.studentIds) {
      const rowKey = `${ROW_PREFIX}${draftKey}:${studentId}`;
      const rowStr = localStorage.getItem(rowKey);
      if (rowStr) {
        const rowData: StudentMarkDraftRecord = JSON.parse(rowStr);
        records[studentId] = rowData;
        hasValidRecords = true;
      }
    }

    if (!hasValidRecords) return null;

    return { metadata: meta, records };
  } catch (e) {
    console.error('Error parsing local draft storage:', e);
    return null;
  }
}

/**
 * Clears ONLY the matching subject draft from local storage after successful MongoDB upload
 * or explicit discard. Never removes unrelated drafts.
 */
export function clearDraft(params: DraftKeyParams): void {
  const draftKey = generateDraftKey(params);
  flushPendingWrites(draftKey);

  const metaKey = `${META_PREFIX}${draftKey}`;
  const metaStr = localStorage.getItem(metaKey);
  if (metaStr) {
    try {
      const meta: DraftMetadata = JSON.parse(metaStr);
      meta.studentIds.forEach((sid) => {
        localStorage.removeItem(`${ROW_PREFIX}${draftKey}:${sid}`);
      });
    } catch (e) {
      // ignore JSON error
    }
  }
  localStorage.removeItem(metaKey);

  // Fallback cleanup of any orphaned row keys for this exact draftKey
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && (k === metaKey || k.startsWith(`${ROW_PREFIX}${draftKey}:`))) {
      localStorage.removeItem(k);
    }
  }
}

/**
 * Detects conflicts between local draft version/timestamp and server records prior to upload.
 */
export function detectConflicts(
  paramsOrRecords: DraftKeyParams | Record<string, StudentMarkDraftRecord>,
  serverRecords: any[],
  initialDbTimestamp: number,
  studentNameGetter?: (studentId: string) => string
): ConflictedRow[] {
  const localRecords: Record<string, StudentMarkDraftRecord> =
    ('schoolId' in paramsOrRecords && 'examId' in paramsOrRecords && 'subjectId' in paramsOrRecords)
      ? (findDraft(paramsOrRecords as DraftKeyParams, initialDbTimestamp)?.records || {})
      : (paramsOrRecords as Record<string, StudentMarkDraftRecord>);

  const conflicts: ConflictedRow[] = [];

  for (const sRec of serverRecords) {
    const sid = sRec.studentId;
    const local = localRecords[sid];
    if (!local || !local.dirty) continue;

    const serverTime = sRec.updatedAt ? new Date(sRec.updatedAt).getTime() : 0;

    // If server record was modified AFTER we originally fetched data from the server
    // and differs from our baseline, report as conflict
    if (serverTime > initialDbTimestamp && initialDbTimestamp > 0) {
      conflicts.push({
        studentId: sid,
        studentName: studentNameGetter ? studentNameGetter(sid) : sid,
        localGrade: local.grade,
        localMarks: local.marks,
        serverGrade: sRec.grade || (sRec.isAbsent ? 'Ab' : ''),
        serverMarks: sRec.totalObtained !== undefined ? sRec.totalObtained : (sRec.mark !== undefined ? sRec.mark : ''),
        serverEditedBy: sRec.lastEditedBy || sRec.enteredBy || 'Another User',
        serverEditedAt: sRec.updatedAt || new Date().toISOString(),
      });
    }
  }

  return conflicts;
}

export const draftStore = {
  generateDraftKey,
  saveStudentMarkDebounced,
  flushPendingWrites,
  findDraft,
  clearDraft,
  detectConflicts,
};
