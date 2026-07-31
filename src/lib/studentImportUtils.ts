export interface ValidationError {
  row: number;
  field: string;
  found: string;
  expected: string;
}

export interface ParsedStudentRow {
  regNo: string;
  name: string;
  gender: string;
  dob: string;
  classStandard: string;
  division: string;
  category: string;
  caste?: string;
  religion?: string;
  fatherName?: string;
  motherName?: string;
  place?: string;
  mobile?: string;
  scribe?: boolean;
  sslcRegNo?: string;
  medium?: string;
  firstLangPaper1?: string;
  firstLangPaper2?: string;
  letterStatus?: number;
  readingStatus?: number;
  writingStatus?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  student: ParsedStudentRow;
}

// Helper to normalize strings
const cleanString = (str: any) => {
  if (str === null || str === undefined) return '';
  return String(str).trim().replace(/\s+/g, ' ');
};

// Normalizes any DOB representation (ISO string, DD/MM/YYYY, Excel serial number,
// Date) into a canonical YYYY-MM-DD string. Returns '' when the value is unparseable
// so that the backend never receives an invalid Date that Mongoose would silently drop.
export const normalizeDobValue = (v: any): string => {
  if (v === undefined || v === null) return '';

  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return v.toISOString().slice(0, 10);
  }

  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  const s = String(v).trim();
  if (!s) return '';

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  const serial = s.match(/^\d{4,6}(?:\.\d+)?$/);
  if (serial) {
    const d = new Date(Math.round((Number(serial[0]) - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  const dmy = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return '';
    const d = new Date(Date.UTC(year, month - 1, day));
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

export const autoCorrectRow = (rawRow: any): ParsedStudentRow => {
  const corrected: any = {};

  // Name
  corrected.name = cleanString(rawRow.name).toUpperCase();

  // Admission Number (RegNo)
  let regNo = cleanString(rawRow.regNo).replace(/\s/g, ''); // Remove accidental spaces
  corrected.regNo = regNo;

  // Class Standard
  let cls = cleanString(rawRow.classStandard).toUpperCase();
  cls = cls.replace(/^(CLASS|STD|STANDARD)\s*/, '');
  cls = cls.replace(/(TH)$/, '');
  if (cls === 'VIII' || cls === '08') cls = '8';
  if (cls === 'IX' || cls === '09') cls = '9';
  if (cls === 'X') cls = '10';
  corrected.classStandard = cls;

  // Division
  let div = cleanString(rawRow.division);
  // Match a single alphabet character optionally surrounded by spaces, dashes, or specific words
  const divMatch = div.match(/\b([a-zA-Z])\b/);
  if (divMatch) {
    corrected.division = divMatch[1].toUpperCase();
  } else {
    // Fallback: strip class prefix and year patterns if present
    const clsRegex = new RegExp(`^${cls}\\s+`, 'i');
    div = div.replace(clsRegex, '');
    div = div.replace(/\s+\d{4}-\d{4}$/, '').replace(/[^a-zA-Z]/g, '').trim().toUpperCase();
    if (div.length === 1) {
      corrected.division = div;
    } else if (div.length > 1) {
      corrected.division = div.charAt(0);
    } else {
      corrected.division = div;
    }
  }

  // Gender
  let gender = cleanString(rawRow.gender).toLowerCase();
  if (gender === 'm' || gender === 'male' || gender === 'boy') {
    corrected.gender = 'Male';
  } else if (gender === 'f' || gender === 'female' || gender === 'girl') {
    corrected.gender = 'Female';
  } else {
    corrected.gender = cleanString(rawRow.gender); // Keep original to fail validation
  }

  // Category
  let cat = cleanString(rawRow.category).toUpperCase();
  if (cat === 'SC') corrected.category = 'SC';
  else if (cat === 'ST') corrected.category = 'ST';
  else if (cat === 'OBC') corrected.category = 'OBC';
  else if (cat === 'OEC') corrected.category = 'OEC';
  else if (cat === 'GENERAL' || cat === 'GEN') corrected.category = 'General';
  else corrected.category = cleanString(rawRow.category); // Let it fail

  // Other fields
  corrected.dob = cleanString(rawRow.dob);
  corrected.caste = cleanString(rawRow.caste);
  corrected.religion = cleanString(rawRow.religion);
  corrected.fatherName = cleanString(rawRow.fatherName);
  corrected.motherName = cleanString(rawRow.motherName);
  corrected.place = cleanString(rawRow.place);
  corrected.mobile = cleanString(rawRow.mobile);
  
  const scribeVal = cleanString(rawRow.scribe).toLowerCase();
  corrected.scribe = scribeVal === 'true' || scribeVal === 'yes' || scribeVal === '1' || scribeVal === 'scribe';

  corrected.sslcRegNo = cleanString(rawRow.sslcRegNo);
  corrected.medium = cleanString(rawRow.medium);
  corrected.firstLangPaper1 = cleanString(rawRow.firstLangPaper1);
  corrected.firstLangPaper2 = cleanString(rawRow.firstLangPaper2);
  
  corrected.letterStatus = rawRow.letterStatus !== undefined && rawRow.letterStatus !== '' ? Number(rawRow.letterStatus) : 100;
  corrected.readingStatus = rawRow.readingStatus !== undefined && rawRow.readingStatus !== '' ? Number(rawRow.readingStatus) : 100;
  corrected.writingStatus = rawRow.writingStatus !== undefined && rawRow.writingStatus !== '' ? Number(rawRow.writingStatus) : 100;

  return corrected as ParsedStudentRow;
};

export const validateRow = (row: ParsedStudentRow, rowIndex: number): ValidationResult => {
  const errors: ValidationError[] = [];

  // 1. Admission Number
  if (!/^\d{3,7}$/.test(row.regNo)) {
    errors.push({
      row: rowIndex,
      field: 'Admission Number',
      found: row.regNo || 'Empty',
      expected: 'Numeric (3–7 digits)'
    });
  }

  // 2. Name
  if (!row.name || row.name.length < 2) {
    errors.push({
      row: rowIndex,
      field: 'Name',
      found: row.name || 'Empty',
      expected: 'Valid Name (Min 2 chars)'
    });
  }

  // 3. Class
  if (!['8', '9', '10'].includes(row.classStandard)) {
    errors.push({
      row: rowIndex,
      field: 'Class',
      found: row.classStandard || 'Empty',
      expected: '8 / 9 / 10'
    });
  }

  // 4. Division
  if (!/^[A-Z]$/.test(row.division)) {
    errors.push({
      row: rowIndex,
      field: 'Division',
      found: row.division || 'Empty',
      expected: 'A-Z (Single Letter)'
    });
  }

  // 5. Gender
  if (!['Male', 'Female'].includes(row.gender)) {
    errors.push({
      row: rowIndex,
      field: 'Gender',
      found: row.gender || 'Empty',
      expected: 'Male / Female'
    });
  }

  // 6. Category
  if (!['SC', 'ST', 'OBC', 'OEC', 'General'].includes(row.category)) {
    errors.push({
      row: rowIndex,
      field: 'Category',
      found: row.category || 'Empty',
      expected: 'SC / ST / OBC / OEC / General'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    student: row
  };
};
